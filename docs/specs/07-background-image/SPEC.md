# R7 · 技术规范（SPEC）

## 1. replace（服务端 + 前端各一小块）
- 数据层：背景图存在 glyph 的 backgroundImages（putBackgroundImage 已有，fonthandler.py:169）
- replace = putBackgroundImage(新图数据) 且**保留原 transformation/opacity/color/customData**
- 端点：复用 putBackgroundImage 远程方法（前端直接调），无需新端点
- 前端：选中背景图的 selection-info 面板加 "Replace" 按钮（file input → 读文件字节 →
  调 putBackgroundImage 传新图 + 旧 transformation）——纯前端，零后端改动

## 2. 选中体验
- 现状：scene-controller.js:513 `selection.has("backgroundImage/0")` —— 背景图可选（selection 键 backgroundImage/0）
- 增强：pointer 工具点击背景图即选中（确认现有点击命中是否含背景图；若无则补命中测试）

## 3. 文件清单
| 文件 | 操作 |
|---|---|
| `src-js/views-editor/src/panel-selection-info.js` | 修改（背景图字段区加 Replace 按钮 + file input） |
| `src-js/views-editor/src/scene-controller.js` | 修改（如需补背景图点击命中） |

## 4. 错误处理
| 场景 | 行为 |
|---|---|
| replace 非图片文件 | 前端校验 MIME，提示 |
| 未选中背景图时点 Replace | 按钮不出现（仅选中态渲染） |
