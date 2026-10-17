# R1 · Plan

## Milestones
- M1 (T1.1-T1.2): ExportManager integration + working TTF compilation → File menu lights up and can produce TTF
- M2 (T1.3-T1.4): OTF/WOFF2 + frontend download loop → all three formats pass
- M3 (T1.5): family export

## Dependency graph
T1.1 → T1.2 → {T1.3, T1.4} → T1.5

## Rollback
All changes are concentrated in new files + 3 single-line modifications; a single-commit revert is enough.
