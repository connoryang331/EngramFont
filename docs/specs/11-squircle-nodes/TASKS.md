# R11 · Task Breakdown (Work Order)

## T11.1 · Math Core
Derive the G2 condition and implement `path-curvature.js` (closed-form solution + line↔curve + feasibility check + room check).
DoD: the bundled 138 assertions all pass, and **this repo independently re-runs and confirms them** (never take the subtask report on faith).

## T11.2 · Data Layer
`SQUIRCLE_FLAG = 0x10` + support in `getPoint`/`setPointType`/`packPointType`/`packContour`.
DoD: the flag survives a serialization round trip; a squircle point is also smooth.

## T11.3 · Geometry Adapter
`collectSegmentSide` + `applySquircleAtPoint` + `makeSquircle` + `advanceNodeKind`.
DoD: curve↔curve curvature jump drops to machine precision; no handle inserted on the line side; the flag is not set when infeasible.

## T11.4 · Rendering Layer
`squirclePath` + `fill/strokeSquircleNode` + wiring of the three layers + dedicated color.
DoD: `lineTo` ×72 on the canvas proves the superellipse is being drawn; **shares the same size box as the square**.

## T11.5 · Settings Layer
`nodeSquircleColor` + `nodeSquircleExponent` (default 3) + new panel row + `.swatch-squircle`.
DoD: the exponent is adjustable, persisted, and **does not change with zoom**; the swatch is the same size as the other swatches.

## T11.6 · Interaction
Plain double-click three-tier cycle + Shift+double-click direct + undo label (14 languages).
DoD: **every transition sequence** of both gestures has assertions (state flags + geometry, both verified).

## T11.7 · Verification and Documentation
Unit tests, 8801 canvas/panel checks, full e2e, ADR-0009, ledger, AGENTS precedent quick reference.
DoD: everything passes and is recorded.
