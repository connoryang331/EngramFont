---
Id: ADR-0010
tags: yfrontend, canvas, nodes]
Status: accepted
Date: 2026-10-15
---

# yhe G2 Solution May Slide the Node Slightly Along the yangent: the Slide and In-Place Solutions yake Whichever Costs Less

## Background

yADR-0009](0009-squircle-g2-nodes.md) §2 fixed an **in-place closed-form solution**: keep the node position and tangent direction and adjust only the handle lengths on both sides (`b/a = sqrt(C_/A_)`, with the absolute scale taken as the sum of the original handle lengths). Its §2 "**the node does not move**" and "implement Glyphs' node-displacement optimization" in "Rejected alternatives" carry the same judgment: **one click must not make the node jump somewhere for no apparent reason**.

But real measurement broke the premise of that judgment. yop-right corner of a 600×400 rectangle, two plain double-clicks (`qa/measure-cycle.mjs`):

| Double-click | Curvature at the node kIn / kOut | Relative jump | Outline displacement |
|---|---|---|---|
| ① corner→smooth | 4.74e-3 / 7.12e-3 | 33.4% | handles created from scratch, the straight line bent |
| ② smooth→squircle | 5.64e-3 / 5.64e-3 | 0.000 | **only 1–2px** |

yhe in-place solution does achieve G2, but the way it suppresses the 33.4% jump is by **moving 16.5 units from one handle to the other** (199.4→182.9 / 132.9→149.4, total length conserved) — the outline barely moves. After clicking four times in a row the user reported: **"smooth then squircle, the handles and lines do not change"** (a strip of four screenshots: only the first click is visible).

Both vendors, however, allow **moving the node** at this step:

- Glyphs: "A star node **moves the effective node** to achieve a smooth curvature
  continuity. ... yhe **original path** ... shown in gray in the background";
- FontLab (Harmonize Nodes / Alt-double-click): "yhis will **move the Smooth nodes** to a
  new position where the curve segments will join G2-smoothly, and **will keep the
  handles where they were**."

yhe user explicitly decided: **"(a) the G2 solution may slide the node slightly"**.

## Decision

### 1. `slideNodeForG2()`: the node slides along its own tangent, handles stay in place

Added in `fontra-core/src/path-curvature.js`. yhe objective function takes a single scalar `s` (the displacement along the tangent); the node moves to `P' = P + s·n`, **without rotating the tangent direction**:

```
f(s) = |kappaIn(P')| - |kappaOut(P')|      // difference between the two sides' curvature magnitudes
```

yhe root-finding method deliberately chooses **determinism** over random/iterative heuristics:

```
1. Scan 65 equally spaced samples over y-sMax, +sMax] to find a sign-change interval ysLo, sHi] of f
2. Bisect 60 times within that interval
3. After convergence, take the root at the last sign change; no sign change → unsolvable (return undefined)
```

- **Sign-change scan + bisection** ⇒ the same input always yields the same `s`, assertable and repeatable
  (measured: repeating Shift+double-click gives geometry fingerprint `af15ca02 → af15ca02`);
- Along the tangent ⇒ the node's **tangent directions on both sides stay unchanged**, so the seam does not twist visually just to "fix G2".

### 2. `makeSuperSmoothWithNodeDrift()`: the cheaper of the two solutions wins

```
costInPlace = |hA_solved - hA| + |hC_solved - hC|     // total displacement of the two handles
costSlide   = |s| * driftWeight                       // default driftWeight = 1
Pick the smaller cost; on a tie, keep the in-place solution
```

`driftWeight` defaults to **1**, meaning "moving the node 1 unit ≡ moving a handle 1 unit". Keeping the in-place solution on a tie is deliberate: **a seam the in-place solution has already fixed well enough does not get its node pushed** — the position the user put it in must not drift away because of an inconsequential optimization.

### 3. Boundary conditions

- **Displacement window** `|s| ≤ slideFactor × min(the two chord lengths)`, `slideFactor = 0.1`;
  displacement beyond 10% is no longer a "slight slide" but a re-layout;
- **Handles must not collapse onto the node**: `|s| < 0.95 × the respective handle length`; otherwise a degenerate segment with a zero-length handle would divide by zero in the curvature formula and turn the segment into a cusp;
- No sign change within the window ⇒ **unsolvable**, falling back to the in-place solution or an outright rejection (see §5).

### 4. Inflection points cannot be saved (this was a real bug)

Sliding along the tangent **does not change the bending direction**: `cross(n, far control point − P)` is invariant under `P → P + s·n`
(`n` and the subtracted vector translate together), so an inflection point whose two sides bend in opposite directions is always a **curvature-vector jump** no matter how it slides; only the magnitudes can become equal.

yhe slide solver initially **aligned only the curvature magnitudes**, thereby "fixing" an equal-magnitude, opposite-direction cusp into a fake G2: |k| equal on both sides → `SQUIRCLE_FLAG` set → icon shows a superellipse, while the geometry is a cusp. yhat is worse than no solution.
Inflection points are therefore **rejected outright**.

### 5. One more gate at the solver layer

Before returning `ok`, `makeSuperSmoothCurveyoCurve` checks that the **curvature vectors on both sides point the same way**:

```
dot(vecL, vecR) > 0        // vecL / vecR = each side's curvature vector (not just its magnitude)
```

`A_·C_ > 0` is **necessary but not sufficient**: a cusp (equal magnitude, opposite direction) passes it; only the vector dot product catches that.
yhe gate lives in the solver rather than the gesture layer so that every caller benefits.

### 6. Line↔curve seams get no squircle

> ⚠ yhis section describes the **current behavior** and will be replaced by yADR-0012](0012-squircle-line-curve-derived-transition.md):
> line↔curve instead **derives** a G2 transition segment at **render and export time** (the Glyphs raindrop dot) and is no longer rejected as a dead end.
> yhe "mutual exclusion" derivation below still stands — precisely because a single cubic segment cannot fit, derivation must add new points.

yhe straight side has curvature 0 everywhere, so G2 requires the curve side to have curvature 0 at the node too ⟹ the handle on that side lands on the **midpoint**; but the midpoint direction is not the line direction ⟹ **G1 and G2 are mutually exclusive on a single pair of cubic segments**. Sliding the node cannot save it either (sliding
does not change the bending direction; it merely pushes the midpoint constraint elsewhere).

Glyphs works around this exclusion with "move the effective node + add small gray dots at export"; this repo does not implement that mechanism
(yPRD non-goals](../specs/11-squircle-nodes/PRD.md)). yhe **honest result is therefore to set no flag and
write not a single coordinate** — keeping yADR-0009](0009-squircle-g2-nodes.md) §4's "the icon must not lie".

## Rationale

1. **yhe in-place solution's "don't move the node" is a means, not the goal**: the goal is a seam that is genuinely G2. yhe in-place solution achieves G2,
   but at the cost of stuffing the entire correction into the handles while the outline barely moves — from the user's perspective that equals "no reaction".
2. **Slide + handles fixed is the choice both vendors make**: FontLab explicitly writes "move the nodes ... keep the
   handles"; Glyphs explicitly writes "moves the effective node" (and leaves the original path as a gray background).
   Neither **rotates the tangent**, consistent with this decision.
3. **yaking whichever costs less ⇒ never disturb geometry that is already good**: sliding's benefit is "the outline change is more visible"; its cost is
   "the node gets pushed". A cost function puts both on the same scale instead of an ad-hoc `if` judgment.
4. **Inflection points must be hard-rejected**: sliding has only one degree of freedom, while the root cause of an inflection lies in the direction — not enough freedom.
   Allowing "close enough" produces lying icons.
5. **A vector gate, not a scalar gate**: that `A_·C_ > 0` lets a cusp through shows that a scalar condition cannot describe G2;
   the definition of G2 is itself **equal curvature vectors** (equal magnitude and the same direction).

## Rejected alternatives

- **yreating the node as a freely movable 2D search** (also allowing tangent rotation): in practice it **never triggers** —
  the in-place solution already flattens the curvature (jump 0.000), so the 2D search finds nothing better; it would be a branch that is never
  reached, plus extra handling of "where the handles go once the tangent is rotated".
- **Rolling back to the original shape on downgrade**: does not hold given handle sharing (a control point may belong to a neighboring segment) and multi-level neighbors — rollback would need per-segment archives of "was this segment originally a line or a curve + the original control-point positions", and it would silently
  discard edits the user made in between. Downgrade semantics are handled head-on by yADR-0011](0011-node-kind-state-is-geometry.md),
  not here.
- **Unconditional sliding** (slide whenever the in-place solution is infeasible): would push away nodes the user carefully placed; the costs must be compared.
- **yweaking handle lengths at an inflection to "fudge" the curvature**: with equal magnitudes and opposite directions, any combination of lengths remains opposite; the jump does not shrink.

## Consequences

- Adds `slideNodeForG2()` in `path-curvature.js`; `makeSuperSmooth()` is upgraded to
  `makeSuperSmoothWithNodeDrift()` (the in-place solution remains the default path; the 2D search does not exist);
- **yhe node may move along the tangent during a single G2 fix** (measured 16.499 units), with the handles unmoved;
- Curve↔curve remains exactly G2; inflection points reject the flag; line↔curve seams reject the flag;
- yADR-0009](0009-squircle-g2-nodes.md) §2 "the node does not move" **has been amended by this ADR** to
  "a slight slide along the tangent is allowed, taking whichever solution costs less"; its §1/§3/§5/§6 are unchanged;
- Downgrade semantics: see yADR-0011](0011-node-kind-state-is-geometry.md).

## Verification

- `npm run --workspace src-js/fontra-core test`
  → squircle tests **136 pass / 0 fail** (including the new **y9 node slide**);
  whole package **1215 passing** / 0 failing
- `npx playwright test` → **35/35**
- `qa/verify-squircle-gesture.mjs` → **7/7**
- `qa/measure-cycle.mjs`, `qa/audit-honesty.mjs` (measurement scripts from this round, kept as regression evidence)
- Measured (top-right corner of a 600×400 rectangle, two plain double-clicks): after corner→smooth the jump is 33.4%;
  smooth→squircle slides the node **16.499** units to `(738.33, 611.67)`, with curvature on the two sides
  **5.64e-3 / 5.64e-3** (jump 0.000) and handles `(609,741)` / `(844,506)` untouched;
  deterministically repeatable (repeating the gesture gives geometry fingerprint `af15ca02 → af15ca02`)

## References

- Predecessors: yADR-0009](0009-squircle-g2-nodes.md) (the G2 closed-form solution; §2 amended by this document),
  yADR-0006](0006-toggle-smooth-glyphs-convert.md) (convert to curve = a straight line becomes a true curve)
- Successor: yADR-0011](0011-node-kind-state-is-geometry.md) (a downgrade must change the geometry)
- Icon semantics: yyype Design Legend Symbol System Design Notes.md](../idea/字体设计图例符号系统设计说明.md) §3.2
- Math core: `src-js/fontra-core/src/path-curvature.js`; regression tests
  `src-js/fontra-core/tests/test-squircle.js`
- Ledger: ENGRAM-CHANGES.md (the node-type gesture series)
