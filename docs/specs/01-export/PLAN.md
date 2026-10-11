# R1 · 计划与任务拆分

| # | 任务 | 产出 | 估时 | 依赖 |
|---|---|---|---|---|
| T1.1 | ExportManager 骨架 + 注入 PM/__main__ | File 菜单亮起（ttf/otf/woff2） | 0.5d | — |
| T1.2 | TTF/OTF 编译（字形展平 + FEA→GSUB） | 可下载的 TTF/OTF，字形与编辑器一致 | 1d | T1.1 |
| T1.3 | WOFF2（brotli 依赖） | woff2 产物 | 0.5d | T1.2 |
| T1.4 | 前端下载接线 + 导出反馈 UI | 点击菜单→浏览器下载 | 0.5d | T1.2 |
| T1.5 | 家族导出（多 source 循环） | Light/Regular/Bold 多文件 | 1d | T1.2 |
| T1.6 | proof 打样页（P2 缓） | — | P2 | — |

合计 ≈ 3.5d（不含 P2）
