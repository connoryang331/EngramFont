# R7 · 背景图控制增强 · 需求文档（PRD）

## 背景
Fontra 已有背景图全套底层能力（Add Background Image / putBackgroundImage /
selection backgroundImage/0 / selection-info 的 Opacity+Colorize+Transformation 滑块 /
fontra.background-image 可视化层）。

**但交互模型与 meshfont 不同**：
- Fontra：全局 Unlock/Lock Background Images 菜单动作（手动解锁→选中→改→手动锁回）
- meshfont：工具栏 **Edit image 按钮**（字形有背景图时出现）→ 点击激活图片（弹控制菜单：
  透明度滑块/replace/remove）→ **不点就自动锁定**（无全局开关，上下文自动）

## 目标（学习 meshfont 行为）
1. **Edit image 上下文按钮**：当前字形有背景图时出现，点击 = 激活图片编辑上下文
   （解锁 + 选中 backgroundImage/0 + selection-info 出现 Opacity/Colorize/Transformation + Replace 按钮）
2. **自动锁定**：选中离开背景图（点击画布其它处/切换工具）→ 自动 re-lock
3. **Replace 按钮**：换图保留 transformation/opacity/colorize（R7 原需求保留）
4. 移除全局 Unlock/Lock Background Images 菜单项（被上下文行为取代）

## 用户故事
- 我给字形加了背景图 → 工具栏出现 Edit image → 点击 → 图片激活（控制菜单弹出）→
  调透明度/换图/移动 → 点画布其它处 → 自动锁定回到编辑

## 非目标
- 自动描图（Trace 是手动描）；多张背景图管理

## 验收标准（概览）
- Edit image 按钮上下文出现/消失
- 激活→滑块+Replace 可用；失焦→自动锁定
- 全局 Unlock/Lock 菜单项移除，行为由上下文接管
