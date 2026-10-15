# R11 · 任务分解（施工单）

## T11.1 · 数学核心
推导 G2 条件并实现 `path-curvature.js`（闭式解 + 直线↔曲线 + 可行性判定 + 空间判定）。
DoD：自带 138 条断言全过，且**本仓独立复跑确认**（不轻信子任务报告）。

## T11.2 · 数据层
`SQUIRCLE_FLAG = 0x10` + `getPoint`/`setPointType`/`packPointType`/`packContour` 支持。
DoD：flag 序列化往返不丢；squircle 点同时是 smooth。

## T11.3 · 几何适配
`collectSegmentSide` + `applySquircleAtPoint` + `makeSquircle` + `advanceNodeKind`。
DoD：曲线↔曲线曲率跳变降到机器精度；直线侧不插手柄；不可行时不置标志。

## T11.4 · 渲染层
`squirclePath` + `fill/strokeSquircleNode` + 三图层接线 + 独立配色。
DoD：画布上 `lineTo` ×72 证明超椭圆在绘制；**与方块共用同一尺寸盒**。

## T11.5 · 设置层
`nodeSquircleColor` + `nodeSquircleExponent`（默认 3）+ 面板新行 + `.swatch-squircle`。
DoD：指数可调、持久化、**不随缩放变化**；色块与其它色块同尺寸。

## T11.6 · 交互
普通双击三档循环 + Shift+双击直达 + 撤销标签（14 语言）。
DoD：两种手势的**全部切换序列**都有断言（状态位 + 几何双重校验）。

## T11.7 · 验证与文档
单元测试、8801 画布/面板核实、e2e 全量、ADR-0009、台账、AGENTS 判例速查。
DoD：全部通过并记账。
