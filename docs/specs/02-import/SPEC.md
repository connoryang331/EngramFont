# R2 · 导入字体 → 可编辑工程 · 技术规范

## 1. 架构与数据流
```
landing"导入字体"按钮（新增）
  └─ POST /api/import-font（multipart: file）
      └─ [新增] importFontHandler（filesystem PM webRoutes 挂载）
          ├─ 落盘 <rootPath>/<safe-name>.<ext>
          ├─ srcBackend = getFileSystemBackend(<file>)   # OTFBackend 只读
          ├─ dstBackend = newFileSystemBackend(<file stem>.fontra)
          │    ├─ putSources（lineMetrics 迁移）
          │    ├─ putFeatures（features.text 原样迁移）
          │    ├─ putGlyphMap + 逐字形 getGlyph→putGlyph（components 保留引用）
          │    └─ putKerning（源有则迁）
          └─ return {"project": "<stem>.fontra"}
  ← 前端跳转 editor.html?project=<stem>.fontra
```

## 2. 接口契约
```
POST /api/import-font
  body: multipart/form-data {file: <font binary>, name?: string}
  200: {"project": "Imported.fontra"}
  400: {"error": "unsupported"| "bad file"}   409: {"error": "name exists"}
```

## 3. 转换细节
- 字形：getGlyph 返回 VariableGlyph 直接 putGlyph（结构同源，components 引用保留；
  引用目标缺失时降级为展平轮廓并记 warning）
- glyphMap：源 getGlyphMap() → 逐名 putGlyph(codePoints)（putGlyphMap 为 no-op，
  映射由 putGlyph 登记——fontra.py:127 已验证）
- sources：getSources → putSources（lineMetricsHorizontalLayout 含 ascender/descender）
- features：getFeatures().text 非空才 put（源无 GSUB 时跳过）
- kerning：try getKerning → 非空 put

## 4. 文件清单
| 文件 | 操作 |
|---|---|
| `src/fontra/filesystem/importfont.py` | 新增（转换函数） |
| `src/fontra/filesystem/projectmanager.py` | 修改（webRoutes 挂 import 端点） |
| `src-js/projectmanager-filesystem/landing.html` + `landing.css` | 修改（导入按钮） |

## 5. 错误处理矩阵
| 场景 | 行为 |
|---|---|
| 不支持的扩展名 | 400 unsupported |
| 损坏字体（解析抛错） | 400 bad file + 信息 |
| 重名工程 | 409 + 建议 `-imported` 后缀 |
| 超大字体（>10k 字形） | 接受；流式写入，超时 120s |

## 6. 安全
- 文件名 sanitize（去路径分隔符）；大小上限 50MB
- 上传会话沿用 PM authorize
