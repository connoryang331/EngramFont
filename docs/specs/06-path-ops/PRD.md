# R6 · Path Operations Toolkit · PRD

## Background
meshfont's editor toolbar has path operations such as soften curves / straighten / make circle; the green slider on the R3 keyboard Dock (anchor add/remove) is a capability of the same family. Fontra only has curvature type conversion (cubic⇄quadratic) and lacks this group of geometric operations. All four are essentially one family: **path transforms based on the selected points/segments**, so they should live in a unified module.

## Goals
- Add a unified path operations module (pure frontend) providing four operations:
  1. **straighten**: straighten selected curve segments into lines
  2. **soften**: soften selected sharp corner points (insert rounded transition segments, parameterized)
  3. **make circle**: turn the selected closed contour into a perfect circle
  4. **anchor density** (the layer beneath the R3 green slider): interpolate points along the path / decimate points by tolerance
- All integrate with Fontra's existing selection model and undo system
- Corresponding buttons appear in the editor toolbar; the Dock's green slider consumes the density operations

## User Story
- I select a curve segment and click Straighten → the curve becomes a line (undoable in history)
- I select a sharp corner → drag the Soften slider → the corner gradually rounds
- I drag the Dock's green slider → the glyph's control points densify/simplify

## Non-Goals
- Boolean operations (Fontra already has them)
- Grid deformation (separate case)
- Offset/bold (letter thickness, P2 separate case)

## Acceptance Criteria (Overview)
- The four operations are available in selection state, undoable, and render correctly in dark theme
- soften/straighten round trips do not lose point order; density slider extremes do not crash

## Adjacent Capability Inventory: shape drawing tool family (verified 2026-10-11)
meshfont's toolbar shapes menu: Rectangle/Ellipse/Polygon/Star/Line.
Fontra's `edit-tools-shape.js` already has **ShapeToolRect (rect/square) + ShapeToolEllipse (ellipse/circle)** —
the framework (drag/preview/commit) is ready; extending it means implementing the `getUnpackedContours(x,y,w,h)` geometry functions:

| Shape | Gap | Formula Essentials | Estimate |
|---|---|---|---|
| Polygon (N sides, default 6) | ✗ | regular polygon vertices: angle=2πi/N, circumscribed circle radius=min(w,h)/2 | 0.25d |
| Star (N points, adjustable inner/outer ratio) | ✗ | 2N-vertex star with alternating radii R/r | 0.25d |
| Line (open segment) | ✗ | two-point segment, isClosed=false | 0.25d |

→ Merge into this requirement's shape-extension batch (implemented in the same batch as path-ops, ≈0.75d), registered in the same tool dropdown.
