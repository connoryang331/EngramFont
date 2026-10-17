// VISUAL_TOKENS -- the single source of truth for every themeable canvas
// appearance setting (docs/visual-settings-inventory.md §8). One row per
// semantic token; the settings panel cards, the editor's key listeners, the
// localStorage migration's color-key list and the model defaults are all
// derived from this table, and future preset packs (L2) and theme import/
// export (L4) are {key: value} snapshots of it.
//
// Row schema:
//   key           model key = token id = localStorage key (engramfont- prefix)
//   type          "color" | "color-alpha" | "number" | "boolean"
//   category      panel card id (see panel-theme-settings.js CARD_ORDER)
//   displayName   panel row label (English, matching the existing panel)
//   defaultLight  hand-tuned light default, sRGB hex (colors)
//   defaultDark   hand-tuned dark default; without it, defaultLight is used
//   defaultAlpha  color-alpha only: alpha percent of the light default
//   control       number only: {min, max, step}
//   shape         optional color-swatch shape ("eye" | "squircle" | "square" | "round")
//   inlineInto    render this row inside another row's controls (squircle exponent)
//   apply         [{layer, colors: {slot: 1}, params: {slot: 1}, glyphParams: {slot: 1}}]
//                 slots set to 1 receive this token's resolved value; null = not
//                 applied by the generic pass (bespoke handling elsewhere)
//   write         custom hook (write, value, model) for composed mappings
//                 (handle shape, dash arrays, alpha compose)
//
// Color resolution (applyVisualTokenSettings):
//   - no override  -> hand-tuned defaultLight / defaultDark (better than any
//                     formula, e.g. smooth node #7A4FE8 light / #A78BFA dark)
//   - overridden   -> light = user color; dark = OKLCH-derived (hue/chroma
//                     preserved, lightness re-solved for contrast against the
//                     dark canvas) -- see color-derive.js. The user's choice
//                     survives theme switching.
// Numbers/booleans are theme-independent and always applied.

export const VISUAL_TOKENS = [
  // ---- canvas -------------------------------------------------------------
  // Not a visualization-layer token: applied as an inline --background-color
  // on :root by setupCanvasBackgroundOverride() (theme-settings.js). Listed
  // here so the panel, migration and presets cover it too.
  {
    key: "canvasBackgroundColor",
    type: "color",
    category: "canvas",
    displayName: "Canvas color",
    defaultLight: "#FFFFFF",
    defaultDark: "#FFFFFF",
    apply: null,
  },
  {
    key: "upmGridColor",
    type: "color",
    category: "canvas",
    displayName: "UPM grid color",
    defaultLight: "#E6E6E6",
    defaultDark: "#3C3C3C",
    apply: [{ layer: "fontra.upm.grid", colors: { strokeColor: 1 } }],
  },

  // ---- node appearance ----------------------------------------------------
  {
    key: "nodeSize",
    type: "number",
    category: "node",
    displayName: "Node size",
    default: 8,
    control: { min: 4, max: 24, step: 1 },
    apply: [
      {
        layer: "fontra.nodes",
        params: { cornerSize: 1, smoothSize: 1 },
      },
      {
        layer: "fontra.selected.nodes",
        params: { cornerSize: 1, smoothSize: 1 },
      },
      {
        layer: "fontra.component.nodes",
        params: { cornerSize: 1, smoothSize: 1 },
      },
    ],
  },
  {
    key: "nodeSmoothColor",
    type: "color",
    category: "node",
    displayName: "Smooth node",
    defaultLight: "#7A4FE8",
    defaultDark: "#A78BFA",
    shape: "eye",
    apply: [
      { layer: "fontra.nodes", colors: { smoothColor: 1 } },
      { layer: "fontra.selected.nodes", colors: { smoothColor: 1 } },
      { layer: "fontra.component.nodes", colors: { smoothColor: 1 } },
    ],
  },
  {
    key: "nodeSquircleColor",
    type: "color",
    category: "node",
    displayName: "Squircle node",
    defaultLight: "#0D9488",
    defaultDark: "#2DD4BF",
    shape: "squircle",
    apply: [
      { layer: "fontra.nodes", colors: { squircleColor: 1 } },
      { layer: "fontra.selected.nodes", colors: { squircleColor: 1 } },
      { layer: "fontra.component.nodes", colors: { squircleColor: 1 } },
    ],
  },
  {
    key: "nodeCornerColor",
    type: "color",
    category: "node",
    displayName: "Corner node",
    defaultLight: "#C2410C",
    defaultDark: "#FB923C",
    shape: "square",
    apply: [
      { layer: "fontra.nodes", colors: { cornerColor: 1 } },
      { layer: "fontra.selected.nodes", colors: { cornerColor: 1 } },
      { layer: "fontra.component.nodes", colors: { cornerColor: 1 } },
    ],
  },
  {
    key: "nodeHandleColor",
    type: "color",
    category: "node",
    displayName: "Handle",
    defaultLight: "#A0A0B0",
    defaultDark: "#7E8290",
    shape: "round",
    apply: [
      { layer: "fontra.nodes", colors: { handleColor: 1 } },
      { layer: "fontra.selected.nodes", colors: { handleColor: 1 } },
      { layer: "fontra.component.nodes", colors: { handleColor: 1 } },
    ],
  },
  {
    key: "selectedHandleColor",
    type: "color",
    category: "node",
    displayName: "Selected handle",
    defaultLight: "#A0A0B0",
    defaultDark: "#7E8290",
    shape: "round",
    apply: [{ layer: "fontra.selected.nodes", colors: { selectedHandleColor: 1 } }],
  },
  {
    key: "nodeHandleSize",
    type: "number",
    category: "node",
    displayName: "Handle size",
    default: 6,
    control: { min: 3, max: 24, step: 1 },
    apply: [
      { layer: "fontra.nodes", params: { handleSize: 1 } },
      { layer: "fontra.selected.nodes", params: { handleSize: 1 } },
      { layer: "fontra.component.nodes", params: { handleSize: 1 } },
    ],
  },
  {
    key: "nodeHandleShapeDiamond",
    type: "boolean",
    category: "node",
    displayName: "Diamond handle",
    default: false,
    apply: [
      { layer: "fontra.nodes", colors: { handleShape: 1 } },
      { layer: "fontra.selected.nodes", colors: { handleShape: 1 } },
      { layer: "fontra.component.nodes", colors: { handleShape: 1 } },
    ],
    write: (w, value) => {
      w.colors.handleShape = value ? "diamond" : "circle";
    },
  },
  {
    // editing-layer ghost nodes: alpha 0 composes to "transparent", which is
    // the off state -- the layer's draw() early-returns on it. The alpha key
    // is the LEGACY one (predates the token table) so existing user storage
    // and the T4.34 alpha-reset migration keep working.
    key: "editingLayerNodesColor",
    alphaKey: "editingLayerNodesAlpha",
    type: "color-alpha",
    category: "node",
    displayName: "Editing layer nodes",
    defaultLight: "#BBBBFF",
    defaultDark: "#BBBBFF",
    defaultAlpha: 0,
    apply: [
      {
        layer: "fontra.edit.editing.layers.nodes-and-handles",
        colors: { editColor: 1 },
      },
    ],
  },
  {
    key: "selectedNodeColor",
    type: "color",
    category: "node",
    displayName: "Selected node fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.selected.nodes", colors: { selectedColor: 1 } }],
  },
  {
    key: "handleLineColor",
    type: "color",
    category: "node",
    displayName: "Handle line",
    defaultLight: "#BBBBBB",
    defaultDark: "#777777",
    apply: [{ layer: "fontra.handles", colors: { color: 1 } }],
  },
  {
    // #DDDF / #555F are 4-digit hex with alpha nibble F -- fully opaque
    key: "bgLayerNodesColor",
    type: "color",
    category: "node",
    displayName: "Background layer nodes",
    defaultLight: "#DDDDDD",
    defaultDark: "#555555",
    apply: [
      {
        layer: "fontra.edit.background.layers.nodes-and-handles",
        colors: { backgroundColor: 1 },
      },
    ],
  },

  // ---- glyph display --------------------------------------------------------
  {
    key: "contextGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Context glyph fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.context.glyphs", colors: { fillColor: 1 } }],
  },
  {
    key: "selectedGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Selected glyph fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.selected.glyph", colors: { fillColor: 1 } }],
  },
  {
    key: "selectedGlyphOutlineColor",
    type: "color-alpha",
    category: "glyph",
    displayName: "Selected glyph outline",
    defaultLight: "#777777",
    defaultDark: "#FFFFFF88",
    defaultAlpha: 53, // #7778 light / #FFF8 dark
    apply: [{ layer: "fontra.selected.glyph", colors: { strokeColor: 1 } }],
  },

  // ---- transform selection ------------------------------------------------
  {
    key: "transformHandleFillColor",
    type: "color",
    category: "transform",
    displayName: "Handle fill",
    defaultLight: "#BBBBFF",
    defaultDark: "#555599",
    shape: "round",
    apply: [{ layer: "fontra.transform.selection", colors: { handleFillColor: 1 } }],
  },
  {
    key: "transformHandleSize",
    type: "number",
    category: "transform",
    displayName: "Handle size",
    default: 8,
    control: { min: 3, max: 24, step: 1 },
    apply: [{ layer: "fontra.transform.selection", params: { handleSize: 1 } }],
  },
  {
    key: "transformBorderColor",
    type: "color",
    category: "transform",
    displayName: "Dashed border",
    defaultLight: "#AAAAAA",
    defaultDark: "#888888",
    apply: [{ layer: "fontra.transform.selection", colors: { strokeColor: 1 } }],
  },
  {
    key: "transformBorderWidth",
    type: "number",
    category: "transform",
    displayName: "Dashed border width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.transform.selection", params: { strokeWidth: 1 } }],
  },

  // ---- start point indicator ----------------------------------------------
  {
    key: "startpointChevronColor",
    type: "color",
    category: "startpoint",
    displayName: "Chevron color",
    defaultLight: "#989898",
    defaultDark: "#989898",
    apply: [{ layer: "fontra.startpoint.indicator", colors: { color: 1 } }],
  },
  {
    // consumed by the bespoke startpoint geometry pass (scales with nodeSize);
    // not writable by the generic pass
    key: "startpointChevronSize",
    type: "number",
    category: "startpoint",
    displayName: "Chevron size",
    default: 1,
    control: { min: 0.5, max: 3, step: 0.25 },
    apply: null,
  },

  // ---- drag crosshair ------------------------------------------------------
  {
    key: "crosshairColor",
    type: "color",
    category: "crosshair",
    displayName: "Crosshair color",
    defaultLight: "#888888",
    defaultDark: "#AAAAAA",
    apply: [{ layer: "fontra.crosshair", colors: { strokeColor: 1 } }],
  },
  {
    key: "crosshairStrokeWidth",
    type: "number",
    category: "crosshair",
    displayName: "Crosshair width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.crosshair", params: { strokeWidth: 1 } }],
  },
  {
    key: "crosshairDashed",
    type: "boolean",
    category: "crosshair",
    displayName: "Dashed",
    default: true,
    apply: [{ layer: "fontra.crosshair", params: { lineDash: 1 } }],
    write: (w, value, model) => {
      const length = model.crosshairDashLength ?? 4;
      w.params.lineDash = value ? [length, length] : [];
    },
  },
  {
    key: "crosshairDashLength",
    type: "number",
    category: "crosshair",
    displayName: "Dash length",
    default: 4,
    control: { min: 1, max: 16, step: 1 },
    apply: [{ layer: "fontra.crosshair", params: { lineDash: 1 } }],
    write: (w, value, model) => {
      const length = value ?? 4;
      w.params.lineDash =
        model.crosshairDashed === false ? [] : [length, length];
    },
  },

  // ---- rect select ----------------------------------------------------------
  {
    key: "rectSelectSolidColor",
    type: "color",
    category: "rectselect",
    displayName: "Solid color",
    defaultLight: "#000000",
    defaultDark: "#000000",
    apply: [{ layer: "fontra.rect.select", colors: { solidColor: 1 } }],
  },
  {
    key: "rectSelectDashColor",
    type: "color",
    category: "rectselect",
    displayName: "Dash color",
    defaultLight: "#FFFFFF",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.rect.select", colors: { dashColor: 1 } }],
  },
  {
    key: "rectSelectStrokeWidth",
    type: "number",
    category: "rectselect",
    displayName: "Stroke width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.rect.select", params: { strokeWidth: 1 } }],
  },
  {
    key: "rectSelectDashLength",
    type: "number",
    category: "rectselect",
    displayName: "Dash length",
    default: 10,
    control: { min: 2, max: 40, step: 1 },
    apply: [{ layer: "fontra.rect.select", params: { lineDash: 1 } }],
    write: (w, value) => {
      const n = value ?? 10;
      w.params.lineDash = [n, n];
    },
  },

  // ---- path (P1) ------------------------------------------------------------
  {
    key: "editPathStrokeColor",
    type: "color",
    category: "path",
    displayName: "Outline color",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.edit.path.stroke", colors: { color: 1 } }],
  },
  {
    key: "editPathUnderStrokeColor",
    type: "color-alpha",
    category: "path",
    displayName: "Under-stroke color",
    defaultLight: "#FFFFFF",
    defaultDark: "#00000044",
    defaultAlpha: 40, // #FFF6 light / #0004 dark
    apply: [{ layer: "fontra.edit.path.under.stroke", colors: { color: 1 } }],
  },
  {
    key: "editPathFillColor",
    type: "color-alpha",
    category: "path",
    displayName: "Outline fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF33",
    defaultAlpha: 7, // #0001 light / #FFF3 dark
    apply: [{ layer: "fontra.edit.path.fill", colors: { fillColor: 1 } }],
  },
  {
    key: "editPathStrokeWidth",
    type: "number",
    category: "path",
    displayName: "Outline stroke width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.edit.path.stroke", params: { strokeWidth: 1 } }],
  },

  // ---- labels & indices (P1) ------------------------------------------------
  {
    // the five label layers (coordinates / point / contour / component / anchor
    // names) share box + text colors
    key: "labelBoxColor",
    type: "color-alpha",
    category: "labels",
    displayName: "Label box color",
    defaultLight: "#FFFFFF",
    defaultDark: "#11111118",
    defaultAlpha: 73, // #FFFB light / #1118 dark
    apply: [
      { layer: "fontra.coordinates", colors: { boxColor: 1 } },
      { layer: "fontra.point.index", colors: { boxColor: 1 } },
      { layer: "fontra.contour.index", colors: { boxColor: 1 } },
      { layer: "fontra.component.index", colors: { boxColor: 1 } },
      { layer: "fontra.anchor.names", colors: { boxColor: 1 } },
    ],
  },
  {
    key: "labelTextColor",
    type: "color",
    category: "labels",
    displayName: "Label text color",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [
      { layer: "fontra.coordinates", colors: { color: 1 } },
      { layer: "fontra.point.index", colors: { color: 1 } },
      { layer: "fontra.contour.index", colors: { color: 1 } },
      { layer: "fontra.component.index", colors: { color: 1 } },
      { layer: "fontra.anchor.names", colors: { color: 1 } },
    ],
  },

  // ---- guidelines (P1) --------------------------------------------------------
  {
    key: "guidelineColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Glyph guideline",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF88",
    defaultAlpha: 40, // #0006 light / #FFF8 dark
    apply: [{ layer: "fontra.guidelines", colors: { strokeColor: 1 } }],
  },
  {
    key: "fontGuidelineColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Font guideline",
    defaultLight: "#00BFFF",
    defaultDark: "#00BFFFC0",
    defaultAlpha: 100, // light opaque / #00BFFFC0 dark
    apply: [{ layer: "fontra.guidelines", colors: { strokeColorFontGuideline: 1 } }],
  },
  {
    key: "guidelineHoveredColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Hovered guideline",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF18",
    defaultAlpha: 7, // #0001 light / #FFFFFF18 dark
    apply: [{ layer: "fontra.guidelines", colors: { hoveredStrokeColor: 1 } }],
  },
  {
    key: "guidelineSelectedColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Selected guideline",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF33",
    defaultAlpha: 13, // #0002 light / #FFF3 dark
    apply: [{ layer: "fontra.guidelines", colors: { selectedStrokeColor: 1 } }],
  },
  {
    key: "guidelineNodeSelectedColor",
    type: "color",
    category: "guidelines",
    displayName: "Selected guideline node",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.guidelines", colors: { selectedColor: 1 } }],
  },
  {
    key: "guidelineStrokeWidth",
    type: "number",
    category: "guidelines",
    displayName: "Guideline stroke width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.guidelines", params: { strokeWidth: 1 } }],
  },

  // ---- metrics (P1) -----------------------------------------------------------
  {
    key: "baselineColor",
    type: "color-alpha",
    category: "metrics",
    displayName: "Baseline",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF66",
    defaultAlpha: 27, // #0004 light / #FFF6 dark
    apply: [{ layer: "fontra.baseline", colors: { strokeColor: 1 } }],
  },
  {
    key: "lineMetricsColor",
    type: "color-alpha",
    category: "metrics",
    displayName: "Metrics line",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF66",
    defaultAlpha: 27, // #0004 light / #FFF6 dark
    apply: [{ layer: "fontra.lineMetrics", colors: { strokeColor: 1 } }],
  },
  {
    key: "lineMetricsZoneColor",
    type: "color-alpha",
    category: "metrics",
    displayName: "Alignment zone",
    defaultLight: "#00BFFF",
    defaultDark: "#00BFFF18",
    defaultAlpha: 9, // #00BFFF18 both themes
    apply: [{ layer: "fontra.lineMetrics", colors: { zoneColor: 1 } }],
  },
  {
    key: "lineMetricsZoneStrokeColor",
    type: "color-alpha",
    category: "metrics",
    displayName: "Zone boundary line",
    defaultLight: "#006080",
    defaultDark: "#80DFFF18",
    defaultAlpha: 9, // #00608018 light / #80DFFF18 dark
    apply: [{ layer: "fontra.lineMetrics", colors: { zoneStrokeColor: 1 } }],
  },

  // ---- anchors (P2) ----------------------------------------------------------
  {
    key: "anchorColor",
    type: "color",
    category: "anchors",
    displayName: "Anchor color",
    defaultLight: "#999999",
    defaultDark: "#999999",
    apply: [{ layer: "fontra.anchors", colors: { strokeColor: 1 } }],
  },

  // ---- components (P2) -------------------------------------------------------
  {
    key: "componentHoveredColor",
    type: "color",
    category: "components",
    displayName: "Hovered component",
    defaultLight: "#CCCCCC",
    defaultDark: "#666666",
    apply: [{ layer: "fontra.component.selection", colors: { hoveredStrokeColor: 1 } }],
  },
  {
    key: "componentSelectedColor",
    type: "color",
    category: "components",
    displayName: "Selected component",
    defaultLight: "#888888",
    defaultDark: "#AAAAAA",
    apply: [{ layer: "fontra.component.selection", colors: { selectedStrokeColor: 1 } }],
  },

  // ---- layer outlines (P2) -----------------------------------------------------
  {
    // #CCCF / #666F are 4-digit hex with alpha nibble F -- fully opaque
    key: "bgLayerOutlineColor",
    type: "color",
    category: "layers",
    displayName: "Background layer outline",
    defaultLight: "#CCCCCC",
    defaultDark: "#666666",
    apply: [{ layer: "fontra.edit.background.layers", colors: { color: 1 } }],
  },
  {
    // #99FF / #559F are 4-digit hex with alpha nibble F -- fully opaque
    key: "editingLayerOutlineColor",
    type: "color",
    category: "layers",
    displayName: "Editing layer outline",
    // #99FF / #559F: 4-digit hex -- lavender-blue, fully opaque
    defaultLight: "#9999FF",
    defaultDark: "#555599",
    apply: [{ layer: "fontra.edit.editing.layers", colors: { color: 1 } }],
  },

  // ---- interaction aids (P2) ---------------------------------------------------
  {
    key: "ghostPathColor",
    type: "color-alpha",
    category: "interaction",
    displayName: "Drag ghost path",
    defaultLight: "#AAAAAA",
    defaultDark: "#88888866",
    defaultAlpha: 40, // #AAA6 light / #8886 dark (alpha nibble 6 -> 0x66)
    apply: [{ layer: "fontra.ghostpath", colors: { strokeColor: 1 } }],
  },

  // ---- tools (P2) ----------------------------------------------------------------
  {
    key: "powerRulerStrokeColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Power ruler line",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF66",
    defaultAlpha: 27, // #0004 light / #FFF6 dark
    apply: [{ layer: "fontra.power.ruler", colors: { strokeColor: 1 } }],
  },
  {
    key: "powerRulerInsideBlobColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Ruler distance box (inside)",
    defaultLight: "#FFFFFF",
    defaultDark: "#444444",
    defaultAlpha: 73, // #FFFB light / #444B dark
    apply: [{ layer: "fontra.power.ruler", colors: { insideBlobColor: 1 } }],
  },
  {
    key: "powerRulerIntersectionColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Ruler intersection",
    defaultLight: "#FF0088",
    defaultDark: "#FF6699",
    defaultAlpha: 33, // #F085 light / #F696 dark
    apply: [{ layer: "fontra.power.ruler", colors: { intersectionColor: 1 } }],
  },
  {
    key: "knifeLineColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Knife line",
    defaultLight: "#111111",
    defaultDark: "#FFFFFFBB",
    defaultAlpha: 53, // #1118 light / #FFFB dark
    apply: [{ layer: "fontra.knifetool.line", colors: { strokeColor: 1 } }],
  },
  {
    key: "sidebearingColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Sidebearing line",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF66",
    defaultAlpha: 27, // #0004 light / #FFF6 dark
    apply: [
      { layer: "fontra.sidebearings.unselected", colors: { strokeColor: 1 } },
      { layer: "fontra.sidebearings-tool", colors: { strokeColor: 1 } },
      { layer: "fontra.sidebearings", colors: { strokeColor: 1 } },
    ],
  },
  {
    key: "referenceFontColor",
    type: "color-alpha",
    category: "tools",
    displayName: "Reference font fill",
    defaultLight: "#AAAAAA",
    defaultDark: "#AAAAAA66",
    defaultAlpha: 40, // #AAA6 (alpha nibble 6 -> 0x66)
    apply: [{ layer: "fontra.reference.font", colors: { fillColor: 1 } }],
  },

  // ---- glyph display (P3) ------------------------------------------------------
  {
    // shared by context / selected / hovered glyph layers
    key: "glyphErrorColor",
    type: "color",
    category: "glyph",
    displayName: "Error glyph color",
    defaultLight: "#AAAAAA",
    defaultDark: "#999999",
    apply: [
      { layer: "fontra.context.glyphs", colors: { errorColor: 1 } },
      { layer: "fontra.selected.glyph", colors: { errorColor: 1 } },
      { layer: "fontra.hovered.glyph", colors: { errorColor: 1 } },
    ],
  },
  {
    key: "hoveredGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Hovered glyph fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.hovered.glyph", colors: { fillColor: 1 } }],
  },
  {
    key: "hoveredGlyphOutlineColor",
    type: "color-alpha",
    category: "glyph",
    displayName: "Hovered glyph outline",
    defaultLight: "#BBBBBB",
    defaultDark: "#CCCCCC88",
    defaultAlpha: 53, // #BBB8 light / #CCC8 dark
    apply: [{ layer: "fontra.hovered.glyph", colors: { strokeColor: 1 } }],
  },
  {
    key: "undefinedGlyphColor",
    type: "color-alpha",
    category: "glyph",
    displayName: "Undefined glyph color",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF66",
    defaultAlpha: 40, // #0006 light / #FFF6 dark
    apply: [{ layer: "fontra.undefined.glyph", colors: { fillColor: 1 } }],
  },
  {
    key: "emptyGlyphColor",
    type: "color-alpha",
    category: "glyph",
    displayName: "Empty glyph placeholder",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF33",
    defaultAlpha: 13, // #0002 light / #FFF2 dark
    apply: [{ layer: "fontra.undefined.glyph", colors: { emptyFillColor: 1 } }],
  },
  {
    key: "emptySelectedGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Empty selected glyph",
    defaultLight: "#D8D8D8",
    defaultDark: "#585858",
    apply: [{ layer: "fontra.empty.selected.glyph", colors: { fillColor: 1 } }],
  },
  {
    key: "emptyHoveredGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Empty hovered glyph",
    defaultLight: "#E8E8E8",
    defaultDark: "#484848",
    apply: [{ layer: "fontra.empty.hovered.glyph", colors: { fillColor: 1 } }],
  },
  {
    // the "clean display" layer def is exported but not registered -- the
    // applier resolves it via findTokenLayerDef()
    key: "cleanGlyphColor",
    type: "color",
    category: "glyph",
    displayName: "Clean display fill",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.all.glyphs", colors: { fillColor: 1 } }],
  },
  {
    key: "glyphOuterStrokeWidth",
    type: "number",
    category: "glyph",
    displayName: "Glyph highlight outer width",
    default: 10,
    control: { min: 4, max: 24, step: 1 },
    apply: [
      { layer: "fontra.selected.glyph", params: { outerStrokeWidth: 1 } },
      { layer: "fontra.hovered.glyph", params: { outerStrokeWidth: 1 } },
    ],
  },
  {
    key: "glyphInnerStrokeWidth",
    type: "number",
    category: "glyph",
    displayName: "Glyph highlight inner width",
    default: 3,
    control: { min: 1, max: 8, step: 0.5 },
    apply: [
      { layer: "fontra.selected.glyph", params: { innerStrokeWidth: 1 } },
      { layer: "fontra.hovered.glyph", params: { innerStrokeWidth: 1 } },
    ],
  },

  // ---- node extras (P3) ----------------------------------------------------------
  {
    key: "selectedNodeUnderColor",
    type: "color-alpha",
    category: "node",
    displayName: "Selected node halo",
    defaultLight: "#FFFFFF",
    defaultDark: "#00000088",
    defaultAlpha: 67, // #FFFA light / #0008 dark
    apply: [{ layer: "fontra.selected.nodes", colors: { underColor: 1 } }],
  },
  {
    key: "nodeHoverStrokeOffset",
    type: "number",
    category: "node",
    displayName: "Hover ring offset",
    default: 4,
    control: { min: 0, max: 10, step: 1 },
    apply: [{ layer: "fontra.selected.nodes", params: { hoverStrokeOffset: 1 } }],
  },
  {
    key: "nodeUnderlayOffset",
    type: "number",
    category: "node",
    displayName: "Selection halo offset",
    default: 2,
    control: { min: 0, max: 8, step: 1 },
    apply: [{ layer: "fontra.selected.nodes", params: { underlayOffset: 1 } }],
  },
  {
    key: "bgLayerNodeSize",
    type: "number",
    category: "node",
    displayName: "Background layer node size",
    default: 5.5,
    control: { min: 3, max: 16, step: 0.5 },
    apply: [
      {
        layer: "fontra.edit.background.layers.nodes-and-handles",
        params: { cornerSize: 1, smoothSize: 1 },
      },
    ],
  },
  {
    key: "bgLayerHandleSize",
    type: "number",
    category: "node",
    displayName: "Background layer handle size",
    default: 4.5,
    control: { min: 2, max: 16, step: 0.5 },
    apply: [
      {
        layer: "fontra.edit.background.layers.nodes-and-handles",
        params: { handleSize: 1 },
      },
    ],
  },

  // ---- labels font sizes (P3) ------------------------------------------------------
  {
    key: "labelFontSizeCoordinates",
    type: "number",
    category: "labels",
    displayName: "Coordinates label size",
    default: 10,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.coordinates", params: { fontSize: 1 } }],
  },
  {
    key: "labelFontSizePointIndex",
    type: "number",
    category: "labels",
    displayName: "Point index label size",
    default: 10,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.point.index", params: { fontSize: 1 } }],
  },
  {
    key: "labelFontSizeContourIndex",
    type: "number",
    category: "labels",
    displayName: "Contour index label size",
    default: 11,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.contour.index", params: { fontSize: 1 } }],
  },
  {
    key: "labelFontSizeComponentIndex",
    type: "number",
    category: "labels",
    displayName: "Component index label size",
    default: 11,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.component.index", params: { fontSize: 1 } }],
  },
  {
    key: "labelFontSizeAnchorNames",
    type: "number",
    category: "labels",
    displayName: "Anchor name label size",
    default: 10,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.anchor.names", params: { fontSize: 1 } }],
  },
  {
    key: "anchorNamesMarginFromTop",
    type: "number",
    category: "labels",
    displayName: "Anchor name top margin",
    default: 6,
    control: { min: 0, max: 20, step: 1 },
    apply: [{ layer: "fontra.anchor.names", params: { marginFromTop: 1 } }],
  },

  // ---- guidelines extras (P3) --------------------------------------------------------
  {
    key: "guidelineHoveredSelectedColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Hovered + selected guideline",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF44",
    defaultAlpha: 17, // #0000002B light / #FFF4 dark
    apply: [
      { layer: "fontra.guidelines", colors: { hoveredSelectedStrokeColor: 1 } },
    ],
  },
  {
    key: "guidelineNodeHoveredColor",
    type: "color",
    category: "guidelines",
    displayName: "Hovered guideline node",
    defaultLight: "#BBBBBB",
    defaultDark: "#BBBBBB",
    apply: [{ layer: "fontra.guidelines", colors: { hoveredColor: 1 } }],
  },
  {
    key: "guidelineNodeUnderColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Guideline node halo",
    defaultLight: "#FFFFFF",
    defaultDark: "#00000088",
    defaultAlpha: 67, // #FFFA light / #0008 dark
    apply: [{ layer: "fontra.guidelines", colors: { underColor: 1 } }],
  },
  {
    key: "guidelineIconUnderColor",
    type: "color",
    category: "guidelines",
    displayName: "Lock icon underlay",
    defaultLight: "#F6F6F6",
    defaultDark: "#333333",
    apply: [{ layer: "fontra.guidelines", colors: { underColorIcon: 1 } }],
  },
  {
    key: "guidelineIconHoveredColor",
    type: "color-alpha",
    category: "guidelines",
    displayName: "Lock icon hovered",
    defaultLight: "#000000",
    defaultDark: "#BBBBBB",
    defaultAlpha: 40, // #0006 light / #BBB dark
    apply: [{ layer: "fontra.guidelines", colors: { hoveredColorIcon: 1 } }],
  },
  {
    key: "guidelineFontSize",
    type: "number",
    category: "guidelines",
    displayName: "Guideline name size",
    default: 10,
    control: { min: 6, max: 20, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { fontSize: 1 } }],
  },
  {
    key: "guidelineMarkerRadius",
    type: "number",
    category: "guidelines",
    displayName: "Guideline marker radius",
    default: 4,
    control: { min: 2, max: 12, step: 0.5 },
    apply: [{ layer: "fontra.guidelines", params: { originMarkerRadius: 1 } }],
  },
  {
    key: "guidelineDash",
    type: "number",
    category: "guidelines",
    displayName: "Guideline dash length",
    default: 3,
    control: { min: 1, max: 8, step: 0.5 },
    apply: [{ layer: "fontra.guidelines", params: { strokeDash: 1 } }],
  },
  {
    key: "guidelineMargin",
    type: "number",
    category: "guidelines",
    displayName: "Guideline name margin",
    default: 5,
    control: { min: 0, max: 20, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { margin: 1 } }],
  },
  {
    key: "guidelineIconSize",
    type: "number",
    category: "guidelines",
    displayName: "Guideline lock icon size",
    default: 12,
    control: { min: 8, max: 24, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { iconSize: 1 } }],
  },
  {
    key: "guidelineNodeSize",
    type: "number",
    category: "guidelines",
    displayName: "Guideline node size",
    default: 8,
    control: { min: 4, max: 16, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { smoothSize: 1 } }],
  },
  {
    key: "guidelineHoverStrokeOffset",
    type: "number",
    category: "guidelines",
    displayName: "Guideline hover ring offset",
    default: 4,
    control: { min: 0, max: 10, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { hoverStrokeOffset: 1 } }],
  },
  {
    key: "guidelineUnderlayOffset",
    type: "number",
    category: "guidelines",
    displayName: "Guideline halo offset",
    default: 2,
    control: { min: 0, max: 8, step: 1 },
    apply: [{ layer: "fontra.guidelines", params: { underlayOffset: 1 } }],
  },

  // ---- anchors extras (P3) --------------------------------------------------------
  {
    key: "anchorMarkerRadius",
    type: "number",
    category: "anchors",
    displayName: "Anchor marker radius",
    default: 4,
    control: { min: 2, max: 12, step: 0.5 },
    apply: [{ layer: "fontra.anchors", params: { originMarkerRadius: 1 } }],
  },
  {
    key: "anchorHoveredColor",
    type: "color",
    category: "anchors",
    displayName: "Hovered anchor",
    defaultLight: "#BBBBBB",
    defaultDark: "#BBBBBB",
    apply: [{ layer: "fontra.selected.anchors", colors: { hoveredColor: 1 } }],
  },
  {
    key: "anchorSelectedColor",
    type: "color",
    category: "anchors",
    displayName: "Selected anchor",
    defaultLight: "#000000",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.selected.anchors", colors: { selectedColor: 1 } }],
  },
  {
    key: "anchorUnderColor",
    type: "color-alpha",
    category: "anchors",
    displayName: "Selected anchor halo",
    defaultLight: "#FFFFFF",
    defaultDark: "#00000088",
    defaultAlpha: 67, // #FFFA light / #0008 dark
    apply: [{ layer: "fontra.selected.anchors", colors: { underColor: 1 } }],
  },
  {
    key: "anchorSelectedSize",
    type: "number",
    category: "anchors",
    displayName: "Selected anchor size",
    default: 8,
    control: { min: 4, max: 16, step: 1 },
    apply: [{ layer: "fontra.selected.anchors", params: { smoothSize: 1 } }],
  },
  {
    key: "anchorSelectedStrokeWidth",
    type: "number",
    category: "anchors",
    displayName: "Anchor stroke width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.selected.anchors", params: { strokeWidth: 1 } }],
  },
  {
    key: "anchorHoverStrokeOffset",
    type: "number",
    category: "anchors",
    displayName: "Anchor hover ring offset",
    default: 4,
    control: { min: 0, max: 10, step: 1 },
    apply: [{ layer: "fontra.selected.anchors", params: { hoverStrokeOffset: 1 } }],
  },
  {
    key: "anchorUnderlayOffset",
    type: "number",
    category: "anchors",
    displayName: "Anchor halo offset",
    default: 2,
    control: { min: 0, max: 8, step: 1 },
    apply: [{ layer: "fontra.selected.anchors", params: { underlayOffset: 1 } }],
  },

  // ---- components extras (P3) -------------------------------------------------------
  {
    key: "componentOriginColor",
    type: "color",
    category: "components",
    displayName: "Component origin marker",
    defaultLight: "#BBBBBB",
    defaultDark: "#BBBBBB",
    apply: [{ layer: "fontra.component.selection", colors: { originMarkerColor: 1 } }],
  },
  {
    key: "componentTCenterColor",
    type: "color",
    category: "components",
    displayName: "Component transform center",
    defaultLight: "#777777",
    defaultDark: "#DDDDDD",
    apply: [
      { layer: "fontra.component.selection", colors: { tCenterMarkerColor: 1 } },
    ],
  },
  {
    key: "componentHoverStrokeWidth",
    type: "number",
    category: "components",
    displayName: "Hovered component width",
    default: 3,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [
      { layer: "fontra.component.selection", params: { hoveredStrokeWidth: 1 } },
    ],
  },
  {
    key: "componentSelectedStrokeWidth",
    type: "number",
    category: "components",
    displayName: "Selected component width",
    default: 3,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [
      { layer: "fontra.component.selection", params: { selectedStrokeWidth: 1 } },
    ],
  },
  {
    key: "componentOriginMarkerStrokeWidth",
    type: "number",
    category: "components",
    displayName: "Origin marker line width",
    default: 1,
    control: { min: 0.5, max: 4, step: 0.5 },
    apply: [
      {
        layer: "fontra.component.selection",
        params: { originMarkerStrokeWidth: 1 },
      },
    ],
  },
  {
    key: "componentOriginMarkerSelectedStrokeWidth",
    type: "number",
    category: "components",
    displayName: "Origin marker selected width",
    default: 2,
    control: { min: 0.5, max: 4, step: 0.5 },
    apply: [
      {
        layer: "fontra.component.selection",
        params: { selectedOriginMarkerStrokeWidth: 1 },
      },
    ],
  },
  {
    key: "componentOriginMarkerSize",
    type: "number",
    category: "components",
    displayName: "Origin marker size",
    default: 10,
    control: { min: 4, max: 24, step: 1 },
    apply: [
      { layer: "fontra.component.selection", params: { originMarkerSize: 1 } },
    ],
  },
  {
    key: "componentOriginMarkerRadius",
    type: "number",
    category: "components",
    displayName: "Origin marker radius",
    default: 4,
    control: { min: 2, max: 12, step: 0.5 },
    apply: [
      { layer: "fontra.component.selection", params: { originMarkerRadius: 1 } },
    ],
  },

  // ---- layers extras (P3) -------------------------------------------------------------
  {
    key: "bgLayerAnchorColor",
    type: "color",
    category: "layers",
    displayName: "Background layer anchor",
    defaultLight: "#DDDDDD",
    defaultDark: "#555555",
    apply: [{ layer: "fontra.edit.background.layers", colors: { colorAnchor: 1 } }],
  },
  {
    key: "editingLayerAnchorColor",
    type: "color",
    category: "layers",
    displayName: "Editing layer anchor",
    // #AAFF / #558F: 4-digit hex -- light violet, fully opaque
    defaultLight: "#AAAAFF",
    defaultDark: "#555588",
    apply: [{ layer: "fontra.edit.editing.layers", colors: { colorAnchor: 1 } }],
  },
  {
    key: "bgLayerOutlineStrokeWidth",
    type: "number",
    category: "layers",
    displayName: "Background layer outline width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.edit.background.layers", params: { strokeWidth: 1 } }],
  },
  {
    key: "bgLayerAnchorRadius",
    type: "number",
    category: "layers",
    displayName: "Background layer anchor radius",
    default: 4,
    control: { min: 2, max: 12, step: 0.5 },
    apply: [{ layer: "fontra.edit.background.layers", params: { anchorRadius: 1 } }],
  },
  {
    key: "editingLayerOutlineStrokeWidth",
    type: "number",
    category: "layers",
    displayName: "Editing layer outline width",
    default: 1,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.edit.editing.layers", params: { strokeWidth: 1 } }],
  },
  {
    key: "editingLayerAnchorRadius",
    type: "number",
    category: "layers",
    displayName: "Editing layer anchor radius",
    default: 4,
    control: { min: 2, max: 12, step: 0.5 },
    apply: [{ layer: "fontra.edit.editing.layers", params: { anchorRadius: 1 } }],
  },

  // ---- interaction extras (P3) ----------------------------------------------------------
  {
    key: "connectInsertColor",
    type: "color-alpha",
    category: "interaction",
    displayName: "Connect / insert marker",
    defaultLight: "#3080FF",
    defaultDark: "#50A0FF",
    defaultAlpha: 50, // #3080FF80 light / #50A0FF80 dark
    apply: [{ layer: "fontra.connect-insert.point", colors: { color: 1 } }],
  },
  {
    key: "connectInsertRadius",
    type: "number",
    category: "interaction",
    displayName: "Connect radius",
    default: 11,
    control: { min: 4, max: 24, step: 1 },
    apply: [{ layer: "fontra.connect-insert.point", params: { connectRadius: 1 } }],
  },
  {
    key: "connectInsertHandlesRadius",
    type: "number",
    category: "interaction",
    displayName: "Insert handle radius",
    default: 5,
    control: { min: 2, max: 16, step: 1 },
    apply: [
      { layer: "fontra.connect-insert.point", params: { insertHandlesRadius: 1 } },
    ],
  },
  {
    key: "connectInsertDeleteIndicatorLength",
    type: "number",
    category: "interaction",
    displayName: "Delete indicator size",
    default: 7,
    control: { min: 3, max: 16, step: 1 },
    apply: [
      {
        layer: "fontra.connect-insert.point",
        params: { deleteOffCurveIndicatorLength: 1 },
      },
    ],
  },
  {
    key: "connectInsertDragIndicatorRadius",
    type: "number",
    category: "interaction",
    displayName: "Drag indicator radius",
    default: 9,
    control: { min: 4, max: 20, step: 1 },
    apply: [
      {
        layer: "fontra.connect-insert.point",
        params: { canDragOffCurveIndicatorRadius: 1 },
      },
    ],
  },
  {
    key: "connectInsertStrokeWidth",
    type: "number",
    category: "interaction",
    displayName: "Connect / insert width",
    default: 2,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.connect-insert.point", params: { strokeWidth: 1 } }],
  },
  {
    key: "backgroundImageColor",
    type: "color",
    category: "interaction",
    displayName: "Background image border",
    defaultLight: "#888888",
    defaultDark: "#FFFFFF",
    apply: [{ layer: "fontra.background-image", colors: { strokeColor: 1 } }],
  },
  {
    key: "backgroundImageHoverColor",
    type: "color-alpha",
    category: "interaction",
    displayName: "Background image hover",
    defaultLight: "#888888",
    defaultDark: "#FFFFFF55",
    defaultAlpha: 33, // #8885 light / #FFF5 dark
    apply: [{ layer: "fontra.background-image", colors: { hoverStrokeColor: 1 } }],
  },
  {
    key: "backgroundImageStrokeWidth",
    type: "number",
    category: "interaction",
    displayName: "Background image width",
    default: 2,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.background-image", params: { strokeWidth: 1 } }],
  },
  {
    key: "lockIconColor",
    type: "color-alpha",
    category: "interaction",
    displayName: "Lock icon",
    defaultLight: "#000000",
    defaultDark: "#FFFFFFCC",
    defaultAlpha: 80, // #000C light / #FFFC dark
    apply: [
      { layer: "fontra.glyph.locking", colors: { strokeColor: 1 } },
      { layer: "fontra.glyph.locking.non-editing", colors: { strokeColor: 1 } },
    ],
  },
  {
    key: "lockIconSize",
    type: "number",
    category: "interaction",
    displayName: "Lock icon size",
    default: 19,
    control: { min: 10, max: 32, step: 1 },
    apply: [
      { layer: "fontra.glyph.locking", params: { iconSize: 1 } },
      { layer: "fontra.glyph.locking.non-editing", params: { iconSize: 1 } },
    ],
  },

  // ---- startpoint extras (P3) -------------------------------------------------------------
  {
    // consumed by the bespoke startpoint geometry pass (the gap deliberately
    // does not scale with node size)
    key: "startpointChevronGap",
    type: "number",
    category: "startpoint",
    displayName: "Chevron gap",
    default: 5,
    control: { min: 2, max: 16, step: 1 },
    apply: null,
  },
  {
    key: "startpointChevronStrokeWidth",
    type: "number",
    category: "startpoint",
    displayName: "Chevron width",
    default: 2,
    control: { min: 0.5, max: 6, step: 0.5 },
    apply: [{ layer: "fontra.startpoint.indicator", params: { strokeWidth: 1 } }],
  },

  // ---- status bar (P3) ----------------------------------------------------------------------
  {
    key: "statusBarMinThickness",
    type: "number",
    category: "status",
    displayName: "Status bar min thickness",
    default: 3,
    control: { min: 1, max: 20, step: 1 },
    apply: [{ layer: "fontra.status.color", params: { minThickness: 1 } }],
  },
  {
    key: "statusBarMaxThickness",
    type: "number",
    category: "status",
    displayName: "Status bar max thickness",
    default: 15,
    control: { min: 2, max: 40, step: 1 },
    apply: [{ layer: "fontra.status.color", params: { maxThickness: 1 } }],
  },
  {
    // percent 0-100 -> glyphParameters.editingOpacity 0..1 (scale: 0.01);
    // must NOT live in screenParameters, which are zoom-scaled
    key: "statusBarEditingOpacity",
    type: "number",
    category: "status",
    displayName: "Status bar editing opacity",
    default: 40,
    scale: 0.01,
    control: { min: 0, max: 100, step: 5 },
    apply: [{ layer: "fontra.status.color", glyphParams: { editingOpacity: 1 } }],
  },
];

export let VISUAL_TOKEN_KEYS = VISUAL_TOKENS.map((token) => token.key);

// color-alpha tokens persist a companion alpha-percent key
// the persisted alpha-percent key of a color-alpha token: explicit alphaKey
// override (legacy keys) or the default "<key>Alpha" convention
export function alphaKeyOf(token) {
  return token.alphaKey ?? token.key + "Alpha";
}

export let VISUAL_TOKEN_ALPHA_KEYS = VISUAL_TOKENS
  .filter((token) => token.type === "color-alpha")
  .map((token) => alphaKeyOf(token));

// every color-ish model key (for the localStorage pollution migration)
export let VISUAL_TOKEN_COLOR_KEYS = VISUAL_TOKENS
  .filter((token) => token.type === "color" || token.type === "color-alpha")
  .map((token) => token.key);

// Panel card order/display names (panel renders one card per category).
// Lived here so registerTokenCategory() can extend it.
export let VISUAL_TOKEN_CATEGORIES = [
  { id: "canvas", displayName: "Canvas background" },
  { id: "node", displayName: "Node appearance" },
  { id: "glyph", displayName: "Glyph display" },
  { id: "transform", displayName: "Transform selection" },
  { id: "startpoint", displayName: "Start point indicator" },
  { id: "crosshair", displayName: "Drag crosshair" },
  { id: "rectselect", displayName: "Rect select" },
  { id: "path", displayName: "Path" },
  { id: "labels", displayName: "Labels & indices" },
  { id: "guidelines", displayName: "Guidelines" },
  { id: "metrics", displayName: "Metrics" },
  { id: "anchors", displayName: "Anchors" },
  { id: "components", displayName: "Components" },
  { id: "layers", displayName: "Layer outlines" },
  { id: "interaction", displayName: "Interaction aids" },
  { id: "tools", displayName: "Tools" },
  { id: "status", displayName: "Status bar" },
];

function refreshDerivedTokenLists() {
  VISUAL_TOKEN_KEYS = VISUAL_TOKENS.map((token) => token.key);
  VISUAL_TOKEN_ALPHA_KEYS = VISUAL_TOKENS
    .filter((token) => token.type === "color-alpha")
    .map((token) => alphaKeyOf(token));
  VISUAL_TOKEN_COLOR_KEYS = VISUAL_TOKENS
    .filter((token) => token.type === "color" || token.type === "color-alpha")
    .map((token) => token.key);
}

// ---- registration API (the theme system's extension point) -----------------
//
// The token ENGINE is built into core (it runs before any layer draws, feeds
// the render pipeline and the settings panel), but the token TABLE is open:
// modules -- ours (future tool-color batches, preset packs) or, once Fontra's
// plug-in mechanism grows an injection point for core views, third parties --
// add rows via registerVisualTokens() instead of editing this file.
// This mirrors the existing registerVisualizationLayerDefinition() registry
// pattern: layer defs and token rows are two halves of the same contract.
//
// Notes for registrants:
//  - token rows follow the same schema as the built-ins (see the table above);
//  - colors are resolved by applyVisualTokenSettings() like any token: define
//    your layer's colors as the hand-tuned defaults and they apply untouched;
//  - the theme model picks up new keys via the onVisualTokensRegistered hook
//    (theme-settings.js subscribes and materializes the defaults);
//  - the localStorage color migration covers built-ins at load time only
//    (registered tokens have no legacy storage to clean).

const tokenRegistrationListeners = [];

export function onVisualTokensRegistered(listener) {
  tokenRegistrationListeners.push(listener);
}

export function registerVisualTokens(newTokens, { category } = {}) {
  const added = [];
  for (const token of newTokens) {
    if (VISUAL_TOKENS.some((existing) => existing.key === token.key)) {
      console.warn(
        `registerVisualTokens: duplicate token key "${token.key}" ignored`
      );
      continue;
    }
    const row = { ...token };
    if (category && !row.category) {
      row.category = category;
    }
    VISUAL_TOKENS.push(row);
    added.push(row);
  }
  if (added.length) {
    refreshDerivedTokenLists();
    for (const listener of tokenRegistrationListeners) {
      listener(added);
    }
  }
  return added.length;
}

export function registerTokenCategory(id, displayName) {
  if (VISUAL_TOKEN_CATEGORIES.some((category) => category.id === id)) {
    return false;
  }
  VISUAL_TOKEN_CATEGORIES = [...VISUAL_TOKEN_CATEGORIES, { id, displayName }];
  return true;
}

export function clampAlpha(pct) {
  const value = Number(pct);
  if (isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

export function alphaPercentToHex(pct) {
  return Math.round((clampAlpha(pct) / 100) * 255)
    .toString(16)
    .padStart(2, "0");
}

// compose a color + alpha percent into the hex form the layers consume
export function composeAlphaColor(rgbHex, alphaPct) {
  if (clampAlpha(alphaPct) <= 0) {
    return "transparent";
  }
  return rgbHex + alphaPercentToHex(alphaPct);
}

// ---- theme pack format, JSON Schema and validation (L4) --------------------
//
// The schema is GENERATED from the table above -- never hand-edited -- so the
// pack format cannot drift from the token definitions. A human-readable
// snapshot is written to docs/schemas/ by scripts/dump-visual-tokens.mjs.

export const THEME_PACK_FORMAT = "engramfont-theme";
export const THEME_PACK_VERSION = 1;

// canonical packs store 6-digit hex; 3/4/8-digit forms are accepted for
// robustness and normalized on import
const COLOR_PATTERN = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$";

function tokenValueSchema(token) {
  if (token.type === "color" || token.type === "color-alpha") {
    return {
      type: "string",
      pattern: COLOR_PATTERN,
      default: token.defaultLight,
      title: token.displayName,
      "x-category": token.category,
      "x-dark-default": token.defaultDark ?? token.defaultLight,
      ...(token.type === "color-alpha"
        ? {
            "x-alpha-key": alphaKeyOf(token),
            "x-alpha-default": token.defaultAlpha ?? 100,
          }
        : {}),
    };
  }
  if (token.type === "number") {
    return {
      type: "number",
      minimum: token.control.min,
      maximum: token.control.max,
      default: token.default,
      title: token.displayName,
      "x-category": token.category,
    };
  }
  return {
    type: "boolean",
    default: token.default,
    title: token.displayName,
    "x-category": token.category,
  };
}

// JSON Schema (draft 2020-12) for a .engramfont-theme.json pack file.
export function buildThemePackSchema() {
  const values = {};
  for (const token of VISUAL_TOKENS) {
    values[token.key] = tokenValueSchema(token);
    if (token.type === "color-alpha") {
      values[alphaKeyOf(token)] = {
        type: "number",
        minimum: 0,
        maximum: 100,
        default: token.defaultAlpha ?? 100,
        title: `${token.displayName} alpha (%)`,
        "x-category": token.category,
      };
    }
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "engramfont-theme-pack-v1",
    title: "EngramFont theme pack",
    description:
      "A portable snapshot of EngramFont canvas appearance token values. " +
      "Generated from VISUAL_TOKENS -- do not edit the emitted schema by hand.",
    type: "object",
    required: ["format", "version", "values"],
    additionalProperties: false,
    properties: {
      format: { const: THEME_PACK_FORMAT },
      version: { const: THEME_PACK_VERSION },
      name: { type: "string", maxLength: 80 },
      values: {
        type: "object",
        additionalProperties: false,
        properties: values,
      },
    },
  };
}

// Machine-readable token catalog: every semantic token with its metadata and
// visualization-layer targets. Consumed by docs, tooling and future theme
// editors; snapshot in docs/schemas/visual-tokens.catalog.json.
export function buildTokenCatalog() {
  return {
    format: "engramfont-token-catalog",
    version: 1,
    packFormat: THEME_PACK_FORMAT,
    packVersion: THEME_PACK_VERSION,
    tokens: VISUAL_TOKENS.map((token) => ({
      key: token.key,
      type: token.type,
      category: token.category,
      displayName: token.displayName,
      ...(token.type === "number" || token.type === "boolean"
        ? { default: token.default }
        : {
            defaultLight: token.defaultLight,
            defaultDark: token.defaultDark ?? token.defaultLight,
            ...(token.type === "color-alpha"
              ? { alphaKey: alphaKeyOf(token), defaultAlpha: token.defaultAlpha ?? 100 }
              : {}),
          }),
      ...(token.control ? { control: token.control } : {}),
      ...(token.shape ? { shape: token.shape } : {}),
      ...(token.inlineInto ? { inlineInto: token.inlineInto } : {}),
      layers: (token.apply ?? []).map((spec) => spec.layer),
    })),
  };
}

// Lenient pack validation used by the importer: hard-fails on a broken
// container (wrong format / missing values), tolerates and REPORTS unknown or
// ill-typed keys so packs from newer versions still partially apply.
export function validateThemePack(data) {
  const errors = [];
  const unknownKeys = [];
  const invalidKeys = [];
  const applicableKeys = [];
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, errors: ["theme pack must be a JSON object"], unknownKeys, invalidKeys, applicableKeys };
  }
  if (data.format !== THEME_PACK_FORMAT) {
    errors.push(`format must be "${THEME_PACK_FORMAT}"`);
  }
  if (data.version !== THEME_PACK_VERSION) {
    errors.push(`unsupported version ${JSON.stringify(data.version)}`);
  }
  const values = data.values;
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    errors.push("values must be an object");
    return { ok: false, errors, unknownKeys, invalidKeys, applicableKeys };
  }

  const known = new Map();
  for (const token of VISUAL_TOKENS) {
    known.set(token.key, token);
    if (token.type === "color-alpha") {
      known.set(alphaKeyOf(token), {
        type: "alpha",
        key: alphaKeyOf(token),
      });
    }
  }
  for (const [key, value] of Object.entries(values)) {
    const token = known.get(key);
    if (!token) {
      unknownKeys.push(key);
      continue;
    }
    let valid = false;
    if (token.type === "number" || token.type === "alpha") {
      valid = typeof value === "number" && isFinite(value);
      if (valid && token.type === "alpha") {
        valid = value >= 0 && value <= 100;
      }
      if (valid && token.control) {
        valid = value >= token.control.min && value <= token.control.max;
      }
    } else if (token.type === "boolean") {
      valid = typeof value === "boolean";
    } else {
      valid =
        typeof value === "string" &&
        new RegExp(COLOR_PATTERN).test(value);
    }
    if (valid) {
      applicableKeys.push(key);
    } else {
      invalidKeys.push(key);
    }
  }
  for (const key of Object.keys(data)) {
    if (!["format", "version", "name", "values"].includes(key)) {
      unknownKeys.push(key);
    }
  }
  return {
    ok: errors.length === 0 && invalidKeys.length === 0,
    errors,
    unknownKeys,
    invalidKeys,
    applicableKeys,
  };
}
