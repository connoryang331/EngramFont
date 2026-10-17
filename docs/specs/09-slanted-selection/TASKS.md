# R9 · 任务分解（施工单）

## T9.1 · 状态机（edit-tools-pointer.js）
`handleRectSelect` 三态（矩形 / 角度模式 / 定角缩放）；`makeSelectionParallelogram` +
`offsetSelectionParallelogram` helper；`sceneController.selectionParallelogram` 存取。
DoD：不碰 Ctrl 行为与旧实现一致。

## T9.2 · 命中测试（scene-model.js）
`selectionAtParallelogram`（剪切空间法）+ `componentIntersectsShearedRect` +
背景图 `paraGlyph` 分支；controlBounds 剪切预滤。
DoD：四类元素命中与矩形模式口径逐条对齐。

## T9.3 · 绘制（visualization-layer-definitions.js）
`fontra.rect.select` 平行四边形分支（黑实线 + 白虚线，复用 strokePolygon）。
DoD：拖拽中虚线平行四边形正确渲染（亮/暗主题）。

## T9.4 · 验证
headless 交互测试（拖拽 + keyboard.down Control + 松开 + 交叉校验）+ 全量 e2e。
DoD：TEST.md 全绿。
