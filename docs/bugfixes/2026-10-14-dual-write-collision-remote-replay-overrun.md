---
Id: BUG-006
tags: [testing, meta, editor]
Status: fixed
---

# BUG-006 · Automated test and user live-session dual-write collision, remote change replay out-of-bounds

Date: 2026-10-14  Status: fixed

## Symptom

While the user was operating normally in the editor (drawing rectangles, clicking nodes), the console
kept reporting `contourPointIndex out of bounds: 6 / 9` (`applyChange` went out-of-bounds while
replaying a `deletePoint` change, from the remote change application in `_editGlyphAndRecordChanges`),
and node shapes on the canvas "changed by themselves" (squares turning into almond shapes — in fact
the automated session's smooth flag change was replayed into the user's view).

## Root Cause

**Dual-write collision** (an EXECUTION.md red-line scenario): the agent's headless verification scripts
(verify-slant / verify-almond / verify-delete / verify-togglesmooth…) performed unattended write
operations (deleting points, deleting quads, toggling smooth, changing point types) on the 8800
instance and Untitled.fontra project **the user was actively using**. Fontra broadcasts each session's
modifications as changes to the other sessions of the same project — when the agent session's
delete-point/reshape changes were replayed into the user's session, the two sides' glyph states had
already diverged and the indexes no longer matched → out-of-bounds; what the user saw change = the
agent session's smooth flag change replayed into the user's view.

## Fix (discipline + isolation)

1. **Any write-operation verification by the agent must go through the isolated e2e instance** (8801 +
   `.e2e-fonts`, see playwright.config.mjs), or first stop the user's 8800 instance and get their
   consent; **unattended write operations against the user's live instance are forbidden** (already
   written into AGENTS.md as a hard constraint).
2. When a read-only check on real data is needed (screenshots / data dumps), read only — never write.

## Verification

The delete-point matrix on the 8801 isolated instance (single point / consecutive / scattered /
wrap-around / entire contour) all passed with no out-of-bounds; zero writes to the user's instance.

## Notes

- The incident also corrupted the "o" glyph of Untitled.fontra (the agent's delete-point matrix
  emptied it). The original 24-point data is preserved in the session logs and can be rebuilt as
  needed; the user can also roll back the changes the agent broadcast in with Ctrl+Z in their own
  session.
- The "only off-curve points" in the user's f/h/i/l/n/r/v/y glyphs is the user's blob letter design
  (pure quad closed contours), not corruption — canvas rendering was verified to be normal.
