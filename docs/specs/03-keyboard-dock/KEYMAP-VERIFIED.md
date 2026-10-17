# R3 · Verified Keymap (KEYMAP-VERIFIED)

> All semantics verified empirically against the meshfont clone's aria-labels (probe-keys.mjs + elementsFromPoint).
> This table is the authoritative basis for the keyboard dock implementation; the placeholder guesses in SPEC.md §7 are void — this table prevails.
> A keycap with two stacked characters (e.g. `!1`) = shift variant.

## Layout (5 rows, 28 keys + 1 progress key in total)

### row1 · Number row + DEL
| Keycap | aria / semantics |
|---|---|
| ~ ` ｜ ! 1 ｜ @ 2 ｜ # 3 ｜ $ 4 ｜ % 5 ｜ ^ 6 ｜ & 7 ｜ * 8 ｜ ( 9 ｜ ) 0 ｜ _ - ｜ + = | per key: top=shift character, bottom=base character; click switches to that glyph |
| **DEL (orange, spans 2 keys)** | aria: `delete` |

### row2 · Grid toggle + q row
| Key | Semantics |
|---|---|
| **purple (spans 2 keys)** | aria: `tab: show or hide the grid` — **grid show/hide toggle** |
| q w e r t y u i o p { [ } ] \| | letter/symbol keys |

### row3 · Thickness slider + a row + proof/edit mode keys
| Key | Semantics |
|---|---|
| **yellow (spans 2 keys)** | aria: `letter thickness`, class: `ls-grab` — **stroke-thickness drag slider** |
| a s d f g h j k l ; ' | letter keys (the current glyph's key is highlighted, e.g. the d in the screenshot) |
| **blue (spans 2 keys, label switches by context)** | in edit mode shows `view` (italic) → click to enter proof; in proof mode shows `edit` → click to return to editing |

### row4 · Sidebearing sliders + z row
| Key | Semantics |
|---|---|
| **red (spans 2 keys)** | aria: `shift-l`, class: `ls-grab` — **left sidebearing drag slider** |
| z x c v b n m < , > . ? / | letter/symbol keys |
| **green (spans 2 keys)** | aria: `shift-r`, class: `ls-grab` — **right sidebearing drag slider** |

### row5 · Control row
| Key | aria | Semantics |
|---|---|---|
| ctrl | `ctrl` | modifier key |
| (gray) | `empty key` | placeholder (empty on the original site too) |
| alt | `alt: remove anchors` | **hold/click to remove the selected glyph's anchors** |
| **move (wide, 8 key positions)** | `move` | **canvas pan mode** (drag the canvas to move the viewport) |
| red ⊞ | `snap to grid: off` | **snap-to-grid toggle** (toggle; aria flips with state) |
| yellow ○ | `snap to guides: on` | **snap-to-guides toggle** (toggle) |
| blue # | `editor mode: bezier` | **bezier ⇄ mesh edit-mode switch** (toggle; aria becomes `editor mode: mesh` after switching to mesh) |
| beige a | `outline view: off` | **outline/filled view toggle** (toggle) |

### Extra keys (above the keyboard)
| Element | aria | Semantics |
|---|---|---|
| EN 0/142 | `EN: 0 of 142 letters edited`, title: `Next letter` | progress counter, **click to jump to the next letter** |

## Relation to the Ton/vance/ed rules
- Letter keys switch glyphs → the contextual rule (`sub [ance dance vance] d' by ed;`) keeps working in EngramFont as usual
- The three drag sliders (thickness/shift-l/shift-r) are exclusive to meshfont's **stroke system** (they depend on its stroke engine);
  in the first version of the EngramFont dock they render as placeholders (disabled), to be wired up once our own stroke/sidebearing capabilities are ready —
  shift-l/r can map directly to Fontra's left/right sidebearing editing (fontinfo/metrics already has the data)

## Implementation notes
- Keycap dual characters: top=shift character, bottom=base character; the current glyph's key is highlighted (background brightens, see the d key in the screenshot)
- aria-labels keep the original site's copy (English) verbatim; i18n comes later
- State highlighting for the three sliders and the 4 toggles: off/on is reflected directly in the aria and the background color (examples: red=off, yellow/green/blue=on)

## Implementation Classification (key-by-key decisions · verified against Fontra source)

### A · Direct wiring (already in Fontra, pure wiring)
| Key | Wiring point |
|---|---|
| letter/number/punctuation keys (navigation) | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}` (same as editor.js:864) |
| missing glyph → create | the create-new-glyph dialog flow starting at editor.js:860 |
| DEL | remove the last character of `sceneSettings.characterLines` (same controller as text-entry) |
| space | append a space to characterLines |
| **shift-l / shift-r sliders** | **panel-selection-info.js:234 already has a sidebearings editing path** (incl. LSB↔RSB coupling :894-941) — slider values drive the same change |
| grid show/hide (purple) | the `fontra.upm.grid` visualization layer already exists (visualization-layer-definitions.js:41) — wire up its visibility switch |
| 100% zoom reset | editor.js:3420 `_zoom` / direct viewBox setting |
| view/edit mode key | R5 canvasMode (spec already designed) |
| ctrl / empty placeholder | dock internal state / pure rendering |

### B · New code (small; Fontra doesn't have it)
| Key | Implementation | Estimate |
|---|---|---|
| EN 0/142 (next letter) | sorted glyphMap loop + selectedGlyph setting | 0.25d |
| snap to grid (red ⊞) | grid-snap computation in the edit tool + switch | 0.5d |
| snap to guides (yellow ○) | snapping-to-guidelines computation + switch | 0.5d |
| outline view (beige a) | new visualization layer (stroke rendering mode) | 0.5d |
| move (pan toggle) | canvas drag behavior switch (persistent pan mode) | 0.5d |
| alt (remove anchors) | small action to clear the current glyph's anchors | 0.25d |

### C · Not in Fontra / not doing
| Key | Reason |
|---|---|
| letter thickness slider (yellow capsule) | depends on a stroke system (outline-bolding engine) — Fontra has none; engram v1 renders a disabled placeholder |
| blue # (bezier ⇄ mesh) | mesh mode was decided against → remove this key in v1 |

## Implementation Decisions (finalized by the user, 2026-10-11)

| Key | Decision | Notes |
|---|---|---|
| letter thickness (yellow capsule) | **to build** | dependency note: meshfont gets it cheap because its glyphs are generated from stroke skeletons (thickness = a generation parameter); for EngramFont outline glyphs, thickness = **outline offset** (requires a path-offset engine, e.g. skia-pathops wasm, with self-intersection handling) → deferred to P2/second batch; technology choice to be discussed separately |
| blue # (bezier⇄mesh) | **placeholder key** | rendered as a disabled placeholder, not implemented |
| snap to grid (red ⊞) | **not doing (placeholder)** | Fontra source has no snapping mechanism at all (grep snap/magnet: zero hits); the user judged it unnecessary |
| snap to guides (yellow ○) | **Fontra has no snapping mechanism**; placeholder in v1 | if needed: snapping dragged points to guideline coordinates ≈0.5d to add |
| outline view (beige a) | **build: render-mode switch** | Fontra glyphs = Path2D filled rendering (glyph-controller.js:710 flattenedPath2d); outline view = drawing points switch fill→stroke (with strokeWidth); the canvas currently has no double-click gesture (meshfont uses a key to switch, EngramFont follows with a key; the "double-click stroke/blank" gesture can be an alternative interaction) |

### Dock keymap decision (v1 implementation scope)
**12 keys built**: letter/number/punctuation navigation, DEL, space, move, 100%, grid show/hide, outline view, view/edit mode keys, ctrl/alt
**4 placeholder keys**: blue # (mesh), snap to grid, snap to guides, letter thickness (P2)
**1 key removed**: none (red/green sliders kept = sidebearing wiring)

## Implementation Decision Revision (2026-10-11 evening · v2)

| Key | Revision | Notes |
|---|---|---|
| snap to guides (yellow ○) | **upgraded to build** | Fontra has no snapping mechanism (verified) → add: snapping of dragged points to guideline coordinates + switch, ≈0.5d |
| outline view (beige a) | **switched to a double-click gesture; key becomes a placeholder** | interaction definition: double-click a stroke → filled (filled/edit state); double-click blank space → outline view (wireframe). Implementation = add a dblclick handler on the canvas (currently none) + a render-mode flag (fill⇄stroke switch). Hit-testing "double-click blank canvas" = the area outside the glyph outline |
| snap to grid (red ⊞) | placeholder (not doing) | the user judged it unnecessary |
| blue # (bezier⇄mesh) | placeholder (not doing) | unchanged from the previous decision |

### Dock v1 scope (after revision)
**14 keys built**: letter/number/punctuation navigation, DEL, space, move, 100%, grid show/hide (purple), **snap to guides (new)**, view/edit mode keys, shift-l/r sliders (sidebearing wiring), ctrl/alt
**4 placeholder keys**: blue # (mesh), snap to grid, **outline view (moved to a double-click gesture)**, letter thickness (P2; outline-offset technology choice)

### outline view double-click gesture · implementation notes
- The canvas currently has no dblclick handler (verified) → add a dblclick listener
- Hit test: if the dblclick position falls inside the current glyph's outline (flattenedPath2d isPointInPath) → switch to filled;
  if outside the outline (blank) → switch to the outline wireframe
- Render branch: drawing points fill⇄stroke (strokeWidth in screen pixels)
- State: in memory (not persisted); editing tools remain fully available

## Semantic Corrections (2026-10-11 evening · v3 · the user's hands-on testing is authoritative, overriding mislabeled aria-labels)

| Key | aria-label (misleading) | **Actual semantics (user-confirmed)** |
|---|---|---|
| purple (spans 2 keys, left of row2) | `tab: show or hide the grid` | **show/hide anchors** (toggles visibility of the Bézier control points on the glyph) |
| green (spans 2 keys, right of row4) | `shift-r` | **add anchors / remove anchors** (anchor-count slider: densify/simplify control points along the path) |
| red circle (left of row4) | `shift-l` | uncorrected — recorded per the aria; during implementation the user's hands-on result prevails |
| yellow capsule (left of row3) | `letter thickness` | uncorrected — stroke-thickness slider |

### Impact on implementation
- Purple key: wire to the "anchor show/hide" rendering flag (a new Fontra visualization layer or an existing setting; the Anchor data model already exists)
- Green slider: **path control-point densify/simplify operations** — a new editing capability (interpolating points along curves / decimating points by tolerance),
  not a simple switch; effort raised to 1-1.5d, and it depends on point-manipulation APIs of the outline data model
- Red circle shift-l: keep the original record; verify once with the user during implementation

## Semantic Correction v4 (2026-10-11 late night · the user's hands-on testing is authoritative)

| Key | Correction |
|---|---|
| red circle (left of row4) | **background dot-grid display slider** (a drag slider adjusting the canvas background dot/dot-matrix density) — **placeholder** (not implemented in v1) |
| stroke width | **Fontra doesn't have it**: Fontra uses outline glyphs (filled outlines) with no stroke-width concept. meshfont's thickness slider works because its glyphs are generated from stroke skeletons (width = a generation parameter). Two routes for EngramFont thickness: ① keep stroke-skeleton data on the glyph (customData), thickness = regenerate outlines from the skeleton (recommended — if the skeleton representation of the engram-generator heritage is adopted); ② an outline-offset engine (stroke-to-outline: skia-python getFillPath or a wasm approach, with self-intersection handling, moderately difficult). → stays P2 technology selection |

## Feature Name Mapping (meshfont ↔ Fontra · same feature, different names)
> Overnight sessions should check against this table; do not mistake a different name for a missing feature.

| meshfont name | Fontra name | Status |
|---|---|---|
| upload image / Trace a photo | **Add Background Image...** (action.glyph.add-background-image) | ✓ exists (opacity slider in the selection-info panel; replace missing → R7; remove exists) |
| (background image move/edit unlock) | **Unlock Background Images** (action.unlock-background-images) / Lock (dual) | ✓ exists |
| proof preview (typeset proofing) | text-entry multi-line canvas + lineMetrics guide layer (R5 completes presets/full width) | R5 |
| edit mode | editing state (current) | ✓ |
| soften curves | (none) → R6 | to be implemented |
| straighten | (none) → R6 | to be implemented |
| make circle | (none) → R6 | to be implemented |
| anchor add/remove green slider | (none) → R6 anchor density | to be implemented |
| letter thickness slider | (none; outline glyphs have no stroke concept) | placeholder/P2 |
| blue # (bezier⇄mesh) | (no mesh) | placeholder |
| export font | Export As (missing the ExportManager implementation) | R1 |
| import font → editable | OTFBackend read-only (missing conversion) | R2 |

## Semantic Status Labels v3.1 (2026-10-11 late night)
| Key | Status | Currently accepted semantics | Basis |
|---|---|---|---|
| purple (spans 2 keys) | ✅ user-confirmed | **show/hide anchors** | user's hands-on testing (aria "show or hide the grid" is a mislabel) |
| green (2-key-span slider) | ✅ user-confirmed | **add anchors/remove anchors** (anchor-density slider) | user's hands-on testing (aria "shift-r" is a mislabel) |
| yellow capsule slider | ✅ aria + user did not contradict | stroke-thickness slider (letter thickness) | the aria's self-description + user did not correct |
| red circle slider | ⚠️ to verify at implementation | guess: a left-sidebearing-style drag (aria "shift-l" has a history of misleading) | aria + position (left column) |
| view/edit (blue) | ✅ cross-verified by user screenshots | proof ⇄ edit mode switch | context labels on the two screenshots |
| blue # (small key) | ✅ aria + previous session | bezier ⇄ mesh mode switch | aria + NOTES history |
| DEL (orange) | ⚠️ to verify | delete (exact target confirmed at implementation) | aria "delete" |
| move (wide) | ⚠️ guess | canvas pan mode | the label's self-description |
| red ⊞/yellow ○ (small keys) | ⚠️ guess | snapping toggles (grid/guides) | the label's self-description |
| beige a (small key) | ✅ user decision | placeholder (outline moved to a double-click gesture) | user instruction |

## v5 · Dual-Function Contextual Keymap (2026-10-11 late night · user final decision · final version)
> **The same set of sliders/keys serves different functions in the two modes** — this is the core of meshfont's keyboard design.
> All earlier "single-semantics" tables are void; this table prevails.

| Key | **edit mode** (glyph editing) | **view/proof mode** (typeset proofing) |
|---|---|---|
| purple | show/hide anchors | **Metric lines show/hide** (guides toggle) |
| yellow slider | letter thickness (stroke thickness, P2) | **letter spacing** |
| red slider | background dot grid display (placeholder) | **Word spacing** |
| green slider | add anchors / remove anchors | **Line height** |
| DEL | meshfont: reset letter → **EngramFont: reset text** | meshfont: reset space → **EngramFont: reset text** |
| view/edit (blue) | shows `view` → enter proof | shows `edit` → return to editing |
| move | pan | pan |
| red ⊞/yellow ○ snapping | edit snapping toggles | not applicable in proof mode |
| beige a outline | placeholder (outline moved to a double-click gesture) | not applicable in proof mode |

- The four typesetting controls in view mode = **live adjustment of the proof view** (word spacing/letter spacing/line height/guides show-hide) —
  this is the typesetting-control interaction of the R5 proof mode (no new controls; reuses the dock sliders)
- Implementation: the slider handlers dispatch to different backends by canvasMode (edit→glyph-editing APIs; view→sceneSettings
  wordSpacing/letterSpacing/lineHeight/canvasMode guides toggle)


## Measured Keycap Colors (meshfont original colors · for 1:1 visuals · sampled at a 1600px viewport)
| Key | background (rgb) | hex |
|---|---|---|
| normal keys (numbers/letters) | rgb(45,45,48) | #2D2D30 |
| currently selected glyph key | rgb(232,230,225) | #E8E6E1 |
| DEL (orange) | rgb(255,135,65) | #FF8741 |
| grid show/hide (purple) | rgb(156,111,255) | #9C6FFF |
| thickness slider (yellow capsule) | rgb(234,215,48) | #EAD730 |
| shift-l (red) | rgb(255,81,81) | #FF5151 |
| shift-r (green) | rgb(0,175,88) | #00AF58 |
| view/edit (blue) | rgb(6,102,238) | #0666EE |
| move (wide, dark gray) | rgb(60,60,64) | #3C3C40 |
| snap-grid (red, off state) | rgb(255,81,81) | #FF5151 |
| snap-guides (yellow, on state) | rgb(234,215,48) | #EAD730 |
| mode-bezier (blue) | rgb(6,102,238) | #0666EE |
| outline (beige) | rgb(234,215,201) | #EAD7C9 |
| canvas background (light theme) | #faf9f7 family | — |
- The on/off background strategy for toggle keys (examples: red=off, yellow/green/blue=on) will be sampled at implementation time (toggle once and compare)
- Dark theme color values: switch to dark at implementation time and sample to fill in

## v5.1 DEL Behavior Decision (2026-10-12)
- **DEL = restore the default preview text** (unified across both modes): the dynamic default = a string concatenating the first 40 glyphs with code points in project glyphMap order
- See R5 SPEC §11 for details (including a comparison with Fontra/meshfont default behavior and the rationale)
