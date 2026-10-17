# R1 · In-Browser Font Export · Technical Specification

## 1. Architecture and Data Flow
```
File menu item (fontra-menus.js:126, existing, rendered conditionally on the export-as feature)
  └─ action.export-as.<format> (view-controller.js:88, registration exists)
      └─ fontController.exportAs({format}) (font-controller.js:1065, remote call)
          └─ fonthandler.exportAs (fonthandler.py:605, existing, delegates to exportManager)
              └─ EngramFontExportManager.exportAs (new in this requirement)
                    ├─ backend reads (getGlyphMap/getGlyph/getFeatures/getSources)
                    ├─ fontTools FontBuilder compilation (incl. FEA→GSUB)
                    ├─ write to disk <project dir>/.exports/<ts>/<name>.<ext>
                    └─ return {"downloadPath": "/exports/<ts>/<name>.<ext>"}
  ← frontend callback [new] window.open(downloadPath) triggers a browser download
```

## 2. Interface Contracts

### ExportManager (implements the core/protocols.py:183 Protocol)
```python
class EngramFontExportManager:
    def getSupportedExportFormats(self) -> list[str]:
        return ["ttf", "otf", "woff2"]

    async def exportAs(self, projectIdentifier: str, options: dict) -> dict:
        # options: {"format": "ttf"|"otf"|"woff2"}
        # returns: {"downloadPath": "/exports/<ts>/<safe-name>.<ext>"}
        # exceptions: ValueError("unknown format") / RuntimeError("compile failed: ...")
```

### Frontend change (view-controller.js:94, one line)
```js
(event) => this.fontController.exportAs({ format })
  .then((r) => r.downloadPath && window.open(r.downloadPath))
```

## 3. Compilation Pipeline (productization of the verified demo-liga/compile-bridge.py path)
1. `glyphMap = await backend.getGlyphMap()`; glyphOrder = sorted(keys)
2. Per glyph: `getGlyph(name)` → take the default layer StaticGlyph
   - Outlines: `sg.path.drawPoints(PointToSegmentPen(pen))`
   - Component flattening: `sg.components` one by one → `getGlyph(comp.name)` recursively as above,
     via `TransformPointPen(PointToSegmentPen(pen), Transform().translate(tx, ty))`
   - Metrics: `xAdvance`
3. `FontBuilder(upem, isTTF=fmt=="ttf")`: setupGlyphOrder/CharacterMap/Glyf/
   HorizontalMetrics/HorizontalHeader(ascent,descent)/NameTable/OS2/Post
4. FEA: `fea = await backend.getFeatures()` →
   `addOpenTypeFeaturesFromString(fb.font, fea.text)` (GSUB; backtrack-class rules are injected
   by compile-bridge's auto-generation logic — all glyphs ending in `*ance`)
5. WOFF2: set `fb.font.flavor = "woff2"` before `fb.save(path)` (requires brotli)
6. OTF: `isTTF=False` (CFF table converted by fontTools)

## 4. File Inventory
| File | Operation | Content |
|---|---|---|
| `src/fontra/filesystem/exportmanager.py` | new | EngramFontExportManager class |
| `src/fontra/filesystem/projectmanager.py` | 1-line change | pass exportManager when the filesystem factory constructs the PM |
| `src-js/fontra-core/src/view-controller.js` | 1-line change | add download to the export callback |
| `requirements.txt` | 1-line change | + brotli |

## 5. Error Handling Matrix
| Scenario | Behavior |
|---|---|
| Unknown format | 400 {"error": "unknown format"} |
| Compilation exception (corrupt glyph data) | 500 {"error": "compile failed", "detail": first 200 chars}, nothing written to disk |
| exports directory not writable | 500 + explicit message |
| Read-only project (TTF opened directly) | check backend writability before exportAs, return 400 |

## 6. Security
- The exports directory path is generated server-side (timestamp + sanitized project name); no user-controllable path traversal
- The download route reuses PM authorize (session validation); no anonymous public access

## 7. Performance
- Compilation runs in an asyncio executor (`asyncio.to_thread`) and does not block the event loop
- Large fonts (>5000 glyphs): the first version accepts second-scale latency; progress events are left as a P2 interface

## 8. ExportManager Implementation Skeleton (Python, starting point for the new file)
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
        # compile in an executor so the event loop is not blocked
        outPath = await asyncio.to_thread(self._compileSync, backend, projectIdentifier, fmt)
        return {"downloadPath": f"/exports/{outPath.name}"}  # route mounted statically by webRoutes

    def _compileSync(self, backend, projectIdentifier, fmt):
        # per-glyph flattened drawing + FontBuilder + feaLib (see the verified implementation in demo-liga/compile-bridge.py)
        ...  # see SPEC §3 pipeline steps 1-5
```
- Static route mounting: the server.py staticContentHandler convention (add authorize validation to the exports directory)

## 9. E2E Skeleton (e2e/export.spec.mjs, Playwright)
```js
import { test, expect } from "@playwright/test";
// playwright.config.mjs: testDir "../e2e" (relative to the EngramFont root), use.baseURL 8800
// Prerequisites: venv fontra server on 8800 + MicroTon.ttf project (see VERIFICATION-ENV.md)

test("File menu shows Export As formats", async ({ page }) => {
  await page.goto("/editor.html?project=MicroTon.ttf");
  // TODO: open the File menu → assert the three formats
});
test("export ttf downloads valid TTF", async ({ page }) => {
  // TODO: trigger export → download event → assert file header 00010000
  // TODO: advanced — after download, harfbuzzjs shape("ton") == 1 glyph (liga makes it into the artifact)
});
```

## 10. Export Dialog UI Spec (1:1 replica of meshfont; structure already captured from behavior probes)
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
- Fields/copy/order are 1:1 per the meshfont behavior probe records (test-export-formats session)
- Not captured on the frontend: the artifact content of Download proof (proof sheet) — needs behavior capture before implementation

## 11. A/B Comparison Acceptance (an engineering definition of "identical")
```
Same project (MicroTon: ton/dance/vance/lovely ligatures)
  ├─ export from meshfont (8124) → reference.ttf/.otf/.woff2
  └─ export from EngramFont      → candidate.ttf/.otf/.woff2
Compare (ttx -t glyf -t name -t GSUB -t kern semantic diff):
  ├─ glyphOrder fully identical
  ├─ per-glyph outline coordinates identical (float tolerance ≤1 unit; meshfont and
  │   EngramFont use different compilers → curve representation differences allowed,
  │   with pixel-level rendered comparison as the fallback)
  ├─ name table (family/style/uniqueID) / OS2 weights identical
  ├─ GSUB: liga rules (ton/dance/vance/lovely) produce identical shaping results
  └─ install test: after OS install, typing "ton/advanced" in any app applies the ligature
```
- Byte-for-byte binary identity is **not promised** (different compilers, includes timestamps); ttx semantic equivalence + rendered pixel comparison is the standard
