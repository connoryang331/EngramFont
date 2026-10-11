# R5 · 任务拆解

## T5.1 状态机（0.5d）
- 文件：新增 canvas-mode.js；sceneSettings 订阅
- DoD：切模式 → localStorage 持久化 + reload 保持；订阅者收到变更事件

## T5.2 全宽导线（1d）
- 文件：visualization-layer-definitions.js（fontra.lineMetrics draw）
- 步骤：draw 参数注入 lineLayoutWidth（proof 态）→ pathBox.rect 宽度替换
- DoD：proof 态导线横跨整行（e2e 宽度断言）；edit 态不回归（单字形宽度不变）

## T5.3 编辑禁用（0.5d）
- DoD：proof 态 pen/point/selection 工具无响应；edit 态恢复

## T5.4 预设按钮（0.5d）
- DoD：5 按钮点击 → 画布文本变化（characterLines 断言）
