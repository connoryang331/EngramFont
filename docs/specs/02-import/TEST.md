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

## 测试字体资产矩阵（全部已就位）
| 字体 | 路径 | 用途 |
|---|---|---|
| Inter-Regular.ttf（2937 字形，GSUB+kern/GPOS） | fontra-test-fonts/ | 真实字体压测：规模/性能/轮廓保真 |
| MicroTon.ttf（25 字形，含 liga GSUB） | fontra-test-fonts/ | 特性迁移边界测试（GSUB→FEA 不反编译的验证） |
| clone-family-font-Light/Regular/Bold.ttf（144 字形家族） | meshfont-clone/downloads/ | **meshfont 自家导出的往返测试**：导入 meshfont 导出的字体→对比 |
| clone-test-ttf.ttf / origin-test-font.ttf | meshfont-clone/downloads/ | 历史导出对照 |
| Playfair.woff / NotoJP.woff / clone-woff2-test.woff2 | 各处 | 格式覆盖（woff/woff2 读取） |

## 可行性预验证结果（2026-10-11 spike，spike-import-roundtrip.py）
- OTFBackend 读 Inter-Regular.ttf（2937 字形，0.22s）
- 逐字形 writeGlyph → .fontra：**2937 字形 3.1s**（性能充裕）
- 读回：glyphMap 2937 全等 ✓、抽样 20 字形 advance 零偏差 ✓
- **保真边界（两家同类）**：features.text=0、kerning=0——二进制 GSUB/kern 不反编译为 FEA
  （meshfont 的导入同样只保轮廓/度量/映射）；EngramFont 优势：.fontra 的 features.text
  可后续手动/FEA 编辑补特性
- **工程注意**：Fontra 后端写盘是延迟调度——写完必须 aclose/flush 再读；改工程文件前停服务
- 产物：`demo-liga/Inter-Import-Test.fontra`（2937 字形的导入工程，留作 R2 e2e fixture）
