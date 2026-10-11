# R4 · generate the latin-kernel template (A-Z a-z 0-9 blocky demo outlines)
# Run: venv/Scripts/python scripts/make-template.py
# Output: src/fontra/filesystem/assets/templates/latin-kernel.json
import json
from pathlib import Path

OUT_PATH = (
    Path(__file__).resolve().parent.parent
    / "src/fontra/filesystem/assets/templates/latin-kernel.json"
)

UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
DIGITS = "0123456789"

# block-outline metrics (font units, upem 1000)
CAP_HEIGHT = 700
X_HEIGHT = 500
ASCENDER = 730
DESCENDER = -200


def rect_contour(xMin, yMin, xMax, yMax):
    return {
        "points": [
            {"x": xMin, "y": yMin, "type": "line", "smooth": False},
            {"x": xMax, "y": yMin, "type": "line", "smooth": False},
            {"x": xMax, "y": yMax, "type": "line", "smooth": False},
            {"x": xMin, "y": yMax, "type": "line", "smooth": False},
        ],
        "isClosed": True,
    }


def block_glyph(char):
    """A distinct blocky shape per character class: caps are full-height slabs,
    lowercase follow x-height with ascender/descender classes, digits are
    half-width bars. A corner notch keeps them visually distinguishable."""
    advance = 560
    if char.isupper():
        top = CAP_HEIGHT
        stem = advance - 100
    elif char.islower():
        if char in "bdfhklt":
            top = ASCENDER
        elif char in "gpqy":
            top = X_HEIGHT
        else:
            top = X_HEIGHT
        stem = advance - 140
    else:
        top = CAP_HEIGHT - 60
        stem = advance - 200

    bottom = DESCENDER if char.islower() and char in "gpqy" else 0
    # counter hole gives contours a readable "letter" feel
    contours = [rect_contour(40, bottom, 40 + stem, top)]
    if top - bottom > 300:
        hole = rect_contour(150, bottom + 120, 40 + stem - 110, top - 120)
        # reverse the hole contour (even-odd/counted as a hole by fill rule)
        hole["points"] = list(reversed(hole["points"]))
        contours.append(hole)
    return {"advance": advance, "contours": contours}


def main():
    glyphs = []
    for char in UPPERCASE + LOWERCASE + DIGITS:
        shape = block_glyph(char)
        glyphs.append(
            {
                "name": char,
                "codePoints": [ord(char)],
                "advance": shape["advance"],
                "contours": shape["contours"],
            }
        )
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(glyphs, indent=1), encoding="utf-8")
    print(f"wrote {len(glyphs)} glyphs -> {OUT_PATH}")


if __name__ == "__main__":
    main()
