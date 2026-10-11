# R4 · 新建字体/模板流 · 技术规范

## 1. 架构与数据流
```
landing"新建字体"卡（新增）
  └─ POST /api/new-font（新增 webAPI）
      body: {name: "MyFont", template: "empty"|"latin-kernel"|"latin-full"}
      └─ [复用] createNewFontAndPopulate(path)  （backends/populate.py，现成）
         template!=empty 时：追加种子字形
      └─ 校验：重名 → 409；路径 sanitize
  ← 前端跳转 editor.html?project=<name>.fontra
```

## 2. 接口契约
```
POST /api/new-font
  body: {"name": "MyFont", "template": "latin-kernel"}
  200: {"project": "MyFont.fontra"}
  409: {"error": "name exists"}    400: {"error": "bad name|template"}
```
- name 规则：`[A-Za-z0-9_-]{1,64}`；生成文件 `<name>.fontra` 于字体目录

## 3. 模板数据
| 模板 | 内容 | 来源 |
|---|---|---|
| empty | 空（仅 Regular source + lineMetrics） | createNewFontAndPopulate 现成 |
| latin-kernel | A-Z a-z 0-9 基础字形（块状演示轮廓） | `scripts/make-template.py` 生成（几何轮廓，同 demo-liga 风格） |
| latin-full（P2） | 常用 Latin 全集 | 开源字体（OFL）预提取 |

- 模板文件格式：与 .fontra glyphs/*.json 同构（name/sources/layers），生成脚本一次产出
  `assets/templates/latin-kernel.json`

## 4. 种子字形注入
- populate 现有行为：建 Regular source + GF Latin Kernel 字形集**引用**（不含轮廓）
- 本需求扩展：template=latin-kernel 时逐字形 writeGlyph（putGlyph 带 codePoints），
  使打开即可见/可编辑（对齐 meshfont"模板卡片→立刻有字形"的体验）

## 5. 文件清单
| 文件 | 操作 |
|---|---|
| `src/fontra/filesystem/newfont.py` | 新增（newFont webAPI handler + 模板注入） |
| `src/fontra/filesystem/projectmanager.py` | 修改（setupWebRoutes 挂 new-font 端点） |
| `src-js/projectmanager-filesystem/landing.html/.css/.js` | 修改（新建卡） |
| `scripts/make-template.py` + `assets/templates/latin-kernel.json` | 新增 |

## 6. 错误处理矩阵
| 场景 | 行为 |
|---|---|
| 重名 | 409 name exists |
| 非法 name | 400 bad name |
| 未知 template | 400 bad template |
| 磁盘错误 | 500 + 信息 |
