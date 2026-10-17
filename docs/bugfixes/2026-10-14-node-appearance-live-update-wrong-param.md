---
Id: BUG-004
tags: [frontend, editor, theme]
Status: fixed
---

# BUG-004 · Node appearance "real-time updates" never actually took effect

Date: 2026-10-14  Status: fixed

## Symptom

Changing node colors/sizes on the settings page did not update the editor canvas immediately; it only
took effect after reopening the glyph context — yet the R4-T4.25 record says "rebuild the
visualization layers in real time".

## Root Cause

The real-time listener callback in `src-js/views-editor/src/editor.js` passed the wrong parameter:

```js
themeController.addKeyListener(key, () => {
  applyNodeAppearanceSettings(visualizationLayerDefinitions);  // ← array passed as model
  ...
});
```

In the old implementation, reading `model.nodeAppearanceCustom` off the array yielded `undefined` →
it took the else branch "restore built-in defaults" — effectively **resetting the layers back to
defaults on every key change**, so the real-time update existed in name only.

## Fix

Pass `themeController.model`; along the way, per ADR-0002, remove the `nodeAppearanceCustom` branch
(custom appearance is applied unconditionally), and remove that key from the listener key list
accordingly.

## Verification

Playwright: changing `nodeSmoothSize` = 14 on the settings page →
`localStorage["engramfont-nodeSmoothSize"]` = "14" (the sizeEditPersisted / localStorage checks in
`qa/verify-slant.mjs`); on the canvas side, after the editor reopens the context, node styling matches
the settings (the existing R4-T4.25 verification path).

## Notes

Lesson: **eyeball the types of listener callback parameters** — a wrong object doesn't throw; it just
silently takes the wrong branch, which is harder to catch than a crash.
