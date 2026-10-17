# R8 · 任务分解（施工单）

## T8.1 · 行组件重排（simple-settings.js）
行统一「文字在前控件在后」；`combined` ui + `controlBuilders` 抽取；radio 数组展平
（BUG-001）；`disabledWhen` + `refreshDisabledStates`（BUG-002）。
DoD：三面板渲染正常、radio 文字正常。

## T8.2 · 面板接线（panel-theme-settings.js）+ 限宽
`nodeAppearanceRow()` 三行；总开关删除；五面板 `max-width: 32em`。
DoD：Node appearance 三行结构正确；面板不再全窗拉伸。

## T8.3 · 常开化 + 监听修复
`applyNodeAppearanceSettings` 无条件应用；editor.js 监听传 `themeController.model`
（BUG-004）；theme-settings.js 删 `nodeAppearanceCustom`。
DoD：改设置画布即时变、重开仍生效。

## T8.4 · 色块形状 + reset 图标
`shape` 字段（round/square）；行级 reset（icon-button 属性赋值，BUG-003）。
DoD：三形状正确、reset 往返 14/#ff0000 → 8/#7a4fe8 落盘。
