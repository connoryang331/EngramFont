# AGENTS.md — EngramFont 全栈架构与贴片开发规范

适用于 EngramFont 整体研发：`src-js/` 前端九个 workspace、`src/fontra/` 后端（Python）、
`docs/` 文档体系与 e2e 管线。本文件整体加载进每个 agent 的上下文——**只放定稿后的
架构事实、纪律与指针**，需求/测试/修复的细节一律放 `docs/` 对应桶（见 `docs/README.md`）。

核心原则（贴片纪律，详见 [ENGRAM-CHANGES.md](ENGRAM-CHANGES.md) 头部）：
**所有前端改动做在 `src-js/` 源里**；`src/fontra/client/` 是构建输出目录（webpack
destination），会被 `npm run bundle` 覆盖——改它等于白改。

## 需求文档（做特性前必读）

产品/行为级需求**一特性一包**，放在 **`docs/specs/NN-<特性>/`**（五件套：
PRD → SPEC → PLAN → TASKS → TEST；索引：[docs/specs/README.md](docs/specs/README.md)）。
**任何特性开发或行为改动前，先读对应特性包**；没有对应文档且需求来自用户口头 →
先按既有包的格式建包（PRD 含验收标准与被否决的反例）再动手。

### 需求的固定执行顺序（对所有 agent 生效，无豁免）

用户**明确提出一个需求**（特性 / 能力 / 行为改动）时，按此顺序执行，**不许先写代码**：

1. **先建特性包**：下一个编号 `NN-<特性>/`，写 PRD（验收标准、被否决的反例）+
   SPEC（技术规范、落点文件）+ TASKS（逐任务施工单）。
2. **等用户确认定稿**，再动代码。实现遵循贴片纪律（新增文件优先 > 一行注册 >
   原文件小改），每个任务一个 commit（`R<n>.T<x.y>:` 前缀）。
3. **实现完回填**：TEST.md 补用例结果与证据路径；ENGRAM-CHANGES.md 记贴片台账；
   架构级决策升格 ADR（`docs/adr/`，编号看 adr/README.md）。

- **无「任务太小」豁免**：设置面板一行、一个图标——一律先文档（本仓 2026-10-14 起定稿）。
- **bug 修复**不走特性包：复现 → 根因 → 修 → 回归 → `docs/bugfixes/` 记录（见下）。

## 测试文档（改完必跑必回填）

与特性一一对应：测试用例表（TC<n>）、运行方法、最新结果与证据路径，回填进该特性包的
**`TEST.md`**；测试代码统一放 `e2e/`（Playwright）与 `test-py/`/`test-common/`——
**TEST.md 只放测试记录，不放脚本**。

**改完特性先跑对应测试并把结果回填**；改坏旧用例 = 回归，先修再交。

### 测试标准：最低验证 + 分层回归

**底线（每次必做）**：每个新需求 / bug 修复，至少交付**直接覆盖被改代码**的那几个
套件的验证 + 回填。这是最低验证交付，不做 = 交付不完整。

| 改动位置 | 至少要跑 |
|---|---|
| `src-js/fontra-webcomponents/**` | `npm run bundle` + 受影响页面手测（设置页三面板过一遍） |
| `src-js/views-editor/**`（画布/工具） | `npm run bundle` + 相关 e2e spec + 画布手测 |
| `src-js/views-applicationsettings/**` | `npm run bundle` + 设置页手测 |
| `src-js/fontra-core/**`（共享层） | 所有**真的 import 了它**的视图的相关用例 |
| `src/fontra/**/*.py`（后端） | `test-py/` 对应套件 + 1 个 e2e 验响应形状 |
| 纯文档 | 不跑 |

**全量回归的判据**（满足其一才做，`npx playwright test` 全量 + pytest）：
① 时间到期（约 1 个月一次）；② 贴片累积较多、彼此可能牵连；③ 影响面大、
深入内核（`scene-model.js` / `canvas-controller.js` / `var-path.js` 等共享底层）。
其余时候按上表来。**偶发失败**：重跑一次确认；仍挂再判是否本次引入。

## 修复记录（修 bug 必留痕）

每个 bug 一份记录放 **`docs/bugfixes/`**（索引：[docs/bugfixes/INDEX.md](docs/bugfixes/INDEX.md)，
文件名 `YYYY-MM-DD-<主题>.md`）——现象 / 根因（指到文件与行）/ 修复 / 验证。
**修完 bug 先跑回归测试再写记录**；同区域二次起火先翻旧记录。

## 架构决策（ADR）

改架构、定口径、删机制 → 决策写 **`docs/adr/`**（下一个编号，格式与登记见
[docs/adr/README.md](docs/adr/README.md)）；本文件只沉淀定稿后的架构事实。

## 常用命令（Commands Quickstart）

| 场景 | 命令 | 说明 |
| :--- | :--- | :--- |
| **一键启动 / 重启（日常实例）** | `start-EngramFont.bat` | **需要重启服务器时一律用它**（详见下节）；Fontra 服务 :8800，根目录 `fontra-test-fonts`，起好自动开编辑器 |
| **前端构建** | `npm run bundle` | webpack → `src/fontra/client/`（改完前端必须跑） |
| **前端构建（监听）** | `npm run bundle-watch` | 改动即重建 |
| **前端单测** | `npm test` | workspace 内 mocha/chai |
| **后端测试** | `venv\Scripts\python -m pytest test-py` | Python 侧套件 |
| **e2e 回归** | `npx playwright test` | 自管理 8801 服务器 + `.e2e-fonts`（35 用例 ≈ 2min） |
| **贴片台账** | `ENGRAM-CHANGES.md` | 每个贴片一节，按时间追加 |

## 重启服务器（Restart Protocol）

**只要改动需要重启才能生效（改了 Python 后端 / 需要重载服务 / 服务卡死或端口占用），
一律用 `start-EngramFont.bat` 启动，不要手敲 `fontra.exe` 命令。**

顺序：

1. **前端改动先 `npm run bundle`**（改了 `src-js/` 时）——脚本只负责起服务，
   不会帮你构建；不构建就等于改了个寂寞。
2. **运行 `start-EngramFont.bat`**（`E:\engram-dev\EngramFont\start-EngramFont.bat`）。
   脚本**自带幂等处理**：先 `netstat` 找出占用 8800 的监听进程并 `taskkill`，
   再 `cd` 到仓库根 → 缺工程时新建 `Untitled.fontra` → 优先用 Windows Terminal
   起服务（回退最小化 cmd）→ 轮询 `/serverinfo` 等就绪（最多 ~50s）→ 自动打开
   `editor.html?project=Untitled.fontra`。所以**不必手工先停旧实例**。
3. **确认就绪**：`curl http://localhost:8800/serverinfo` 返回 200，再继续验证。

- **纯前端改动通常不必重启**：构建产物带内容哈希、刷新页面即可；**只有后端 Python
  改动或服务异常才需要重启**。
- **重启会断开用户当前会话**：若用户正在编辑器里操作，先确认再做（BUG-006 的同源风险）。
- **不要**为验证写操作另起服务器：写操作验证走 8801 隔离实例（`npx playwright test`
  自管理），见硬约束。
- ⚠ **历史坑（已修）**：脚本早期版本不处理端口占用，旧实例还在时会直接
  `OSError: [Errno 10048] ... bind on address ('127.0.0.1', 8800)`；
  更隐蔽的是——**旧服务仍在应答 `/serverinfo`，就绪轮询会立刻成功**，
  让人误以为新实例起来了。所以验证重启**要看 PID 变了没有**，不能只看 200。
  写批处理的 `for ... do ( ... )` 块时，`echo` 里**不能出现未转义的 `)`**，
  否则会提前闭合块、静默丢掉块内的 `taskkill`（本项目当场踩过）。

## 判例速查（要改什么 | 动哪里）

> 随贴片积累。新贴片若沉淀出「下次改 X 要动哪里」的知识，**必须**在这里登记一行；
> 细节链到 ENGRAM-CHANGES.md 对应节或 docs/ 文档。

| 要改什么 | 动哪里 |
|---|---|
| 应用设置面板的行（布局 / 新行类型 / 禁用逻辑） | `src-js/fontra-webcomponents/src/simple-settings.js`（`uiTypes` + `controlBuilders`；行统一「文字在前控件在后」，`combined` = 一 label 多控件，`disabledWhen` + `refreshDisabledStates`）+ 各 `views-applicationsettings/src/panel-*.js`（descriptions 数据）；卡片宽度在面板 `setupUI` 的 `max-width` |
| 节点外观设置（尺寸 + 每类型颜色 + reset） | `views-applicationsettings/src/panel-theme-settings.js`（`nodeAppearanceRow`：`sizeKey`/`colorKey` 可为 null）+ `theme-settings.js` 模型键（**单一 `nodeSize`** + `nodeSmooth/Corner/HandleColor`，含旧键 localStorage 迁移）；**三种节点同尺寸**，箭头随尺寸缩放但 gap 不缩放（ADR-0008） |
| 起始点方向指示（`>` / `<` 箭头） | `views-editor/src/visualization-layer-definitions.js` 的 `fontra.startpoint.indicator` 图层：方向取前进方向 `atan2(next-start)`，`save→translate→rotate` 后画顶点朝 +x 的 chevron；尺寸随 `nodeSize` 等比缩放、间隙恒为 `gap`（支撑距离 + gap，ADR-0007/0008） |
| 设置页色块形状（圆 / 方 / 眼形 / 超椭圆） | `fontra-webcomponents/src/simple-settings.js` 的 `.swatch-{round,square,eye,squircle}`；四者共用同一个 1.7em 盒子（保证行内控件同轴、形状互相对齐）；眼形用静态 `clip-path: polygon()` 按 `eyePath` 的 `4t(1-t)` 采样、在盒内按真实 2:1 比例居中；超椭圆因指数可调，`clip-path` 由 `squircleClipPath(exponent)` **内联生成**（与画布同 72 步采样、填满盒子） |
| 节点形状比例（眼形长宽比） | `visualization-layer-definitions.js` 顶部的 `EYE_HALF_LEN_FACTOR` / `EYE_HALF_WIDTH_FACTOR`（**单一真值源**，画布 `eyePath` 与起始点间隙计算共用）；改比例须同步 `simple-settings.js` 的色块 polygon（y% 的幅度 = 眼形半高占 1.7em 盒子的比例） |
| Squircle 节点（曲率连续 / G2） | 数学核心 `fontra-core/src/path-curvature.js`：原地闭式解 `b/a = sqrt(C_/A_)`（`A_=cross(n,hA-P)`）+ **节点滑动解** `slideNodeForG2()`（沿切线滑、手柄不动 = FontLab Harmonize / Glyphs effective node，窗口 10% 短边，`makeSuperSmoothWithNodeDrift()` 取**代价更小者**，ADR-0010）。⚠ 三处必须保留的闸：①`A_*C_>0` **必要不充分**——尖点（等大反向）能通过，返回 ok 前须查**曲率向量同向**；②沿切线滑**改变不了弯曲方向**（`cross(n,远手柄−P)` 在 `P→P+s·n` 下不变）⟹ 拐点直接拒绝；③**线↔曲线不做 squircle**：G1 与 G2 在单对三次段上互斥（中点法则破坏切线连续），拒绝且**一个坐标都不写**。数据层 `var-path.js` 的 `SQUIRCLE_FLAG=0x10`（Python 侧 `path.py` 的 `ON_CURVE_SQUIRCLE=0x18` 必须同步）；`path-functions.js` 的 `makeSquircle`（升格幂等；**不信 status，信 `nodeFlagsAreHonest` 量出来的几何**）+ `advanceNodeKind`（普通双击三档循环）；图标 `squirclePath`；指数经 **`glyphParameters`** 下发（**不可放 `screenParameters`**）（ADR-0009/0010） |
| 节点类型手势（双击 / Shift+双击） | `edit-tools-pointer.js` 的 `handleDoubleClick`：**普通双击 = `advanceNodeKind`**（三档循环）、**Shift+双击 = `makeSquircle`**（直达且幂等）。⚠ 四个坑：①当 Shift 按下、选区为空时要**回退到指针下的点**（Shift 是 symmetricDifference，首击会把点移出选区）；②`toggleSmooth` 会插入手柄而**偏移节点自身索引**，转换后必须**按坐标重新定位**；③`pointIndexUnderPointer` 的 `point` 是**场景坐标**、路径点是**字形坐标**，必须减 `positionedGlyph.x/y`（该偏移就是左边距，几乎不为 0——不减则"指针下有点"**恒不成立**），且只认 on-curve 点（手柄不携带节点类型）；④触发点集 = **选区里的 on-curve 点 ∪ 指针下的点**——选区可能**只剩手柄索引**（跨类型变更会重映射索引），只取选区会**记一条 undo 却什么都不改**。**Alt = 只改标志**（`{geometry:false}` / `{allowNodeDrift:false}`），普通手势一律"状态即几何"。回归脚本 `qa/verify-squircle-gesture.mjs`（undo-label 只读探针，防"手势被吞"伪装成幂等 PASS）、语义实测 `qa/measure-cycle.mjs` + `qa/audit-honesty.mjs`（ADR-0011） |
| 双击平滑/转曲（角点↔曲线点） | `fontra-core/src/path-functions.js` 的 `toggleSmooth`：pass 1 快照 → pass 2 只翻标志 → pass 3 算几何 → **pass 4 降格重建（ON_CURVE）**。pass 3：**把每个近手柄"旋转到共享切线、保持各自长度"**——直线的 1/3 长度天然满足 ⟹ 直线**被掰弯**（smooth 图标下不能还是两条直线），曲线侧则退化为上游 `alignHandles` 的保长旋转；两侧皆曲且已共线时**跳过写入**（否则 `roundVector` 会把 G2 解的分数坐标取整，曲率跳变回弹 0.07%→1.1%）；缺手柄的一侧按段长 1/3 插入并补远端手柄成 cubic；插入按绝对索引降序+同槽优先级（ADR-0006）。pass 4：降格把过节点的直线重建为 `[远端+t·(P−远端), P, P+t·(next−P)]`（手柄落弦上 1/3、2/3，**保留不删除**——手柄是邻段共享控制点），折角因此让给邻居，坐标**不取整**（ADR-0011） |
| 节点画布渲染（颜色 / 大小 / 形状 / 空心实心） | `views-editor/src/visualization-layer-definitions.js`（`nodeTypeColors` 亮暗两套 + `applyNodeAppearanceSettings` 无条件覆盖三个节点图层；形状：smooth 平滑点 = **眼形**（`computeSmoothTangents` 切线朝向，ADR-0005）、squircle = 超椭圆、角点 = 方块、手柄 = 小圆点；选中=实心+光晕、未选=空心） |
| 框选 / 斜向框选 | `edit-tools-pointer.js` 的 `handleRectSelect`（状态机：ctrl=角度、松开=定角缩放）+ `scene-model.js` 的 `selectionAtRect` / `selectionAtParallelogram`（剪切空间法）+ `fontra.rect.select` 图层绘制 |
| 设置面板行内图标按钮 | `icon-button` 组件——**必须** `createDomElement("icon-button", { src, onclick, ... })` 属性赋值；`new IconButton(src)` 构造参数不进属性系统（BUG-003）；图标走 `/tabler-icons/*.svg` |
| 键盘 dock 键帽 / 功能键 / 布局 | `views-editor/src/keyboard-dock.js`（`DOCK_FN_KEYS` 注册表、`KEYMAP-VERIFIED` 见 specs/03）；dock 主题 = `--kd-*` 变量（白天/黑夜，localStorage `engramfont-dock-theme`） |
| Proof/Edit 双模式 | `views-editor/src/canvas-mode.js` + `proof-toolbar.js`（localStorage `engramfont-canvas-mode`；proof 态隐藏 `#edit-tools`） |
| 浏览器内导出 TTF/OTF/WOFF2 | `src/fontra/filesystem/exportmanager.py`（`/exports/` 下载路由） |
| 字体导入 → 可编辑工程 | `src/fontra/filesystem/importfont.py`（`POST /api/import-font`） |
| 背景图上下文编辑 | e2e 见 `e2e/background-image.spec.mjs`；选择逻辑 `sceneModel._backgroundImageSelectionAtPointOrRect`（支持点 / 矩形 / 平行四边形三种查询） |
| localStorage 持久化 | 前缀 `engramfont-`，挂 ObservableController `synchronizeWithLocalStorage`（`theme-settings.js` 模式） |
| UI 零件（弹窗/菜单/图标按钮/设置组） | `src-js/fontra-webcomponents/src/`：modal-dialog · menu-panel · icon-button · grouped-settings |
| 菜单标题 / 品牌 | `fontra-menus.js` + `rebrand-identifiers.mjs`（改标识符必跑） |
| 上游同步 | `SYNC.md` 纪律 + `git` merge upstream；贴片台账即冲突清单 |

## 硬约束

- **agent 的写操作验证（改字形 / 删点 / 测交互）一律走 8801 e2e 隔离实例**（或先停用户的 8800 实例并征得同意）——**禁止对用户在线实例做无人化写操作**：Fontra 把修改以 change 广播给同工程的所有会话，双写互踩会让用户会话的 change 回放索引越界、画布状态被远端改动污染（BUG-006）。只读检查（截图 / 数据 dump）不受限。
- **改前端源码后必须 `npm run bundle`**——伺服的永远是构建产物；改完看不到效果先查这个。
- **需要重启服务器时一律用 `start-EngramFont.bat`**（先停旧实例、前端改动先构建）——
  不要手敲 `fontra.exe`；完整步骤见「重启服务器」节。
- **改 Untitled.fontra 等工程文件前先停 8800 服务**（双写互踩，EXECUTION.md 红线）。
- **不碰 `canvas-controller.js` / `scene-model.js` 核心绘制逻辑**——需要扩展时用
  **新增方法 / 新增图层**（先例：`selectionAtParallelogram`、`fontra.rect.select` 分支），
  不改既有函数体。
- **每个贴片必须在 ENGRAM-CHANGES.md 记账**（一节：改动 + 验证）；漏记账 = 贴片未完成。
- **不抄 meshfont 代码**（闭源）；行为对照即可。
- **组件属性必须走赋值**：继承 UnlitElement 且声明 `static properties` 的组件，
  构造参数不生效（BUG-003），一律 `createDomElement(tag, {...props})`。
- **e2e / 手测拖拽前做命中测试**：键盘 dock 覆盖画布下缘，落点必须断言是
  `#edit-canvas`（BUG-005）；测试里用 `setViewBox` 把字形放到 dock 带之上。
- **测试里算画布落点必须换算场景↔字形**：`canvasPoint()` / `localPoint()` 是**场景坐标**，
  路径点是**字形坐标**（scene = glyph + `positionedGlyph.x/y`，该偏移就是左边距）；
  `rect.x + canvasPoint(字形点)` 会整点偏掉一个左边距（本仓 H 字形 = 280 单位 ≈ 370px，
  落点跑到相邻线段上）。节点命中判据**不能**只查 `selection.some(s => s.startsWith("point/"))`
  ——**线段命中同样返回 `point/*`（两个端点）**，必须断言选区**恰好**是
  `[point/<节点索引>]`；断言"手势确实发生"要读 `editLayersAndRecordChanges` 的 undo 标签
  （只读探针），否则被上游分支吞掉的手势会被误判成"幂等 PASS"。
- **节点类型手势的不变量（图标不得撒谎）**：任何节点类型改动之后，该轮廓上每个节点的
  **图标都必须与几何相符**——corner = 两条邻边都是直线、smooth = 两侧手柄共线、
  squircle = 两侧**曲率向量**连续（同向且等大，只等大反向的尖点不算）。改到共享控制点
  就必须修**自己弄坏**的邻居（`repairBrokenNeighbours` 沿轮廓外走 + `enforceContourHonesty`
  有界扫描），修不动就**撤标志**、绝不留下撒谎的图标；**不信 solver 的 status，信
  `nodeFlagsAreHonest` 量出来的几何**。写完节点类型逻辑必须跑 `qa/audit-honesty.mjs`
  逐节点复核（ADR-0009 §4 / ADR-0011）。`Alt+双击` 是"只改标志"的出口（`geometry:false`），
  要保形时按住它，而不是把默认手势改成只翻标志。
- **屏幕所见必须等于导出所得**：任何"渲染时派生"的机制（当前：线↔曲线 squircle 过渡，
  ADR-0012）都必须有一份**共享真值表**放在 `test-common/`，由 Python（导出侧，参考实现）生成、
  JS（画布侧）断言，`pytest test-py` 与 `npm test` 同时读它——**禁止**两份实现各写各的靠人工同步，
  那正是 Glyphs 长期在付的漂移代价。导出唯一入口是 `exportmanager.py` 的 `_drawGlyph()`；
  画布入口是 `fontra.edit.path.{fill,stroke,under.stroke}` 三个图层，而 `fontra.edit.editing.layers`
  必须继续读**原始**路径（派生点不可编辑、命中测试仍按原路径）。
- **移动 `docs/` 文件必须同步更新引用方**（AGENTS.md / specs README / 代码注释 / 文档互引）。
