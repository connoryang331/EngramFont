# R4 · 测试验收与回归

## 单元测试
| ID | 步骤 | 期望 |
|---|---|---|
| UT4.1 | new-font name="ok-1" template=latin-kernel | .fontra 生成，62+ 字形，codePoints 正确 |
| UT4.2 | name 含 `/` 或空 | 400 |
| UT4.3 | 重名 | 409 |
| UT4.4 | template=unknown | 400 |

## E2E（e2e/new-font.spec.mjs）
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | landing → 新建 → latin-kernel → 打开 | 画布可见种子字形且可拖点编辑 |
| E2E-2 | 空模板 | 打开空工程不崩 |
| E2E-3 | 项目列表刷新 | 新工程在列 |

## 回归
| 项 | 断言 |
|---|---|
| 项目列表 | 现有工程不受影响 |
| CLI | `fontra new` 行为不变 |
| 导入（R2） | 共存无冲突 |

## 对照基准
meshfont 行为基准与本地克隆启动见 [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md)（端口 8124；连字/proof 行为逐项对照）。
