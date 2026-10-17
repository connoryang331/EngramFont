# R10 · Test Acceptance and Regression

Requirements: [PRD.md](./PRD.md) | Implementation: [SPEC.md](./SPEC.md) | Ledger: ENGRAM-CHANGES "R10-T10.1"

## 1. Direction Correctness (Playwright, **8801 e2e isolated instance**, honoring the BUG-006 hard constraint)

Construct 4 open contours with different orientations (start points facing right/left/up/down respectively), use the app's own
`canvasController.canvasPoint()` to compute each start point's screen coordinates, and take **cropped close-up screenshots** one by one:

| ID | Case | Expected | Result |
|---|---|---|---|
| TC-1 | Start point direction facing right | Shows `>` (tip facing right) | ✅ `qa/chev-right.png` |
| TC-2 | Start point direction facing left | Shows `<` (tip facing left) | ✅ `qa/chev-left.png` |
| TC-3 | Start point direction facing up | Shows `∧` | ✅ `qa/chev-up.png` |
| TC-4 | Start point direction facing down | Shows `∨` | ✅ `qa/chev-down.png` |
| TC-5 | Diagonal (45°/135°) | Chevron rotates with the direction | ✅ `qa/chevron-shapes.png` |
| TC-6 | No arc residue | No arc appears at the start point anymore | ✅ all screenshots |

## 2. Constant Gap (user follow-up requirement: the gap must not change when node size gets larger)

**This was a verification item missed in the first round**: the first version only verified direction; the chevron radius was hard-coded at 9 while node size could be raised to 24+,
causing the chevron to sit on top of the node icon (pointed out via the user's screenshot). After the fix the gap must be **quantified**.

Method: run the real layer code `draw()` with a recording context to extract the chevron's actual leg-end coordinates,
then densely sample 3000 points along the node outline (square/eye shape per the `fillSquareNode`/`eyePath` formulas)
and compute the **minimum visible gap**. The contour faces right, so the chevron's local coordinate system == the glyph coordinate system.

| Node shape | size 6 | 8 | 12 | 16 | 24 | 32 | 48 | spread |
|---|---|---|---|---|---|---|---|---|
| corner (square) | 7.04 | 6.67 | 6.54 | 6.54 | 6.54 | 6.54 | 6.54 | 0.50 |
| smooth (eye shape) | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | **0.000** |

- The eye shape is **perfectly constant** (spread 0.000); the square is constant at 6.54 for size ≥ 12;
- The 0.3–0.5px deviation for the square at size 6/8 comes from the geometry of the V-shaped legs versus the square corner (leg ends are points, corners are right angles) —
  sub-pixel and invisible to the eye;
- Conclusion: **the gap is independent of node size** (requirement met).

## 3. Size Coupling and Unification (user follow-up: the chevron scales with size, all three node kinds share one size)

**Requirements**: ① `>` / `<` scale proportionally with node size; ② corner / smooth / handle use **the same size** —
one larger and one smaller is not allowed; ③ the eye shape is full in the middle, and the settings page matches the editor area.

### 3.1 Size unification + chevron scaling (real settings path: localStorage → reload)

| nodeSize | cornerSize | smoothSize | handleSize | gap | chevronLength | chevronSpread |
|---|---|---|---|---|---|---|
| 4 | 4 | 4 | 4 | **5** | 3 | 2.5 |
| 8 | 8 | 8 | 8 | **5** | 6 | 5 |
| 16 | 16 | 16 | 16 | **5** | 12 | 10 |
| 24 | 24 | 24 | 24 | **5** | 18 | 15 |

- ✅ `corner == smooth == handle` holds at all sizes (**one shared size setting**);
- ✅ `gap` is constantly 5 and **does not scale with size** (the chevron never overlaps a node);
- ✅ The chevron is proportional: `chevronSpread / (size/8)` is constantly 5.

### 3.2 Eye-shape ratio changed to a true eye shape

| Location | Change | Verification |
|---|---|---|
| Editor canvas | `halfWidth` 0.34 → **0.58** × size (aspect ratio ≈ 2:1) | `qa/chevron-gap-sheet.png` (comparison sheet) |
| Settings page swatch | Added `.swatch-eye`: `clip-path: polygon()` sampled precisely along `4t(1-t)`, box 2.6em × 1.31em (same ratio as the shape) | `qa/panel-node-appearance.png` |

Both share the constants `EYE_HALF_LEN_FACTOR` / `EYE_HALF_WIDTH_FACTOR` (single source of truth).

### 3.3 Gap still constant (re-measured after the ratio change)

| Node shape | Visible gap for size 6 → 48 | spread |
|---|---|---|
| corner (square) | 7.04, 6.67, 6.54, 6.54, 6.54, 6.54, 6.54 | 0.50 |
| smooth (eye shape) | 9.24 ×7 | **0.000** |

The eye shape is perfectly constant; the square is constant at 6.54 for size ≥ 12 (the 0.3–0.5px difference at small sizes comes from the geometry of the V-shaped legs versus the square corner).

### 3.4 Settings panel appearance

The `Node appearance` card = **Node size** (the single size dial) + three color rows for Smooth node / Corner node / Handle
(each with a reset). The Smooth swatch is a purple **eye shape**, Corner is an amber square,
Handle is a gray circle → `qa/panel-node-appearance.png`.

## 4. Visual Evidence

- `qa/chevron-gap-sheet.png` — an enlarged comparison sheet rendered with the **real layer code**
  (square/eye shape × size 8/16/24/32), where the identical gaps across sizes are directly visible;
- `qa/chev-right.png` / `chev-left.png` / `chev-up.png` / `chev-down.png` — close-ups of the four directions.

## 4. Regression

| Item | Assertion | Result |
|---|---|---|
| Full e2e | `npx playwright test` 35/35 | ✅ |
| docs lint | `node docs/lint.cjs` 74 documents | ✅ |
| Console | No pageerror / console.error | ✅ |
| Layer toggles | The remaining layers (nodes/handles/path stroke) behave unchanged | ✅ |
| localStorage migration | Old `nodeSmoothSize` values written into `nodeSize`, the three old keys deleted | ✅ |

## 6. Measurement Scripts (reproducible)

- `qa/measure-gap-geometry.mjs` — gap measurement (data source for Section 2 and 3.3)
- `qa/verify-nodesize-real.mjs` — size unification + chevron scaling (3.1, via the real localStorage path)
- `qa/verify-panel.mjs` — settings panel screenshot and row structure
- `qa/gap-sheet.mjs` — generates the enlarged comparison sheet
- `qa/verify-chev-clip.mjs` — four-direction close-ups
