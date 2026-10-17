# Architecture Decision Records (ADR) Index and Rules

> One document per decision: `NNNN-<slug>.md` (four-digit numbers, incrementing). Changing the architecture, setting a shared convention, removing a mechanism, or introducing/retiring a general mechanism — write an ADR; implementation details stay in feature packages and the code.
> AGENTS.md only records finalized architecture facts, not the decision process.

## Status

`accepted` (current) · `superseded` (replaced by NNNN, with the superseding ADR noted in the file header).

## Format (aligned with visee)

```markdown
---
Id: ADR-NNNN
tags: [<domain tag; vocabulary in docs/README.md>]
Status: accepted / superseded
Date: YYYY-MM-DD
---
# <one-sentence decision>
## Background      ← current state and the problem (tables allowed)
## Decision      ← what was decided (may carry a "user explicitly decided" note)
## Rationale      ← why it was decided this way
## Rejected alternatives ← each entry states its rejection reason
## Consequences      ← implementation impact (files / migration / compatibility)
## Related      ← feature packages / bugfixes / ledger links
```

## Index

| Number | Decision | Status | Date |
|---|---|---|---|
| [ADR-0001](0001-fork-patch-discipline-src-js.md) | Fork patch discipline (src-js): frontend changes only in `src-js/`, the client directory is a build artifact | accepted | 2026-10-12 |
| [ADR-0002](0002-node-appearance-always-on.md) | Node appearance settings always on, master switch `nodeAppearanceCustom` removed | accepted | 2026-10-14 |
| [ADR-0003](0003-slanted-selection-shear-space.md) | Slanted selection in shear space: hit testing reuses the rectangle test | accepted | 2026-10-14 |
| [ADR-0004](0004-settings-rows-text-first-combined.md) | Settings rows: text-first + combined row type + per-row reset | accepted | 2026-10-14 |
| [ADR-0005](0005-node-icons-eye-on-curves.md) | Geometric semantics of node icons: curve points get the eye shape (tangent orientation), line points get the square | accepted | 2026-10-14 |
| [ADR-0006](0006-toggle-smooth-glyphs-convert.md) | Double-click to convert: line segments become true curves, handles generated from the common tangent through the node (Glyphs/FontLab semantics) | accepted | 2026-10-14 |
| [ADR-0007](0007-startpoint-chevron-indicator.md) | Start point direction indicator: arc replaced with a chevron arrow (`>` / `<`) | accepted | 2026-10-14 |
| [ADR-0008](0008-node-size-unified.md) | Node size unified into a single setting + arrow scales with size + eye-shape ratio changed to a true eye shape | accepted | 2026-10-14 |
| [ADR-0009](0009-squircle-g2-nodes.md) | Squircle nodes: closed-form curvature-continuous (G2) solution, icon uses a superellipse instead of a pentagram | accepted | 2026-10-14 |
| [ADR-0010](0010-node-slide-g2.md) | G2 solve allows sliding the node slightly along the tangent: sliding solution vs. in-place solution, whichever costs less wins | accepted | 2026-10-15 |
| [ADR-0011](0011-node-kind-state-is-geometry.md) | Node kind is geometry: downgrading must change the segments and handles; Alt+double-click is the "flag only" toggle | accepted | 2026-10-15 |
| [ADR-0012](0012-squircle-line-curve-derived-transition.md) | Squircle for line↔curve transitions (raindrop points): the transition is derived at render and export time, screen ≡ export locked in by a shared truth table (**not implemented**) | accepted | 2026-10-15 |
