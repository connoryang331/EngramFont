# R8 · Task Breakdown (Work Orders)

## T8.1 · Row Component Rework (simple-settings.js)
Unify rows as "text first, controls after"; extract `combined` ui + `controlBuilders`; flatten radio arrays
(BUG-001); `disabledWhen` + `refreshDisabledStates` (BUG-002).
DoD: the three panels render correctly and radio text is correct.

## T8.2 · Panel Wiring (panel-theme-settings.js) + Width Cap
Three rows via `nodeAppearanceRow()`; master switch removed; `max-width: 32em` on five panels.
DoD: the Node appearance three-row structure is correct; panels no longer stretch across the full window.

## T8.3 · Always-On + Listener Fix
`applyNodeAppearanceSettings` applies unconditionally; editor.js listener passes `themeController.model`
(BUG-004); theme-settings.js removes `nodeAppearanceCustom`.
DoD: the canvas changes immediately when settings change, and still holds after reopening.

## T8.4 · Color Swatch Shape + Reset Icon
`shape` field (round/square); row-level reset (icon-button attribute assignment, BUG-003).
DoD: three shapes correct; reset round-trips 14/#ff0000 → 8/#7a4fe8 and persists.
