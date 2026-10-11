# R3 · 测试验收与回归

## 单元测试（vitest，src-js/views-editor/tests/）
| ID | 用例 | 期望 |
|---|---|---|
| UT3.1 | 键位表常量完整性 | 每键有 key/label/action |
| UT3.2 | modifier 状态切换 | alt 态字母键输出大写 glyphName |
| UT3.3 | 折叠持久化 | localStorage 读写 |

## E2E（e2e/keyboard-dock.spec.mjs）
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | 打开编辑器 | Dock 可见，28+ 键 aria-label 齐全 |
| E2E-2 | 点 g | selectedGlyph.glyphName=="g"，画布渲染 g |
| E2E-3 | 点未创建字形 | 创建对话框出现 → 创建后画布显示 |
| E2E-4 | DEL/space | characterLines 变化断言 |
| E2E-5 | proof/edit 键 | canvasMode 切换断言（依赖 R5） |
| E2E-6 | 折叠 → reload | 折叠态保持 |
| E2E-7 | 暗色主题 | 截图对照（无硬编码色值） |

## 回归矩阵
| 项 | 断言 |
|---|---|
| 物理键盘快捷键 | 原有编辑/导航行为不变 |
| 画布编辑 | Dock 展开时 pen/point 工具可正常作用于可视区 |
| 性能 | Dock 静态渲染，canvas 帧率无回退 |
| glyph-search 面板 | 与 Dock 并存不冲突 |

## 对照基准
meshfont 行为基准与本地克隆启动见 [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md)（端口 8124；连字/proof 行为逐项对照）。
