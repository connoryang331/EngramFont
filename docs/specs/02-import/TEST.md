# R2 · Test Acceptance and Regression

## Unit tests (test-py/test_importfont.py)
| ID | Precondition | Steps | Expected |
|---|---|---|---|
| UT2.1 | Inter-Regular.ttf | convert | .fontra glyphMap glyph count matches |
| UT2.2 | same as above | sample 10 glyphs and compare | PackedPath bounds tolerance ≤0.5 |
| UT2.3 | source containing GSUB | convert | features.text non-empty |
| UT2.4 | corrupt file | convert | 400, no half-finished directory left behind |
| UT2.5 | woff2 source | convert | succeeds if OTFBackend can read it |

## E2E (e2e/import.spec.mjs)
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | import Inter from the landing page → open | editor glyph count matches; edit d and save |
| E2E-2 | import with an existing name | 409 notice |
| E2E-3 | reload | imported project still in the list |

## Regression
| Item | Assertion |
|---|---|
| Read-only open | opening project=TTF directly, without import, behaves unchanged |
| Project list | existing project ordering/rendering unchanged |

## Reference baseline
For the meshfont behavior baseline and local clone startup, see [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md) (port 8124; compare ligature/proof behavior item by item).

## Test font asset matrix (all in place)
| Font | Path | Purpose |
|---|---|---|
| Inter-Regular.ttf (2937 glyphs, GSUB+kern/GPOS) | fontra-test-fonts/ | real-font stress test: scale/performance/outline fidelity |
| MicroTon.ttf (25 glyphs, incl. liga GSUB) | fontra-test-fonts/ | feature-migration boundary test (verification that GSUB is not decompiled to FEA) |
| clone-family-font-Light/Regular/Bold.ttf (144-glyph family) | meshfont-clone/downloads/ | **round-trip test of meshfont's own exports**: import a font exported by meshfont → compare |
| clone-test-ttf.ttf / origin-test-font.ttf | meshfont-clone/downloads/ | historical export reference |
| Playfair.woff / NotoJP.woff / clone-woff2-test.woff2 | various | format coverage (woff/woff2 reading) |

## Feasibility pre-validation results (2026-10-11 spike, spike-import-roundtrip.py)
- OTFBackend reads Inter-Regular.ttf (2937 glyphs, 0.22s)
- Per-glyph writeGlyph → .fontra: **2937 glyphs in 3.1s** (ample performance)
- Read back: glyphMap 2937 fully identical ✓, sampled 20 glyphs with zero advance deviation ✓
- **Fidelity boundary (same for both)**: features.text=0, kerning=0 — binary GSUB/kern is not decompiled into FEA
  (meshfont's import likewise only preserves outlines/metrics/mapping); EngramFont advantage: the .fontra features.text
  can later be extended by hand/FEA editing
- **Engineering note**: Fontra backend disk writes are deferred — you must aclose/flush after writing before reading; stop the server before modifying project files
- Artifact: `demo-liga/Inter-Import-Test.fontra` (imported project with 2937 glyphs, kept as the R2 e2e fixture)
