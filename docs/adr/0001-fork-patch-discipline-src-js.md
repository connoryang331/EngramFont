---
Id: ADR-0001
tags: [meta, frontend, backend]
Status: accepted
Date: 2026-10-12
---

# fork 贴片纪律：前端改动只做 `src-js/`，client 目录是构建产物

## 背景

EngramFont 是 Fontra 的 fork（分支 `engramfont-main`），需要持续跟上游同步
（[SYNC.md](../../SYNC.md)）。仓库里同时存在：

- `src-js/` —— 前端源码（九个 npm workspace：fontra-core / fontra-webcomponents /
  views-editor / views-applicationsettings / …），agent 日常开发的地方；
- `src/fontra/client/` —— **webpack 输出目录**（`webpack.config.cjs` 的
  destination，`npm run bundle` 会整体覆盖，JS/CSS 带内容哈希文件名）；
- `src/fontra/` —— 后端 Python（filesystem projectmanager、export/import 等）。

最早一版贴片直接改过 client 输出目录里的文件，一次 rebuild 全部蒸发。

## 决策

- **所有前端改动做在 `src-js/`**；`src/fontra/client/` 视为只读产物，改它等于白改。
- 改动优先级：**新增文件优先（零上游冲突）> 一行注册 > 原文件小改**；
  避免碰 `canvas-controller.js` / `scene-model.js` 等核心渲染文件——确需扩展时用
  **新增方法 / 新增可视化图层**，不改既有函数体（先例：`selectionAtParallelogram`、
  `fontra.rect.select` 平行四边形分支）。
- 后端改动在 `src/fontra/`（Python），注入点优先（projectmanager 构造参数注入、
  `setupWebRoutes` 单行挂载）。
- **每个贴片在 [ENGRAM-CHANGES.md](../../ENGRAM-CHANGES.md) 记账**（一节：改动 + 验证），
  这份台账同时是上游同步时的冲突清单。
- 品牌标识（Fontra → EngramFont）统一走 `rebrand-identifiers.mjs`，不手工散改。

## 理由

fork 的生死线是同步成本。把改动压缩进"新增文件 + 少量明确登记的原文件改动"，
merge 上游时的冲突面就最小；台账让每次同步前能一眼列出全部自改点。

## 后果

- 改完前端**必须 `npm run bundle`** 才能在 ：8800 看到效果（伺服的永远是构建产物）——
  这是最高频的新人坑，已写进 AGENTS.md 硬约束。
- 哈希文件名随内容变化，浏览器缓存天然失效。
- 核心文件的"新增方法"策略让 `scene-model.js` 等文件的原有函数体保持与上游一致，
  同步时这些文件基本零冲突。
