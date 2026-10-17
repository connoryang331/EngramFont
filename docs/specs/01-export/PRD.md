# R1 · In-Browser Font Export · Requirements Document (PRD)

## Background
Fontra's export mechanism is complete, but the open-source repository **has no ExportManager implementation**, so in
`fontra --launch filesystem` mode the Export As entry in the File menu is entirely missing.

### Root-cause chain (verified against source)
1. `core/protocols.py:183` — `ExportManager` is only a Protocol (`exportAs` + `getSupportedExportFormats`, two methods); the repo contains no implementing class
2. `filesystem/projectmanager.py:63` — `FileSystemProjectManager(exportManager=None)`; the filesystem command does not pass one when constructing the PM
3. `core/fonthandler.py:175` — `projectManagerFeatures["export-as"]` only gets a value when `exportManager is not None`
4. `fontra-menus.js:126` — the frontend File menu renders conditionally on `backendInfo.projectManagerFeatures["export-as"]`; empty → the menu has no export item
5. `view-controller.js:88` — the export action is registered and calls `fontController.exportAs({format})`, but **the frontend has no download logic after receiving the result** (needs a small patch)

## Goals
- In filesystem mode, a File → Export As menu appears and can export
- Supported formats: TTF / OTF / WOFF2 (first version); family export (multiple sources → Light/Regular/Bold); proof sheet (P2)
- Exported fonts contain all glyph outlines + FEA compilation output (GSUB etc.) + kerning

## User stories
- As a font designer, after editing glyphs in local EngramFont I can go File → Export As → TTF and the browser downloads the finished font file
- As a designer with a multi-source (weight) project, I can export the whole family in one go

## Non-goals
- Cloud sharing/publishing (separate project)
- hinting (not for now)
- Variable font export (P2, only meaningful for designspace projects)

## Acceptance criteria (overview)
- Menu appears and lists ttf/otf/woff2
- Export artifacts: correct glyph count, outlines match the editor, GSUB (liga etc.) present, installs at the OS level and takes effect
- Export does not block editing (async), with progress/completion feedback
