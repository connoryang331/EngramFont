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
