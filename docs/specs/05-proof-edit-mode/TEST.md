# R5 · Test Acceptance & Regression

## Unit Tests
| ID | Case | Expected |
|---|---|---|
| UT5.1 | canvasMode read/write / persistence | localStorage in sync |
| UT5.2 | preset constant table completeness | 5 presets non-empty and contain assertion lines |

## E2E (e2e/proof-edit-mode.spec.mjs)
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | proof key | guideline layer width == full line (canvas pixel sampling or SVG snapshot) |
| E2E-2 | edit key | tools restored, selection usable |
| E2E-3 | preset click | text content assertion |
| E2E-4 | reload | mode preserved |
| E2E-5 | dark theme | screenshot comparison of both modes |

## Regression Matrix (focus: zero regression in edit state)
| Item | Assertion |
|---|---|
| Glyph editing | pen point dragging / glyph selection / point deletion all work |
| Ligature shaping | MicroTon "ton" == 1 glyph, "advanced" == 3 glyphs |
| Multi-line layout | wrapping + line-height adjustment render unchanged |
| Zoom / pan | usable in both modes |
| Performance | mode switch <100ms; no memory leaks (toggled 20 times repeatedly) |

## Reference Baseline
For the meshfont behavior baseline and local clone startup, see [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md) (port 8124; compare ligature/proof behavior item by item).

## Comparison Tools (for the execution session)
- `demo-liga/probe-proof-keys.mjs`: **behavior-capture script** for the three proof toolbar buttons + dropdown menu (already written) —
  when executing R5, run it first to capture meshfont's actual kern/space/proof text and menu structure, then verify the implementation against it.
  (Not run during the documentation phase, per user instruction.)
