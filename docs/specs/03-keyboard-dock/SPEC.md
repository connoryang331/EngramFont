# R3 · Virtual Keyboard Dock · Technical Specification

## 1. UI Structure and Layout
```
editor-container
├── top-bar-container
├── sidebar-container.left / right (unchanged)
├── main-container
│   ├── canvas#edit-canvas
│   └── [new] #keyboard-dock (absolute positioning bottom:0, horizontally centered, width min(920px, 92%))
│       ├── .kd-toolbar (shown in proof mode: kern/space/proof preset buttons — provided by R5)
│       └── .kd-rows (5 rows of keycaps)
└── sidebar-container.right
```
- Collapsed state: the dock shrinks to a round button at the bottom right (keyboard icon); click to expand
- Keycaps: `<button class="kd-key" data-key="g" aria-label="g">` (letter keys include a glyph preview:
  reuse glyph-cell-view.js to render a 24px thumbnail of that glyph — preview only when the glyph exists, otherwise the letter)

## 2. State Machines
```
dock: collapsed ←→ expanded (localStorage "engramfont-dock-collapsed")
modifier: null ←→ "alt" ←→ "ctrl" (in-memory state; resets when clicking elsewhere)
canvasMode: edit ←→ proof (R5 owns this state; the dock read-only subscribes + dispatches switch events)
```

## 3. Complete Key Mapping (all keys)
| Key | Behavior | Wiring (Fontra API) | Notes |
|---|---|---|---|
| letters a-z | switch the current glyph | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}` (same as editor.js:864) | glyphName=letter |
| glyph missing | pop the create dialog | reuse the editor.js:860 create-new-glyph flow (extract a shared function or dispatch an event) | D4 decision |
| DEL | backspace the last text character | remove the last character of the last line of `characterLines` (Q1 default behavior) | |
| space | append a space to the text | append to characterLines | |
| ctrl/alt | modifier state | alt = letter-key case; ctrl = reserved | Q2 |
| move | canvas pan toggle | persistent pan toggle on sceneView | |
| 100% | zoom reset | reset viewBox (editor.js:3420 _zoom route) | |
| proof | canvasMode=proof | dispatch via the R5 state machine | depends on R5 |
| edit | canvasMode=edit | same as above | |

## 4. Modules and File Inventory
| File | Operation | Content |
|---|---|---|
| `src-js/views-editor/src/keyboard-dock.js` | new | KeyboardDock class (DOM building/keymap/events) |
| `src-js/views-editor/src/editor.js` | modify 1 spot | instantiate the dock and mount it (+ collapsed button mounted on main-container) |
| `src-js/views-editor/assets/editor.css` | modify (append) | dock/keycap styles (--engramfont-* tokens) |
| `src-js/fontra-core/assets/lang/*.js` | modify | aria/tooltip copy keys |

## 5. Interaction Details
- Navigation triggers on keycap press (pointerdown); no Enter needed
- Hold shift (physical keyboard) + click a letter = the uppercase-form glyph ("G")
- Long-press a letter key for 500ms: pop a menu of glyphs related to that letter (P2)
- The dock does not block canvas interaction: canvas areas outside the dock respond normally to editing tools

## 6. Theme and a11y
- All colors/borders use --engramfont-* tokens (dark mode automatic)
- Every key: role=button + aria-label ("switch to glyph g"); visible focus ring; Tab order row by row

## 7. Complete Key Layout Constant Table (ready for implementation)

> **Measured corrections**: the placeholder guesses below have all been verified empirically; the authoritative keymap is [KEYMAP-VERIFIED.md](./KEYMAP-VERIFIED.md) —
> purple key = grid show/hide, yellow key = stroke-thickness slider, red/green keys = left/right sidebearing sliders, alt = remove anchors,
> the four small bottom-right keys = snap to grid / snap to guides / bezier-mesh switch / outline view. The table below is kept for reference; implementation follows KEYMAP-VERIFIED.md.
```js
// constants at the top of keyboard-dock.js — the single definition site for all 28 keys
export const DOCK_ROWS = [
  // row1: number row + DEL
  [
    { key: "`", glyph: "grave" }, { key: "1", glyph: "one" }, { key: "2", glyph: "two" },
    { key: "3", glyph: "three" }, { key: "4", glyph: "four" }, { key: "5", glyph: "five" },
    { key: "6", glyph: "six" }, { key: "7", glyph: "seven" }, { key: "8", glyph: "eight" },
    { key: "9", glyph: "nine" }, { key: "0", glyph: "zero" }, { key: "-", glyph: "hyphen" },
    { key: "=", glyph: "equal" },
    { key: "DEL", glyph: null, special: "del", span: 1, style: "orange" },
  ],
  // row2: q row + purple key (eye; semantics unknown → reserved, not implemented, rendered as a disabled placeholder)
  [
    { key: null, special: "eye-reserved", style: "purple", disabled: true },
    { key: "q" }, { key: "w" }, { key: "e" }, { key: "r" }, { key: "t" }, { key: "y" },
    { key: "u" }, { key: "i" }, { key: "o" }, { key: "p" },
    { key: "[", glyph: "bracketleft" }, { key: "]", glyph: "bracketright" },
    { key: "\\", glyph: "backslash" },
  ],
  // row3: a row + edit mode key (blue; return to editing / enter editing)
  [
    { key: null, special: "capsule", style: "yellow", disabled: true },
    { key: "a" }, { key: "s" }, { key: "d" }, { key: "f" }, { key: "g" }, { key: "h" },
    { key: "j" }, { key: "k" }, { key: "l" }, { key: ";", glyph: "semicolon" },
    { key: "'", glyph: "quotesingle" },
    { key: "edit", special: "mode-edit", style: "blue", span: 2 },
  ],
  // row4: z row + green circle (semantics unknown → reserved)
  [
    { key: null, special: "circle-red", style: "red", disabled: true },
    { key: "z" }, { key: "x" }, { key: "c" }, { key: "v" }, { key: "b" }, { key: "n" },
    { key: "m" }, { key: ",", glyph: "comma" }, { key: ".", glyph: "period" },
    { key: "/", glyph: "slash" },
    { key: null, special: "circle-green", style: "green", disabled: true },
  ],
  // row5: ctrl/alt/space + 4 decorative keys
  [
    { key: "ctrl", special: "ctrl" }, { key: "alt", special: "alt" },
    { key: "space", special: "space", span: 6 },
    { key: null, special: "deco-1", style: "red", disabled: true },
    { key: null, special: "deco-2", style: "yellow", disabled: true },
    { key: null, special: "deco-3", style: "blue", disabled: true },
    { key: null, special: "deco-4", style: "beige", disabled: true },
  ],
];
```
- `glyph` present = the key also renders a glyph preview (glyph-cell-view 24px)
- `special` = function key (DEL/space/ctrl/alt/mode); `disabled: true` = decorative/unknown keys observed in meshfont,
  rendered as disabled placeholders in v1 (keeping visual parity), assigned semantics as needed in later versions
- Letter-key glyphName rules: lowercase letter = itself; DEL = backspace; space = the space character

## 8. canvasMode State Machine and Dock Interaction (code-level sketch)
```js
// canvas-mode.js (delivered by R5; the dock only consumes it)
import { ObservableController } from "@fontra/core/observable-object.js";
export const canvasModeController = new ObservableController({ mode: "edit" });
canvasModeController.synchronizeWithLocalStorage("engramfont-");
export function setCanvasMode(mode) { canvasModeController.model.mode = mode; }

// inside keyboard-dock.js:
canvasModeController.addKeyListener("mode", (e) => {
  // proof mode: dock toolbar (kern/space/proof preset buttons) shown; edit key highlighted
  // edit mode: toolbar hidden
  this.toolbarElement.style.display = canvasModeController.model.mode === "proof" ? "" : "none";
});

// mode keys:
modeProofKey.onclick = () => setCanvasMode("proof");
modeEditKey.onclick  = () => setCanvasMode("edit");
```

## 9. Layout Dimension Specification
| Item | Value |
|---|---|
| Dock width | min(920px, 92% of canvas width), horizontally centered |
| Keycaps | 44px tall; standard key 52px wide; space spans 6 keys; edit spans 2 keys |
| Key gap | 6px; row gap 8px; dock padding 12px |
| Dock background | var(--engramfont-ui-element-background-color); border-radius 12px |
| Stacking | z-index above canvas, below dialogs (modal-dialog) |
| Collapsed state | 56px round button, fixed at the bottom right |

## 10. Split/merged Layout (EngramFont original; meshfont has no such feature)
```
merged (default): the whole keyboard centered at the bottom (current layout)
split: left cluster anchored at the canvas bottom-left + right cluster anchored at the canvas bottom-right, middle left empty (does not block the editing focus at canvas center)
  left cluster: row1 front segment (~1-5) / eye + q-t / capsule + a-g / red + z-b / ctrl+alt
  right cluster: row1 rear segment (6-=-DEL) / y-p+brackets / h-l+'+edit / n-/ + green / right half of space + 4 toggles
Switch: a split/merge toggle on the dock (or a drag-apart gesture — P2); 280ms transition
Persistence: localStorage "engramfont-dock-layout"
```
- Implementation notes: the keymap data (DOCK_ROWS) stays the same, split at the split point into two containers for rendering;
  key action wiring is completely unchanged (the same selectedGlyph/action path)
- DoD: all keys in both clusters behave identically to the merged state; switching <300ms; state persisted

## 11. Custom Key Bindings (EngramFont original)
```
Binding table: { keyId: actionId }  stored in localStorage "engramfont-key-bindings"
Default bindings = current behavior; rebinding = right-click a keycap → action picker (menu-panel web component)
Bindable items = actions registered in Fontra (zoom/export-as/grid show-hide/mode switching…)
         + navigation ("switch to glyph X") + no function
Dispatch: key click → look up the binding table → call the callback registered via registerAction (Fontra action system)
Reset: "restore default bindings" in settings
```
- Scope: both function keys and letter keys can be rebound; DEL/mode keys should be locked (to protect the core flow from accidental change) — opened up in P2
- DoD: rebinding takes effect immediately, persists, and reset works

## 12. Estimate Revision
| Item | Old | New |
|---|---|---|
| R3 total | ≈4d | **≈6-6.5d** (+T3.7 split/merge 0.5-1d, +T3.8 custom bindings 1-2d) |
| Documentation package total | ≈20d | ≈22.5d |
