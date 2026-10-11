# R2 · 测试验收与回归

## 单元测试（test-py/test_importfont.py）
| ID | 前置 | 步骤 | 期望 |
|---|---|---|---|
| UT2.1 | Inter-Regular.ttf | 转换 | .fontra glyphMap 字形数一致 |
| UT2.2 | 同上 | 抽 10 字形比对 | PackedPath bounds 容差 ≤0.5 |
| UT2.3 | 含 GSUB 源 | 转换 | features.text 非空 |
| UT2.4 | 损坏文件 | 转换 | 400，不产生半成品目录 |
| UT2.5 | woff2 源 | 转换 | OTFBackend 可读则成功 |

## E2E（e2e/import.spec.mjs）
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | landing 导入 Inter → 打开 | 编辑器字形数一致，编辑 d 并保存 |
| E2E-2 | 重名导入 | 409 提示 |
| E2E-3 | reload | 导入工程仍在列表 |

## 回归
| 项 | 断言 |
|---|---|
| 只读打开 | 不经导入直接 project=TTF 打开行为不变 |
| 项目列表 | 现有工程排序/渲染不变 |

## 对照基准
meshfont 行为基准与本地克隆启动见 [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md)（端口 8124；连字/proof 行为逐项对照）。
