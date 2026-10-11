# R2 · 技术规范（SPEC）

## 转换链（compile-bridge 的反向，机制已验证）
```
OTFBackend(source.ttf)  [读]
  getGlyphMap / getGlyph(name) / getFeatures / getSources / getKerning
      ↓ 逐字形 writeGlyph（components 展平或保留——.fontra 支持 components）
newFileSystemBackend(<dir>/Imported.fontra)  [写]
  putGlyphMap / putGlyph×N / putFeatures / putSources / putKerning
```

## 服务端
- 新增 webAPI：`POST /api/import-font`（multipart 文件 + 目标名）
  - 校验扩展名（ttf/otf/woff2 中可读者）
  - 落盘字体到字体目录 → OTFBackend 读 → newFileSystemBackend 写 `<原名>.fontra`
  - 返回新工程标识；component 保留为组件引用（.fontra 格式原生支持）
- filesystem PM 的 webRoutes 挂载点：`projectManager.setupWebRoutes(self)`（server.py:63 已有惯例）

## 前端
- landing 页 project-list 上方加"导入字体"按钮（file input + 上传）
- 完成后跳转 `editor.html?project=<导入名>`

## 依赖
- 无新依赖（全 fontra 内置能力）
