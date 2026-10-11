# R2 · 导入字体 → 可编辑工程 · 需求文档（PRD）

## 背景
Fontra 的 OTFBackend 已能**只读打开** TTF/OTF/WOFF2（pyproject entry points 已注册），
但打开后不可编辑、不可保存。meshfont 的做法：导入的字体解析成可编辑数据（opentype.js），
所有字形立刻可改。

## 目标
- landing 页提供"导入字体"入口（选 .ttf/.otf 文件）
- 导入 = 在字体目录生成一个**可编辑**的 .fontra 工程（字形/度量/字距全量复制）
- 导入后直接进入编辑器，行为与原生工程无异

## 用户故事
- 设计者拿到一份 TTF，导入 EngramFont，改几个字形后导出——全程浏览器内完成

## 非目标
- 首版不做可变字体轴/特性之外的 GSUB 深度迁移（FEA 文本随 features 迁移）
- 不修改源文件（源 TTF 保持只读）

## 验收标准（概览）
- 导入 Inter-Regular.ttf → 生成 Inter-Regular.fontra → 打开编辑 → 改字形 → 重开仍在
- 字形数/轮廓 bounds 与源一致（往返校验）
