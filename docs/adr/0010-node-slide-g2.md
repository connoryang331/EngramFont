---
Id: ADR-0010
tags: [frontend, canvas, nodes]
Status: accepted
Date: 2026-10-15
---

# G2 解允许沿切线微移节点：滑动解与原地解取代价更小者

## 背景

[ADR-0009](0009-squircle-g2-nodes.md) §2 定了**原地闭式解**：保持节点位置与切线
方向，只调两侧手柄长（`b/a = sqrt(C_/A_)`，绝对尺度取原手柄长之和）。
其 §2「**节点不移动**」与「被否决的方案」里的「实现 Glyphs 的节点位移优化」是同
一条判断：**用户点一下不该看到节点莫名位移**。

但实测把这个判断的前提顶破了。600×400 矩形右上角，plain 双击两次（`qa/measure-cycle.mjs`）：

| 双击 | 节点处曲率 kIn / kOut | 相对跳变 | 轮廓位移 |
|---|---|---|---|
| ① corner→smooth | 4.74e-3 / 7.12e-3 | 33.4% | 手柄新建，直线被掰弯 |
| ② smooth→squircle | 5.64e-3 / 5.64e-3 | 0.000 | **只有 1~2px** |

原地解确实达成了 G2，但它把 33.4% 的跳变压掉的方式是**把 16.5 单位从一侧手柄
挪到另一侧**（199.4→182.9 / 132.9→149.4，总长守恒）——轮廓几乎不动。用户连点四下
后回报：**"smooth 再变 squircle，手柄和线条没有变化"**（截图四联：只有第一下可见）。

而两家在这一步都允许**移动节点**：

- Glyphs：「A star node **moves the effective node** to achieve a smooth curvature
  continuity. ... The **original path** ... shown in gray in the background」；
- FontLab（Harmonize Nodes / Alt-双击）：「This will **move the Smooth nodes** to a
  new position where the curve segments will join G2-smoothly, and **will keep the
  handles where they were**」。

用户明确决定：**"(a) G2 解允许微移节点"**。

## 决策

### 1. `slideNodeForG2()`：节点沿自身切线滑动，手柄原地不动

新增于 `fontra-core/src/path-curvature.js`。目标函数只吃一个标量 `s`（沿切线的
位移），节点取 `P' = P + s·n`，**不旋转切线方向**：

```
f(s) = |kappaIn(P')| - |kappaOut(P')|      // 两侧曲率大小之差
```

求根方式刻意选**确定性**而非随机/迭代启发：

```
1. 在 [-sMax, +sMax] 上等距扫描 65 个采样点，找 f 的符号变化区间 [sLo, sHi]
2. 在该区间上做 60 次二分
3. 收敛后取最后一次符号变化的根；无符号变化 → 不可解（返回 undefined）
```

- **扫描找符号变化 + 二分** ⇒ 同样的输入永远得到同样的 `s`，可断言、可重复
  （实测：重复 Shift+双击后几何指纹 `af15ca02 → af15ca02`）；
- 沿切线 ⇒ 节点的**两侧切线方向不变**，于是接缝不会因为"修 G2"而扭转观感。

### 2. `makeSuperSmoothWithNodeDrift()`：两个解取代价更小者

```
costInPlace = |hA_solved - hA| + |hC_solved - hC|     // 两个手柄的位移总和
costSlide   = |s| * driftWeight                       // 默认 driftWeight = 1
选择 cost 更小者；平局保留原地解
```

`driftWeight` 默认 **1**，含义是"移动 1 单位节点 ≡ 移动 1 单位手柄"。平局保留原地
解是有意的：**已经被原地解修得够好的接缝，节点不会被推**——用户放在那里的位置不该
因为一次无关紧要的优化而漂走。

### 3. 边界条件

- **位移窗口** `|s| ≤ slideFactor × min(两侧弦长)`，`slideFactor = 0.1`；
  超过 10% 的位移已经不是"微移"，而是重新排版；
- **手柄不得塌到节点上**：`|s| < 0.95 × 各自手柄长`，否则手柄长度为 0 的退化段会让
  曲率公式除零、并把段变成尖点；
- 窗口内无符号变化 ⇒ **不可解**，交由原地解或直接拒绝（见 §5）。

### 4. 拐点救不了（曾是一个真 bug）

沿切线滑动**不改变弯曲方向**：`cross(n, 远端控制点 − P)` 在 `P → P + s·n` 下不变
（`n` 与被减向量同时平移），所以两侧反向弯曲的拐点无论怎么滑都是**曲率向量跳跃**，
只是大小可能相等。

滑动求解器最初**只对齐曲率大小**，于是把"等大反向"的尖点"修"成了假 G2：两侧
|k| 相等 → 落 `SQUIRCLE_FLAG` → 图标显示超椭圆，而几何是一个尖点。这比无解更糟。
因此拐点**直接拒绝**。

### 5. 求解器层再加一道闸

`makeSuperSmoothCurveToCurve` 在返回 `ok` 之前检查两侧**曲率向量同向**：

```
dot(vecL, vecR) > 0        // vecL / vecR = 各侧曲率向量（不只是大小）
```

`A_·C_ > 0` 是**必要不充分**条件：尖点（等大反向）能通过它，只有向量点积能拦下。
这条闸放在求解器而不是手势层，是为了所有调用方都受益。

### 6. 线↔曲线接缝不给 squircle

> ⚠ 本节描述的是**当前行为**，将由 [ADR-0012](0012-squircle-line-curve-derived-transition.md)
> 替换：线↔曲线改为在**渲染与导出时派生**一段 G2 过渡（Glyphs 雨滴点），不再作为终点拒绝。
> 下面"互斥"的推导依然成立——正因为单段 cubic 装不下，派生才必须新增点。

直线侧曲率恒为 0，G2 要求曲线侧在节点处曲率也为 0 ⟹ 该侧手柄取**中点**；而中点
方向不是直线方向 ⟹ **G1 与 G2 在单对三次曲线段上互斥**。滑动节点也救不了（滑动
不改变弯曲方向，只是把中点约束推到别处）。

Glyphs 靠"移动有效节点 + 导出时新增小灰点"绕过这个互斥，本仓不实现该机制
（[PRD 非目标](../specs/11-squircle-nodes/PRD.md)）。因此**诚实结果是不给标志、
且一个坐标都不写**——保持 [ADR-0009](0009-squircle-g2-nodes.md) §4 的"图标不得撒谎"。

## 理由

1. **原地解的"不动节点"是手段不是目的**：目的是让接缝真的 G2。原地解做到了 G2，
   但代价是把全部修正量塞进手柄，轮廓几乎不动——用户视角等于"没反应"。
2. **滑动 + 手柄不动是两家共同的选择**：FontLab 明确写"move the nodes ... keep the
   handles"，Glyphs 明确写"moves the effective node"（并把原路径留作灰色背景）。
   两者都**不旋转切线**，与本决策一致。
3. **取代价更小者 ⇒ 永不打扰已经好的几何**：滑动的收益是"轮廓变化更明显"，代价是
   "节点被推"。用代价函数把两者放在同一标尺上，而不是靠 if 判断拍脑袋。
4. **拐点必须硬拒绝**：滑动的自由度只有 1 维，而拐点的病根在方向上，自由度不够。
   允许"差不多"就会产出撒谎的图标。
5. **向量闸而非标量闸**：`A_·C_ > 0` 放过尖点这件事说明，标量条件不足以描述 G2；
   G2 的定义本身就是**曲率向量相等**（等大同向）。

## 被否决的方案

- **把节点当成可自由移动的 2D 搜索**（同时允许转切线）：实测**永不触发**——
  原地解已经把曲率打平（跳变 0.000），2D 搜索找不到比它更好的解；等于写一套永远
  走不到的分支，还要额外处理"切线被旋转后手柄怎么摆"。
- **降级时回滚到原形状**：在手柄共享（一个控制点可能属于邻段）与多级邻居的现实下
  不成立——回滚需要"每段原本是直线还是曲线 + 原始控制点位置"的段级存档，且会静默
  丢弃用户在中间做的编辑。降格语义改由 [ADR-0011](0011-node-kind-state-is-geometry.md)
  正面处理，不在这里做。
- **无条件滑动**（只要原地解不可行就滑）：会把用户精心摆好的节点推走；必须比较代价。
- **对拐点调整手柄长度来"凑"曲率**：等大反向时任何长度组合都还是反向，跳变不减。

## 后果

- 新增 `path-curvature.js` 的 `slideNodeForG2()`；`makeSuperSmooth()` 升级为
  `makeSuperSmoothWithNodeDrift()`（原地解保留为默认路径，2D 搜索不存在）；
- **节点可以在一次 G2 里沿切线移动**（实测 16.499 单位），手柄不动；
- 曲线↔曲线仍精确 G2；拐点拒绝落标志；线↔曲线接缝拒绝落标志；
- [ADR-0009](0009-squircle-g2-nodes.md) §2「节点不移动」**已被本 ADR 修订**为
  "允许沿切线微移，并取代价更小者"；其 §1/§3/§5/§6 不变；
- 降格语义见 [ADR-0011](0011-node-kind-state-is-geometry.md)。

## 验证

- `npm run --workspace src-js/fontra-core test`
  → squircle 测试 **136 pass / 0 fail**（含新增 **T9 节点滑动**）；
  全包 **1215 passing** / 0 failing
- `npx playwright test` → **35/35**
- `qa/verify-squircle-gesture.mjs` → **7/7**
- `qa/measure-cycle.mjs`、`qa/audit-honesty.mjs`（本轮实测脚本，保留作回归证据）
- 实测（600×400 矩形右上角，plain 双击两次）：corner→smooth 后跳变 33.4%；
  smooth→squircle 节点滑 **16.499** 单位到 `(738.33, 611.67)`，两侧曲率
  **5.64e-3 / 5.64e-3**（跳变 0.000），手柄 `(609,741)` / `(844,506)` 分毫未动；
  确定性可重复（重复手势几何指纹 `af15ca02 → af15ca02`）

## 关联

- 前序：[ADR-0009](0009-squircle-g2-nodes.md)（G2 闭式解；§2 由本文修订）、
  [ADR-0006](0006-toggle-smooth-glyphs-convert.md)（转曲 = 直线变真曲线）
- 后续：[ADR-0011](0011-node-kind-state-is-geometry.md)（降格必须改几何）
- 图标语义：[字体设计图例符号系统设计说明.md](../idea/字体设计图例符号系统设计说明.md) §3.2
- 数学核心：`src-js/fontra-core/src/path-curvature.js`；回归测试
  `src-js/fontra-core/tests/test-squircle.js`
- 台账：ENGRAM-CHANGES.md（节点类型手势系列）
