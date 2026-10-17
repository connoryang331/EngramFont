# R8 · Node Appearance Settings Rework (One Row per Type + reset) · Requirements Document (PRD)

## Background

R4-T4.23 gave canvas nodes type-based coloring (smooth violet dots / corner amber squares / handle grayish-purple small dots),
and R4-T4.25 added a settings page (a master switch + three colors + three sizes, with a scattered row layout where controls come first).
After using it, the user raised three points (2026-10-14):

1. The master switch is redundant → remove it (final decision in [ADR-0002](../../adr/0002-node-appearance-always-on.md));
2. Row rework: **text first, settings after**, **one row** per node type: `Smooth node [size][color][reset]`;
3. The panel is too long (cards stretch across the full window width) → fix it.

## Goals

1. One row per node type: **label · size input · color swatch · reset icon** (reset restores that row's defaults);
2. Color swatch shape follows the node shape: Smooth=round, Corner=square, Handle=round;
3. Settings are **always on** (no master switch); changes take effect on the canvas immediately;
4. Both light/dark themes render correctly; settings persist (`engramfont-node*` keys).

## User Stories

- I drag the Smooth node's size (wheel or type 14) → the violet dot on the canvas grows immediately, and after reopening the editor it is still 14;
- I tried Corner's color as red → click reset at the end of the row → back to the amber default.

## Non-Goals

- Multiple preset schemes per node type; saving node appearance per project (rather than globally).

## Acceptance Criteria (Overview)

- The three-row structure is correct (label first, size+color+reset after); reset restores defaults in one click and persists them;
- Color swatch shapes round/square map one-to-one to canvas nodes;
- No master switch; changes take effect immediately (live listener fix, BUG-004);
- The settings panel row component is a general capability (text-first + combined); the other two panel layouts are unaffected.

> Design trade-offs and rejected alternatives (such as graying out the master switch) are in [ADR-0002](../../adr/0002-node-appearance-always-on.md) and
> [ADR-0004](../../adr/0004-settings-rows-text-first-combined.md).
