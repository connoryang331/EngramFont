---
Id: BUG-002
tags: [frontend, webcomponents, settings]
Status: fixed
---

# BUG-002 · Dependent row disabled states not refreshed after master toggle switch

Date: 2026-10-14  Status: fixed

## Symptom

After checking "Use custom node colors and sizes" on the settings page, the `disabled` state and
graying-out of the six color/size rows never changed (Playwright `fill` timed out after 30s; the
input stayed `disabled`).

## Root Cause

Two layers:

1. **Event echo suppression (structural)**: an `ObservableController` convention — the component's own
   `controller.setItem(key, value, this)` is ignored by its own `_modelListener`
   (`event.senderInfo === this`; Fontra uses it to protect in-progress input from being interrupted by
   re-renders). The other rows that depend on `nodeAppearanceCustom` therefore never re-rendered. The
   old structure had no dependent rows, so this convention had never surfaced as a problem.
2. **Implementation typo (caught on the spot by the probe)**: an intermediate version defined the
   helper as `tagDisabledTarget` while the call site wrote `tagDisabled`, producing a runtime
   `ReferenceError` after bundling — the headless probe script (pageerror listener) pinpointed it
   immediately. Lesson: run one headless smoke pass after changing, before delivering.

## Fix

Instead of re-rendering whole rows (which would rebuild the inputs and lose focus), a new
`SimpleSettings.refreshDisabledStates()` was added: for every row with `disabledWhen`, it toggles the
`disabled` class and the input `disabled` attribute **in place**; the checkbox's `onchange` calls it
explicitly; and it is also called once at the end of `_render()` as a fallback. The generic
`disabledWhen(model)` mechanism stays in the renderer.

## Verification

Playwright: after checking, all 3 number + 3 color inputs became enabled; after unchecking, all became
disabled (`qa/verify-settings.mjs`). Note: the master toggle was subsequently removed entirely
(ADR-0002); `disabledWhen`/`refreshDisabledStates` remain as generic capabilities.
