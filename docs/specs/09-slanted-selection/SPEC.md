# R9 · 技术规范（SPEC）

## 状态机（edit-tools-pointer.js `handleRectSelect`）

拖拽状态 `slant = { k, w, dy }`（k=剪切，w=底边宽，dy=纵向跨度）：

| 阶段 | 触发 | 行为 |
|---|---|---|
| 矩形 | 未碰过 Ctrl | 原有 `normalizeRect` 路径，逐字节同旧实现 |
| 进入角度模式 | `event.ctrlKey` 上升沿 | 冻结 `w = dx - k·dy`（首次即 `dx`） |
| 角度模式 | Ctrl 持续 | `k = clamp((dx - w)/dy, ±12)`（≈±85°），`dy = mouse.dy`；角点 C = 鼠标 |
| 定角缩放 | Ctrl 释放后 | `dy = mouse.dy`；`w = dx - k·dy`；k 不变 |

`|dy| < 0.25` 时保持上一帧 k（避免除零爆表）；Ctrl 上升沿可反复发生（重冻结 w）。

## 数据模型

`selectionParallelogram = {x0, y0, x1, y1, shearK}`（glyph 坐标，与 `selectionRect`
同约定，拖拽结束置 undefined）。四角 = `(x0,y0) (x1,y0) (x1+k·dy, y1) (x0+k·dy, y1)`
——水平上下边 + 斜侧边。

## 命中测试（scene-model.selectionAtParallelogram）

剪切空间法（ADR-0003）：候选几何按 `x -= k·(y-y0)` 剪切后按轴对齐矩形判定——

- 节点：`path.iterPoints()` 逐点剪切 + `pointInRect`（controlBounds 剪切预滤）；
- 组件：`componentIntersectsShearedRect`（镜像 `intersectsRect`：剪切 bounds 预滤 →
  凸包角点/边相交 → 逐轮廓）；
- 锚点：剪切点测试；
- 背景图：`_backgroundImageSelectionAtPointOrRect` 新增 `paraGlyph` 分支
  （剪切 bg 多边形 + 角点/边交/含容三查）。

选择模式（replace/union/difference）与 on-curve 过滤逻辑与矩形模式完全一致。

## 绘制（fontra.rect.select 图层）

平行四边形分支：黑实线描一遍 + 白虚线描一遍（同矩形）；矩形路径原样保留。

## 涉及文件

`edit-tools-pointer.js`（状态机 + 两个 helper）· `scene-model.js`（新方法 + helper）·
`scene-controller.js`（selectionParallelogram 存取）· `visualization-layer-definitions.js`（绘制分支）
