---
Id: ADR-0006
tags: [frontend, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# Double-click convert to curve: straight segments become true curves, handles generated along the common tangent through the node (Glyphs/FontLab semantics)

## Background

Double-clicking an on-curve point = smooth / convert to curve (R4-T4.21/22). User
report: double-clicking the top-right corner of a rectangle pulled a huge outward arc
out of the right edge, while "clicking the other three points behaved normally" — the
**amount of deformation differed from corner to corner**.

Root cause (pass 3 of R4-T4.22): it re-queried neighbors on a **path already mutated by
pass 2**, and located insertion points using a global `insertedPositions` offset table
(cross-outline crosstalk); it also pulled a corner's two handles onto the diagonal with
`alignHandles`. When smoothing several corners in a row, handles inserted earlier took
part in the computation as neighbors → handle positions drifted with each step and
flew off past the edge's extension.

The user then made the goal explicit (screenshot + explanation): **"Same as the glyphs
app and fontlab: double-click a straight square node and it becomes an arc-shaped
almond node; the straight line becomes a curve, and the handles need to change with
it"** — i.e. true convert-to-curve à la Glyphs/FontLab: **the straight segment becomes
a curved segment, handles are generated along the tangent, and the outline bends
accordingly**.

## Decision

Pass 3 of `toggleSmooth` is rewritten; semantics = Glyphs/FontLab convert to curve:

1. **Pass 2 only flips flags** (no more geometry on the already-mutated path);
2. **Pass 3 computes all geometry from the pass-1 snapshot**:
   - Both sides already have handles (a pure curve point) → `alignHandles` aligns them
     to the common tangent (upstream Fontra behavior);
   - One side is a straight segment → handles are generated on the **common tangent
     through that node**:
     - direction = the sum of the incoming/outgoing segment unit vectors (normalized);
     - length = 1/3 of that segment's length, measured along the tangent;
     - when the neighbors are collinear it degrades to the segment's 1/3 point (shape
       unchanged); at a true corner the handles swing onto the tangent → **the line
       bends**;
   - The **far-side handle** at the straight segment's other end is created in the same
     pass (skipped when that end is also converted in this operation — it builds its
     own), so the whole segment becomes a complete cubic;
3. **All insertions are applied in descending absolute-index order with same-slot
   priority**: when two insertions share a slot (the previous segment's far-side handle
   and the next segment's near-side handle share the anchor index), the far-side one
   goes in first, preserving cubic order (start, far handle, near handle, end);
4. The global offset table spanning outlines (the old bug source) is removed; each
   outline locates its insertions independently.

## Rationale

1. **Matches the Glyphs/FontLab behavior the user explicitly specified**: after
   conversion the outline really bends, and the handles remain draggable for
   fine-tuning;
2. **Eliminates "different corners deform differently"**: all geometry comes from the
   pre-operation snapshot, independent of click order and of how many corners were
   already smoothed;
3. **No upstream behavior lost**: alignment for pure curve points (`alignHandles`) is
   kept; it just runs on the snapshot.

## Rejected alternatives

- **Keep the old pass 3 (re-querying neighbors on the mutated path + global offsets)**:
  this was exactly the root cause of the drifting/flying handles;
- **The "outline must not change at all" version (flag flip only + handles laid along
  the segment)**: explicitly rejected by the user — "the handles need to change with
  it"; conversion should bend the straight line into a curve;
- **Create handles only for "tangent-collinear" corners**: for hand-drawn glyphs joined
  at corners this made the feature effectively invisible.

## Consequences

- Double-clicking any corner of a rectangle: the corner becomes an eye shape, the two
  adjacent segments become cubics, and the outline bulges outward along the tangents —
  all four corners behave **identically** (no more "only some corners work");
- Curve-to-curve point alignment matches upstream;
- One-sided straight segments (adjacent to a curve point that already has handles) get
  a handle on that side only; the other side keeps its original handle;
- The repo's test font (TestFont / Untitled.fontra) was modified by automation scripts
  during debugging; see
  [BUG-006](../bugfixes/2026-10-14-dual-write-collision-remote-replay-overrun.md).

## Related

- Ledger: ENGRAM-CHANGES.md "R4-T4.28"
- Predecessors: R4-T4.21/22 (double-click smooth/convert), ADR-0005 (smooth point =
  eye icon)
