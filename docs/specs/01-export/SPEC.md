# R1 · 浏览器内导出字体 · 技术规范

## 1. 架构与数据流
```
File 菜单项（fontra-menus.js:126，已有，按 export-as 特性条件渲染）
  └─ action.export-as.<format>（view-controller.js:88，已有注册）
      └─ fontController.exportAs({format})（font-controller.js:1065，远程调用）
          └─ fonthandler.exportAs（fonthandler.py:605，已有，委托 exportManager）
              └─ EngramFontExportManager.exportAs（本需求新增）
                    ├─ backend 读取（getGlyphMap/getGlyph/getFeatures/getSources）
                    ├─ fontTools FontBuilder 编译（含 FEA→GSUB）
                    ├─ 落盘 <工程目录>/.exports/<ts>/<name>.<ext>
                    └─ return {"downloadPath": "/exports/<ts>/<name>.<ext>"}
  ← 前端回调 [新增] window.open(downloadPath) 触发浏览器下载
```

## 2. 接口契约

### ExportManager（实现 core/protocols.py:183 Protocol）
```python
class EngramFontExportManager:
    def getSupportedExportFormats(self) -> list[str]:
        return ["ttf", "otf", "woff2"]

    async def exportAs(self, projectIdentifier: str, options: dict) -> dict:
        # options: {"format": "ttf"|"otf"|"woff2"}
        # 返回: {"downloadPath": "/exports/<ts>/<safe-name>.<ext>"}
        # 异常: ValueError("unknown format") / RuntimeError("compile failed: ...")
```

### 前端改动（view-controller.js:94，一行）
```js
(event) => this.fontController.exportAs({ format })
  .then((r) => r.downloadPath && window.open(r.downloadPath))
```

## 3. 编译管线（demo-liga/compile-bridge.py 已验证路径的产品化）
1. `glyphMap = await backend.getGlyphMap()`；glyphOrder = sorted(keys)
2. 每字形：`getGlyph(name)` → 取 default layer StaticGlyph
   - 轮廓：`sg.path.drawPoints(PointToSegmentPen(pen))`
   - 组件展平：`sg.components` 逐个 → `getGlyph(comp.name)` 递归同上，
     经 `TransformPointPen(PointToSegmentPen(pen), Transform().translate(tx, ty))`
   - 度量：`xAdvance`
3. `FontBuilder(upem, isTTF=fmt=="ttf")`：setupGlyphOrder/CharacterMap/Glyf/
   HorizontalMetrics/HorizontalHeader(ascent,descent)/NameTable/OS2/Post
4. FEA：`fea = await backend.getFeatures()` →
   `addOpenTypeFeaturesFromString(fb.font, fea.text)`（GSUB；backtrack 类由
   compile-bridge 的自动生成逻辑注入——所有 `*ance` 结尾字形）
5. WOFF2：`fb.save(path)` 前 `fb.font.flavor = "woff2"`（依赖 brotli）
6. OTF：`isTTF=False`（CFF 表由 fontTools 转换）

## 4. 文件清单
| 文件 | 操作 | 内容 |
|---|---|---|
| `src/fontra/filesystem/exportmanager.py` | 新增 | EngramFontExportManager 类 |
| `src/fontra/filesystem/projectmanager.py` | 修改 1 行 | filesystem 工厂构造 PM 时传入 exportManager |
| `src-js/fontra-core/src/view-controller.js` | 修改 1 行 | export 回调加下载 |
| `requirements.txt` | 修改 1 行 | + brotli |

## 5. 错误处理矩阵
| 场景 | 行为 |
|---|---|
| 未知 format | 400 {"error": "unknown format"} |
| 编译异常（字形数据损坏） | 500 {"error": "compile failed", "detail": 前 200 字符}，不落盘 |
| exports 目录不可写 | 500 + 明确信息 |
| 只读工程（TTF 直开） | exportAs 前检查 backend 可写性，返回 400 |

## 6. 安全
- exports 目录路径由服务端生成（时间戳+工程名 sanitize），无用户可控路径穿越
- 下载路由沿用 PM authorize（会话校验），不公开匿名访问

## 7. 性能
- 编译在 asyncio executor 中执行（`asyncio.to_thread`），不阻塞事件循环
- 大字体（>5000 字形）首版接受秒级耗时；进度事件留 P2 接口
