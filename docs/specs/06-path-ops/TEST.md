# R6 · 测试验收与回归

## 单元测试（纯函数几何断言）
| ID | 用例 | 期望 |
|---|---|---|
| UT6.1 | straighten：含 2 off-curve 的 cubic 段 | 段变 line，off-curve=0，端点不变 |
| UT6.2 | soften：直角点 | 拆为 2 on-curve + cubic 段，邻点 smooth |
| UT6.3 | make circle：任意闭合轮廓 | 4 on-curve 均布，bounds 中心对称 |
| UT6.4 | add：cubic 段 t=0.5 | 分割点在曲线上，两段形状不变 |
| UT6.5 | reduce：容差 0 | 不删点；容差大 | 段数减少且偏差 ≤ 容差 |
| UT6.6 | 极端：单点轮廓/组件字形 | 跳过不崩溃 |

## E2E
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | 选中曲线段 → Straighten | 画布直线化，undo 恢复 |
| E2E-2 | 选中角点 → Soften 滑块拖动 | 实时圆滑过渡 |
| E2E-3 | Dock 绿滑块拖动 | 控制点数变化，undo 正常 |
| E2E-4 | 暗色/未选中态 | 按钮禁用、主题正常 |

## 回归
| 项 | 断言 |
|---|---|
| 原有编辑 | pen/point 拖拽/undo 不受影响 |
| convert-curves-to-cubic/quadratic | 原曲率转换正常 |
| 性能 | 大字形（100+ 点）操作 <100ms |
