# R9 · Task Breakdown (Work Orders)

## T9.1 · State Machine (edit-tools-pointer.js)
`handleRectSelect` three states (rectangle / angle mode / fixed-angle resize); `makeSelectionParallelogram` +
`offsetSelectionParallelogram` helpers; `sceneController.selectionParallelogram` access.
DoD: behavior without touching Ctrl matches the old implementation.

## T9.2 · Hit Testing (scene-model.js)
`selectionAtParallelogram` (shear space method) + `componentIntersectsShearedRect` +
background image `paraGlyph` branch; controlBounds shear prefilter.
DoD: hit testing for the four element types aligns item by item with rectangle-mode semantics.

## T9.3 · Drawing (visualization-layer-definitions.js)
`fontra.rect.select` parallelogram branch (black solid line + white dashed line, reusing strokePolygon).
DoD: the dashed parallelogram renders correctly during dragging (light/dark themes).

## T9.4 · Verification
Headless interaction tests (drag + keyboard.down Control + release + cross-check) + full e2e.
DoD: TEST.md all green.
