# R4 · New Font / Template Flow · PRD

## Background
In filesystem mode, creating a new project currently works only from the command line (`fontra new <path>`; the backend function createNewFontAndPopulate already exists), with no UI entry point. meshfont's "welcome dialog + template cards" lets new users start designing in 10 seconds.

## Goals
- The landing page gets a "New Font" card: enter a project name + choose a template (blank / common Latin / Japanese kana set, etc.)
- Generate an editable .fontra project and open the editor directly
- Template content = a pre-extracted seed glyph set (outlines from open-source fonts under the OFL license)

## User Story
- A new user opens EngramFont for the first time: clicks "New Font" → selects "Common Latin" → immediately sees a batch of editable glyphs

## Non-Goals
- Online template marketplace; a custom template editor (later)

## Acceptance Criteria (Overview)
- Create → project appears in the list → open → seed glyphs exist and are editable
- A blank template option exists (a purely empty project)
