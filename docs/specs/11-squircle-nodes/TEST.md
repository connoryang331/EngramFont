# R11 · Test Acceptance and Regression

Requirements: [PRD.md](./PRD.md) | Implementation: [SPEC.md](./SPEC.md) | Decision: ADR-0009 | Ledger: ENGRAM-CHANGES "R11-T11.1"

## 1. Math Core (subtask's bundled assertions, independently re-run by this repo)

`path-curvature.js` ships with a 138-assertion test; **this repo ran it independently before wiring it in and confirmed it passes** (never take the subtask report on faith):

```
T1 symmetric: before jump 0.000e+0 after 0.000e+0 ratio 1
T2 asymmetric: G2 ratio 0.707107 sqrt target 0.707107 before jump 3.125e-3 after 8.674e-19
T3 line-curve: before jump 4.800e-3 after 0.000e+0 room ok: true
T3b curve-line: before 2.910e-4 after 0.000e+0
4e (near-opposite) status: infeasible
===== RESULTS =====  pass 138 fail 0
```

## 2. This Repo's Integration Tests (`src-js/fontra-core/tests/test-squircle.js`, 25 assertions)

Tests directly whether curvature is continuous in the **real path model**, not merely "the flag was set":

| ID | Case | Assertion | Result |
|---|---|---|---|
| T1 | Asymmetric curve↔curve converted to squircle | Curvature jump 3.125e-3 → **8.674e-19** | ✅ |
| T1 | `getPoint()` | Returns `smooth:true, squircle:true` | ✅ |
| T2 | Handle ratio | `0.707107 == sqrt(C_/A_)` | ✅ |
| T3 | Turning squircle off | Clears the flag, still smooth | ✅ |
| T4 | line↔curve | Curvature jump at the junction is **0** | ✅ |
| T5 | 2-point contour | Returns `undefined`, path **unchanged** | ✅ |
| T5 | Coincident neighbors / opposite bending | No NaN/∞ coordinates; when infeasible, **no flag set, no geometry change** | ✅ |
| T6 | Serialization round trip | Both the squircle flag and `getPoint` are preserved | ✅ |

```
===== RESULTS =====  pass 25 fail 0   ALL TESTS PASSED
```

## 3. Canvas Rendering (isolated instance on 8801, **never touching the user's instance on 8800**)

Determined by **recording the real layer's `draw()` calls** (more reliable than color sampling):

| Icon | Path construction signature | Measured |
|---|---|---|
| corner square | `strokeRect` | 4 times |
| smooth eye shape | `quadraticCurveTo` | 2 times |
| **squircle superellipse** | **`lineTo` × 72 + `closePath`** | **72 times** ✅ |

Sizes (glyph units, scaleFactor 0.903):

| Icon | Drawn extent | Versus the square |
|---|---|---|
| corner square | 8 × 8 | — |
| **squircle** | **8 × 8** | **1.000 × 1.000** ✅ shares the same size box |
| smooth eye shape | 11.68 (long axis 1.46 × size) | — |

**Also confirmed `squircleExponent = 3`** — not scaled at scaleFactor 0.903
(before the fix it was 3.92; the factor was exactly the zoom factor).

## 4. Settings Panel

| Swatch | Drawn size (css px) | Fill ratio |
|---|---|---|
| Smooth node (eye shape) | 22.66 × 15.95 | 99.8% × 70.3% |
| **Squircle node** | **22.66 × 22.66** | **99.8% × 99.8%** |
| Corner node (square) | 22.66 × 22.66 | 99.8% × 99.8% |
| Handle (circle) | 22.66 × 22.66 | 99.8% × 99.8% |

→ The three swatches are **aligned at the same size**; the Squircle row = swatch + exponent dial (default 3), **no separate size**.

> ⚠ Methodology lesson: the earlier "alignment verified" claim **measured the wrong thing** — it measured the bounding box of the `input`
> (always 1.7em), not the actually drawn shape. Only parsing the extent of the `clip-path` polygon exposed the real problem.

## 5. Regression

| Item | Assertion | Result |
|---|---|---|
| fontra-core suite | `npm test` 1215 passing / 0 failing | ✅ |
| This repo's squircle tests | 25/25 | ✅ |
| Full e2e | `npx playwright test` | ✅ |
| Console | No pageerror / console.error | ✅ |
| Gesture state machine | 3 states × 2 gestures = 6 single-step transitions + 12 multi-step sequences, all asserted (state flags **and** geometry) | ✅ |

## 6. Real Bugs Fixed (all discovered on the spot during this development effort)

| # | Symptom | Root Cause | Fix |
|---|---|---|---|
| 1 | `Cannot access 'K' before initialization` (entire page blank) | `SQUIRCLE_EXPONENT_DEFAULT` declared at line 2215 but referenced at line 1394 by layer definitions **at module load time** → TDZ | Moved the declaration above the imports |
| 2 | `computeSmoothTangents is not defined` (no nodes drawn at all) | One block replacement accidentally deleted `computeSmoothTangents`/`eyePath`/`fillEyeNode`/`strokeEyeNode` (added in this session; net git diff change was zero, so it was invisible) | Rebuilt from the original text and verified the symbol table |
| 3 | Nodes squeezed away, on-curve points became handles | A handle was inserted on the **line side** too | Insert only on the curve side |
| 4 | Curvature only dropped to 6.4e-5 (not 1e-19) | `Math.round` on write-back coordinates destroyed the solution | Squircle write-back does not round |
| 5 | Exponent distorted by zoom (3 → 3.92) | The exponent lived in `screenParameters` and was multiplied by the zoom factor in `buildLayers` | Switched to `glyphParameters` (passed through as-is) |
| 6 | The superellipse icon was a size smaller than the square | The "equal area" rule was wrongly applied to the icon (only 58% of the box at n=3) | Changed to **share the same size box** as the square |
| 7 | `start-EngramFont.bat` restart failed with `Errno 10048` | The script did not stop the old instance; moreover the old service still answered `/serverinfo`, so **the readiness poll succeeded instantly and fooled the check** | Added an idempotent taskkill to the script; verification changed to **checking whether the PID changed** |
| 8 | The taskkill above was added but did not take effect | An **unescaped `)`** in `echo` closed the `for ... do (...)` block early, and `taskkill` was silently dropped | Removed the parentheses from the echo |

## 7. Measurement Scripts (reproducible)

- `qa/verify-squircle-canvas.mjs` — canvas pixel / draw-call verification
- `qa/verify-squircle-size.mjs` — swatch and canvas icon extent measurement
- `qa/verify-squircle-panel.mjs` / `verify-squircle-exponent.mjs` — panel and exponent
- `src-js/fontra-core/tests/test-squircle.js` — truth tests for curvature continuity
