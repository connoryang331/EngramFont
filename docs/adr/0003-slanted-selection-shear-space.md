---
Id: ADR-0003
tags: [frontend, canvas, selection]
Status: accepted
Date: 2026-10-14
---

# 斜向框选：剪切空间命中测试，复用矩形判定

## 背景

对标 Glyphs 的 slanted selection：拖拽框选中按住 Ctrl 改变选区**角度**，
松开 Ctrl 沿当前角度继续改变大小。选区从矩形变成平行四边形——
**命中测试怎么办**？现有 `selectionAtRect` 覆盖四类元素：节点（逐点）、组件
（controlBounds 预滤 + 凸包 + 逐轮廓）、锚点、背景图，各有自己的矩形判定。

## 决策

**剪切空间法**：平行四边形建模为 `{x0, y0, x1, y1, shearK}`
（水平上下边 + 斜侧边；`shearK` = 每垂直单位水平偏移）。判定时把所有候选几何
按 `x -= shearK·(y-y0)` 剪切——平行四边形**恰好退化**为轴对齐矩形
`(x0, y0, x1, y1)`，于是四类元素的既有矩形判定**原样复用**：

- `scene-model.selectionAtParallelogram(para, filter)`：新增方法（不改矩形版）；
- 组件判定镜像 `intersectsRect` 的结构（剪切 controlBounds 预滤 + 剪切凸包 +
  逐轮廓），模块级 helper `componentIntersectsShearedRect`；
- 背景图：`_backgroundImageSelectionAtPointOrRect` 增加 `paraGlyph` 三分支；
- 绘制：`fontra.rect.select` 图层增加平行四边形分支（样式与矩形一致）。

角度状态机在 `edit-tools-pointer.handleRectSelect`：Ctrl 按下瞬间冻结横向宽度 `w`；
角度模式鼠标驱动 `shearK`（钳制 ±12 ≈ ±85°）；松开后定角缩放
（`dy = mouse.y - y0`，`w = dx - k·dy`，角点精确跟随鼠标）。

## 理由

1. **一份判定逻辑而不是四份**：剪切只改变输入坐标，不改判定本身——四类元素的
   命中口径与矩形模式逐条对齐，行为不会悄悄漂移。
2. **精确**：剪切是仿射变换，点/凸包/轮廓测试全部保持精确（测试交叉验证见特性包）。
3. **贴片友好**：全部是新增方法 + 一个绘制分支 + 状态机重写；原有 `selectionAtRect`
   一字未动，不碰 Ctrl 时行为完全一致。

## 被否决的方案

- **每种元素各写 point-in-parallelogram**：四份近似同构的几何代码，未来矩形侧
  修 bug 时必然漏改某一侧。
- **通用凸多边形 SAT/相交工具**：要新写并维护几何 utils，且矩形路径仍要保留
  （不碰 Ctrl 时走原路），两套判定并存更贵。

## 后果

- 选区状态新增 `sceneController.selectionParallelogram`（glyph 坐标，与
  `selectionRect` 同约定，拖拽结束清空）。
- 组件/背景图在斜选下的判定精度与矩形模式同级（含已知简化：矩形完全包住
  多边形时按角点判定——与上游 `rectIntersectsPolygon` 的既有口径一致）。
- 验证：独立实现的剪切命中计算与真实选择逐点一致（point/7,16,18）；
  `npx playwright test` 35/35 回归通过。

## 关联

- 特性包：[docs/specs/09-slanted-selection/](../specs/09-slanted-selection/)
- 台账：ENGRAM-CHANGES.md「R5-T5.5」
