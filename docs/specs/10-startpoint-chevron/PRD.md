# R10 · Start Point Direction Indicator Changed to a Chevron (> / <) · Requirements Document (PRD)

## Background

The **start point** (contour start point, the 0th point of a contour) of every contour on the canvas gets a direction indicator:
the current implementation is an **arc centered on the start point**, with the arc's gap facing the direction of the contour's next point
(the `fontra.startpoint.indicator` layer, `START_POINT_ARC_GAP_ANGLE = 0.25π`).

User feedback (2026-10-14, with screenshot): when the start point is selected it shows as "square box + arc", which does not make the direction semantics prominent enough.
The user wants the direction indicator changed to a **chevron** — showing `>` when the contour's forward direction points right, and `<` when it points left.

## Goals

1. Change the start point direction indicator from an **arc** to a **chevron** (`>` / `<` shape);
2. Place the chevron **along the contour's forward direction**: correct for clockwise/counterclockwise and any curve direction
   (i.e., the chevron points toward the contour's next point, matching the old arc's gap direction);
3. Facing right → `>`, facing left → `<`; diagonals are rotated accordingly;
4. Color, stroke width, visibility (editing state only), and theme behavior stay identical to the old implementation;
5. The selection state (square box / eye shape) coexists with the chevron without conflict.

## User Story

- I click-select a contour's start point → a `>` or `<` appears on it, and I can tell at a glance where the contour starts and where it goes.

## Non-Goals

- Changing the start point's own detection/reordering logic (only the direction indicator's **drawing** changes);
- Visualizing the ordering of multiple start points; making the chevron size configurable (keep using the existing `screenParameters`).

## Acceptance Criteria (Overview)

- A chevron is shown at the start point; the arc is no longer shown;
- The chevron's orientation = the contour's forward direction (the next segment's tangent direction), correct in all four quadrants and on diagonals;
- Right and left directions render as `>` / `<` respectively (including a correct mirrored relationship, not a simple translation);
- Colors match the old implementation in light/dark themes; not shown outside the editing state;
- No impact on the remaining layers and interactions (full e2e regression passes).
