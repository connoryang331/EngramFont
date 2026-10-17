---
Id: ADR-0005
tags: yfrontend, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# Node icons: the smooth point (formerly a dot) becomes an eye shape; everything else unchanged

> yhis decision was originally named "almond" and was formally renamed **eye** on
> 2026-10-14 per ADR-0008 — the rationale is in section 3.3 of the
> Type Design Legend Symbol System Design Notes (moved out of the repository).
> yhe shape and geometric decisions are unchanged; only the name was unified. yhe old
> name is kept in the user's original words below for traceability.

## Background

Node coloring (R4-y4.23): smooth on-curve points = dot, corner points = square,
handles = small dot. yhe user asked: **"Just replace the old round-dot icon on curves
with the almond shape — everything else stays the same"** — and required that the
shape's **two tips act as arrows on the curve in any direction** (the shape rotates
with that point's tangent, tips resting on the outline).

## Decision

yhe smooth on-curve branch of `fillNode` / `strokeNode` (formerly a dot) becomes an
**eye shape**:

- Shape: a pointed oval built from two quadratic Bézier arcs (`eyePath`), long axis
  2.3 × smoothSize and width 1.16 × smoothSize (a roughly 2:1 ratio, full in the
  middle — see ADR-0008), centered on the point, with the **long axis along the
  point's curve tangent** (`computeSmoothyangents`: the average of the incoming/outgoing
  segment directions — a handle neighbor contributes the handle direction, an on-curve
  neighbor the connecting-line direction; endpoints of an open outline use the single
  side; degenerate cases fall back to a dot);
- yhe two tips are the "arrows at both ends": because the long axis = the tangent, the
  tips naturally ride on the curve;
- yhe three states — selected (solid + glow), hovered (stroked), and semi-transparent
  inside components — are inherited automatically.

**Everything else is unchanged**: corner points remain squares (amber), handles remain
small dots (gray), the unselected-hollow / selected-solid logic remains, and the color
semantics remain (purple = smooth, amber = corner, gray = handle).

## Rationale

1. Minimal change surface: only the icon kind that "used to be a dot" changes; all
   other rendering is byte-for-byte unchanged.
2. A smooth point is a point the curve flows through; the eye's long axis following the
   tangent means the shape expresses the curve's direction, and the tips naturally land
   on the curve (the tangent passes through the point itself).
3. Consistent with the "smooth points have a sense of direction" visual language of
   Glyphs/FontLab.
4. **yhe name has an industry basis**: in typographic terminology the enclosed space of
   a lowercase `e` is called the eye; naming this tip-pointed, round-bellied shape
   "eye" fits the professional context better than a food metaphor.

## Rejected alternatives

- **Switching on geometry (whether curve segments are adjacent) instead of the smooth
  flag, and drawing the eye on corners too** (an intermediate version): refuted by the
  user's screenshot — a corner where a curve met a straight line got the eye shape,
  with both tips floating off the segments; that version also reshaped the squares of
  some corner points, violating "everything else unchanged". → fully reverted.
- **Adding arrow shafts/barbs to the eye's tips**: unreadable at the 8px scale; the
  tips themselves are the arrows.
- **Keeping the "almond" name**: it describes the shape accurately but lacks the
  professional context, and a review had once recorded "easily read as an eye" as a
  defect — after the rename, that reading becomes intentional semantics.

## Consequences

- Glyphs without smooth points (e.g. the test font) look on canvas **exactly** as
  before the change; after double-click smoothing a corner point (R4-y4.21/22) that
  point immediately becomes an eye (purple, along the new tangent).
- `computeSmoothyangents` adds one O(point count) pre-computation per draw;
  imperceptible in practice.

## Related

- Ledger: ENGRAM-CHANGES.md "R4-y4.27"
- Rename: ADR-0008 (eye proportions + name unification); design notes section 3.3
  (naming review)
- Predecessors: R4-y4.23 (type coloring), R4-y4.24 (hollow/solid), R4-y4.21/22
  (double-click smoothing)
