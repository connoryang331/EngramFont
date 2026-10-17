I decided to reject building a font editor. The reason: there is no need to create a non-disruptive font editor for a brand-new writing system that is at the same time a font style — and the features of such an editor, it seems, are already covered by all the font software on the market. It would be duplicated engineering.

# EngramFont

EngramFont is a fork of [Fontra](https://github.com/fontra/fontra) — Fontra's
browser-based collaborative font editor, kept as the foundation. This README does
**not** re-document Fontra; it records **only what EngramFont adds or changes on top
of upstream**. The screenshots in [`sceenshot/`](sceenshot/) are the visual record.

![EngramFont theme settings — full panel](sceenshot/theme-settings-full.png)

- Upstream: [fontra/fontra](https://github.com/fontra/fontra)
- Design decisions: [`docs/adr/`](docs/adr/) · feature specs: [`docs/specs/`](docs/specs/) · wiki: [`docs/wiki/`](docs/wiki/)
- Screenshot index: [`sceenshot/README.md`](sceenshot/README.md)

---

## 1. Theme Settings Panel (Application Settings → Theme settings)

Upstream Fontra's panel contains a single item: `Theme: Automatic / Light / Dark`.
EngramFont expands it into a full editor-appearance customization system with three parts.

![Theme settings — top cards](sceenshot/theme-settings-01-theme-preset-theme-packs-canvas-background-node-appearance-glyph-display.png)

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
- Schema: [`docs/schemas/engramfont-theme-pack.schema.json`](docs/schemas/engramfont-theme-pack.schema.json)

### 1.3 Visual Customization Groups (17 groups × 131 tokens)

Every color row is a "swatch + `α =` alpha number input + ⟲ per-row reset";
numeric rows use inline input fields. Token definitions live in
`src-js/fontra-core/src/visual-tokens.js`.

| Group | Items | What can be customized (examples) |
|---|---:|---|
| Canvas background | 2 | Canvas color, UPM grid color |
| Node appearance | 17 | node size, three node-type colors (smooth violet / squircle teal / corner orange), handle & selected-handle colors, Diamond handle toggle, editing-layer node color (α), selected node fill, handle line, background-layer nodes, selected node halo (α), hover ring offset, selection halo offset, background-layer node/handle sizes |
| Glyph display | 13 | context/selected/hovered glyph fill & outline (α), error glyph color, undefined glyph color (α), empty glyph placeholder (α), empty selected/hovered glyph colors, clean display fill, glyph highlight inner/outer widths |
| Transform selection | 4 | handle fill, handle size, dashed border color, dashed border width |
| Start point indicator | 4 | chevron color / size / gap / width |
| Drag crosshair | 4 | crosshair color / width / Dashed toggle / dash length |
| Rect select | 4 | solid color, dash color, stroke width, dash length |
| Path | 4 | outline color, under-stroke color (α), outline fill (α), outline stroke width |
| Labels & indices | 8 | label box / text colors, coordinates / point-index / contour-index / component-index / anchor-name label sizes, anchor name top margin |
| Guidelines | 19 | glyph/font guideline colors (α), hovered/selected/both colors, guideline node color, stroke width, node halo (α), lock icon underlay/hovered, name size, marker radius, dash length, name margin, lock icon size, node size, hover ring offset, halo offset |
| Metrics | 4 | baseline, metrics line, alignment zone, zone boundary line (all with α) |
| Anchors | 9 | anchor color / marker radius, hovered / selected colors, selected halo (α), selected size, stroke width, hover ring offset, halo offset |
| Components | 10 | hovered / selected component colors, origin marker, transform center, hovered / selected widths, origin marker line width / selected width / size / radius |
| Layer outlines | 8 | background / editing layer outline colors, background / editing layer anchor colors, both outline widths, both anchor radii |
| Interaction aids | 12 | drag ghost path (α), connect/insert marker (α), connect radius, insert handle radius, delete indicator size, drag indicator radius, connect/insert width, background image border / hover (α) / width, lock icon (α) / size |
| Tools | 6 | power ruler line (α), ruler distance box inside (α), ruler intersection (α), knife line (α), sidebearing line (α), reference font fill (α) |
| Status bar | 3 | min thickness, max thickness, editing opacity |

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

![Keyboard dock — curved split layout](sceenshot/keyboard-02-layout-curved-split.png)

Inspiration credit: the keyboard dock is inspired by [meshfont](https://meshfont.com/)
("Make type your own" — a browser-based font creation tool).

### 2.1 Three Layouts

| Layout | Shape | Shot |
|---|---|---|
| curved split | two separate floating half keyboards, keys arranged on arcs (K860 style) | [`keyboard-02`](sceenshot/keyboard-02-layout-curved-split.png) |
| split rows | two half keyboards, keys in straight rows | [`keyboard-03`](sceenshot/keyboard-03-layout-split-rows.png) |
| merged | one full-width keyboard across the bottom, tool keys folded into the top row | [`keyboard-04`](sceenshot/keyboard-04-layout-merged.png) |

Layouts can be cycled via the keyboard handle.

### 2.2 Keyboard Settings Dialog

![Keyboard settings dialog](sceenshot/keyboard-01-settings-dialog.png)

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
  shaping options / Positioning from font data), used side by side with the keyboard ([`keyboard-05`](sceenshot/keyboard-05-canvas-with-text-shaping-panel.png))
- When the canvas is zoomed in or the keyboard is inactive, it dims to translucent
  gray instead of covering the glyph ([`keyboard-06`](sceenshot/keyboard-06-canvas-zoomed-keyboard-dimmed.png))
- Two mini controls sit at the keyboard's bottom center: ⚙ (settings) and – (collapse)

---

## 3. Squircle Nodes (G2 Curvature-Continuous Node Kind)

A third on-curve node kind besides **corner** and **smooth**: the **squircle** node —
a curvature-continuous (G2) join. Upstream Fontra offers only corner/smooth; Glyphs
calls the equivalent "super-smooth" and marks it with a star (curve↔curve) or raindrop
(line↔curve) icon. EngramFont deliberately renames it **squircle** and draws the icon
as a **superellipse** (|x/a|ⁿ + |y/b|ⁿ = 1, fixed exponent n = 3) in a dedicated teal
color (light `#0D9488` / dark `#2DD4BF`): the icon's own shape is a curve of
continuously varying curvature — shape is meaning, no star convention to memorize.
Decisions: [ADR-0009](docs/adr/0009-squircle-g2-nodes.md) (naming, icon, closed-form
solve), [ADR-0010](docs/adr/0010-node-slide-g2.md) (node slide),
[ADR-0011](docs/adr/0011-node-kind-state-is-geometry.md) (icon honesty),
[ADR-0012](docs/adr/0012-squircle-line-curve-derived-transition.md) (line↔curve).

| Gesture | Effect |
|---|---|
| double-click | cycles node kind: corner → smooth → squircle → corner → … — a true geometry change; making a join G2 may slide the node slightly along its tangent (cheaper of in-place vs sliding solve, ADR-0010) |
| Shift + double-click | escalates straight to squircle from any kind; idempotent (no-op on an already-squircle node) and never de-escalates |
| Alt + double-click | flag-only change — flips the node-kind flag without touching geometry (escape hatch) |

Key properties:

- **The icon never lies** (ADR-0011): a squircle node is by definition also smooth
  (G2 implies G1); the flag is refused rather than half-applied when curvature
  continuity cannot actually be achieved, and downgrades genuinely reshape
  segments and handles.
- **Stored outline stays clean**: the squircle flag is an independent on-curve
  annotation packed into `pointTypes` (`SQUIRCLE_FLAG`), not a new curve type; it
  survives copy and serialization round-trips.
- **Line↔curve joins are derived geometry** (ADR-0012): a single cubic cannot host a
  G2 transition from a straight side, so the transition needs at least one derived
  point. EngramFont derives it live at render time (`squircle-transition.js`) and
  materializes it in the Python exporter — the stored file keeps the plain path
  (Glyphs' "points created on export", made real).
- **Screen === export**: canvas renderer, gestures and the Python exporter are locked
  to one shared truth table, `test-common/squircle-line-curve-vectors.json`
  (generated by the Python side, asserted by both).
- Test coverage: `test-squircle.js` (gestures, kind state machine, icon honesty) and
  `test-squircle-transition.js` (derived geometry, shared truth table).

Not to be confused with the keyboard dock's keycap **Squircle** setting (§2.2),
which controls keycap corner shape only.

---

## 4. Slanted Selection (Ctrl + drag)

While dragging a rectangular selection, holding **Ctrl** turns the marquee into a
**parallelogram**: with Ctrl held the drag changes the selection **angle**, and after
releasing Ctrl the drag keeps that angle and changes size again — mirroring Glyphs'
slanted selection. The angle is clamped to roughly ±85°.

Hit-testing runs in **shear space**: every candidate geometry (nodes, components,
anchors, background images) is sheared back by `x -= shearK·(y − y0)`, which exactly
degenerates the parallelogram into the axis-aligned rectangle the existing per-element
rect tests already handle — one judgment path instead of four divergent ones.
Implementation: `scene-model.selectionAtParallelogram`, angle state machine in
`edit-tools-pointer.handleRectSelect`. See
[ADR-0003](docs/adr/0003-slanted-selection-shear-space.md) and
[specs/09](docs/specs/09-slanted-selection/).

![Slanted selection — Ctrl turns the rect marquee into a parallelogram](sceenshot/slanted-selection-ctrl.png)

---

## 5. Repository Map (customization-related)

| Path | Content |
|---|---|
| `src-js/fontra-core/src/visual-tokens.js` | 131 theme token definitions (17 categories) |
| `src-js/fontra-core/src/theme-presets.js` | built-in presets (High contrast, Low noise) |
| `src-js/fontra-core/src/color-derive.js` | color derivation helpers |
| `src-js/fontra-core/src/squircle-transition.js` | derived line↔curve G2 transitions (squircle "raindrop" joins) |
| `src-js/views-applicationsettings/src/panel-theme-settings.js` | theme settings panel UI (presets, packs, category cards) |
| `src-js/views-editor/src/keyboard-dock.js` | on-screen keyboard dock |
| `docs/adr/` | architecture decisions 0001–0012 |
| `docs/specs/` | PRD/SPEC/TASKS/TEST for features 08–10 |
| `docs/schemas/` | theme-pack JSON schema, visual-token catalog |
| `sceenshot/` | all captures + per-file index |
