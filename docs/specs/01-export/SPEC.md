# R1 · 技术规范（SPEC）

## 架构
```
File 菜单 (fontra-menus.js:126，已有)
  └─ action.export-as.<format> (view-controller.js:88，已有)
      └─ fontController.exportAs({format})  (font-controller.js:1065，已有，远程调用)
          └─ fonthandler.exportAs (fonthandler.py:605，已有，委托)
              └─ [新增] EngramFontExportManager.exportAs(projectIdentifier, options)
                  └─ fontTools 编译（compile-bridge 产品化）→ exports/ 目录
              └─ 返回 {downloadPath} → 前端 [新增 1 行] 触发下载
```

## 服务端
- 新增 `src/fontra/filesystem/exportmanager.py`：`EngramFontExportManager`
  - `getSupportedExportFormats() -> ["ttf", "otf", "woff2"]`
  - `async exportAs(projectIdentifier, options)`：
    1. `backend = self.projectManager.getBackend(projectIdentifier)`
    2. 遍历 glyphMap → getGlyph → StaticGlyph（path.drawPoints + components 展平，
       TransformPointPen 链，见 demo-liga/compile-bridge.py 已验证逻辑）
    3. FontBuilder 出 TTF/OTF；FEA（backend.getFeatures().text）→ feaLib addOpenTypeFeaturesFromString → GSUB
    4. WOFF2：fontTools save 时 flavor="woff2"（依赖 brotli，加入 requirements）
    5. 落盘 `<rootPath>/.exports/<session>/<project>-<format>.<ext>`，返回 `{"downloadPath": ...}`
- `__main__.py` / filesystem 工厂：构造 EngramFontExportManager 并传入 PM
- 静态路由：exports 目录仅授权会话可访问（沿用 PM 的 authorize）

## 前端（一行）
- `view-controller.js` export action 回调追加：`...then(r => r.downloadPath && window.open(r.downloadPath))`

## 依赖
- fontTools（已有）；brotli（新增，WOFF2）
- 家族导出：遍历 sources（lineMetrics 已含 ascender/descender），每 source 一份实例

## 决策记录
- D1：编译采用 fontTools 直出（demo-liga/compile-bridge.py 已验证路径），不引 fontmake（重）；家族/可变字体后续可切 fontmake
- D2：导出文件存工程目录旁 `.exports/`（不进工程数据），按会话子目录
