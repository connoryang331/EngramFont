# R3 · 键位实测表（KEYMAP-VERIFIED）

> 全部语义经 meshfont 克隆 aria-label 实证（probe-keys.mjs + elementsFromPoint）。
> 本表为 keyboard-dock 实现的权威依据；SPEC.md §7 的占位猜测作废，以本表为准。
> 键帽上下双字符（如 `!1`）= shift 变体。

## 布局（5 行，共 28 键 + 1 进度键）

### row1 · 数字行 + DEL
| 键帽 | aria / 语义 |
|---|---|
| ~ ` ｜ ! 1 ｜ @ 2 ｜ # 3 ｜ $ 4 ｜ % 5 ｜ ^ 6 ｜ & 7 ｜ * 8 ｜ ( 9 ｜ ) 0 ｜ _ - ｜ + = | 每键上=shift 字符、下=本字符；点击切换到该字形 |
| **DEL（橙，跨2键）** | aria: `delete` |

### row2 · 网格开关 + q 行
| 键 | 语义 |
|---|---|
| **紫（跨2键）** | aria: `tab: show or hide the grid` —— **网格显隐开关** |
| q w e r t y u i o p { [ } ] \| | 字母/符号键 |

### row3 · 粗细滑块 + a 行 + proof/edit 模式键
| 键 | 语义 |
|---|---|
| **黄（跨2键）** | aria: `letter thickness`，class: `ls-grab` —— **笔画粗细拖拽滑块** |
| a s d f g h j k l ; ' | 字母键（当前字形键高亮，如截图中的 d）|
| **蓝（跨2键，label 上下文切换）** | edit 态显示 `view`（斜体）→ 点击进 proof；proof 态显示 `edit` → 点击回编辑 |

### row4 · 侧边距滑块 + z 行
| 键 | 语义 |
|---|---|
| **红（跨2键）** | aria: `shift-l`，class: `ls-grab` —— **左边距（left sidebearing）拖拽滑块** |
| z x c v b n m < , > . ? / | 字母/符号键 |
| **绿（跨2键）** | aria: `shift-r`，class: `ls-grab` —— **右边距（right sidebearing）拖拽滑块** |

### row5 · 控制行
| 键 | aria | 语义 |
|---|---|---|
| ctrl | `ctrl` | 修饰键 |
| （灰） | `empty key` | 占位（原站就是空的） |
| alt | `alt: remove anchors` | **按住/点击移除选中字形的锚点** |
| **move（宽，8键位）** | `move` | **画布平移模式**（拖画布移动视窗） |
| 红 ⊞ | `snap to grid: off` | **网格吸附开关**（toggle，aria 随状态翻转） |
| 黄 ○ | `snap to guides: on` | **参考线吸附开关**（toggle） |
| 蓝 # | `editor mode: bezier` | **bezier ⇄ mesh 编辑模式切换**（toggle，切 mesh 后 aria 变 `editor mode: mesh`） |
| 米 a | `outline view: off` | **轮廓/实心视图切换**（toggle） |

### 附加键（键盘上方）
| 元素 | aria | 语义 |
|---|---|---|
| EN 0/142 | `EN: 0 of 142 letters edited`，title: `Next letter` | 进度计数，**点击跳下一个字母** |

## 与 Ton/vance/ed 规则的关系
- 字母键切换字形 → 上下文规则（`sub [ance dance vance] d' by ed;`）在 EngramFont 中照常生效
- 三个拖拽滑块（thickness/shift-l/shift-r）是 meshfont 的**笔画系统**专属（依赖其 stroke 引擎）；
  EngramFont 首版 Dock 中渲染为占位（disabled），待自有笔画/侧边距能力就绪后接线——
  shift-l/r 可直接映射为 Fontra 的 left/right sidebearing 编辑（fontinfo/metrics 已有数据）

## 实现注记
- 键帽双字符：上=shift 字符，下=本字符；当前字形键高亮（背景变亮，见截图 d 键）
- aria-label 全部保留原站文案（英文），i18n 后续覆盖
- 三个滑块与 4 个 toggle 的状态高亮：off/on 直接反映在 aria 与底色（红=off，黄/绿/蓝=on 的示例）

## 实现分类（逐键定案 · 已查证 Fontra 源码）

### A · 直接接线（Fontra 已有，纯接线）
| 键 | 接线点 |
|---|---|
| 字母/数字/标点键（导航） | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}`（editor.js:864 同款）|
| 字形缺失→创建 | editor.js:860 起的 create-new-glyph 对话框流程 |
| DEL | `sceneSettings.characterLines` 末字符移除（text-entry 同一 controller）|
| space | characterLines 追加空格 |
| **shift-l / shift-r 滑块** | **panel-selection-info.js:234 已有 sidebearings 编辑通路**（含 LSB↔RSB 联动 :894-941）——滑块值驱动同一变更 |
| 网格显隐（紫） | `fontra.upm.grid` 可视化层已存在（visualization-layer-definitions.js:41）——接线其可见性开关 |
| 100% 缩放复位 | editor.js:3420 `_zoom` / viewBox 直设 |
| view/edit 模式键 | R5 canvasMode（规格已设计）|
| ctrl / 空占位 | dock 内部状态 / 纯渲染 |

### B · 新增代码（小，Fontra 没有）
| 键 | 实现 | 估时 |
|---|---|---|
| EN 0/142（下一字母） | glyphMap 排序循环 + selectedGlyph 设置 | 0.25d |
| snap to grid（红⊞） | 编辑工具加网格吸附计算 + 开关 | 0.5d |
| snap to guides（黄○） | 对 guidelines 吸附计算 + 开关 | 0.5d |
| outline view（米a） | 新可视化层（描边渲染模式） | 0.5d |
| move（平移开关） | canvas 拖拽行为切换（pan 持久模式） | 0.5d |
| alt（remove anchors） | 清空当前字形 anchors 的小 action | 0.25d |

### C · Fontra 没有 / 不做
| 键 | 原因 |
|---|---|
| letter thickness 滑块（黄胶囊） | 依赖笔画系统（轮廓加粗引擎）——Fontra 无，engram 首版禁用占位 |
| 蓝 #（bezier ⇄ mesh） | mesh 模式已决策不做 → v1 移除该键位 |

## 实现决策（2026-10-11 用户定案）

| 键 | 决策 | 说明 |
|---|---|---|
| letter thickness（黄胶囊） | **要做** | 依赖说明：meshfont 便宜是因为其字形为笔画骨架生成（thickness=生成参数）；EngramFont 轮廓字形的 thickness=**轮廓偏移**（需路径偏移引擎，如 skia-pathops wasm，含自交处理）→ 放 P2/第二批，选型另议 |
| 蓝 #（bezier⇄mesh） | **占位按键** | 渲染禁用占位，不实现 |
| snap to grid（红⊞） | **不做（占位）** | Fontra 源码无任何吸附机制（grep snap/magnet 零命中），用户判定不需要 |
| snap to guides（黄○） | **Fontra 没有吸附机制**；首版占位 | 如需：拖拽点对 guideline 坐标吸附 ≈0.5d 新增 |
| outline view（米a） | **做：渲染模式开关** | Fontra 字形=Path2D 填充渲染（glyph-controller.js:710 flattenedPath2d）；outline view=绘制点切 fill→stroke（带 strokeWidth）；canvas 当前无双击手势（meshfont 用键切，EngramFont 跟随用键；"双击笔画/空白"手势可作备选交互） |

### Dock 键位定案（v1 实现范围）
**实做 12 键**：字母/数字/标点导航、DEL、space、move、100%、网格显隐、outline view、view/edit 模式键、ctrl/alt
**占位 4 键**：蓝#（mesh）、snap to grid、snap to guides、letter thickness（P2）
**移除 1 键**：无（红/绿滑块保留=sidebearing 接线）

## 实现决策修订（2026-10-11 晚 · v2）

| 键 | 修订 | 说明 |
|---|---|---|
| snap to guides（黄○） | **升级为实做** | Fontra 无吸附机制（已查证）→ 新增：拖拽点对 guideline 坐标吸附计算 + 开关，≈0.5d |
| outline view（米a） | **改双击手势，键占位** | 交互定义：双击笔画 → 实心（filled/edit 态）；双击空白处 → outline 视图（线框）。实现=canvas 新增 dblclick 处理器（当前无）+ 渲染模式标记（fill⇄stroke 切换）。双击画布空白的命中判定=未命中字形轮廓的区域 |
| snap to grid（红⊞） | 占位（不做） | 用户判定不需要 |
| 蓝 #（bezier⇄mesh） | 占位（不做） | 维持前案 |

### Dock v1 范围（修订后）
**实做 14 键**：字母/数字/标点导航、DEL、space、move、100%、网格显隐（紫）、**snap to guides（新）**、view/edit 模式键、shift-l/r 滑块（sidebearing 接线）、ctrl/alt
**占位 4 键**：蓝#（mesh）、snap to grid、**outline view（改双击手势）**、letter thickness（P2，轮廓偏移选型）

### outline view 双击手势 · 实现要点
- canvas 现无 dblclick 处理器（已查证）→ 新增 dblclick 监听
- 命中判定：dblclick 位置落在当前字形轮廓内（flattenedPath2d isPointInPath）→ 切实心；
  落在轮廓外（空白）→ 切 outline 线框
- 渲染分支：绘制点 fill⇄stroke（strokeWidth 按屏幕像素）
- 状态：内存（不持久化），编辑工具照常可用

## 语义修正（2026-10-11 晚 · v3 · 用户实测权威，覆盖 aria-label 误标）

| 键 | aria-label（误导） | **实际语义（用户确认）** |
|---|---|---|
| 紫（跨2键，row2 左） | `tab: show or hide the grid` | **显示/隐藏锚点**（字形上的贝塞尔控制点显隐切换） |
| 绿（跨2键，row4 右） | `shift-r` | **增加锚点 / 减少锚点**（锚点数量增减滑块：沿路径加密/简化控制点） |
| 红圈（row4 左） | `shift-l` | 未纠正——按 aria 保留记录，实现时以用户实测为准 |
| 黄胶囊（row3 左） | `letter thickness` | 未纠正——笔画粗细滑块 |

### 对实现的影响
- 紫键：接线到"锚点显隐"渲染标记（Fontra 可视化层新增或现有设置；锚点数据模型 Anchor 已存在）
- 绿滑块：**路径控制点增密/简化操作**——新编辑能力（沿曲线插值加点 / 按容差抽稀删点），
  非简单开关；工作量上调至 1-1.5d，且依赖轮廓数据模型的点操作 API
- 红圈 shift-l：维持原记录，实现时与用户核对一次

## 语义修正 v4（2026-10-11 深夜 · 用户实测权威）

| 键 | 修正 |
|---|---|
| 红圈（row4 左） | **背景网点显示滑块**（调节画布背景网点/点阵密度的拖拽滑块）——**占位**（v1 不实现） |
| stroke width | **Fontra 没有**：Fontra 是轮廓字形（filled outlines），无描边宽度概念。meshfont 的 thickness 滑块能工作是因为其字形由笔画骨架生成（width=生成参数）。EngramFont 做 thickness 的两条路线：① 字形保留笔画骨架数据（customData），thickness=按骨架重生成轮廓（推荐——若引入 engram-generator 遗产的骨架表示）；② 轮廓偏移引擎（stroke-to-outline：skia-python getFillPath 或 wasm 方案，含自交处理，中等偏上难度）。→ 维持 P2 选型 |

## 功能名映射表（meshfont ↔ Fontra · 同功能不同名）
> 过夜会话照此对表，不要把"名字不同"误判为"功能缺失"。

| meshfont 名称 | Fontra 名称 | 状态 |
|---|---|---|
| upload image / Trace a photo | **Add Background Image...**（action.glyph.add-background-image） | ✓ 已有（opacity 滑块在 selection-info 面板；replace 缺 → R7；remove 已有）|
| （背景图移动/编辑解锁） | **Unlock Background Images**（action.unlock-background-images）/ Lock（对偶） | ✓ 已有 |
| proof 预览（排版打样） | text-entry 多行画布 + lineMetrics 导线层（R5 补齐预设/全宽） | R5 |
| edit 模式 | 编辑态（现状） | ✓ |
| soften curves | （无）→ R6 | 待实现 |
| straighten | （无）→ R6 | 待实现 |
| make circle | （无）→ R6 | 待实现 |
| 锚点增减绿滑块 | （无）→ R6 锚点密度 | 待实现 |
| letter thickness 滑块 | （无，轮廓字形无描边概念） | 占位/P2 |
| 蓝 #（bezier⇄mesh） | （无 mesh） | 占位 |
| 导出字体 | Export As（缺 ExportManager 实现） | R1 |
| 导入字体→可编辑 | OTFBackend 只读（缺转换） | R2 |

## 语义状态标注 v3.1（2026-10-11 深夜）
| 键 | 状态 | 当前认定语义 | 依据 |
|---|---|---|---|
| 紫（跨2键） | ✅ 用户确认 | **显示/隐藏锚点** | 用户实测（aria "show or hide the grid" 为误标）|
| 绿（跨2键滑块） | ✅ 用户确认 | **增加锚点/减少锚点**（锚点密度滑块） | 用户实测（aria "shift-r" 为误标）|
| 黄胶囊滑块 | ✅ aria+用户未否 | 笔画粗细滑块（letter thickness） | aria 自述 + 用户未纠正 |
| 红圈滑块 | ⚠️ 待执行时验证 | 推测：左边距类拖拽（aria "shift-l" 有误导前科） | aria + 位置（左列） |
| view/edit（蓝） | ✅ 用户截图互证 | proof ⇄ edit 模式切换 | 两张截图的上下文标签 |
| 蓝 #（小键） | ✅ aria+前会话 | bezier ⇄ mesh 模式切换 | aria + NOTES 历史 |
| DEL（橙） | ⚠️ 待验证 | 删除（具体对象执行时确认） | aria "delete" |
| move（宽） | ⚠️ 推测 | 画布平移模式 | 标签自述 |
| 红⊞/黄○（小键） | ⚠️ 推测 | 吸附开关（grid/guides） | 标签自述 |
| 米a（小键） | ✅ 用户决策 | 占位（outline 改双击手势） | 用户指令 |

## v5 · 双功能上下文键位表（2026-10-11 深夜 · 用户定案 · 最终版）
> **同一组滑块/按键在两种模式下功能不同**——这是 meshfont 键盘设计的核心。
> 之前所有"单语义"表格作废，以本表为准。

| 键 | **edit 模式**（字形编辑） | **view/proof 模式**（排版打样） |
|---|---|---|
| 紫色 | 显示/隐藏锚点 | **Metric lines 显隐**（导线开关）|
| 黄滑块 | letter thickness（笔画粗细，P2） | **letter spacing（字母间距）** |
| 红滑块 | 背景网点显示（占位） | **Word spacing（词间距）** |
| 绿滑块 | 增加锚点 / 减少锚点 | **Line height（行高）** |
| DEL | meshfont: reset letter → **EngramFont: reset 文本** | meshfont: reset space → **EngramFont: reset 文本** |
| view/edit（蓝） | 显示 `view` → 进 proof | 显示 `edit` → 回编辑 |
| move | 平移 | 平移 |
| 红⊞/黄○ 吸附 | 编辑吸附开关 | proof 态不适用 |
| 米a outline | 占位（outline 改双击手势） | proof 态不适用 |

- view 态的四个排版控制 = **实时调整 proof 视图**（词间距/字间距/行高/导线显隐）——
  这就是 R5 proof 模式的排版控制交互（不新增控件，复用 Dock 滑块）
- 实现：滑块 handler 按 canvasMode 分派到不同后端（edit→字形编辑 API；view→sceneSettings
  的 wordSpacing/letterSpacing/lineHeight/canvasMode 导线开关）


## 实测键帽色值（meshfont 原色 · 视觉 1:1 用 · 1600px 视口采样）
| 键 | background（rgb） | hex |
|---|---|---|
| 普通键（数字/字母） | rgb(45,45,48) | #2D2D30 |
| 当前选中字形键 | rgb(232,230,225) | #E8E6E1 |
| DEL（橙） | rgb(255,135,65) | #FF8741 |
| 网格显隐（紫） | rgb(156,111,255) | #9C6FFF |
| 粗细滑块（黄胶囊） | rgb(234,215,48) | #EAD730 |
| shift-l（红） | rgb(255,81,81) | #FF5151 |
| shift-r（绿） | rgb(0,175,88) | #00AF58 |
| view/edit（蓝） | rgb(6,102,238) | #0666EE |
| move（宽，深灰） | rgb(60,60,64) | #3C3C40 |
| snap-grid（红，off 态） | rgb(255,81,81) | #FF5151 |
| snap-guides（黄，on 态） | rgb(234,215,48) | #EAD730 |
| mode-bezier（蓝） | rgb(6,102,238) | #0666EE |
| outline（米） | rgb(234,215,201) | #EAD7C9 |
| 画布背景（浅主题） | #faf9f7 系 | —— |
- toggle 键的 on/off 底色策略（红=off、黄/绿/蓝=on 的示例）实现时再采（切一次对比）
- 暗色主题色值：执行时切暗色采样补录

## v5.1 DEL 行为定案（2026-10-12）
- **DEL = 恢复默认预览文本**（两模式统一）：动态默认 = 工程 glyphMap 顺序前 40 个有 codePoint 的字形拼串
- 详见 R5 SPEC §11（含与 Fontra/meshfont 默认行为的对照与理由）
