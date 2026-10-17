# R8 · 技术规范（SPEC）

## 数据模型（themeController，localStorage 前缀 `engramfont-`）

| 键 | 默认 | 说明 |
|---|---|---|
| `nodeSmoothColor` / `nodeCornerColor` / `nodeHandleColor` | `#7A4FE8` / `#D99A1F` / `#A0A0B0` | 画布节点类型色（亮暗共用，见 visualization-layer-definitions `nodeTypeColors`） |
| `nodeSmoothSize` / `nodeCornerSize` | 8 | min 4 · max 24 · step 1 |
| `nodeHandleSize` | 6.5 | min 3 · max 20 · step 0.5 |

**已删除**：`nodeAppearanceCustom`（ADR-0002）。`applyNodeAppearanceSettings(model)`
无条件覆盖三个节点图层的 colors / colorsDarkMode / screenParameters。

## 行组件（simple-settings.js）

- 行统一 `.settings-row`（label 左、控件右、发丝分隔线）；新增 `combined` ui：
  `{ ui:"combined", displayName, resettable:true, controls:[{key,ui,...},...] }`；
- `controlBuilders.color` 支持 `shape: "round"|"square"`；
- reset = `createDomElement("icon-button", { src:"/tabler-icons/refresh.svg", ... })`，
  点击逐控件 `setItem(default)` + 原位回写 input.value（不重渲染、不掉焦点）；
- 通用：`disabledWhen(model)` + `refreshDisabledStates()`（原位灰显，BUG-002）。

## 面板接线（panel-theme-settings.js）

`nodeAppearanceRow(displayName, sizeKey, colorKey, size, color, shape)` 生成三行；
卡片/面板 `max-width: 32em`（五卡片面板统一，shortcuts 除外）。

## 涉及文件

`src-js/fontra-webcomponents/src/simple-settings.js` ·
`src-js/fontra-webcomponents/src/grouped-settings.js`（卡片标题发丝线）·
`src-js/views-applicationsettings/src/panel-theme-settings.js` ·
`src-js/views-applicationsettings/src/panel-{clipboard,display-language,editor-behavior,server-info}.js`（限宽）·
`src-js/views-editor/src/editor.js` + `visualization-layer-definitions.js`（常开化）·
`src-js/fontra-core/src/theme-settings.js`（模型）
