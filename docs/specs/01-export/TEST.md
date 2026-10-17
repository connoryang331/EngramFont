# R1 · Test Acceptance and Regression

## Unit tests (test-py/test_exportmanager.py, pytest)
| ID | Precondition | Steps | Expected |
|---|---|---|---|
| UT1.1 | filesystem project | getSupportedExportFormats() | ["ttf","otf","woff2"] |
| UT1.2 | MicroTon project | exportAs ttf → read artifact | glyphOrder == source; GSUB present |
| UT1.3 | same as above | inspect the 'ed' glyph | contains e.initia/d components or flattened outlines, bounds>0 |
| UT1.4 | empty project | exportAs ttf | produces an empty font successfully, no crash |
| UT1.5 | format="abc" | exportAs | ValueError |
| UT1.6 | read-only backend | exportAs | 400 semantic error |

## E2E (Playwright, e2e/export.spec.mjs)
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | open editor → File menu | Export As lists ttf/otf/woff2 |
| E2E-2 | click Export As ttf | download event, file header 00010000 |
| E2E-3 | export the MicroTon project | after download, shape("ton")==1 glyph |
| E2E-4 | click the canvas during export | editing still responsive (no blocking) |

## Regression matrix
| Item | Assertion |
|---|---|
| Editing | pen/point tool behavior unchanged |
| Saving | glyph edits auto-save normally |
| Performance | zero overhead when not exporting (lazy initialization) |
| Branding | menu/dialog copy follows the engramfont-* system |

## Reference baseline
For the meshfont behavior baseline and local clone startup, see [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md) (port 8124; compare ligature/proof behavior item by item).

## A/B comparison acceptance (R1 upgrade: semantic equivalence with meshfont exports)
| ID | Steps | Expected |
|---|---|---|
| AB-1 | export the same MicroTon project to TTF from 8124/8800 | ttx glyf: identical glyphOrder, per-glyph outline coordinate diff ≤1 unit |
| AB-2 | name/OS2 tables | identical family/style/usWeightClass |
| AB-3 | GSUB | liga lookup present and "ton" shaping == 1 glyph (identical in both artifacts) |
| AB-4 | install test | after OS install, all three "advanced" ligature groups apply in any app |
| AB-5 | WOFF2 | after unpacking, glyf matches the TTF |
| AB-6 | rendering comparison | pixel diff for the same text at the same size < threshold |
