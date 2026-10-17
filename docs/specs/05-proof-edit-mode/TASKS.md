# R5 · Task Breakdown

## T5.1 State Machine (0.5d)
- Files: add canvas-mode.js; sceneSettings subscription
- DoD: switching mode → localStorage persistence + survives reload; subscribers receive change events

## T5.2 Full-Width Guidelines (1d)
- Files: visualization-layer-definitions.js (fontra.lineMetrics draw)
- Steps: inject lineLayoutWidth into draw parameters (proof state) → replace pathBox.rect width
- DoD: guidelines span the full line in proof state (e2e width assertion); no regression in edit state (single-glyph width unchanged)

## T5.3 Edit Disabling (0.5d)
- DoD: pen/point/selection tools unresponsive in proof state; restored in edit state

## T5.4 Preset Buttons (0.5d)
- DoD: clicking the 5 buttons → canvas text changes (characterLines assertion)
