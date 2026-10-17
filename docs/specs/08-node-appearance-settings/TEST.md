# R8 · 测试验收与回归

需求：[PRD.md](./PRD.md) ｜ 实现：ADR-0002 / ADR-0004 ｜ 台账：ENGRAM-CHANGES「R4-T4.26」

## E2E / 手测（Playwright headless，8800 · Untitled.fontra）

| ID | 步骤 | 期望 | 结果 |
|---|---|---|---|
| TC-1 | 打开 Theme settings 卡片 | 三行 `label · [size] · [color] · [reset]`，无总开关 | ✅（`qa/v4-node-card*.png`） |
| TC-2 | display-language / clipboard / editor-behavior / server-info | 行布局统一；无 `[object ...]` | ✅（objectString=false） |
| TC-3 | reset 往返：size=14 + color=#ff0000 → 点 reset | 输入框与 localStorage 回 8 / #7A4FE8 | ✅（verify-v3 beforeReset/afterReset） |
| TC-4 | 色块形状 | Smooth/Handle 圆形、Corner 方形 | ✅（`qa/v4-node-card-hover.png`） |
| TC-5 | 亮/暗主题 | 卡片、输入、分隔线、色块均正常 | ✅（`qa/v2-settings-dark.png`） |
| TC-6 | 亮暗一致性 + radio 渲染（TC 复检 BUG-001/002） | 无 `[object`；三面板正常 | ✅ |
| TC-7 | 亮暗主题 + reset 图标 hover | 图标渲染、hover 变亮、无 404/pageerror | ✅（`qa/probe-404.mjs`） |

## 回归

| 项 | 断言 | 结果 |
|---|---|---|
| 设置持久化 | `engramfont-nodeSmoothSize` = 14 → reset 后 = 8 | ✅ |
| 编辑器画布 | 重开上下文节点样式与设置一致（R4-T4.25 路径） | ✅ |
| 仓库 e2e | `npx playwright test` 35/35 | ✅ |
