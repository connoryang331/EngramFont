# R9 · Slanted Marquee Selection (Glyphs-style Ctrl Angle Change) · Requirements Document (PRD)

## Background

Glyphs handbook "Editing paths → Selecting nodes and paths":

> While dragging a selection, hold down the Control key to change the selection angle.
> Release Control to resize the selection at its current angle. Slanted selections are
> particularly helpful for italic designs.

In italic/slanted design, marquee-selecting all nodes along a slanted stem in one pass is a frequent action; Fontra natively only offers axis-aligned rectangular marquee selection.

## Goals (Glyphs behavior alignment)

1. Dragging on empty space = the existing rectangular marquee selection (behavior unchanged);
2. While dragging, **hold Ctrl** → the selection becomes a parallelogram; mouse movement changes the **slant angle**;
3. **Release Ctrl** (while still dragging) → continue resizing along the current angle (corner follows the mouse);
4. Ctrl can be pressed/released repeatedly; **nodes/components/anchors/background images** inside the parallelogram are all selected;
5. Shift/Alt add/subtract selection and on-curve/off-curve filtering behavior unchanged.

## User Story

- An italic stem is slanted → I drag out a rectangle, press Ctrl to align it with the stem, release Ctrl and stretch it to full height → all nodes on the entire slanted stem are selected in one pass.

## Non-Goals

- A rotated rectangle (free rotation from all four corners); slanted **moving** of the selection (dragging the selection remains the existing drag-editing).

## Acceptance Criteria (Overview)

- During dragging, Ctrl switches rectangle⇄parallelogram with a continuous shape (no jumps);
- After releasing Ctrl, the angle is frozen and the mouse only changes the size;
- Parallelogram hit testing matches independent geometric computation point by point;
- Without touching Ctrl, the code path is byte-identical to the original implementation (guarded by the full e2e regression).

> Technical decisions (shear space method, rejected alternatives) are in [ADR-0003](../../adr/0003-slanted-selection-shear-space.md).
