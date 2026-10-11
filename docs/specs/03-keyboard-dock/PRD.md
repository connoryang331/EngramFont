# R3 · 虚拟键盘 Dock · 需求文档（PRD）

## 背景
meshfont 的招牌 UX：编辑器底部常驻虚拟键盘，点字母键直接切换到该字形，配一组
功能键（DEL/视图/移动/模式切换/ctrl/alt/space）。这是"打字员式"字形浏览编辑流程的核心。

## 目标
- 编辑器画布底部常驻键盘 Dock（QWERTY 布局 + 功能键），点字母键画布切到该字形
- Dock 含模式键：proof（进打样预览）/ edit（回编辑）——依赖 R5
- 所有能接 Fontra 现有能力的键直接接线，不重复造轮子

## 用户故事
- 我点键盘上的 `g`，画布立即显示 g 字形并进入编辑；点 `ed` 组合…（连体组键后续）
- 我点 DEL，当前文本末字符被移除
- 我按住 alt 点字母，切换大小写形态

## 键位清单（meshfont 行为观察 + EngramFont 映射）
| 键 | meshfont 行为 | EngramFont 实现 | 接线 |
|---|---|---|---|
| 字母/数字/标点 | 切换到该字形 | selectedGlyph = {glyphName, isEditing:true}；字形不存在→复用 create-new-glyph 对话框 | editor.js:864/898 同款 |
| DEL(橙) | 删除 | 文本末字符退格（Q1 待确认） | characterLines 修改 |
| ctrl/alt | 修饰 | alt=大小写切换；ctrl=预留（Q2） | dock 内部状态 |
| space | 文本加空格 | characterLines 追加空格 | 同上 |
| move(宽) | 画布平移模式 | pan 开关（空格拖拽的持久版） | sceneView |
| 100% | 缩放复位 | viewBox 复位 | editor._zoom 路线 |
| proof/edit 模式键 | 模式切换 | 画布模式状态机 | 依赖 R5 |

## 非目标
- 完整物理键盘替代（物理键盘走 Fontra 原有快捷键）
- 输入法/非拉丁布局（首批）

## 验收标准（概览）
- 点字母键：当前字形切换 <100ms；字形缺失弹创建对话框
- Dock 在 proof/edit 两模式下均可见（meshfont 行为）
- 暗色主题正常渲染
