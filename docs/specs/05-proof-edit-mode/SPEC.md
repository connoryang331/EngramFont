# R5 · Proof/Edit 双模式画布 · 技术规范

## 1. 状态机
```
canvasMode: "edit" ←→ "proof"     （"mesh" 预留）
持久化：localStorage "engramfont-canvas-mode"（theme-settings.js 同款模式）
默认："edit"（老用户无感）
转换：任意态 <100ms，无服务端往返
```

## 2. proof 态渲染规范
| 项 | 规范 |
|---|---|
| 文本布局 | 复用 scene-model 现有多行堆叠（lineHeight，scene-model.js:471/561）零新代码 |
| metrics 导线 | `fontra.lineMetrics` 层宽度来源参数化：canvasMode=proof 时画**整行宽度**（scene-model 行布局数据），edit 态维持单字形宽度（现状） |
| 编辑禁用 | 工具簇隐藏（editor.js 工具注册处按 canvasMode 条件）；`glyphSelector("editing")` 的可视化层在 proof 态不激活 |
| 选中态 | proof 态仍可点字形（高亮定位），但无控制点/拖拽 |
| 缩放 | 保留（100%/滚轮） |

## 3. 预设按钮（Dock 上方工具条，R3 提供）
| 按钮 | 设置文本（characterLines） |
|---|---|
| your text | 恢复用户最近输入（内存缓存） |
| kern | `AVAT AT AV To To Wa Wa Yo Yo` |
| capitals | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` + `0123456789` |
| spacing | `nnnoonn HHooHH nHnH oHoH` |
| shapes | `sphinx of black quartz, judge my vow.` + `pack my box with five dozen liquor jugs.` |

实现：设置 sceneSettings.characterLines（text-entry 面板自动同步——同一 controller）

## 4. 文件清单
| 文件 | 操作 | 内容 |
|---|---|---|
| `src-js/views-editor/src/canvas-mode.js` | 新增 | canvasMode 状态机（get/set/subscribe/持久化） |
| `src-js/views-editor/src/visualization-layer-definitions.js` | 修改 | lineMetrics 层宽度参数化（proof 态整行） |
| `src-js/views-editor/src/editor.js` | 修改 2 处 | 工具簇按模式条件渲染；canvasMode 订阅 |
| `src-js/views-editor/src/keyboard-dock.js`（R3） | 修改 | 模式键派发 |

## 5. 交互细节
- 切换动画：无（即时切换，保持 viewport 不变——参照 engram-editor immersive-mode 的 viewport 保持经验）
- proof 态下滚轮仍缩放、space 仍平移
- edit 态恢复：工具选择恢复到进入 proof 前的工具

## 6. 五个预览预设 · 精确字符串（实现即用）
```js
// keyboard-dock.js（R3）工具条按钮 → 设置 characterLines
export const PROOF_PRESETS = {
  "your-text": null,   // 恢复用户输入：保存进入 proof 前的 characterLines 快照（内存）
  "kerning": ["AVAT AT AV", "To To Wa Wa", "Yo Yo AVA"],
  "capitals": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789"],
  "spacing": ["nnnoonn", "HHooHH", "nHnH oHoH"],
  "shapes": [
    "sphinx of black quartz, judge my vow.",
    "pack my box with five dozen liquor jugs.",
  ],
};
```
- "your text"：进入 proof 前缓存 `characterLines` 快照（内存变量，不持久化）
- 点击预设 = `sceneSettings.characterLines = preset.map(line => line.split(""))`
  （characterLines 结构：行数组 × 字符数组——实现时以 scene-model.js:462 消费端为准核对）

## 7. fontra.lineMetrics 层改造 · 代码级草图
```js
// visualization-layer-definitions.js — fontra.lineMetrics 层 draw() 改造点
draw: ({ context, positionedGlyph, parameters, model, controller }) => {
  // 现状：glyphWidth = positionedGlyph.glyph.xAdvance（单字形宽）
  // 改造：proof 态取整行宽（canvas-mode.js 提供 isProof() 与 lineLayoutWidth）
  const width = isProof()
    ? model.textLayoutWidth            // scene-model 行布局已有该数据（行内字形 advance 累计）
    : positionedGlyph.glyph.xAdvance;
  // pathBox.rect(0, descender, width, ascender-descender) 等全部用 width
  // 注意：多行时逐行画（scene-model 的 lineHeight 堆叠 y 值迭代——与 scene-model.js:561 同步）
}
```
- 接口新增：scene-model 暴露 `textLayoutWidth`（每行宽度数组）——scene-model.js 内部已有
  逐行字形 advance 累计（:471 起的布局循环），只需存储并暴露，~5 行
- 回归保障：edit 态（isProof()=false）走原路径，单字形导线不变

## 8. 工具禁用清单（proof 态）
| 部件 | proof 态行为 |
|---|---|
| 工具簇（pen/knife/rect/ruler） | 隐藏（editor.js 工具注册处按 canvasMode 条件） |
| 选中控制点/拖拽 | glyphSelector("editing") 层不激活 |
| 侧栏（text-entry 除外） | 保留可见但输入禁用（avoid 误编辑） |
| 缩放/平移 | 保留 |
| Dock | 可见（proof 工具条显示） |

## 9. proof 工具条三按钮 · 语义规范（kern / space / proof）
> 位置：proof 态下键盘上方工具条。行为依据：meshfont 截图弹窗（5 预设）+ 标签推断；
> **精确文本串留待执行会话对照验证**（对照工具：demo-liga/probe-proof-keys.mjs 已备好，执行时先跑它采集基准）。

| 按钮 | 行为规范 | 预设文本（推测初值，执行时对照） |
|---|---|---|
| **kern** | 一键把画布文本切换为**字距对预览** | `AVAT AT AV` `To To Wa Wa` `Yo Yo AVA` |
| **space** | 一键切换为**间距节奏预览** | `nnnoonn` `HHooHH` `nHnH oHoH` |
| **proof（带▾下拉）** | 打开 5 预设菜单（your text / kerning / capitals / spacing / shapes）+ 应用当前选择 | 菜单即 R5 §6 的 PROOF_PRESETS |

- 实现形式：三个按钮都只是**设置 characterLines**（kern/space=直接设预设串；proof=开下拉菜单），
  复用 R5 §6 的 PROOF_PRESETS 常量表——无独立渲染逻辑
- your text：进入 proof 前缓存用户 characterLines 快照

## 10. 排版控制 = Dock 滑块的上下文重映射（v5 定案）
proof 态的排版控制**不新增控件**——复用 Dock 的四个滑块/键（canvasMode 驱动语义重映射）：

| Dock 控件 | proof 态功能 | 作用于 |
|---|---|---|
| 紫色 | Metric lines 显隐 | 导线可视化层开关 |
| 黄滑块 | letter spacing（字母间距） | 文本字距（tracking） |
| 红滑块 | Word spacing（词间距） | 空格宽度倍率 |
| 绿滑块 | Line height（行高） | 行距堆叠 |
| DEL | reset 文本（恢复默认文本） | characterLines 复位 |

- sceneSettings 新增字段：`wordSpacing`（默认 1.0 倍空格宽）、`letterSpacing`（默认 0 额外）、
  `canvasMode`（R5 已有）——scene-model 布局循环消费这些值（lineHeight 已有 ✓）
- edit 态下同组滑块回退为字形编辑控制（见 R3 KEYMAP v5 双功能表）
