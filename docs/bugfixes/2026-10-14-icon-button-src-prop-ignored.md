---
Id: BUG-003
tags: [frontend, webcomponents]
Status: fixed
---

# BUG-003 · icon-button constructor parameter src has no effect, requests /undefined

Date: 2026-10-14  Status: fixed

## Symptom

The row-level reset icon on the settings page was blank; the console showed 9×
`404 http://localhost:8800/undefined` + 9× `pageerror: t.removeAttribute is not a function`.

## Root Cause

`new IconButton("/tabler-icons/refresh.svg")` — the `IconButton` constructor writes src as an
**attribute** (`this.setAttribute("src", src)`), but `IconButton extends UnlitElement` and declares
`static properties = { src: {...} }`: at construction time `_setupProperties()` defines a `src`
**property accessor** on the instance (the value is stored in `_propertyValues`), and `render()` reads
`this.src` (the property) — the attribute is never read back, so it gets `undefined`.

Downstream chain: `InlineSVG` fetches `"undefined"` → 404 → `htmlToElement` takes
`template.content.firstChild` from the 404 response body (a text node) →
`svgElement.removeAttribute` does not exist → `TypeError`.

## Fix

Following the repo's existing convention (same pattern as `panel-transformation.js` and the like),
switch to property assignment:

```js
createDomElement("icon-button", { src: "/tabler-icons/refresh.svg", class, title, onclick })
```

## Verification

`qa/probe-404.mjs`: no 404, no pageerror; the icon renders and brightens on hover
(`qa/v4-node-card-hover.png`).

## Notes

**General lesson**: any component that inherits from `UnlitElement` and declares `static properties`
will hit this pitfall with constructor parameters — always go through `createDomElement` property
assignment (already registered as a hard constraint in AGENTS.md).
