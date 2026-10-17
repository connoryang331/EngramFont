---
Id: ADR-0002
tags: [frontend, settings, theme, nodes]
Status: accepted
Date: 2026-10-14
---

# 节点外观设置常开：删除 "Use custom node colors and sizes" 总开关

## 背景

R4-T4.25 给 Theme settings 加了 Node appearance 卡片：一个总开关
（`nodeAppearanceCustom`，默认 false）+ 六个子设置（3 色 + 3 尺寸）。
子设置**任何时候都可编辑**，但只有开关勾选时才被 `applyNodeAppearanceSettings`
应用——关着时改它们是"静默无效"的；且默认关着 = 新用户看到可编辑的设置却不生效。

用户反馈（原文）："Use custom node colors and sizes 这个很多余，去掉。"

## 决策

- 删除总开关与 `nodeAppearanceCustom` 模型键（theme-settings.js）。
- `applyNodeAppearanceSettings` **无条件**应用自定义颜色/尺寸
  （移除 if/else 分支）。
- 顺带修复实时监听误传参数（见 [BUG-004](../bugfixes/2026-10-14-节点外观实时更新误传参数.md)）。

## 理由

1. 开关语义与 UI 自相矛盾：子设置永远可编辑，却只在勾选时生效。
2. 用户显式要求删除，且删掉后行为更直白（设置 = 生效）。
3. 少一个状态就少一条会漂的路径（开关状态 + 六个值 = 七份持久化状态 → 六份）。

## 被否决的方案

- **保留开关、子行随开关灰显**（macOS 设置风）：当时已实现通用
  `disabledWhen` + `refreshDisabledStates` 机制（BUG-002），但用户明确说开关多余——
  留开关只是把"静默无效"改成"灰显无效"，问题本身没解决。机制保留，总开关删除。
- **保留键、默认值改 true**：老 localStorage 里 `false` 会继续压制设置，
  且没有 UI 能改回来——等于给老用户埋雷。

## 后果

- `themeController` 少一个键；老 `engramfont-nodeAppearanceCustom` 残留无害。
- 节点三图层（`fontra.nodes` / `fontra.component.nodes` / `fontra.selected.nodes`）
  恒为自定义色/尺寸；改设置**立即**反映到画布（修复后）。
- `disabledWhen` / `refreshDisabledStates` 成为 `simple-settings` 的通用能力，
  留给后续需要依赖关系的面板。

## 关联

- 特性包：[docs/specs/08-node-appearance-settings/](../specs/08-node-appearance-settings/)
- 台账：ENGRAM-CHANGES.md「R4-T4.26」
