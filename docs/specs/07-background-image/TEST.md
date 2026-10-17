# R7 · Test Acceptance and Regression
## E2E
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | Add Background Image → Edit image appears in the toolbar | Button appears contextually |
| E2E-2 | Click Edit image | Background image selected; selection-info shows Opacity/Colorize/Transformation + Replace |
| E2E-3 | Drag the Opacity slider | Opacity changes in real time |
| E2E-4 | Replace the image | New image appears; position/scale/opacity preserved |
| E2E-5 | Click elsewhere on the canvas | Auto-lock (re-lock) |
| E2E-6 | No global Unlock/Lock menu item | Removal assertion |
## Regression
| Item | Assertion |
|---|---|
| Editing | The background image does not interfere with glyph editing (layered below the glyph) |
| Saving | The background image persists with the project (putBackgroundImage path) |
| Dark mode | Panels/buttons render correctly in dark theme |
## Baseline Comparison
meshfont: Edit image button → control menu pops up (sliders/replace/remove) — see VERIFICATION-ENV.md 8124 comparison.
