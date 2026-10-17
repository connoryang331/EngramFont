# R8 · Technical Specification (SPEC)

## Data Model (themeController, localStorage prefix `engramfont-`)

| Key | Default | Description |
|---|---|---|
| `nodeSmoothColor` / `nodeCornerColor` / `nodeHandleColor` | `#7A4FE8` / `#D99A1F` / `#A0A0B0` | Canvas node type colors (shared by light and dark, see visualization-layer-definitions `nodeTypeColors`) |
| `nodeSmoothSize` / `nodeCornerSize` | 8 | min 4 · max 24 · step 1 |
| `nodeHandleSize` | 6.5 | min 3 · max 20 · step 0.5 |

**Removed**: `nodeAppearanceCustom` (ADR-0002). `applyNodeAppearanceSettings(model)`
unconditionally overwrites the colors / colorsDarkMode / screenParameters of the three node layers.

## Row Component (simple-settings.js)

- Rows are unified as `.settings-row` (label left, controls right, hairline separator); new `combined` ui:
  `{ ui:"combined", displayName, resettable:true, controls:[{key,ui,...},...] }`;
- `controlBuilders.color` supports `shape: "round"|"square"`;
- reset = `createDomElement("icon-button", { src:"/tabler-icons/refresh.svg", ... })`;
  on click, per-control `setItem(default)` + write back input.value in place (no re-render, no focus loss);
- Generic: `disabledWhen(model)` + `refreshDisabledStates()` (gray-out in place, BUG-002).

## Panel Wiring (panel-theme-settings.js)

`nodeAppearanceRow(displayName, sizeKey, colorKey, size, color, shape)` generates the three rows;
card/panel `max-width: 32em` (unified across the five card panels, except shortcuts).

## Files Involved

`src-js/fontra-webcomponents/src/simple-settings.js` ·
`src-js/fontra-webcomponents/src/grouped-settings.js` (card title hairline) ·
`src-js/views-applicationsettings/src/panel-theme-settings.js` ·
`src-js/views-applicationsettings/src/panel-{clipboard,display-language,editor-behavior,server-info}.js` (width cap) ·
`src-js/views-editor/src/editor.js` + `visualization-layer-definitions.js` (always-on) ·
`src-js/fontra-core/src/theme-settings.js` (model)
