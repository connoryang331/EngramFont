# Visual Layer Settings Inventory

> Source files: `src-js/views-editor/src/visualization-layer-definitions.js` (plus `fontra.transform.selection` from `edit-tools-pointer.js`)
> Baseline: commit `ea0e3f67b` + uncommitted changes from this session (R4-T4.28 ~ R4-T4.35)
> Purpose: organize **all adjustable colors / sizes / styles** in the visual layer into a categorized settings-panel inventory; after confirmation, implement them in batches.
> Layer identifiers are the stable anchor; this document indexes by identifier throughout and does not cite line numbers.

---

## 1. How a setting takes effect (mechanism quick reference)

```
themeController.model (theme-settings.js, localStorage prefix "engramfont-")
        │  keyListener (editor.js)
        ▼
apply<Feature>Settings(model) (visualization-layer-definitions.js)
        │  writes layerDef.colors / .screenParameters / .glyphParameters
        ▼
buildLayers() merge: parameters = {...mulScalar(screenParameters, zoom), ...glyphParameters, ...colors}
        ▼
layer.draw(context, parameters, ...)
```

- `colors` / booleans / strings enter parameters **as-is** (not scaled with zoom);
- `screenParameters` are **screen pixels**, scaled by zoom — all newly added size/width/font-size settings must go here;
- Dimensionless shape parameters (e.g. the squircle exponent n) must go in `glyphParameters` (not scaled).

**Established policy (every new entry must follow):**
1. Colors are always hex (native `<input type="color">`, RGB picker); **light and dark themes share one value** (apply writes both colors and colorsDarkMode).
2. Colors whose defaults carry alpha (e.g. `#0004`, `#00BFFF18`) → the panel uses a combined "color + α number-wheel (0-100)" row; apply composes the 8-digit hex; α=0 → `"transparent"` (the pattern is already verified on editingLayerNodes).
3. Sizes/widths → number-wheel (min/max/step/default); booleans → checkbox; every row gets a reset.
4. Panel cards reuse the existing `nodeAppearanceRow()` / `grouped-settings` mechanism; no new controls are introduced.

---

## 2. Shipped settings (current state: 5 cards, 19 keys)

| Card | Model key | Default | Control |
|---|---|---|---|
| Theme | `theme` | automatic | radio |
| Node appearance | `nodeSize` | 8 | number-wheel 4-24 |
| | `nodeSmoothColor` | #7A4FE8 | color |
| | `nodeSquircleColor` | #0D9488 | color |
| | `nodeSquircleExponent` | 3 | number-wheel 1-8 step 0.5 |
| | `nodeCornerColor` | #C2410C | color |
| | `nodeHandleColor` | #A0A0B0 | color |
| | `nodeHandleSize` | 6 | number-wheel 3-24 |
| | `nodeHandleShapeDiamond` | false | checkbox |
| | `editingLayerNodesColor` | #BBBBFF | color |
| | `editingLayerNodesAlpha` | 0 | number-wheel 0-100 step 5 |
| Transform selection | `transformHandleFillColor` | #BBBBFF | color |
| | `transformHandleSize` | 8 | number-wheel |
| | `transformBorderColor` | #AAAAAA | color |
| | `transformBorderWidth` | 1 | number-wheel 0.5-6 |
| Start point indicator | `startpointChevronColor` | #989898 | color |
| | `startpointChevronSize` | 1 | number-wheel 0.5-3 |
| Drag crosshair | `crosshairColor` | #888888 | color |
| | `crosshairStrokeWidth` | 1 | number-wheel |
| | `crosshairDashed` | true | checkbox |

Layers driven by these settings: `fontra.nodes`, `fontra.selected.nodes`, `fontra.component.nodes`, `fontra.startpoint.indicator`, `fontra.transform.selection`, `fontra.edit.editing.layers.nodes-and-handles`, `fontra.crosshair`.

## 3. Corrections to the current state (found during the inventory, fixed together with this batch)

| # | Issue | Fix |
|---|---|---|
| E1 | `canvasBackgroundColor`: the model key + `setupCanvasBackgroundOverride` + the editor.js listener all exist, **but the panel has no corresponding row** (ledger entry T4.33 claims there is one; the current file has none) | Add a color row to the Canvas background card |
| E2 | `selectedHandleColor`: `applyNodeAppearanceSettings` reads it (`?? "#A0A0B0"`), but **the model has no default key and the panel has no row** | Add the key in theme-settings.js + add a "Selected handle" row to the Node appearance card |

---

## 4. Settings to be added (grouped by panel card)

Priority: **P1** = color items the user explicitly called out this round; **P2** = commonly used, visible at a glance; **P3** = long tail / full coverage.
Control column: **C** = color; **C+α** = color + α wheel (default value carries alpha); **N** = number-wheel; **☑** = checkbox.
"Current value light/dark" = `colors` / `colorsDarkMode` in the layer definitions.

### 4.1 Canvas and grid (Card: Canvas & grid)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| (global) | Canvas background color | #FFFFFF (CSS variable) | `canvasBackgroundColor` ✅ key exists | C | **E1: add row** |
| `fontra.upm.grid` | UPM grid line color | #E6E6E6 / #3C3C3C | `upmGridColor` | C | P2 |
| `fontra.upm.grid` | UPM grid line width | 2 | `upmGridStrokeWidth` | N | P3 |

### 4.2 Nodes and handles (extends the Node appearance card)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.selected.nodes` | Selected handle color | (currently reads handleColor) | `selectedHandleColor` | C | **E2: add key + row** |
| `fontra.selected.nodes` | Selected node fill color | #000 / #FFF | `selectedNodeColor` | C | P2 |
| `fontra.selected.nodes` | Selected node halo color | #FFFA / #0008 | `selectedNodeUnderColor` | C+α | P3 |
| `fontra.handles` | Handle line color | #BBB / #777 | `handleLineColor` | C | P2 |
| `fontra.handles` | Handle line width | 1 | `handleLineStrokeWidth` | N | P3 |
| `fontra.edit.background.layers.nodes-and-handles` | Background layer node color | #DDDF / #555F | `bgLayerNodesColor` | C+α | P2 |
| Same layer | Background layer node sizes (3) | 5.5/5.5/4.5 | `bgLayerNodeSize` / `bgLayerHandleSize` | N×2 (corner=smooth shared) | P3 |

> `fontra.component.nodes` has been merged into the Node appearance settings (apply pushes to all three layers at once); no new key is needed.

### 4.3 Path colors (Card: Path — user-requested "#0004" this round)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.edit.path.stroke` | Main outline stroke color | #000 / #FFF | `editPathStrokeColor` | C | **P1** |
| `fontra.edit.path.stroke` | Main outline stroke width | 1 | `editPathStrokeWidth` | N | P2 |
| `fontra.edit.path.under.stroke` | Outline under-stroke color | **#FFF6 / #0004** | `editPathUnderStrokeColor` | C+α | **P1** |
| `fontra.edit.path.under.stroke` | Under-stroke width | 3 | `editPathUnderStrokeWidth` | N | P3 |
| `fontra.edit.path.fill` | Outline fill color | #0001 / #FFF3 | `editPathFillColor` | C+α | P2 |

> Clarification: the `strokeColor: "#0004"` the user pasted is the **current light-mode value of baseline / lineMetrics**; for `fontra.edit.path.under.stroke`, light mode is `#FFF6` and only dark mode is `#0004`. Both places will become settings.

### 4.4 Glyph fills and highlights (Card: Glyph display)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.context.glyphs` | Context glyph fill | #000 / #FFF | `contextGlyphColor` | C | P2 |
| `fontra.context.glyphs` etc. (3 layers) | Error glyph color | #AAA / #999 | `glyphErrorColor` (shared by the 3 layers) | C | P3 |
| `fontra.selected.glyph` | Selected glyph fill | #000 / #FFF | `selectedGlyphColor` | C | P2 |
| `fontra.selected.glyph` | Selected glyph outer stroke | #7778 / #FFF8 | `selectedGlyphOutlineColor` | C+α | P2 |
| `fontra.hovered.glyph` | Hovered glyph fill | #000 / #FFF | `hoveredGlyphColor` | C | P3 |
| `fontra.hovered.glyph` | Hovered glyph outer stroke | #BBB8 / #CCC8 | `hoveredGlyphOutlineColor` | C+α | P3 |
| `fontra.undefined.glyph` | Undefined glyph placeholder | #0006 / #FFF6 | `undefinedGlyphColor` | C+α | P3 |
| `fontra.undefined.glyph` | Empty (un-edited) glyph placeholder | #0002 / #FFF2 | `emptyGlyphColor` | C+α | P3 |
| `fontra.empty.selected.glyph` | Empty selected glyph background | #D8D8D8 / #585858 | `emptySelectedGlyphColor` | C | P3 |
| `fontra.empty.hovered.glyph` | Empty hovered glyph background | #E8E8E8 / #484848 | `emptyHoveredGlyphColor` | C | P3 |
| `fontra.all.glyphs` (clean display) | All-glyphs fill | #000 / #FFF | `cleanGlyphColor` | C | P3 |
| selected/hovered.glyph | Inner/outer stroke width | 10 / 3 | `glyphOuterStrokeWidth` / `glyphInnerStrokeWidth` | N×2 | P3 |

### 4.5 Labels and indices (Card: Labels — user-requested boxColor this round)

> The five label layers are isomorphic: background boxColor + text color + fontSize. **Recommendation: start with the shared background/text key pair + per-layer font sizes** (keeps the panel from exploding); per-layer key-name alternatives are given in the table, to be decided at confirmation.

| Layer | Property | Current value light/dark | Suggested model key (shared scheme) | Control | Priority |
|---|---|---|---|---|---|
| `fontra.coordinates` | Coordinate label box color | #FFFB / #1118 | `labelBoxColor` | C+α | **P1** |
| `fontra.coordinates` | Coordinate label text color | #000 / #FFF | `labelTextColor` | C | **P1** |
| `fontra.point.index` | Point index box/text | same as above | (shared) | — | P2 |
| `fontra.contour.index` | Contour index box/text | same as above | (shared) | — | P2 |
| `fontra.component.index` | Component index box/text | same as above | (shared) | — | P2 |
| `fontra.anchor.names` | Anchor name box/text | same as above | (shared) | — | P3 |
| Each of the five layers | Font size | 10/10/11/11/10 | `labelFontSizeCoordinates` etc., 5 keys | N×5 | P3 |

Per-layer alternative keys: `coordinatesBoxColor/coordinatesTextColor`, `pointIndexBoxColor/…`, `contourIndexBoxColor/…`, `componentIndexBoxColor/…`, `anchorNamesBoxColor/…`.

### 4.6 Guidelines (Card: Guidelines — user requested the whole color set this round)

| Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|
| Glyph guidelines (normal state) | #0006 / #FFF8 | `guidelineColor` | C+α | **P1** |
| Font guidelines | #00BFFF / #00BFFFC0 | `fontGuidelineColor` | C+α | **P1** |
| Hovered guideline | #0001 / #FFFFFF18 | `guidelineHoveredColor` | C+α | P2 |
| Selected guideline | #0002 / #FFF3 | `guidelineSelectedColor` | C+α | P2 |
| Hovered + selected | #0000002B / #FFF4 | `guidelineHoveredSelectedColor` | C+α | P3 |
| Selected guideline node | #000 / #FFF | `guidelineNodeSelectedColor` | C | P2 |
| Hovered guideline node | #BBB | `guidelineNodeHoveredColor` | C | P3 |
| Node halo | #FFFA / #0008 | `guidelineNodeUnderColor` | C+α | P3 |
| Lock icon complementary colors ×2 | #F6F6F6/#333, #0006/#BBB | `guidelineIconUnderColor` / `guidelineIconHoveredColor` | C×2 | P3 |
| Stroke width | 1 | `guidelineStrokeWidth` | N | P2 |
| Font size / marker circle radius / dash segment | 10 / 4 / 3 | `guidelineFontSize` / `guidelineMarkerRadius` / `guidelineDash` | N×3 | P3 |

### 4.7 Metrics lines (Card: Metrics — user-requested zoneColor this round)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.baseline` | Baseline color | #0004 / #FFF6 | `baselineColor` | C+α | **P1** |
| `fontra.lineMetrics` | Metrics line / font box color | #0004 / #FFF6 | `lineMetricsColor` | C+α | **P1** |
| `fontra.lineMetrics` | Alignment zone fill | #00BFFF18 | `lineMetricsZoneColor` | C+α | **P1** |
| `fontra.lineMetrics` | Zone end-line color | #00608018 / #80DFFF18 | `lineMetricsZoneStrokeColor` | C+α | P2 |
| Each of the two layers | Stroke width | 1 | `baselineStrokeWidth` / `lineMetricsStrokeWidth` | N×2 | P3 |

### 4.8 Anchors (Card: Anchors)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.anchors` | Anchor circle color | #999 | `anchorColor` | C | P2 |
| `fontra.anchors` | Anchor circle radius | 4 | `anchorMarkerRadius` | N | P3 |
| `fontra.selected.anchors` | Hovered anchor circle | #BBB | `anchorHoveredColor` | C | P3 |
| `fontra.selected.anchors` | Selected anchor fill | #000 / #FFF | `anchorSelectedColor` | C | P3 |
| `fontra.selected.anchors` | Selected anchor halo | #FFFA / #0008 | `anchorUnderColor` | C+α | P3 |

### 4.9 Components (Card: Components)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.component.selection` | Hovered component stroke | #CCC / #666 | `componentHoveredColor` | C | P2 |
| `fontra.component.selection` | Selected component stroke | #888 / #AAA | `componentSelectedColor` | C | P2 |
| `fontra.component.selection` | Component origin cross | #BBB | `componentOriginColor` | C | P3 |
| `fontra.component.selection` | Transform center marker | #777 / #DDD | `componentTCenterColor` | C | P3 |

### 4.10 Multi-layer outlines (Card: Layer outlines)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.edit.background.layers` | Background layer outline | #CCCF / #666F | `bgLayerOutlineColor` | C+α | P2 |
| `fontra.edit.background.layers` | Background layer anchor circle | #DDDF / #555F | `bgLayerAnchorColor` | C+α | P3 |
| `fontra.edit.editing.layers` | Editing layer (other layers) outline | #99FF / #559F | `editingLayerOutlineColor` | C+α | P2 |
| `fontra.edit.editing.layers` | Editing layer anchor circle | #AAFF / #558F | `editingLayerAnchorColor` | C+α | P3 |

### 4.11 Interaction aids (Card: Interaction aids)

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.ghostpath` | Drag ghost path | #AAA6 / #8886 | `ghostPathColor` | C+α | P2 |
| `fontra.connect-insert.point` | Connect/insert hint | #3080FF80 / #50A0FF80 | `connectInsertColor` | C+α | P3 |
| `fontra.background-image` | Background image border (selected) | #888 / #FFF | `backgroundImageColor` | C | P3 |
| `fontra.background-image` | Background image border (hovered) | #8885 / #FFF5 | `backgroundImageHoverColor` | C+α | P3 |
| `fontra.glyph.locking` + `.non-editing` | Lock icon color | #000C / #FFFC | `lockIconColor` (shared by 2 layers) | C | P3 |

### 4.12 Tool layers (Card: Tools)

> The six tools have their own layers and follow the same apply*Settings + keyListeners pattern (they all sit in the visualizationLayerDefinitions array; the mechanism is no different). kerning / sidebearings each have twin identifiers that share one set of keys.

| Layer | Property | Current value light/dark | Suggested model key | Control | Priority |
|---|---|---|---|---|---|
| `fontra.power.ruler` | Ruler line color | #0004 / #FFF6 | `powerRulerStrokeColor` | C+α | P2 |
| Same layer | Distance box inner background | #FFFB / #444B | `powerRulerInsideBlobColor` | C+α | P2 |
| Same layer | Distance box inner text color | #000B / #FFFB | `powerRulerInsideTextColor` | C+α | P3 |
| Same layer | Distance box outer background | #000B / #FFFB | `powerRulerOutsideBlobColor` | C+α | P3 |
| Same layer | Distance box outer text color | #FFFB / #444B | `powerRulerOutsideTextColor` | C+α | P3 |
| Same layer | Curve intersection color | #F085 / #F696 | `powerRulerIntersectionColor` | C+α | P2 |
| Same layer | Stroke width / font size / intersection radius | 1 / 12 / 4 | `powerRulerStrokeWidth` / `powerRulerFontSize` / `powerRulerIntersectionRadius` | N×3 | P3 |
| `fontra.knifetool.line` | Knife line color | #1118 / #FFFB | `knifeLineColor` | C+α | P2 |
| Same layer | Knife intersection circle color | #3080FF80 / #50A0FF80 | `knifeNodeColor` | C+α | P3 |
| Same layer | Stroke width / intersection circle size | 1 / 10 | `knifeStrokeWidth` / `knifeNodeSize` | N×2 | P3 |
| `fontra.sidebearings.*` (shared by 3 twin layers) | Sidebearing line color | #0004 / #FFF6 | `sidebearingColor` | C+α | P2 |
| Same layer | Stroke width / extent length | 1 / 16 | `sidebearingStrokeWidth` / `sidebearingExtent` | N×2 | P3 |
| `fontra.kerning-indicators.*` (shared by 2 twin layers) | Negative kerning band color | #F1175933 / #FF336655 | `kernNegativeColor` | C+α | P3 |
| Same layer | Positive kerning band color | #1759F133 / #3366FF55 | `kernPositiveColor` | C+α | P3 |
| `fontra.cjk.design.frame` | Design frame line color | #0004 / #FFF6 | `cjkFrameStrokeColor` | C+α | P3 |
| Same layer | Overshoot area color | #00BFFF26 | `cjkFrameOvershootColor` | C+α | P3 |
| Same layer | Second line color | #A6296344 / #A62963AA | `cjkFrameSecondLineColor` | C+α | P3 |
| Same layer | Stroke width | 1 | `cjkFrameStrokeWidth` | N | P3 |
| `fontra.shapetool.shape` | Shape preview fill | #FFFB / #1118 | `shapeToolFillColor` | C+α | P3 |
| Same layer | Shape preview stroke | #000 / #FFF | `shapeToolStrokeColor` | C | P3 |
| Same layer | Stroke width | 1 | `shapeToolStrokeWidth` | N | P3 |
| `fontra.reference.font` | Reference font fill | #AAA6 | `referenceFontColor` | C+α | P2 |
| Same layer | Reference font stroke width | 1 | `referenceFontStrokeWidth` | N | P3 |

### 4.13 Status color bar (Card: Status bar — `fontra.status.color`)

| Property | Current value | Suggested model key | Control | Priority |
|---|---|---|---|---|
| Color bar minimum thickness | 3 | `statusBarMinThickness` | N | P3 |
| Color bar maximum thickness | 15 | `statusBarMaxThickness` | N | P3 |
| Editing-state opacity | 40% (hardcoded ×0.4 in draw) | `statusBarEditingOpacity` | N 0-100 | P3 |

> The colors themselves come from font customData (`fontra.sourceStatusFieldDefinitions`, one color per status) — this is **project data**, and a global override would break the "color per status" feature itself. This is a functional constraint, not an omission; all 3 appearance parameters above can be set.

### 4.14 Rect-select rectangle (Card: Rect select — `fontra.rect.select`) ⚠ requires a draw change

| Property | Current value | Suggested model key | Control | Priority |
|---|---|---|---|---|
| Solid line color (inner) | #000 (hardcoded) | `rectSelectSolidColor` | C | P3 |
| Dashed line color (outer) | #FFF (hardcoded) | `rectSelectDashColor` | C | P3 |
| Stroke width | 1 | `rectSelectStrokeWidth` | N | P3 |
| Dash segment length | 10 | `rectSelectDashLength` | N | P3 |

> What "⚠ requires a draw change" means: this layer's black/white pair is not in the colors table like other layers; it is hardcoded in the draw function code (`context.strokeStyle = "#000"` / `"#FFF"`). Before wiring into the settings pipeline, a ~10-line change is required first: move the two colors into the colors table and make draw read from `parameters`. After that it is no different from an ordinary layer.

### 4.15 Fine-tuning sizes (Card: Fine tuning — long-tail screenParameters, all P3)

| Layer | Parameter | Current value | Suggested model key |
|---|---|---|---|
| `fontra.guidelines` | Text margin | 5 | `guidelineMargin` |
| Same layer | Lock icon size iconSize | 12 | `guidelineIconSize` |
| Same layer | Guideline node size smoothSize | 8 | `guidelineNodeSize` |
| Same layer | Hover stroke offset hoverStrokeOffset | 4 | `guidelineHoverStrokeOffset` |
| Same layer | Underlay offset underlayOffset | 2 | `guidelineUnderlayOffset` |
| `fontra.selected.anchors` | Anchor size smoothSize | 8 | `anchorSelectedSize` |
| Same layer | Stroke width / hover stroke offset / underlay offset | 1 / 4 / 2 | `anchorSelectedStrokeWidth` / `anchorHoverStrokeOffset` / `anchorUnderlayOffset` |
| `fontra.selected.nodes` | Hover stroke offset / underlay offset | 4 / 2 | `nodeHoverStrokeOffset` / `nodeUnderlayOffset` |
| `fontra.component.selection` | Hovered/selected stroke width | 3 / 3 | `componentHoverStrokeWidth` / `componentSelectedStrokeWidth` |
| Same layer | Origin/center marker stroke width | 1 / 2 | `componentOriginMarkerStrokeWidth` / `componentOriginMarkerSelectedStrokeWidth` |
| Same layer | Marker half-arm length / circle radius | 10 / 4 | `componentOriginMarkerSize` / `componentOriginMarkerRadius` |
| `fontra.connect-insert.point` | Connect radius / insert handle radius | 11 / 5 | `connectInsertRadius` / `connectInsertHandlesRadius` |
| Same layer | Delete indicator arm length / draggable indicator radius / stroke width | 7 / 9 / 2 | `connectInsertDeleteIndicatorLength` / `connectInsertDragIndicatorRadius` / `connectInsertStrokeWidth` |
| `fontra.glyph.locking` ×2 | Lock icon size | 19 | `lockIconSize` |
| `fontra.background-image` | Border stroke width | 2 | `backgroundImageStrokeWidth` |
| `fontra.edit.background.layers` | Outline stroke width / anchor circle radius | 1 / 4 | `bgLayerOutlineStrokeWidth` / `bgLayerAnchorRadius` |
| `fontra.edit.editing.layers` | Outline stroke width / anchor circle radius | 1 / 4 | `editingLayerOutlineStrokeWidth` / `editingLayerAnchorRadius` |
| `fontra.anchor.names` | Top margin | 6 | `anchorNamesMarginFromTop` |
| `fontra.startpoint.indicator` | Chevron-to-node gap | 5 | `startpointChevronGap` (deliberately constant by design, does not scale with node size — adjustable, default preserved) |
| Same layer | Chevron stroke width | 2 | `startpointChevronStrokeWidth` |
| `fontra.crosshair` | Dash segment length ([4,4]) | 4 | `crosshairDashLength` |

---

## 5. Exclusions (updated: none)

At the user's request **everything is included — there are no exclusions anymore**. How the four categories originally marked "not for now" are handled:

| Originally excluded | Handling |
|---|---|
| `fontra.status.color` status color bar | The 3 appearance parameters become settings (§4.13); the colors themselves come from font customData and are project data — a global override would break the feature itself. Functional constraint, not an omission |
| `fontra.rect.select` rect-select rectangle | After changing draw to read colors (~10 lines), fully wired in — 4 items (§4.14) |
| Tool-owned layers | All included (§4.12): power ruler 9, knife 4, sidebearings 3, kerning bands 2, CJK frame 4, shape 3, reference font 2 |
| Long-tail screenParameters | All included (§4.15): 33 fine-tuning sizes |

---

## 6. Counts and phasing

**Total to add: 71 colors + 68 numeric values = 139 items** (not counting the 20 shipped keys and the 2 corrections).

| Phase | Content | Size |
|---|---|---|
| Phase 0 (corrections) | E1 add canvas background row; E2 add the selectedHandleColor key and row | 2 items |
| Phase 1 (P1) | Path 3 colors + labels 2 shared colors + guidelines 2 colors + metrics 4 colors (including baseline) | 10 keys |
| Phase 2 (P2) | P2 items from §4.1-4.12 (grid / handle lines / selected node glyph / labels / guideline interaction / anchors / components / multi-layer outlines / tool primary colors) | 25 keys |
| Phase 3 (P3) | All remaining colors + all sizes/font sizes (§4.13-4.15 and the P3 items in each table, including the rect.select code change) | 104 keys |

**Final panel size once everything is done**: current 18 rows + 2 correction rows + 139 new rows ≈ **159 setting rows** (about 200 model keys, including 40 α companion keys).
Phasing only fixes the implementation order; in the end everything lands in the same settings page; the "Priority" column in each table is authoritative.

**Per-key wiring steps (fixed four steps)**:
1. Add a default key to the `theme-settings.js` model;
2. Add/extend `apply<Feature>Settings(model)` in `visualization-layer-definitions.js` (write colors + colorsDarkMode at the same time; sizes go into screenParameters);
3. Add the key name to the keyListeners array in `editor.js`;
4. Add a row to the corresponding card in `panel-theme-settings.js` (`nodeAppearanceRow` or checkbox); α colors use the combined row.

> ~~Suggestion: starting from Phase 1, consolidate the 4 apply functions into a table-driven implementation~~ → **now settled as a hard prerequisite**, see §8 theme architecture.

**Verification (same process every phase)**: rebuild bundle → Ctrl+F5 → Playwright panel smoke test (row count, default values, no pageerror) → editor smoke test (layer registration, sampled value changes taking effect immediately, screenshots) → record the entry in the `ENGRAM-CHANGES.md` ledger.

---

## 7. Confirmed decisions (2026-10-15)

1. The five label layers use the **shared** background/text key pair (share first; split per layer later if needed).
2. **Include everything**, including all items originally in §5 (status color bar / rect-select rectangle / tool layers / long-tail sizes); phasing only fixes the implementation order.
3. `rect.select` gets wired into settings after the draw change (~10 lines).
4. Theme capability follows the **four-layer architecture** (light/dark switching → preset packs → element-level customization → import/export); L3 is the watershed and must be done in full, and the foundation of L4 (the token table) is built starting now — see §8.

---

## 8. Theme architecture: four capability layers and the token table

### 8.1 Current state of the four layers

| Layer | Current state | Action |
|---|---|---|
| 1. Light/dark switching | Present (theme radio + light/dark CSS classes + per-layer colorsDarkMode) | Keep |
| 2. Preset theme packs | None | = named snapshots of the token table; available as soon as the table exists |
| 3. Element-level customization | **In progress** (the 139 items in this inventory are L3) | Continue implementing |
| 4. Full theme system | None | Supported by the token table from day one; import/export UI comes later |

### 8.2 The VISUAL_TOKENS table (single source of truth)

Each row = one semantic token (token ids reuse the existing camelCase model keys; localStorage-compatible, no renaming):

```js
{
  key: "nodeSmoothColor",              // token id = model key
  category: "node",                    // panel card
  displayName: "Smooth node",
  control: { ui: "color" },            // color | color-alpha | number | checkbox
  defaultLight: "#7A4FE8",
  defaultDark: "#A78BFA",              // hand-tuned dual-theme defaults, not derived
  apply: { layer: "fontra.nodes", colors: { smoothColor: 1 } },  // 1 = reference to this token
}
```

All derivatives are generated from the table; no more manual syncing:
- `applyVisualLayerSettings(model)`: iterate the table → write layerDef's colors / colorsDarkMode / screenParameters / glyphParameters
- The keyListeners key list in editor.js = the table's keys
- The settings panel generates rows into cards by category (nodeAppearanceRow mechanism unchanged)
- The pollution-migration color key list = the table's color token keys
- L4 import/export = JSON serialization of the table's `{key: value}`

### 8.3 Color resolution rules (light/dark + user overrides)

1. **No override**: use the hand-tuned defaultLight / defaultDark (more accurate than formula derivation).
2. **With override**: the light theme uses the override value; the dark theme = OKLCH derivation — **H and C preserved, L remapped to the target contrast against the dark canvas**. "The same color, with only its lightness tuned for the dark background"; the user's choice is not lost when switching themes.
   ⚠ Direction correction: **foreground** elements on a dark background (nodes/strokes) need a **higher** L (#7A4FE8 → #A78BFA is exactly this direction); what "darkens" is the canvas background itself.
3. **Storage is always sRGB hex** (native color picker); OKLCH is used only for internal derivation (a hex→OKLCH→hex pure-function module, ~100 lines, no UI) — the OKLCH picker is not being revived.
4. Numeric / boolean tokens are shared across both themes, no derivation.
5. Tokens with α = two keys, color + α; derivation only touches the RGB's L; α is preserved as-is.

### 8.4 Preset packs (L2, implemented)

- **Four built-in packs**: High contrast / Low noise (muted) / Warm paper / Cool paper
  (all color keys snapshotted, sizes keep user values), `theme-presets.js` + `registerThemePreset()`.
- **Custom presets** (panel Preset card): Save as new (snapshot all current token values, name it) /
  Rename / Delete (stored in the `themeCustomPresets` model key, JSON persistence + cross-tab sync) /
  **Restore defaults** (all tokens back to factory defaults, light/dark mode preference preserved).
- **Pre-release QA**: three-tier WCAG matrix (Tier A primary markers ≥3:1 / Tier B secondary annotations ≥1.5 /
  Tier C intentionally muted, report only) + ΔE over the four node colors — `test-preset-contrast.mjs`.

### 8.5 How the two expert pitfalls are handled

- **Extremum point contrast**: node types are already shape-encoded (eye/square/superellipse/diamond), not color alone ✓; the preset QA matrix provides the backstop.
- **Theme vs document data**: the `status.color` colors come from font customData (flagged in §4.13) and do not enter the theme; canvas outline/preview colors are "preview ink" (themeable), not document data ✓. UI chrome (sidebar/toolbar) is out of scope for this round.

### 8.6 Implementation order (executed from R4-T4.40 onward)

1. ✅ **Token table refactor** (R4-T4.38): `fontra-core/src/visual-tokens.js` (token table) +
   the table-driven `applyVisualTokenSettings()` in `visualization-layer-definitions.js` (lazy-initialized
   pristine snapshot + touched layers replay from pristine); model defaults, pollution-migration color keys,
   editor.js listeners, and panel cards are all derived from the table; the 4 old apply functions are deleted.
2. ✅ **OKLCH derivation module** (R4-T4.38): `fontra-core/src/color-derive.js` — flip rule
   (dark background takes the opposite side: black ink → white), analytic lightness solution + L bisection +
   gamut chroma reduction; unit tests `qa/node-icons/test-color-derive.mjs`
   (purple #7A4FE8 → #a996ff, verified same-family as the hand-tuned reference #A78BFA).
3. ✅ **Phase 1 P1** (R4-T4.38): 10 tokens enter the table (path 3, labels 2, guidelines 2, metrics 3).
4. ✅ **L4 theme pack import/export** (R4-T4.38, moved up): panel Theme packs card.
5. ✅ **Schema + token catalog + registration API** (R4-T4.39): schema/catalog generated from the table
   (scripts/dump-visual-tokens.mjs → docs/schemas/); import validation generated from the same source;
   architecture settled as "built-in engine + registration API" (§8.8).
6. ✅ **Phase 2 P2** (R4-T4.40): 25 tokens enter the table (UPM grid / selected nodes / handle lines / background layer
   nodes / glyph display 3 / outline stroke width / guideline interaction 4 / zone end-line / anchors / components 2 /
   multi-layer outlines 2 / ghost path / tools 6), 6 new categories added; 4-digit hex nibble audit corrections
   (#DDDF-style values are actually opaque).
   Current state: **59 tokens / 61 panel rows / 79 schema keys**.
7. ✅ **L2 preset packs** (R4-T4.41): four built-in presets (High contrast / Low noise / Warm
   paper / Cool paper, all color keys snapshotted, sizes keep user values) + panel Preset dropdown +
   **three-tier WCAG QA matrix** (Tier A primary markers ≥3:1 / Tier B secondary annotations ≥1.5 / Tier C
   intentionally muted, report only; rect-select checks the dash↔solid pair, labels check the text↔box pair;
   ΔE report over the four node colors) —
   `qa/node-icons/test-preset-contrast.mjs`, 5 packs × 46 checks, all passing.
8. ✅ **Phase 3 P3** (R4-T4.42): 72 tokens (25 long-tail colors + 47 sizes/font sizes,
   including the 3 status color bar items and clean-display special-case layer support).

**Final state: 131 tokens / 134 panel rows / 162 schema keys, 100% coverage of all layers, all four architecture layers L1-L4 landed.** (The inventory originally estimated 139 items; the actual count is 131 — some merged and some names deduplicated; the squircle exponent setting was removed in R4-T4.45, fixed at n=3.)

### 8.7 Theme pack file format (L4, implemented; JSON + JSON Schema)

**Format: JSON** (`.engramfont-theme.json`, `format: "engramfont-theme"`, `version: 1`).

```json
{
  "format": "engramfont-theme",
  "version": 1,
  "name": "My Theme",
  "values": { "nodeSmoothColor": "#7A4FE8", "editingLayerNodesAlpha": 0, "...": "..." }
}
```

**The schema is generated from the token table, not hand-written** (drift prevention):
- `buildThemePackSchema()` (visual-tokens.js) → JSON Schema draft 2020-12:
  `values.additionalProperties: false`; per key, type/pattern (hex with 3/4/6/8 digits)/minimum/maximum/default
  according to the token type, plus extension metadata such as `x-category`,
  `x-dark-default`, `x-alpha-key`
- `buildTokenCatalog()` → **token catalog** (34 tokens: type/category/dual-theme defaults/
  control range/shape/list of applied layers) — the answer to "where are the tokens": the catalog is the tokens' schema-backed inventory
- Snapshots: `docs/schemas/engramfont-theme-pack.schema.json` +
  `docs/schemas/visual-tokens.catalog.json`, regenerated by `node scripts/dump-visual-tokens.mjs`
  (must be run after any table change)
- Import validation `validateThemePack()` (generated from the same source as the schema): container errors (missing format/version/
  values) → reject; unknown keys (a newer pack on an older version) and keys with bad values → **skip and report**,
  the rest apply as usual — forward-compatibility strategy: partial apply + itemized reporting

### 8.8 Built-in vs plugin (architecture decision, 2026-10-15)

**Conclusion: the engine is built in, the table is open for registration, and content (theme packs/presets) is naturally data.**

Basis (Fontra's actual plugin surface, `docs/plugin-structure.md` + `src/fontra/core/server.py`):
four entry-points categories — projectmanagers / **views** / filesystem.backends / **webcontent** —
all "whole-page-level" extensions (new views, project managers, storage backends, static files). The source code confirms:
webcontent only registers static routes `/{name}/{path}` (server.py L64-74), and the core view HTML
has **no plugin script loading point at all**; views only list names in serverInfo (L230-232).
In other words: third-party JS simply cannot enter the editor view today. The theme engine, however, must:
1. Take effect before any layer is drawn (the colors/screenParameters merge in buildLayers);
2. Complete the localStorage migration before the model materializes (timing);
3. Be shared by all canvas views;
4. Keep the canvas working when a plugin is disabled/broken (core functionality must not depend on optional components).

→ The engine (token table parsing, applier, OKLCH derivation, schema, migration) is **built into fontra-core**.
→ The extension point = a **registration API** (a second registry isomorphic to `registerVisualizationLayerDefinition`), implemented:
  - `registerVisualTokens(tokens, {category})`: append token rows (keys deduplicated);
    keys/migration keys/schema/panel rows update automatically via live binding;
  - `registerTokenCategory(id, displayName)`: add a new panel card;
  - `onVisualTokensRegistered(listener)`: theme-settings subscribes and materializes the new token defaults
    into the model (no refresh needed).
  Our own follow-up batches (P2/P3 tool layer colors, L2 presets) are the first registrants — the API gets
  validated by internal use first; once Fontra's plugin mechanism evolves a "core view injection" capability,
  third parties can hook in via webcontent JS + a convention-based loading protocol (the registration API is a pure function call; no new protocol needed).
→ The L4 "content" (`.engramfont-theme.json` theme packs, preset snapshots) are **data files**,
  naturally distributed plugin-style, with no code-level API needed.
