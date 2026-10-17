# R2 · Task Breakdown

## T2.1 Conversion function (1d)
- File: new importfont.py
- Steps: read source → create .fontra → migrate the five data categories (glyphs/map/features/sources/kerning)
- DoD: unit-test round-trip equality (glyphMap sets equal; sampled bounds equal)

## T2.2 webAPI endpoint (0.5d)
- File: projectmanager.py (append the import-font handler to setupWebRoutes)
- DoD: curl-uploaded ttf → 200 + .fontra generated

## T2.3 landing UI (0.5d)
- Files: landing.html + landing.css (sources under src-js/projectmanager-filesystem/)
- DoD: e2e clicks import → editor opens the imported project

## T2.4 Fault tolerance (0.5d)
- DoD: e2e assertions for the three error classes (400/409)
