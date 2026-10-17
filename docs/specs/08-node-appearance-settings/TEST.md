# R8 · Test Acceptance and Regression

Requirements: [PRD.md](./PRD.md) | Implementation: ADR-0002 / ADR-0004 | Ledger: ENGRAM-CHANGES "R4-T4.26"

## E2E / Manual Testing (Playwright headless, 8800 · Untitled.fontra)

| ID | Steps | Expected | Result |
|---|---|---|---|
| TC-1 | Open the Theme settings card | Three rows `label · [size] · [color] · [reset]`, no master switch | ✅ (`qa/v4-node-card*.png`) |
| TC-2 | display-language / clipboard / editor-behavior / server-info | Unified row layout; no `[object ...]` | ✅ (objectString=false) |
| TC-3 | reset round-trip: size=14 + color=#ff0000 → click reset | Inputs and localStorage back to 8 / #7A4FE8 | ✅ (verify-v3 beforeReset/afterReset) |
| TC-4 | Color swatch shapes | Smooth/Handle round, Corner square | ✅ (`qa/v4-node-card-hover.png`) |
| TC-5 | Light/dark themes | Cards, inputs, separators, swatches all correct | ✅ (`qa/v2-settings-dark.png`) |
| TC-6 | Light/dark consistency + radio rendering (recheck of BUG-001/002) | No `[object`; three panels correct | ✅ |
| TC-7 | Light/dark themes + reset icon hover | Icon renders, hover brightens, no 404/pageerror | ✅ (`qa/probe-404.mjs`) |

## Regression

| Item | Assertion | Result |
|---|---|---|
| Settings persistence | `engramfont-nodeSmoothSize` = 14 → after reset = 8 | ✅ |
| Editor canvas | After reopening, node styling matches settings (R4-T4.25 path) | ✅ |
| Repo e2e | `npx playwright test` 35/35 | ✅ |
