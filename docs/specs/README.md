# EngramFont · 功能需求文档包（10 大需求）

> 每个需求一份完整流程：PRD（需求）→ SPEC（技术规范）→ PLAN（计划与任务拆分）→ TEST（测试验收与回归）
> 执行纪律：文档评审通过后才动代码；实现遵循贴片纪律（ENGRAM-CHANGES.md + SYNC.md）
> 治理枢纽：[../AGENTS.md](../../AGENTS.md)（需求执行顺序 / 测试标准 / 判例速查）· 文档地图：[../README.md](../README.md)

| # | 需求 | 目录 | 状态 | 估时 |
|---|---|---|---|---|
| R1 | 浏览器内导出字体（TTF/OTF/WOFF2/家族） | [01-export](./01-export/) | 已实现 2026-10-12 | ≈3.5d |
| R2 | 导入字体 → 可编辑工程 | [02-import](./02-import/) | 已实现 2026-10-12 | ≈2.5d |
| R3 | 虚拟键盘 Dock（+可拆分双簇布局 +按键自定义） | [03-keyboard-dock](./03-keyboard-dock/) | 已实现 2026-10-12 | ≈6-6.5d |
| R4 | 新建字体/模板流 | [04-new-font-templates](./04-new-font-templates/) | 已实现 2026-10-12 | ≈3d |
| R5 | Proof/Edit 双模式画布 | [05-proof-edit-mode](./05-proof-edit-mode/) | 已实现 2026-10-12 | ≈2.5d |
| R6 | 路径操作工具集（straighten/soften/circle/锚点密度） | [06-path-ops](./06-path-ops/) | 文档就绪 | ≈4-5d |
| R7 | 背景图 Edit image 上下文激活 + Replace（学 meshfont，替代全局 unlock/lock） | [07-background-image](./07-background-image/) | 已实现 2026-10-12 | ≈1.75d |
| R8 | 节点外观设置重排（每类型一行 + 行级 reset + 常开化） | [08-node-appearance-settings](./08-node-appearance-settings/) | 已实现 2026-10-14 | ≈0.75d |
| R9 | 斜向框选（Glyphs 风 Ctrl 改角度 / 松开定角缩放） | [09-slanted-selection](./09-slanted-selection/) | 已实现 2026-10-14 | ≈0.75d |
| R10 | 起始点方向指示改为尖角箭头（`>` / `<`） | [10-startpoint-chevron](./10-startpoint-chevron/) | 已实现 2026-10-14 | ≈0.25d |
| R11 | Squircle 节点：曲率连续（G2），Shift-双击切换，图标为超椭圆 | [11-squircle-nodes](./11-squircle-nodes/) | 已实现 2026-10-14 | ≈1d |

合计 ≈ 21d

## 依赖与执行顺序
```
R1 ─┐
R2 ─┤（互不依赖，可并行——两个快赢）
R5 ─┼─→ R3（Dock 的模式键依赖 R5 的状态机）
R4 ─┘ （复用 R2 的导入管线做模板字体）
```
建议顺序：**R1 → R2 → R5 → R3 → R6 → R4**（R1/R2 独立快赢；R5 先于 R3；R6 的锚点密度是 R3 绿滑块的底层，可并行）。

## E2E 骨架
- `e2e/*.spec.mjs` 五套骨架 + playwright.config.mjs 已建（用例表在各 TEST.md，断言由实现会话填充）

## 下一会话执行入口（过夜执行必读）
1. 先读 [VERIFICATION-ENV.md](./VERIFICATION-ENV.md)——meshfont 参照克隆路径/启动命令/资产清单/端口表/对照流程
2. 执行顺序：R1 → R2 → R5 → R3 → R4，每个需求的 TASKS.md 即逐任务施工单
3. 改 Untitled.fontra 前先停 EngramFont 服务（8800）——双写互踩

## 跨需求共享资产
- compile-bridge 编译逻辑（R1 产品化；demo-liga 已验证）
- ink-gap 间距算法（fix-liga-spacing，R3 键帽/R4 模板字形共用）
- 自动 backtrack 类（R1 的 FEA 编译内置——新 *ance 组零维护）
- engramfont-* localStorage 前缀（R3/R5 持久化）
- web components：modal-dialog / menu-panel / glyph-cell-view / grouped-settings（R3/R4/R5 UI 件）

## 载体判定（插件 vs 源码）
- 编辑器视图内功能（R3/R5/R4 卡片）→ **源码贴片**（视图内无插件注入口）
- 独立页面 → webcontent 插件（pip 包，零合并冲突）——本批暂无此需求
- 后端编译服务（R1）→ 源码内 ExportManager 类（注入点已存在：PM 构造参数）
