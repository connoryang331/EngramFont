# R7 · 背景图控制增强 · 需求文档（PRD）

## 背景
Fontra 已有背景图全套能力（查证）：Add Background Image（Glyph 菜单）、选中后
selection-info 面板有 **Opacity 0-1 滑块 + Colorize 取色 + transformation**（panel-selection-info.js:340-370）、
可视化层 fontra.background-image 自动显示。

**真实差距只有两个**：
1. **replace（替换图片）缺失**——meshfont 有 replace 按钮（换图但保留位置/缩放/透明度），Fontra 只能 remove+重新 add（变换全丢）
2. **可发现性**——opacity 滑块藏在 selection-info（需先选中背景图），meshfont 是图片上的常驻弹窗

remove 不需要做（Fontra 已有）。

## 目标
- replace 按钮：替换背景图文件，**保留 transformation/opacity/colorize**
- 背景图选中体验对齐 meshfont（点击即选中，控制面板常驻可发现）

## 非目标
- 自动描图（auto-trace）——meshfont 的 "Trace a photo" 也是手动描（背景图 + pen），非自动矢量化
