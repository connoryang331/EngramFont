---
Id: ADR-0001
tags: [meta, frontend, backend]
Status: accepted
Date: 2026-10-12
---

# Fork patch discipline: frontend changes go in `src-js/` only, the client directory is a build output

## Background

EngramFont is a fork of Fontra (branch `engramfont-main`) and must stay in sync with
upstream continuously ([SYNC.md](../../SYNC.md)). The repository contains both:

- `src-js/` — the frontend source (nine npm workspaces: fontra-core / fontra-webcomponents /
  views-editor / views-applicationsettings / …), where agents do day-to-day development;
- `src/fontra/client/` — the **webpack output directory** (the destination configured in
  `webpack.config.cjs`; `npm run bundle` overwrites it wholesale, and JS/CSS files carry
  content-hashed names);
- `src/fontra/` — backend Python (filesystem projectmanager, export/import, etc.).

The earliest round of patches edited files directly inside the client output directory;
one rebuild wiped all of it away.

## Decision

- **All frontend changes are made in `src-js/`**; `src/fontra/client/` is treated as a
  read-only artifact — editing it is wasted effort.
- Change priority: **new files first (zero upstream conflicts) > one-line registration >
  small edits to existing files**; avoid touching core rendering files such as
  `canvas-controller.js` / `scene-model.js` — when an extension is genuinely needed, use
  **new methods / new visualization layers** and do not modify existing function bodies
  (precedents: `selectionAtParallelogram`, the parallelogram branch in `fontra.rect.select`).
- Backend changes live in `src/fontra/` (Python), preferring injection points
  (projectmanager constructor injection, a single-line mount in `setupWebRoutes`).
- **Every patch is recorded in [ENGRAM-CHANGES.md](../../ENGRAM-CHANGES.md)**
  (one section: changes + verification); this ledger doubles as the conflict checklist
  for upstream syncs.
- Branding (Fontra → EngramFont) goes uniformly through `rebrand-identifiers.mjs`;
  no scattered manual edits.

## Rationale

A fork's lifeline is its sync cost. Compressing changes into "new files plus a small
number of clearly registered edits to existing files" keeps the merge-conflict surface
with upstream minimal; the ledger lets every sync start by listing all self-modified
points at a glance.

## Consequences

- After changing the frontend you **must run `npm run bundle`** before the effect shows
  on :8800 (what gets served is always the build output) — this is the most common
  newcomer pitfall and is written into AGENTS.md as a hard constraint.
- Hashed file names change with content, so browser caches invalidate naturally.
- The "new methods" strategy for core files keeps the existing function bodies of files
  such as `scene-model.js` identical to upstream, so those files are essentially
  conflict-free during syncs.
