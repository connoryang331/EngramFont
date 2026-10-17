# R6 · Test Acceptance & Regression

## Unit Tests (pure-function geometry assertions)
| ID | Case | Expected |
|---|---|---|
| UT6.1 | straighten: a cubic segment containing 2 off-curve points | segment becomes line, off-curve=0, endpoints unchanged |
| UT6.2 | soften: a right-angle corner point | split into 2 on-curve + a cubic segment, neighbors smooth |
| UT6.3 | make circle: any closed contour | 4 on-curve evenly distributed, symmetric about the bounds center |
| UT6.4 | add: cubic segment t=0.5 | the split point lies on the curve, both segments' shapes unchanged |
| UT6.5 | reduce: tolerance 0 | no points deleted; large tolerance | segment count decreases and deviation ≤ tolerance |
| UT6.6 | extremes: single-point contour / component glyph | skipped without crashing |

## E2E
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | select a curve segment → Straighten | canvas straightened, undo restores it |
| E2E-2 | select a corner → drag the Soften slider | real-time rounded transition |
| E2E-3 | drag the Dock's green slider | control point count changes, undo works |
| E2E-4 | dark theme / nothing selected | buttons disabled, theme fine |

## Regression
| Item | Assertion |
|---|---|
| Existing editing | pen/point dragging/undo unaffected |
| convert-curves-to-cubic/quadratic | original curvature conversion works |
| Performance | large glyph (100+ points) operations <100ms |
