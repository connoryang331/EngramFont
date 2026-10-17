---
Id: ADR-0002
tags: [frontend, settings, theme, nodes]
Status: accepted
Date: 2026-10-14
---

# Node appearance settings always on: remove the "Use custom node colors and sizes" master toggle

## Background

R4-T4.25 added a Node appearance card to Theme settings: a master toggle
(`nodeAppearanceCustom`, default false) plus six sub-settings (3 colors + 3 sizes).
The sub-settings were **editable at any time**, but were only applied by
`applyNodeAppearanceSettings` while the toggle was checked — editing them while it was
off was "silently ineffective"; and because it defaulted to off, new users saw editable
settings that did nothing.

User feedback (verbatim): "The 'Use custom node colors and sizes' one is quite
redundant — remove it."

## Decision

- Remove the master toggle and the `nodeAppearanceCustom` model key (theme-settings.js).
- `applyNodeAppearanceSettings` applies custom colors/sizes **unconditionally**
  (the if/else branch is removed).
- Also fixes the live listener passing the wrong argument
  (see [BUG-004](../bugfixes/2026-10-14-node-appearance-live-update-wrong-param.md)).

## Rationale

1. The toggle's semantics contradicted the UI: the sub-settings were always editable
   yet only took effect when the toggle was checked.
2. The user explicitly asked for removal, and without it the behavior is more
   straightforward (a setting = it takes effect).
3. One fewer state means one fewer path that can drift (toggle state + six values =
   seven persisted states → six).

## Rejected alternatives

- **Keep the toggle and gray out the sub-rows with it** (macOS settings style): the
  generic `disabledWhen` + `refreshDisabledStates` mechanism (BUG-002) had already been
  implemented at the time, but the user clearly said the toggle was redundant — keeping
  it would only turn "silently ineffective" into "grayed-out ineffective" without
  solving the underlying problem. The mechanism stays; the master toggle goes.
- **Keep the key and change the default to true**: an old `false` in localStorage would
  keep suppressing the settings, and there would be no UI to flip it back — leaving a
  landmine for existing users.

## Consequences

- `themeController` has one fewer key; a leftover old `engramfont-nodeAppearanceCustom`
  entry is harmless.
- The three node layers (`fontra.nodes` / `fontra.component.nodes` /
  `fontra.selected.nodes`) always use the custom colors/sizes; setting changes reflect
  on the canvas **immediately** (after the fix).
- `disabledWhen` / `refreshDisabledStates` became a generic capability of
  `simple-settings`, left for later panels that need dependencies.

## Related

- Feature pack: [docs/specs/08-node-appearance-settings/](../specs/08-node-appearance-settings/)
- Ledger: ENGRAM-CHANGES.md "R4-T4.26"
