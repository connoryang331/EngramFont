# R10 · Task Breakdown (Work Order)

## T10.1 · Feature Package
PRD / SPEC / TASKS / TEST (this package). DoD: all four documents in place.

## T10.2 · Implement the chevron
Change the `draw` of `fontra.startpoint.indicator` to: take the forward direction → `save/translate/rotate` →
draw a chevron with the tip facing +x (`upper → tip → lower`, stroke only) → `restore`;
delete `START_POINT_ARC_GAP_ANGLE`, add `START_POINT_CHEVRON_HALF_ANGLE`.
DoD: single-point contours are skipped, multiple contours are independent, orientations are correct.

## T10.3 · Build
`npm run bundle`. DoD: compiles without errors.

## T10.4 · Verification (isolated instance on 8801; never touch the user's 8800)
Construct contours with four different directions (right/left/up/down + diagonal) and confirm via screenshots:
① no arc residue; ② facing right renders `>`, facing left renders `<`; ③ diagonals rotate with the direction; ④ light/dark themes look correct.
DoD: all TEST.md cases green + screenshots archived.

## T10.5 · Backfill and Records
Fill TEST.md with the results and evidence paths; record R10-T10.1 in ENGRAM-CHANGES; record the drawing decision in ADR-0007;
add one line to the AGENTS precedent quick reference (where to touch when changing the start point indicator).
DoD: docs lint passes.
