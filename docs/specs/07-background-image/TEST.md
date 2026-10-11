# R7 · 测试验收与回归
## E2E
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | Add Background Image → 工具栏出现 Edit image | 按钮上下文出现 |
| E2E-2 | 点 Edit image | 背景图选中，selection-info 出现 Opacity/Colorize/Transformation + Replace |
| E2E-3 | 拖 Opacity 滑块 | 透明度实时变化 |
| E2E-4 | Replace 换图 | 新图出现，位置/缩放/透明度保留 |
| E2E-5 | 点画布其它处 | 自动锁定（re-lock） |
| E2E-6 | 无全局 Unlock/Lock 菜单项 | 移除断言 |
## 回归
| 项 | 断言 |
|---|---|
| 编辑 | 背景图不干扰字形编辑（层级在字形下方）|
| 保存 | 背景图随工程持久化（putBackgroundImage 通路）|
| 暗色 | 面板/按钮暗色正常 |
## 对照基准
meshfont：Edit image 按钮 → 弹控制菜单（滑块/replace/remove）——见 VERIFICATION-ENV.md 8124 对照。
