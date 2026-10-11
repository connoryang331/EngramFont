# R3 · 技术规范（SPEC）

## UI 结构（画布底部 overlay）
```
editor-container
├── sidebar-container.left
├── main-container (canvas)
└── [新增] keyboard-dock（绝对定位于 main-container 底部，高度 ~240px，可折叠）
```
- 新模块：`src-js/views-editor/src/keyboard-dock.js`（导出 KeyboardDock 类）
- editor.js：实例化并 append 到 main-container（一行注册）
- 键帽字形渲染：复用 `fontra-webcomponents/glyph-cell-view.js`

## 接线清单（已探明的 Fontra API）
| 能力 | 接线点 |
|---|---|
| 切换当前字形 | `sceneSettings.selectedGlyph = {...selectedGlyph, glyphName: "g", isEditing: true}`（editor.js:864 同款）|
| 字形缺失→创建 | editor.js:860 起的 create-new-glyph 对话框流程（dialog + fontController.newGlyph）|
| 修文本 | `sceneSettingsController.model.characterLines`（行×字符数组，scene-model.js:462 消费）|
| 缩放复位 | editor._zoom / viewBox 直设（editor.js:3420）|
| 平移 | sceneView pan 状态 |
| 模式切换 | R5 的 canvas mode 状态机 |

## 状态
- dock 展开/折叠：localStorage `engramfont-dock-collapsed`
- modifier 状态：内存（不持久化）
- 当前按键高亮：跟随 selectedGlyph.glyphName

## 键位数据源
- 键位布局定义为常量表（rows 数组），便于后续加行/改布局
- 字母键 → 字形名映射：小写直用；数字/标点用 glyph 名（如 "one"/"exclam"）——首版只做字母键，
  数字/标点键映射到对应 glyph 名（FontBuilder 命名惯例）第二批补

## 主题
- 颜色走 CSS 变量（--engramfont-* / fontra 暗色机制），不硬编码色值
