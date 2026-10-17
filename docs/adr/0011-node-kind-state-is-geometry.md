---
Id: ADR-0011
tags: [frontend, canvas, nodes]
Status: accepted
Date: 2026-10-15
---

# Node Kind Is Geometry: a Downgrade Must Change the Segments and Handles; Only Alt+Double-Click Changes the Flag Alone

## Background

[ADR-0009](0009-squircle-g2-nodes.md) §4 established a principle: **the icon must not claim what the geometry does not
have** — if the G2 solve fails, no flag is set; being unresponsive is better than a false icon. But at the time that principle only covered **failed solves when upgrading to squircle**, not **downgrades**.

The consequence of the current downgrade implementation (`toggleSmooth` only flips `pointTypes`; the corner target of
`advanceNodeKind` calls `toggleSmooth(path, idx, ON_CURVE)`) is: double-clicking a squircle node into a corner
leaves **not a single coordinate of the segments or handles changed** — the outline is still the curved seam repaired by the G2 solve, and the corner's square icon hangs on a curvature-continuous spot.

The user's exact words after four consecutive double-clicks on a 600×400 rectangle:

> **"corner, smooth, and squircle are state transitions of the segments — the segments and handles must all change
> along with the state icon. If you do not want the handles and segments changed, use alt+double-click."**

That is: **kind = geometric state**, not a label stuck onto the geometry; "I do not want the geometry touched" needs its own escape hatch instead of being the default.

Realities entangled with this requirement (measured this round, plus code facts):

- One convert-to-curve inserts **up to 4 control points** (its own near handles ×2 + the far handles of the two neighboring segments ×2),
  half of which geometrically belong to the **neighbor nodes' sides** — so "touch only this node" is not a local operation in the data;
- Upstream `alignHandles` → `alignHandleAlongDirection` ends with `vector.roundVector`, which rounds
  even **already-collinear** handles, clamping the fractional coordinates deliberately written by [ADR-0010](0010-node-slide-g2.md)
  back to integers and bouncing the curvature jump from 0.07% back to 1.1%.

## Decision

### 1. Invariant: the icon must not claim what the geometry does not have (extended to all three kinds)

This is the same principle as ADR-0009 §4, with its scope extended to corner / smooth / squircle. Formalized:

> **After every gesture, every node on the touched outline must be self-consistent** — whatever the flag
> describes, the geometry must actually satisfy.

- corner: both adjacent edges are straight lines (curvature 0) and the two tangents are not collinear (a genuine corner);
- smooth: the two tangents are collinear (curvature vectors parallel; same or opposite direction allowed);
- squircle: the curvature vectors are **equal in magnitude and pointing the same way**.

### 2. A corner downgrade **really becomes a corner**

The two edges adjacent to the node are rebuilt as straight lines, with the handles landing on the chords:

```
far ← t = 1/3 → P ← t = 2/3 → next
When only one handle exists: take the midpoint (h = (far + P)/2 or (P + next)/2)
```

Both adjacent edges become straight, and **the corner is ceded to the neighbor node** — because a straight edge is a hard constraint, the far end of an edge pinned straight can only be a corner (or already was one).

- **Handles are kept, not deleted**: a control point may be **shared with a neighboring segment**; deleting it would silently straighten edges the user never touched.
  Keeping them also keeps the three-kind cycle reversible (on the next upgrade the handles are already in place, no rebuild needed);
- **No coordinate rounding**: rounding leaves behind tiny but real curvature — the same pitfall as in `applySquircleAtPoint`.

### 3. A smooth upgrade **really bends the straight line**

`toggleSmooth` pass 3 changes from "a rule for each side" to **one rule covering both sides**: rotate each near handle
**onto the shared tangent while keeping its own length**.

- Straight side: the line's 1/3-length handle satisfies this rotation naturally, so **the straight line gets bent** (exactly what ADR-0006
  wants: "double-click the square node into an almond shape and the line bends with it");
- Curve side: it degenerates to the upstream `alignHandles` **length-preserving rotation**, matching upstream behavior.

One rule ⇒ G1 lives in the **geometry**, not just in the icon.

**Skip the write when already collinear and already smooth**: otherwise the fractional coordinates deliberately written by the ADR-0010 G2 solve
get rounded (curvature jump 0.07% → 1.1%). The test is the dimensionless collinearity `|in×out|/(|in||out|) < 1e-4`.

### 4. Alt+double-click = flag only

`opts.geometry === false`: no coordinate is touched; only `pointTypes` flips. This is the
**"I only want to change the icon"** escape hatch the user asked for — the default behavior changes geometry, and the conservative behavior requires explicitly holding Alt.

### 5. Neighbor repair: a bounded contour walk + one invariant sweep + measured geometry has the final say

A segment's **far handle belongs to the neighbor**, so pinning one side straight changes the neighbor's tangents. A three-part finish:

1. **Bounded walk**: walk outward along the contour, **repairing only the nodes we actually broke**, and stop at the first self-consistent node
   (no recursion, no full-contour rescan);
2. **One invariant sweep**: `enforceContourHonesty()`, at most 3 rounds, stopping once everything is self-consistent;
3. **Do not trust status; trust the geometry measured after the write**: `nodeFlagsAreHonest()` re-verifies
   **same-direction curvature vectors + equal magnitudes + G1 collinearity**; if the re-check fails, the **flag is withdrawn**; if a corner got bent, it is pinned straight again.

When repairing a neighbor, if one side has already been pinned straight by an adjacent corner, **both handles go onto that line** — otherwise the edge
the corner just pinned straight would be bent again.

### 6. When re-solving line↔curve, the write-back **writes only the curve side**

For the straight side the solver returns a "**don't touch**" sentinel ([ADR-0009](0009-squircle-g2-nodes.md) §3:
zero curvature must fall on the curve side). The old code wrote both sides, which moved the straight-side handle onto the far handle's position —
the straight-side handle translated out of nowhere. Writes are now dispatched by `kind`: only the side allowed to change gets written.

### 7. The honest result when unsolvable

The neighbor's `SQUIRCLE_FLAG` is **withdrawn** (downgraded to smooth): once the shared edge is pinned straight, G2 no longer holds mathematically. **Better one flag fewer than one lying icon** (a direct corollary of §1).

## Rationale

1. **Kind is a state, not a label**: in one sentence the user supplied both the criterion ("state transitions of the segments") and the escape hatch
   ("if you do not want it changed, use alt"). Making geometry change the default and the conservative behavior explicit is more intuitive than the reverse:
   a user double-clicking a square expects "this corner becomes a rounded corner", not "the icon changed but the line is still sharp".
2. **A downgrade that does not change geometry voids the invariant**: corner square + curved seam = a lying icon, and that is a principle this repo
   wrote down long ago (ADR-0009 §4).
3. **Handles are kept, not deleted**: Fontra's control points belong to **segments** (0/1/2 per segment), and one control point can
   simultaneously be a shape element of a neighboring segment. Deletion is destructive and unpredictable; keeping + rotating is reversible.
4. **Measure the geometry instead of trusting status**: `status` describes "what the solver intended to do", while the user sees
   "what the geometry became". Only re-measuring the curvature after writing guarantees the invariant.
5. **An Alt escape hatch, not a "conservative default"**: if the default were flag-only, the user would first have to learn to hold Alt to get the
   wanted effect — the opposite of the Glyphs/FontLab default (eager convert on double-click).

## Rejected alternatives

- **A flag-only downgrade** (the status quo before this change): explicitly rejected by the user, and in direct conflict with the §1 invariant.
- **Shape archives per node** (remember the original shape and roll back on downgrade): handles are shared between neighboring segments, and the user keeps
  editing in between, so a rollback would be either incomplete (recording nodes but not segments) or would **silently discard later edits**.
- **Recursive neighbor repair** (one node changes → recurse without bound over everything affected): in practice it spilled onto other edges the user never
  touched; after switching to a **bounded walk + a fixed number of sweep rounds**, repairs are strictly limited to "the nodes we actually broke".
- **Flag-only by default, Alt for geometry**: it inverts the priority between "want the result" and "want conservative", and contradicts both vendors' defaults.

## Consequences

- The three gestures (plain double-click cycle / Shift+double-click direct / **Alt+double-click flags-only**) have unified semantics:
  "kind = geometry", with the implementation concentrated in `fontra-core/src/path-functions.js`
  (`toggleSmooth` pass 3's length-preserving rotation, `advanceNodeKind`, `enforceContourHonesty`,
  `nodeFlagsAreHonest`);
- A corner downgrade **really becomes straight** and pushes the corner onto the neighbor — the neighbor may be downgraded along with it (flag withdrawn);
- Handles are never deleted, never rounded;
- The G2 solve's freedom of movement is covered by [ADR-0010](0010-node-slide-g2.md) (a slight slide along the tangent, taking whichever
  solution costs less); the two documents are companion reading: one governs "how well an upgrade can be repaired", the other "how much a downgrade must change".

## Verification

- `npm run --workspace src-js/fontra-core test`
  → squircle tests **136 pass / 0 fail** (including the new **T10 downgrade to a real corner + Alt flags-only** and
  **T11 no lying neighbors**); whole package **1215 passing** / 0 failing
- `npx playwright test` → **35/35**
- `qa/verify-squircle-gesture.mjs` → **7/7**
- `qa/measure-cycle.mjs`, `qa/audit-honesty.mjs` (measurement scripts from this round, kept as regression evidence)
- Measured (600×400 rectangle, top-right corner, four consecutive double-clicks): corner→smooth curvature **4.74e-3 / 7.12e-3**
  (jump 33.4%); smooth→squircle node slides 16.5, handles unmoved, jump **0.000**;
  squircle→corner both sides **1.99e-18 / 4.13e-18 (both straight)**;
  corner→smooth again bends back to **3.87e-3 / 7.94e-3**; **with Alt held, none of the four gestures changes the geometry at all**
- Multi-point interference measurement: after all four corners are squircle, downgrade one corner → both sides of the downgraded corner are straight, **the two neighbors automatically drop to
  smooth (flags withdrawn)**, and the opposite corner remains squircle with exact G2

## References

- Predecessors: [ADR-0009](0009-squircle-g2-nodes.md) §4's "the icon must not lie" extended to all three kinds,
  [ADR-0006](0006-toggle-smooth-glyphs-convert.md) (convert to curve = a straight line becomes a true curve)
- Companion: [ADR-0010](0010-node-slide-g2.md) (the G2 solution may slide the node slightly along the tangent)
- Feature pack: [docs/specs/11-squircle-nodes/](../specs/11-squircle-nodes/)
- Implementation: `src-js/fontra-core/src/path-functions.js`; regression tests
  `src-js/fontra-core/tests/test-squircle.js`
- Ledger: ENGRAM-CHANGES.md (the node-type gesture series)
