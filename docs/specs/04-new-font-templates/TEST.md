# R4 · Test Acceptance & Regression

## Unit Tests
| ID | Steps | Expected |
|---|---|---|
| UT4.1 | new-font name="ok-1" template=latin-kernel | .fontra generated, 62+ glyphs, correct codePoints |
| UT4.2 | name contains `/` or is empty | 400 |
| UT4.3 | duplicate name | 409 |
| UT4.4 | template=unknown | 400 |

## E2E (e2e/new-font.spec.mjs)
| ID | Steps | Expected |
|---|---|---|
| E2E-1 | landing → New Font → latin-kernel → open | seed glyphs visible on canvas, points draggable for editing |
| E2E-2 | blank template | empty project opens without crashing |
| E2E-3 | project list refresh | new project appears in the list |

## Regression
| Item | Assertion |
|---|---|
| Project list | existing projects unaffected |
| CLI | `fontra new` behavior unchanged |
| Import (R2) | coexists without conflicts |

## Reference Baseline
For the meshfont behavior baseline and local clone startup, see [../VERIFICATION-ENV.md](../VERIFICATION-ENV.md) (port 8124; compare ligature/proof behavior item by item).
