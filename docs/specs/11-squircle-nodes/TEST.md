# R11 · 测试验收与回归

需求：[PRD.md](./PRD.md) ｜ 实现：[SPEC.md](./SPEC.md) ｜ 决策：ADR-0009 ｜ 台账：ENGRAM-CHANGES「R11-T11.1」

## 一、数学核心（子任务自带断言，本仓独立复跑）

`path-curvature.js` 自带 138 条断言的测试，**本仓在接入前独立跑过确认通过**（不轻信子任务报告）：

```
T1 symmetric: before jump 0.000e+0 after 0.000e+0 ratio 1
T2 asymmetric: G2 ratio 0.707107 sqrt target 0.707107 before jump 3.125e-3 after 8.674e-19
T3 line-curve: before jump 4.800e-3 after 0.000e+0 room ok: true
T3b curve-line: before 2.910e-4 after 0.000e+0
4e (near-opposite) status: infeasible
===== RESULTS =====  pass 138 fail 0
```

## 二、本仓集成测试（`src-js/fontra-core/tests/test-squircle.js`，25 条断言）

直接测**真实路径模型**里的曲率是否连续，而不只是"标志位被设置"：

| ID | 用例 | 断言 | 结果 |
|---|---|---|---|
| T1 | 非对称 curve↔curve 转 squircle | 曲率跳变 3.125e-3 → **8.674e-19** | ✅ |
| T1 | `getPoint()` | 返回 `smooth:true, squircle:true` | ✅ |
| T2 | 手柄比值 | `0.707107 == sqrt(C_/A_)` | ✅ |
| T3 | 关闭 squircle | 清标志、仍是 smooth | ✅ |
| T4 | line↔curve | 连接处曲率跳变 **0** | ✅ |
| T5 | 2 点轮廓 | 返回 `undefined`、路径**零改动** | ✅ |
| T5 | 重合邻居 / 反向弯曲 | 坐标无 NaN/∞；不可行时**不置标志、不改几何** | ✅ |
| T6 | 序列化往返 | squircle 标志与 `getPoint` 均保持 | ✅ |

```
===== RESULTS =====  pass 25 fail 0   ALL TESTS PASSED
```

## 三、画布渲染（8801 隔离实例，**不碰 8800 用户实例**）

用**录制真实图层 `draw()` 调用**的方式判定（比颜色取样可靠）：

| 图标 | 路径构造特征 | 实测 |
|---|---|---|
| corner 方形 | `strokeRect` | 4 次 |
| smooth 眼形 | `quadraticCurveTo` | 2 次 |
| **squircle 超椭圆** | **`lineTo` × 72 + `closePath`** | **72 次** ✅ |

尺寸（glyph units，scaleFactor 0.903）：

| 图标 | 绘制 extent | 与方块比 |
|---|---|---|
| corner 方形 | 8 × 8 | — |
| **squircle** | **8 × 8** | **1.000 × 1.000** ✅ 共用同一尺寸盒 |
| smooth 眼形 | 11.68（长轴 1.46 × size） | — |

**并确认 `squircleExponent = 3`**——在 scaleFactor 0.903 下未被缩放
（修复前为 3.92，系数即缩放因子）。

## 四、设置面板

| 色块 | 绘制尺寸（css px） | 填充率 |
|---|---|---|
| Smooth node（眼形） | 22.66 × 15.95 | 99.8% × 70.3% |
| **Squircle node** | **22.66 × 22.66** | **99.8% × 99.8%** |
| Corner node（方形） | 22.66 × 22.66 | 99.8% × 99.8% |
| Handle（圆形） | 22.66 × 22.66 | 99.8% × 99.8% |

→ 三个色块**同尺寸对齐**；Squircle 行 = 色块 + 指数滑轮（默认 3），**无独立 size**。

> ⚠ 方法学教训：早先"对齐已验证"是**测错了对象**——量的是 `input` 盒子的 bounding box
> （恒为 1.7em），而非实际绘制的形状。改为解析 `clip-path` 多边形的 extent 才测到真问题。

## 五、回归

| 项 | 断言 | 结果 |
|---|---|---|
| fontra-core 套件 | `npm test` 1215 passing / 0 failing | ✅ |
| 本仓 squircle 测试 | 25/25 | ✅ |
| 全量 e2e | `npx playwright test` | ✅ |
| 控制台 | 无 pageerror / console.error | ✅ |
| 手势状态机 | 3 状态 × 2 手势 = 6 个单步切换 + 12 条多步序列，全部断言（状态位**且**几何） | ✅ |

## 六、修复过的真实 bug（均为本次开发中当场发现）

| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| 1 | `Cannot access 'K' before initialization`（整页白屏） | `SQUIRCLE_EXPONENT_DEFAULT` 声明在 2215 行，却在 1394 行**模块加载期**被图层定义引用 → TDZ | 声明上移到 import 之后 |
| 2 | `computeSmoothTangents is not defined`（节点全不画） | 一次块替换误删了 `computeSmoothTangents`/`eyePath`/`fillEyeNode`/`strokeEyeNode`（本会话新增，git diff 净变化为零，看不出） | 按原文重建并核验符号表 |
| 3 | 节点被挤走、on-curve 点变成手柄 | 给**直线侧**也插了手柄 | 只允许在曲线侧插入 |
| 4 | 曲率只降到 6.4e-5（而非 1e-19） | 回写坐标 `Math.round` 破坏了解 | squircle 回写不取整 |
| 5 | 指数随缩放变形（3 → 3.92） | 指数放在 `screenParameters`，被 `buildLayers` 乘以缩放因子 | 改走 `glyphParameters`（原样透传） |
| 6 | 超椭圆图标比方块小一圈 | 误把「等面积」规则用于图标（n=3 时只占盒子 58%） | 改为与方块**共用同一尺寸盒** |
| 7 | `start-EngramFont.bat` 重启报 `Errno 10048` | 脚本不停旧实例；且旧服务仍在应答 `/serverinfo`，**就绪轮询会立刻成功骗过人** | 脚本加幂等 taskkill；验证改为**看 PID 是否变化** |
| 8 | 上述 taskkill 加了却没生效 | `echo` 里**未转义的 `)`** 提前闭合 `for ... do (...)` 块，`taskkill` 被静默丢弃 | echo 去掉括号 |

## 七、测量脚本（可复现）

- `qa/verify-squircle-canvas.mjs` — 画布像素/绘制调用核实
- `qa/verify-squircle-size.mjs` — 色块与画布图标 extent 测量
- `qa/verify-squircle-panel.mjs` / `verify-squircle-exponent.mjs` — 面板与指数
- `src-js/fontra-core/tests/test-squircle.js` — 曲率连续性真值测试
