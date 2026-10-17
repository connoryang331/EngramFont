# EngramFont · Feature Requirements Document Package (10 Major Requirements)

> Each requirement has one complete flow: PRD (requirements) → SPEC (technical specification) → PLAN (plan and task breakdown) → TEST (test acceptance and regression)
> Execution discipline: code only after the documents pass review; implementation follows the patch discipline (ENGRAM-CHANGES.md + SYNC.md)
> Governance hub: [../AGENTS.md](../../AGENTS.md) (requirement execution order / test standards / precedent quick reference) · Document map: [../README.md](../README.md)

| # | Requirement | Directory | Status | Estimate |
|---|---|---|---|---|
| R1 | In-browser font export (TTF/OTF/WOFF2/family) | [01-export](./01-export/) | Implemented 2026-10-12 | ≈3.5d |
| R2 | Import a font → editable project | [02-import](./02-import/) | Implemented 2026-10-12 | ≈2.5d |
| R3 | Virtual keyboard Dock (+detachable twin-cluster layout +key customization) | [03-keyboard-dock](./03-keyboard-dock/) | Implemented 2026-10-12 | ≈6-6.5d |
| R4 | New font/template flow | [04-new-font-templates](./04-new-font-templates/) | Implemented 2026-10-12 | ≈3d |
| R5 | Proof/Edit dual-mode canvas | [05-proof-edit-mode](./05-proof-edit-mode/) | Implemented 2026-10-12 | ≈2.5d |
| R6 | Path operation toolset (straighten/soften/circle/anchor density) | [06-path-ops](./06-path-ops/) | Docs ready | ≈4-5d |
| R7 | Background image Edit image context activation + Replace (modeled on meshfont, replacing global unlock/lock) | [07-background-image](./07-background-image/) | Implemented 2026-10-12 | ≈1.75d |
| R8 | Node appearance settings rework (one row per type + row-level reset + always on) | [08-node-appearance-settings](./08-node-appearance-settings/) | Implemented 2026-10-14 | ≈0.75d |
| R9 | Slanted marquee selection (Glyphs-style Ctrl to change the angle / on release the angle is fixed for scaling) | [09-slanted-selection](./09-slanted-selection/) | Implemented 2026-10-14 | ≈0.75d |
| R10 | Start point direction indicator changed to a chevron (`>` / `<`) | [10-startpoint-chevron](./10-startpoint-chevron/) | Implemented 2026-10-14 | ≈0.25d |
| R11 | Squircle nodes: curvature-continuous (G2), toggled with Shift+double-click, icon is a superellipse | [11-squircle-nodes](./11-squircle-nodes/) | Implemented 2026-10-14 | ≈1d |

Total ≈ 21d

## Dependencies and Execution Order
```
R1 ─┐
R2 ─┤ (independent of each other, can run in parallel — two quick wins)
R5 ─┼─→ R3 (the Dock's mode keys depend on R5's state machine)
R4 ─┘ (reuses R2's import pipeline for template fonts)
```
Suggested order: **R1 → R2 → R5 → R3 → R6 → R4** (R1/R2 are independent quick wins; R5 before R3; R6's anchor density underlies R3's green slider and can run in parallel).

## E2E Skeleton
- `e2e/*.spec.mjs` five skeletons + playwright.config.mjs are in place (case tables live in each TEST.md; assertions are filled in by the implementation session)

## Next-Session Execution Entry Point (required reading for overnight runs)
1. First read [VERIFICATION-ENV.md](./VERIFICATION-ENV.md) — meshfont reference clone path / startup commands / asset inventory / port table / comparison procedure
2. Execution order: R1 → R2 → R5 → R3 → R4; each requirement's TASKS.md is the per-task work order
3. Stop the EngramFont service (8800) before modifying Untitled.fontra — concurrent writes stomp each other

## Cross-Requirement Shared Assets
- compile-bridge compilation logic (productionized in R1; verified by demo-liga)
- ink-gap spacing algorithm (fix-liga-spacing; shared by R3 keycaps / R4 template glyphs)
- Automatic backtrack classes (built into R1's FEA compilation — new *ance groups need zero maintenance)
- engramfont-* localStorage prefix (persistence for R3/R5)
- Web components: modal-dialog / menu-panel / glyph-cell-view / grouped-settings (UI parts for R3/R4/R5)

## Vehicle Decision (plugin vs source)
- Features inside editor views (R3/R5/R4 cards) → **source patches** (no plugin injection point inside views)
- Standalone pages → webcontent plugin (pip package, zero merge conflicts) — no such requirement in this batch
- Backend compilation service (R1) → the in-source ExportManager class (injection point already exists: PM constructor parameter)
