# EngramFont · 贴片清单（fork 纪律）

> 黄金法则：**所有前端改动做在 `src-js/` 源里**。
> `src/fontra/client/` 是构建输出目录（webpack destination），会被 `npm run bundle` 覆盖——改它等于白改。
> 改动模型：新增文件优先（零上游冲突）> 一行注册 > 原文件小改。避免碰 `canvas-controller.js` / `scene-model.js` 等核心渲染文件。

> **文档体系（2026-10-14 起，借鉴 visee）**：本文件是**按时间的贴片台账**；
> 治理枢纽见 [AGENTS.md](AGENTS.md)（每个 agent 必读），文档地图见 [docs/README.md](docs/README.md)。
> 新纪律：特性开发先建 `docs/specs/NN-<特性>/` 包并回填 TEST；bug 修复写 `docs/bugfixes/`；
> 架构决策升格 `docs/adr/`。台账继续按时间追加，两套记录用编号互链（R4-T4.26 ↔ ADR-0002 等）。

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
  面图标=当前子工具；快点击=重选当前工具；长按 500ms 或右键=向上展开子工具选项
  （数组顺序自下而上渲染：scaling 在上、pointer 在下紧贴键帽面）；
  选中后子工具前置（setSelectedTool(id, true)，原生同路径）；点外部 mousedown 或 Escape 收起
- 原生接线：`editorController.setSelectedTool`（与工具栏按钮/快捷键同路径）；原生工具栏切换时 dock 键
  经 MutationObserver(#edit-tools) 同步高亮与面图标；proof 态按功能键先回 edit 模式
- 布局键位影响：仅替换键帽内容，「7」恢复普通字符键；三种布局（arc/straight/merged）自动适用
- 弧形 space 圆角对齐普通按键：SVG stroke 8→12（可视圆角 6px = .kd-key border-radius），seam 侧间隙 +2px 补偿
- 修复：dock 弹层继承 `#keyboard-dock` 的 pointer-events:none → `.kd-fn-options` 显式 auto

### R3-T3.10 · 键盘白天/黑夜主题（2026-10-12）
- 默认白天（浅色）主题：dock 级 CSS 变量（--kd-keycap-bg/-alt/-hover/-fg、--kd-cluster-bg），浅色下浅键帽加深色文字、
  细描边+软阴影保证与浅色画布的层次；激活态反色（浅色主题=深底浅字）
- `#kd-theme-handle`（底部中央第三个手柄，☀/☾ 显示目标模式）切换，localStorage `engramfont-dock-theme` 持久化
- 覆盖范围：普通/深色样式键帽、滑块胶囊、straight 簇背景、折叠圆钮、子工具弹层、弧形 SVG space
  （.kd-space-path 改 CSS 变量取色，去掉 JS 硬编码 fill/stroke）；彩色功能键（紫/黄/红/绿/蓝/橙）双主题保持
- 文案：`dock.theme.toggle`（en/zh-CN）；E2E-10：默认浅色→切深色→刷新保持→切回浅色

### R3-T3.11 · 透明图标背景（2026-10-12）
- 中性按键全部透明化：字符键/图标键底色透明，成为浮在画布上的字符/图标；悬停时才显现键帽底色
- 可读性：键面文字/图标加轻光晕（浅色主题=白色晕，黑夜=暗晕），避免画布字形穿过时看不清
- space 键改描边样式：矩形 space 用 inset 描边圈，弧形 SVG space 描边不填充（按钮框为外接矩形，排除 box-shadow）
- 黑夜主题的透明键加半透明暗键帽 rgba(38,38,41,0.42)（:where 控制优先级=0,1,0：胜过基础透明、
  让位给 kd-style 彩色芯片/hover/激活/space 描边）——暗画布上近乎隐形，亮画布上仍可读
- 无内容的彩色功能键（紫 Tab/彩色占位/empty）保留底色，否则透明后不可见
- E2E-10 更新：断言键帽透明 + 悬停显现两主题的悬停色

### R3-T3.12 · 键盘设置弹窗（2026-10-12）
- 底部手柄行重排：[⇔ 布局] [– 折叠] [⚙ 设置·正中] [☾ 主题]；merged 模式右上级联 10/40/70/100
- ⚙ 弹出「Keyboard settings」居中模态（Fontra 原生 dialogSetup），四节：
  Layout（arc/straight/merged 单选，即选即生效）、Theme（Day/Night）、Visibility（Show keyboard）、
  Custom key bindings（逐条列出 键位→动作 + ✕ 单独移除 + Reset all 清空，同步清 .kd-bound 标记）
- setLayout/setTheme 从 toggle 中拆出（弹窗与手柄共用）；英文硬编码（用户要求不做本地化）
- E2E-11：弹窗打开、布局/主题单选即时生效并持久化、绑定列表/重置、Done 关闭

### R3-T3.13 · 三种布局全部去外框（2026-10-12）
- merged/straight 也去掉键盘外边框（底板背景/圆角/内边距/阴影全删，straight 的双簇面板同步删除），
  与 arc 一致：任何布局都只留按键浮在画布上
- `:root.dark-theme` 的 dock 深色底板覆盖一并移除（折叠圆钮保留底色以便画布上可见）
- 交互不受影响：手柄行、悬停显现键帽、设置弹窗照旧

### R3-T3.14 · 键盘整体缩放 + 手柄去重（2026-10-12）
- 设置页新增 Scale 滑杆（60%–160%，步进 5%，实时 % 显示）：zoom 应用到四个键容器（簇/半边），
  不用 transform 以免破坏 fixed 定位的手柄行；localStorage `engramfont-dock-scale` 持久化
- 底部手柄行从 4 个减到 2 个：[⚙ 设置] [– 折叠]——布局/主题与设置页重复，⇔ 和 ☾ 手柄删除
  （toggleLayout/toggleTheme 一并移除，setLayout/setTheme 供弹窗用）；arc/straight 下两钮分居中线两侧
- E2E-6/E2E-10 改走设置弹窗切布局/主题；E2E-11 增加 Scale 断言（zoom 样式 + 持久化）

### R3-T3.15 · 直线对开两侧留边（2026-10-12）
- straight 布局的 dock 左右 inset 从 0 改为 calc(0.75em + 14px)，与弧形半边的可视边距
  （0.75em 定位 + 14px sidePad）一致，实测两侧均为 24px；修掉右簇 DEL 贴浏览器边缘的问题

### R3-T3.16 · 彩色按键半透明化（2026-10-12）
- 其余实心按键全部改半透明（α≈0.55，米色 0.65）：紫/黄/红/绿/蓝/橙/米芯片 + ctrl/alt/move/empty 中性芯片
  （--kd-keycap-bg-alt 改 rgba，双主题各配 hover 加深档 α≈0.8）
- 用 --kd-chip RGB 变量模式：基态 rgba(var(--kd-chip), 0.55)，hover 加深而非被通用 hover 灰底替换
- 画布笔画可穿透所有按键可见；悬停显现键帽、激活反色、子工具弹窗保持实心

### R3-T3.17 · 键盘色板全面转 OKLCH（2026-10-12）
- 键盘区域所有颜色从 hex/rgba 改为 OKLCH（sRGB→OKLab 矩阵精确换算，视觉不变）：
  主题变量、--kd-chip（改为 L C H 三元组，组合式 oklch(var(--kd-chip) / α)）、
  悬停光晕/投影、space 描边、手柄、focus/bound/accent、夜间键帽等
- E2E-10 颜色断言同步为 Chrome 的 oklch 计算序列化

### R3-T3.18 · 激活高亮透明化（2026-10-12）
- kd-active 高亮从实心改半透明（新增 --kd-keycap-active = 前景色 60% α，双主题各配），
  画布笔画透过高亮键仍可见；move 键的激活态同理

### R3-T3.19 · 全键描边 + squircle 设置 + space 细边（2026-10-12）
- 所有按键加 1.5px 内圈描边（--kd-key-outline，浅/深主题各配），透明填充 + 细描边的完整 ghost 形态；
  删除原先 light 主题专属的芯片外圈+投影规则和 rect space 专用 ring（被通用描边取代）
- 设置页新增 Corners → "Squircle corners" 开关（localStorage `engramfont-dock-squircle`）：
  dock 加 kd-squircle 类，`corner-shape: squircle`（Chromium 139+ 生效，旧引擎优雅回退普通圆角）
- 弧形 spacebar 的 SVG 描边 5px→1.5px，与其它键的描边粗细一致（light/dark 同理）

### R3-T3.20 · 描边范围收紧 + 分离距离/字号设置 + 直线模式补左空格（2026-10-12）
- 描边范围收紧：仅字母/字符键（kd-char-key，含图标功能键）和 spacebar 有 1.5px 描边，
  彩色芯片（红蓝黄紫米/中性 ctrl 等）不再带描边
- 直线对开模式补上左侧 spacebar（spaceKeyLeft 此前只在弧形布局加入），与右空格同样带描边
- 设置页新增两组滑杆：
  - Split gap（分离距离，0–40px，默认 12）：直线=dock 左右 inset；弧形=半边 sidePad（视觉边距两布局一致）
  - Font size（按键字号，12–24px，默认 16，原 15）：CSS 变量 --kd-key-font-size
- squircle 从勾选改为可调数值滑杆（0=off，0.5 步进，2=经典 squircle，最大 8）：
  --kd-corner-shape = superellipse(n)，对所有按键和菜单选项生效；旧 "true" 存值迁移为 2
- E2E-11 扩充：squircle 滑杆（var 断言）、分离距离（inline inset + 持久化）、字号（computed + 持久化）

### R3-T3.21 · 独立圆角半径设置（2026-10-12）
- 新增 Radius 滑杆（0–22px，默认 6）：--kd-corner-radius 应用到所有按键/菜单选项，
  与 Squircle 指数解耦——squircle 之前"没效果"的根因是 6px 小圆角上 superellipse 肉眼不可辨，
  半径调大后形状变化立现（squircle 8 + radius 16 已验证）
- E2E-11 补 Radius 断言（computed border-radius + 持久化）

### R3-T3.22 · 描边宽度设置 + 弧形 spacebar 参与形状设置（2026-10-12）
- 描边默认 1.5px→1px，新增 Border width 滑杆（0.5–3px 步进 0.5）：`--kd-key-outline-width`
  同时驱动字母键内圈、rect space ring、弧形 SVG 描边
- 弧形 spacebar 是 SVG 扇形路径，radius/squircle 的 CSS 属性对其无效——改为在路径几何里实现：
  四角按 Radius 设置做圆角切角（clamp 到带宽/弧长），Squircle 指数控制切角的"饱满度"
  （cubic 手柄长度 0.55+0.05×n），Border width 控制描边粗细——三项设置全部参与
- E2E-11 补 Border width 断言

### R3-T3.28 · 按键 7 接入 Pen Tools 多工具（2026-10-12）
- 「7」= pen tools 多工具键（复用 pointer tools 的整套交互）：cubic / quadratic 两个子工具，
  长按/右键弹出、快点击重选面工具、选中后原生工具栏前置、面图标/高亮双向同步
- E2E-9 选择器收紧到 pointer 组；新增 E2E-12（pen 组弹层、提升、面图标、激活态、快点击回选）

### R3-T3.23 · 修复弧形 spacebar 圆角钳制（2026-10-12）
- 切角上限从 bandHalf-2 改为 bandHalf/2：径向边（带宽 32px）两端各被切 16px 后只剩 4px 脖子，
  整个键帽被捏成楔形；按带宽 1/4 钳制（最大 8px）后形状恢复正常

### R3-T3.27 · 弧形 spacebar 渐细的真正根因（2026-10-12）
- 前两轮都没修到点子上：圆角切点后内弧的起点接在了径向线的切点上（该点不在内弧圆上），
  A 命令过该点"凑"出的内弧不同心，带宽随角度渐缩——才是目视渐细的根因（前两轮只是缓解）
- 修正路径拓扑：外弧 → 切角 → 径向线 → 切角 → **接回内弧自己的切点** → 内弧 → 对称另一端；
  现带宽全程严格均匀（3x 放大截图验证）

### R3-T3.24 · 弧形 spacebar 恢复全高 + 圆角跟随 Radius（2026-10-12）
- 根因二连：旧粗描边（12px）一直在"偷偷撑高"spacebar（32px 几何带宽 + 12px 描边 = 44px 可视），
  描边改细后可视化回 33px，看起来又薄又小；且切角钳 8px 与字母键 16px 圆角不匹配
- 修复：带宽按 44px 可视高度 − 描边宽度计算（bandHalf = 22 − outlineWidth/2），
  切角上限放宽到 bandHalf（Radius 16 → 端头全圆弧、无直线段），bbox padding 改随描边宽度
- 效果：spacebar 与字母键同高、圆角一致跟随 Radius/Squircle/Border width

### R3-T3.26 · 修复 spacebar 端头收细（2026-10-12）
- 切角上限从 bandHalf 放宽后又暴露新问题：43px 径向边两端各切 21.5px 后直线段归零，
  两个高饱满度 cubic 在中点捏出细尖（seam 端目视收细）；上限回调至 0.7×bandHalf（≈15px），
  每端保留 ≥13px 直线段，带宽全程均匀

### R3-T3.25 · 子菜单透明化 + 子工具切换同步修复（2026-10-12）
- pointer tools 弹出选项（kd-fn-option）从实心改半透明（0.55，双主题）+ 同款细描边圈，
  激活态用 --kd-keycap-active 透明反色，与画布按键一致
- 修复 dock 面图标与原生工具栏不同步：pointer-tool ⇄ pointer-tool-scale 切换在原生工具栏上
  只产生 childList（prepend）和 style（visibility）变化、无 class 变化，观察器此前只监听 class——
  现同时观察 childList + style，双向同步（原生选 scaling → dock 面图标变 scaling，反之亦然）

### R3-T3.29 · "切回第一个子工具不同步"根因（2026-10-12）
- 症状：quad→cubic、scale→pointer 不同步，反向正常。根因：DOCK_FN_KEYS 只给每组的
  第二个子工具标了 isSubtool——dock 选第一个子工具时 setSelectedTool 未带 isSubtool，
  原生工具栏不前置它，原生 face 停在旧子工具上
- 修复：组内所有成员一律 isSubtool: true；另把 selectedToolIdentifier 包装为访问器
  （每次赋值即刷新 dock 功能键，覆盖原生工具栏/快捷键/clean view 全部路径）
  不受全局选中落在哪个组影响；顺带修掉过滤重构后的死引用（selected 未定义）页面错误

### R3-T3.32 · 弹层选项相对"键面"过滤（2026-10-12）
- 用户流程暴露残留 bug：全局选中在组外时（先点 pen 键前选中还在 pointer 组），长按弹出会列出
  两组全部工具（2 项）；且右键序列里 pointerup 先于 contextmenu 会用 tools[0] 悄悄改选
- 修复：每组记住自己的面工具（fnDef.faceTool，updateFnKeyStates 在每次选中落在组内时更新），
  弹出选项 = 组内工具过滤掉 faceTool；快点击重选也用 faceTool——弹层恒为"恰好一个可选项"，
  不受全局选中落在哪个组影响；顺带修掉过滤重构后的死引用（selected 未定义）页面错误

### R3-T3.33 · 弹层尺寸/朝向跟随父级按键（2026-10-12）
- 弹出选项尺寸=父级按键实际可视尺寸（offsetWidth×zoom 实测，弧形大键/缩放设置自动跟随），
  图标按高度 50% 等比；不再固定 44px
- 弹出方向沿按键自身切线：读按键 inline rotate 角度，弹层以底边中心为轴同角倾斜、
  锚定在按键倾斜后的上沿（空间不足自动翻到下沿）；无旋转（merged/straight）保持垂直
- 尺寸加 6% 视错觉补偿：悬浮键帽目测偏小，放大一档后与父级按键观感一致

### R3-T3.34b · 按键 9 接入 Shape Tools 多工具（2026-10-12）
- 「9」= shape tools 多工具键（rectangle 默认面 / ellipse 子菜单），交互与 6/7 一致：
  长按/右键弹层（仅列 ellipse 一项）、选中前置原生工具栏、面图标双向同步、快点击重选
- E2E-14 覆盖弹层单项、原生提升、面图标切换、失活/回选

### R3-T3.34c · 按键 0 接入 Metrics 多工具（2026-10-12）
- 「0」= metrics 多工具键（sidebearing 默认面 / kerning 子菜单），交互与 6/7/9 一致
- E2E-15 覆盖弹层单项、原生提升、面图标切换、失活/回选

### R3-T3.34d · 按键 - 接入 Power Ruler Tool（2026-10-12）
- 「-」= power ruler 单功能键（按下即选），与 knife 同模式
- E2E-16：选中/失活与原生工具栏联动

### R3-T3.34e · 按键 = 接入 Hand Tool（2026-10-12）
- 「=」= hand tool 单功能键（按下即选），与 dock 的 move 键共用同一原生工具：
  move 切回 pointer 时 "=" 键高亮自动熄灭
- E2E-17：选中/失活与原生工具栏及 move 键联动

### R3-T3.34f · 画布滚轮默认改为缩放（2026-10-12）
- 鼠标滚轮默认 = zoom in/out（原为平移）；Shift+滚轮 = 平移（原 plain wheel 行为迁到此处）；
  Ctrl/Alt+滚轮保留（触控板捏合手势即以此形式到达）
- 改动点：fontra-core/canvas-controller.js handleWheel；实测 magnification/origin 变化符合预期

### R4-T4.5 · 模板字体改用真实字形（2026-10-12）
- 用户反馈：新建字体的 62 个字形全是同一块占位形状（overview 里全显示成"0"）
- make-template.py 重写：从真实字体文件（.e2e-fonts 的 Inter TTF，OFL）提取轮廓，
  Qu2CuPen 转 cubic、缩放到 upem 1000，批量填满 A-Z a-z 0-9 正确字形
- 排障记录：验证时读 A.json 被 Windows 大小写不敏感匹配到 a.json（小写 a）造成"错乱"假象；
  实际存储用 Fontra 的 ^ 码大小写消歧（A^1.json / a.json 并存），一直正确
- test_newfont.py 断言更新（advance 690、帽高 >700）；E2E-1 字形数 62 断言不变
- 注意：旧模板创建的既有字体不会 retro 修复，新建字体即得真实字形

### R3-T3.34g · 隐藏原生工具栏（2026-10-12）
- 全部工具已上 dock（6/7/8/9/0/-/=），原生 #edit-tools display:none（DOM 保留：工具选择、
  face 前置、dock 同步观察器照常工作）；#zoom-tools 缩放按钮保留
- 相关 E2E 同步：keyboard-dock 各用例的"切走"步骤改用 knife dock 键；import E2E-1 改用
  dock 0 键选 sidebearing（先选工具再折叠 dock）；proof E2E-1 去掉工具栏可见性断言

### R4-T4.6 · 半高菜单键（2026-10-12）
- 数字行上方新增 6 个半高（22px）菜单键：Help / Glyph / Font / View / Edit / File（左→右），
  点击经 menu-bar shadow DOM 的 mousedown 派发打开对应菜单（菜单面板在 shadow 里，断言/检测需走 shadowRoot）
- 三种布局：merged/straight 于左簇数字行上方前置一排（左对齐）；arc 沿数字键正上方的同一弧线
  排列（同角度、同切线倾斜、间距=一个键距）
- mini 键同样跟随设置面板：Radius（min(radius, 11) 封顶半高）、Squircle、Border width、主题透明样式
- E2E-1 加 mini 键断言；E2E-6 键数断言 63→69（弧）/62→68（合并）
- 追加隐藏：缩放按钮组（.tools-overlay 整个药丸容器）、右上角 proof 模式切换按钮
  （#canvas-mode-button，R5 过渡件）、顶部菜单栏（menu-bar）、右上角工程路径栏（opacity:0）
- 隐藏后连带修复：E2E 全部 project-name/menubar 等待改为 state:"attached"（22 处）；
  export/new-font 用例改经 dock File 键开菜单；import E2E-1 先选工具再折叠 dock
- mini 键扩为 7 个：最左新增 ESC 位「Engram Font」键（打开 EngramFont 应用菜单，非 ESC 功能；
  键帽加宽 68px）；File 键超出数字行末尾时沿弧线以 mini 键距延续定位（不再被跳过）；
  弹出菜单改从按键下方出现（showMenu 复用 menubar 菜单定义）；原生顶栏 menu-bar 整条隐藏；
  右上角工程路径栏 opacity:0 隐藏（保留布局占位，E2E waitFor 不受影响）
- R4.T4.10：ESC 位键改名「EFD」，tooltip = Engram Font Designer（title 与 aria-label 同步；
  打开的仍是 EngramFont 应用菜单）
- R4.T4.11：mini 键菜单改向上弹出（menu-panel 新增 openUp 选项：菜单底边贴锚点上方 2px，
  顶到窗口上缘则回落向下）；弧形左 spacebar 3.5u→3.8u——右端越过 b 键约一个楼梯级差（~28px），
  与 File/5/t/g/b 右缘构成连续阶梯；EFD 键帽 56px→48px 稍窄
- R4.T4.12：弧形 mini 键改为自带均匀节距的独立弧线排布（键距 = 键宽+keyGap，不再锚在数字键
  中心——原先节距 58px/键宽 42px 导致缝隙 13/16/6px 参差）；整行总长收进数字行范围，
  File 右缘不再超出 5 键（row1Angles 收集随之删除）
- R4.T4.13：按键 2-5 接入侧边栏面板（2=Reference Font / 3=Designspace / 4=Glyph Search /
  5=Text Entry）：DOCK_FN_KEYS 新增 panel 型条目（复用面板 iconPath 与 sidebar.* 标题键），
  buildPanelKey 按下即 editorController.toggleSidebar；激活态读 sidebar-tab 的 selected，
  包装 editorController.toggleSidebar 使原生侧栏标签点击同样点亮 dock 键；E2E-18
- R4.T4.14：左侧栏不再挤占画布列（原 grid 子元素把 dock 挤偏），改为悬浮面板：
  position:fixed 锚在 dock **左半上方**（键 2-5 所在的左簇；bottom/left 由
  keyboard-dock.syncDockExtentVars 发布的 --kd-dock-clearance/--kd-dock-left-inset 决定，
  随布局/缩放/折叠/窗口缩放同步；取四个 cluster 可见矩形并集——arc 模式 dock 元素是零高
  覆盖层），宽度过渡从左缘向右生长 = 从左滑出（内容 float:left 左贴 + overflow:hidden 裁剪）；
  左侧边缘 tab 条隐藏（dock 键 2-5 已全面替代），E2E-18 原生路径断言改走
  editorController.toggleSidebar（tab 条已隐藏）
- R4.T4.15：右侧五面板接键（tab 条顺序）：[ = Selection Info / ] = Selection Transformation /
  \ = Glyph Note / ; = Related Glyphs & Characters（R4.T4.16 从 , 键挪来，, 恢复字符键）/
  ' = Characters & Glyphs；右侧栏同样改悬浮——syncDockExtentVars 增发 --kd-dock-right-inset
  （右簇右缘），面板锚 dock 右半上方、右对齐、宽度从右缘向左生长（内容 float:right）=
  从右滑出；右缘 tab 条同样隐藏；E2E-18 扩至 9 个面板开/关/激活断言 + 左右悬浮面板均不得
  低于按键顶缘
- R4.T4.16：Related Glyphs 挪到 ; 键（, 恢复为字符键）；左右悬浮面板改为顶天立地——
  top: 8px 到 --kd-dock-clearance 拉通（height: auto），面板信息多，原 32em 高度不够；
  合并左右两段悬浮 CSS 为一个块
- R4.T4.17：split 布局（arc/straight）右半区 spacebar 与 move 合并为一个 move 键
  （原 space+move 冗余）：arc 用弧形扇区（data-special=move，标签锚在扇区中弧点——
  bbox 中心会偏离弯曲键帽；pointerdown → togglePanMode），straight 用 moveKeyRight、
  左端 clip-path 裁出笔直斜边（圆角随 radius 设置走，path() 裁剪避免多边形与圆角冲突
  出尖角）；move 键右端止于 n 键左缘（弧长对齐：cursor 是弧度，px 需 /radius——
  单位混用曾让扇区翻倍长）、左侧空格键同理止于 b 键右缘（3.8u→3.3u，放弃此前的
  楼梯外凸）；独立 move 键从 split 右簇移除（merged 不变：5u space + 1.25u move）；
  蓝色 view（mode）键 split 下 2.25u→2u；E2E-6 arc 计数 70→69
- R4.T4.17c：straight 的 move 键去掉左端斜切（键变短后斜切读作缺口，多边形/圆角 path
  两种裁剪都有瑕疵）——恢复普通圆角矩形，弧形扇区保留自然曲边
- R4.T4.18：split 右半区行末（靠 seam 一侧）改为均匀"倒立楼梯"——每行比上一行收进
  29px（DEL 行 516 → 487 → 458 → 429 → 400）：row2 靠 1.5u \\ 本来就正好差一级
  （DEL 2u − \\ 1.5u = 29，不动），green 2.75u→2.5u、mode 保持 2u、move 扇区末端
  再收一级（400 = n 行 429 − 29）；straight 的 moveKeyRight 同步 2.75u→2u（行末同为 400）
- R4.T4.19：修复子菜单溢出视口 bug：hidden 创建的子菜单在 place() 时量到 0×0，
  视口钳制从未生效，超长子菜单（View→Glyph editor appearance）底边越界 176px；
  show() 取消隐藏后重新 place()，真实尺寸下右/下/openUp/顶部钳制全部生效
  （960×685 实测子菜单底边 683 < 685，末项完整可见）
- R4.T4.20：悬浮侧栏点击空白自动关闭（免重复按面板键）：document mousedown 捕获，
  打开的 sidebar-container 外的点击逐个 toggle 关闭；排除 dock / menu-panel /
  menu-bar / modal-dialog 与面板内部点击；面板查找用容器内 .sidebar-content.selected
  （tab 在独立 overlay 里，不在容器内）；playwright 配置改为 e2e 自管理服务器
  （8801 端口、根 .e2e-fonts、reuseExistingServer）——与日常 8800 实例
  （根 fontra-test-fonts）隔离，修复夹具根目录不匹配导致的批量测试失败

### R3-T3.30 · 按键 8 接入 Knife Tool（2026-10-12）
- 「8」= knife tool 单功能键（无子菜单，按下即选）：activateTool 直连原生
  setSelectedTool；buildFnKey 拆出单工具分支（跳过长按/右键弹层逻辑）
- E2E-13：选中/失活与原生工具栏 selected 状态联动

### R3-T3.31 · 弹出层只列可选项（2026-10-12）
- 多工具键的弹出选项不再重复当前面工具：只列出**其余**子工具（两组工具的键各弹出恰好一项），
  面图标 + 单个可选项 = 完整的切换闭环；E2E-9/12 断言同步（另一子工具 count=0）

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

### R4-T4.21 · 双击节点 corner↔smooth 对齐 Glyphs/FontLab（2026-10-13）
- **修复**：`toggleSmooth`（fontra-core/path-functions.js）原本在节点两侧都是直线段
  （无 off-curve 手柄）时直接跳过——矩形角点双击无效果；现放开为纯旗标切换
  （ON_CURVE ↔ SMOOTH_FLAG，无手柄、无轮廓变化），与 FontLab/Glyphs 的
  "双击切节点类型"一致；开放路径端点仍拒绝；节点标记方块↔圆点为可见反馈
- **单元测试**：src-js/fontra-core/tests/test-path-functions.js 新增 3 例
  （单角往返 / 多选一致 / 开放端点拒绝），18/18 通过
- **连带修复 dock navigateToGlyph**：设置的 selectedGlyph 缺
  lineIndex/glyphIndex（getSelectedPositionedGlyph 索引取不到 → shape/metrics
  工具在 dock 键导航后崩溃）；现按 glyphName 从 positionedLines 解析并携带索引
  （找不到时清除陈旧索引）；实测 dock 键导航后 shape 工具可正常画矩形，
  双击角点 smooth↔corner 往返（UI 验证：四角圆点/方块标记切换、轮廓不变）

### R4-T4.22 · 双击 line-line 角点转 smooth 时自动创建手柄（2026-10-13）
- R4.T4.21 的纯旗标切换升级：双击把"两侧都是直线段"的角点切到 smooth 时，
  **自动创建手柄**——两个相邻直线段各变为完整三次曲线（每段插入两个 off-curve：
  靠角点的手柄对齐共线过节点、远端手柄留在原直线上保持形状）；
  相邻角点同批 smooth 时共享段只插一次（远端手柄由对侧角点的处理提供）；
  插入按索引降序处理避免位移问题；切回 corner 保留曲线（与 FontLab/Glyphs 一致，
  删手柄转直是独立操作）
- 实现：toggleSmooth 改三段式（收集可切换点 → 旗标+现有手柄对齐 → line-line
  角点降序插入手柄）；单测更新为手柄创建语义（角点索引因插入手柄而 +1、
  共线性断言、开放端点拒绝不变），fontra-core 全套 1216 通过
- UI 实测：shape 工具画矩形 → 指针双击 → 四角圆化带手柄、原直边保留
- 连带修复：弧形 space/move 扇区的 SVG/button 包围盒会拦截相邻按键（如 b 键）
  的点击——button/svg 设 pointer-events:none、仅 .kd-space-path 设 pointer-events:all
  （扇形形状本身可点、事件冒泡到按钮）；实测 b 键可点、空格扇形中心点击仍追加空格

### R4-T4.23 · 节点类型配色差异化（2026-10-13）
- 设计独立的节点配色（区别于 FontLab 蓝绿红节点、Glyphs 白黑节点）：
  **smooth = 紫罗兰圆点、corner = 琥珀黄方块、手柄 = 中性灰紫小点**，
  呼应键盘 dock 的紫/黄芯片色板；亮/暗主题各一套
  （light: #7A4FE8 / #D99A1F / #A0A0B0；dark: #A78BFA / #E8B84A / #7E8290）
- 实现：fillNode/strokeNode 增加 colors 参数按节点类型取色；
  fontra.nodes / fontra.component.nodes（半透明版）/ fontra.selected.nodes
  （悬停环用类型色、选中保持黑白高对比）四个图层接入；
  组件手柄线改用手柄色
- 配色细化：**未激活节点 = 空心**（类型色描边：紫罗兰圆/琥珀方/灰紫手柄圈），
  **激活（选中）节点 = 实心**（类型色填充 + 白/黑光晕垫底）；fontra.nodes 改描边绘制
  （新增 strokeWidth 1.5 屏幕参数）、component.nodes 同步空心、
  fontra.selected.nodes 选中填充改用类型色（原黑白填充弃用）；悬停环保持类型色

### R4-T4.25 · 节点外观设置页（颜色 + 滚轮数值）（2026-10-13）
- Application Settings → Theme settings 新增 **Node appearance** 卡片：
  "Use custom node colors and sizes" 开关 + Smooth/Corner/Handle 三个颜色选择器 +
  Corner/Smooth/Handle 三个数值输入（**滚轮增减、可直接键入**，带 min/max 钳制，非滑竿）
- 持久化：挂载到 themeController 模型（synchronizeWithLocalStorage 自动落盘
  engramfont-node* 键）；editor.js 构造时应用 + 监听六个键实时重建可视化图层
- 实现：simple-settings.js 新增 color 与 number-wheel 两种 UI 类型；
  visualization-layer-definitions.js 导出 applyNodeAppearanceSettings(model)
  （勾选时覆盖三个节点图层的 colors/colorsDarkMode/screenParameters，
  未勾选恢复内置亮暗默认）；修复一次全局替换误伤 fontra.selected.anchors
  图层 hoveredColor 的问题
- 验证：设置页交互（勾选/填色/输入 14/滚轮 8→9）全部持久化；编辑器同上下文
  重开，运行时图层参数为自定义色，选中节点实心洋红渲染

### R4-T4.26 · 节点外观设置重排 + 行级 reset（2026-10-14）
- **simple-settings.js 全面重写行布局**：所有行改为「文字在前、控件在后」
  （label 左对齐、控件右对齐、行间发丝分隔线）；新增 `combined` 行类型
  （一个 label + 多个控件 + 可选 reset 图标）；checkbox/radio/color/number-wheel
  全部走同一行构造器；`number-wheel` 加 `title: "Scroll or type"` 提示
- **reset 图标**：`combined` 行 `resettable: true` 时在颜色块右侧追加
  `<icon-button src="/tabler-icons/refresh.svg">`，点击把该行 size+color 恢复默认，
  输入元素原位更新（不触发整行重渲染、不掉焦点）
- ⚠ 踩坑：`new IconButton(src)` 构造参数走 setAttribute，但 src 只在 property
  访问器体系里（attribute 不回读），InlineSVG 拿到 undefined 请求 /undefined 404；
  必须用 `createDomElement("icon-button", { src, onclick, ... })` 属性赋值方式
- **panel-theme-settings.js**：删掉「Use custom node colors and sizes」总开关；
  三个节点类型各一行 = 文字 + size + color + reset；颜色/尺寸默认值不变
- **节点外观始终生效**：`applyNodeAppearanceSettings` 移除 nodeAppearanceCustom
  分支（无条件覆盖图层 colors/screenParameters）；editor.js 实时监听修复
  （原来误传 visualizationLayerDefinitions 当 model，现传 themeController.model）
  并移除 nodeAppearanceCustom 键；theme-settings.js 模型同步删除
- **修复 [object HTMLDivElement]**：SimpleSettings.render 包一层 .settings-list 后
  radio 返回的行数组未 flat，append 时被字符串化；现 `.flat()` 后再挂载
- **面板宽度**：theme / display-language / clipboard / editor-behavior / server-info
  五个面板 `max-width: 32em`（不再全窗口拉伸）；shortcuts 面板保持全宽
- **通用能力**：描述项支持 `disabledWhen(model)` + `refreshDisabledStates()`
  原位刷新（依赖主开关的行灰显），当前 UI 暂无使用方，留给后续
- 验证：Playwright 亮/暗主题截图、reset 往返（14/#ff0000 → 8/#7a4fe8 落盘
  engramfont-node* 键）、radio/combined 渲染、display-language + clipboard 回归、
  控制台零错误
- 色块形状跟随节点形状：color 控件新增 `shape` 字段（round/square →
  `.swatch-round` 50% 圆形 / `.swatch-square` 0.2em 方形）；Smooth/Handle 用圆、
  Corner 用方，与画布节点形状一一对应

### R4-T4.27 · 节点图标：smooth 平滑点（原圆点）改为杏仁形（2026-10-14）
- 规则（ADR-0005，最终版）：**只改原来画圆点的那类图标**——smooth on-curve 点
  = 杏仁形（两段二次贝塞尔尖椭圆，长轴沿该点切线 = 进/出段方向平均，
  两端尖点即箭头、贴在曲线上，任意方向自适应；退化回退圆点）；
  **其余全部不变**：角点照旧琥珀方块、手柄照旧灰圆点、空心/实心与颜色语义照旧
- 实现：`computeSmoothTangents(path)`（Map<pointIndex, 切线轴>，开轮廓单侧回退）+
  `eyePath`/`fill/strokeEyeNode`；fillNode/strokeNode 增 axis 参数（smooth 分支）；
  四个调用方（fontra.nodes / fontra.component.nodes / fontra.selected.nodes 三态 /
  背景层）先建切线表再逐点传入；选中实心+光晕、悬停描边、组件半透明自动继承
- 中间被否决版本：按"是否邻接曲线段"几何切换 + 对拐角也画杏仁——用户截图反驳
  （曲线|直线转折角被画成杏仁、尖点飘离线段），已全部回退为 smooth 标志规则
- 验证：Playwright 实测——无 smooth 点的字形画布与改前完全一致（全部方块）；
  双击平滑一个角点后该点即变紫色杏仁、长轴沿新切线；`npx playwright test` 35/35；
  控制台零错误

### R11-T11.1 · Squircle 节点：曲率连续（G2），图标为超椭圆（2026-10-14）
- 需求（用户原话）："实现类似 glyphs app 的这个功能（super-smooth nodes）。
  但是需要修改一下，图片是 超椭圆图标。不需要五角星。"
  + "SUPER_SMOOTH 应该叫做 超椭圆 squircle 而不是 super smooth"
- **数学核心**（新增 `fontra-core/src/path-curvature.js`）：
  三次贝塞尔端点曲率 `k = (2/3)·cross(n, 远端控制点-P)/a²`，令两侧相等得**闭式解**
  `b/a = sqrt(C_/A_)`（`A_=cross(n,hA-P)`、`C_=cross(n,hC-P)`）。
  G2 只定**比值**（尺度自由，取原手柄长之和）；可行性要求 `A_·C_ > 0`（同向弯曲），
  异向（拐点）时 G2 在 G1 下**数学不可能** → `infeasible`。**不需要移动节点**。
  子任务自带 138 断言，本仓**独立复跑确认**后才接入
- **直线↔曲线**：直线曲率恒 0 → 零曲率必须在**曲线侧**（手柄取中点
  `P1=(P0+P2)/2`）。**不能给直线倒圆角**——在直线端点强制零曲率会把圆角塌回直线。
  附 `lineToCurveRoom()` 判定"直线是否够长"
- **数据层**（`var-path.js`）：新增 `SQUIRCLE_FLAG = 0x10`（位于 `POINT_TYPE_MASK` 之外，
  与 `SMOOTH_FLAG` 同构）；squircle 点同时带 smooth；`getPoint` 优先判 squircle →
  返回 `{smooth:true, squircle:true}`；`setPointType`/`packPointType`/`packContour` 同步
- **几何适配**（`path-functions.js`）：`collectSegmentSide` 把路径点翻译成求解器的
  `[far,farHandle,nodeHandle,node]`；`applySquircleAtPoint` 求解并回写；`toggleSquircle`
  先求解、**成功才落标志**，不可行则还原点类型与几何（**图标不得撒谎**）
- **渲染层**：超椭圆 `|x/a|^n+|y/b|^n=1` 参数化折线（72 段）；
  `fillSquircleNode`/`strokeSquircleNode`；配色亮 `#D6336C` / 暗 `#F472B6`
  （玫红；先后否决了深靛与青绿——前者与 smooth 的紫太近，后者用户要求换掉）
- **设置**：新增 `nodeSquircleColor`、`nodeSquircleExponent`（默认 **3**）；
  面板加 `Squircle node` 行 = 色块 + 指数滑轮（1–8），**无独立 size**（沿用统一 `nodeSize`）
- **交互**：**Shift-双击**切换 squircle（普通双击仍是 corner↔smooth，行为不变）；
  撤销标签补进 14 个语言文件
- 决策：[ADR-0009](docs/adr/0009-squircle-g2-nodes.md)；
  特性包：[docs/specs/11-squircle-nodes/](docs/specs/11-squircle-nodes/)
- **验证**：曲线↔曲线曲率跳变 **3.125e-3 → 8.674e-19**（手柄比值精确等于 √(C_/A_)）；
  直线↔曲线连接处曲率跳变 **0**；本仓 25 条曲率真值断言全过；
  `npm test` 1215 passing / 0 failing；画布 `lineTo×72` 证明超椭圆在绘制；
  **超椭圆与方块共用尺寸盒（1.000 × 1.000）**；设置页三色块同尺寸
  （Squircle/Square/Round 均 22.66×22.66，眼形 22.66×15.95）
- **本次开发中发现并修掉的真实 bug（8 个，详见 TEST.md 第六节）**：
  ①`SQUIRCLE_EXPONENT_DEFAULT` TDZ 导致整页白屏；②块替换误删
  `computeSmoothTangents`/`eyePath`/`fillEyeNode`/`strokeEyeNode`（git diff 净变化为零、
  极难察觉）；③给直线侧插手柄把节点挤走；④回写取整破坏解（1e-19→6.4e-5）；
  ⑤指数放在 `screenParameters` 而随缩放变形（3→3.92）；⑥等面积规则让图标小于方块一圈；
  ⑦`start-EngramFont.bat` 不停旧实例 → `Errno 10048`，且**旧服务仍应答 `/serverinfo`
  会骗过就绪轮询**；⑧批处理 `echo` 里未转义的 `)` 提前闭合 `for` 块、静默丢弃 `taskkill`

- **三种节点状态：普通双击三档循环 + Shift+双击直达**（用户规格，2026-10-14 定稿）
  - **普通双击 = 循环**（连续性递增，连点即走完一轮，绕回起点）：
    `corner → smooth → squircle → corner → …`
    （`advanceNodeKind()`；用户原话："corner，smooth，squircle 可以通过普通双击轮换"）
  - **Shift+双击 = 直达 squircle**，且**在 squircle 上幂等**（不会降级）：
    corner→squircle、smooth→squircle、squircle→squircle
  - 降格路径由普通双击承担：`squircle --dbl--> corner --dbl--> smooth`
  - 取舍说明：普通双击**不再是自身的逆操作**，且 smooth→squircle 会**真的弯轮廓**
    （这是"让接缝曲率连续"的必然结果）；靠撤销与图标状态可读性兜底
  - 实现上**新增 `advanceNodeKind`**，没有改 `toggleSmooth` 的既有二态语义
    （上游 1215 条测试依赖它）

  | 起始 | 普通双击（循环下一步） | Shift+双击（直达） |
  |---|---|---|
  | corner（方形） | → smooth | → squircle |
  | smooth（眼形） | → squircle | → squircle |
  | squircle（超椭圆） | → corner | → squircle（不变） |

- **本轮发现并修掉的真实 bug**：
  ①`toggleSmooth` 只认 `0`/`8` 的**精确比较**，squircle（0x18）不在判定内 →
  **普通双击对 squircle 节点完全无反应**；改用 `POINT_TYPE_MASK` 判定 on-curve、
  并把 squircle 视为 smooth（→ corner）；
  ②`toggleSquircle` 先调 `toggleSmooth` 建立 G1 时，**toggleSmooth 插入手柄会让节点自身索引偏移**
  （角点 1 → 3），导致随后的 G2 求解作用到错误对象上，留下"加了一堆手柄但标志被回滚"的
  半残状态 → 转换后**按坐标重新定位节点**；G2 不可行时保留已建立的平滑（不回滚成带手柄的角点）
  ③`squircle` 色块的 `n` 控件用了 `span` 但**未 import** → 整个设置面板渲染抛错、一张表全空；
  ④`n` 控件曾是裸数字，被误读成 size → 加 `n =` 前缀；且控件应放在**颜色之前**
  （颜色在各行最右，这样四个色块天然对齐，不需要占位 spacer）；
  ⑤squircle 图标最初用"等面积"定尺寸，n=3 时只占盒子 58%、比方块明显小 → 改为共用方块尺寸盒
  再 **×1.15**（用户要求"默认大一点点"）

### R10-T10.2 · 节点尺寸统一 + 箭头随尺寸缩放 + 杏仁改眼睛形（2026-10-14）
- 需求（用户连续三条）：
  ① "大于号、小于号的大小是不是要跟 corner size 和 smooth size 一起变化呢？"
  ② "corner size 与 smooth size 不应该是两个 size 设置，而是同一个 size 设置。
     不应该是一个大一个小。" + "handle 的 size 也是统一的 不单独设置"
  ③ "杏仁形的中间区域大一些，现在太小了，设置页面的和编辑区的。都要调整大一些。
     应该像眼睛的形状。"
- **①尺寸合并为单一 `nodeSize`**（`theme-settings.js`）：
  三键 `nodeCornerSize`/`nodeSmoothSize`/`nodeHandleSize` → 单键 `nodeSize`（默认 8，4–24）；
  `applyNodeAppearanceSettings` 把同一值写进三个图层的 `cornerSize`/`smoothSize`/`handleSize`；
  **一次性 localStorage 迁移**（读旧值写 `nodeSize`，删三个旧键），用户设置不丢
- **②箭头随尺寸等比缩放**（`visualization-layer-definitions.js`）：
  `chevronLength`/`chevronSpread` × `(nodeSize / NODE_SIZE_DEFAULT=8)`；
  **`gap` 不缩放**——间隙恒为 5 屏幕 px，箭头永不与节点重叠（ADR-0007 约束保持）
- **③杏仁比例改眼睛形**：`halfWidth` `0.34 → 0.58 × size`（长宽比 1.15:0.58 ≈ 2:1），
  抽成共享常量 `EYE_HALF_LEN_FACTOR`/`EYE_HALF_WIDTH_FACTOR`，
  画布绘制与起始点间隙计算共同引用（消除两处漂移）
- **设置面板**（`panel-theme-settings.js` + `simple-settings.js`）：
  Node appearance 卡片 = `Node size`（唯一尺寸轮）+ Smooth/Corner/Handle 三行颜色（各带 reset）；
  新增 `.swatch-eye` 色块形状——按 `eyePath` 的 `4t(1-t)` 精确采样多边形，
  盒子长宽比与形状一致（2.6em × 1.31em），**设置页与编辑区形状统一**
- 决策：[ADR-0008](docs/adr/0008-node-size-unified.md)；特性包：
  [docs/specs/10-startpoint-chevron/](docs/specs/10-startpoint-chevron/)
- 验证（**8801 e2e 隔离实例**，真实设置路径 localStorage → 重载）：
  | size | corner | smooth | handle | gap | 箭头宽 |
  |---|---|---|---|---|---|
  | 4 | 4 | 4 | 4 | 5 | 3 |
  | 8 | 8 | 8 | 8 | 5 | 6 |
  | 16 | 16 | 16 | 16 | 5 | 12 |
  | 24 | 24 | 24 | 24 | 5 | 18 |
  → corner == smooth == handle（YES）、gap 恒定（YES）、箭头等比（比例恒 5）；
  间隙量测：方形 spread 0.50（≥size12 恒定 6.54）、杏仁 spread **0.000**（恒定 9.24）；
  面板截图 `qa/panel-node-appearance.png`；画布对比表 `qa/chevron-gap-sheet.png`；
  `npx playwright test` 35/35；docs lint 74 篇

- **④命名升级：杏仁形 → 眼形（eye）**（2026-10-14 追加）
  - 用户："我认为杏仁型，改成 眼睛的形状更有人文味道。更新语义。"
  - 代码：`almondPath`→`eyePath`、`fill/strokeAlmondNode`→`fill/strokeEyeNode`、
    `ALMOND_HALF_*_FACTOR`→`EYE_HALF_*_FACTOR`、`.swatch-almond`→`.swatch-eye`、
    形状名 `"almond"`→`"eye"`；形状与几何**完全未变**
  - 专业依据：排版术语中小写 `e` 的封闭空间即称 **the eye**（`a` 的为 the bowl），
    比食物隐喻更贴专业语境
  - 设计说明 [docs/字体设计图例符号系统设计说明.md](docs/字体设计图例符号系统设计说明.md)
    重写第 3.3 节：原先被记为缺陷的"容易被读成眼睛"**转为有意语义**，
    并新增「命名复核」小节说明尖角是曲率归零的可视化；全文（标题/结论/最终方案/
    落地要点/Glyphs 对照/决策链/配图清单）统一为眼形
  - ADR-0005 更名（文件 `0005-node-icons-eye-on-curves.md`）并加改名溯源说明；
    文档中保留用户原话里的旧称以诚实溯源
- **⑤设置面板色块对齐修复**（2026-10-14 追加）
  - 用户："Smooth node 的颜色形状，超出了很多，需要与下面的方形、圆形对齐。
    也要让眼睛形状显现出来，让方形和圆形跟上面的眼睛形状居中对齐。
    后面的灰色重置设置改成浅灰色"
  - 根因：眼形色块曾单独设 `inline-size: 2.6em / block-size: 1.31em`，
    比方形/圆形的 1.7em 盒子宽出 0.9em，且行内右对齐 → 三者轴线错位、溢出
  - 修复：三者**共用同一个 1.7em 盒子**，眼形在盒内按真实 2:1 比例居中
    （满宽 1.7em、半高 0.85em，即 polygon 的 y% 幅度 = 25 而非 50）；
    重置图标改用 `--horizontal-rule-color` + `opacity 0.6` 的浅灰，
    hover 时才提亮（`.reset-button` 的 `color`/`opacity` 过渡）
  - 量测验证：三个色块均 **22.66 × 22.66 css px**，
    水平中心 spread **0**、右边缘 spread **0**（严格同轴居中）；
    重置按钮计算色 `rgba(170,170,170,0.533)` = 浅灰

- **⑥眼形几何定稿：改用 Lucide 图标比例 + 与方块等面积**（2026-10-14 追加）
  - 用户："Tabler 改成 用 lucide 的" + "这smooth color 的形状还是太小了，比例不协调"
    + "这个编辑区的 smooth icon 太大了，调整小一些，视觉大小跟橙色方块一样大"
  - 依据：[Lucide](https://lucide.dev) `eye` 外轮廓（去掉瞳孔 `<circle r=3>`）实测
    **19.88 : 14.0 单位 → 1.42 : 1**（比 Tabler 的 1.5:1 更饱满）
  - 常量：`EYE_HALF_LEN_FACTOR` `1.15 → 0.73`、`EYE_HALF_WIDTH_FACTOR` `0.58 → 0.514`；
    保留**尖端**（不用 Lucide 的圆头），因为尖点承载曲率语义
  - 定标原则：**面积相等**。方块 `size²`，眼形双二次曲线围合 `(8/3)·halfLen·halfWidth`，
    代入后 = `1.0006 · size²` → 两种节点视觉等重
  - 设置页 `.swatch-eye`：填满 1.7em 盒子（宽 1.7em、高 1.2em，按 1.42:1），
    取代原先只占 50% 高的扁形；三色块仍严格同轴（水平中心/右边缘 spread 均为 0）
  - 验证：放大渲染取面积，size 8/12/16/24/32 的 眼/方 面积比
    **0.997 / 0.997 / 0.995 / 0.997 / 0.994**（均值 0.996，理论 1.0006）；
    对比图 `qa/eye-vs-square-sheet.png`；`npx playwright test` 35/35；docs lint 75 篇

### R10-T10.1 · 起始点方向指示：圆弧 → 尖角箭头（> / <）（2026-10-14）
- 需求（用户截图）：起始点的方向指示从**圆弧**改成**大于号/小于号**（`>` / `<`）
- 实现（单文件 `visualization-layer-definitions.js`，`fontra.startpoint.indicator` 图层）：
  方向仍取前进方向 `d = normalize(next - start)`、`angle = atan2(d.y, d.x)`；
  形状改为顶点朝 +x 的折线 `upper → tip → lower`（两腿向后张开
  `±START_POINT_CHEVRON_HALF_ANGLE = 0.28π`）；摆放用
  `save → translate(start) → rotate(angle) → 描边 → restore`（刚体旋转，
  朝右自然呈 `>`、朝左呈 `<`，非镜像分支）；只描边不填充
- 参数/颜色/`selectionFunc`/`zIndex` 全部沿用；删除 `START_POINT_ARC_GAP_ANGLE`，
  新增 `START_POINT_CHEVRON_HALF_ANGLE`；单点轮廓（无方向）改为跳过不画
  （旧实现画整圆）
- 特性包：[docs/specs/10-startpoint-chevron/](docs/specs/10-startpoint-chevron/)；
  决策：[ADR-0007](docs/adr/0007-startpoint-chevron-indicator.md)
- 验证（**8801 e2e 隔离实例**，遵守 BUG-006 硬约束）：4 条朝向各异的轮廓按
  `canvasPoint()` 精确定位裁剪特写——朝右 `>`（chev-right.png）、朝左 `<`
  （chev-left.png）、朝上 `∧`（chev-up.png）、朝下 `∨`（chev-down.png）、
  斜向随方向旋转（chevron-shapes.png）、无圆弧残留、亮/暗主题颜色一致
  （startpoint-dark.png）；`npx playwright test` 35/35；控制台零错误

### R4-T4.28 · 双击转曲：直线变真曲线 + 手柄按公切线生成（Glyphs/FontLab 语义）（2026-10-14）
- 现象（用户截图）：矩形上双击右上角 → 右边缘被拉出巨大外抛弧线，且「点击其他三个点正常」——不同角变形量不一致
- 根因（ADR-0006）：R4-T4.22 的 pass 3 在**已被 pass 2 改过的路径**上重新查询邻居，
  并用全局 `insertedPositions` 偏移表（跨轮廓串扰）定位插入点；连续平滑多角时
  先前插入的手柄被当成邻居参与计算 → 手柄逐次漂移、飞出边的延长线
- 用户明确目标（原文）："跟 glyphs app，fontlab 一样啊，双击直线方形节点，变成弧线
  杏仁形节点，这个直线变成曲线，手柄也需要跟变啊"——即 Glyphs/FontLab 真转曲
- 修复：pass 3 重写为**从 pass-1 快照统一算几何**——
  ① pass 2 只翻标志；
  ② 两侧都已有手柄（纯曲线点）→ `alignHandles` 对齐公切线（上游行为保留）；
  ③ 某侧是直线段 → 在**过节点的公切线**上生成手柄：方向 = 进/出段单位向量之和，
     长度 = 该段 1/3；邻居共线时退化为段上 1/3 点（形状不变），真拐角时手柄摆到
     切线 → **线弯**；
  ④ 直线段**远端手柄**一并创建（该端也在本次转曲中则跳过，由它自己建），整段成为完整 cubic；
  ⑤ 插入按**绝对索引降序 + 同槽优先级**（远端先插，保证 cubic 次序 起点/远端/近端/终点），
     去掉跨轮廓全局偏移表（旧 bug 源），每轮廓独立定位
- 验证（8801 e2e 隔离实例，干净 4 点矩形，按用户顺序双击四角）：
  每次双击相邻两段变 cubic、手柄落在公切线 1/3 处（如 661,496 / 710,407 / 622,319），
  四角行为**完全一致**、轮廓按切线外鼓（截图 final-1..4）；`npx playwright test` 35/35；控制台零错误
- ⚠ 同期发现并记录 BUG-006：agent 自动化脚本对**用户在线 8800 实例**做无人化写操作
  导致双写互踩（change 回放越界、画布被远端改动污染）——已立硬约束：写操作验证
  一律走 8801 隔离实例

### R5-T5.5 · 斜向框选（Glyphs 风 Ctrl 改角度）（2026-10-14）
- 对标 Glyphs handbook「Selecting nodes and paths」：拖拽框选时按住 **Ctrl 改变选区角度**，
  松开 Ctrl 后沿当前角度继续改变大小；斜向选区服务斜体设计
- **状态机**（edit-tools-pointer.handleRectSelect）：普通拖拽 = 原有矩形；
  ctrl 按下瞬间冻结横向宽度 w，进入角度模式（鼠标驱动剪切 k，钳制 ±12 ≈ ±85°）；
  松开 ctrl 进入定角缩放（角点跟随鼠标，k 不变）；角度模式可反复进出
- **数据模型**：选区平行四边形 {x0,y0,x1,y1,shearK}——水平上下边 + 斜侧边
  （shearK = 每垂直单位水平偏移），scene-controller 新增 selectionParallelogram
  存取（glyph 坐标，与 selectionRect 同约定，拖拽结束清空）
- **命中测试**（scene-model.selectionAtParallelogram）：剪切空间法——
  所有候选几何按 x -= k(y-y0) 剪切后，平行四边形退化为普通矩形：
  节点 iterPoints + 剪切点 pointInRect；组件镜像 intersectsRect 结构
  （剪切 controlBounds 预滤 + 凸包 + 逐轮廓）；锚点剪切点测试；
  背景图复用 _backgroundImageSelectionAtPointOrRect（新增 paraGlyph 分支）；
  controlBounds 剪切后 sectRect 预滤保证空区零开销
- **绘制**：fontra.rect.select 图层支持平行四边形（黑实线 + 白虚线，样式同矩形）
- 行为兼容：不碰 Ctrl 时与原矩形框选完全一致（e2e 回归 35/35 通过）
- 验证：Playwright 实测（8800/Untitled.fontra "a"）——矩形基线 4 点、
  斜选 3 点且与独立剪切命中计算逐点一致（point/7,16,18）、
  松开 ctrl 定角续拖形状角度不变、mouseup 后状态清理、控制台零错误

### R11-T11.2 · 节点类型手势：指针命中的坐标空间 + 触发点集（"双击没反应"的真根因）（2026-10-14）
- 现象：双击 / Shift+双击节点"不动"，**先点中节点再 Shift+双击**必不动；
  早期日志显示 `handleDoubleClick` 一开头就走进"重新选字形"分支被 `return` 吞掉
- 根因 1（坐标空间）：`pointIndexUnderPointer()` 把**场景坐标**的 `point` 直接与
  **字形坐标**的 `path.getPoint(i)` 比较。scene = glyph + `positionedGlyph.x/y`，
  而该偏移就是字形的左边距（本仓 H = **-280** 单位）→ 指针命中判定**恒不命中**，
  "指针下有点"这条分支形同不存在，手势只剩"选区兜底"一条路
- 根因 2（触发点集）：触发点集直接取 `parseSelection(sceneController.selection)`。
  Shift 是 symmetricDifference：**首击会把该节点移出选区**；且跨类型变更后 change
  记录器会重映射选区索引，选区里可能**只剩手柄索引**（实测 `["point/0"]`）。
  手柄没有节点类型 → `makeSquircle` / `advanceNodeKind` 全部 `continue` →
  **记了一条 undo 却什么都没改**——UI 上就是"双击没反应"，而
  `handlePointsShiftDoubleClick` 确实被调用过，审查日志也看不出异常
- 修复（`views-editor/src/edit-tools-pointer.js`）：
  ① `pointIndexUnderPointer` 先按 `positionedGlyph.x/y` 把场景点换算成字形点
     （与 `sceneModel.pointSelectionAtPoint` 同约定），且**只认 on-curve 点**——
     手柄不携带节点类型，不该成为节点手势的目标；
  ② 触发点集 = 「选区里的 on-curve 点」∪「指针下的点」；指针下的点**必须显式并回**
     （Shift 首击已把它移出选区）；两者皆空时**不派发编辑**（不再留空 undo 记录）
- 验证（**8801 e2e 隔离实例**，`qa/verify-squircle-gesture.mjs`，遵守 BUG-006 硬约束）：
  **7/7 项通过**——普通双击三档循环 `corner→smooth→squircle→corner`、Shift+双击
  `corner→squircle` 且**在 squircle 上幂等**（重复手势后**所有点坐标的指纹完全相同**
  `af15ca02 → af15ca02`，点数 4→8 只发生在首次转曲）、
  **"节点已被选中"时 Shift+双击仍生效**（修复前此处必然失败）；
  每步断言**只有一个节点改变类型**；`npm test` **1215 passing / 0 failing**；
  `npx playwright test` **35/35**；控制台零错误
- ⚠ 测试侧反向教训（曾连续误导三轮排查）：脚本用 `rect.x + canvasPoint(字形点)` 算落点，
  漏掉场景↔字形的左边距 → 点击**偏 ~370px 落在相邻线段上**；而旧的 sanity 断言只查
  `selection.some(s => s.startsWith("point/"))`——**线段命中同样返回 `point/*`（两个端点）**，
  所以"映射正确"是**假阳性**。现在：自校准换算 + 断言选区**恰好**等于 `[point/<节点索引>]`，
  并给 `editLayersAndRecordChanges` 挂**只读探针**读 undo 标签——否则"被吞掉的手势"
  会被误判成"幂等 PASS"（这正是本 bug 一度看起来已修好的原因）

### R11-T11.3 · smooth→squircle"看起来没变化"的实测 + 已共线手柄被取整的修复（2026-10-15）
- 现象（用户截图）：矩形上连点四下，只有第一下（corner→smooth）轮廓明显变化，
  其余三下（smooth→squircle / squircle→corner / corner→smooth）"手柄和线条没有变化"
- **实测结论：功能是对的，"没变化"是错觉——但顺带挖出一个真 bug。** 用
  `qa/probe-asym-cycle.mjs` 在**不等边**矩形 600×400 上按真三次贝塞尔端点曲率
  `k(t=1)=(2/3)|cross(P3−P2, P3−2P2+P1)|/|P3−P2|³` 实测：

  | 双击 | 类型 | 近手柄 in/out | kIn / kOut | 相对跳变 | 几何指纹 |
  |---|---|---|---|---|---|
  | ① | corner→smooth | 199.4 / 132.9（新建） | 4.74e-3 / 7.12e-3 | 33.4% | 9e46b38d |
  | ② | smooth→squircle | **182.9 / 149.4** | 5.64e-3 / 5.64e-3 | **0.000** | 122a7dba |
  | ③ | squircle→corner | 不变 | 不变 | 0.000 | 不变 |
  | ④ | corner→smooth | 不变 | 不变 | 0.000 | 不变 |

  即第②下**确实重解了 G2**（手柄一短一长、总长守恒 332.3→332.3，跳变 33%→0.000）；
  只是"直角 + 1/3 切线手柄"本就接近对称，轮廓位移只有 1~2px，正常缩放肉眼极易漏看
  （此前回归脚本用**正方形**轮廓，左右曲率天然相等，更看不出来）
- 真 bug：上游 `alignHandles` → `alignHandleAlongDirection` 末尾 `vector.roundVector`，
  对**已经共线**的手柄也照样取整。于是对"G2 解刻意写入的分数坐标"（见
  `applySquircleAtPoint` 的不取整注释）这是一次隐形几何改动，并把曲率跳变从
  **0.07% 弹回 1.1%**——正是同一条"取整重新引入曲率跳变"的坑
- 修复（`fontra-core/src/path-functions.js` 的 `toggleSmooth` pass 3，curve-curve 分支）：
  写入前先判**无量纲共线度** `|in×out| / (|in|·|out|) < 1e-4`，共线就**跳过写入**，
  几何逐位不动；不共线仍走上游 `alignHandles`（保持上游行为与上游测试不变）
- 验证：修复后同一条 600×400 序列里，**只有第一次双击改几何**（ebedea50→9e46b38d→
  122a7dba），第③④下几何指纹恒为 `122a7dba`（含 `620.6664120325602` 这类分数坐标
  原样保留，不再被取整），曲率跳变恒 0.000；`npm test` **1215 passing / 0 failing**；
  `npx playwright test` **35/35**；`qa/verify-squircle-gesture.mjs` **7/7**；控制台零错误
- ⚠ QA 脚本自身也修了一处：三次贝塞尔端点曲率的 `e` 项此前误写成 `P3−2P2−P1`
  （应为 `+P1`），数值差 5~9 倍，一度让我误判"求解器没生效"。**测曲率别用
  "cross(n, 远手柄−P)/a²"那个近似式**——它是求解器内部定义，不是真实端点曲率

### R11-T11.4 · 节点类型即几何：降格改线段与手柄、Alt+双击只改标志、G2 允许微移节点（2026-10-15）
- 用户要求（原话）：**"squircle 再变 corner，现状是只改变图标，手柄和线段没变，我认为是有问题的。
  因为图标变成方形，线段还是曲线……corner，smooth，squircle 是线段的状态变换，线段，手柄都要
  随着状态图标改变而改变。如果不想改变手柄和线段，那就用 alt+双击。"** 随后选定 **"(a) G2 解允许
  微移节点"**
- 决策（ADR-0010 / ADR-0011）：
  - **状态即几何**：升格与降格都必须改几何。corner = 过节点两条直线（手柄落弦 1/3、2/3，
    **保留不删除**——手柄是邻段共享控制点；折角因此让给邻居）；smooth = 近手柄**旋转到共享切线
    并保持各自长度**（直线的 1/3 长度天然满足 ⟹ 直线被掰弯，曲线侧退化为上游 `alignHandles`）；
    squircle = G2 解。**`Alt+双击` = 只改标志**（`{geometry:false}` / `{allowNodeDrift:false}`），
    一个坐标都不动。
  - **G2 允许微移节点**：`path-curvature.js` 新增 `slideNodeForG2()`——节点**沿自身切线滑动、
    手柄原地不动**（FontLab Harmonize / Glyphs "effective node"），扫描+二分确定性求解，窗口
    ≤10% 短边；`makeSuperSmoothWithNodeDrift()` 与原地闭式解**取代价更小者**（节点位移与手柄
    位移 1:1 计价，平局保留原地解）。
  - **邻居修复**：一段的远端手柄属于邻居，钉直一边就会改动邻居的切线 ⟹ 沿轮廓向外走只修**自己
    弄坏**的节点（撞到第一个自洽节点即停）+ `enforceContourHonesty` 有界扫描收尾；修不动就
    **撤标志**（宁可少一个标志，不留撒谎图标）。**不信 solver 的 status，信 `nodeFlagsAreHonest`
    量出来的几何**（曲率**向量**同向+等大、G1 共线、角点两侧直线）。
- 本轮修掉的 5 个真 bug：①`slideNodeForG2` 只对齐曲率**大小**不查方向 ⟹ 把等大反向的**尖点**
  "修"成假 G2；②`makeSuperSmoothCurveToCurve` 的 `A_*C_>0` **必要不充分**（尖点能通过）⟹ 返回
  ok 前加曲率向量同向闸；③线↔曲线写回**两边都写**，把直线侧手柄搬到远端手柄位置 ⟹ 刚钉直的边
  被重新掰弯（现在只写曲线侧，求解器对直线侧返回的是"别动"哨兵）；④pass 3 的"已共线就跳过"
  把 `corner→smooth` 也跳过了 ⟹ **眼形图标压在两条直线上**（已改为旋转保长，两种情况一条规则）；
  ⑤节点滑动后按坐标硬定位的 QA 脚本失效 ⟹ 一律**就近定位**（插入点会移索引、滑动会移节点）
- 验证（**8801 e2e 隔离实例**，遵守 BUG-006 硬约束）：600×400 矩形四连双击实测——
  corner→smooth 曲率 4.74e-3/7.12e-3（跳变 33.4%）；smooth→squircle **节点滑 16.499** 到
  (738.33, 611.67)、手柄 (609,741)/(844,506) 分毫未动、跳变 **0.000**；squircle→corner 两侧
  曲率 **1.99e-18 / 4.13e-18（都是直线）**、手柄落回弦上；再 corner→smooth 又弯回
  3.87e-3/7.94e-3；按住 Alt 时四次手势几何一次不变。四角全 squircle 后降格一角：被降格角两侧皆直，
  两个邻居自动**降为 smooth**（共享边被钉直后 G2 不再可解 ⟹ 撤标志），对角仍 squircle 且 G2 精确。
  命令：`npm test` squircle **136 pass / 0 fail**（新增 T9 节点滑动 / T10 降格成真角+Alt / T11
  邻居无撒谎）、全包 **1215 passing**；`npx playwright test` **35/35**；
  `qa/verify-squircle-gesture.mjs` **7/7**；控制台零错误
- 决策记录：[ADR-0010](docs/adr/0010-node-slide-g2.md)（节点滑动）、
  [ADR-0011](docs/adr/0011-node-kind-state-is-geometry.md)（状态即几何）；
  实测脚本留存 `qa/measure-cycle.mjs`、`qa/audit-honesty.mjs` 作为该语义的回归证据
- ⚠ **线↔曲线接缝现在不给 squircle**（行为变更，诚实优先）：直线侧曲率恒 0，G2 要求曲线侧在节点
  处曲率也为 0 ⟹ 手柄取中点，而该方向不是直线方向 ⟹ **G1 与 G2 在单对三次段上互斥**。Glyphs
  靠移动有效节点 + 导出时新增点绕过，我们不实现，故拒绝且不写入任何坐标（ADR-0010/0011）

### R11-T11.5 · 线↔曲线 squircle（雨滴点）定案：渲染与导出时派生，屏幕≡导出由共享真值表锁死（2026-10-15）
- **本节只锁决策，实现未开始**（当前行为仍是 R11-T11.4 末尾那条"诚实拒绝"）；决策全文见
  [ADR-0012](docs/adr/0012-squircle-line-curve-derived-transition.md)
- 关键事实（本轮查证）：**导出是 Python 侧直接画存储路径**（`exportmanager.py` 的 `_drawGlyph()`
  → `sg.path.drawPoints(pointPen)`），所以"只在 JS 派生"到不了导出的字体 —— 用户要求
  **"屏幕与导出一致的"**，这否掉了"两份实现靠纪律同步"的默认形态
- 决定（一句话一条）：①**squircle 标志留在用户点的角上**（Glyphs 语义），不变量从"该节点接缝"
  改写为"该节点两侧**区域**"（曲线↔曲线那一档不变）；②**文件不动**，过渡在渲染与导出时**派生**；
  ③派生的构造 = 直线上后撤点 E + 过渡顶点 M + **保留原角 P 与原曲线**，两点两段（单段 cubic 装不下：
  G1+G2 同时成立 ⟹ 两个控制点都在直线上 ⟹ 该段是直线）；④**房间不足即拒绝**；⑤**只支持单 master**
  （多 master 会让插值与视觉都破坏，明确拒绝）；⑥**屏幕≡导出 = 一份真相表**：
  `test-common/` 放用例，Python 生成、JS 断言，两边测试同时读 —— 不一致即测试红；⑦灰点可视化
  （直线侧需要的空间、导出新增的点）画在只读图层
- 钩子位置（已查证，不改动）：画布 `visualization-layer-definitions.js` 的
  `fontra.edit.path.{fill,stroke,under.stroke}` 改读派生路径，而 `fontra.edit.editing.layers`
  **保持原始路径**（派生点不可编辑）；导出 `exportmanager.py` 的 `_drawGlyph()` 一处覆盖全部格式
- 同步修订口径：PRD「不做导出时新增小灰点可视化」与「不需要移动节点」两条非目标已标为被
  ADR-0012 / ADR-0010 推翻；ADR-0010 §6 加了指向 ADR-0012 的修订指引；
  AGENTS.md 新增硬约束「屏幕所见必须等于导出所得」
- 门禁：`node docs/lint.cjs` 通过（**82 篇**）

### R4-T4.27 · ADR-0012 落地：线↔曲线 squircle（雨滴）派生过渡 + 镜像朝向 + 救援扫描（2026-10-15）
- **镜像朝向补齐**（JS 侧缺口，用户点名的本轮目标）：曲线先到、直线后出的接缝，同一求解器跑
  控制点反转切片（[P, h1, h2, C]），派生 run 整体 reverse 后替换 [C, h2, h1, P]；与 Python
  参考逐行对齐（squircle_transition.py L719-742 语义）
- **诊断口径对齐 Python**：侧别分类改为"直线 = 零手柄、曲线 = 恰好 2 手柄"，其余一律
  refused/not-a-line-to-curve-join（JS 原来静默跳过）；开轮廓补 refused/open-contour
  （原来 JS 会派、Python 拒 —— 屏幕与导出漂移点，已封死）
- **救援扫描（rescue sweep，双侧同步）**：平滑矩形角产生的邻角接缝（直角、近手柄在弦上）
  收敛域极窄，主网格 23×16×6 恰好跨过（可行解 q≈0.85，网格只采样 0.84/0.88）。主网格全灭后
  以 q 步长 0.025（37 点）+ 加宽牛顿初值再扫一轮；只在全灭时触发 ⟹ 既有结果逐位不变。
  可行性考证：qa/explore-feasibility.py、qa/factcheck-py-derive.py（双侧判决一致性证据：
  canonical refused/no-solution 与镜像 ok 在两实现中完全一致）
- **手势接线（ADR-0012 语义）**：makeSquircle 在 establishedG1 之前查接缝（findLineCurveJoin），
  派生 ok 才落 0x18、存储零改动；拒绝则不落标志、几何不动。nodeFlagsAreHonest 对线↔曲线
  squircle 改测"区域派生成立"而非节点接缝（图标不撒谎）
- **真值表**：重生成（python -m fontra.core.squircle_transition），新增
  path-right-angle-corner-raindrop（矩形救援 case），共 6 join 级 + 6 path 级；既有 case
  数值零变化（tiny-setback attempts 2208→8128 为唯一表内差异，诚实反映额外尝试）
- 门禁：pytest test-py/test_squircle_transition.py 28 通过；mocha fontra-core 1219 通过
  （含真值表双边 + 手势 T4b/T4c："标志 ⟺ 派生、坐标逐字节不动"两种朝向）；浏览器探针
  （qa/probe-adr0012-v2.mjs 弧线几何）shift+双击落标志、画布渲染派生过渡、零控制台错误
- 文档：ADR-0012 状态头改"已落地"、新增「实现补充：镜像朝向与救援扫描」、验证节标注本轮达成项
