# R4 · 任务拆解

## T4.1 new-font webAPI（0.5d）
- 步骤：handler（name/template 校验 → createNewFontAndPopulate → 模板注入 → 返回）
- DoD：curl POST 建工程成功；409/400 用例通过

## T4.2 landing UI（1d）
- 步骤：新建卡（modal-dialog 组件）→ 提交 → projectlist 刷新 → 跳编辑器
- DoD：e2e 全流程断言

## T4.3 模板数据（1d）
- 步骤：make-template.py 生成 latin-kernel.json（A-Z a-z 0-9 块状轮廓+codePoints）；
  newfont.py 注入逻辑（逐字形 putGlyph）
- DoD：latin-kernel 模板打开可见 62+ 字形且可编辑

## T4.4 编辑器内新建入口（0.5d）
- 步骤：File 菜单加 New Font（打开 landing 新建卡或直接弹窗）
- DoD：编辑器内新建不跳失上下文
