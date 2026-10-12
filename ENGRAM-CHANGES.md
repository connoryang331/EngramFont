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

### R1-T1.5 · 浏览器内导出（2026-10-12 过夜执行）
- 新文件：`src/fontra/filesystem/exportmanager.py`（cubic 源 → Cu2QuPen 出 TTF / 直接 T2CharStringPen 出 OTF（cffLib 装配）/ woff2 flavor；FEA→GSUB 含 *ance backtrack 类自动再生；家族导出按 source 逐层实例化 + usWeightClass）
- 接线：`projectmanager.py` 工厂注入 + setupWebRoutes 委托（2 处单行）；`/exports/` 下载路由（穿越防护 + attachment）
- 前端：`view-controller.js` anchor-click 下载（弹窗拦截免疫）
- 产物目录：`<工程根>/.exports/<ts>/`

### R2-T2.4 · 字体导入 → 可编辑工程（2026-10-12）
- 新文件：`src/fontra/filesystem/importfont.py`（glyphs+cmap/sources+metrics/upem/features/kerning 迁移；Windows 句柄锁 → from None + 后台 unlink 重试）
- 端点：`POST /api/import-font`（multipart，50MB 上限，400/409 矩阵）
- landing：Import font 按钮 + 错误框
- `_iterFolder` 跳过点目录（.exports/.git 不再混入工程列表）

### R5-T5.4 · Proof/Edit 双模式画布（2026-10-12）
- 新文件：`src-js/views-editor/src/canvas-mode.js`（edit⇄proof，localStorage `engramfont-canvas-mode`）
- 新文件：`src-js/views-editor/src/proof-toolbar.js`（5 预设按钮 + 过渡期模式切换 pill）
- scene-model：selectedGlyph getter proof 掩码（isEditing→false）；字形条目带 lineIndex/glyphIndexInLine
- lineMetrics 层：proof 态全行导线（每行首字形画整行 band）；edit 态原样
- 编辑闸门：`_editGlyphOrInstance` proof 早退；`#edit-tools` 隐藏

### R3-T3.8 · 虚拟键盘 Dock（2026-10-12）
- 新文件：`src-js/views-editor/src/keyboard-dock.js`（KEYMAP-VERIFIED v5 键位：导航/DEL=reset 动态默认文本/space/move/view-edit 模式键/紫键锚点⇄导线/alt 移除锚点）
- 双功能滑块：proof=letter-spacing/word-spacing/line-height（sceneSettings 新增 wordSpacing/letterSpacing，LineSetter 消费）；edit=占位（thickness/锚点密度待 R6/P2）
- T3.7 拆分/合并布局（`engramfont-dock-layout`）；T3.8 右键改绑（`engramfont-key-bindings`，DEL/space 锁定）
- 已知缺口：字形键帽预览未做；100% 缩放为可绑定 action（无专属键）

### R3-T3.9 · 功能键替换：单键位多工具（2026-10-12）
- 方向转变：物理键盘拟真不适合本项目，保留键盘布局，把物理按键逐个替换成字体功能键（`DOCK_FN_KEYS` 注册表，逐键替换）
- 首个：按键「6」= 一个键位替换为 Fontra 原生 pointer tools 多工具键——交互与原生工具栏完全一致：
  面图标=当前子工具；快点击=重选当前工具；长按 500ms 或右键=展开子工具选项（pointer / pointer (scaling)）；
  选中后子工具前置（setSelectedTool(id, true)，原生同路径）；点外部 mousedown 或 Escape 收起
- 原生接线：`editorController.setSelectedTool`（与工具栏按钮/快捷键同路径）；原生工具栏切换时 dock 键
  经 MutationObserver(#edit-tools) 同步高亮与面图标；proof 态按功能键先回 edit 模式
- 布局键位影响：仅替换键帽内容，「7」恢复普通字符键；三种布局（arc/straight/merged）自动适用
- 弧形 space 圆角对齐普通按键：SVG stroke 8→12（可视圆角 6px = .kd-key border-radius），seam 侧间隙 +2px 补偿
- 修复：dock 弹层继承 `#keyboard-dock` 的 pointer-events:none → `.kd-fn-options` 显式 auto

### R7-T7.4 · 背景图上下文编辑（2026-10-12）
- Edit image 上下文 action（选中字形有背景图时启用）→ 解锁 + 选中 backgroundImage/0
- 离开选中自动重锁（selection 监听）；全局 Unlock/Lock 菜单项已移除
- selection-info 面板 Replace 按钮（photo-up 图标）：换图保变换/透明度

### R4-T4.4 · 新建字体/模板流（2026-10-12）
- 新文件：`src/fontra/filesystem/newfont.py` + `assets/templates/latin-kernel.json`（62 块状字形，scripts/make-template.py 生成）
- 端点：`POST /api/new-font`（409/400 矩阵）；landing New font 卡；File 菜单 New Font…（新标签页打开，不丢上下文）

### 待办贴片（按优先级）
- P2 · UI 界面字体替换（`fontra-core/assets/` 里的 Inria Sans woff2 → engram 品牌字体）
- P3 · 暗色主题色板微调（core.css 的 dark 变量区，只改变量值）
- P4 · About/Server Info 面板品牌文案（views-applicationsettings）
- P5 · R3 编辑态滑块语义（thickness=轮廓偏移选型；锚点密度=R6）
- P6 · 测试资产隔离：Inter-Regular.ttf 为 CDN 重建替身（原 2937 字形版丢失，现为 latin 子集 518 字形）

## 日常
- 启动：`start-fontra.bat`（bundle-watch + server，端口 8000）
- 测试字体目录：`E:\engram-dev\fontra-test-fonts`
- 跟上游同步：`git remote` 仍指向 fontra/fontra；定期 `git fetch origin && git rebase origin/main`（贴片越收敛冲突越小）

### P1.5 · 启动器（commit b1842ec + 修复）
- `start-EngramFont.bat`：一键直达编辑器（确保 Untitled.fontra 存在 → 起服务于 8800 → 打开 editor.html?project=Untitled.fontra）
- **教训**：bat 文件必须纯 ASCII——中文注释在 GBK 系统上会被 cmd 按 ANSI 解析，UTF-8 多字节序列吞掉换行导致整个文件解析崩坏；等待用 `ping -n 2` 而非 `timeout`（Git Bash PATH 会劫持 timeout）

### P1.6 · 深度重命名（标识符层）
- 迁移脚本：`rebrand-identifiers.mjs`（可重跑，幂等）
- 范围：45 个前端源文件 + 14 个语言包 + 3 个 Python 显示串
- 改动 token：`makeFontraMenuBar`→`makeEngramFontMenuBar`、`getFontraMenu`→`getEngramFontMenu`、
  `--fontra-*` CSS 变量→`--engramfont-*`、localStorage 前缀 `fontra-*`→`engramfont-*`（主题/语言/快捷键等，旧偏好重置）、
  剪贴板格式键 `fontra-json`→`engramfont-json`、元素 id/class `fontra-project-name`/`fontra-icon-header`/`fontra-ui-*`→`engramfont-*`、
  语言包全部显示串、Python serverInfo/CLI 帮助/错误文案
- **保留不动**：`@fontra/*` 包别名与 workspace 目录名、Python 模块 `src/fontra/`、`.fontra` 文件扩展名、
  `fontra-icon.svg` 文件名、`FontraBackend` 类名（测试引用）——这些是构建/协议/存储命名空间，改动成本远大于品牌收益
- 验证：editor 启动无错误、canvas 渲染、localStorage 109 个 `engramfont-*` 键 / 0 个旧键、serverInfo 显示 "EngramFont version"
