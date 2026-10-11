# EngramFont · 贴片清单（fork 纪律）

> 黄金法则：**所有前端改动做在 `src-js/` 源里**。
> `src/fontra/client/` 是构建输出目录（webpack destination），会被 `npm run bundle` 覆盖——改它等于白改。
> 改动模型：新增文件优先（零上游冲突）> 一行注册 > 原文件小改。避免碰 `canvas-controller.js` / `scene-model.js` 等核心渲染文件。

## 已应用贴片

### P1 · 品牌（commit 82c4499）
| 文件 | 改动 |
|---|---|
| `src-js/fontra-core/src/fontra-menus.js` | 应用菜单标题 `Fontra` → `EngramFont` |
| `src-js/projectmanager-filesystem/landing.html` | `<title>` → EngramFont；加 SVG favicon link |
| `src-js/views-editor/editor.html` | `<title>` → `EngramFont — Glyph Editor`；favicon |
| `src-js/views-fontinfo/fontinfo.html` | 同上 |
| `src-js/views-fontoverview/fontoverview.html` | 同上 |
| `src-js/views-applicationsettings/applicationsettings.html` | 同上 |
| `src-js/fontra-core/assets/images/fontra-icon.svg` | 内容替换为 EngramFont "E" 标（蓝底 #0666ee 白 E，文件名不变 = 零引用改动） |

### 待办贴片（按优先级）
- P2 · UI 界面字体替换（`fontra-core/assets/` 里的 Inria Sans woff2 → engram 品牌字体）
- P3 · 暗色主题色板微调（core.css 的 dark 变量区，只改变量值）
- P4 · About/Server Info 面板品牌文案（views-applicationsettings）

## 日常
- 启动：`start-fontra.bat`（bundle-watch + server，端口 8000）
- 测试字体目录：`E:\engram-dev\fontra-test-fonts`
- 跟上游同步：`git remote` 仍指向 fontra/fontra；定期 `git fetch origin && git rebase origin/main`（贴片越收敛冲突越小）
