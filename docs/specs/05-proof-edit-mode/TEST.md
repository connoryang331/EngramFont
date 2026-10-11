# R5 · 测试验收与回归

## 单元测试
| ID | 用例 | 期望 |
|---|---|---|
| UT5.1 | canvasMode 读写/持久化 | localStorage 同步 |
| UT5.2 | 预设常量表完整性 | 5 预设非空且含断言行 |

## E2E（e2e/proof-edit-mode.spec.mjs）
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | proof 键 | 导线层宽度==整行（canvas 像素采样或 SVG 快照） |
| E2E-2 | edit 键 | 工具恢复、选择可用 |
| E2E-3 | 预设点击 | 文本内容断言 |
| E2E-4 | reload | 模式保持 |
| E2E-5 | 暗色主题 | 两模式截图对照 |

## 回归矩阵（重点：edit 态零回归）
| 项 | 断言 |
|---|---|
| 字形编辑 | pen 拖点/选字形/删点 全部正常 |
| 连字 shaping | MicroTon "ton"==1 字形、"advanced"==3 字形 |
| 多行排版 | 换行 + 行高调整渲染不变 |
| 缩放/平移 | 两模式下均可用 |
| 性能 | 模式切换 <100ms；无内存泄漏（反复切换 20 次） |

## 对照基准
meshfont 行为基准与本地克隆启动见 [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md)（端口 8124；连字/proof 行为逐项对照）。

## 对照工具（执行会话用）
- `demo-liga/probe-proof-keys.mjs`：proof 工具条三按钮 + 下拉菜单的**行为采集脚本**（已写好）——
  执行 R5 时先跑它，采集 meshfont 的 kern/space/proof 实际文本与菜单结构，再核对实现。
  （文档阶段按用户指令未运行。）
