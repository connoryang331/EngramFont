# EngramFont · 过夜执行手册（EXECUTION RUNBOOK）

> 本文是执行会话的主入口。治理枢纽：[../../AGENTS.md](../../AGENTS.md)（每个 agent 必读——
> 需求执行顺序 / 测试标准 / 判例速查 / 硬约束）；文档地图：[../README.md](../README.md)。
> 配合：README.md（需求索引）、VERIFICATION-ENV.md（对照环境）、
> 各需求 SPEC/TASKS/TEST、SYNC.md（同步）、ENGRAM-CHANGES.md（贴片台账）。

## 0. 环境自检（执行前 5 分钟）
```bash
cd E:\engram-dev\EngramFont
git status                        # 干净、位于 engramfont-main
venv\Scripts\python -c "import fontTools; print('fontTools ok')"
node --version                    # ≥ 24
ls docs\specs\                    # 9 个需求目录 + EXECUTION.md
netstat -ano | findstr :8800      # 无占用（有则先停）
```
对照环境：`E:\visee-template\meshfont-clone` → `node serve.mjs`（8124，详见 VERIFICATION-ENV.md）

## 1. 执行顺序与提交点
```
R1 导出（T1.1→T1.5）     gate: E2E 导出三格式 + ton 连字进产物
  ↓ commit "R1: ..."
R2 导入（T2.1→T2.4）     gate: E2E 导入 Inter → 编辑 → 保存
  ↓ commit "R2: ..."
R5 Proof/Edit（T5.1→T5.4）gate: E2E 模式切换 + 导线宽度断言
  ↓ commit "R5: ..."
R3 键盘 Dock（T3.1→T3.6）gate: E2E 键盘导航 + 模式键
  ↓ commit "R3: ..."
R7 背景图增强（T7.1→T7.4）   gate: E2E Edit image 激活 + Replace 换图
  ↓ commit "R7: ..."
R4 模板流（T4.1→T4.4）   gate: E2E 新建→模板→编辑
  ↓ commit "R4: ..."
最终：push origin engramfont-main + 更新 ENGRAM-CHANGES.md 贴片台账
```

## 2. 每个任务的执行模板
1. 读对应 SPEC 章节 + TASKS 条目（涉及文件/步骤/DoD）
2. 实现（贴片纪律：新增文件优先；原文件单行改动）
3. DoD 验证（对应 TEST.md 用例）
4. `npm run bundle`（动了前端源码时）+ 重启服务（**用 `start-EngramFont.bat`**，步骤见
   [AGENTS.md](../../AGENTS.md) 的「重启服务器」节：先停旧实例 → 先构建 → 跑脚本 → 验 `/serverinfo`）
5. E2E/手动验收 → git commit（消息前缀 "R<n>.T<x.y>:"）

## 3. 接线速查（改代码时对照）
| 需要做什么 | 去哪里接 |
|---|---|
| 切换当前字形 | `sceneSettings.selectedGlyph = {...sel, glyphName, isEditing:true}`（editor.js:864 同款）|
| 字形缺失→创建 | editor.js:860 起的对话框流程（抽成函数复用）|
| 改文本 | `sceneSettingsController.model.characterLines`（行×字符数组）|
| 缩放复位 | editor.js `_zoom` / viewBox 直设（:3420）|
| 全宽导线 | visualization-layer-definitions.js `fontra.lineMetrics` 层宽度参数化 |
| 导出菜单亮起 | ExportManager 注入（projectmanager.py:63 参数）|
| 新 webAPI 端点 | projectManager.setupWebRoutes(server) 内挂载（server.py:63 惯例）|
| 持久化键 | localStorage 前缀 `engramfont-`（theme-settings.js 模式）|
| UI 零件 | fontra-webcomponents：modal-dialog/menu-panel/glyph-cell-view/grouped-settings/icon-button |

## 4. 红线
- 改 Untitled.fontra 前停 8800 服务（双写互踩）
- 不碰 canvas-controller.js / scene-model.js 核心绘制逻辑（除非 SPEC 明确要求）
- 不抄 meshfont 代码（闭源）；行为对照即可
- 每完成一个 T：commit（小步提交，冲突可回退）

## 5. 卡住时的降级路径
| 问题 | 降级 |
|---|---|
| feaLib 编译报错（FEA 语法） | 检查 glyph 名存在性（compile-bridge 的 auto class 逻辑）|
| calt/liga 规则不触发 | 检查 lookup 顺序（规则在 liga 内的先后=优先级，见 demo-liga 教训）|
| opentype.js 渲染异常 | 改用 glyph-paths.json（fontTools SVGPathPen 已导出）|
| selectedGlyph 结构不符 | 打印 sceneSettings.selectedGlyph 现值对齐（结构可能随版本微变）|
