# R3 · 任务拆解

## T3.1 Dock UI 骨架（1d）
- 步骤：KeyboardDock 类（buildDom/rows 常量表/展开折叠）→ editor.js 挂载 → editor.css 样式
- DoD：编辑器底部出现键盘；折叠态为圆形按钮；暗色主题正常

## T3.2 字母键导航（0.5d）
- 步骤：键点击 → selectedGlyph 设置 → 缺字形走创建对话框
- DoD：点 g → 画布 g 字形编辑态（e2e 断言 selectedGlyph）

## T3.3 特殊键（1d）
- 步骤：DEL/space 改 characterLines；100% 调 editor 缩放复位；move 接 sceneView pan
- DoD：各键 e2e 断言（文本变化/viewBox 复位/pan 态）

## T3.4 模式键（0.5d）
- 依赖：R5.T5.1
- DoD：proof/edit 键切换 canvasMode，Dock 工具条随模式显隐

## T3.5 数字/标点键（0.5d）
- DoD：数字/标点键映射到对应 glyph 名，缺失走对话框

## T3.6 i18n/主题（0.5d）
- DoD：lang 键齐全（zh-CN/en 至少）；暗色截图对照

## T3.7 可拆分/合并布局（0.5-1d，EngramFont 原创）
- 文件：keyboard-dock.js（布局拆分渲染）/ editor.css（双簇定位/过渡）
- 步骤：layout 状态（merged/split）→ split 时按列边界拆两容器 → 锚定左下/右下 →
  过渡动画 → localStorage 持久化
- DoD：两态切换 <300ms；两簇键功能与合并态一致；持久化

## T3.8 按键自定义功能（1-2d，EngramFont 原创）
- 文件：keyboard-dock.js（绑定表/改绑 UI）/ editor.css
- 步骤：绑定表（localStorage）→ 右键键帽弹 action 选择器（menu-panel）→
  分发走 Fontra action 体系 → 重置默认
- DoD：改绑即时生效且持久化；重置可用；DEL/mode 键锁定不可改
