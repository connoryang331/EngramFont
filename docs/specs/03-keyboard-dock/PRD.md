# R3 · Virtual Keyboard Dock · Requirements Document (PRD)

## Background
meshfont's signature UX: a persistent virtual keyboard at the bottom of the editor — clicking a letter key jumps straight to that glyph — plus a set of
function keys (DEL/view/move/mode switch/ctrl/alt/space). This is the core of the "typist-style" glyph browsing and editing flow.

## Goals
- A persistent keyboard dock at the bottom of the editor canvas (QWERTY layout + function keys); clicking a letter key switches the canvas to that glyph
- The dock includes mode keys: proof (enter proofing preview) / edit (return to editing) — depends on R5
- Every key that can hook into existing Fontra capabilities is wired directly — no reinventing the wheel

## User stories
- I press `g` on the keyboard and the canvas immediately shows the g glyph and enters editing; press the `ed` combo… (ligature group keys later)
- I press DEL and the last character of the current text is removed
- I hold alt and press a letter to switch case forms

## Key inventory (meshfont behavior observations + EngramFont mapping)
| Key | meshfont behavior | EngramFont implementation | Wiring |
|---|---|---|---|
| letters/numbers/punctuation | switch to that glyph | selectedGlyph = {glyphName, isEditing:true}; glyph missing → reuse the create-new-glyph dialog | same as editor.js:864/898 |
| DEL (orange) | delete | backspace the last text character (Q1, to confirm) | characterLines modification |
| ctrl/alt | modifiers | alt = case switch; ctrl = reserved (Q2) | dock internal state |
| space | add a space to the text | append a space to characterLines | same as above |
| move (wide) | canvas pan mode | pan toggle (persistent version of space-drag) | sceneView |
| 100% | zoom reset | reset viewBox | editor._zoom route |
| proof/edit mode keys | mode switch | canvas mode state machine | depends on R5 |

## Non-goals
- A full physical-keyboard replacement (physical keyboards use Fontra's existing shortcuts)
- IME/non-Latin layouts (first batch)

## Acceptance criteria (overview)
- Clicking a letter key: current glyph switches <100ms; missing glyphs pop the create dialog
- Dock visible in both proof/edit modes (meshfont behavior)
- Renders correctly in the dark theme
