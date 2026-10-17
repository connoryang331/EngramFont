# R7 · Background Image Control Enhancement · Requirements Document (PRD)

## Background
Fontra already has a full set of underlying background image capabilities (Add Background Image /
putBackgroundImage / selection backgroundImage/0 / the Opacity+Colorize+Transformation sliders in
selection-info / the fontra.background-image visualization layer).

**But the interaction model differs from meshfont**:
- Fontra: a global Unlock/Lock Background Images menu action (manually unlock → select → edit → manually lock back)
- meshfont: a toolbar **Edit image button** (appears when the glyph has a background image) → click to activate the image (a control menu pops up:
  opacity slider / replace / remove) → **auto-locks when you click away** (no global switch; contextual and automatic)

## Goals (learn from meshfont behavior)
1. **Edit image context button**: appears when the current glyph has a background image; clicking = activating the image editing context
   (unlock + select backgroundImage/0 + selection-info shows Opacity/Colorize/Transformation + a Replace button)
2. **Auto-lock**: when the selection leaves the background image (clicking elsewhere on the canvas / switching tools) → automatically re-lock
3. **Replace button**: replacing the image preserves transformation/opacity/colorize (original R7 requirement kept)
4. Remove the global Unlock/Lock Background Images menu item (superseded by contextual behavior)

## User Story
- I add a background image to a glyph → the toolbar shows Edit image → click → the image activates (control menu pops up) →
  adjust opacity / replace image / move → click elsewhere on the canvas → auto-lock returns to editing

## Non-Goals
- Auto-tracing (Trace is manual tracing); managing multiple background images

## Acceptance Criteria (Overview)
- The Edit image button appears/disappears contextually
- Activated → sliders + Replace available; on blur → auto-lock
- The global Unlock/Lock menu item is removed; behavior is taken over by the context
