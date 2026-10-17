# R9 · Technical Specification (SPEC)

## State Machine (edit-tools-pointer.js `handleRectSelect`)

Drag state `slant = { k, w, dy }` (k=shear, w=base edge width, dy=vertical span):

| Phase | Trigger | Behavior |
|---|---|---|
| Rectangle | Ctrl never touched | The original `normalizeRect` path, byte-identical to the old implementation |
| Enter angle mode | `event.ctrlKey` rising edge | Freeze `w = dx - k·dy` (first time it is `dx`) |
| Angle mode | Ctrl held | `k = clamp((dx - w)/dy, ±12)` (≈±85°), `dy = mouse.dy`; corner C = mouse |
| Fixed-angle resize | After Ctrl released | `dy = mouse.dy`; `w = dx - k·dy`; k unchanged |

When `|dy| < 0.25`, keep k from the previous frame (avoid division-by-zero blowup); the Ctrl rising edge may occur repeatedly (re-freeze w).

## Data Model

`selectionParallelogram = {x0, y0, x1, y1, shearK}` (glyph coordinates, same convention as `selectionRect`; set to undefined when the drag ends). Four corners = `(x0,y0) (x1,y0) (x1+k·dy, y1) (x0+k·dy, y1)`
— horizontal top/bottom edges + slanted side edges.

## Hit Testing (scene-model.selectionAtParallelogram)

Shear space method (ADR-0003): candidate geometry is sheared by `x -= k·(y-y0)` and then judged as an axis-aligned rectangle —

- Nodes: `path.iterPoints()` sheared point by point + `pointInRect` (controlBounds shear prefilter);
- Components: `componentIntersectsShearedRect` (mirrors `intersectsRect`: sheared bounds prefilter →
  convex hull corner/edge intersection → per outline);
- Anchors: sheared point test;
- Background images: `_backgroundImageSelectionAtPointOrRect` gains a `paraGlyph` branch
  (shear the bg polygon + three checks: corners / edge intersection / containment).

Selection modes (replace/union/difference) and on-curve filtering logic are exactly the same as in rectangle mode.

## Drawing (fontra.rect.select layer)

Parallelogram branch: one stroke pass with a black solid line + one with a white dashed line (same as the rectangle); the rectangle path is kept as-is.

## Files Involved

`edit-tools-pointer.js` (state machine + two helpers) · `scene-model.js` (new method + helper) ·
`scene-controller.js` (selectionParallelogram access) · `visualization-layer-definitions.js` (drawing branch)
