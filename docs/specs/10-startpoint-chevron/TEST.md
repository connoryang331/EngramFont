# R10 · 测试验收与回归

需求：[PRD.md](./PRD.md) ｜ 实现：[SPEC.md](./SPEC.md) ｜ 台账：ENGRAM-CHANGES「R10-T10.1」

## 一、方向正确性（Playwright，**8801 e2e 隔离实例**，遵守 BUG-006 硬约束）

构造 4 条朝向各异的开放轮廓（起始点分别为右/左/上/下），用应用自身的
`canvasController.canvasPoint()` 算出起始点屏幕坐标，逐个**裁剪特写截图**：

| ID | 用例 | 期望 | 结果 |
|---|---|---|---|
| TC-1 | 起始点方向朝右 | 显示 `>`（顶点朝右） | ✅ `qa/chev-right.png` |
| TC-2 | 起始点方向朝左 | 显示 `<`（顶点朝左） | ✅ `qa/chev-left.png` |
| TC-3 | 起始点方向朝上 | 显示 `∧` | ✅ `qa/chev-up.png` |
| TC-4 | 起始点方向朝下 | 显示 `∨` | ✅ `qa/chev-down.png` |
| TC-5 | 斜向（45°/135°） | 箭头随方向旋转 | ✅ `qa/chevron-shapes.png` |
| TC-6 | 无圆弧残留 | 起始点处不再出现圆弧 | ✅ 全部截图 |

## 二、间隙恒定（用户追加要求：节点尺寸变大时间隙不变）

**这是首轮遗漏的验证项**：首版只验证了方向，箭头半径写死 9 而节点尺寸可调到 24+，
导致箭头压在节点图标上（用户截图指出）。修复后必须**量化**间隙。

方法：用真实图层代码 `draw()` + 记录型 context 取出箭头的实际腿端坐标，
再对节点轮廓（方形/眼形按 `fillSquareNode`/`eyePath` 的公式密集采样 3000 点）
求**可见最小间隙**。轮廓朝右，故箭头局部坐标系 == 字形坐标系。

| 节点形状 | size 6 | 8 | 12 | 16 | 24 | 32 | 48 | spread |
|---|---|---|---|---|---|---|---|---|
| corner（方形） | 7.04 | 6.67 | 6.54 | 6.54 | 6.54 | 6.54 | 6.54 | 0.50 |
| smooth（眼形） | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | 9.24 | **0.000** |

- 眼形**完全恒定**（spread 0.000）；方形在 size ≥ 12 后恒定 6.54；
- 方形 size 6/8 的 0.3–0.5px 偏差来自 V 形腿与方角的几何（腿端是点、方角是直角），
  属亚像素级，肉眼不可辨；
- 结论：**间隙与节点尺寸无关**（要求达成）。

## 三、尺寸联动与统一（用户追加：箭头随 size 变化、三种节点同尺寸）

**要求**：① `>` / `<` 随节点 size 等比缩放；② corner / smooth / handle **同一个 size**，
不允许一大一小；③ 眼形中间饱满，设置页与编辑区一致。

### 3.1 尺寸统一 + 箭头缩放（真实设置路径：localStorage → 重载）

| nodeSize | cornerSize | smoothSize | handleSize | gap | chevronLength | chevronSpread |
|---|---|---|---|---|---|---|
| 4 | 4 | 4 | 4 | **5** | 3 | 2.5 |
| 8 | 8 | 8 | 8 | **5** | 6 | 5 |
| 16 | 16 | 16 | 16 | **5** | 12 | 10 |
| 24 | 24 | 24 | 24 | **5** | 18 | 15 |

- ✅ `corner == smooth == handle` 在所有尺寸成立（**同一尺寸设置**）；
- ✅ `gap` 恒为 5，**不随尺寸缩放**（箭头永不与节点重叠）；
- ✅ 箭头等比：`chevronSpread / (size/8)` 恒为 5。

### 3.2 眼形比例改为眼睛形

| 位置 | 改动 | 验证 |
|---|---|---|
| 编辑区画布 | `halfWidth` 0.34 → **0.58** × size（长宽比 ≈ 2:1） | `qa/chevron-gap-sheet.png`（对比表） |
| 设置页色块 | 新增 `.swatch-eye`：`clip-path: polygon()` 按 `4t(1-t)` 精确采样，盒子 2.6em × 1.31em（与形状同比例） | `qa/panel-node-appearance.png` |

两处共用常量 `EYE_HALF_LEN_FACTOR` / `EYE_HALF_WIDTH_FACTOR`（单一真值源）。

### 3.3 间隙仍恒定（比例改动后复测）

| 节点形状 | size 6 → 48 的可见间隙 | spread |
|---|---|---|
| corner（方形） | 7.04, 6.67, 6.54, 6.54, 6.54, 6.54, 6.54 | 0.50 |
| smooth（眼形） | 9.24 ×7 | **0.000** |

眼形完全恒定；方形 ≥ size12 恒定 6.54（小尺寸 0.3–0.5px 差异来自 V 形腿与方角的几何）。

### 3.4 设置面板外观

`Node appearance` 卡片 = **Node size**（唯一尺寸轮）+ Smooth node / Corner node / Handle
三行颜色（各带 reset）。Smooth 色块为紫色**眼形**、Corner 为琥珀方形、
Handle 为灰色圆形 → `qa/panel-node-appearance.png`。

## 四、视觉证据

- `qa/chevron-gap-sheet.png` — 用**真实图层代码**渲染的放大对比表
  （方形/眼形 × size 8/16/24/32），可直接看到各尺寸间隙一致；
- `qa/chev-right.png` / `chev-left.png` / `chev-up.png` / `chev-down.png` — 四方向特写。

## 四、回归

| 项 | 断言 | 结果 |
|---|---|---|
| 全量 e2e | `npx playwright test` 35/35 | ✅ |
| docs lint | `node docs/lint.cjs` 74 篇 | ✅ |
| 控制台 | 无 pageerror / console.error | ✅ |
| 图层开关 | 其余图层（节点/手柄/路径描边）行为不变 | ✅ |
| localStorage 迁移 | 旧 `nodeSmoothSize` 值写入 `nodeSize`，三个旧键删除 | ✅ |

## 六、测量脚本（可复现）

- `qa/measure-gap-geometry.mjs` — 间隙量测（第二节、3.3 的数据来源）
- `qa/verify-nodesize-real.mjs` — 尺寸统一 + 箭头缩放（3.1，走真实 localStorage 路径）
- `qa/verify-panel.mjs` — 设置面板截图与行结构
- `qa/gap-sheet.mjs` — 生成放大对比表
- `qa/verify-chev-clip.mjs` — 四方向特写
