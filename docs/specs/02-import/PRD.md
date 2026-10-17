# R2 · Import Font → Editable Project · Requirements Document (PRD)

## Background
Fontra's OTFBackend can already **open TTF/OTF/WOFF2 read-only** (registered via pyproject entry points),
but once opened they cannot be edited or saved. meshfont's approach: parse the imported font into editable data (opentype.js),
so every glyph is immediately editable.

## Goals
- The landing page provides an "Import font" entry point (pick a .ttf/.otf file)
- Import = generate an **editable** .fontra project in the fonts directory (full copy of glyphs/metrics/kerning)
- After import, jump straight into the editor; behaves like a native project

## User stories
- A designer receives a TTF, imports it into EngramFont, edits a few glyphs, then exports — all done in the browser

## Non-goals
- The first version does not perform deep GSUB migration beyond variable-font axes/features (the FEA text migrates with features)
- No modification of source files (the source TTF stays read-only)

## Acceptance criteria (overview)
- Import Inter-Regular.ttf → Inter-Regular.fontra is generated → open and edit → modify glyphs → reopen and changes persist
- Glyph count / outline bounds match the source (round-trip validation)
