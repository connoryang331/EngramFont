# R2 · 任务拆解

## T2.1 转换函数（1d）
- 文件：新增 importfont.py
- 步骤：读源 → 建 .fontra → 五类数据迁移（glyphs/map/features/sources/kerning）
- DoD：单测往返一致（glyphMap 集合相等；抽样 bounds 相等）

## T2.2 webAPI 端点（0.5d）
- 文件：projectmanager.py（setupWebRoutes 追加 import-font handler）
- DoD：curl 上传 ttf → 200 + .fontra 生成

## T2.3 landing UI（0.5d）
- 文件：landing.html + landing.css（源在 src-js/projectmanager-filesystem/）
- DoD：e2e 点击导入 → 编辑器打开导入工程

## T2.4 容错（0.5d）
- DoD：三类错误（400/409）e2e 断言
