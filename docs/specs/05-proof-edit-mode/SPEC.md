# R5 · Proof/Edit Dual-Mode Canvas · Technical Spec

## 1. State Machine
```
canvasMode: "edit" ←→ "proof"     ("mesh" reserved)
Persistence: localStorage "engramfont-canvas-mode" (same pattern as theme-settings.js)
Default: "edit" (invisible to existing users)
Transitions: any state <100ms, no server round-trip
```

## 2. proof-State Rendering Spec
| Item | Spec |
|---|---|
| Text layout | reuse the existing scene-model multi-line stacking (lineHeight, scene-model.js:471/561), zero new code |
| metrics guidelines | parameterize the width source of the `fontra.lineMetrics` layer: when canvasMode=proof draw **full-line width** (scene-model line layout data); edit state keeps single-glyph width (status quo) |
| Edit disabling | tool cluster hidden (conditionally registered in editor.js per canvasMode); the `glyphSelector("editing")` visualization layer is not active in proof state |
| Selection | glyphs remain clickable in proof state (highlight/locate), but no control points / dragging |
| Zoom | kept (100% / mouse wheel) |

## 3. Preset Buttons (toolbar above the Dock, provided by R3)
| Button | Sets text (characterLines) |
|---|---|
| your text | restore the user's most recent input (in-memory cache) |
| kern | `AVAT AT AV To To Wa Wa Yo Yo` |
| capitals | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` + `0123456789` |
| spacing | `nnnoonn HHooHH nHnH oHoH` |
| shapes | `sphinx of black quartz, judge my vow.` + `pack my box with five dozen liquor jugs.` |

Implementation: set sceneSettings.characterLines (the text-entry panel syncs automatically — same controller)

## 4. File List
| File | Action | Content |
|---|---|---|
| `src-js/views-editor/src/canvas-mode.js` | new | canvasMode state machine (get/set/subscribe/persistence) |
| `src-js/views-editor/src/visualization-layer-definitions.js` | modify | parameterize lineMetrics layer width (full line in proof state) |
| `src-js/views-editor/src/editor.js` | modify 2 spots | render the tool cluster conditionally per mode; subscribe to canvasMode |
| `src-js/views-editor/src/keyboard-dock.js` (R3) | modify | mode-key dispatch |

## 5. Interaction Details
- Switch animation: none (instant switch, viewport unchanged — following the viewport-preservation experience of engram-editor immersive-mode)
- In proof state the wheel still zooms and space still pans
- Return to edit state: tool selection restored to what it was before entering proof

## 6. Five Preview Presets · Exact Strings (ready to use in implementation)
```js
// keyboard-dock.js (R3) toolbar buttons → set characterLines
export const PROOF_PRESETS = {
  "your-text": null,   // restore user input: save a snapshot of characterLines from before entering proof (in memory)
  "kerning": ["AVAT AT AV", "To To Wa Wa", "Yo Yo AVA"],
  "capitals": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789"],
  "spacing": ["nnnoonn", "HHooHH", "nHnH oHoH"],
  "shapes": [
    "sphinx of black quartz, judge my vow.",
    "pack my box with five dozen liquor jugs.",
  ],
};
```
- "your text": cache a `characterLines` snapshot before entering proof (in-memory variable, not persisted)
- Clicking a preset = `sceneSettings.characterLines = preset.map(line => line.split(""))`
  (characterLines structure: array of lines × array of characters — verify against the consumer at scene-model.js:462 during implementation)

## 7. fontra.lineMetrics Layer Changes · Code-Level Sketch
```js
// visualization-layer-definitions.js — changes to the fontra.lineMetrics layer draw()
draw: ({ context, positionedGlyph, parameters, model, controller }) => {
  // status quo: glyphWidth = positionedGlyph.glyph.xAdvance (single-glyph width)
  // change: in proof state use the full-line width (canvas-mode.js provides isProof() and lineLayoutWidth)
  const width = isProof()
    ? model.textLayoutWidth            // scene-model line layout already has this data (accumulated glyph advances within a line)
    : positionedGlyph.glyph.xAdvance;
  // pathBox.rect(0, descender, width, ascender-descender) etc. all use width
  // note: for multiple lines, draw line by line (iterate scene-model's lineHeight-stacked y values — in sync with scene-model.js:561)
}
```
- New interface: scene-model exposes `textLayoutWidth` (array of per-line widths) — scene-model.js already accumulates per-line glyph advances internally (layout loop starting at :471); it only needs to be stored and exposed, ~5 lines
- Regression safety: in edit state (isProof()=false) the original path is taken; single-glyph guidelines unchanged

## 8. Tool Disabling List (proof state)
| Component | Behavior in proof state |
|---|---|
| Tool cluster (pen/knife/rect/ruler) | hidden (conditionally registered in editor.js per canvasMode) |
| Selection control points / dragging | glyphSelector("editing") layer not active |
| Sidebars (except text-entry) | remain visible but input disabled (avoid accidental edits) |
| Zoom / pan | kept |
| Dock | visible (proof toolbar shown) |

## 9. Three proof-Toolbar Buttons · Semantic Spec (kern / space / proof)
> Position: the toolbar above the keyboard in proof state. Basis for behavior: meshfont screenshot dialog (5 presets) + inference from labels;
> **exact text strings are left for the execution session to verify against** (comparison tool: demo-liga/probe-proof-keys.mjs is ready; run it first at execution time to capture the baseline).

| Button | Behavior Spec | Preset Text (guessed initial values, verify at execution time) |
|---|---|---|
| **kern** | one click switches the canvas text to **kerning-pair preview** | `AVAT AT AV` `To To Wa Wa` `Yo Yo AVA` |
| **space** | one click switches to **spacing-rhythm preview** | `nnnoonn` `HHooHH` `nHnH oHoH` |
| **proof (with ▾ dropdown)** | opens the 5-preset menu (your text / kerning / capitals / spacing / shapes) + applies the current selection | the menu is the PROOF_PRESETS from R5 §6 |

- Implementation form: all three buttons merely **set characterLines** (kern/space = set preset strings directly; proof = open a dropdown menu), reusing the PROOF_PRESETS constant table from R5 §6 — no independent rendering logic
- your text: cache a snapshot of the user's characterLines before entering proof

## 10. Typography Controls = Contextual Remapping of Dock Sliders (v5 final)
Typography controls in proof state **add no new controls** — reuse the Dock's four sliders/keys (semantic remapping driven by canvasMode):

| Dock Control | Function in proof state | Acts On |
|---|---|---|
| Purple | Metric lines show/hide | toggles the guideline visualization layer |
| Yellow slider | letter spacing | text tracking |
| Red slider | word spacing | space-width multiplier |
| Green slider | line height | line stacking |
| DEL | reset text (restore default text) | resets characterLines |

- New sceneSettings fields: `wordSpacing` (default 1.0× space width), `letterSpacing` (default 0 extra),
  `canvasMode` (already in R5) — the scene-model layout loop consumes these values (lineHeight already exists ✓)
- In edit state the same sliders fall back to glyph-editing controls (see the R3 KEYMAP v5 dual-function table)

## 11. Reset Text · Final Behavior (user-confirmed 2026-10-12 + verified against source)
| Item | Decision |
|---|---|
| DEL behavior | **restore the default preview text** (not clearing, not deleting) |
| Default preview text (EngramFont) | **dynamically generated**: take glyphs with a codePoint in project glyphMap order and join them, 40 characters per line — all glyphs are always present (never notdef), so reset is meaningful for any project |
| Comparison | Fontra defaults to `text: ""` (scene-controller.js:1824); meshfont's fixed pangram relies on the template font having full Latin — EngramFont project glyphs are dynamic, so a fixed string would produce notdef; hence the dynamic default |
| Text into URL | reuse the Fontra mechanism (editor.js:3410 writeObjectToURLFragment) — the URL fragment updates in sync after reset |
| Implementation point | scene-settings default change: `text: ""` → a getter that dynamically takes the first 40 glyphs with a codePoint from glyphMap (available once the project is loaded); DEL = reset characterLines to that default |
