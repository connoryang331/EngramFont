# R9 · Test Acceptance and Regression

Requirements: [PRD.md](./PRD.md) | Implementation: ADR-0003 | Ledger: ENGRAM-CHANGES "R5-T5.5"

## E2E / Manual Testing (Playwright headless, 8800 · Untitled.fontra "a", zoom so the glyph avoids the dock)

| ID | Steps | Expected | Result |
|---|---|---|---|
| TC-1 | Rectangular marquee drag (no Ctrl) | Selection = on-curve nodes inside the rectangle (4 points) | ✅ |
| TC-2 | Press Ctrl during the drag to set the angle | `selectionParallelogram` appears (shearK≈0.615); dashed parallelogram renders | ✅ (`qa/sel-2-slant-mid.png`) |
| TC-3 | Selection during the slanted phase | **Point-by-point identical** to independent sheared hit computation (point/7,16,18) | ✅ |
| TC-4 | Release Ctrl and keep dragging | Angle frozen, only size changes (corner follows the mouse) | ✅ (`qa/sel-3-resize-mid.png`) |
| TC-5 | mouse.up | `selectionParallelogram`/`selectionRect` cleared; the selected set is kept | ✅ (3 points kept) |
| TC-6 | Light/dark themes | The parallelogram dashed line is visible in both themes | ✅ |

## Regression

| Item | Assertion | Result |
|---|---|---|
| Behavior compatibility | Marquee selection without touching Ctrl takes the original `selectionAtRect` path | ✅ (dbg rectSelectCalls=8) |
| Full e2e | `npx playwright test` 35/35 (keyboard-dock / proof-edit-mode / background-image / export / import / new-font) | ✅ |
| Console | No pageerror / no console.error | ✅ |

## Known Edge Cases

- In the test environment, watch out for the dock covering the lower edge of the canvas — hit-test drag landing points first ([BUG-005](../../bugfixes/2026-10-14-keyboard-dock-swallowed-bottom-edge-drag.md));
- On Windows, Ctrl is also the "add to selection" modifier key (commandKeyProperty): in slanted-selection mode the
  selection mode takes the **initial event** (the modifier state before Ctrl was pressed), so the two do not interfere; on Mac, Ctrl has no such conflict.
