---
Id: ADR-0008
tags: [frontend, settings, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# Node sizes merged into a single setting + start point chevron scales with size + eye-shape proportions changed to an actual eye

## Background

The node appearance settings originally had **three independent sizes**: `nodeCornerSize`, `nodeSmoothSize`,
`nodeHandleSize`. The start point direction chevron (`>` / `<` from ADR-0007) had its own fixed size.

The user raised three issues in a row:

1. **"Shouldn't the greater-than / less-than signs change size along with the corner size and the smooth size?"**
   — the chevron size was hard-coded; after the nodes were enlarged the chevron looked too small and out of place;
2. **"Corner size and smooth size should not be two size settings, but one and the same size setting.
    It should not be one large and one small."**, later adding **"the handle's size is unified as well, not set separately"**
   — three independent sizes let the user dial in one large and one small, violating "same-kind elements are visually consistent";
3. **"The middle region of the almond shape should be bigger — it is too small now; both the settings-page one and the editing-canvas one need to be made bigger. It should be shaped like an eye."**
   — `halfWidth = 0.34 × size` against `halfLen = 1.15 × size` was too skinny (the width was only 30% of the length);
   at small sizes it looked like a thin slit, not an eye.

## Decision

### 1. Sizes merged into a single `nodeSize`

- The model keys `nodeCornerSize` / `nodeSmoothSize` / `nodeHandleSize` are merged into a **single `nodeSize`** (default 8, range 4–24);
- `applyNodeAppearanceSettings` writes the same value into the three layer parameters
  (`cornerSize` / `smoothSize` / `handleSize`);
- **One-time migration**: read the old `nodeSmoothSize` ?? `nodeCornerSize` into `nodeSize`,
  then delete the three old keys, so no existing user setting is lost;
- The settings panel keeps only **one size spinner** (the Node size row);
  the three color rows remain independent (Smooth / Corner / Handle).

### 2. The start point chevron scales with node size

`chevronLength` / `chevronSpread` scale proportionally by `nodeSize / NODE_SIZE_DEFAULT`;
**the gap `gap` does not scale** — the spacing between the chevron and the node icon stays constant and they never overlap (the constraint from ADR-0007).

### 3. Eye-shape proportions changed to an actual eye

`halfWidth` goes from `0.34 × size` up to **`0.514 × size`**, and `halfLen` from `1.15 × size` down to
**`0.73 × size`** — an aspect ratio of **1.42 : 1**, taken from the outer contour of the
[Lucide](https://lucide.dev) `eye` icon (measured at 19.88 : 14.0 units with the pupil removed).
Extracted into the shared constants `EYE_HALF_LEN_FACTOR` / `EYE_HALF_WIDTH_FACTOR`,
referenced by both the canvas drawing and the start point gap calculation so the two cannot drift apart.

**Sizes are calibrated by "equal area"**: the corner square's area is `size²`; the eye shape (bounded by biquadratic curves)
has area `(8/3) · eye semi-major axis · eye semi-minor axis`; substituting `0.73 × 0.514` gives exactly `1.0006 · size²`.
That is, the two node kinds are **visually equal in weight** — the quantitative realization of "same-kind elements are visually consistent",
not values tuned by feel. Measured (by rendering enlarged and taking the area), the eye/square area ratios at
sizes 8/12/16/24/32 are 0.997 / 0.997 / 0.995 / 0.997 / 0.994, with a mean of **0.996**.

## Rationale

1. **Same-kind elements should be the same size**: corners, smooth points, and handles are all "nodes"; three independent sizes only offered an opportunity to create inconsistency, with no real expressive value; the user explicitly rejected "one large, one small";
2. **The chevron is an indicator attached to the node**: if the node grows while the chevron does not, the visual weight is out of balance; proportional scaling keeps the indicator harmonious at every size;
3. **The gap must be independent of size**: if the gap scaled too, the chevron would drift too far from large nodes and stick to small ones; only a constant gap keeps it "always clearly distinguishable and never overlapping";
4. **The eye proportions are much more readable**: a width of 0.34 is only ~2.7px on an 8px node, with almost no solid body in the middle; 0.58 gives ~4.6px and a recognizable shape.

## Rejected alternatives

- **Keep three sizes and only link them** (changing one automatically syncs the other two): the model still carries three pieces of state; reset / persistence / migration would each need separate handling, and complexity would rise rather than fall;
- **Fixed chevron size, only adjusting the gap**: the user explicitly asked for the chevron to "change along with the size";
- **Scale the gap with size as well**: it would make the gap overly large for big nodes and lose the "closely adjacent indicator" semantics;
- **Use an ellipse instead of the Bezier eye shape**: the Bezier has true **pointed tips** (the two ends of `eyePath`), while the ends of an ellipse are round caps, which does not match the canvas shape (the settings-page swatch would be distorted too).

## Consequences

- The settings panel's Node appearance card: `Node size` (the only size spinner) +
  the three color rows `Smooth node` / `Corner node` / `Handle`, each with a reset;
- All three node kinds are strictly the same size at any size;
- The start point `>` / `<` chevron scales with size; its gap to the node icon is a constant 5 (screen px);
- The settings-page Smooth swatch is **eye-shaped** (precisely sampled from `eyePath`'s `4t(1-t)`,
  with the box's aspect ratio matching the shape), consistent with the canvas shape;
- Old localStorage keys are migrated and cleaned up automatically.

## Related

- Feature pack: [docs/specs/10-startpoint-chevron/](../specs/10-startpoint-chevron/)
- Predecessors: ADR-0005 (smooth point = eye shape), ADR-0007 (start point chevron),
  ADR-0004 (settings-row text first)
- Ledger: ENGRAM-CHANGES.md "R10-T10.2"
