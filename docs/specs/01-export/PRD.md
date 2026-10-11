# R1 · 浏览器内导出字体 · 需求文档（PRD）

## 背景
Fontra 的导出机制是完整的，但开源仓库**没有 ExportManager 的实现**，导致
`fontra --launch filesystem` 模式下 File 菜单里 Export As 完全缺失。

### 根因链（源码实证）
1. `core/protocols.py:183` — `ExportManager` 只是 Protocol（`exportAs` + `getSupportedExportFormats` 两个方法），仓库内无任何实现类
2. `filesystem/projectmanager.py:63` — `FileSystemProjectManager(exportManager=None)`，filesystem 命令创建 PM 时不传
3. `core/fonthandler.py:175` — 仅当 `exportManager is not None` 时 `projectManagerFeatures["export-as"]` 才有值
4. `fontra-menus.js:126` — 前端 File 菜单按 `backendInfo.projectManagerFeatures["export-as"]` 条件渲染，空 → 菜单无导出项
5. `view-controller.js:88` — 有导出 action 也会注册并调用 `fontController.exportAs({format})`，但**前端拿到结果后没有下载逻辑**（需小补）

## 目标
- filesystem 模式下 File → Export As 菜单出现并可导出
- 支持格式：TTF / OTF / WOFF2（首版）；家族导出（多 source → Light/Regular/Bold）；proof 打样页（P2）
- 导出的字体包含全部字形轮廓 + FEA 编译产物（GSUB 等）+ 字距

## 用户故事
- 作为字体设计者，我在本地 EngramFont 里编辑字形后，直接 File → Export As → TTF，浏览器下载成品字体文件
- 作为拥有多 source（字重）工程的设计者，我可以一次导出整个家族

## 非目标
- 云端分享/发布（另立项）
- hinting（暂不做）
- 可变字体导出（P2，designspace 工程才有意义）

## 验收标准（概览）
- 菜单出现且列出 ttf/otf/woff2
- 导出产物：字形数正确、轮廓与编辑器一致、GSUB（liga 等）存在、可在系统安装并生效
- 导出不阻塞编辑（异步）、有进度/完成反馈
