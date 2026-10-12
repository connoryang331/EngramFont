# R4 - generate the latin-kernel template (A-Z a-z 0-9) from a REAL font:
# glyph outlines are extracted, converted to cubic (Qu2CuPen) and scaled to
# upem 1000, so newly created fonts start with correct, editable letterforms
# (the previous blocky placeholder drew the same slab for every character).
#
# Run: venv/Scripts/python scripts/make-template.py <source-font.ttf> [more.ttf ...]
# The first source containing all 62 characters wins. Sources are looked up
# as-is; .e2e-fonts/Inter-E2E-*.ttf fixtures work well (Inter, OFL).
# Output: src/fontra/filesystem/assets/templates/latin-kernel.json
import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.qu2cuPen import Qu2CuPen

OUT_PATH = (
    Path(__file__).resolve().parent.parent
    / "src/fontra/filesystem/assets/templates/latin-kernel.json"
)

UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
DIGITS = "0123456789"
CHARS = UPPERCASE + LOWERCASE + DIGITS

TARGET_UPEM = 1000
QU2CU_MAX_ERR = 1.0


def _point(x, y, type):
    return {"x": round(x, 1), "y": round(y, 1), "type": type, "smooth": False}


def cubic_contours(glyph):
    """Draw the glyph, converting TrueType quadratics to cubic on the way."""
    recorder = RecordingPen()
    qu2cu = Qu2CuPen(recorder, max_err=QU2CU_MAX_ERR)
    glyph.draw(qu2cu)
    contours = []
    current = None
    for operator, args in recorder.value:
        if operator == "moveTo":
            current = {"points": [_point(*args[0], "line")], "isClosed": False}
        elif operator == "lineTo":
            current["points"].append(_point(*args[0], "line"))
        elif operator == "curveTo":
            (c1x, c1y), (c2x, c2y), (ex, ey) = args
            current["points"].append(_point(c1x, c1y, "cubic"))
            current["points"].append(_point(c2x, c2y, "cubic"))
            current["points"].append(_point(ex, ey, "line"))
        elif operator == "qCurveTo":
            # Qu2CuPen should have consumed these; keep a safe fallback:
            # TrueType implied on-curve points between off-curves
            off = [_point(x, y, "quad") for x, y in args[:-1]]
            current["points"].extend(off)
            current["points"].append(_point(*args[-1], "line"))
        elif operator == "closePath":
            current["isClosed"] = True
            contours.append(current)
            current = None
        elif operator == "endPath":
            current["isClosed"] = False
            contours.append(current)
            current = None
    return [c for c in contours if len(c["points"]) >= 2]


def load_template_glyphs(source_paths):
    for source in source_paths:
        try:
            font = TTFont(source, fontNumber=0)
        except Exception as error:
            print(f"  skip {source}: {error}")
            continue
        cmap = font.getBestCmap()
        glyph_set = font.getGlyphSet()
        names = {char: cmap.get(ord(char)) for char in CHARS}
        if any(name is None for name in names.values()):
            missing = [c for c, n in names.items() if n is None]
            print(f"  skip {source}: missing {missing}")
            continue
        hmtx = font["hmtx"]
        glyphs = []
        for char in CHARS:
            glyph_name = names[char]
            glyph = glyph_set[glyph_name]
            glyphs.append(
                {
                    # name glyphs by CHARACTER (not the source font's glyph
                    # name): "9" instead of "nine" — simpler for seeds
                    "name": char,
                    "codePoints": [ord(char)],
                    "advance": round(glyph.width),
                    "contours": cubic_contours(glyph),
                }
            )
        return glyphs, font["head"].unitsPerEm
    raise SystemExit("no source font contained all 62 characters")


def main():
    source_paths = sys.argv[1:]
    if not source_paths:
        raise SystemExit(__doc__)
    glyphs, source_upem = load_template_glyphs(source_paths)
    scale = TARGET_UPEM / source_upem
    for glyph in glyphs:
        for contour in glyph["contours"]:
            for point in contour["points"]:
                point["x"] = round(point["x"] * scale, 1)
                point["y"] = round(point["y"] * scale, 1)
        glyph["advance"] = round(glyph["advance"] * scale)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(glyphs, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(glyphs)} glyphs -> {OUT_PATH}")


if __name__ == "__main__":
    main()
