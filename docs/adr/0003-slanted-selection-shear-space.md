---
Id: ADR-0003
tags: [frontend, canvas, selection]
Status: accepted
Date: 2026-10-14
---

# Slanted selection: shear-space hit testing, reusing the rectangle tests

## Background

Parity with Glyphs' slanted selection: while dragging a rectangle selection, holding
Ctrl changes the selection's **angle**, and releasing Ctrl continues resizing along the
current angle. The selection changes from a rectangle to a parallelogram —
**what about hit testing**? The existing `selectionAtRect` covers four element kinds:
nodes (point by point), components (controlBounds pre-filter + convex hull + per
outline), anchors, and background images, each with its own rectangle test.

## Decision

**The shear-space approach**: the parallelogram is modeled as `{x0, y0, x1, y1, shearK}`
(horizontal top and bottom edges + slanted sides; `shearK` = horizontal offset per unit
of vertical distance). For the test, all candidate geometry is sheared by
`x -= shearK·(y-y0)` — the parallelogram **degenerates exactly** into the axis-aligned
rectangle `(x0, y0, x1, y1)`, so the existing rectangle tests of the four element kinds
are **reused as-is**:

- `scene-model.selectionAtParallelogram(para, filter)`: a new method (the rectangle
  version is untouched);
- the component test mirrors the structure of `intersectsRect` (sheared controlBounds
  pre-filter + sheared convex hull + per outline), with the module-level helper
  `componentIntersectsShearedRect`;
- background image: `_backgroundImageSelectionAtPointOrRect` gains a three-way
  `paraGlyph` branch;
- drawing: the `fontra.rect.select` layer gains a parallelogram branch (styling
  identical to the rectangle).

The angle state machine lives in `edit-tools-pointer.handleRectSelect`: the moment Ctrl
goes down, the horizontal width `w` is frozen; in angle mode the mouse drives `shearK`
(clamped to ±12 ≈ ±85°); after release, fixed-angle resizing
(`dy = mouse.y - y0`, `w = dx - k·dy`, corners tracking the mouse exactly).

## Rationale

1. **One test instead of four**: shearing only changes the input coordinates, not the
   test itself — the hit-test semantics of the four element kinds stay aligned
   one-to-one with rectangle mode, so behavior cannot silently drift.
2. **Exact**: shearing is an affine transform, so the point/convex hull/outline tests
   all remain exact (cross-validated tests in the feature pack).
3. **Patch friendly**: everything is new methods + one drawing branch + a rewritten
   state machine; the original `selectionAtRect` is untouched, and behavior without
   Ctrl is completely unchanged.

## Rejected alternatives

- **A point-in-parallelogram per element kind**: four nearly isomorphic pieces of
  geometry code; a future bug fix on the rectangle side would inevitably miss one side.
- **A generic convex-polygon SAT/intersection utility**: it would need to be written
  and maintained, and the rectangle path would still have to stay (the original path is
  used when Ctrl is not held) — running two test systems side by side is more expensive.

## Consequences

- Selection state gains `sceneController.selectionParallelogram` (glyph coordinates,
  same contract as `selectionRect`, cleared when the drag ends).
- Component/background-image test precision under slanted selection is on par with
  rectangle mode (including a known simplification: when the rectangle fully contains
  the polygon, the test falls back to corners — consistent with the existing semantics
  of upstream's `rectIntersectsPolygon`).
- Verification: an independently implemented shear hit calculation matched real
  selections point by point (point/7,16,18); `npx playwright test` passed 35/35
  regressions.

## Related

- Feature pack: [docs/specs/09-slanted-selection/](../specs/09-slanted-selection/)
- Ledger: ENGRAM-CHANGES.md "R5-T5.5"
