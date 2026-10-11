# R4 · new font creation from a name + template, exposed via POST /api/new-font.
#
# empty     -> createNewFontAndPopulate (Regular source + GF Latin Kernel set ref)
# latin-kernel -> + 62 seeded block-outline glyphs (A-Z a-z 0-9), immediately
#              visible/editable, from assets/templates/latin-kernel.json

import json
import re
from pathlib import Path

from ..backends.populate import createNewFontAndPopulate

validFontNamePattern = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

availableTemplates = ["empty", "latin-kernel"]

templateAssetsDir = Path(__file__).resolve().parent / "assets" / "templates"


class NewFontError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


async def createNewFont(rootPath, name, template) -> str:
    """Create <name>.fontra under rootPath; returns the project identifier."""
    if not validFontNamePattern.match(name or ""):
        raise NewFontError(400, "bad name")
    if template not in availableTemplates:
        raise NewFontError(400, "bad template")

    from ..backends import getFileSystemBackend

    projectIdentifier = f"{name}.fontra"
    projectPath = Path(rootPath) / projectIdentifier
    if projectPath.exists():
        raise NewFontError(409, "name exists")

    try:
        await createNewFontAndPopulate(projectPath)
    except Exception as error:
        raise NewFontError(500, f"font creation failed: {error}") from error

    if template == "latin-kernel":
        try:
            backend = getFileSystemBackend(projectPath)
            for glyph in _loadTemplate("latin-kernel"):
                await backend.putGlyph(
                    glyph["name"],
                    _templateGlyphToVariableGlyph(glyph),
                    glyph["codePoints"],
                )
            await backend.aclose()
        except Exception as error:
            raise NewFontError(500, f"template injection failed: {error}") from error

    return projectIdentifier


def _loadTemplate(templateName):
    templatePath = templateAssetsDir / f"{templateName}.json"
    return json.loads(templatePath.read_text(encoding="utf-8"))


def _templateGlyphToVariableGlyph(glyph):
    from ..core.classes import GlyphSource, Layer, StaticGlyph, VariableGlyph
    from ..core.path import PackedPath

    staticGlyph = StaticGlyph(
        path=PackedPath.fromUnpackedContours(glyph["contours"]),
        xAdvance=glyph["advance"],
    )
    return VariableGlyph(
        name=glyph["name"],
        sources=[GlyphSource(name="default", layerName="default")],
        layers={"default": Layer(glyph=staticGlyph)},
    )
