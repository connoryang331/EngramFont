# R3 · Test Acceptance and Regression

## Unit tests (vitest, src-js/views-editor/tests/)
| ID | Case | Expected |
|---|---|---|
| UT3.1 | keymap constant table completeness | every key has key/label/action |
| UT3.2 | modifier state switching | in alt state letter keys output the uppercase glyphName |
| UT3.3 | collapsed-state persistence | localStorage read/write |

## E2E (e2e/keyboard-dock.spec.mjs)
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | open the editor | dock visible, 28+ keys with complete aria-labels |
| E2E-2 | click g | selectedGlyph.glyphName=="g", canvas renders g |
| E2E-3 | click an uncreated glyph | create dialog appears → after creating, canvas shows it |
| E2E-4 | DEL/space | assert characterLines changes |
| E2E-5 | proof/edit keys | canvasMode switch assertion (depends on R5) |
| E2E-6 | collapse → reload | collapsed state persists |
| E2E-7 | dark theme | screenshot comparison (no hardcoded colors) |

## Regression matrix
| Item | Assertion |
|---|---|
| Physical keyboard shortcuts | existing editing/navigation behavior unchanged |
| Canvas editing | with the dock expanded, pen/point tools still work on the visible area |
| Performance | dock renders statically; no canvas framerate regression |
| glyph-search panel | coexists with the dock without conflict |

## Reference baseline
For the meshfont behavior baseline and local clone startup, see [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md) (port 8124; compare ligature/proof behavior item by item).
