# EngramFont · Overnight Execution Runbook (EXECUTION RUNBOOK)

> This document is the main entry point for execution sessions. Governance hub: [../../AGENTS.md](../../AGENTS.md) (required reading for every agent —
> requirement execution order / test standards / precedent quick reference / hard constraints); document map: [../README.md](../README.md).
> Works with: README.md (requirement index), VERIFICATION-ENV.md (comparison environment),
> each requirement's SPEC/TASKS/TEST, SYNC.md (sync), ENGRAM-CHANGES.md (patch ledger).

## 0. Environment Self-Check (5 minutes before execution)
```bash
cd E:\engram-dev\EngramFont
git status                        # clean, on engramfont-main
venv\Scripts\python -c "import fontTools; print('fontTools ok')"
node --version                    # ≥ 24
ls docs\specs\                    # 9 requirement directories + EXECUTION.md
netstat -ano | findstr :8800      # nothing listening (stop it first if occupied)
```
Comparison environment: `E:\visee-template\meshfont-clone` → `node serve.mjs` (8124; see VERIFICATION-ENV.md for details)

## 1. Execution Order and Commit Points
```
R1 Export (T1.1→T1.5)     gate: E2E exports three formats + the ton ligature makes it into the artifact
  ↓ commit "R1: ..."
R2 Import (T2.1→T2.4)     gate: E2E imports Inter → edit → save
  ↓ commit "R2: ..."
R5 Proof/Edit (T5.1→T5.4) gate: E2E mode switching + guide width assertion
  ↓ commit "R5: ..."
R3 Keyboard Dock (T3.1→T3.6) gate: E2E keyboard navigation + mode keys
  ↓ commit "R3: ..."
R7 Background image enhancements (T7.1→T7.4)   gate: E2E Edit image activation + Replace swaps the image
  ↓ commit "R7: ..."
R4 Template flow (T4.1→T4.4)   gate: E2E new font → template → edit
  ↓ commit "R4: ..."
Finally: push origin engramfont-main + update the ENGRAM-CHANGES.md patch ledger
```

## 2. Per-Task Execution Template
1. Read the corresponding SPEC section + TASKS entry (files involved / steps / DoD)
2. Implement (patch discipline: prefer new files; single-line changes to existing files)
3. Verify the DoD (the corresponding TEST.md cases)
4. `npm run bundle` (when frontend source was touched) + restart the service (**use `start-EngramFont.bat`**; steps in
   the "Restarting the server" section of [AGENTS.md](../../AGENTS.md): stop the old instance first → build first → run the script → verify `/serverinfo`)
5. E2E/manual acceptance → git commit (message prefix "R<n>.T<x.y>:")

## 3. Wiring Quick Reference (consult while changing code)
| What needs doing | Where to wire it |
|---|---|
| Switch the current glyph | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}` (same as editor.js:864) |
| Glyph missing → create | The dialog flow starting at editor.js:860 (extract into a function and reuse) |
| Change text | `sceneSettingsController.model.characterLines` (array of lines × characters) |
| Reset zoom | editor.js `_zoom` / set viewBox directly (:3420) |
| Full-width guides | Width-parameterize the `fontra.lineMetrics` layer in visualization-layer-definitions.js |
| Light up the export menu | ExportManager injection (projectmanager.py:63 parameter) |
| New webAPI endpoint | Mount inside projectManager.setupWebRoutes(server) (server.py:63 convention) |
| Persistence keys | localStorage prefix `engramfont-` (theme-settings.js pattern) |
| UI parts | fontra-webcomponents: modal-dialog/menu-panel/glyph-cell-view/grouped-settings/icon-button |

## 4. Red Lines
- Stop the 8800 service before modifying Untitled.fontra (concurrent writes stomp each other)
- Do not touch canvas-controller.js / scene-model.js core drawing logic (unless the SPEC explicitly requires it)
- Do not copy meshfont code (closed source); comparing behavior is enough
- Commit after finishing each T (small steps, so conflicts can be rolled back)

## 5. Fallback Paths When Stuck
| Problem | Fallback |
|---|---|
| feaLib compile errors (FEA syntax) | Check glyph name existence (compile-bridge's auto class logic) |
| calt/liga rules not firing | Check lookup order (rule order within liga = priority; see the demo-liga lesson) |
| opentype.js rendering issues | Switch to glyph-paths.json (already exported by fontTools SVGPathPen) |
| selectedGlyph structure mismatch | Print the current sceneSettings.selectedGlyph value and align with it (the structure may vary slightly between versions) |
