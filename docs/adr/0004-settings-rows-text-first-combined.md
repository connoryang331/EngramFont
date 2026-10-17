---
Id: ADR-0004
tags: [frontend, settings, webcomponents]
Status: accepted
Date: 2026-10-14
---

# 设置面板行：文字在前 + combined 行类型 + 行级 reset

## 背景

`SimpleSettings`（应用设置三个面板共用的行渲染器）原布局是**控件在前、文字在后**
（颜色块/数字框在左，label 在右），节点外观卡片因此是"六个孤立行 + 无分组"，
面板还被拉通整个窗口宽度。用户要求重排："text first, settings after"，
随后追加："Smooth/Corner/Handle 每行 = 文字 + size + color（+ reset 图标）"。

## 决策

- **行统一「文字在前、控件在后」**：`.settings-row` = label 左、控件右对齐，
  行间发丝分隔线（`--horizontal-rule-color` 剪切 35%），checkbox/radio 同样文字在左。
- **新增 `combined` 行类型**：一个 label + `controls[]`（复用既有 controlBuilders：
  number-wheel / color / …）+ 可选 `resettable`（行尾 reset 图标按钮，一键恢复
  该行全部 `default`，输入元素**原位**更新，不重渲染不掉焦点）。
- **节点外观行** = 文字 + size + color + reset；色块形状跟随节点形状
  （`shape: "round" | "square"` → 50% 圆 / 0.2em 方）。
- **卡片限宽**：五个卡片式设置面板 `max-width: 32em`（shortcuts 表格面板保持全宽）。
- 通用能力：`disabledWhen(model)` + `refreshDisabledStates()`（原位灰显）。

## 理由

1. 文字在前是设置面板的行业惯例（macOS System Settings 风），扫读靠左缘一列文字；
2. 同一节点类型的 size 与 color 是**一组**意图（"这个节点长什么样"），拆两行反而散；
3. reset 是高频动作（试颜色 → 回默认），逐项手改回不去；
4. 色块形状与画布节点形状一一对应，设置与画布互相印证。

## 被否决的方案

- **只改主题面板、新写独立组件**：`SimpleSettings` 三个面板共用，另写一份 = 第二套
  行渲染器；重排做成通用 uiTypes，display-language / clipboard 顺带受益。
- **保留 "(scroll or type)" 文案在 label 里**：三行重复同一段提示太吵；改为 number
  输入框的 `title` tooltip（`title: "Scroll or type"`），滚轮行为不变。

## 后果

- `theme` / `display-language` / `clipboard` 三面板统一新布局（radio 行为文字在左、
  单选钮在右）。
- `_keys` 现在递归收集 `controls[].key`，外部改模型值仍能驱动重渲染。
- 新增通用能力 `combined` / `resettable` / `disabledWhen` / `shape`，均有真实使用方
  （节点外观行）或留作面板扩展。
- 渲染包装层 `.settings-list` 曾引入 radio 数组未展平的回归（BUG-001）——已修。

## 关联

- 特性包：[docs/specs/08-node-appearance-settings/](../specs/08-node-appearance-settings/)
- 台账：ENGRAM-CHANGES.md「R4-T4.26」
