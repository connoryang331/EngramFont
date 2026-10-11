# R3 · 虚拟键盘 Dock · 技术规范

## 1. UI 结构与布局
```
editor-container
├── top-bar-container
├── sidebar-container.left / right（不动）
├── main-container
│   ├── canvas#edit-canvas
│   └── [新增] #keyboard-dock（绝对定位 bottom:0 左右居中，宽 min(920px, 92%)）
│       ├── .kd-toolbar（proof 态显示：kern/space/proof 预设按钮——R5 提供）
│       └── .kd-rows（5 行键帽）
└── sidebar-container.right
```
- 折叠态：Dock 收缩为右下角圆形按钮（键盘 icon），点击展开
- 键帽：`<button class="kd-key" data-key="g" aria-label="g">`（字母键含字形预览：
  复用 glyph-cell-view.js 以 24px 渲染该字形缩略——有字形才显示预览，无则字母）

## 2. 状态机
```
dock: collapsed ←→ expanded（localStorage "engramfont-dock-collapsed"）
modifier: null ←→ "alt" ←→ "ctrl"（内存态，点其它处复位）
canvasMode: edit ←→ proof（R5 拥有该状态，Dock 只读订阅 + 派发切换事件）
```

## 3. 键位映射总表（全部键）
| 键 | 行为 | 接线（Fontra API） | 备注 |
|---|---|---|---|
| 字母 a-z | 切换当前字形 | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}`（editor.js:864 同款） | glyphName=字母 |
| 字形缺失 | 弹创建对话框 | editor.js:860 create-new-glyph 流程复用（抽公共函数或事件派发） | D4 决策 |
| DEL | 文本末字符退格 | `characterLines` 末行末字符移除（Q1 默认行为） | |
| space | 文本追加空格 | characterLines 追加 | |
| ctrl/alt | modifier 态 | alt=字母键大小写；ctrl=预留 | Q2 |
| move | 画布平移开关 | sceneView pan 持久化开关 | |
| 100% | 缩放复位 | viewBox 复位（editor.js:3420 _zoom 路线） | |
| proof | canvasMode=proof | R5 状态机派发 | 依赖 R5 |
| edit | canvasMode=edit | 同上 | |

## 4. 模块与文件清单
| 文件 | 操作 | 内容 |
|---|---|---|
| `src-js/views-editor/src/keyboard-dock.js` | 新增 | KeyboardDock 类（DOM 构建/键位表/事件） |
| `src-js/views-editor/src/editor.js` | 修改 1 处 | 实例化 Dock 并挂载（+折叠按钮挂 main-container） |
| `src-js/views-editor/assets/editor.css` | 修改（追加） | Dock/键帽样式（--engramfont-* 令牌） |
| `src-js/fontra-core/assets/lang/*.js` | 修改 | aria/tooltip 文案键 |

## 5. 交互细节
- 键帽按下（pointerdown）即触发导航，不需要 Enter
- 按住 shift（物理键盘）+ 点字母 = 大写形态字形（"G"）
- 长按字母键 500ms：弹出该字母的相关字形菜单（P2）
- Dock 不遮挡画布交互：Dock 以外的画布区域正常响应编辑工具

## 6. 主题与 a11y
- 全部颜色/边框走 --engramfont-* 令牌（暗色自动）
- 每键：role=button + aria-label（"切换到字形 g"）；焦点环可见；Tab 顺序按行

## 7. 完整键位布局常量表（实现即用）

> **实测修正**：以下占位猜测已全部实证，权威键位表见 [KEYMAP-VERIFIED.md](./KEYMAP-VERIFIED.md)——
> 紫键=网格显隐、黄键=笔画粗细滑块、红/绿键=左右边距滑块、alt=移除锚点、
> 右下四小键=网格吸附/参考线吸附/bezier-mesh 切换/轮廓视图。下表保留供对照，实现以 KEYMAP-VERIFIED.md 为准。
```js
// keyboard-dock.js 顶部常量——全部 28 键的唯一定义处
export const DOCK_ROWS = [
  // row1：数字行 + DEL
  [
    { key: "`", glyph: "grave" }, { key: "1", glyph: "one" }, { key: "2", glyph: "two" },
    { key: "3", glyph: "three" }, { key: "4", glyph: "four" }, { key: "5", glyph: "five" },
    { key: "6", glyph: "six" }, { key: "7", glyph: "seven" }, { key: "8", glyph: "eight" },
    { key: "9", glyph: "nine" }, { key: "0", glyph: "zero" }, { key: "-", glyph: "hyphen" },
    { key: "=", glyph: "equal" },
    { key: "DEL", glyph: null, special: "del", span: 1, style: "orange" },
  ],
  // row2：q 行 + 紫键(eye，语义未知→预留不实现，渲染占位禁用)
  [
    { key: null, special: "eye-reserved", style: "purple", disabled: true },
    { key: "q" }, { key: "w" }, { key: "e" }, { key: "r" }, { key: "t" }, { key: "y" },
    { key: "u" }, { key: "i" }, { key: "o" }, { key: "p" },
    { key: "[", glyph: "bracketleft" }, { key: "]", glyph: "bracketright" },
    { key: "\\", glyph: "backslash" },
  ],
  // row3：a 行 + edit 模式键（蓝，切回编辑/进编辑）
  [
    { key: null, special: "capsule", style: "yellow", disabled: true },
    { key: "a" }, { key: "s" }, { key: "d" }, { key: "f" }, { key: "g" }, { key: "h" },
    { key: "j" }, { key: "k" }, { key: "l" }, { key: ";", glyph: "semicolon" },
    { key: "'", glyph: "quotesingle" },
    { key: "edit", special: "mode-edit", style: "blue", span: 2 },
  ],
  // row4：z 行 + 绿圈(语义未知→预留)
  [
    { key: null, special: "circle-red", style: "red", disabled: true },
    { key: "z" }, { key: "x" }, { key: "c" }, { key: "v" }, { key: "b" }, { key: "n" },
    { key: "m" }, { key: ",", glyph: "comma" }, { key: ".", glyph: "period" },
    { key: "/", glyph: "slash" },
    { key: null, special: "circle-green", style: "green", disabled: true },
  ],
  // row5：ctrl/alt/space + 4 装饰键
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
- `glyph` 存在 = 该键同时渲染字形预览（glyph-cell-view 24px）
- `special` = 功能键（DEL/space/ctrl/alt/mode）；`disabled: true` = meshfont 观察到的装饰/未知键，
  v1 渲染为禁用占位（保持视觉一致），后续版本按需赋语义
- 字母键 glyphName 规则：小写字母=自身；DEL=退格；space=空格字符

## 8. canvasMode 状态机与 Dock 交互（代码级草图）
```js
// canvas-mode.js（R5 交付，Dock 只消费）
import { ObservableController } from "@fontra/core/observable-object.js";
export const canvasModeController = new ObservableController({ mode: "edit" });
canvasModeController.synchronizeWithLocalStorage("engramfont-");
export function setCanvasMode(mode) { canvasModeController.model.mode = mode; }

// keyboard-dock.js 内：
canvasModeController.addKeyListener("mode", (e) => {
  // proof 态：Dock 工具条（kern/space/proof 预设按钮）显示；edit 键高亮
  // edit 态：工具条隐藏
  this.toolbarElement.style.display = canvasModeController.model.mode === "proof" ? "" : "none";
});

// 模式键：
modeProofKey.onclick = () => setCanvasMode("proof");
modeEditKey.onclick  = () => setCanvasMode("edit");
```

## 9. 布局尺寸规范
| 项 | 值 |
|---|---|
| Dock 宽 | min(920px, 92% 画布宽)，水平居中 |
| 键帽 | 高 44px；标准键宽 52px；space 跨 6 键；edit 跨 2 键 |
| 键距 | 6px；行距 8px；Dock 内边距 12px |
| Dock 背景 | var(--engramfont-ui-element-background-color)；圆角 12px |
| 层级 | z-index 高于 canvas，低于对话框（modal-dialog） |
| 折叠态 | 56px 圆形按钮，右下角固定 |
