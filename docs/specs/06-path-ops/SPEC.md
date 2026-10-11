# R6 · 技术规范（SPEC）

## 1. 架构
- 新模块 `src-js/views-editor/src/path-ops.js`：全部几何算法（纯函数，输入选中字形数据，输出新字形数据）
- 接入：editor.js 注册 4 个 action（照 convert-curves-to-cubic 同款）+ keyboard-dock 绿滑块调用密度函数
- 变更提交：走 Fontra 现有 transaction/undo（编辑操作与画布拖拽同通路）

## 2. 算法规范
### straighten（拉直）
- 输入：选中的 on-curve 点对（其间含 off-curve 段）
- 变换：删除段内全部 off-curve 点，段类型改 line
- 约束：保持点序与前后段不变；qcurve/cubic 同处理

### soften（软化）
- 输入：选中的 sharp on-curve 点（角点）
- 变换：角点拆为两个 on-curve 点（沿相邻段方向各退 d），之间插入 cubic 段
  （控制点沿原段方向，参数 d/radius 可调）；两侧邻点 smooth 约束保持
- 边界：段长不足 d 时自动减半；极短段跳过

### make circle（正圆化）
- 输入：选中的闭合轮廓
- 变换：重排为标准 4-on-curve + 8-off-curve 圆（中心=bounds 中心，半径=半短边，可选内切/外接）
### 锚点密度（绿滑块底层）
- add：沿选中段按 t 均匀分割（de Casteljau），新增 on-curve 点
- reduce：容差抽稀——删 off-curve 使曲线偏差 ≤ tolerance（先简单实现：按段均匀删，P2 精细化）
- 滑块映射：值域线性映射到密度档位

## 3. 文件清单
| 文件 | 操作 |
|---|---|
| `src-js/views-editor/src/path-ops.js` | 新增（算法纯函数） |
| `src-js/views-editor/src/editor.js` | 修改（4 个 action 注册） |
| `src-js/views-editor/src/keyboard-dock.js` | 修改（绿滑块对接） |
| `src-js/views-editor/assets/editor.css` | 修改（按钮/滑块样式） |

## 4. 错误处理矩阵
| 场景 | 行为 |
|---|---|
| 未选中/选中为组件 | 按钮禁用（canConvert 同款条件机制） |
| 段过短/单点轮廓 | 操作跳过该段，不崩溃 |
| reduce 极大容差 | 结果 ≥2 点保底 |

## 5. a11y/主题
- 按钮走 action 注册（键盘可达）；i18n 键齐全；颜色走令牌
