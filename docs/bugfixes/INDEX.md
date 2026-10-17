# Bug Fix Record Index (Bugfix Index)

> **One bug, one record**: every time a bug is fixed, create a record in this directory —
> **the symptom name is the file name** (`YYYY-MM-DD-<topic>.md`), with frontmatter carrying
> `Id: BUG-<n>` / `Status` / `tags`. AGENTS.md only holds pointers; details do not go into it.
>
> **The standard drill for fixing a bug**: reproduce → pin down the root cause → fix → run regression
> tests → write the record. A record whose root cause is not written clearly (pointing to file and
> line) does not count as done; if the same area breaks again, read the old records before acting.

## Record Template

```markdown
---
Id: BUG-<n>
tags: [<domain tag; vocabulary list in docs/README.md>]
Status: fixed / open / mitigated / wontfix
---
# <one-sentence symptom>
Date: YYYY-MM-DD  Status: <same as above>

## Symptom
What the user saw (screenshot / reproduction steps).

## Root Cause
Why it was wrong — point to the specific file and line, explain the mechanism; don't just write "fixed".

## Fix
Which files changed and what the key changes are. If the requirement evolved as a result, link to the feature pack / ADR.

## Verification
Which tests ran (TC id), the results, evidence paths. A fix without regression verification = unverified.
```

## Index

| Date | Id | Record | Status |
|---|---|---|---|
| 2026-10-14 | BUG-001 | [Settings card radio group rendered as object HTMLDivElement](2026-10-14-settings-card-radio-group-object-placeholder.md) | fixed |
| 2026-10-14 | BUG-002 | [Dependent row disabled states not refreshed after master toggle switch](2026-10-14-master-toggle-row-disabled-state-stale.md) | fixed |
| 2026-10-14 | BUG-003 | [icon-button constructor parameter src failing, requesting undefined](2026-10-14-icon-button-src-prop-ignored.md) | fixed |
| 2026-10-14 | BUG-004 | [Node appearance real-time update passed wrong parameter, never took effect](2026-10-14-node-appearance-live-update-wrong-param.md) | fixed |
| 2026-10-14 | BUG-005 | [Keyboard dock covers lower canvas edge, drag start point swallowed by keycap](2026-10-14-keyboard-dock-swallowed-bottom-edge-drag.md) | mitigated |
