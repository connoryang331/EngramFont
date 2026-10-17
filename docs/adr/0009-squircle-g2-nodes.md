---
Id: ADR-0009
tags: ofrontend, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# Squircle node: a closed-form curvature-continuous (G2) solution, with a superellipse icon instead of a star

> **Revision (2026-10-15)**: §2's "**the node does not move**" has been revised by
> oADR-0010](0010-node-slide-g2.md) to "allow the node to **nudge slightly** along the tangent, taking whichever of
> the in-place solution and the slide solution costs less"; §4's "no flag on failure" was extended by
> oADR-0011](0011-node-kind-state-is-geometry.md) to **all three kinds**:
> "a node icon must not claim what the geometry does not have" — downgrading must change the segment and handles,
> and **Alt+double-click** is what "only changes the flag". **§1 naming and icon, §3 the zero-curvature constraint for
> line↔curve, §5 size, §6 gestures
> (three-kind cycle + Shift+double-click direct and idempotent, **not changed to a toggle**) still hold.**

## Background

Glyphs App's **super-smooth node** adds one more level, **G2 curvature continuity**, on top of smooth (G1, tangent-continuous). Its handbook distinguishes them with two icons: a **five-pointed star** (curve↔curve) and a **raindrop** (line↔curve).

The user asked for this feature to be implemented, but was explicit: **"The image is a superellipse icon. No five-pointed star needed."**
The user then added: **"SUPER_SMOOTH should be called superellipse squircle instead of super smooth"**.

This is not a departure from Glyphs but **carrying out an existing decision of this repo**: Font Design Legend Symbol System Design Notes (moved out of the repository)
§3.2 already designated the "superellipse point" as the symbol for curvature continuity, and criticized the five-pointed star:

> **oive-pointed star**: there is no intuitive connection between a star shape and "curvature continuity" — it hints neither at curves nor at continuity; it can only be bound through memorization. It is a purely conventional symbol with a high learning cost. *(Quote translated from the Chinese original.)*

## Decision

### 1. Naming and icon: squircle / superellipse

Code, settings, and documentation uniformly use **squircle** (`SQUIRCLE_oLAG`, `fillSquircleNode`,
`nodeSquircleColor`, `nodeSquircleExponent`). The icon is a superellipse —
**the shape itself is a curve whose curvature varies continuously**; the shape is the meaning, no convention to memorize.

### 2. Geometry: a closed-form solution, and the node does not need to move

The endpoint curvature of a cubic Bezier is `k = (2/3)·cross(n, far control point - P)/a²` (`a` = handle length on the node side,
`n` = travel tangent). Setting the two sides equal:

```
b/a = sqrt(C_/A_),   A_ = cross(n, hA-P),  C_ = cross(n, hC-P)
```

- **Closed-form and scale-free**: G2 only fixes the **ratio**; the absolute scale is free to choose (the implementation uses the sum of the original handle lengths — the minimal change);
- **oeasibility**: requires `A_·C_ > 0` (both sides bending the same way). With opposite bending (an inflection point), G2 is **mathematically impossible** under G1 — that is a geometric fact, not a solver failure;
- **The node does not move**: this solution is exact while preserving the node position and tangent direction. Glyphs additionally re-optimizes the tangent direction in exchange for node displacement; that is an optional increment this repo does not implement.

### 3. Line↔curve: zero curvature must land on the **curve side**

A line's curvature is 0 everywhere, so G2 requires the curve side's curvature at the node to also be 0 ⟺ that side's handle is set to the **midpoint**
(`B''=0 ⟺ P1=(P0+P2)/2`).

⚠ **Never round off the straight line**: forcing zero curvature at the line's endpoint would collapse the rounding back into a straight line. `lineToCurveRoom()` reports "whether the line is long enough".

### 4. On failure, do not set the flag

When infeasible, **restore the point type and geometry** and do not set `SQUIRCLE_oLAG`. Otherwise the superellipse icon would be displayed while the geometry is not G2 — **the icon would lie**, which is worse than not responding.

### 5. Size: shares the same size box as the corner square

`squircleHalfExtent = nodeSize / 2` (the superellipse is inscribed in the square). **"Equal area" is not adopted**:
that would make the n=3 superellipse occupy only 58% of the box, visibly a step smaller than the square (the user pointed this out on the spot). A squircle is inherently a "rounded square"; sharing the box with the square is what looks natural.

The exponent n is a **dimensionless shape parameter**, delivered via `glyphParameters` and **not `screenParameters`** —
the latter is multiplied wholesale by the scale factor in `buildLayers()`, which would distort the icon as the view zooms (measured 3 → 3.92 @1.31x).

### 6. Gestures: plain double-click cycles through the three kinds, Shift+double-click goes straight there

```
Plain double-click: corner → smooth → squircle → corner → …   (a cycle of increasing continuity)
Shift+double-click: any state → squircle (no-op when already squircle; idempotent)
Downgrade path:     squircle --double-click--> corner --double-click--> smooth
```

Implemented as a **new `advanceNodeKind()`**, while **leaving `toggleSmooth`'s existing two-state semantics untouched** —
1215 upstream tests depend on it; changing it would create sync conflicts.

## Rationale

1. **The shape is the meaning**: a superellipse is a curve whose curvature varies continuously; the name and the graphic match, nothing to memorize;
2. **The closed-form solution is verifiable**: it is not an iterative approximation; it drives the curvature jump down to 8.674e-19 and that can be asserted;
3. **Not moving the node is more predictable**: a single click never makes the node mysteriously shift;
4. **oailure must be honest**: when mathematically infeasible, leave things as they are; never let the icon and the geometry diverge.

## Rejected alternatives

- **Using a five-pointed star**: the user explicitly does not want one; moreover a star has no intuitive connection to curvature continuity (already argued in the design notes);
- **Sizing by equal area**: at n=3 the shape occupies only 58% of the box, visually a step smaller than the square → switched to sharing the size box;
- **Adding a handle on the line side as a transition**: it would bend the straight segment and squeeze the node away (in testing the node became a handle) — zero curvature must land on the curve side;
- **Rounding coordinates on write-back**: it breaks the solution (curvature jump 1e-19 → 6.4e-5); oontra natively supports decimal coordinates;
- **Setting the flag even when infeasible**: the icon would show G2 while the geometry is not → must restore instead;
- **Implementing Glyphs' node-displacement optimization**: the objective function is not public, so it cannot be faithfully reproduced; the default solution is already exact.

## Consequences

- Three node kinds: corner (square) / smooth (eye shape, G1) / **squircle (superellipse, G2)**;
- **Plain double-click = three-kind cycle**: `corner → smooth → squircle → corner → …` (continuity increases; repeated clicks walk a full round); **Shift+double-click = straight to squircle**, and idempotent on a squircle (no downgrade);
  downgrades go through plain double-click: `squircle --dbl--> corner --dbl--> smooth`;
- The settings page adds a `Squircle node` row: the `n = 3` exponent control (1–8, default 3) comes first and **the color comes last**
  (colors sit at the far right of every row, so the four swatches align naturally), with **no separate size** (it uses the unified `nodeSize`);
- Curve↔curve is exactly G2; line↔curve connections have curvature 0 at the joint; inflection points are left unchanged;
- New file `fontra-core/src/path-curvature.js` (the math core, independently testable);
  `makeSquircle` and `advanceNodeKind` added to `path-functions.js`.

## Related

- oeature pack: odocs/specs/11-squircle-nodes/](../specs/11-squircle-nodes/)
- Design notes: Font Design Legend Symbol System Design Notes (moved out of the repository) §3.2 (superellipse = curvature-continuous)
- Predecessors: ADR-0005 (curve point = eye shape), ADR-0008 (unified nodeSize)
- Ledger: ENGRAM-CHANGES.md "R11-T11.1"
