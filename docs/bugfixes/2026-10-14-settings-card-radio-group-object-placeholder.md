---
Id: BUG-001
tags: [frontend, webcomponents, settings]
Status: fixed
---

# BUG-001 · Settings card radio group rendered as "[object HTMLDivElement]"

Date: 2026-10-14  Status: fixed

## Symptom

In App settings → the Theme settings card, the spot where the radio group (Automatic/Light/Dark)
should be showed a line of text
`[object HTMLDivElement],[object HTMLDivElement],[object HTMLDivElement]` (user screenshot).

## Root Cause

The `render()` in `src-js/fontra-webcomponents/src/simple-settings.js`: for uniform styling it wraps
all rows in a `div.settings-list`; but the `radio` renderer returns an **array of rows** (one row per
option). `createDomElement` attaches children with `element.append(children)` — passing the array in
gets it `toString()`-ed into one line of text.

The old implementation didn't break because `render()`'s return value went straight to
`UnlitElement._render()`, which does `elements.flat()`; once a div wraps everything, the
responsibility for flattening falls on the code itself.

## Fix

In `render()`, call `.flat()` after `.map(...)` before mounting (one line in the same file).

## Verification

Playwright opened the three settings-page cards — Theme settings / Display language / Clipboard: the
body contains no `[object`, and the radio text renders normally (in `qa/verify-v3.mjs`,
`display-languageObjectString` / `clipboardObjectString` are both false).
