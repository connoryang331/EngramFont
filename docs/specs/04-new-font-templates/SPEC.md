# R4 · 技术规范（SPEC）

## 后端
- `createNewFontAndPopulate(path)` 已存在（backends/populate.py）：建工程 + Regular source +
  lineMetrics + GF Latin Kernel 字形集引用——**直接复用**
- 新增 webAPI：`POST /api/new-font {name, template}`
  - template: "empty" | "latin-kernel"（现有 populate 行为）| "latin-full"（P2）
  - 重名校验（projectlist 查重）

## 模板数据
- 首版：empty + latin-kernel（populate 现成）
- 扩展：assets/templates/*.json（字形名+轮廓打包，来源=开源字体预提取脚本，
  生成脚本入 scripts/make-template.py——EngramFont 自有资产，OFL 许可字体提取合法）

## 前端
- landing.html 加"新建字体"卡（modal-dialog web component + 输入框 + 模板单选）
- 完成后 `editor.html?project=<name>` 跳转

## 依赖
- R2 的导入管线（模板若以字体文件形式预提取，可直接走导入转换）
