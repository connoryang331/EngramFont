---
Id: BUG-005
tags: [testing, keyboard-dock, editor]
Status: mitigated
---

# BUG-005 · Keyboard dock covers the lower edge of the canvas; drag start points swallowed by keycaps

Date: 2026-10-14  Status: mitigated

## Symptom

In e2e/manual testing, starting a drag in the lower part of the canvas (y≈710 / 850 @1440×900) got no
response at all; in one real run, a click meant for the canvas landed on the dock's "s" keycap — the
text "s" was inserted, the "Create a new glyph "s"?" modal popped up, and all subsequent input was
swallowed by the modal.

## Root Cause

The keyboard dock (`keyboard-dock.js`) overlays a wide band across the bottom of the canvas as a
floating layer, and its keycaps are hit-testable. Playwright/CDP dispatches events to the **topmost
element** — hitting a dock keycap = the canvas never receives pointerdown, and `handleDrag` never even
starts (measured `dragCalls: 0`).

## Mitigation

- **Test side** (in place): before dragging/clicking, use `document.elementsFromPoint` to assert that
  the landing point is `#edit-canvas`; use `canvasController.setViewBox` to scale the glyph into the
  upper part of the canvas (leaving the dock band clear) before interacting — see the pattern in
  `qa/verify-slant.mjs`.
- **Product side** (watch item): the dock intercepting canvas gestures is by design (the dock is the
  keyboard), but the mis-taps from "landing points right against the dock's top edge" are worth a
  follow-up evaluation of narrowing the dock's hit area.

## Verification

`qa/verify-slant.mjs`: after zooming, all three interaction segments — rectangle / diagonal / fixed
angle — ran through (previously 0 responses).
