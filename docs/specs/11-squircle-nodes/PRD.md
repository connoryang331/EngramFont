# R11 · Squircle Nodes (Curvature-Continuous / G2) · Requirements Document (PRD)

## Background

The existing node model has only two tiers:

- **corner** (square) = unconstrained;
- **smooth** (eye shape) = first-order continuity (G1): adjacent segments share their **tangent**.

Glyphs App also has a third tier (called super-smooth in its handbook): second-order continuity (G2), where **curvature** is continuous too,
so transitions carry no "curvature kink".

> Source: Glyphs Handbook · Editing Paths · Super-smooth Nodes
> <https://handbook.glyphsapp.com/editing-paths/#super-smooth-nodes>

Glyphs uses two icons to distinguish the two cases of that tier: the **five-pointed star** (curve↔curve) and
the **raindrop** (line↔curve).

## Requirement (User's Own Words)

> "Implement a feature like the one in the glyphs app. But it needs a modification: the image should be the superellipse icon.
> The five-pointed star is not needed."

> "SUPER_SMOOTH should be called the superellipse squircle instead of super smooth"

That is: **implement G2 curvature-continuous nodes, but use "squircle / superellipse" for both the name and the icon, not Glyphs' five-pointed star.**

This is consistent with this repo's existing design system — Font Design Legend Symbol System Design Notes (moved out of the repository)
long ago positioned the "superellipse point" as the symbol for **curvature continuity** and explicitly criticized the five-pointed star as
"a purely conventional symbol with no intuitive connection between shape and meaning". So this plan is not a deviation from Glyphs but an **execution of an existing decision: the shape is the meaning**.

## Goals

1. Nodes support a third tier: **squircle** (G2 curvature-continuous);
2. The icon is a **superellipse** (squircle); a five-pointed star must never appear;
3. Curve↔curve: solve exactly so that the curvature on both sides is equal;
4. Line↔curve: handle it per Glyphs' insight — a line has zero curvature, so the zero curvature must land on the **curve side**
   (handle at the midpoint), and "whether there is enough room" must be reported;
5. Size reuses the unified `nodeSize`, **no new size setting**; the exponent n is adjustable on the settings page, default **3**;
6. Switchable, undoable, and does not break existing corner/smooth behavior.

## User Stories

- I set a curve node to squircle → the icon becomes a superellipse and curvature no longer jumps at the transition.
- I set a line-to-curve junction to squircle → it produces a smooth transition instead of a harsh polyline.

## Non-Goals

- ~~Do not implement Glyphs' "small gray dot added on export" visualization~~ — **overturned by
  [ADR-0012](../../adr/0012-squircle-line-curve-derived-transition.md)**: derived geometry is exactly how this repo
  implements the line↔curve squircle (raindrop point), and the gray-dot visualization comes with it (ADR-0012 §7);
- No change to the existing smooth (eye shape) and corner (square) behavior;
- ~~Do not implement Glyphs' node-slide optimization — the default solution is exact and **does not need to move nodes**~~ — **revised by
  [ADR-0010](../../adr/0010-node-slide-g2.md)**: the G2 solution allows **sliding the node slightly along the tangent** (of the slide solution and the in-place solution, take whichever costs less).

## Acceptance Criteria

- Squircle nodes show the **superellipse** icon, no five-pointed star;
- Curve↔curve: the curvature jump on both sides drops to machine precision (measured 3.125e-3 → **8.674e-19**);
- Line↔curve: the curvature jump at the junction is 0;
- When mathematically infeasible (inflection / opposite bending), **no flag is set and no geometry changes** (the icon must not lie);
- The squircle icon and the corner square **share the same size box** (both are `nodeSize`);
- The three swatches on the settings page are the same size; the exponent is adjustable and **does not change with zoom**;
- Full e2e regression passes; zero console errors.
