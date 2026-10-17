---
Id: ADR-0007
tags: [frontend, canvas, nodes]
Status: accepted
Date: 2026-10-14
---

# 起始点方向指示：圆弧改为尖角箭头（`>` / `<`）

## 背景

`fontra.startpoint.indicator` 图层在每条轮廓的起始点画方向指示。旧实现是
**以起始点为圆心的圆弧**（`context.arc`，半径 9），用 ±`START_POINT_ARC_GAP_ANGLE`
（0.25π）把缺口对准轮廓前进方向——语义是"缺口朝向 = 前进方向"。

用户反馈（附截图）：起始点被选中时呈"方框 + 圆弧"，方向不够直观，
要求改成**尖角箭头**：朝右是 `>`、朝左是 `<`。

## 决策

同一个图层内改画法（`visualization-layer-definitions.js` 单文件）：

- 方向仍取前进方向 `d = normalize(next - start)`、`angle = atan2(d.y, d.x)`；
- 形状：局部坐标画顶点朝 `+x` 的折线 `upper → tip → lower`
  （`tip = (r, 0)`，两腿从顶点向后张开 `±START_POINT_CHEVRON_HALF_ANGLE`，取 0.28π）；
- 摆放：`save()` → `translate(start)` → `rotate(angle)` → 画 → `restore()`；
- 只描边不填充（沿用 `strokeWidth`）；颜色/亮暗两套/`selectionFunc`/`zIndex` 不变；
- 删除 `START_POINT_ARC_GAP_ANGLE`，新增 `START_POINT_CHEVRON_HALF_ANGLE`；
- 单点轮廓（无前进方向）不再画整圆，改为**跳过**（无语义就不画指示）。

## 理由

1. **箭头比"缺口"直观**：`>`/`<` 是通用方向符号，一眼可读；圆弧的缺口方向
   需要用户先知道"缺口=前进方向"这条约定；
2. **刚体旋转天然给出左右形**：顶点朝前进方向时，朝右呈 `>`、朝左呈 `<`，
   是旋转而非镜像，符合直觉（不是把 `>` 翻成 `<` 的额外分支）；
3. **改动面最小**：单图层、单文件；参数与颜色沿用，其余图层零影响。

## 被否决的方案

- **保留圆弧、只调缺口角度**：用户明确要"变成大于号/小于号"，圆弧无法表达尖角；
- **用两条独立线段画箭头（带箭杆）**：起始点处已有点选方框/节点图标，
  加箭杆会显拥挤；纯 chevron 更轻，且与"方向指示"语义足够；
- **箭头大小做成设置项**：当前无此需求，沿用 `screenParameters.radius` 即可。

## 后果

- 起始点方向指示变为 `>` / `<` / `∧` / `∨` 及任意斜向旋转；
- 单点轮廓不再显示方向指示（旧实现显示整圆）；
- 与选中态（方框 / 眼形节点）共存，位置不冲突（箭头以起始点为顶点向外张）。

## 关联

- 特性包：[docs/specs/10-startpoint-chevron/](../specs/10-startpoint-chevron/)
- 台账：ENGRAM-CHANGES.md「R10-T10.1」
