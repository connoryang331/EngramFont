---
Id: ADR-0004
tags: [frontend, settings, webcomponents]
Status: accepted
Date: 2026-10-14
---

# Settings panel rows: text first + the combined row type + row-level reset

## Background

`SimpleSettings` (the row renderer shared by the three application-settings panels)
originally laid out **controls first, text after** (color swatch / number box on the
left, label on the right), so the node appearance card was "six orphaned rows with no
grouping", and the panel was stretched across the full window width. The user asked for
a rearrangement: "text first, settings after", then added: "Smooth/Corner/Handle each
row = text + size + color (+ reset icon)".

## Decision

- **Rows uniformly "text first, controls after"**: `.settings-row` = label on the left,
  controls right-aligned, with hairline separators between rows
  (`--horizontal-rule-color`, clipped to 35%); checkbox/radio rows also get text on the
  left.
- **New `combined` row type**: one label + `controls[]` (reusing the existing
  controlBuilders: number-wheel / color / …) + optional `resettable` (a reset icon
  button at the end of the row that restores all of the row's `default` values in one
  click; the input elements update **in place**, with no re-render and no loss of
  focus).
- **Node appearance rows** = text + size + color + reset; the swatch shape follows the
  node shape (`shape: "round" | "square"` → 50% circle / 0.2em square).
- **Card width cap**: the five card-style settings panels get `max-width: 32em`
  (the shortcuts table panel stays full width).
- Generic capability: `disabledWhen(model)` + `refreshDisabledStates()`
  (gray-out in place).

## Rationale

1. Text first is the industry convention for settings panels (macOS System Settings
   style); scanning relies on a single left-aligned column of text.
2. Size and color for the same node type are **one** intent ("what this node looks
   like"); splitting them across two rows scatters it.
3. Reset is a high-frequency action (try a color → back to default); there is no
   reliable way to hand-edit each item back to where it was.
4. The swatch shape maps one-to-one onto the canvas node shape, so settings and canvas
   corroborate each other.

## Rejected alternatives

- **Only restyle the theme panel, as a new standalone component**: `SimpleSettings` is
  shared by three panels; writing another one means a second row renderer. Making the
  rearrangement a generic uiTypes capability lets display-language / clipboard benefit
  along the way.
- **Keeping the "(scroll or type)" copy inside the label**: the same hint repeated on
  three rows was too noisy; it moved to the number input's `title` tooltip
  (`title: "Scroll or type"`), with scroll behavior unchanged.

## Consequences

- The `theme` / `display-language` / `clipboard` panels all adopt the new layout (radio
  rows have text on the left and the radio button on the right).
- `_keys` now recursively collects `controls[].key`, so model values changed externally
  still drive re-renders.
- The new generic capabilities `combined` / `resettable` / `disabledWhen` / `shape` all
  have real consumers (the node appearance rows) or are left for panel extensions.
- The rendering wrapper layer `.settings-list` at one point introduced a regression from
  a radio array not being flattened (BUG-001) — since fixed.

## Related

- Feature pack: [docs/specs/08-node-appearance-settings/](../specs/08-node-appearance-settings/)
- Ledger: ENGRAM-CHANGES.md "R4-T4.26"
