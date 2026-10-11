# Font import: convert a readable font file (ttf/otf/woff2/designspace/ufo/...)
# into a writable .fontra project. Data migrated: glyphs (+ cmap code points),
# sources (+ line metrics), unitsPerEm, features, kerning.
#
# Conversion logic validated by demo-liga/spike-import-roundtrip.py
# (Inter-Regular.ttf, 2937 glyphs, advances exact).

import gc
import logging

logger = logging.getLogger(__name__)

maxImportFileSize = 50 * 1024 * 1024


class FontImportError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def sanitizeImportName(name: str) -> str:
    # strip path separators / reserved chars, keep a readable stem
    cleaned = "".join(
        ch for ch in name.replace("\\", "/").split("/")[-1] if ch not in '<>:"|?*'
    ).strip()
    return cleaned or "Imported"


def _openSourceBackend(sourcePath):
    # `from None` + gc: a failed font open leaves a half-initialized backend
    # holding the file open; the chained traceback would keep it alive and
    # Windows then refuses to unlink the source file
    from fontra.backends import getFileSystemBackend

    try:
        return getFileSystemBackend(sourcePath)
    except Exception as error:
        message = str(error)
        error = None
        gc.collect()
        raise FontImportError(400, f"bad file: {message}") from None


async def importFontToProject(sourcePath, dstPath) -> int:
    """Convert the font at `sourcePath` into a .fontra project at `dstPath`.
    Returns the number of glyphs migrated. Raises FontImportError(400, ...)
    for unreadable fonts."""
    from fontra.backends import newFileSystemBackend

    sourceBackend = _openSourceBackend(sourcePath)

    glyphNames = set()
    destBackend = None
    try:
        try:
            glyphMap = await sourceBackend.getGlyphMap()
        except FontImportError:
            raise
        except Exception as error:
            message = str(error)
            error = None
            raise FontImportError(400, f"bad file: {message}") from None
        glyphNames = set(glyphMap)
        destBackend = newFileSystemBackend(dstPath)

        sources = await sourceBackend.getSources()
        if sources:
            await destBackend.putSources(sources)
        try:
            await destBackend.putUnitsPerEm(await sourceBackend.getUnitsPerEm())
        except Exception as error:
            logger.info(f"unitsPerEm not migrated: {error}")

        features = await sourceBackend.getFeatures()
        if features.text and features.text.strip():
            await destBackend.putFeatures(features)

        try:
            kerning = await sourceBackend.getKerning()
        except Exception:
            kerning = None
        if kerning:
            await destBackend.putKerning(kerning)

        for name, codePoints in glyphMap.items():
            glyph = await sourceBackend.getGlyph(name)
            if glyph is None:
                logger.warning(f"import: glyph {name!r} unreadable, skipped")
                continue
            _warnAboutDanglingComponents(name, glyph, glyphNames)
            await destBackend.putGlyph(name, glyph, codePoints)

        await destBackend.aclose()  # flush pending writes
        destBackend = None
        return len(glyphMap)
    except Exception as error:
        raise FontImportError(500, f"import failed: {error}") from error
    finally:
        # close file handles even on failure — on Windows the caller can't
        # unlink the source file while the backend still holds it open
        for backend in (destBackend, sourceBackend):
            if backend is not None:
                try:
                    await backend.aclose()
                except Exception:
                    pass


def _warnAboutDanglingComponents(name, glyph, glyphNames):
    for glyphSource in glyph.sources:
        layer = glyph.layers.get(glyphSource.layerName)
        if layer is None:
            continue
        for component in layer.glyph.components:
            if component.name not in glyphNames:
                logger.warning(
                    f"import: glyph {name!r} references missing component"
                    f" {component.name!r}"
                )
