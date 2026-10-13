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
