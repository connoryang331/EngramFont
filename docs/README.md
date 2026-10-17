# docs/ Directory Guide

> Documentation governance modeled on visee: **AGENTS.md holds only pointers and post-finalization architectural facts**; the content itself is filed into the corresponding buckets by the rule "one feature per package / one bug per document / one decision per ADR". One difference from visee in this repository: feature documents are not split apart by type — each package is placed intact under `specs/NN-<feature>/` (the five-piece set shares one directory, keeping cross-reference paths shortest).

| Location | What goes there | Index |
|---|---|---|
| `specs/NN-<feature>/` | **Feature package (five-piece set)**: PRD (requirements + acceptance + rejected alternatives) → SPEC (technical specification) → PLAN → TASKS (work orders) → TEST (case table + result backfill). Required reading before building a feature; backfilled after implementation. | [specs/README.md](specs/README.md) |
| `bugfixes/` | **Fix records**: one bug, one document — symptom / root cause (file and line) / fix / verification. Every bug fix must leave a record. | [bugfixes/INDEX.md](bugfixes/INDEX.md) |
| `adr/` | **Architecture decision records**: changing architecture, settling conventions, removing mechanisms. Background / decision / rationale / rejected alternatives / consequences. | [adr/README.md](adr/README.md) |
| Root-level loose files | `ENGRAM-CHANGES.md` (patch ledger, chronological) / `backlog.md` (idea pool and mechanism notes — the upstream input for features) / `SYNC.md` (upstream sync discipline) / `CHANGELOG.md` (the upstream Fontra original, do not modify) | — |

## frontmatter and controlled tags

Every bugfix / ADR / feature-package document begins with frontmatter (grep-able, for future tool aggregation; this repo does not use Obsidian and the index is maintained as a hand-edited table — **new entries must be registered in the corresponding INDEX**):

```markdown
---
Id: BUG-<n> / ADR-<n> / REQ-<feature>-<n>
tags: [<domain tag>]
Status: fixed|open|mitigated|wontfix / accepted|superseded / open|implemented|partial|rejected
---
```

**Tag vocabulary** (register new tags here first; coining synonyms is forbidden; 1–4 per document, fewer is better):

- Tech layer: `frontend` · `backend` · `canvas` · `webcomponents`
- Domain components: `editor` · `settings` · `keyboard-dock` · `export` · `import` · `theme` ·
  `selection` · `nodes` · `testing` · `meta`

**Status values are in English** (for filtering/sorting), per bucket: specs → `open (finalized, awaiting implementation) / implemented / partial / rejected`; bugfixes → `fixed / open / mitigated / wontfix`; ADR → `accepted / superseded`.

## Conventions

- **Requirement execution order** (no exemptions): feature → create the package (PRD/SPEC/TASKS) → user confirmation → implementation (patch discipline) → backfill TEST.md + ENGRAM-CHANGES.md; architecture-level decisions are promoted to ADRs. Full text: [AGENTS.md](../AGENTS.md).
- **Test scripts** live uniformly in `e2e/` (Playwright) and `test-py/` / `test-common/` — **TEST.md holds only test records** (case tables / results / evidence paths), never scripts. e2e manages its own 8801 server + `.e2e-fonts`.
- **Pre-commit documentation gate**: `node docs/lint.cjs` (zero dependencies; rules: single H1, Id prefix↔directory, Id uniqueness, Status vocabulary, controlled tags, no broken relative links; specs/ checks only H1 and broken links). Scope = the three buckets of the new system (bugfixes / adr / specs) + docs root-level loose files; legacy directories (design/ discussions/ features/ product/ requirements/ testing/ wiki/ etc.) are not gated. A non-zero exit code = violations found; optionally wire it into `.githooks/pre-commit` (`git config core.hooksPath .githooks`; the hook file is self-provided).
- **Moving files in this directory requires updating the referencing parties in lockstep** (AGENTS.md / specs README / code comments / cross-referenced documents).
- `docs/specs/VERIFICATION-ENV.md` is the verification environment checklist (meshfont clone / port table) — required reading before overnight runs.
- Documentation language follows the repository convention (English primary, code identifiers kept in their original form).
