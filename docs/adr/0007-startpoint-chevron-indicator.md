---
Id: ADR-0007
tags: [frontend, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# Start point direction indicator: arc changed to a pointed chevron (`>` / `<`)

## Background

The `fontra.startpoint.indicator` layer draws a direction indicator at the start point of every outline. The old implementation was an **arc centered on the start point** (`context.arc`, radius 9), using ±`START_POINT_ARC_GAP_ANGLE` (0.25π) to align the gap with the outline's direction of travel — the semantics were "gap faces = direction of travel".

User feedback (with screenshot): when the start point is selected it renders as "square + arc", which conveys direction poorly; the user asked to change it to a **pointed chevron**: `>` when facing right, `<` when facing left.

## Decision

Change the drawing within the same layer (single file: `visualization-layer-definitions.js`):

- The direction still comes from the travel direction `d = normalize(next - start)` and `angle = atan2(d.y, d.x)`;
- Shape: in local coordinates, draw a polyline `upper → tip → lower` whose tip faces `+x`
  (`tip = (r, 0)`, the two legs opening backwards from the tip by `±START_POINT_CHEVRON_HALF_ANGLE`, set to 0.28π);
- Placement: `save()` → `translate(start)` → `rotate(angle)` → draw → `restore()`;
- Stroke only, no fill (reusing `strokeWidth`); colors / light-dark variants / `selectionFunc` / `zIndex` unchanged;
- Remove `START_POINT_ARC_GAP_ANGLE` and add `START_POINT_CHEVRON_HALF_ANGLE`;
- Single-point outlines (no direction of travel) no longer draw a full circle; they are **skipped** instead
  (no indicator when there is no direction to convey).

## Rationale

1. **A chevron is more intuitive than a "gap"**: `>`/`<` are universal direction symbols, readable at a glance; the arc's gap direction requires the user to first learn the convention "gap = direction of travel";
2. **Rigid rotation naturally yields the left/right forms**: with the tip facing the direction of travel, facing right gives `>` and facing left gives `<`; it is a rotation rather than a mirror, which matches intuition (no extra branch that flips `>` into `<`);
3. **Minimal change surface**: one layer, one file; parameters and colors are reused, and other layers are unaffected.

## Rejected alternatives

- **Keep the arc and only adjust the gap angle**: the user explicitly asked for "greater-than / less-than signs"; an arc cannot express a pointed chevron;
- **Draw the arrow from two independent line segments (with a shaft)**: the start point already has a selection square / node icon; adding a shaft would look crowded; a bare chevron is lighter and sufficient for the "direction indicator" semantics;
- **Make the chevron size a setting**: there is no such need today; reusing `screenParameters.radius` is enough.

## Consequences

- The start point direction indicator becomes `>` / `<` / `∧` / `∨` and any oblique rotation in between;
- Single-point outlines no longer show a direction indicator (the old implementation showed a full circle);
- It coexists with the selection state (square / eye-shaped node) without positional conflict (the chevron opens outward with its tip at the start point).

## Related

- Feature pack: [docs/specs/10-startpoint-chevron/](../specs/10-startpoint-chevron/)
- Ledger: ENGRAM-CHANGES.md "R10-T10.1"
