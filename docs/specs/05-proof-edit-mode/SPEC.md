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
