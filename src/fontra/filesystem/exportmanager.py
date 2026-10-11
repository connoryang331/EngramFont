# EngramFontExportManager — browser-side font export (TTF/OTF/WOFF2), R1.
#
# Compile pipeline productized from the verified demo-liga/compile-bridge.py:
# read glyph data from the filesystem backend, flatten contours + components,
# FontBuilder + feaLib (FEA -> GSUB), write into <projectRoot>/.exports/<ts>/.
#
# Notes on outline formats: fontra stores cubic-native contours. TTF gets
# cubic->quadratic conversion via Cu2QuPen; OTF draws the cubics directly into
# T2CharStringPens. WOFF2 is the TTF with flavor="woff2" (brotli ships with
# fonttools[woff]).

import asyncio
import logging
import re
import time
from os import fspath
from pathlib import Path

from aiohttp import web
from fontTools.misc.transform import Transform
from fontTools.pens.pointPen import PointToSegmentPen
from fontTools.pens.transformPen import TransformPointPen

logger = logging.getLogger(__name__)


exportMimeTypes = {
    "ttf": "font/ttf",
    "otf": "font/otf",
    "woff2": "font/woff2",
}


def _sanitizeName(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-.")
    return cleaned or "font"


class EngramFontExportManager:
    def __init__(self, projectManager, exportsDirName=".exports"):
        self.projectManager = projectManager
        self.exportsDirName = exportsDirName

    @property
    def exportsDir(self) -> Path:
        rootPath = self.projectManager.rootPath
        if rootPath is None:
            return Path.home() / ".engramfont-exports"
        return Path(rootPath) / self.exportsDirName

    def getSupportedExportFormats(self):
        return ["ttf", "otf", "woff2"]

    async def exportAs(self, projectIdentifier: str, options: dict) -> dict:
        fmt = (options or {}).get("format", "ttf")
        if fmt not in self.getSupportedExportFormats():
            raise ValueError(f"unknown format: {fmt}")
        familyExport = bool((options or {}).get("family", False))
        projectPath = self.projectManager._getProjectPath(projectIdentifier)
        if projectPath is None:
            raise FileNotFoundError(f"unknown project: {projectIdentifier}")
        fontFamily = _sanitizeName(Path(fspath(projectIdentifier)).stem)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        outDir = self.exportsDir / stamp
        try:
            paths = await asyncio.to_thread(
                self._compileSync,
                projectPath,
                fontFamily,
                fmt,
                outDir,
                familyExport,
            )
        except ValueError:
            raise
        except Exception as error:
            detail = str(error)[:200]
            logger.error(f"export failed for {projectIdentifier}: {detail}")
            raise RuntimeError(f"compile failed: {detail}") from error
        downloadPaths = [f"/exports/{stamp}/{p.name}" for p in paths]
        return {"downloadPath": downloadPaths[0], "downloadPaths": downloadPaths}

    def setupWebRoutes(self, server):
        server.httpApp.router.add_get("/exports/{path:.*}", self.exportsFileHandler)

    async def exportsFileHandler(self, request: web.Request) -> web.Response:
        parts = request.match_info["path"].split("/")
        if len(parts) != 2 or any(not p or p in (".", "..") for p in parts):
            raise web.HTTPNotFound()
        filePath = self.exportsDir / parts[0] / parts[1]
        ext = filePath.suffix.lstrip(".").lower()
        if not filePath.is_file() or ext not in exportMimeTypes:
            raise web.HTTPNotFound()
        return web.Response(
            body=filePath.read_bytes(),
            content_type=exportMimeTypes[ext],
            headers={
                "Content-Disposition": f'attachment; filename="{parts[1]}"',
                "Cache-Control": "no-store",
            },
        )

    # The compile runs in a worker thread with its own event loop and a fresh
    # backend, so it never touches the live session's caches.

    def _compileSync(self, projectPath, fontFamily, fmt, outDir, familyExport):
        return asyncio.run(
            self._compileAsync(projectPath, fontFamily, fmt, outDir, familyExport)
        )

    async def _compileAsync(self, projectPath, fontFamily, fmt, outDir, familyExport):
        from fontra.backends import getFileSystemBackend

        backend = getFileSystemBackend(projectPath)
        glyphMap = await backend.getGlyphMap()
        upem = await backend.getUnitsPerEm()
        sources = await backend.getSources()
        features = await backend.getFeatures()
        glyphOrder = [".notdef"] + sorted(n for n in glyphMap if n != ".notdef")
        glyphs = {}
        for name in glyphOrder:
            glyphs[name] = None if name == ".notdef" else await backend.getGlyph(name)

        sourceList = list(sources.values()) or [_defaultSource()]
        if not familyExport:
            sourceList = sourceList[:1]

        outDir.mkdir(parents=True, exist_ok=True)
        outPaths = []
        for index, fontSource in enumerate(sourceList):
            styleName = _sanitizeName(fontSource.name) if fontSource.name else "Regular"
            outPath = outDir / f"{fontFamily}-{styleName}.{fmt}"
            tmpPath = outPath.with_suffix(outPath.suffix + ".tmp")
            _buildAndSave(
                glyphs=glyphs,
                glyphOrder=glyphOrder,
                glyphMap=glyphMap,
                upem=upem,
                fontSource=fontSource,
                sourceIndex=index,
                feaText=features.text or "",
                fmt=fmt,
                fontFamily=fontFamily,
                outPath=tmpPath,
            )
            tmpPath.replace(outPath)
            outPaths.append(outPath)
        return outPaths


def _defaultSource():
    from fontra.core.classes import FontSource

    return FontSource(name="Regular")


def _sourceMetrics(fontSource):
    metrics = fontSource.lineMetricsHorizontalLayout
    ascent = metrics["ascender"].value if "ascender" in metrics else 750
    descent = metrics["descender"].value if "descender" in metrics else -250
    return ascent, descent


def _sourceStaticGlyph(varGlyph, sourceIndex):
    glyphSource = varGlyph.sources[min(sourceIndex, len(varGlyph.sources) - 1)]
    layer = varGlyph.layers.get(glyphSource.layerName)
    if layer is None:  # sparse source -> fall back to the default layer
        layer = varGlyph.layers[varGlyph.sources[0].layerName]
    return layer.glyph


def _drawGlyph(glyphs, name, segmentPenFactory, sourceIndex=0):
    """Flatten glyph `name` (contours + one-level components) into the segment
    pen returned by segmentPenFactory(advance)."""
    sg = _sourceStaticGlyph(glyphs[name], sourceIndex)

    pen = segmentPenFactory(sg.xAdvance or 0)
    pointPen = PointToSegmentPen(pen)
    sg.path.drawPoints(pointPen)
    for comp in sg.components:
        if comp.name not in glyphs or glyphs[comp.name] is None:
            continue
        t = comp.transformation
        baseSg = _sourceStaticGlyph(glyphs[comp.name], sourceIndex)
        transform = Transform().translate(t.translateX, t.translateY)
        baseSg.path.drawPoints(TransformPointPen(PointToSegmentPen(pen), transform))
    return pen


def _buildAndSave(
    glyphs,
    glyphOrder,
    glyphMap,
    upem,
    fontSource,
    sourceIndex,
    feaText,
    fmt,
    fontFamily,
    outPath,
):
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
    from fontTools.fontBuilder import FontBuilder

    ascent, descent = _sourceMetrics(fontSource)
    usWeightClass = int(round((fontSource.location or {}).get("wght", 400)))
    styleName = _sanitizeName(fontSource.name) if fontSource.name else "Regular"

    if fmt == "otf":
        font = _buildOTF(
            glyphs,
            glyphOrder,
            glyphMap,
            upem,
            fontFamily,
            styleName,
            ascent,
            descent,
            sourceIndex,
        )
    else:
        font = _buildTTF(
            glyphs,
            glyphOrder,
            glyphMap,
            upem,
            fontFamily,
            styleName,
            ascent,
            descent,
            sourceIndex,
        )

    font["OS/2"].usWeightClass = usWeightClass
    if feaText.strip():
        featuresText = _injectAutoBacktrackClasses(feaText, glyphOrder)
        addOpenTypeFeaturesFromString(font, featuresText)

    if fmt == "woff2":
        font.flavor = "woff2"
    font.save(str(outPath))


def _injectAutoBacktrackClasses(featuresText, glyphOrder):
    # MicroTon convention: contextual rules reference a backtrack class of all
    # *ance glyphs; regenerate it so newly added *ance glyphs need no FEA edits.
    anceGlyphs = sorted(n for n in glyphOrder if n.endswith("ance"))
    if not anceGlyphs:
        return featuresText
    autoClass = "[" + " ".join(anceGlyphs) + "]"
    return re.subn(r"\[[^\]]+\](?= d')", autoClass, featuresText)[0]


def _buildTTF(
    glyphs, glyphOrder, glyphMap, upem, familyName, styleName, ascent, descent, sourceIndex
):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen

    glyphNames = set(glyphOrder)
    fb = FontBuilder(upem, isTTF=True)
    fb.setupGlyphOrder(glyphOrder)
    fb.setupCharacterMap(_characterMap(glyphMap))

    glyf, hmtx = {}, {}
    for name in glyphOrder:
        if name == ".notdef":
            glyf[name] = TTGlyphPen(glyphNames).glyph()
            hmtx[name] = (0, 0)
            continue
        ttPen = TTGlyphPen(glyphNames)
        cu2qu = Cu2QuPen(ttPen, max_err=1.0, reverse_direction=True)
        _drawGlyph(glyphs, name, lambda adv, p=cu2qu: p, sourceIndex=sourceIndex)
        glyf[name] = ttPen.glyph()
        sg = _sourceStaticGlyph(glyphs[name], sourceIndex)
        hmtx[name] = (int(sg.xAdvance or 0), 0)

    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(hmtx)
    fb.setupHorizontalHeader(ascent=int(ascent), descent=int(descent))
    psName = _sanitizeName(f"{familyName}-{styleName}")
    fb.setupNameTable(
        {
            "familyName": familyName,
            "styleName": styleName,
            "fullName": f"{familyName} {styleName}",
            "psName": psName,
        }
    )
    fb.setupOS2(
        sTypoAscender=int(ascent),
        sTypoDescender=int(descent),
        usWeightClass=400,
    )
    fb.setupPost()
    return fb.font


def _buildOTF(
    glyphs, glyphOrder, glyphMap, upem, familyName, styleName, ascent, descent, sourceIndex
):
    from fontTools.cffLib import (
        CFFFontSet,
        CharStrings,
        GlobalSubrsIndex,
        PrivateDict,
        TopDict,
        TopDictIndex,
    )
    from fontTools.pens.t2CharStringPen import T2CharStringPen
    from fontTools.ttLib import TTFont, newTable
    from fontTools.ttLib.tables._m_a_x_p import table__m_a_x_p

    # Carry the metric/identity tables compiled for the TTF sibling; the
    # outline data itself is drawn straight from the cubic-native source.
    reference = _buildTTF(
        glyphs,
        glyphOrder,
        glyphMap,
        upem,
        familyName,
        styleName,
        ascent,
        descent,
        sourceIndex,
    )

    charStrings = {}
    for name in glyphOrder:
        if name == ".notdef":
            charStrings[name] = T2CharStringPen(0, None).getCharString()
            continue
        pen = _drawGlyph(
            glyphs, name, lambda adv: T2CharStringPen(int(adv or 0), None), sourceIndex
        )
        charStrings[name] = pen.getCharString()

    otfFont = TTFont()
    for tag in ("head", "hhea", "hmtx", "name", "OS/2", "post", "cmap"):
        otfFont[tag] = reference[tag]
    maxp = table__m_a_x_p()
    maxp.tableVersion = 0x00005000
    maxp.numGlyphs = len(glyphOrder)
    otfFont["maxp"] = maxp
    otfFont.sfntVersion = "OTTO"
    otfFont.setGlyphOrder(glyphOrder)

    topDict = TopDict()
    topDict.charset = glyphOrder
    topDict.Private = PrivateDict()
    topDict.Private.defaultWidthX = 0
    topDict.Private.nominalWidthX = 0
    if upem != 1000:
        topDict.FontMatrix = [1.0 / upem, 0, 0, 1.0 / upem, 0, 0]
    cs = CharStrings(None, None, [], topDict.Private, None, None)
    cs.charStrings = charStrings
    for charString in charStrings.values():
        charString.private = topDict.Private
    topDict.CharStrings = cs

    cffFontSet = CFFFontSet()
    cffFontSet.major = 1
    cffFontSet.minor = 0
    cffFontSet.fontNames = [f"{familyName}-{styleName}"]
    cffFontSet.topDictIndex = TopDictIndex()
    cffFontSet.topDictIndex.append(topDict)
    cffFontSet.GlobalSubrs = GlobalSubrsIndex()

    cff = newTable("CFF ")
    cff.cff = cffFontSet
    otfFont["CFF "] = cff
    return otfFont


def _characterMap(glyphMap):
    cmap = {}
    for name, codePoints in glyphMap.items():
        for codePoint in codePoints:
            cmap[codePoint] = name
    return cmap
