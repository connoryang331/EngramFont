# R5 · Proof/Edit 双模式画布 · 需求文档（PRD）

## 背景
meshfont 的画布有两种模式：**proof（打样预览）**——整段文本按排版渲染，
带 ascender/mean line/baseline/descender 全宽导线，配 5 种预览预设；**edit（编辑）**——
聚焦字形编辑。键盘 Dock 的 proof/edit 模式键切换。

**Fontra 已有的 80%**（源码实证）：
- 多行排版：scene-model.js:471/561（lineHeight 堆叠）✓
- metrics 导线层：fontra.lineMetrics（默认开启，含 alignment zones）✓ 但按单字形宽度画
- 点击文本中字形直接编辑 ✓
- 字号/行高控件 ✓

## 目标
- 画布模式状态机：edit ⇄ proof（预留 mesh）
- proof 态：全宽 metrics 导线（横跨整行而非单字形）+ 编辑工具禁用 + 预设文本一键填入
- 持久化：模式记忆（localStorage）

## 用户故事
- 我点 Dock 的 proof 键 → 画布变成整段文本打样视图（导线横贯全行）→ 检查节奏与字距
- 我点 edit 键 → 回到字形编辑

## 非目标
- proof 态下编辑字形（只读视图）
- 分页/打印（后续）

## 验收标准（概览）
- 模式切换 <100ms，持久化，两模式渲染正确（截图对照）
- edit 态回归全绿（原功能零损伤）
