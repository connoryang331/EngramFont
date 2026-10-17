# R5 · Proof/Edit Dual-Mode Canvas · PRD

## Background
meshfont's canvas has two modes: **proof (proof preview)** — a whole block of text rendered per typography, with ascender/mean line/baseline/descender full-width guidelines and 5 preview presets; and **edit** — focused glyph editing. Switching is via the proof/edit mode keys on the keyboard Dock.

**80% already exists in Fontra** (verified against source):
- Multi-line layout: scene-model.js:471/561 (lineHeight stacking) ✓
- Metrics guideline layer: fontra.lineMetrics (on by default, includes alignment zones) ✓ but drawn at single-glyph width
- Clicking a glyph in the text edits it directly ✓
- Font size / line height controls ✓

## Goals
- Canvas mode state machine: edit ⇄ proof (mesh reserved)
- proof state: full-width metrics guidelines (spanning the whole line rather than a single glyph) + editing tools disabled + one-click preset text
- Persistence: mode remembered (localStorage)

## User Story
- I click the Dock's proof key → the canvas becomes a whole-text proof view (guidelines span the full line) → check rhythm and letter spacing
- I click the edit key → back to glyph editing

## Non-Goals
- Editing glyphs in proof state (read-only view)
- Pagination / printing (later)

## Acceptance Criteria (Overview)
- Mode switch <100ms, persisted, both modes render correctly (screenshot comparison)
- edit-state regression all green (zero damage to existing functionality)
