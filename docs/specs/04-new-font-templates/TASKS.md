# R4 · Task Breakdown

## T4.1 new-font webAPI (0.5d)
- Steps: handler (name/template validation → createNewFontAndPopulate → template injection → return)
- DoD: project creation via curl POST succeeds; 409/400 cases pass

## T4.2 landing UI (1d)
- Steps: New Font card (modal-dialog component) → submit → projectlist refresh → redirect to editor
- DoD: e2e assertions for the full flow

## T4.3 Template Data (1d)
- Steps: make-template.py generates latin-kernel.json (blocky A-Z a-z 0-9 outlines + codePoints);
  newfont.py injection logic (putGlyph per glyph)
- DoD: the latin-kernel template shows 62+ glyphs on open and they are editable

## T4.4 In-Editor New-Font Entry (0.5d)
- Steps: add New Font to the File menu (opens the landing New Font card or a direct dialog)
- DoD: creating from within the editor does not lose context
