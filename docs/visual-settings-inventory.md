# 视觉层可设置项清单（Settings Inventory）

> 源文件：`src-js/views-editor/src/visualization-layer-definitions.js`（另含 `edit-tools-pointer.js` 的 `fontra.transform.selection`）
> 基线：commit `ea0e3f67b` + 本会话未提交修改（R4-T4.28 ~ R4-T4.35）
> 用途：把视觉层里**所有可调的颜色 / 尺寸 / 样式**整理成设置面板的分类清单，经确认后再逐批实现。
> 图层标识符（identifier）是稳定锚点，全文用它索引，不写行号。

---

## 1. 设置项如何生效（机制速查）

```
themeController.model（theme-settings.js，localStorage 前缀 "engramfont-"）
        │  keyListener（editor.js）
        ▼
apply<Feature>Settings(model)（visualization-layer-definitions.js）
        │  写 layerDef.colors / .screenParameters / .glyphParameters
        ▼
buildLayers() 合并：parameters = {...mulScalar(screenParameters, zoom), ...glyphParameters, ...colors}
        ▼
layer.draw(context, parameters, ...)
```

- `colors` / 布尔 / 字符串**原样**进入 parameters（不随缩放）；
- `screenParameters` 是**屏幕像素**，会被 zoom 缩放 —— 所有新增的尺寸/宽度/字号设置都必须放这里；
- 无量纲形状参数（如 squircle 指数 n）必须放 `glyphParameters`（不缩放）。

**既定政策（新增项一律遵守）：**
1. 颜色一律 hex（原生 `<input type="color">`，RGB 拾色器）；**亮暗主题共用一个值**（apply 时同时写 colors 与 colorsDarkMode）。
2. 默认值自带透明度的颜色（如 `#0004`、`#00BFFF18`）→ 面板用「颜色 + α 数字轮(0-100)」组合行，apply 时合成 8 位 hex；α=0 → `"transparent"`（模式已在 editingLayerNodes 上验证）。
3. 尺寸/宽度 → number-wheel（min/max/step/default）；布尔 → checkbox；每行带 reset。
4. 面板卡片用现有 `nodeAppearanceRow()` / `grouped-settings` 机制，不引新控件。

---

## 2. 已上线设置项（现状，共 5 卡 19 键）

| 卡片 | 模型键 | 默认 | 控件 |
|---|---|---|---|
| Theme | `theme` | automatic | radio |
| Node appearance | `nodeSize` | 8 | number-wheel 4-24 |
| | `nodeSmoothColor` | #7A4FE8 | color |
| | `nodeSquircleColor` | #0D9488 | color |
| | `nodeSquircleExponent` | 3 | number-wheel 1-8 步 0.5 |
| | `nodeCornerColor` | #C2410C | color |
| | `nodeHandleColor` | #A0A0B0 | color |
| | `nodeHandleSize` | 6 | number-wheel 3-24 |
| | `nodeHandleShapeDiamond` | false | checkbox |
| | `editingLayerNodesColor` | #BBBBFF | color |
| | `editingLayerNodesAlpha` | 0 | number-wheel 0-100 步 5 |
| Transform selection | `transformHandleFillColor` | #BBBBFF | color |
| | `transformHandleSize` | 8 | number-wheel |
| | `transformBorderColor` | #AAAAAA | color |
| | `transformBorderWidth` | 1 | number-wheel 0.5-6 |
| Start point indicator | `startpointChevronColor` | #989898 | color |
| | `startpointChevronSize` | 1 | number-wheel 0.5-3 |
| Drag crosshair | `crosshairColor` | #888888 | color |
| | `crosshairStrokeWidth` | 1 | number-wheel |
| | `crosshairDashed` | true | checkbox |

受这些设置驱动的图层：`fontra.nodes`、`fontra.selected.nodes`、`fontra.component.nodes`、`fontra.startpoint.indicator`、`fontra.transform.selection`、`fontra.edit.editing.layers.nodes-and-handles`、`fontra.crosshair`。

## 3. 现状勘误（盘点时发现，随本批一起修）

| # | 问题 | 修法 |
|---|---|---|
| E1 | `canvasBackgroundColor`：模型键 + `setupCanvasBackgroundOverride` + editor.js 监听都在，**但面板里没有对应行**（台账 T4.33 称有，现文件无） | Canvas background 卡补一行 color |
| E2 | `selectedHandleColor`：`applyNodeAppearanceSettings` 读取它（`?? "#A0A0B0"`），但**模型无默认键、面板无行** | theme-settings.js 补键 + Node appearance 卡补「Selected handle」行 |

---

## 4. 待新增设置项（按面板卡片分类）

优先级：**P1** = 本轮用户点名的颜色片段；**P2** = 常用、一眼可见；**P3** = 长尾/完整覆盖。
控件列：**C** = color；**C+α** = color + α 轮（默认值带透明度）；**N** = number-wheel；**☑** = checkbox。
「现值 亮/暗」= 图层定义里的 `colors` / `colorsDarkMode`。

### 4.1 画布与网格（Card：Canvas & grid）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| （全局） | 画布背景色 | #FFFFFF（CSS 变量） | `canvasBackgroundColor` ✅键 | C | **E1 补行** |
| `fontra.upm.grid` | UPM 网格线颜色 | #E6E6E6 / #3C3C3C | `upmGridColor` | C | P2 |
| `fontra.upm.grid` | UPM 网格线宽 | 2 | `upmGridStrokeWidth` | N | P3 |

### 4.2 节点与手柄（扩展 Node appearance 卡）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.selected.nodes` | 选中手柄颜色 | （现读 handleColor） | `selectedHandleColor` | C | **E2 补键补行** |
| `fontra.selected.nodes` | 选中节点填充色 | #000 / #FFF | `selectedNodeColor` | C | P2 |
| `fontra.selected.nodes` | 选中节点光晕色 | #FFFA / #0008 | `selectedNodeUnderColor` | C+α | P3 |
| `fontra.handles` | 手柄连线颜色 | #BBB / #777 | `handleLineColor` | C | P2 |
| `fontra.handles` | 手柄连线宽 | 1 | `handleLineStrokeWidth` | N | P3 |
| `fontra.edit.background.layers.nodes-and-handles` | 背景层节点颜色 | #DDDF / #555F | `bgLayerNodesColor` | C+α | P2 |
| 同上 | 背景层节点三尺寸 | 5.5/5.5/4.5 | `bgLayerNodeSize` / `bgLayerHandleSize` | N×2（corner=smooth 共用） | P3 |

> `fontra.component.nodes` 已并入 Node appearance 设置（apply 时三层统一下发），无需新键。

### 4.3 路径颜色（Card：Path —— 本轮用户点名 "#0004"）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.edit.path.stroke` | 主轮廓描边色 | #000 / #FFF | `editPathStrokeColor` | C | **P1** |
| `fontra.edit.path.stroke` | 主轮廓描边宽 | 1 | `editPathStrokeWidth` | N | P2 |
| `fontra.edit.path.under.stroke` | 轮廓底层描边色 | **#FFF6 / #0004** | `editPathUnderStrokeColor` | C+α | **P1** |
| `fontra.edit.path.under.stroke` | 底层描边宽 | 3 | `editPathUnderStrokeWidth` | N | P3 |
| `fontra.edit.path.fill` | 轮廓填充色 | #0001 / #FFF3 | `editPathFillColor` | C+α | P2 |

> 澄清：用户贴的 `strokeColor: "#0004"` 在**亮色模式是 baseline / lineMetrics 的现值**；`fontra.edit.path.under.stroke` 亮色是 `#FFF6`、暗色才是 `#0004`。两处都会做成设置项。

### 4.4 字形填充与高亮（Card：Glyph display）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.context.glyphs` | 上下文字形填充 | #000 / #FFF | `contextGlyphColor` | C | P2 |
| `fontra.context.glyphs` 等 3 层 | 出错字形颜色 | #AAA / #999 | `glyphErrorColor`（三层共用） | C | P3 |
| `fontra.selected.glyph` | 选中字形填充 | #000 / #FFF | `selectedGlyphColor` | C | P2 |
| `fontra.selected.glyph` | 选中字形外描边 | #7778 / #FFF8 | `selectedGlyphOutlineColor` | C+α | P2 |
| `fontra.hovered.glyph` | 悬停字形填充 | #000 / #FFF | `hoveredGlyphColor` | C | P3 |
| `fontra.hovered.glyph` | 悬停字形外描边 | #BBB8 / #CCC8 | `hoveredGlyphOutlineColor` | C+α | P3 |
| `fontra.undefined.glyph` | 未定义字形占位 | #0006 / #FFF6 | `undefinedGlyphColor` | C+α | P3 |
| `fontra.undefined.glyph` | 空（未编辑）字形占位 | #0002 / #FFF2 | `emptyGlyphColor` | C+α | P3 |
| `fontra.empty.selected.glyph` | 空选中字形底色 | #D8D8D8 / #585858 | `emptySelectedGlyphColor` | C | P3 |
| `fontra.empty.hovered.glyph` | 空悬停字形底色 | #E8E8E8 / #484848 | `emptyHoveredGlyphColor` | C | P3 |
| `fontra.all.glyphs`（干净显示） | 全字形填充 | #000 / #FFF | `cleanGlyphColor` | C | P3 |
| selected/hovered.glyph | 内/外描边宽 | 10 / 3 | `glyphOuterStrokeWidth` / `glyphInnerStrokeWidth` | N×2 | P3 |

### 4.5 标签与序号（Card：Labels —— 本轮用户点名 boxColor）

> 五个标签层同构：底色 boxColor + 文字 color + 字号 fontSize。**建议先用共享底/字两键 + 逐层字号**（面板不爆炸）；表里给出逐层键名备选，确认时定夺。

| 图层 | 属性 | 现值 亮/暗 | 建议模型键（共享方案） | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.coordinates` | 坐标标签底色 | #FFFB / #1118 | `labelBoxColor` | C+α | **P1** |
| `fontra.coordinates` | 坐标标签文字色 | #000 / #FFF | `labelTextColor` | C | **P1** |
| `fontra.point.index` | 点序号底/字 | 同上 | （共享） | — | P2 |
| `fontra.contour.index` | 轮廓序号底/字 | 同上 | （共享） | — | P2 |
| `fontra.component.index` | 部件序号底/字 | 同上 | （共享） | — | P2 |
| `fontra.anchor.names` | 锚点名底/字 | 同上 | （共享） | — | P3 |
| 五层各自 | 字号 | 10/10/11/11/10 | `labelFontSizeCoordinates` 等 5 键 | N×5 | P3 |

逐层方案备选键：`coordinatesBoxColor/coordinatesTextColor`、`pointIndexBoxColor/…`、`contourIndexBoxColor/…`、`componentIndexBoxColor/…`、`anchorNamesBoxColor/…`。

### 4.6 参考线（Card：Guidelines —— 本轮用户点名整段颜色）

| 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|
| 字形参考线（常态） | #0006 / #FFF8 | `guidelineColor` | C+α | **P1** |
| 字体参考线 | #00BFFF / #00BFFFC0 | `fontGuidelineColor` | C+α | **P1** |
| 悬停参考线 | #0001 / #FFFFFF18 | `guidelineHoveredColor` | C+α | P2 |
| 选中参考线 | #0002 / #FFF3 | `guidelineSelectedColor` | C+α | P2 |
| 悬停+选中 | #0000002B / #FFF4 | `guidelineHoveredSelectedColor` | C+α | P3 |
| 选中参考线节点 | #000 / #FFF | `guidelineNodeSelectedColor` | C | P2 |
| 悬停参考线节点 | #BBB | `guidelineNodeHoveredColor` | C | P3 |
| 节点光晕 | #FFFA / #0008 | `guidelineNodeUnderColor` | C+α | P3 |
| 锁图标补色×2 | #F6F6F6/#333、#0006/#BBB | `guidelineIconUnderColor` / `guidelineIconHoveredColor` | C×2 | P3 |
| 线宽 | 1 | `guidelineStrokeWidth` | N | P2 |
| 字号 / 端点圆半径 / 虚线段 | 10 / 4 / 3 | `guidelineFontSize` / `guidelineMarkerRadius` / `guidelineDash` | N×3 | P3 |

### 4.7 度量线（Card：Metrics —— 本轮用户点名 zoneColor）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.baseline` | 基线颜色 | #0004 / #FFF6 | `baselineColor` | C+α | **P1** |
| `fontra.lineMetrics` | 度量线/字框颜色 | #0004 / #FFF6 | `lineMetricsColor` | C+α | **P1** |
| `fontra.lineMetrics` | 对齐区域填充 | #00BFFF18 | `lineMetricsZoneColor` | C+α | **P1** |
| `fontra.lineMetrics` | 区域端线颜色 | #00608018 / #80DFFF18 | `lineMetricsZoneStrokeColor` | C+α | P2 |
| 两层各自 | 线宽 | 1 | `baselineStrokeWidth` / `lineMetricsStrokeWidth` | N×2 | P3 |

### 4.8 锚点（Card：Anchors）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.anchors` | 锚点圈颜色 | #999 | `anchorColor` | C | P2 |
| `fontra.anchors` | 锚点圈半径 | 4 | `anchorMarkerRadius` | N | P3 |
| `fontra.selected.anchors` | 悬停锚点圈 | #BBB | `anchorHoveredColor` | C | P3 |
| `fontra.selected.anchors` | 选中锚点填充 | #000 / #FFF | `anchorSelectedColor` | C | P3 |
| `fontra.selected.anchors` | 选中锚点光晕 | #FFFA / #0008 | `anchorUnderColor` | C+α | P3 |

### 4.9 部件（Card：Components）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.component.selection` | 悬停部件描边 | #CCC / #666 | `componentHoveredColor` | C | P2 |
| `fontra.component.selection` | 选中部件描边 | #888 / #AAA | `componentSelectedColor` | C | P2 |
| `fontra.component.selection` | 部件原点十字 | #BBB | `componentOriginColor` | C | P3 |
| `fontra.component.selection` | 变换中心标记 | #777 / #DDD | `componentTCenterColor` | C | P3 |

### 4.10 多层轮廓（Card：Layer outlines）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.edit.background.layers` | 背景层轮廓 | #CCCF / #666F | `bgLayerOutlineColor` | C+α | P2 |
| `fontra.edit.background.layers` | 背景层锚点圈 | #DDDF / #555F | `bgLayerAnchorColor` | C+α | P3 |
| `fontra.edit.editing.layers` | 编辑层（其他 layer）轮廓 | #99FF / #559F | `editingLayerOutlineColor` | C+α | P2 |
| `fontra.edit.editing.layers` | 编辑层锚点圈 | #AAFF / #558F | `editingLayerAnchorColor` | C+α | P3 |

### 4.11 交互辅助（Card：Interaction aids）

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.ghostpath` | 拖拽幽灵路径 | #AAA6 / #8886 | `ghostPathColor` | C+α | P2 |
| `fontra.connect-insert.point` | 连接/插入提示 | #3080FF80 / #50A0FF80 | `connectInsertColor` | C+α | P3 |
| `fontra.background-image` | 背景图边框（选中） | #888 / #FFF | `backgroundImageColor` | C | P3 |
| `fontra.background-image` | 背景图边框（悬停） | #8885 / #FFF5 | `backgroundImageHoverColor` | C+α | P3 |
| `fontra.glyph.locking` + `.non-editing` | 锁图标颜色 | #000C / #FFFC | `lockIconColor`（两层共用） | C | P3 |

### 4.12 工具图层（Card：Tools）

> 六个工具自有图层，同样走 apply*Settings + keyListeners 模式（它们都在 visualizationLayerDefinitions 数组里，机制无差别）。kerning / sidebearings 各有孪生 identifier，共用同一组键。

| 图层 | 属性 | 现值 亮/暗 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|---|
| `fontra.power.ruler` | 标尺线颜色 | #0004 / #FFF6 | `powerRulerStrokeColor` | C+α | P2 |
| 同上 | 距离框内底色 | #FFFB / #444B | `powerRulerInsideBlobColor` | C+α | P2 |
| 同上 | 距离框内文字色 | #000B / #FFFB | `powerRulerInsideTextColor` | C+α | P3 |
| 同上 | 距离框外底色 | #000B / #FFFB | `powerRulerOutsideBlobColor` | C+α | P3 |
| 同上 | 距离框外文字色 | #FFFB / #444B | `powerRulerOutsideTextColor` | C+α | P3 |
| 同上 | 曲线交点色 | #F085 / #F696 | `powerRulerIntersectionColor` | C+α | P2 |
| 同上 | 线宽 / 字号 / 交点半径 | 1 / 12 / 4 | `powerRulerStrokeWidth` / `powerRulerFontSize` / `powerRulerIntersectionRadius` | N×3 | P3 |
| `fontra.knifetool.line` | 切割线颜色 | #1118 / #FFFB | `knifeLineColor` | C+α | P2 |
| 同上 | 切割交点圆色 | #3080FF80 / #50A0FF80 | `knifeNodeColor` | C+α | P3 |
| 同上 | 线宽 / 交点圆尺寸 | 1 / 10 | `knifeStrokeWidth` / `knifeNodeSize` | N×2 | P3 |
| `fontra.sidebearings.*`（3 个孪生层共用） | 边距线颜色 | #0004 / #FFF6 | `sidebearingColor` | C+α | P2 |
| 同上 | 线宽 / 伸缩长度 | 1 / 16 | `sidebearingStrokeWidth` / `sidebearingExtent` | N×2 | P3 |
| `fontra.kerning-indicators.*`（2 个孪生层共用） | 负字距色带 | #F1175933 / #FF336655 | `kernNegativeColor` | C+α | P3 |
| 同上 | 正字距色带 | #1759F133 / #3366FF55 | `kernPositiveColor` | C+α | P3 |
| `fontra.cjk.design.frame` | 设计框线色 | #0004 / #FFF6 | `cjkFrameStrokeColor` | C+α | P3 |
| 同上 | 出血区（overshoot）色 | #00BFFF26 | `cjkFrameOvershootColor` | C+α | P3 |
| 同上 | 第二线色 | #A6296344 / #A62963AA | `cjkFrameSecondLineColor` | C+α | P3 |
| 同上 | 线宽 | 1 | `cjkFrameStrokeWidth` | N | P3 |
| `fontra.shapetool.shape` | 形状预览填充 | #FFFB / #1118 | `shapeToolFillColor` | C+α | P3 |
| 同上 | 形状预览描边 | #000 / #FFF | `shapeToolStrokeColor` | C | P3 |
| 同上 | 线宽 | 1 | `shapeToolStrokeWidth` | N | P3 |
| `fontra.reference.font` | 参考字体填充 | #AAA6 | `referenceFontColor` | C+α | P2 |
| 同上 | 参考字体描边宽 | 1 | `referenceFontStrokeWidth` | N | P3 |

### 4.13 状态色条（Card：Status bar —— `fontra.status.color`）

| 属性 | 现值 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|
| 色条最小厚度 | 3 | `statusBarMinThickness` | N | P3 |
| 色条最大厚度 | 15 | `statusBarMaxThickness` | N | P3 |
| 编辑态不透明度 | 40%（draw 里硬编码 ×0.4） | `statusBarEditingOpacity` | N 0-100 | P3 |

> 颜色本体来自字体 customData（`fontra.sourceStatusFieldDefinitions`，每个状态一个颜色）——属于**项目数据**，全局覆盖会破坏"按状态区分颜色"这个功能本身。这是功能约束，不是遗漏；以上 3 项外观参数全部可设。

### 4.14 框选矩形（Card：Rect select —— `fontra.rect.select`）⚠ 需改 draw

| 属性 | 现值 | 建议模型键 | 控件 | 优先级 |
|---|---|---|---|---|
| 实线颜色（内层） | #000（硬编码） | `rectSelectSolidColor` | C | P3 |
| 虚线颜色（外层） | #FFF（硬编码） | `rectSelectDashColor` | C | P3 |
| 线宽 | 1 | `rectSelectStrokeWidth` | N | P3 |
| 虚线段长 | 10 | `rectSelectDashLength` | N | P3 |

> "⚠ 需改 draw"的含义：这个图层的黑白两色没有像其他图层那样放在 colors 表里，而是写死在 draw 函数代码里（`context.strokeStyle = "#000"` / `"#FFF"`）。接入设置管道前必须先做一个 ~10 行的小改动：把两个颜色挪进 colors 表、draw 改为读 `parameters`。改完即与普通图层无异。

### 4.15 微调尺寸（Card：Fine tuning —— 长尾 screenParameters，全部 P3）

| 图层 | 参数 | 现值 | 建议模型键 |
|---|---|---|---|
| `fontra.guidelines` | 文字边距 margin | 5 | `guidelineMargin` |
| 同上 | 锁图标尺寸 iconSize | 12 | `guidelineIconSize` |
| 同上 | 参考线节点尺寸 smoothSize | 8 | `guidelineNodeSize` |
| 同上 | 悬停外扩 hoverStrokeOffset | 4 | `guidelineHoverStrokeOffset` |
| 同上 | 光晕外扩 underlayOffset | 2 | `guidelineUnderlayOffset` |
| `fontra.selected.anchors` | 锚点尺寸 smoothSize | 8 | `anchorSelectedSize` |
| 同上 | 线宽 / 悬停外扩 / 光晕外扩 | 1 / 4 / 2 | `anchorSelectedStrokeWidth` / `anchorHoverStrokeOffset` / `anchorUnderlayOffset` |
| `fontra.selected.nodes` | 悬停外扩 / 光晕外扩 | 4 / 2 | `nodeHoverStrokeOffset` / `nodeUnderlayOffset` |
| `fontra.component.selection` | 悬停/选中描边宽 | 3 / 3 | `componentHoverStrokeWidth` / `componentSelectedStrokeWidth` |
| 同上 | 原点/中心标记线宽 | 1 / 2 | `componentOriginMarkerStrokeWidth` / `componentOriginMarkerSelectedStrokeWidth` |
| 同上 | 标记半臂长 / 圆半径 | 10 / 4 | `componentOriginMarkerSize` / `componentOriginMarkerRadius` |
| `fontra.connect-insert.point` | 连接半径 / 插入手柄半径 | 11 / 5 | `connectInsertRadius` / `connectInsertHandlesRadius` |
| 同上 | 删除指示臂长 / 可拖指示半径 / 线宽 | 7 / 9 / 2 | `connectInsertDeleteIndicatorLength` / `connectInsertDragIndicatorRadius` / `connectInsertStrokeWidth` |
| `fontra.glyph.locking` ×2 | 锁图标尺寸 | 19 | `lockIconSize` |
| `fontra.background-image` | 边框线宽 | 2 | `backgroundImageStrokeWidth` |
| `fontra.edit.background.layers` | 轮廓线宽 / 锚点圈半径 | 1 / 4 | `bgLayerOutlineStrokeWidth` / `bgLayerAnchorRadius` |
| `fontra.edit.editing.layers` | 轮廓线宽 / 锚点圈半径 | 1 / 4 | `editingLayerOutlineStrokeWidth` / `editingLayerAnchorRadius` |
| `fontra.anchor.names` | 顶部边距 | 6 | `anchorNamesMarginFromTop` |
| `fontra.startpoint.indicator` | 箭头与节点间隙 gap | 5 | `startpointChevronGap`（设计上刻意恒定、不随节点尺寸缩放——可调，默认保持） |
| 同上 | 箭头线宽 | 2 | `startpointChevronStrokeWidth` |
| `fontra.crosshair` | 虚线段长（[4,4]） | 4 | `crosshairDashLength` |

---

## 5. 排除项（更新：无）

按用户要求**全量纳入，不再有排除项**。原拟"暂不做"的四类的处理方式：

| 原拟排除项 | 处理 |
|---|---|
| `fontra.status.color` 状态色条 | 3 项外观参数做成设置（§4.13）；颜色本体来自字体 customData，属项目数据，全局覆盖会破坏功能本身——功能约束，非遗漏 |
| `fontra.rect.select` 框选矩形 | 改 draw 读 colors（~10 行）后全量接入，4 项（§4.14） |
| 工具自有图层 | 全部纳入（§4.12）：power ruler 9、刀具 4、边距 3、字距色带 2、CJK 框 4、形状 3、参考字体 2 |
| 长尾 screenParameters | 全部纳入（§4.15）：33 项微调尺寸 |

---

## 6. 数量与分期

**新增合计：71 个颜色 + 68 个数值 = 139 项**（不含已上线 20 键与 2 项勘误）。

| 期 | 内容 | 规模 |
|---|---|---|
| 第 0 期（勘误） | E1 画布背景补行、E2 selectedHandleColor 补键补行 | 2 项 |
| 第 1 期（P1） | 路径 3 色 + 标签共享 2 色 + 参考线 2 色 + 度量线 4 色（含 baseline） | 10 键 |
| 第 2 期（P2） | §4.1-4.12 的 P2 项（网格/手柄线/选中节点字形/标签/参考线交互/锚点/部件/多层轮廓/工具主色） | 25 键 |
| 第 3 期（P3） | 其余全部颜色 + 全部尺寸/字号（§4.13-4.15 与各表 P3 项，含 rect.select 改码） | 104 键 |

**全部做完的面板规模**：现有 18 行 + 勘误 2 行 + 新增 139 行 ≈ **159 行设置**（模型键约 200，含 40 个 α 伴随键）。
分期只是实现顺序，最终都进同一个设置页；以各表"优先级"列为准。

**每键接线步骤（固定四步）**：
1. `theme-settings.js` 模型加默认键；
2. `visualization-layer-definitions.js` 加/扩展 `apply<Feature>Settings(model)`（同时写 colors + colorsDarkMode；尺寸进 screenParameters）；
3. `editor.js` keyListeners 数组加键名；
4. `panel-theme-settings.js` 对应卡片加行（`nodeAppearanceRow` 或 checkbox），α 色用组合行。

> ~~实现建议：第 1 期起把 4 个 apply 函数收敛为表驱动~~ → **已定为硬性前置**，见 §8 主题架构。

**验证（每期同流程）**：重建 bundle → Ctrl+F5 → Playwright 面板冒烟（行数、默认值、无 pageerror）→ 编辑器冒烟（图层注册、抽样改值即时生效截图）→ `ENGRAM-CHANGES.md` 记台账。

---

## 7. 已确认的决定（2026-10-15）

1. 标签五层用**共享**底色/文字两键（先共享，需要时再拆逐层）。
2. **全量纳入**，包括原 §5 全部项（状态色条 / 框选矩形 / 工具图层 / 长尾尺寸）；分期只为实现顺序。
3. `rect.select` 改 draw（~10 行）后接入设置。
4. 主题能力按**四层架构**执行（明暗切换 → 预设包 → 元素级自定义 → 导入导出），L3 为分水岭必须做全，L4 的地基（token 表）从现在开始搭——见 §8。

---

## 8. 主题架构：四层能力与 token 表

### 8.1 四层现状对照

| 层 | 现状 | 动作 |
|---|---|---|
| 1. 明/暗切换 | 已有（theme radio + light/dark CSS 类 + 图层 colorsDarkMode） | 保留 |
| 2. 预设主题包 | 无 | = token 表的具名快照，表建好后即得 |
| 3. 元素级自定义 | **进行中**（本清单 139 项就是 L3） | 继续实现 |
| 4. 完整主题系统 | 无 | token 表第一天即支持；导入/导出 UI 后做 |

### 8.2 VISUAL_TOKENS 表（单一事实源）

每行 = 一个语义 token（token id 沿用现有 camelCase 模型键，localStorage 兼容，不改名）：

```js
{
  key: "nodeSmoothColor",              // token id = 模型键
  category: "node",                    // 面板卡片
  displayName: "Smooth node",
  control: { ui: "color" },            // color | color-alpha | number | checkbox
  defaultLight: "#7A4FE8",
  defaultDark: "#A78BFA",              // 手工调过的双主题默认，不派生
  apply: { layer: "fontra.nodes", colors: { smoothColor: 1 } },  // 1 = 引用本 token
}
```

全部派生物由表生成，不再手工同步：
- `applyVisualLayerSettings(model)`：遍历表 → 写 layerDef 的 colors / colorsDarkMode / screenParameters / glyphParameters
- editor.js 的 keyListeners 键列表 = 表的 keys
- 设置面板按 category 分卡生成行（nodeAppearanceRow 机制不变）
- 污染迁移的颜色键列表 = 表的颜色 token keys
- L4 导入/导出 = 表的 `{key: value}` JSON 序列化

### 8.3 颜色解析规则（亮暗 + 用户覆盖）

1. **无覆盖**：用手工调的 defaultLight / defaultDark（比公式派生准）。
2. **有覆盖**：亮色主题用覆盖值；暗色主题 = OKLCH 派生——**H、C 保持，L 重映射到对暗画布的目标对比度**。"同一种颜色，只为暗底调了明度"；切换主题时用户的选择不丢失。
   ⚠ 方向勘误：暗底上的**前景**元素（节点/描边）要**提高** L（#7A4FE8 → #A78BFA 正是这个方向），"变暗"的是画布底色本身。
3. **存储始终 sRGB hex**（原生拾色器）；OKLCH 只用于内部派生（hex→OKLCH→hex 纯函数模块，~100 行，无 UI）——不复活 OKLCH 拾色器。
4. 数值 / 布尔 token 双主题共用，无派生。
5. 带 α 的 token = 色 + α 两键；派生只动 RGB 的 L，α 原样保留。

### 8.4 预设包（L2，已实现）

- **内置四套**：High contrast / Low noise (muted) / Warm paper / Cool paper
  （全色键快照，尺寸保留用户值），`theme-presets.js` + `registerThemePreset()`。
- **自定义预设**（面板 Preset 卡）：Save as new（快照当前全部 token 值，命名）/
  Rename / Delete（存 `themeCustomPresets` 模型键，JSON 持久化 + 跨标签同步）/
  **Restore defaults**（全 token 回出厂默认，保留明暗模式偏好）。
- **发布前质检**：三层 WCAG 矩阵（Tier A 主标记 ≥3:1 / Tier B 次要注释 ≥1.5 /
  Tier C 刻意淡雅仅报告）+ 节点四色 ΔE —— `test-preset-contrast.mjs`。

### 8.5 两个专业坑的落点

- **极值点对比**：节点类型已是形状编码（眼/方/超椭圆/菱形），不单靠颜色 ✓；预设质检矩阵兜底。
- **主题 vs 文档数据**：`status.color` 颜色本体来自字体 customData（§4.13 已标），不入主题；画布轮廓/预览色是"预览墨色"（可主题化），不是文档数据 ✓。UI chrome（侧栏/工具栏）不在此轮范围。

### 8.6 实施顺序（R4-T4.40 起执行）

1. ✅ **token 表重构**（R4-T4.38）：`fontra-core/src/visual-tokens.js`（token 表）+
   `visualization-layer-definitions.js` 的表驱动 `applyVisualTokenSettings()`（懒初始化
   pristine 快照 + 触碰层从 pristine 重放）；模型默认值、污染迁移颜色键、editor.js
   监听、面板卡片全部由表派生；4 个旧 apply 函数删除。
2. ✅ **OKLCH 派生模块**（R4-T4.38）：`fontra-core/src/color-derive.js`——翻边规则
   （暗底取反侧：黑墨→白），亮度解析解 + L 二分 + 色域 chroma 收缩；单元测试
   `qa/node-icons/test-color-derive.mjs`（紫 #7A4FE8 → #a996ff，与手调参考
   #A78BFA 同族验证）。
3. ✅ **第 1 期 P1**（R4-T4.38）：10 token 进表（路径 3、标签 2、参考线 2、度量线 3）。
4. ✅ **L4 主题包导入导出**（R4-T4.38，提前）：面板 Theme packs 卡。
5. ✅ **Schema + token 目录 + 注册 API**（R4-T4.39）：schema/目录由表生成
   （scripts/dump-visual-tokens.mjs → docs/schemas/）；导入校验同源；架构定案
   "引擎内置 + 注册 API"（§8.8）。
6. ✅ **第 2 期 P2**（R4-T4.40）：25 token 进表（UPM 网格/选中节点/手柄线/背景层
   节点/字形显示 3/轮廓线宽/参考线交互 4/区域端线/锚点/部件 2/多层轮廓 2/幽灵
   路径/工具 6），新增 6 分类；4 位 hex nibble 审计修正（#DDDF 类实为不透明）。
   现状：**59 token / 面板 61 行 / schema 79 键**。
7. ✅ **L2 预设包**（R4-T4.41）：四套内置预设（High contrast / Low noise / Warm
   paper / Cool paper，全色键快照、尺寸保留用户值）+ 面板 Preset 下拉 +
   **三层 WCAG 质检矩阵**（Tier A 主标记 ≥3:1 / Tier B 次要注释 ≥1.5 / Tier C
   刻意淡雅仅报告；框选查 dash↔solid 对、标签查 text↔box 对；节点四色 ΔE 报告）——
   `qa/node-icons/test-preset-contrast.mjs`，5 套 × 46 检查全过。
8. ✅ **第 3 期 P3**（R4-T4.42）：72 token（长尾颜色 25 + 全部尺寸/字号 47，
   含状态色条 3 项与 clean-display 特例图层支持）。

**最终状态：131 token / 面板 134 行 / schema 162 键，全部图层覆盖率 100%，
四层架构 L1-L4 全部落地。**（清单原估 139 项，实际 131 —— 部分合并与命名去重；
squircle 指数设置已于 R4-T4.45 移除，固定 n=3。）

### 8.7 主题包文件格式（L4，已实现；JSON + JSON Schema）

**格式：JSON**（`.engramfont-theme.json`，`format: "engramfont-theme"`，`version: 1`）。

```json
{
  "format": "engramfont-theme",
  "version": 1,
  "name": "My Theme",
  "values": { "nodeSmoothColor": "#7A4FE8", "editingLayerNodesAlpha": 0, "...": "..." }
}
```

**Schema 从 token 表生成，不手写**（防漂移）：
- `buildThemePackSchema()`（visual-tokens.js）→ JSON Schema draft 2020-12：
  `values.additionalProperties: false`、每键按 token 类型给出
  type/pattern（hex 3/4/6/8 位）/minimum/maximum/default，附 `x-category`、
  `x-dark-default`、`x-alpha-key` 等扩展元数据
- `buildTokenCatalog()` → **token 目录**（34 token：类型/分类/双主题默认值/
  控件范围/形状/应用图层清单）——"token 呢"的答案：目录即 token 的 schema 化清单
- 快照：`docs/schemas/engramfont-theme-pack.schema.json` +
  `docs/schemas/visual-tokens.catalog.json`，由 `node scripts/dump-visual-tokens.mjs`
  再生成（改表后必跑）
- 导入校验 `validateThemePack()`（与 schema 同源生成）：容器错误（format/version/
  values 缺失）→ 拒绝；未知键（新版包在旧版上）与坏值键 → **跳过并报告**，
  其余照常应用——前向兼容策略：部分应用 + 明细提示

### 8.8 内置 vs 插件（架构决定，2026-10-15）

**结论：引擎内置，表开放注册，内容（主题包/预设）天然是数据。**

依据（Fontra 实际插件面，`docs/plugin-structure.md` + `src/fontra/core/server.py`）：
entry-points 四类——projectmanagers / **views** / filesystem.backends / **webcontent**，
全是"整页级"扩展（新视图、项目管理器、存储后端、静态文件）。源码证实：
webcontent 仅注册静态路由 `/{name}/{path}`（server.py L64-74），核心视图 HTML
**没有任何插件脚本加载点**；views 只在 serverInfo 里列名字（L230-232）。
即：第三方 JS 今天根本进不了编辑器视图。而主题引擎必须：
1. 在任何图层绘制前生效（buildLayers 的 colors/screenParameters 合并）；
2. 在模型物化前完成 localStorage 迁移（时序）；
3. 被所有画布视图共用；
4. 插件禁用/损坏时画布照常工作（核心功能不依赖可选件）。

→ 引擎（token 表解析、applier、OKLCH 派生、schema、迁移）**内置 fontra-core**。
→ 扩展点 = **注册 API**（与 `registerVisualizationLayerDefinition` 同构的第二个
  注册表），已实现：
  - `registerVisualTokens(tokens, {category})`：追加 token 行（键去重）；
    keys/迁移键/schema/面板行经 live binding 自动更新；
  - `registerTokenCategory(id, displayName)`：新增面板卡片；
  - `onVisualTokensRegistered(listener)`：theme-settings 订阅后把新 token 默认值
    物化进模型（免刷新）。
  我们自己的后续批次（P2/P3 工具图层色、L2 预设）就是第一批注册者——API 由
  内部使用先行验证；第三方等 Fontra 插件机制进化出"核心视图注入"能力后，
  经 webcontent JS + 约定加载协议即可接入（注册 API 是纯函数调用，无需新协议）。
→ L4 的"内容"（`.engramfont-theme.json` 主题包、预设快照）是**数据文件**，
  天然插件式分发，无需代码级 API。
