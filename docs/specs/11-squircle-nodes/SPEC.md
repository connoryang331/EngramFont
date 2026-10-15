# R11 · 技术规范（SPEC）

## 数学核心（`src-js/fontra-core/src/path-curvature.js`，新增文件）

三次贝塞尔 `B(t)` 的端点导数：

```
B'(0)  = 3(P1-P0)        B''(0) = 6(P2-2P1+P0)
B'(1)  = 3(P3-P2)        B''(1) = 6(P3-2P2+P1)
```

带符号曲率 `k = (v × a)/|v|³`；**曲率向量** `κ⃗ = k · leftNormal(v)`（指向曲率中心，
不是沿切线——沿切线算出来的东西跨节点不可比）。

G2 ⟺ `κ⃗_left == κ⃗_right`。把两侧都朝**离开节点**的方向取向，G1 成立时切线分量已相等，
于是 G2 退化为一个标量方程 `k_L = k_R`。

**闭式解**：令 `X = P - a·n`、`Y = P + b·n`（`n` = 单位**前进**切线，`a,b` = 两侧手柄长）：

```
k_L = (2/3)·cross(n, hA-P)/a²      k_R = (2/3)·cross(n, hC-P)/b²
G2  ⟺  b/a = sqrt(C_/A_),   A_ = cross(n,hA-P),  C_ = cross(n,hC-P)
```

- **尺度自由**：曲率 ∝ 1/a²，G2 只定**比值**；实现取 `a+b` = 原手柄长之和（改动最小）。
- **可行性**：要求 `A_·C_ > 0`，即两侧**同向弯曲**；异向弯曲（拐点）时 G2 在 G1 下
  **数学不可能**，返回 `infeasible`。
- **"节点移动"**：本解**不需要**移动节点（Glyphs 另会重优化切线方向，属可选增量）。

**直线↔曲线**：直线曲率恒为 0，故 G2 要求曲线侧在节点处曲率也为 0 ⟺

```
line→curve:  curve[1] = (curve[0] + curve[2]) / 2
curve→line:  curve[2] = (curve[3] + curve[1]) / 2
```

⚠ **关键结论**：**不能给直线侧"倒圆角"**——在直线端点强制零曲率会把圆角塌回直线。
零曲率必须落在**曲线侧**。另有 `lineToCurveRoom()` 报告"直线是否够长"。

> 该模块由独立子任务推导实现，自带 138 条断言；本仓**另行独立复跑确认通过**后才接入。

## 数据层（`src-js/fontra-core/src/var-path.js`）

- 新增 `static SQUIRCLE_FLAG = 0x10`，位于 `POINT_TYPE_MASK(0x07)` **之外**
  （与 `SMOOTH_FLAG = 0x08` 同构：是 on-curve 的注解，不是曲线类型）；
- squircle 点**同时**带 `SMOOTH_FLAG`（G1 蕴含于 G2），`getPoint()` 优先判
  `SQUIRCLE_FLAG`，返回 `{smooth: true, squircle: true}`；
- `setPointType(idx, type, smooth, squircle)`、`packPointType(type, smooth, squircle)`、
  `packContour` 同步支持。

## 几何层（`src-js/fontra-core/src/path-functions.js`）

- `collectSegmentSide(path, pointIndex, direction)`：把路径点翻译成求解器的
  `[far, farHandle, nodeHandle, node]` 段模型。一侧可有 0/1/2 个 off-curve；
  缺手柄时按 1/3 处补（使该侧成为直线，曲率 0 —— 正是求解器要的 "line" 情形）。
- `applySquircleAtPoint(path, pointIndex)`：调 `makeSuperSmooth` 求解并回写。
  - 回写**不取整**：整数取整会破坏解（实测曲率跳变 8.674e-19 → 6.4e-5），
    而 Fontra 原生支持小数坐标（拖拽节点本就产生小数）。
  - **插入限制**：只在**曲线侧**插入缺失手柄。直线侧插手柄会弯掉本应笔直的段、
    并把节点挤走（实测节点位移、节点变成手柄）。
- `makeSquircle(path, pointIndices, force)`：**升格**语义（不是开关）——已是 squircle 的点原样不动（幂等）；
  - 关：只清 `SQUIRCLE_FLAG`（保留 smooth）；
  - 开：**先求解、成功才落标志**。不可行时**还原点类型与几何**——
    否则会显示超椭圆图标而几何并非 G2，等于图标撒谎；
  - 多点时按**绝对索引降序**处理（插入会使后面的索引偏移）。

## 渲染层（`src-js/views-editor/src/visualization-layer-definitions.js`）

- `squircleHalfExtent(nodeSize) => nodeSize / 2`：超椭圆**内接于角点方块的同尺寸盒**
  （a squircle is a rounded square）。**不用等面积**——等面积会让它在 n=3 时只占盒子的
  58%，比方块明显小一圈（用户当场指出）。
- `squirclePath(context, pt, nodeSize, exponent)`：`|x/a|^n + |y/b|^n = 1` 的
  参数化折线（72 段），`x = sign(cos t)·|cos t|^(2/n)`；
- `fillSquircleNode` / `strokeSquircleNode` 导出；`fillNode`/`strokeNode` 在
  `pt.squircle` 分支调用，颜色用 `squircleColor`（`nodeTypeColors` 新增，亮 #D6336C / 暗 #F472B6（玫红，与 smooth 的紫、corner 的琥珀、handle 的灰都拉开色相））；
- 指数经 `glyphParameters` 下发，**不走 `screenParameters`**——后者会被
  `buildLayers()` 按缩放因子整体相乘，指数会随缩放变形（实测 3 → 3.92 @1.31x）。

## 设置（`theme-settings.js` + `panel-theme-settings.js` + `simple-settings.js`）

- 模型键：`nodeSquircleColor`（默认 `#D6336C`）、`nodeSquircleExponent`（默认 **3**）；
- 面板新增一行 `Squircle node` = 色块 + 指数滑轮（1–8，步长 1）；
  **无独立 size**（沿用统一 `nodeSize`）；
- `.swatch-squircle` 的 `clip-path` 由 `squircleClipPath(exponent)` **内联生成**
  （指数可变，CSS 静态多边形做不到），与画布同 72 步采样、**填满 1.7em 盒子**，
  与方形/圆形/眼形色块同尺寸。

## 交互（`edit-tools-pointer.js`）

**普通双击 = 三档循环** `corner → smooth → squircle → corner`（`advanceNodeKind`）；**Shift+双击 = 直达 squircle**，在 squircle 上幂等（不降级）；降格走普通双击（`squircle --dbl--> corner --dbl--> smooth`）。注意普通双击**不再自逆**，且 smooth→squircle 会真的弯轮廓；
撤销标签 `edit-tools-pointer.undo.toggle-squircle`，14 个语言文件已补。

## 涉及文件

| 文件 | 性质 |
|---|---|
| `fontra-core/src/path-curvature.js` | 新增（数学核心） |
| `fontra-core/src/var-path.js` | 新 flag + 读写 |
| `fontra-core/src/path-functions.js` | `makeSquircle` + `advanceNodeKind` + 适配层 |
| `fontra-core/src/theme-settings.js` | 两个新模型键 |
| `fontra-webcomponents/src/simple-settings.js` | `squircleClipPath` + `.swatch-squircle` |
| `views-applicationsettings/src/panel-theme-settings.js` | 新设置行 |
| `views-editor/src/visualization-layer-definitions.js` | 超椭圆图标 + 图层接线 |
| `views-editor/src/edit-tools-pointer.js` | 双击循环 / Shift+双击直达 |
| `fontra-core/tests/test-squircle.js` | 新增测试 |
| `fontra-core/assets/lang/*.js` | 14 个语言文件补撤销词条 |
