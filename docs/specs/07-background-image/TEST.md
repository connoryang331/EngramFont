# R7 · 测试验收与回归
## E2E
| ID | 步骤 | 期望 |
|---|---|---|
| E2E-1 | Add Background Image → 选中 | selection-info 出现 Opacity 滑块（0-1）+ Colorize |
| E2E-2 | 拖 Opacity | 背景图透明度实时变化 |
| E2E-3 | Replace 换图 | 新图出现，位置/缩放/透明度保留 |
| E2E-4 | remove | 图移除，其他字形不受影响 |
## 回归
| 项 | 断言 |
|---|---|
| 编辑 | 背景图不干扰字形编辑（层级在字形下方）|
| 保存 | 背景图随工程持久化（putBackgroundImage 通路）|
## 对照基准
meshfont：图片弹窗（滑块/replace/remove）——见 VERIFICATION-ENV.md 8124 端口对照。
