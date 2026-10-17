# R9 · 斜向框选（Glyphs 风 Ctrl 改角度）· 需求文档（PRD）

## 背景

Glyphs handbook「Editing paths → Selecting nodes and paths」：

> While dragging a selection, hold down the Control key to change the selection angle.
> Release Control to resize the selection at its current angle. Slanted selections are
> particularly helpful for italic designs.

斜体/斜杠设计里，沿斜向主干一次框选全部节点是高频动作；Fontra 原生只有轴对齐矩形框选。

## 目标（Glyphs 行为对齐）

1. 空白处拖拽 = 原有矩形框选（行为不变）；
2. 拖拽中**按住 Ctrl** → 选区变平行四边形，鼠标移动改变**倾斜角度**；
3. **松开 Ctrl**（保持拖拽）→ 沿当前角度继续改变大小（角点跟随鼠标）；
4. Ctrl 可反复按下/松开；平行四边形内的**节点/组件/锚点/背景图**都被选中；
5. Shift/Alt 的加减选、on-curve/off-curve 过滤行为不变。

## 用户故事

- 斜体字干是斜的 → 我拖出矩形、按 Ctrl 摆到与字干平行、松开 Ctrl 拉满高度 → 一次选中整条斜干上的节点。

## 非目标

- 旋转矩形（四角自由旋转）；斜向**移动**选区（拖选区仍是既有拖拽编辑）。

## 验收标准（概览）

- 拖拽中 Ctrl 切换矩形⇄平行四边形，形状连续（无跳变）；
- 松开 Ctrl 后角度冻结，鼠标只改变大小；
- 平行四边形命中与独立几何计算逐点一致；
- 不碰 Ctrl 时与原实现逐字节同路（e2e 全量回归守护）。

> 技术决策（剪切空间法、被否决方案）见 [ADR-0003](../../adr/0003-slanted-selection-shear-space.md)。
