# R6 · Technical Spec (SPEC)

## 1. Architecture
- New module `src-js/views-editor/src/path-ops.js`: all geometric algorithms (pure functions; input: selected glyph data, output: new glyph data)
- Integration: editor.js registers 4 actions (same pattern as convert-curves-to-cubic) + the keyboard-dock green slider calls the density functions
- Change submission: via Fontra's existing transaction/undo (edit operations share the same channel as canvas dragging)

## 2. Algorithm Specs
### straighten
- Input: selected on-curve point pair (with off-curve segments in between)
- Transform: delete all off-curve points within the segment, change the segment type to line
- Constraints: keep point order and the preceding/following segments unchanged; treat qcurve/cubic the same way

### soften
- Input: selected sharp on-curve points (corner points)
- Transform: split the corner point into two on-curve points (each retreating by d along the adjacent segment direction), inserting a cubic segment between them
  (control points along the original segment direction; parameter d/radius adjustable); the smooth constraints of neighboring points on both sides are preserved
- Edge cases: if the segment length is less than d, halve automatically; skip extremely short segments

### make circle
- Input: the selected closed contour
- Transform: rearrange into a standard 4-on-curve + 8-off-curve circle (center = bounds center, radius = half the shorter side, optional inscribed/circumscribed)

### Anchor Density (beneath the green slider)
- add: split the selected segments uniformly by t (de Casteljau), adding on-curve points
- reduce: tolerance-based decimation — delete off-curve points so the curve deviation stays ≤ tolerance (simple implementation first: delete uniformly per segment, refine in P2)
- Slider mapping: linear mapping from the value range to density levels

## 3. File List
| File | Action |
|---|---|
| `src-js/views-editor/src/path-ops.js` | new (algorithm pure functions) |
| `src-js/views-editor/src/editor.js` | modify (register 4 actions) |
| `src-js/views-editor/src/keyboard-dock.js` | modify (green slider wiring) |
| `src-js/views-editor/assets/editor.css` | modify (button/slider styles) |

## 4. Error Handling Matrix
| Scenario | Behavior |
|---|---|
| Nothing selected / a component selected | buttons disabled (same conditional mechanism as canConvert) |
| Segment too short / single-point contour | the operation skips that segment, no crash |
| reduce with huge tolerance | guaranteed result of ≥2 points |

## 5. a11y/Theme
- Buttons go through action registration (keyboard reachable); i18n keys complete; colors use tokens
