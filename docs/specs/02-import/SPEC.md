# R2 · Import Font → Editable Project · Technical Specification

## 1. Architecture and Data Flow
```
landing "Import font" button (new)
  └─ POST /api/import-font (multipart: file)
      └─ [new] importFontHandler (mounted in filesystem PM webRoutes)
          ├─ write to disk <rootPath>/<safe-name>.<ext>
          ├─ srcBackend = getFileSystemBackend(<file>)   # OTFBackend read-only
          ├─ dstBackend = newFileSystemBackend(<file stem>.fontra)
          │    ├─ putSources (lineMetrics migrated)
          │    ├─ putFeatures (features.text migrated verbatim)
          │    ├─ putGlyphMap + per-glyph getGlyph→putGlyph (component references preserved)
          │    └─ putKerning (migrated when present in the source)
          └─ return {"project": "<stem>.fontra"}
  ← frontend redirects to editor.html?project=<stem>.fontra
```

## 2. Interface Contract
```
POST /api/import-font
  body: multipart/form-data {file: <font binary>, name?: string}
  200: {"project": "Imported.fontra"}
  400: {"error": "unsupported"| "bad file"}   409: {"error": "name exists"}
```

## 3. Conversion Details
- Glyphs: getGlyph returns a VariableGlyph which is putGlyph'd directly (structure identical to the source, component references preserved;
  when a reference target is missing, degrade to flattened outlines and log a warning)
- glyphMap: source getGlyphMap() → putGlyph(codePoints) per name (putGlyphMap is a no-op;
  mappings are registered by putGlyph — verified at fontra.py:127)
- sources: getSources → putSources (lineMetricsHorizontalLayout includes ascender/descender)
- features: put only when getFeatures().text is non-empty (skip when the source has no GSUB)
- kerning: try getKerning → put when non-empty

## 4. File Inventory
| File | Operation |
|---|---|
| `src/fontra/filesystem/importfont.py` | new (conversion function) |
| `src/fontra/filesystem/projectmanager.py` | modify (mount the import endpoint in webRoutes) |
| `src-js/projectmanager-filesystem/landing.html` + `landing.css` | modify (import button) |

## 5. Error Handling Matrix
| Scenario | Behavior |
|---|---|
| Unsupported extension | 400 unsupported |
| Corrupt font (parse throws) | 400 bad file + message |
| Project name already exists | 409 + suggest the `-imported` suffix |
| Very large font (>10k glyphs) | accepted; streamed writes, 120s timeout |

## 6. Security
- File name sanitization (strip path separators); 50MB size cap
- Upload session reuses PM authorize
