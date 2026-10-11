# R2 · 导入转换单元测试（用例表见 docs/specs/02-import/TEST.md）
import asyncio
from pathlib import Path

import pytest

testDataDir = Path(__file__).resolve().parent.parent / ".e2e-fonts"


@pytest.mark.skipif(
    not (testDataDir / "Inter-Regular.ttf").exists(),
    reason="requires .e2e-fonts/Inter-Regular.ttf fixture",
)
def test_import_roundtrip(tmp_path):
    from fontra.backends import getFileSystemBackend
    from fontra.filesystem.importfont import importFontToProject

    sourcePath = testDataDir / "Inter-Regular.ttf"
    dstPath = tmp_path / "Inter-Regular.fontra"

    nGlyphs = asyncio.run(importFontToProject(sourcePath, dstPath))
    assert nGlyphs > 0

    src = getFileSystemBackend(sourcePath)
    dst = getFileSystemBackend(dstPath)

    gm1 = asyncio.run(src.getGlyphMap())
    gm2 = asyncio.run(dst.getGlyphMap())
    assert set(gm1) == set(gm2)
    assert all(sorted(gm1[n]) == sorted(gm2[n]) for n in gm1)

    assert asyncio.run(dst.getUnitsPerEm()) == asyncio.run(src.getUnitsPerEm())

    # sample advances + bounds
    sample = sorted(gm1.keys())[:20]
    for name in sample:
        g1 = asyncio.run(src.getGlyph(name))
        g2 = asyncio.run(dst.getGlyph(name))
        l1 = g1.layers[g1.sources[0].layerName].glyph
        l2 = g2.layers[g2.sources[0].layerName].glyph
        assert (l1.xAdvance or 0) == (l2.xAdvance or 0), name


def test_sanitize_import_name():
    from fontra.filesystem.importfont import sanitizeImportName

    # path traversal is stripped: only the last component survives
    assert sanitizeImportName("..\\evil path/My Font.ttf") == "My Font.ttf"
    assert sanitizeImportName("") == "Imported"
