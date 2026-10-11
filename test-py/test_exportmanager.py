# R1 · ExportManager 单元测试（用例表见 docs/specs/01-export/TEST.md）
import asyncio
import shutil
from pathlib import Path

import pytest

from fontra.filesystem.exportmanager import EngramFontExportManager
from fontra.filesystem.projectmanager import FileSystemProjectManager

testDataPath = Path(__file__).resolve().parent / "data"
projectDir = Path(__file__).resolve().parent.parent.parent / "fontra-test-fonts"


@pytest.fixture
def exportManager(tmp_path):
    # EM writes to <projectRoot>/<exportsDirName>; scope it under a unique
    # folder and remove it afterwards
    projectManager = FileSystemProjectManager(rootPath=projectDir)
    exportManager = EngramFontExportManager(
        projectManager, exportsDirName=f".exports-{tmp_path.name}"
    )
    projectManager.exportManager = exportManager
    yield exportManager
    shutil.rmtree(projectDir / f".exports-{tmp_path.name}", ignore_errors=True)


def _exportsRoot(exportManager):
    return Path(exportManager.exportsDir)


def _exportFile(exportManager, downloadPath):
    # downloadPath: "/exports/<ts>/<file>" -> exportsDir/<ts>/<file>
    rel = downloadPath.split("/exports/", 1)[1]
    return _exportsRoot(exportManager) / rel


def test_supportedFormats(exportManager):
    assert exportManager.getSupportedExportFormats() == ["ttf", "otf", "woff2"]


def test_exportUnknownFormat(exportManager):
    with pytest.raises(ValueError):
        asyncio.run(exportManager.exportAs("Untitled.fontra", {"format": "abc"}))


def test_exportTTF(exportManager):
    from fontTools.ttLib import TTFont

    result = asyncio.run(exportManager.exportAs("Untitled.fontra", {"format": "ttf"}))
    outPath = _exportFile(exportManager, result["downloadPath"])
    font = TTFont(str(outPath))

    assert font.sfntVersion == "\x00\x01\x00\x00"
    glyphOrder = font.getGlyphOrder()
    assert ".notdef" in glyphOrder
    assert {"t", "o", "n", "t_on", "ed"} <= set(glyphOrder)  # ligature glyphs present
    assert "GSUB" in font  # FEA compiled in


def test_exportOTF(exportManager):
    from fontTools.ttLib import TTFont

    result = asyncio.run(exportManager.exportAs("Untitled.fontra", {"format": "otf"}))
    font = TTFont(str(_exportFile(exportManager, result["downloadPath"])))

    assert font.sfntVersion == "OTTO"
    assert "CFF " in font
    ttfResult = asyncio.run(exportManager.exportAs("Untitled.fontra", {"format": "ttf"}))
    ttfFont = TTFont(str(_exportFile(exportManager, ttfResult["downloadPath"])))
    assert font.getGlyphOrder() == ttfFont.getGlyphOrder()


def test_exportWOFF2(exportManager):
    result = asyncio.run(
        exportManager.exportAs("Untitled.fontra", {"format": "woff2"})
    )
    outPath = _exportFile(exportManager, result["downloadPath"])
    assert outPath.read_bytes()[:4] == b"wOF2"


def test_exportFamily(exportManager, tmp_path):
    # synthetic two-source project: see scratch-exports/TwoSource.fontra recipe
    # (font-data.json second source wght=700 + per-glyph "bold" layer copies)
    import json
    import shutil

    projectDir2 = tmp_path / "projects"
    projectDir2.mkdir()
    projectPath = projectDir2 / "TwoSource.fontra"
    shutil.copytree(
        Path(projectDir) / "Untitled.fontra",
        projectPath,
    )
    fontDataPath = projectPath / "font-data.json"
    fontData = json.loads(fontDataPath.read_text(encoding="utf-8"))
    regular = next(iter(fontData["sources"].values()))
    fontData["sources"]["bold00"] = {
        "name": "Bold",
        "location": {"wght": 700},
        "lineMetricsHorizontalLayout": regular["lineMetricsHorizontalLayout"],
    }
    fontDataPath.write_text(json.dumps(fontData), encoding="utf-8")
    for glyphPath in (projectPath / "glyphs").glob("*.json"):
        glyph = json.loads(glyphPath.read_text(encoding="utf-8"))
        if not glyph.get("layers"):
            continue
        glyph["sources"] = list(glyph["sources"]) + [
            {"name": "bold", "layerName": "bold"}
        ]
        glyph["layers"]["bold"] = json.loads(
            json.dumps(glyph["layers"][glyph["sources"][0]["layerName"]])
        )
        glyphPath.write_text(json.dumps(glyph), encoding="utf-8")

    projectManager2 = FileSystemProjectManager(rootPath=projectDir2)
    manager2 = EngramFontExportManager(
        projectManager2, exportsDirName=f".exports-{tmp_path.name}"
    )
    projectManager2.exportManager = manager2

    result = asyncio.run(
        manager2.exportAs("TwoSource.fontra", {"format": "ttf", "family": True})
    )
    assert len(result["downloadPaths"]) == 2
    from fontTools.ttLib import TTFont

    weights = []
    for downloadPath in result["downloadPaths"]:
        font = TTFont(str(_exportFile(manager2, downloadPath)))
        weights.append(font["OS/2"].usWeightClass)
    assert weights == [400, 700]


def test_exportUnknownProject(exportManager):
    with pytest.raises(FileNotFoundError):
        asyncio.run(exportManager.exportAs("Nope.fontra", {"format": "ttf"}))
