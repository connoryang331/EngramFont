# R9 · 测试验收与回归

需求：[PRD.md](./PRD.md) ｜ 实现：ADR-0003 ｜ 台账：ENGRAM-CHANGES「R5-T5.5」

## E2E / 手测（Playwright headless，8800 · Untitled.fontra "a"，zoom 让字形避开 dock）

| ID | 步骤 | 期望 | 结果 |
|---|---|---|---|
| TC-1 | 矩形框选拖拽（无 Ctrl） | 选区 = 矩形内 on-curve 节点（4 点） | ✅ |
| TC-2 | 拖拽中按 Ctrl 摆角 | `selectionParallelogram` 出现（shearK≈0.615），虚线平行四边形渲染 | ✅（`qa/sel-2-slant-mid.png`） |
| TC-3 | 斜选阶段选区 | 与独立剪切命中计算**逐点一致**（point/7,16,18） | ✅ |
| TC-4 | 松开 Ctrl 继续拖 | 角度冻结、仅大小变化（角点跟随鼠标） | ✅（`qa/sel-3-resize-mid.png`） |
| TC-5 | mouse.up | `selectionParallelogram`/`selectionRect` 清空；选中集保留 | ✅（3 点保留） |
| TC-6 | 亮/暗主题 | 平行四边形虚线两主题可见 | ✅ |

## 回归

| 项 | 断言 | 结果 |
|---|---|---|
| 行为兼容 | 不碰 Ctrl 的框选走原 `selectionAtRect` 路径 | ✅（dbg rectSelectCalls=8） |
| 全量 e2e | `npx playwright test` 35/35（keyboard-dock / proof-edit-mode / background-image / export / import / new-font） | ✅ |
| 控制台 | 无 pageerror / 无 console.error | ✅ |

## 已知边界

- 测试环境注意 dock 覆盖画布下缘——拖拽落点先做命中测试（[BUG-005](../../bugfixes/2026-10-14-键盘dock覆盖画布下缘拖拽被吞.md)）；
- Ctrl 在 Windows 同时是"加入选区"修饰键（commandKeyProperty）：斜选模式下
  选择模式取**初始事件**（Ctrl 按下前的修饰键态），互不干扰；Mac 上 Ctrl 无此冲突。
