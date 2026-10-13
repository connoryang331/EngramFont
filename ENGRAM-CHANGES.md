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
  再收一级（400 = n 行 429 − 29）

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
