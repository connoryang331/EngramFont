I decided to reject building a font editor. The reason: there is no need to create a non-disruptive font editor for a brand-new writing system that is at the same time a font style — and the features of such an editor, it seems, are already covered by all the font software on the market. It would be duplicated engineering.

# EngramFont Customizations at a Glance (Relative to Upstream Fontra)

The screenshots in this folder are the visual record of the customizations. Upstream is
[fontra/fontra](https://github.com/fontra/fontra). This document lists **only what the
EngramFont fork adds or changes** — no conventional Fontra feature documentation.

Relevant sources: `src-js/fontra-core/src/visual-tokens.js` (theme token definitions),
`src-js/views-applicationsettings/src/panel-theme-settings.js` (theme settings panel),
`src-js/views-editor/src/keyboard-dock.js` (on-screen keyboard dock).

---

## 1. Theme Settings Panel (Application Settings → Theme settings)

Upstream Fontra's panel contains a single item: `Theme: Automatic / Light / Dark`.
EngramFont expands it into a full editor-appearance customization system with three parts:

### 1.1 Preset System

- Preset dropdown: `Custom (user settings)` (current user values) + built-in presets
  **High contrast** and **Low noise** + user-saved presets
- `Preset name` field + **Save as new**
- **Restore defaults** / **Rename** / **Delete** for preset management
- The dropdown selection auto-matches when values change; status is echoed live

### 1.2 Theme Packs

- Status line (e.g. `Custom settings (no pack applied)` / `Active pack: <name>`)
- **Export theme pack**: export the entire current theme as a `.json` pack
- **Import theme pack…**: import a pack, validate it, apply it, and report ignored unknown keys
- Presets and packs are persisted (`themeCustomPresets` / `themePackName`)

### 1.3 Visual Customization Groups (17 groups × 131 tokens)

Every color row is a "swatch + `α =` alpha number input + ⟲ per-row reset";
numeric rows use inline input fields.

| Group | Items | What can be customized (examples) | Shot |
|---|---:|---|---|
| Canvas background | 2 | Canvas color, UPM grid color | 01 |
| Node appearance | 17 | node size, three node-type colors (smooth violet / squircle teal / corner orange), handle & selected-handle colors, Diamond handle toggle, editing-layer node color (α), selected node fill, handle line, background-layer nodes, selected node halo (α), hover ring offset, selection halo offset, background-layer node/handle sizes | 01 |
| Glyph display | 13 | context/selected/hovered glyph fill & outline (α), error glyph color, undefined glyph color (α), empty glyph placeholder (α), empty selected/hovered glyph colors, clean display fill, glyph highlight inner/outer widths | 01 |
| Transform selection | 4 | handle fill, handle size, dashed border color, dashed border width | 02 |
| Start point indicator | 4 | chevron color / size / gap / width | 02 |
| Drag crosshair | 4 | crosshair color / width / Dashed toggle / dash length | 02 |
| Rect select | 4 | solid color, dash color, stroke width, dash length | 02 |
| Path | 4 | outline color, under-stroke color (α), outline fill (α), outline stroke width | 02 |
| Labels & indices | 8 | label box / text colors, coordinates / point-index / contour-index / component-index / anchor-name label sizes, anchor name top margin | 02 |
| Guidelines | 19 | glyph/font guideline colors (α), hovered/selected/both colors, guideline node color, stroke width, node halo (α), lock icon underlay/hovered, name size, marker radius, dash length, name margin, lock icon size, node size, hover ring offset, halo offset | 03 |
| Metrics | 4 | baseline, metrics line, alignment zone, zone boundary line (all with α) | 03 |
| Anchors | 9 | anchor color / marker radius, hovered / selected colors, selected halo (α), selected size, stroke width, hover ring offset, halo offset | 03 |
| Components | 10 | hovered / selected component colors, origin marker, transform center, hovered / selected widths, origin marker line width / selected width / size / radius | 03 |
| Layer outlines | 8 | background / editing layer outline colors, background / editing layer anchor colors, both outline widths, both anchor radii | 04 |
| Interaction aids | 12 | drag ghost path (α), connect/insert marker (α), connect radius, insert handle radius, delete indicator size, drag indicator radius, connect/insert width, background image border / hover (α) / width, lock icon (α) / size | 04 |
| Tools | 6 | power ruler line (α), ruler distance box inside (α), ruler intersection (α), knife line (α), sidebearing line (α), reference font fill (α) | 04 |
| Status bar | 3 | min thickness, max thickness, editing opacity | 04 |

> Customization history: node sizes used to be three separate settings
> (corner/smooth/handle); they are now unified into a single `nodeSize` with automatic
> migration of legacy values. Node-type colors distinguish types (violet smooth /
> teal squircle / amber corner / lavender handles), each with its own light and dark
> theme variants.

---

## 2. On-Screen Keyboard Dock (In-Editor Virtual Keyboard)

This feature does not exist in upstream Fontra. EngramFont embeds an
editing-capable on-screen keyboard inside the glyph editing canvas (split arc rows
inspired by the Logitech K860). The keyboard doubles as an operation panel:
menu keys (EFD / Help / Glyph / Font / View / Edit / File), tool keys (select, pen,
knife, rect select, V:A, ruler, hand, DEL, view, move, …), colored modifier/function
keys (purple / yellow / red / green), and a full letter section with ctrl / alt /
space — working alongside canvas nodes/handles and the sidebearing ruler so glyph
editing is completed directly on canvas.

Inspiration credit: the keyboard dock is inspired by [meshfont](https://meshfont.com/)
("Make type your own" — a browser-based font creation tool).

### 2.1 Three Layouts

| Layout | Shape | Shot |
|---|---|---|
| curved split | two separate floating half keyboards, keys arranged on arcs (K860 style) | keyboard-02 |
| split rows | two half keyboards, keys in straight rows | keyboard-03 |
| merged | one full-width keyboard across the bottom, tool keys folded into the top row | keyboard-04 |

Layouts can be cycled via the keyboard handle.

### 2.2 Keyboard Settings Dialog (keyboard-01)

- **Layout**: `curved split` / `split rows` / `merged` radio group
- **Scale**: overall scale (100%)
- **Split gap**: gap between the two halves (3px)
- **Font size**: keycap font size (24px)
- **Squircle**: keycap superellipse factor (1.5)
- **Radius**: keycap corner radius (22px)
- **Border width**: keycap stroke width (0.5px)
- **Theme**: `Day` / `Night` (independent of the application theme)
- ☑ **Show keyboard**: show/hide the keyboard
- **Custom key bindings**: `No custom bindings — right-click a key to add one` (right-click any key to add a binding)

### 2.3 Collaboration with the Canvas

- The **T** key opens Fontra's native text shaping panel (Text layout options / Text
  shaping options / Positioning from font data), used side by side with the keyboard (keyboard-05)
- When the canvas is zoomed in or the keyboard is inactive, it dims to translucent
  gray instead of covering the glyph (keyboard-06)
- Two mini controls sit at the keyboard's bottom center: ⚙ (settings) and – (collapse)

---

## 3. Screenshot Index

| File | Content |
|---|---|
| `theme-settings-01-…glyph-display.png` | top bar + Theme + Preset + Theme packs + Canvas background + Node appearance + Glyph display |
| `theme-settings-02-…labels-indices.png` | Transform selection → Labels & indices |
| `theme-settings-03-…components.png` | Guidelines + Metrics + Anchors + Components |
| `theme-settings-04-…status-bar.png` | Layer outlines + Interaction aids + Tools + Status bar |
| `theme-settings-full.png` | the complete long capture of all four (1200 wide, 2400×11800) |
| `keyboard-01-settings-dialog.png` | Keyboard settings dialog, all fields |
| `keyboard-02-layout-curved-split.png` | layout ① curved split keyboard + glyph editing canvas |
| `keyboard-03-layout-split-rows.png` | layout ② split rows keyboard |
| `keyboard-04-layout-merged.png` | layout ③ merged keyboard |
| `keyboard-05-canvas-with-text-shaping-panel.png` | T-key text shaping panel used beside the keyboard |
| `keyboard-06-canvas-zoomed-keyboard-dimmed.png` | keyboard dimmed while zoomed into the canvas |
