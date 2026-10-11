# EngramFont · 功能需求文档包（5 大需求）

> 每个需求一份完整流程：PRD（需求）→ SPEC（技术规范）→ PLAN（计划与任务拆分）→ TEST（测试验收与回归）
> 执行纪律：文档评审通过后才动代码；实现遵循贴片纪律（ENGRAM-CHANGES.md + SYNC.md）

| # | 需求 | 目录 | 状态 | 估时 |
|---|---|---|---|---|
| R1 | 浏览器内导出字体（TTF/OTF/WOFF2/家族） | [01-export](./01-export/) | 文档就绪 | ≈3.5d |
| R2 | 导入字体 → 可编辑工程 | [02-import](./02-import/) | 文档就绪 | ≈2.5d |
| R3 | 虚拟键盘 Dock | [03-keyboard-dock](./03-keyboard-dock/) | 文档就绪 | ≈4d |
| R4 | 新建字体/模板流 | [04-new-font-templates](./04-new-font-templates/) | 文档就绪 | ≈3d |
| R5 | Proof/Edit 双模式画布 | [05-proof-edit-mode](./05-proof-edit-mode/) | 文档就绪 | ≈2.5d |

合计 ≈ 15.5d

## 依赖与执行顺序
```
R1 ─┐
R2 ─┤（互不依赖，可并行——两个快赢）
R5 ─┼─→ R3（Dock 的模式键依赖 R5 的状态机）
R4 ─┘ （复用 R2 的导入管线做模板字体）
```
建议顺序：**R1 → R2 → R5 → R3 → R4**（R1/R2 是独立快赢；R5 先于 R3）。

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
