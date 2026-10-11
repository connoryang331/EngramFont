# R3 · 测试验收与回归

## E2E
- E2E-1 Dock 渲染：全部按键存在（aria-label 齐全，可访问性）
- E2E-2 点 `g`：画布切到 g 字形并进入编辑（selectedGlyph 断言 + 截图）
- E2E-3 点未创建字形键（如 `@`）→ 创建对话框出现 → 创建后画布显示
- E2E-4 DEL：文本末字符移除；space：追加空格
- E2E-5 100%：viewBox 复位断言
- E2E-6 折叠/展开 + 持久化（reload 后保持）
- E2E-7 暗色主题截图对照

## 回归
- R：物理键盘原有快捷键不受影响
- R：画布编辑（pen/point 工具）在 Dock 展开时不被遮挡（canvas 可视区让位或 Dock 覆盖可配）
- R：性能——Dock 常驻不拖慢 canvas 帧率（键帽静态渲染）
