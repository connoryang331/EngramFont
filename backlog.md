# Backlog — 待办与机制备忘

## Backlog-B1 · 空字形 mask（占位字）机制与改进候选（2026-10-13）

### 机制（源码依据）

空字形（尚未画轮廓）在字体总览/字形列表单元格里显示的灰色占位字，来源链路：

1. **渲染**：`glyph-cell.js`（GlyphCell）
   - 字形有轮廓 → `glyphController.flattenedPath.drawToPath2d` 画 SVG（真字形）；
   - 字形为空 → 渲染 `glyph-shape-placeholder` div：普通 HTML 文本，
     灰色 `#AAA`（`--glyph-shape-placeholder-color`），字号 = 单元格高度一半。
2. **字符推导**：`fontra-core/src/glyph-data.js: guessGlyphPlaceholderString(codePoints, glyphName)`
   - 字形有 cmap/码位 → `String.fromCodePoint(codePoint)`；
   - 否则拆字形名：先剥脚本后缀（`o_n.liga` → 基名 `o_n` + `.liga`），
     基名含 `_`（连字约定）→ 按下划线拆部件（`t_o_m` → ["t","o","m"]）；
   - 每个部件反查 Unicode：`glyph-data.csv` 数据库（33936 行，由
     `scripts/rebuild_glyph_data_csv.py` 从 glyphsLib 的 GlyphData.xml 生成，
     与 Glyphs.app 同源命名库）或 `uniXXXX` / `uXXXXXX` 命名模式；
   - **全部部件解析成功** → 拼接为 mask 文本（`o_n` → "on"、`f_f_i` → "ffi"）；
     `.init/.medi/.fina` 位置变体自动插 ZWJ（U+200D）；方向（rtl/ltr）取首部件；
   - **任一部件解析失败 → mask 整体放弃**，占位字符串为空，单元格只剩
     底下的字形名标签。
3. **形状来源**：占位字就是一段 Unicode 文本，由**浏览器/操作系统回退字体**
   渲染（汉字走系统字体如微软雅黑）——Fontra 不内置这些形状。
   一旦画出轮廓，占位字消失、显示真字形。

### 现状缺口

- 连字若**不按下划线命名**（如 `on.liga`、`tom` 单 token），或部件名不可解析
  （既不在 GlyphData 也不是 uniXXXX），则**没有 mask**——单元格空白。
- `on` / `tom` / `ab` 这类名字不会被拆分（无 `_`），"on" 也不是可解析的
  AGL/uni 名。

### 改进候选（按优先级）

- [ ] **P1 · 不可解析连字的降级占位**：`guessGlyphPlaceholderString` 推导失败时，
  降级显示字形名文本（或剥掉后缀的基名）作为 mask 文字，避免空白单元格；
- [ ] **P2 · 占位字指定渲染字体**：占位 div 目前走系统回退字体；可选给
  `glyph-shape-placeholder` 指定 `font-family`（内置一款参考字体），让 mask
  形状跨平台一致；
- [ ] **P3 · 自定义名映射**：给 `rebuild_glyph_data_csv.py` 的生成流程加
  自定义名字 → Unicode 映射的扩展入口（私有区名等）；
- [ ] **P4 · mask 外观设置**：`#AAA` 颜色/字号是否进设置面板（低优）。

### 相关对照

- **Glyphs.app**：命名数据库同源（GlyphData.xml），空字形占位字同样为
  系统字体渲染的 Unicode 字符；
- **FontLab**：其 "Mask" 是另一概念——手动放置的参考层（别的字形轮廓
  垫在编辑字形后面，存于字体文件），与本机制的"空字形自动占位"不同。

## Backlog-B2 · Glyphs.app Pointer（Edit/Select Tool, V）交互参考（2026-10-13）

来源：Glyphs Handbook — Edit View → Editing Paths（handbook.glyphsapp.com）。
用途：dock 指针工具（6 键）交互对齐 Glyphs 的参考清单。

### 选择
- 拖拽 marquee 矩形框选；**Option** 拖拽忽略手柄、只选 on-curve 节点；
- **Control** + 拖拽：选框旋转（斜体沿倾斜方向框选）；
- 单击选节点/线段；**Shift** 单击扩展或缩减选择；
- 双击线段附近 = 选中整条路径；
- 手柄可单独选中（Shift 组建非连续多选）；
- 单点选中后 **Tab / Shift-Tab**：路径上下一个/上一个点；
- 反选 Cmd-Opt-Shift-I；全部取消 Cmd-Opt-A。

### 移动
- 鼠标或方向键；移动节点时挂连手柄跟随；
- **Shift** 方向键 = 10 单位；**Command** 方向键 = 100 单位；
- **Option** + 移动 = 只动选中点、手柄留在原地；
- **Control+Option** 拖拽 = 弹性微调（周围未选手柄按比例跟随）。

### 手柄
- **Option** + 移动手柄 = 保角度只变长度；
- 平滑节点 **Control+Option** + 移动手柄 = 长度角度镜像复制到对侧；
- 拖线段 = 两端节点+手柄齐动；**Option** + 拖线段 = 只变手柄长度保角度。

### 双击与转换
- 双击节点或 **Return** = 角点 ↔ 平滑点（Option 保持轮廓不变形）；
- **Option** + 单击直线段 = 直线 → 曲线（删手柄反向）；
- **Opt-Shift-Return** / Shift+双击 = super-smooth（星形/raindrop）节点。

### Edit View 其他
- 文本模式 **Esc** 使光标右侧字形进入编辑；工具快捷键（V = Select）；
- 双击字形进入编辑；Font View 中 Cmd-Down 打开选中字形组；
- Info box 数字字段上下键增减（Shift 步进 10）。

### 对照 dock 待办
- [ ] dock 指针工具是否补齐：Tab 循环选点、双击选整条路径、
  Option 拖拽忽略手柄、Control 旋转选框（低优，按需）。

## Backlog-B3 · FontLab Pointer（= Contour tool, A）最新文档参考（2026-10-13）

来源：FontLab 8 Help（help.fontlab.com/fontlab/8）。注意：FontLab 8 的修订版
manual 尚未发布，官方指路 FontLab 7 manual + FL8 教程；当前文档里
**没有字面叫 "Pointer" 的工具**——节点选择/编辑的主力工具是 **Contour tool
（A 键）**，工具箱另有五个开关：Power Nudge / Nudge / Harmonized drag /
Slide / Lever（FL8 新增）。

### 文档 URL（均已验证 200）
- Contour tool 主页：https://help.fontlab.com/fontlab/7/manual/Contour-tool
- Selecting Points：https://help.fontlab.com/fontlab/7/manual/Selecting-Points
- Moving Points：https://help.fontlab.com/fontlab/7/manual/Moving-Points
- Active Points vs Selected Points：https://help.fontlab.com/fontlab/7/manual/Active-Points-vs-Selected-Points
- Editing an Existing Glyph：https://help.fontlab.com/fontlab/7/manual/Editing-an-Existing-Glyph
- Using the Glyph Window：https://help.fontlab.com/fontlab/7/manual/Using-the-Glyph-Window
- Preferences for Editing：https://help.fontlab.com/fontlab/7/manual/Preferences-for-Editing
- FL8 What's New（Edit & refine 五开关）：https://help.fontlab.com/fontlab/8/whats-new/whats-new-03-edit-refine/
- FL7 manual 总目录：https://help.fontlab.com/fontlab/7/manual/

### 选择
- 单击节点选中（变红）；**Shift** 单击加选；**Alt/Cmd** 单击去选；
- 单击线段 = 子选该段（可在 Preferences 切换为整条）；
- 整条轮廓：**双击轮廓**或 **Alt** 点轮廓旁空白（Shift 变体加/减选）；
- marquee：空白处拖拽矩形；**Alt** 拖 = 自由套索；**Shift** 拖 = 加/减选；
  手柄默认不进框选（Preferences 可改）；
- 点空白取消选择；点漏了用 **PgUp/PgDn** 循环补选；
- 临时唤起：按住 A（或 Cmd，按 Preferences）；松开回原工具。

### 移动
- 拖拽/多选拖拽；**Shift** 拖 = 水平/垂直约束；
- 拖动中出现红色点状吸附建议；按住 **Ctrl** 临时禁用吸附；
- **PgUp/PgDn** 循环选中正确节点；**`** 键 = 即时高质量打印预览。

### Bézier 修饰键（拖两曲线交点的节点）
- **Alt**（平滑关节）= 沿两侧控制点连线方向移动；尖角 = 只动节点不动控制点；
- **Alt+Cmd**（平滑）= 保持曲率最优（四控制点联动）；
- **Alt+Shift** = 节点沿段滑动，手柄重算保形；
- **Shift**（点控制点前）= 控制向量方向不变；
- **Shift** 双击（近水平/垂直对齐时）= 吸附对齐。

### 双击行为
- 双击节点 = Sharp ↔ Smooth（曲线+直线交点处 Sharp → Tangent）；
- 尖角 + **Alt** = 归一化尖角（两侧手柄自然化）；
- 尖角 + **Shift+Alt** = **Smart Corner**（非破坏圆角/墨阱，双击改半径，
  右键永久化）；
- 平滑 + **Alt** = 调和（两侧曲率相等 Harmonize）；
- 平滑 + **Shift+Alt** = **Genius 节点**（移动手柄仍保持调和）；
- 尖角节点的手柄双击 = 对齐到对面手柄角度；**Shift** 双击手柄 = 吸附水平/垂直。

### 线段操作
- 拖未选中的段任意处 = 变形（临时点吸附网格/参考线）；**Ctrl+Alt** 点线段 =
  转曲线；点曲线段 = **Balance**（等比手柄）；**Alt** 拖选中段 = 复制该段；
- 插入节点：**Ctrl+Alt** 点段；**Shift+Ctrl+Alt** = 极值点；
- 删除：BkSp 删节点/手柄（轮廓保持闭合；Del 会打断轮廓——Preferences 可配）；
  **Shift+Alt** 单击手柄 = 收回手柄（曲线转直线）；
- **Power Nudge**（Shift+C / 拖动中按 C）：FontLab 自动判定"仆从"节点按比例跟随；
- **Tunni Lines**（L）：曲线双手柄同步移动、平衡曲率张力；
- **Lever**（FL8）：可拖出比指针距离更小的精确位移（Preferences > Distances）。

### 对照 dock 待办
- [ ] dock 指针工具可考虑对齐 FontLab 的特色：Alt 沿线滑动节点、
  Shift+Alt 吸附对齐、Power Nudge 类"仆从节点"跟随、PgUp/PgDn 循环补选
  （低优，按需）。

## Backlog-B4 · Pointer 工具三家对比（Fontra vs Glyphs vs FontLab，2026-10-13）

Fontra 侧依据本仓库源码（`edit-tools-pointer.js` + `edit-behavior.js`），
Glyphs/FontLab 依据 B2/B3 文档研究。

### 命名与键位
| | Fontra | Glyphs.app | FontLab 8 |
|---|---|---|---|
| 名称 | Pointer tool | Select tool | **Contour tool** |
| 快捷键 | V | V | A |
| 文档 | 源码即文档（开源） | handbook.glyphsapp.com | FL7 manual（FL8 版 manual 未发布） |

### 选择
- 共同：单击选节点/手柄、Shift 加减选、空白拖拽 marquee、点空白取消；
- **Fontra**：marquee 矩形；双击线段附近 = 选该轮廓**全部 on-curve 点**；
  Alt+悬停线段 = 预览插点（转笔刀插入手柄）；选中后出现**缩放/旋转手柄**
  （Shift 锁比例/步进角）；Tab 循环选点，**Alt+Tab 按轮廓跳**，Tab 还会跨类型
  （点→组件→锚点→参考线）；
- **Glyphs**：marquee（Option 忽略手柄、Control **旋转选框**——独有）；
  双击线段 = 选整条路径（含手柄）；Tab 只在点间循环；
- **FontLab**：marquee + **Alt 拖 = 自由套索**（独有）；双击轮廓 = 选整条
  （含手柄）；点漏了 **PgUp/PgDn** 循环补选（独有）；Alt/Cmd 单击 = 去选。

### 移动与修饰键哲学（最大差异点）
- **Fontra**：拖拽中实时切换**四种行为**——default / **Shift** 约束
  （水平/垂直/45°）/ **Alt** alternate（规则引擎按节点类型重算手柄）/
  Shift+Alt；修饰键中途变化会**先回滚再套用新行为**；多层同时实时编辑记录 undo；
  拖节点到开口端点 = **自动连接轮廓**（connectContours，独有）；
- **Glyphs**：Option = 只动点不动手柄；Shift = 约束；Control+Option 拖 =
  弹性微调；方向键步进 **Shift=10 / Cmd=100 单位**；
- **FontLab**：Alt 家族语义最丰富（沿控制点连线滑、沿段滑、曲率最优联动）；
  **Power Nudge**（仆从节点自动跟随）、**Lever**（比指针更小的精确位移）、
  方向键步进同 Glyphs（Shift=10/Cmd=100）。

### 双击语义
- **Fontra**：节点上 = toggle smooth↔corner（多层一致）；组件上 = 进入组件
  编辑；锚点/参考线上 = 打开对应编辑；未定义字形上 = 弹出建字形；
- **Glyphs**：节点上 = smooth↔corner；**Opt-Shift-Return = super-smooth
  （星形节点）**（独有）；Option+点直线段 = 转曲线；
- **FontLab**：最重的双击语义——尖角 Alt = 归一化、Shift+Alt = **Smart
  Corner**（非破坏圆角/墨阱）、平滑 Alt = **Harmonize**、Shift+Alt =
  **Genius 节点**（独有）。

### 删除/其他
- FontLab：BkSp 删节点保持闭合 vs Del 打断轮廓（可配）、Shift+Alt 收手柄、
  Alt 拖段复制、`` ` `` 即时预览——语义最细；
- Fontra：BkSp/Del 删除选中（canvas 层处理）；` 无预览键；
- Glyphs：节点删除走 Edit 菜单/快捷键。

### 对 dock 的启示（按需）
- [ ] Fontra 已有 Tab 循环（含 Alt 按轮廓）——比 Glyphs 强，保留；
- [ ] 可考虑借鉴：Glyphs 的 Control 旋转选框、FontLab 的自由套索、
  Power Nudge 类跟随、双击的 FontLab 式重语义（Harmonize/Smart Corner）——
  均为低优增强。
