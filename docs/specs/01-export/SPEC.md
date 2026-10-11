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

## 8. ExportManager 实现骨架（Python，新增文件起点）
```python
# src/fontra/filesystem/exportmanager.py
import asyncio, time, uuid
from pathlib import Path
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.pointPen import PointToSegmentPen
from fontTools.pens.transformPen import TransformPointPen
from fontTools.misc.transform import Transform


class EngramFontExportManager:
    def __init__(self, projectManager, exportsDirName=".exports"):
        self.projectManager = projectManager
        self.exportsDir = projectManager.rootPath / exportsDirName

    def getSupportedExportFormats(self):
        return ["ttf", "otf", "woff2"]

    async def exportAs(self, projectIdentifier, options):
        fmt = options.get("format", "ttf")
        if fmt not in self.getSupportedExportFormats():
            raise ValueError(f"unknown format: {fmt}")
        backend = self.projectManager.getBackend(projectIdentifier)
        # 编译在 executor 中执行，不阻塞事件循环
        outPath = await asyncio.to_thread(self._compileSync, backend, projectIdentifier, fmt)
        return {"downloadPath": f"/exports/{outPath.name}"}  # 路由由 webRoutes 静态挂载

    def _compileSync(self, backend, projectIdentifier, fmt):
        # 逐字形展平绘制 + FontBuilder + feaLib（详见 demo-liga/compile-bridge.py 已验证实现）
        ...  # 见 SPEC §3 管线 1-5 步
```
- 静态路由挂载：server.py 的 staticContentHandler 惯例（exports 目录加 authorize 校验）

## 9. E2E 骨架（e2e/export.spec.mjs，Playwright）
```js
import { test, expect } from "@playwright/test";
// playwright.config.mjs: testDir "../e2e"（相对 EngramFont 根）, use.baseURL 8800
// 前置：venv fontra server 于 8800 + MicroTon.ttf 工程（见 VERIFICATION-ENV.md）

test("File menu shows Export As formats", async ({ page }) => {
  await page.goto("/editor.html?project=MicroTon.ttf");
  // TODO: 打开 File 菜单 → 断言三项格式
});
test("export ttf downloads valid TTF", async ({ page }) => {
  // TODO: 触发导出 → download 事件 → 文件头断言 00010000
  // TODO: 进阶——下载后用 harfbuzzjs shape("ton") == 1 字形（连字进产物）
});
```

## 10. 导出对话框 UI 规范（1:1 复刻 meshfont，结构已从行为探针捕获）
```
┌ Export your font ────────────────────────────────┐
│ Choose a name and file format.                   │
│ Font name                                        │
│ [e.g. Wobble Grotesk____________]                │
│ Choose a fresh name for your font.               │
│ File format            [ TTF · install anywhere▾]│
│   · TTF · install anywhere                       │
│   · OTF · design apps                            │
│   · WOFF2 · websites                             │
│ [✓] Light, Regular and Bold                      │
│     Thickness variants of these outlines         │
│ [✓] Rebalance letter spacing                     │
│     Adjust side spacing around the sculpted      │
│     shapes.                                      │
│ License & credits                                │
│ Released under the SIL Open Font License...      │
│           [Download proof] [Download font]       │
└──────────────────────────────────────────────────┘
```
- 字段/文案/顺序按 meshfont 行为探针记录 1:1（test-export-formats 会话）
- 前端未捕获项：Download proof 的产物内容（proof sheet）——实现前需行为捕获

## 11. A/B 对比验收（"一模一样"的工程化定义）
```
同一工程（MicroTon：ton/dance/vance/lovely 连字）
  ├─ meshfont (8124) 导出 → reference.ttf/.otf/.woff2
  └─ EngramFont 导出   → candidate.ttf/.otf/.woff2
对比（ttx -t glyf -t name -t GSUB -t kern 语义 diff）：
  ├─ glyphOrder 完全一致
  ├─ 每字形轮廓坐标一致（浮点容差 ≤1 单位；meshfont 与 EngramFont
  │   编译器不同 → 允许曲线表示差异，渲染像素级对比兜底）
  ├─ name 表（family/style/uniqueID）/OS2 权重一致
  ├─ GSUB：liga 规则（ton/dance/vance/lovely）shaping 结果一致
  └─ 安装测试：系统安装后任意软件打 "ton/advanced" 连字生效
```
- 二进制逐字节相同**不承诺**（编译器不同，含时间戳）；以 ttx 语义等价 + 渲染像素对比为准
