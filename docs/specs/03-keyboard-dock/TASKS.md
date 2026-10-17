# R3 · Task Breakdown

## T3.1 Dock UI skeleton (1d)
- Steps: KeyboardDock class (buildDom/rows constant table/expand-collapse) → mount in editor.js → editor.css styles
- DoD: keyboard appears at the bottom of the editor; collapsed state is a round button; dark theme renders correctly

## T3.2 Letter key navigation (0.5d)
- Steps: key click → set selectedGlyph → missing glyph goes to the create dialog
- DoD: click g → canvas shows the g glyph in editing state (e2e asserts selectedGlyph)

## T3.3 Special keys (1d)
- Steps: DEL = reset text (restore the default preview text, per the v5 decision); space appends a space; 100% zoom reset; move wires to pan
- DoD: e2e assertions per key (text change/viewBox reset/pan state)

## T3.4 Mode keys (0.5d)
- Dependency: R5.T5.1
- DoD: proof/edit keys switch canvasMode; dock toolbar shows/hides with the mode

## T3.5 Number/punctuation keys (0.5d)
- DoD: number/punctuation keys map to their glyph names; missing glyphs go to the dialog

## T3.6 i18n/theme (0.5d)
- DoD: complete lang keys (at least zh-CN/en); dark-theme screenshot comparison

## T3.7 Split/merged layout (0.5-1d, EngramFont original)
- Files: keyboard-dock.js (split-layout rendering) / editor.css (two-cluster positioning/transition)
- Steps: layout state (merged/split) → when split, break into two containers at the column boundary → anchor bottom-left/bottom-right →
  transition animation → persist to localStorage
- DoD: switching between the two states <300ms; keys in both clusters behave the same as merged; persistence

## T3.8 Custom key bindings (1-2d, EngramFont original)
- Files: keyboard-dock.js (binding table/rebinding UI) / editor.css
- Steps: binding table (localStorage) → right-click a keycap to open the action picker (menu-panel) →
  dispatch through the Fontra action system → reset to defaults
- DoD: rebinding takes effect immediately and persists; reset works; DEL/mode keys are locked and cannot be changed
