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
