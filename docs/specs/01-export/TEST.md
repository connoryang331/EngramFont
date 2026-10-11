# R1 · 测试验收与回归

## 单元测试（test-py/test_exportmanager.py，pytest）
| ID | 前置 | 步骤 | 期望 |
|---|---|---|---|
| UT1.1 | filesystem 工程 | getSupportedExportFormats() | ["ttf","otf","woff2"] |
| UT1.2 | MicroTon 工程 | exportAs ttf → 读产物 | glyphOrder == 源；GSUB 存在 |
| UT1.3 | 同上 | 检查 'ed' 字形 | 含 e.initia/d 组件或展平轮廓，bounds>0 |
| UT1.4 | 空工程 | exportAs ttf | 成功出空字体，不崩溃 |
| UT1.5 | format="abc" | exportAs | ValueError |
| UT1.6 | 只读 backend | exportAs | 400 语义错误 |

## E2E（Playwright，e2e/export.spec.mjs）
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | 打开编辑器 → File 菜单 | Export As 列出 ttf/otf/woff2 |
| E2E-2 | 点 Export As ttf | download 事件，文件头 00010000 |
| E2E-3 | 导出 MicroTon 工程 | 下载后 shape("ton")==1 字形 |
| E2E-4 | 导出期间点画布 | 编辑仍响应（不阻塞） |

## 回归矩阵
| 项 | 断言 |
|---|---|
| 编辑 | pen/point 工具行为不变 |
| 保存 | 字形修改自动保存正常 |
| 性能 | 不导出时零开销（惰性初始化） |
| 品牌 | 菜单/对话框文案为 engramfont-* 体系 |

## 对照基准
meshfont 行为基准与本地克隆启动见 [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md)（端口 8124；连字/proof 行为逐项对照）。

## A/B 对比验收（R1 升级：与 meshfont 导出语义等价）
| ID | 步骤 | 期望 |
|---|---|---|
| AB-1 | 同一 MicroTon 工程分别从 8124/8800 导出 TTF | ttx glyf：glyphOrder 一致、每字形轮廓坐标差 ≤1 单位 |
| AB-2 | name/OS2 表 | family/style/usWeightClass 一致 |
| AB-3 | GSUB | liga lookup 存在且 "ton" shaping == 1 字形（两份产物一致） |
| AB-4 | 安装测试 | 系统安装后任意软件 "advanced" 连体三组生效 |
| AB-5 | WOFF2 | 解包后 glyf 与 TTF 一致 |
| AB-6 | 渲染对比 | 同文本同字号渲染像素 diff < 阈值 |
