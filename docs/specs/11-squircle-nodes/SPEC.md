# R11 · Technical Specification (SPEC)

## Math Core (`src-js/fontra-core/src/path-curvature.js`, new file)

Endpoint derivatives of the cubic Bézier `B(t)`:

```
B'(0)  = 3(P1-P0)        B''(0) = 6(P2-2P1+P0)
B'(1)  = 3(P3-P2)        B''(1) = 6(P3-2P2+P1)
```

Signed curvature `k = (v × a)/|v|³`; the **curvature vector** `κ⃗ = k · leftNormal(v)` (it points at the center of curvature,
not along the tangent — anything computed along the tangent is not comparable across nodes).

G2 ⟺ `κ⃗_left == κ⃗_right`. Orient both sides **away from the node**; when G1 holds, the tangential components are already equal,
so G2 reduces to the scalar equation `k_L = k_R`.

**Closed-form solution**: let `X = P - a·n`, `Y = P + b·n` (`n` = the unit **forward** tangent, `a,b` = the handle lengths on the two sides):

```
k_L = (2/3)·cross(n, hA-P)/a²      k_R = (2/3)·cross(n, hC-P)/b²
G2  ⟺  b/a = sqrt(C_/A_),   A_ = cross(n,hA-P),  C_ = cross(n,hC-P)
```

- **Scale freedom**: curvature ∝ 1/a², so G2 only fixes the **ratio**; the implementation takes `a+b` = the sum of the original handle lengths (the minimal change).
- **Feasibility**: requires `A_·C_ > 0`, i.e., both sides **bend in the same direction**; with opposite bending (an inflection), G2 under G1 is
  **mathematically impossible** — return `infeasible`.
- **"Node movement"**: this solution does **not** need to move the node (Glyphs additionally re-optimizes the tangent direction, an optional increment).

**Line↔curve**: a line's curvature is always 0, so G2 requires the curve side to also have zero curvature at the node ⟺

```
line→curve:  curve[1] = (curve[0] + curve[2]) / 2
curve→line:  curve[2] = (curve[3] + curve[1]) / 2
```

⚠ **Key conclusion**: **the line side must not be "rounded"** — forcing zero curvature at the line's endpoint would collapse the rounding back into the line.
The zero curvature must land on the **curve side**. `lineToCurveRoom()` additionally reports "whether the line is long enough".

> This module was derived and implemented by an independent subtask and ships with 138 assertions; it was wired in only after this repo **independently re-ran it and confirmed it passes**.

## Data Layer (`src-js/fontra-core/src/var-path.js`)

- Add `static SQUIRCLE_FLAG = 0x10`, **outside** `POINT_TYPE_MASK(0x07)`
  (isomorphic to `SMOOTH_FLAG = 0x08`: an annotation on an on-curve point, not a curve type);
- A squircle point **also** carries `SMOOTH_FLAG` (G1 is implied by G2); `getPoint()` checks
  `SQUIRCLE_FLAG` first and returns `{smooth: true, squircle: true}`;
- `setPointType(idx, type, smooth, squircle)`, `packPointType(type, smooth, squircle)`, and
  `packContour` are updated to support it as well.

## Geometry Layer (`src-js/fontra-core/src/path-functions.js`)

- `collectSegmentSide(path, pointIndex, direction)`: translates path points into the solver's
  `[far, farHandle, nodeHandle, node]` segment model. One side may have 0/1/2 off-curve points;
  a missing handle is synthesized at the 1/3 position (making that side a line with curvature 0 — exactly the solver's "line" case).
- `applySquircleAtPoint(path, pointIndex)`: calls `makeSuperSmooth` to solve and writes the result back.
  - The write-back does **not round**: integer rounding breaks the solution (measured curvature jump went 8.674e-19 → 6.4e-5),
    while Fontra natively supports decimal coordinates (dragging nodes already produces decimals).
  - **Insertion restriction**: missing handles are inserted only on the **curve side**. Inserting a handle on the line side bends what should be a straight segment
    and squeezes the node away (observed: node displacement, node turning into a handle).
- `makeSquircle(path, pointIndices, force)`: **upgrade** semantics (not a toggle) — points that are already squircle are left untouched (idempotent);
  - Off: only clears `SQUIRCLE_FLAG` (smooth is kept);
  - On: **solve first; set the flag only on success**. When infeasible, **restore the point type and geometry** —
    otherwise the superellipse icon would show while the geometry is not G2, i.e., the icon would lie;
  - With multiple points, process them in **descending absolute index order** (insertions shift later indices).

## Rendering Layer (`src-js/views-editor/src/visualization-layer-definitions.js`)

- `squircleHalfExtent(nodeSize) => nodeSize / 2`: the superellipse is **inscribed in the same-size box as the corner square**
  (a squircle is a rounded square). **Do not use equal area** — equal area would make it occupy only 58% of the box at n=3,
  visibly a size smaller than the square (the user pointed this out on the spot).
- `squirclePath(context, pt, nodeSize, exponent)`: a parametric polyline (72 segments) of `|x/a|^n + |y/b|^n = 1`,
  `x = sign(cos t)·|cos t|^(2/n)`;
- `fillSquircleNode` / `strokeSquircleNode` are exported; `fillNode`/`strokeNode` call them in the
  `pt.squircle` branch, with color from `squircleColor` (newly added to `nodeTypeColors`; light #D6336C / dark #F472B6 (rose, with its hue clearly separated from smooth's purple, corner's amber, and handle's gray));
- The exponent is passed down via `glyphParameters`, **not through `screenParameters`** — the latter gets
  multiplied wholesale by the zoom factor in `buildLayers()`, which would distort the exponent as the view zooms (measured 3 → 3.92 @1.31x).

## Settings (`theme-settings.js` + `panel-theme-settings.js` + `simple-settings.js`)

- Model keys: `nodeSquircleColor` (default `#D6336C`), `nodeSquircleExponent` (default **3**);
- The panel gains a new row `Squircle node` = swatch + exponent dial (1–8, step 1);
  **no separate size** (reuses the unified `nodeSize`);
- The `clip-path` of `.swatch-squircle` is **generated inline** by `squircleClipPath(exponent)`
  (the exponent is variable, which a static CSS polygon cannot express), sampled in the same 72 steps as the canvas and **filling the 1.7em box**,
  the same size as the square/circle/eye-shape swatches.

## Interaction (`edit-tools-pointer.js`)

**Plain double-click = three-tier cycle** `corner → smooth → squircle → corner` (`advanceNodeKind`); **Shift+double-click = straight to squircle**, idempotent on a squircle (no downgrade); downgrades go through the plain double-click (`squircle --dbl--> corner --dbl--> smooth`). Note that the plain double-click is **no longer self-inverse**, and smooth→squircle genuinely bends the outline;
undo label `edit-tools-pointer.undo.toggle-squircle`, added to all 14 language files.

## Files Involved

| File | Nature |
|---|---|
| `fontra-core/src/path-curvature.js` | New (math core) |
| `fontra-core/src/var-path.js` | New flag + read/write |
| `fontra-core/src/path-functions.js` | `makeSquircle` + `advanceNodeKind` + adapter layer |
| `fontra-core/src/theme-settings.js` | Two new model keys |
| `fontra-webcomponents/src/simple-settings.js` | `squircleClipPath` + `.swatch-squircle` |
| `views-applicationsettings/src/panel-theme-settings.js` | New settings row |
| `views-editor/src/visualization-layer-definitions.js` | Superellipse icon + layer wiring |
| `views-editor/src/edit-tools-pointer.js` | Double-click cycle / Shift+double-click direct |
| `fontra-core/tests/test-squircle.js` | New tests |
| `fontra-core/assets/lang/*.js` | Undo entry added to 14 language files |
