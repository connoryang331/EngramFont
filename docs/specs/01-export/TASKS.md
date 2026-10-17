# R1 · Task Breakdown

## T1.1 ExportManager skeleton + injection (0.5d)
- Files: new `src/fontra/filesystem/exportmanager.py`;
  modify `src/fontra/filesystem/__init__.py` (factory parameter), `src/fontra/__main__.py` (if there is an assembly point)
- Steps:
  1. Implement the getSupportedExportFormats / exportAs skeleton (exportAs throws NotImplementedError in the first version)
  2. When the filesystem factory constructs the PM: `exportManager=EngramFontExportManager(...)`
- DoD: after startup, GET /serverinfo returns projectManagerFeatures["export-as"] == ["ttf","otf","woff2"];
  Export As appears in the File menu (grayed out is acceptable)

## T1.2 TTF/OTF compilation (1d)
- File: the compilation function in exportmanager.py
- Steps:
  1. getBackend(projectIdentifier) (reuse PM.fontHandlers)
  2. Per-glyph flattened drawing (port of compile-bridge logic: PointToSegmentPen + TransformPointPen)
  3. FontBuilder + feaLib(addOpenTypeFeaturesFromString)
  4. Write to .exports/ and return downloadPath
- DoD: the TTF exported from the MicroTon.ttf project shapes "ton" == 1 glyph with harfbuzzjs (liga makes it into the artifact)

## T1.3 WOFF2 (0.5d)
- requirements.txt + brotli; flavor switch
- DoD: woff2 file header wOF2, loadable by browser FontFace

## T1.4 Frontend download wiring (0.5d)
- File: view-controller.js (1 line)
- DoD: E2E clicks the menu → browser download triggered

## T1.5 Family export (1d)
- Steps: iterate sources → instantiate compilation per source (file name carries the source name)
- DoD: a two-source project → two files, each with a distinct OS/2 usWeightClass
