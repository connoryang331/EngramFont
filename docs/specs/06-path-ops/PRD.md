# R6 · 路径操作工具集 · 需求文档（PRD）

## 背景
meshfont 编辑器工具栏有 soften curves / straighten / make circle 等路径操作；
R3 键盘 Dock 的绿滑块（锚点增减）也是同族能力。Fontra 只有曲率类型转换
（cubic⇄quadratic），缺这组几何操作。四者本质同族：**基于选中点/段的路径变换**，
应建一个统一模块。

## 目标
- 新增统一路径操作模块（纯前端），提供四个操作：
  1. **straighten**：选中曲线段拉直为直线
  2. **soften**：选中尖角点软化（插圆滑过渡段，参数化）
  3. **make circle**：选中闭合轮廓正圆化
  4. **锚点密度**（R3 绿滑块底层）：沿路径插值加点 / 按容差抽稀删点
- 全部接入 Fontra 现有 selection 模型与 undo 体系
- 编辑器工具栏出现对应按钮；Dock 绿滑块消费密度操作

## 用户故事
- 我选中一段曲线点 Straighten → 曲线变直线（历史可撤销）
- 我选中一个尖角 → 拖 Soften 滑块 → 角逐渐圆滑
- 我拖 Dock 绿滑块 → 字形控制点加密/简化

## 非目标
- 布尔运算（Fontra 已有）
- 网格形变（另案）
- 偏移/加粗（letter thickness，P2 另案）

## 验收标准（概览）
- 四操作在选中态可用、可撤销、暗色正常
- soften/straighten 往返不丢点序；密度滑块极端值不崩

## 相邻能力盘点：shape 绘制工具族（查证 2026-10-11）
meshfont 工具栏 shapes 菜单：Rectangle/Ellipse/Polygon/Star/Line。
Fontra 的 `edit-tools-shape.js` 已有 **ShapeToolRect（rect/square）+ ShapeToolEllipse（ellipse/circle）**——
框架（拖拽/预览/提交）现成，扩展=实现 `getUnpackedContours(x,y,w,h)` 几何函数：

| 形状 | 缺口 | 公式要点 | 估时 |
|---|---|---|---|
| Polygon（N 边，默认 6） | ✗ | 正多边形顶点：angle=2πi/N，外接圆半径=min(w,h)/2 | 0.25d |
| Star（N 角，内外比可调） | ✗ | 交替半径 R/r 的 2N 顶点星形 | 0.25d |
| Line（开放线段） | ✗ | 两点线段，isClosed=false | 0.25d |

→ 合并进本需求的形状扩展批次（与 path-ops 同批实施，≈0.75d），注册进同一工具下拉。
