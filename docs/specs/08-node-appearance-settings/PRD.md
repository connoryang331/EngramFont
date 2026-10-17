# R8 · 节点外观设置重排（每类型一行 + reset）· 需求文档（PRD）

## 背景

R4-T4.23 给画布节点做了类型配色（smooth 紫罗兰圆点 / corner 琥珀方块 / 手柄灰紫小点），
R4-T4.25 给了设置页（总开关 + 三色 + 三尺寸，控件在前的散行布局）。
用户使用后提出三点（2026-10-14）：

1. 总开关多余 → 删（定稿见 [ADR-0002](../../adr/0002-node-appearance-always-on.md)）；
2. 行重排：**文字在前，设置在后**，每个节点类型**一行**：`Smooth node [size][color][reset]`；
3. 面板太长（卡片拉通全窗口宽）→ 修复。

## 目标

1. 每个节点类型一行：**label · size 输入 · 颜色块 · reset 图标**（reset 恢复该行默认）；
2. 色块形状跟随节点形状：Smooth=圆、Corner=方、Handle=圆；
3. 设置**常开**（无总开关），改完画布即时生效；
4. 亮/暗主题两套都正常；设置持久化（`engramfont-node*` 键）。

## 用户故事

- 我拖动 Smooth node 的 size（滚轮或键入 14）→ 画布上的紫色圆点立即变大，重开编辑器仍是 14；
- 我把 Corner 的颜色试成了红 → 点行尾 reset → 回到琥珀默认。

## 非目标

- 每种节点多套预设方案；按工程（而非全局）保存节点外观。

## 验收标准（概览）

- 三行结构正确（label 在前、size+color+reset 在后），reset 一键恢复默认并落盘；
- 色块形状 round/square 与画布节点一一对应；
- 无总开关；修改即时生效（实时监听修复，BUG-004）；
- 设置面板行组件为通用能力（文字在前 + combined），其余两面板布局不受损。

> 设计取舍与被否决方案（总开关灰显方案等）见 [ADR-0002](../../adr/0002-node-appearance-always-on.md)、
> [ADR-0004](../../adr/0004-settings-rows-text-first-combined.md)。
