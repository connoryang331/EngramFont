# R5 · 技术规范（SPEC）

## 状态机
```
edit ←→ proof        （canvasMode: "edit" | "proof" | ["mesh" 预留]）
持久化：localStorage "engramfont-canvas-mode"
默认：edit
```

## proof 态渲染
- 文本布局：复用 scene-model 现有多行堆叠（lineHeight）——零新代码
- 导线：`fontra.lineMetrics` 可视化层改造——宽度来源从
  `positionedGlyph.glyph.xAdvance`（单字形）改为**整行宽度**
  （scene-model 的 line layout 已有行宽数据），仅 canvasMode=proof 时生效
- 编辑禁用：工具簇隐藏 + glyphSelector("editing") 的层不激活（proof 态 selectionFunc 返回 false）

## 预设按钮（proof 工具条，Dock 上方）
| 按钮 | 文本 |
|---|---|
| your text | 恢复用户输入 |
| kern | AVAT AT AV To To Wa Wa Yo Yo |
| capitals | A-Z 0-9 |
| spacing | nnnoonn HHooHH nHnH oHoH |
| shapes | sphinx of black quartz, judge my vow... |

实现：设置 sceneSettings.characterLines（text-entry 面板自动同步——同一 controller）

## edit 态
- 现状保持（字形编辑 + 单字形导线），无改动

## 接线清单
| 项 | 位置 |
|---|---|
| 模式状态 | 新增 sceneSettings.canvasMode + localStorage 同步（theme-settings.js 同款模式）|
| 全宽导线 | visualization-layer-definitions.js fontra.lineMetrics 层 |
| 工具禁用 | editor.js 工具簇按 canvasMode 条件渲染 |
| 预设按钮 | keyboard-dock（R3）上方工具条 |
