# R4 · 新建字体单元测试（用例表见 docs/specs/04-new-font-templates/TEST.md）
import asyncio

import pytest

from fontra.filesystem.newfont import NewFontError, createNewFont


@pytest.fixture
def rootPath(tmp_path):
    return tmp_path


def test_createEmptyFont(rootPath):
    project = asyncio.run(createNewFont(rootPath, "Empty", "empty"))
    assert project == "Empty.fontra"
    assert (rootPath / "Empty.fontra").is_dir()


def test_createLatinKernel(rootPath):
    from fontra.backends import getFileSystemBackend

    asyncio.run(createNewFont(rootPath, "Kernel", "latin-kernel"))
    backend = getFileSystemBackend(rootPath / "Kernel.fontra")
    glyphMap = asyncio.run(backend.getGlyphMap())

    # 62 seeded glyphs: A-Z a-z 0-9, each with its code point
    assert len(glyphMap) == 62
    assert glyphMap["A"] == [ord("A")]
    assert glyphMap["z"] == [ord("z")]
    assert glyphMap["9"] == [ord("9")]

    glyph = asyncio.run(backend.getGlyph("A"))
    staticGlyph = glyph.layers[glyph.sources[0].layerName].glyph
    assert staticGlyph.xAdvance == 560
    assert len(staticGlyph.path.contourInfo) == 2  # outline + counter hole


def test_duplicateName(rootPath):
    asyncio.run(createNewFont(rootPath, "Dup", "empty"))
    with pytest.raises(NewFontError) as excInfo:
        asyncio.run(createNewFont(rootPath, "Dup", "empty"))
    assert excInfo.value.status == 409


def test_badName(rootPath):
    for bad in ["", "bad name", "a" * 65, "../escape", None]:
        with pytest.raises(NewFontError) as excInfo:
            asyncio.run(createNewFont(rootPath, bad, "empty"))
        assert excInfo.value.status == 400


def test_badTemplate(rootPath):
    with pytest.raises(NewFontError) as excInfo:
        asyncio.run(createNewFont(rootPath, "Fine", "nope"))
    assert excInfo.value.status == 400
