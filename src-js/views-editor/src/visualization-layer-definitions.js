import { guessGlyphPlaceholderString } from "@fontra/core/glyph-data.js";
import { deriveDarkColor, normalizeHex6 } from "@fontra/core/color-derive.js";
import {
  VISUAL_TOKENS,
  alphaKeyOf,
  clampAlpha,
  composeAlphaColor,
} from "@fontra/core/visual-tokens.js";
import { translate } from "@fontra/core/localization.js";
import { rectToPoints } from "@fontra/core/rectangle.ts";
import { difference, isSuperset, union } from "@fontra/core/set-ops.js";
import { deriveSquircleTransitions } from "@fontra/core/squircle-transition.js";
import { decomposedToTransform } from "@fontra/core/transform.js";
import {
  chain,
  clamp,
  enumerate,
  makeUPlusStringFromCodePoint,
  parseSelection,
  rgbaToCSS,
  round,
  unionIndexSets,
  withSavedState,
} from "@fontra/core/utils.ts";
import { subVectors } from "@fontra/core/vector.js";
import { isProofMode } from "./canvas-mode.js";

// Default exponent of the squircle node icon (|x/a|^n + |y/b|^n = 1):
// n = 1 diamond, 2 circle, 3 rounded square, higher = squarer.
// FIXED at n = 3 (the designed rounded-square look); it reaches the layers
// via glyphParameters, which are deliberately NOT scaled by the zoom factor.
const SQUIRCLE_EXPONENT_DEFAULT = 3;

export const visualizationLayerDefinitions = [];

export function registerVisualizationLayerDefinition(newLayerDef) {
  let index = 0;
  let layerDef;
  for (index = 0; index < visualizationLayerDefinitions.length; index++) {
    layerDef = visualizationLayerDefinitions[index];
    if (newLayerDef.zIndex < layerDef.zIndex) {
      break;
    }
  }
  visualizationLayerDefinitions.splice(index, 0, newLayerDef);
}

export function glyphSelector(selectionMode) {
  return (visContext, layer) => {
    const glyphs = visContext.glyphsBySelectionMode[selectionMode] || [];
    return layer.selectionFilter ? glyphs.filter(layer.selectionFilter) : glyphs;
  };
}

registerVisualizationLayerDefinition({
  identifier: "fontra.upm.grid",
  name: "sidebar.user-settings.glyph.upmgrid",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 0,
  dontTranslate: true,
  screenParameters: { strokeWidth: 2 },
  // Light theme draws on a pure-white canvas now (--background-color-light:
  // #fff), so the grid lines must be a hair darker than the canvas to stay
  // visible (white-on-white would vanish); dark keeps its lighter-on-#333.
  colors: { strokeColor: "#E6E6E6" },
  colorsDarkMode: { strokeColor: "#3C3C3C" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    if (controller.magnification < 4) {
      return;
    }
    context.strokeStyle = parameters.strokeColor;
    context.lineWidth = parameters.strokeWidth;
    let { xMin, yMin, xMax, yMax } = controller.getViewBox();
    xMin -= positionedGlyph.x;
    xMax -= positionedGlyph.x;
    yMin -= positionedGlyph.y;
    yMax -= positionedGlyph.y;
    for (let x = Math.floor(xMin); x < Math.ceil(xMax); x++) {
      strokeLine(context, x, yMin, x, yMax);
    }
    for (let y = Math.floor(yMin); y < Math.ceil(yMax); y++) {
      strokeLine(context, xMin, y, xMax, y);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.empty.selected.glyph",
  name: "Empty selected glyph",
  selectionFunc: glyphSelector("selected"),
  selectionFilter: (positionedGlyph) => positionedGlyph.isEmpty,
  zIndex: 50,
  colors: { fillColor: "#D8D8D8" /* Must be six hex digits */ },
  colorsDarkMode: { fillColor: "#585858" /* Must be six hex digits */ },
  draw: _drawEmptyGlyphLayer,
});

registerVisualizationLayerDefinition({
  identifier: "fontra.empty.hovered.glyph",
  name: "Empty hovered glyph",
  selectionFunc: glyphSelector("hovered"),
  selectionFilter: (positionedGlyph) => positionedGlyph.isEmpty,
  zIndex: 50,
  colors: { fillColor: "#E8E8E8" /* Must be six hex digits */ },
  colorsDarkMode: { fillColor: "#484848" /* Must be six hex digits */ },
  draw: _drawEmptyGlyphLayer,
});

function _drawEmptyGlyphLayer({
  context,
  positionedGlyph,
  parameters,
  model,
  controller,
}) {
  const box = positionedGlyph.unpositionedBounds;
  const fillColor = parameters.fillColor;
  if (fillColor[0] === "#" && fillColor.length === 7) {
    const gradient = context.createLinearGradient(0, box.yMin, 0, box.yMax);
    gradient.addColorStop(0.0, fillColor + "00");
    gradient.addColorStop(0.2, fillColor + "DD");
    gradient.addColorStop(0.5, fillColor + "FF");
    gradient.addColorStop(0.8, fillColor + "DD");
    gradient.addColorStop(1.0, fillColor + "00");
    context.fillStyle = gradient;
  } else {
    context.fillStyle = fillColor;
  }
  context.fillRect(box.xMin, box.yMin, box.xMax - box.xMin, box.yMax - box.yMin);
}

registerVisualizationLayerDefinition({
  identifier: "fontra.context.glyphs",
  name: "Context glyphs",
  selectionFunc: glyphSelector("unselected"),
  zIndex: 200,
  colors: { fillColor: "#000", errorColor: "#AAA" },
  colorsDarkMode: { fillColor: "#FFF", errorColor: "#999" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.fillStyle = positionedGlyph.glyph.errors?.length
      ? parameters.errorColor
      : parameters.fillColor;
    context.fill(positionedGlyph.glyph.flattenedPath2d);
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.undefined.glyph",
  name: "Undefined glyph",
  selectionFunc: glyphSelector("all"),
  selectionFilter: (positionedGlyph) =>
    positionedGlyph.isUndefined ||
    (positionedGlyph.isEmpty && !positionedGlyph.isEditing),
  zIndex: 500,
  colors: {
    fillColor: "#0006",
    emptyFillColor: "#0002",
  },
  colorsDarkMode: {
    fillColor: "#FFF6",
    emptyFillColor: "#FFF2",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.fillStyle = positionedGlyph.isUndefined
      ? parameters.fillColor
      : parameters.emptyFillColor;
    context.textAlign = "center";
    const lineDistance = 1.2;

    const glyphNameFontSize = 0.1 * positionedGlyph.glyph.xAdvance;
    const placeholderFontSize = 0.75 * positionedGlyph.glyph.xAdvance;

    context.scale(1, -1);

    if (positionedGlyph.isUndefined) {
      context.font = `${glyphNameFontSize}px engramfont-ui-regular, sans-serif`;
      context.fillText(
        positionedGlyph.glyphName,
        positionedGlyph.glyph.xAdvance / 2,
        0
      );
      if (positionedGlyph.character) {
        const uniStr = makeUPlusStringFromCodePoint(
          positionedGlyph.character.codePointAt(0)
        );
        context.fillText(
          uniStr,
          positionedGlyph.glyph.xAdvance / 2,
          -lineDistance * glyphNameFontSize
        );
      }
    }

    const codePoint = positionedGlyph.character?.codePointAt(0);
    const { glyphString, direction } = guessGlyphPlaceholderString(
      codePoint ? [codePoint] : [],
      positionedGlyph.glyphName
    );
    if (glyphString) {
      context.font = `${placeholderFontSize}px engramfont-ui-regular, sans-serif`;
      context.direction = direction || context.direction;
      context.fillText(
        glyphString,
        positionedGlyph.glyph.xAdvance / 2,
        -lineDistance * glyphNameFontSize - 0.4 * placeholderFontSize
      );
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.baseline",
  name: "sidebar.user-settings.glyph.baseline",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { strokeColor: "#0004" },
  colorsDarkMode: { strokeColor: "#FFF6" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.strokeStyle = parameters.strokeColor;
    context.lineWidth = parameters.strokeWidth;
    strokeLine(context, 0, 0, positionedGlyph.glyph.xAdvance, 0);
  },
});

// proof mode: draw the metrics band once per line, spanning the full line;
// edit mode: per selected/editing glyph (original behavior)
function lineMetricsSelectionFunc(visContext, layer) {
  if (isProofMode()) {
    return (visContext.glyphsBySelectionMode["all"] || []).filter(
      (glyph) => glyph.glyphIndexInLine === 0
    );
  }
  return glyphSelector("editing")(visContext, layer);
}

registerVisualizationLayerDefinition({
  identifier: "fontra.lineMetrics",
  name: "sidebar.user-settings.line-metrics",
  selectionFunc: lineMetricsSelectionFunc,
  userSwitchable: true,
  defaultOn: true,
  zIndex: 100,
  screenParameters: { strokeWidth: 1 },
  colors: {
    strokeColor: "#0004",
    zoneColor: "#00BFFF18",
    zoneStrokeColor: "#00608018",
  },
  colorsDarkMode: {
    strokeColor: "#FFF6",
    zoneColor: "#00BFFF18",
    zoneStrokeColor: "#80DFFF18",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.lineWidth = parameters.strokeWidth;

    if (!model.fontSourceInstance) {
      return;
    }
    const lineMetrics = model.fontSourceInstance.lineMetricsHorizontalLayout;

    if (isProofMode()) {
      // full-line metrics band: from this (first) glyph's origin across the
      // whole line advance
      const line = model.positionedLines[positionedGlyph.lineIndex];
      if (!line) {
        return;
      }
      drawMetricsBand(context, lineMetrics, parameters, line.endPoint.x);
      return;
    }

    const glyphWidth = positionedGlyph.glyph.xAdvance
      ? positionedGlyph.glyph.xAdvance
      : 0;
    drawMetricsBand(context, lineMetrics, parameters, glyphWidth);

    // glyph box
    const pathBox = new Path2D();
    if (lineMetrics.ascender && lineMetrics.descender) {
      pathBox.rect(
        0,
        lineMetrics.descender.value,
        positionedGlyph.glyph.xAdvance,
        lineMetrics.ascender.value - lineMetrics.descender.value
      );
    }

    // collect paths: vertical metrics and alignment zones
    const zoneFillPaths = [];
    const zoneEndStrokes = new Path2D();
    for (const [key, metric] of Object.entries(lineMetrics)) {
      if (metric.zone) {
        const pathZone = new Path2D();
        pathZone.rect(0, metric.value, glyphWidth, metric.zone);
        zoneFillPaths.push(pathZone);
        const zoneY = metric.value + metric.zone;
        zoneEndStrokes.moveTo(0, zoneY);
        zoneEndStrokes.lineTo(glyphWidth, zoneY);
      }

      const pathMetric = new Path2D();
      pathMetric.moveTo(0, metric.value);
      pathMetric.lineTo(glyphWidth, metric.value);
      pathBox.addPath(pathMetric);
    }

    // draw zones (with filled path)
    context.fillStyle = parameters.zoneColor;
    zoneFillPaths.forEach((zonePath) => context.fill(zonePath));

    // draw zone top/bottom terminating stroke
    context.strokeStyle = parameters.zoneStrokeColor;
    context.stroke(zoneEndStrokes);

    // draw glyph box + vertical metrics (with stroke path)
    context.strokeStyle = parameters.strokeColor;
    context.stroke(pathBox);
  },
});

function drawMetricsBand(context, lineMetrics, parameters, width) {
    context.lineWidth = parameters.strokeWidth;

    // glyph box
    const pathBox = new Path2D();
    if (lineMetrics.ascender && lineMetrics.descender) {
      pathBox.rect(
        0,
        lineMetrics.descender.value,
        width,
        lineMetrics.ascender.value - lineMetrics.descender.value
      );
    }

    // collect paths: vertical metrics and alignment zones
    const zoneFillPaths = [];
    const zoneEndStrokes = new Path2D();
    for (const [key, metric] of Object.entries(lineMetrics)) {
      if (metric.zone) {
        const pathZone = new Path2D();
        pathZone.rect(0, metric.value, width, metric.zone);
        zoneFillPaths.push(pathZone);
        const zoneY = metric.value + metric.zone;
        zoneEndStrokes.moveTo(0, zoneY);
        zoneEndStrokes.lineTo(width, zoneY);
      }

      const pathMetric = new Path2D();
      pathMetric.moveTo(0, metric.value);
      pathMetric.lineTo(width, metric.value);
      pathBox.addPath(pathMetric);
    }

    // draw zones (with filled path)
    context.fillStyle = parameters.zoneColor;
    zoneFillPaths.forEach((zonePath) => context.fill(zonePath));

    // draw zone top/bottom terminating stroke
    context.strokeStyle = parameters.zoneStrokeColor;
    context.stroke(zoneEndStrokes);

    // draw glyph box + vertical metrics (with stroke path)
    context.strokeStyle = parameters.strokeColor;
    context.stroke(pathBox);
}

// the following icon SVG path code is from https://tabler.io/icons/icon/lock
const lockIconPath2D = new Path2D(
  `M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z
  M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4`
);

registerVisualizationLayerDefinition({
  identifier: "fontra.glyph.locking",
  name: "Glyph locking",
  selectionFunc: glyphSelector("editing"),
  zIndex: 700,
  screenParameters: { iconSize: 19 },
  colors: { strokeColor: "#000C" },
  colorsDarkMode: { strokeColor: "#FFFC" },
  draw: _drawGlyphLockIcon,
});

registerVisualizationLayerDefinition({
  identifier: "fontra.glyph.locking.non-editing",
  name: "sidebar.user-settings.glyph.lockicon",
  selectionFunc: glyphSelector("notediting"),
  userSwitchable: true,
  zIndex: 700,
  screenParameters: { iconSize: 19 },
  colors: { strokeColor: "#000C" },
  colorsDarkMode: { strokeColor: "#FFFC" },
  selectionFilter: (positionedGlyph) => !positionedGlyph.isUndefined,
  draw: _drawGlyphLockIcon,
});

function _drawGlyphLockIcon({
  context,
  positionedGlyph,
  parameters,
  model,
  controller,
}) {
  if (
    !!positionedGlyph.varGlyph?.glyph.customData["fontra.glyph.locked"] ||
    model.fontController.readOnly
  ) {
    const boundsYMin = positionedGlyph.glyph.controlBounds?.yMin || 0;
    _drawLockIcon(
      context,
      positionedGlyph.glyph.xAdvance / 2 - parameters.iconSize / 2,
      boundsYMin - 24,
      parameters.strokeColor,
      parameters.iconSize
    );
  }
}

registerVisualizationLayerDefinition({
  identifier: "fontra.anchors",
  name: "Anchors",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    strokeWidth: 1,
    originMarkerRadius: 4,
  },
  colors: { strokeColor: "#999" },
  colorsDarkMode: { strokeColor: "#999" },

  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.strokeStyle = parameters.strokeColor;
    context.lineWidth = parameters.strokeWidth;
    for (const anchor of positionedGlyph.glyph.anchors) {
      strokeCircle(context, anchor.x, anchor.y, parameters.originMarkerRadius);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.selected.anchors",
  name: "Selected anchors",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    smoothSize: 8,
    strokeWidth: 1,
    hoverStrokeOffset: 4,
    underlayOffset: 2,
  },
  colors: { hoveredColor: "#BBB", selectedColor: "#000", underColor: "#FFFA" },
  colorsDarkMode: { hoveredColor: "#BBB", selectedColor: "#FFF", underColor: "#0008" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const smoothSize = parameters.smoothSize;

    const { anchor: hoveredAnchorIndices } = parseSelection(model.hoverSelection);
    const { anchor: selectedAnchorIndices } = parseSelection(model.selection);

    // Under layer
    context.fillStyle = parameters.underColor;
    for (const anchorIndex of selectedAnchorIndices || []) {
      const anchor = glyph.anchors[anchorIndex];
      if (!anchor) {
        continue;
      }
      fillRoundNode(context, anchor, smoothSize + parameters.underlayOffset);
    }

    // Selected anchor
    context.fillStyle = parameters.selectedColor;
    for (const anchorIndex of selectedAnchorIndices || []) {
      const anchor = glyph.anchors[anchorIndex];
      if (!anchor) {
        continue;
      }
      fillRoundNode(context, anchor, smoothSize);
    }

    // Hovered anchor
    context.strokeStyle = parameters.hoveredColor;
    context.lineWidth = parameters.strokeWidth;
    for (const anchorIndex of hoveredAnchorIndices || []) {
      const anchor = glyph.anchors[anchorIndex];
      if (!anchor) {
        continue;
      }
      strokeRoundNode(context, anchor, smoothSize + parameters.hoverStrokeOffset);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.anchor.names",
  name: "sidebar.user-settings.glyph.anchornames",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 600,
  screenParameters: { fontSize: 10, marginFromTop: 6 },
  colors: { boxColor: "#FFFB", color: "#000" },
  colorsDarkMode: { boxColor: "#1118", color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const fontSize = parameters.fontSize;
    const marginFromTop = parameters.marginFromTop;

    const margin = 0.25 * fontSize;
    const boxHeight = 1.2 * fontSize;

    context.font = `${fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    context.scale(1, -1);

    for (const anchor of positionedGlyph.glyph.anchors) {
      const pt = { x: anchor.x, y: anchor.y };

      const strLine = `${anchor.name}`;
      const width = context.measureText(strLine).width + 2 * margin;

      context.fillStyle = parameters.boxColor;
      drawRoundRect(
        context,
        pt.x - width / 2,
        -pt.y + marginFromTop,
        width,
        boxHeight,
        boxHeight / 4 // corner radius
      );

      context.fillStyle = parameters.color;
      context.fillText(strLine, pt.x, -pt.y + marginFromTop + boxHeight - margin);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.background-image",
  name: "sidebar.user-settings.glyph.background-image",
  selectionFunc: glyphSelector("all"),
  selectionFilter: (positionedGlyph) =>
    positionedGlyph.isEditing || positionedGlyph.isEmpty,
  userSwitchable: true,
  defaultOn: true,
  zIndex: 50,
  screenParameters: {
    strokeWidth: 2,
  },
  colors: { strokeColor: "#888", hoverStrokeColor: "#8885" },
  colorsDarkMode: { strokeColor: "#FFF", hoverStrokeColor: "#FFF5" },

  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const backgroundImage = positionedGlyph.glyph.backgroundImage;
    if (!backgroundImage) {
      return;
    }

    const image = model.fontController.getBackgroundImageColorizedCached(
      backgroundImage.identifier,
      backgroundImage.color
        ? rgbaToCSS([
            backgroundImage.color.red,
            backgroundImage.color.green,
            backgroundImage.color.blue,
          ])
        : null,
      () => controller.requestUpdate()
    );

    if (!image) {
      return;
    }

    const affine = decomposedToTransform(backgroundImage.transformation)
      .translate(0, image.height)
      .scale(1, -1);

    withSavedState(context, () => {
      context.transform(
        affine.xx,
        affine.xy,
        affine.yx,
        affine.yy,
        affine.dx,
        affine.dy
      );
      // if (backgroundImage.color) {
      //   // TODO: solve colorizing with backgroundImage.color
      // }
      context.globalAlpha = backgroundImage.opacity;
      context.drawImage(image, 0, 0, image.width, image.height);
    });

    const backgroundImageBounds = {
      xMin: 0,
      yMin: 0,
      xMax: image.width,
      yMax: image.height,
    };
    const rectPoly = rectToPoints(backgroundImageBounds);
    const polygon = rectPoly.map((point) => affine.transformPointObject(point));

    const isSelected = model.selection.has("backgroundImage/0");
    const isHovered = model.hoverSelection.has("backgroundImage/0");

    if (isSelected || isHovered) {
      context.strokeStyle =
        isHovered && !isSelected ? parameters.hoverStrokeColor : parameters.strokeColor;
      context.lineWidth = parameters.strokeWidth;
      context.lineJoin = "round";
      strokePolygon(context, polygon);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.guidelines",
  name: "sidebar.user-settings.guidelines",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 500,
  screenParameters: {
    fontSize: 10,
    strokeWidth: 1,
    originMarkerRadius: 4,
    strokeDash: 3,
    margin: 5,
    iconSize: 12,
    smoothSize: 8,
    hoverStrokeOffset: 4,
    underlayOffset: 2,
  },
  colors: {
    strokeColor: "#0006",
    hoveredStrokeColor: "#0001",
    selectedStrokeColor: "#0002",
    hoveredSelectedStrokeColor: "#0000002B",
    strokeColorFontGuideline: "#00BFFF",
    hoveredColorIcon: "#0006",
    hoveredColor: "#BBB",
    selectedColor: "#000",
    underColor: "#FFFA",
    underColorIcon: "#F6F6F6",
  },
  colorsDarkMode: {
    strokeColor: "#FFF8",
    hoveredStrokeColor: "#FFFFFF18",
    selectedStrokeColor: "#FFF3",
    hoveredSelectedStrokeColor: "#FFF4",
    strokeColorFontGuideline: "#00BFFFC0",
    hoveredColorIcon: "#BBB",
    hoveredColor: "#BBB",
    selectedColor: "#FFF",
    underColor: "#0008",
    underColorIcon: "#333",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const smoothSize = parameters.smoothSize;

    const hoveredGuidelineIndices =
      parseSelection(model.hoverSelection).guideline ?? [];
    const selectedGuidelineIndices = parseSelection(model.selection).guideline ?? [];

    context.font = `${parameters.fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    const { xMin, yMin, xMax, yMax } = controller.getViewBox();
    parameters.strokeLength = Math.max(
      Math.sqrt((xMax - xMin) ** 2 + (yMax - yMin) ** 2),
      2000
    );

    // Draw glyph guidelines
    for (const [index, guideline] of enumerate(glyph.guidelines)) {
      const isHovered = hoveredGuidelineIndices.includes(index);
      const isSelected = selectedGuidelineIndices.includes(index);

      _drawGuideline(
        context,
        parameters,
        guideline,
        parameters.strokeColor,
        isSelected && isHovered
          ? parameters.hoveredSelectedStrokeColor
          : isSelected
            ? parameters.selectedStrokeColor
            : isHovered
              ? parameters.hoveredStrokeColor
              : null
      );
    }

    // Draw font guidelines
    if (model.fontSourceInstance) {
      for (const guideline of model.fontSourceInstance.guidelines) {
        _drawGuideline(
          context,
          parameters,
          guideline,
          parameters.strokeColorFontGuideline
        );
      }
    }

    // Hover / selection

    // Under layer
    context.fillStyle = parameters.underColor;
    for (const i of selectedGuidelineIndices || []) {
      const guideline = glyph.guidelines[i];
      if (!guideline) {
        continue;
      }
      if (guideline.locked) {
        _drawLockIcon(
          context,
          guideline.x - parameters.iconSize / 2,
          guideline.y + parameters.iconSize / 2,
          parameters.strokeColor,
          parameters.iconSize
        );
      } else {
        fillRoundNode(context, guideline, smoothSize + parameters.underlayOffset);
      }
    }

    // Hovered guideline
    context.strokeStyle = parameters.hoveredColor;
    context.lineWidth = parameters.strokeWidth;
    for (const i of hoveredGuidelineIndices || []) {
      const guideline = glyph.guidelines[i];
      if (!guideline) {
        continue;
      }
      if (guideline.locked) {
        const drawIcons = [
          [parameters.hoveredColor, 11],
          [parameters.underColorIcon, 7],
          [parameters.hoveredColorIcon, 2],
        ];
        for (const [color, strokeSize] of drawIcons) {
          _drawLockIcon(
            context,
            guideline.x - parameters.iconSize / 2,
            guideline.y + parameters.iconSize / 2,
            color,
            parameters.iconSize,
            strokeSize
          );
        }
      } else {
        strokeRoundNode(context, guideline, smoothSize + parameters.hoverStrokeOffset);
      }
    }

    // Selected guideline
    context.fillStyle = parameters.selectedColor;
    for (const i of selectedGuidelineIndices || []) {
      const guideline = glyph.guidelines[i];
      if (!guideline) {
        continue;
      }
      if (guideline.locked) {
        _drawLockIcon(
          context,
          guideline.x - parameters.iconSize / 2,
          guideline.y + parameters.iconSize / 2,
          parameters.selectedColor,
          parameters.iconSize
        );
      } else {
        fillRoundNode(context, guideline, smoothSize);
      }
    }
  },
});

function _drawGuideline(context, parameters, guideline, strokeColor, underStrokeColor) {
  withSavedState(context, () => {
    context.strokeStyle = strokeColor;
    context.lineWidth = parameters.strokeWidth;
    context.translate(guideline.x, guideline.y);

    // Draw lock icon or the "node"
    if (guideline.locked) {
      _drawLockIcon(
        context,
        -parameters.iconSize / 2,
        parameters.iconSize / 2,
        strokeColor,
        parameters.iconSize
      );
    } else {
      strokeCircle(context, 0, 0, parameters.originMarkerRadius);
    }

    withSavedState(context, () => {
      context.rotate((guideline.angle * Math.PI) / 180);
      context.scale(1, -1);

      let textWidth;
      let moveText;
      const halfMarker = parameters.originMarkerRadius / 2 + parameters.strokeWidth * 2;
      // Draw name
      if (guideline.name) {
        const strLine = `${guideline.name}`;
        textWidth = context.measureText(strLine).width;
        const textVerticalCenter = getTextVerticalCenter(context, strLine);

        context.fillStyle = strokeColor;
        moveText =
          0 - // this is centered to the guideline origin
          textWidth / 2 - // move half width left -> right aligned to origin
          halfMarker - // move half of the marker radius left + stroke width
          parameters.margin * // move one margin to left to get a short line on the left
            2; // move another margin left to get the margin on the right
        context.fillText(strLine, moveText, textVerticalCenter);
      }

      // Collect lines
      let lines = [[halfMarker, parameters.strokeLength]];
      if (guideline.name) {
        // With name
        lines.push([
          -textWidth / 2 + moveText - parameters.margin,
          -parameters.strokeLength,
        ]);
        lines.push([-parameters.margin * 2, -halfMarker]);
      } else {
        // Without name
        lines.push([-halfMarker, -parameters.strokeLength]);
      }

      // Draw lines

      if (underStrokeColor) {
        context.strokeStyle = underStrokeColor;
        context.lineWidth = parameters.strokeWidth * 3;
        for (const [x1, x2] of lines) {
          strokeLine(context, x1, 0, x2, 0);
        }
      }

      context.lineWidth = parameters.strokeWidth;
      context.strokeStyle = strokeColor;
      for (const [x1, x2] of lines) {
        strokeLineDashed(context, x1, 0, x2, 0, [
          parameters.strokeDash * 2,
          parameters.strokeDash,
        ]);
      }
    });
  });
}

function _drawLockIcon(context, x, y, strokeColor, iconSize, lineWidth = 2) {
  withSavedState(context, () => {
    context.translate(x, y);
    context.scale(iconSize / 24, (-1 * iconSize) / 24);
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor;
    context.stroke(lockIconPath2D);
  });
}

registerVisualizationLayerDefinition({
  identifier: "fontra.crosshair",
  name: "sidebar.user-settings.glyph.dragcrosshair",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 500,
  screenParameters: { strokeWidth: 1, lineDash: [4, 4] },
  colors: { strokeColor: "#8888" },
  colorsDarkMode: { strokeColor: "#AAA8" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const pointIndex = model.initialClickedPointIndex;
    if (pointIndex === undefined) {
      return;
    }
    const { x, y } = positionedGlyph.glyph.path.getPoint(pointIndex);
    context.strokeStyle = parameters.strokeColor;
    context.lineWidth = parameters.strokeWidth;
    if (parameters.dashed === false) {
      context.setLineDash([]);
    } else {
      context.setLineDash(parameters.lineDash);
    }
    const { xMin, yMin, xMax, yMax } = controller.getViewBox();
    const dx = -positionedGlyph.x;
    const dy = -positionedGlyph.y;
    strokeLine(context, x, yMin + dy, x, yMax + dy);
    strokeLine(context, xMin + dx, y, xMax + dx, y);
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.ghostpath",
  name: "sidebar.user-settings.glyph.dragghostpath",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: true,
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { strokeColor: "#AAA6" },
  colorsDarkMode: { strokeColor: "#8886" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    if (!model.ghostPath) {
      return;
    }
    context.lineJoin = "round";
    context.strokeStyle = parameters.strokeColor;
    context.lineWidth = parameters.strokeWidth;
    context.stroke(model.ghostPath);
  },
});

// ---- derived edit path (ADR-0012) ---------------------------------------
//
// A line-to-curve squircle join is DERIVED geometry: the stored outline keeps the
// line and the curve meeting at the node, and the smooth G2 transition is
// materialised only for display and export. The three edit-path layers below
// therefore draw the derived outline, while `fontra.edit.editing.layers` (and
// every editing interaction: hit testing, node drawing, selection) keeps using
// the stored path -- derived points are deliberately NOT selectable or draggable.
//
// Deriving runs a damped Newton per join, so it must not happen per layer per
// frame. The result is cached per glyph controller and invalidated by an EXACT
// geometry comparison (coordinates + point types + contour ends): an edit
// anywhere re-derives exactly once, and all three layers share the one result.
//
// TODO: move this onto the glyph controller's own representation cache so it is
// invalidated for free and can also be handed to the exporter (the Python side
// derives independently; the shared truth table keeps the two equal).
const derivedEditPathCache = new WeakMap();

function derivedGeometryUnchanged(entry, path) {
  if (
    entry.coordinates.length !== path.coordinates.length ||
    entry.pointTypes.length !== path.pointTypes.length ||
    entry.contourInfo.length !== path.contourInfo.length
  ) {
    return false;
  }
  for (let i = 0; i < entry.coordinates.length; i++) {
    if (entry.coordinates[i] !== path.coordinates[i]) {
      return false;
    }
  }
  for (let i = 0; i < entry.pointTypes.length; i++) {
    if (entry.pointTypes[i] !== path.pointTypes[i]) {
      return false;
    }
  }
  for (let i = 0; i < entry.contourInfo.length; i++) {
    if (entry.contourInfo[i].endPoint !== path.contourInfo[i].endPoint) {
      return false;
    }
    if (!!entry.contourInfo[i].isClosed !== !!path.contourInfo[i].isClosed) {
      return false;
    }
  }
  return true;
}

function buildDerivedEditPathEntry(glyphController, path) {
  const { derivedPath, transitions } = deriveSquircleTransitions(path);
  const entry = {
    coordinates: Array.from(path.coordinates),
    pointTypes: Array.from(path.pointTypes),
    contourInfo: path.contourInfo.map((contour) => ({ ...contour })),
    hasTransition: transitions.some((transition) => transition.status === "ok"),
    fullPath2d: undefined,
    closedPath2d: undefined,
  };
  if (!entry.hasTransition) {
    return entry;
  }
  // components are untouched by the derivation but still have to be drawn
  const componentsPath = glyphController.componentsPath;
  const full = new Path2D();
  derivedPath.drawToPath2d(full);
  if (componentsPath) {
    componentsPath.drawToPath2d(full);
  }
  entry.fullPath2d = full;
  if (derivedPath.contourInfo.every((contour) => contour.isClosed)) {
    // no open contours: the closed-contours variant IS the full path
    entry.closedPath2d = full;
  } else {
    const closed = new Path2D();
    for (const [index, contour] of enumerate(derivedPath.contourInfo)) {
      if (contour.isClosed) {
        derivedPath.drawContourToPath2d(closed, index);
      }
    }
    if (componentsPath) {
      componentsPath.drawToPath2d(closed);
    }
    entry.closedPath2d = closed;
  }
  return entry;
}

// The Path2D the edit-path layers should draw, or undefined when the glyph has
// nothing to derive (the caller then uses the stock representation).
function derivedEditPath2d(glyphController, { closedContoursOnly = false } = {}) {
  const path = glyphController?.instance?.path;
  if (!path) {
    return undefined;
  }
  let entry = derivedEditPathCache.get(glyphController);
  if (!entry || !derivedGeometryUnchanged(entry, path)) {
    entry = buildDerivedEditPathEntry(glyphController, path);
    derivedEditPathCache.set(glyphController, entry);
  }
  if (!entry.hasTransition) {
    return undefined;
  }
  return closedContoursOnly ? entry.closedPath2d : entry.fullPath2d;
}

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.path.fill",
  name: "Edit path fill",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { fillColor: "#0001" },
  colorsDarkMode: { fillColor: "#FFF3" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.fillStyle = parameters.fillColor;
    context.fill(
      derivedEditPath2d(positionedGlyph.glyph, { closedContoursOnly: true }) ??
        positionedGlyph.glyph.closedContoursPath2d
    );
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.selected.glyph",
  name: "Selected glyph",
  selectionFunc: glyphSelector("selected"),
  selectionFilter: (positionedGlyph) => !positionedGlyph.isEmpty,
  zIndex: 200,
  screenParameters: { outerStrokeWidth: 10, innerStrokeWidth: 3 },
  colors: { fillColor: "#000", strokeColor: "#7778", errorColor: "#AAA" },
  colorsDarkMode: { fillColor: "#FFF", strokeColor: "#FFF8", errorColor: "#999" },
  draw: _drawSelectedGlyphLayer,
});

registerVisualizationLayerDefinition({
  identifier: "fontra.hovered.glyph",
  name: "Hovered glyph",
  selectionFunc: glyphSelector("hovered"),
  selectionFilter: (positionedGlyph) => !positionedGlyph.isEmpty,
  zIndex: 200,
  screenParameters: { outerStrokeWidth: 10, innerStrokeWidth: 3 },
  colors: { fillColor: "#000", strokeColor: "#BBB8", errorColor: "#AAA" },
  colorsDarkMode: { fillColor: "#FFF", strokeColor: "#CCC8", errorColor: "#999" },
  draw: _drawSelectedGlyphLayer,
});

function _drawSelectedGlyphLayer({ context, positionedGlyph, parameters }) {
  drawWithDoubleStroke(
    context,
    positionedGlyph.glyph.flattenedPath2d,
    parameters.outerStrokeWidth,
    parameters.innerStrokeWidth,
    parameters.strokeColor,
    positionedGlyph.glyph.errors?.length ? parameters.errorColor : parameters.fillColor
  );
}

registerVisualizationLayerDefinition({
  identifier: "fontra.component.selection",
  name: "Component selection",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    hoveredStrokeWidth: 3,
    selectedStrokeWidth: 3,
    originMarkerStrokeWidth: 1,
    selectedOriginMarkerStrokeWidth: 2,
    originMarkerSize: 10,
    originMarkerRadius: 4,
  },
  colors: {
    hoveredStrokeColor: "#CCC",
    selectedStrokeColor: "#888",
    originMarkerColor: "#BBB",
    tCenterMarkerColor: "#777",
  },
  colorsDarkMode: {
    hoveredStrokeColor: "#666",
    selectedStrokeColor: "#AAA",
    originMarkerColor: "#BBB",
    tCenterMarkerColor: "#DDD",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;

    const selectedItems = parseComponentSelection(
      model.selection || new Set(),
      glyph.components.length
    );
    const hoveredItems = parseComponentSelection(
      model.hoverSelection || new Set(),
      glyph.components.length
    );

    selectedItems.component = union(
      union(selectedItems.component, selectedItems.componentOrigin),
      selectedItems.componentTCenter
    );

    hoveredItems.component = union(
      union(hoveredItems.component, hoveredItems.componentOrigin),
      hoveredItems.componentTCenter
    );

    hoveredItems.component = difference(
      hoveredItems.component,
      selectedItems.component
    );
    hoveredItems.componentOrigin = difference(
      hoveredItems.componentOrigin,
      selectedItems.componentOrigin
    );
    hoveredItems.componentTCenter = difference(
      hoveredItems.componentTCenter,
      selectedItems.componentTCenter
    );

    const relevantComponents = union(selectedItems.component, hoveredItems.component);

    const visibleMarkers = {
      componentOrigin: difference(
        difference(relevantComponents, selectedItems.componentOrigin),
        hoveredItems.componentOrigin
      ),
      componentTCenter: difference(
        difference(relevantComponents, selectedItems.componentTCenter),
        hoveredItems.componentTCenter
      ),
    };

    const hoveredParms = {
      color: parameters.hoveredStrokeColor,
      width: parameters.hoveredStrokeWidth,
    };
    const selectedParms = {
      color: parameters.selectedStrokeColor,
      width: parameters.selectedStrokeWidth,
    };

    context.lineJoin = "round";
    context.lineCap = "round";

    for (const [componentIndices, parms] of [
      [hoveredItems.component, hoveredParms],
      [selectedItems.component, selectedParms],
    ]) {
      for (const componentIndex of componentIndices) {
        const componentController = glyph.components[componentIndex];

        context.lineWidth = parms.width;
        context.strokeStyle = parms.color;
        context.stroke(componentController.path2d);
      }
    }

    const markerVisibleParms = {
      color: parameters.hoveredStrokeColor,
      width: parameters.originMarkerStrokeWidth,
    };
    const markerHoveredParms = {
      color: parameters.hoveredStrokeColor,
      width: parameters.selectedOriginMarkerStrokeWidth,
    };
    const markerSelectedParms = {
      color: parameters.selectedStrokeColor,
      width: parameters.selectedOriginMarkerStrokeWidth,
    };

    for (const [markers, parms] of [
      [visibleMarkers, markerVisibleParms],
      [hoveredItems, markerHoveredParms],
      [selectedItems, markerSelectedParms],
    ]) {
      // Component origin
      context.lineWidth = parms.width;
      context.strokeStyle = parameters.originMarkerColor;
      for (const componentIndex of markers.componentOrigin) {
        const componentController = glyph.components[componentIndex];
        const component = componentController.compo;

        const transformation = component.transformation;
        const [x, y] = [transformation.translateX, transformation.translateY];
        strokeLine(
          context,
          x - parameters.originMarkerSize,
          y,
          x + parameters.originMarkerSize,
          y
        );
        strokeLine(
          context,
          x,
          y - parameters.originMarkerSize,
          x,
          y + parameters.originMarkerSize
        );
      }

      // Component transformation center
      context.lineWidth = parms.width;
      context.strokeStyle = parameters.tCenterMarkerColor;
      for (const componentIndex of markers.componentTCenter) {
        const componentController = glyph.components[componentIndex];
        const component = componentController.compo;
        const transformation = component.transformation;

        const affine = decomposedToTransform(transformation);
        const [cx, cy] = affine.transformPoint(
          transformation.tCenterX,
          transformation.tCenterY
        );
        const pt1 = affine.transformPoint(
          transformation.tCenterX - parameters.originMarkerSize,
          transformation.tCenterY
        );
        const pt2 = affine.transformPoint(
          transformation.tCenterX + parameters.originMarkerSize,
          transformation.tCenterY
        );
        const pt3 = affine.transformPoint(
          transformation.tCenterX,
          transformation.tCenterY - parameters.originMarkerSize
        );
        const pt4 = affine.transformPoint(
          transformation.tCenterX,
          transformation.tCenterY + parameters.originMarkerSize
        );
        strokeLine(context, ...pt1, ...pt2);
        strokeLine(context, ...pt3, ...pt4);
        strokeCircle(context, cx, cy, parameters.originMarkerRadius);
      }
    }
  },
});

function parseComponentSelection(selection, numComponents) {
  const parsed = parseSelection(selection);
  const result = {};
  for (const prop of ["component", "componentOrigin", "componentTCenter"]) {
    result[prop] = new Set((parsed[prop] || []).filter((i) => i < numComponents));
  }
  return result;
}

// Chevron geometry (screen px) for the start-point direction indicator: a
// ">" / "<" whose tip points along the contour.
//
// Two independent requirements shape this:
//   - the chevron SCALES with the node icons (chevronLength/chevronSpread are
//     multiplied by nodeSize / NODE_SIZE_DEFAULT in
//     applyVisualTokenSettings), so the indicator stays proportionate to
//     bigger or smaller nodes;
//   - the GAP between the node icon and the chevron stays constant, so the two
//     never touch however large the nodes get (the gap is deliberately NOT
//     scaled).
// The values below are the size-8 baseline; applyVisualTokenSettings()
// rescales them from there.
const NODE_SIZE_DEFAULT = 8;
const START_POINT_CHEVRON_GAP = 5;
const START_POINT_CHEVRON_LENGTH = 6;
const START_POINT_CHEVRON_SPREAD = 5;

// Eye (smooth-node) proportions, as multiples of the node size.
// `halfLen` runs along the curve tangent, `halfWidth` across it.
//
// Shape follows the outer contour of the Lucide `eye` icon, with the pupil
// dropped (lucide/icons/eye.svg: the enclosing path
// "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0
// .696 10.75 10.75 0 0 1-19.876 0"; the <circle cx=12 cy=12 r=3> is the pupil
// and is intentionally omitted, as are the lashes). That contour spans
// 19.88 x 14.0 units -- a 1.42 : 1 length-to-width ratio (fuller than the
// Tabler eye's 1.5 : 1, which read as a sliver at node size).
// We keep our pointed tips (see eyePath) rather than Lucide's rounded ones,
// because the cusps carry the curvature semantics (see the design note).
//
// SIZE is chosen so the eye's visual weight equals the corner square's, i.e.
// equal area: the square is size^2, and the lens (two quadratic curves)
// encloses (8/3) * halfLen * halfWidth, so 0.73 * 0.514 gives exactly size^2.
// The eye used to be 2.3 * size long, which dwarfed the square.
//
// These are the single source of truth for the canvas drawing (eyePath) and
// the start-point clearance maths.
export const EYE_HALF_LEN_FACTOR = 0.73;
export const EYE_HALF_WIDTH_FACTOR = 0.514; // 0.73 / 1.42 -> Lucide's ratio

// How far the node icon reaches from its centre along unit direction
// (ux, uy) in the GLYPH frame -- the support distance of the shape. Placing the
// chevron at supportDistance + gap makes the clearance between the node and the
// chevron constant BY CONSTRUCTION, for either node shape and at every node
// size, which is what the directional indicator needs. (A minimum-distance
// measure would degenerate on the eye's pointed tips.)
//   - square corner node, axis-aligned, half-size h:  h * (|ux| + |uy|)
//   - eye smooth node, semi-axes halfLen along its tangent axis and
//     halfWidth across it (see eyePath): the ellipse support distance
//     sqrt((halfLen * (u·a))^2 + (halfWidth * (u·a_perp))^2)
function nodeSupportDistance(pt, ux, uy, cornerSize, smoothSize, axis) {
  if (!pt.type && pt.smooth) {
    const halfLen = smoothSize * EYE_HALF_LEN_FACTOR; // see eyePath
    const halfWidth = smoothSize * EYE_HALF_WIDTH_FACTOR;
    const ax = axis ? axis.x : 1;
    const ay = axis ? axis.y : 0;
    const along = ax * ux + ay * uy;
    const across = -ay * ux + ax * uy;
    return Math.hypot(halfLen * along, halfWidth * across);
  }
  if (!pt.type) {
    const half = cornerSize / 2;
    return half * (Math.abs(ux) + Math.abs(uy));
  }
  return 0;
}

registerVisualizationLayerDefinition({
  identifier: "fontra.startpoint.indicator",
  name: "Startpoint indicator",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  // cornerSize / smoothSize are synced from the node appearance settings by
  // applyVisualTokenSettings(); the defaults keep the layer working before
  // that runs
  screenParameters: {
    cornerSize: 8,
    smoothSize: 8,
    gap: START_POINT_CHEVRON_GAP,
    chevronLength: START_POINT_CHEVRON_LENGTH,
    chevronSpread: START_POINT_CHEVRON_SPREAD,
    strokeWidth: 2,
  },
  colors: { color: "#989898A0" },
  colorsDarkMode: { color: "#989898A0" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    context.strokeStyle = parameters.color;
    context.lineWidth = parameters.strokeWidth;
    const gap = parameters.gap;
    const chevronLength = parameters.chevronLength;
    const spread = parameters.chevronSpread;
    // the eye axis of any smooth node (also used for the start points)
    const tangents = computeSmoothTangents(glyph.path);
    let startPointIndex = 0;
    for (const contourInfo of glyph.path.contourInfo) {
      const startPoint = glyph.path.getPoint(startPointIndex);
      let angle;
      if (startPointIndex < contourInfo.endPoint) {
        const nextPoint = glyph.path.getPoint(startPointIndex + 1);
        const direction = subVectors(nextPoint, startPoint);
        angle = Math.atan2(direction.y, direction.x);
      }
      if (angle !== undefined) {
        const axis = tangents.get(startPointIndex);
        // Support distance of the node icon along the contour direction (the
        // chevron's own +x). Both leg ends share the same x, so placing that x
        // at supportDistance + gap gives a clearance of exactly `gap` between
        // the node's furthest point ahead and the chevron -- identical for
        // square and eye nodes, and constant as the node size changes.
        const support = nodeSupportDistance(
          startPoint,
          1,
          0,
          parameters.cornerSize,
          parameters.smoothSize,
          axis
        );
        const legX = support + gap;
        // chevron pointing along the contour direction: ">" when heading
        // right, "<" when heading left, rotated for any other direction
        context.save();
        context.translate(startPoint.x, startPoint.y);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(legX, -spread);
        context.lineTo(legX + chevronLength, 0);
        context.lineTo(legX, spread);
        context.stroke();
        context.restore();
      }
      startPointIndex = contourInfo.endPoint + 1;
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.contour.index",
  name: "sidebar.user-settings.glyph.contour",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 600,
  screenParameters: { fontSize: 11 },
  colors: { boxColor: "#FFFB", color: "#000" },
  colorsDarkMode: { boxColor: "#1118", color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const fontSize = parameters.fontSize;

    const margin = 0.5 * fontSize;
    const boxHeight = 1.68 * fontSize;
    const bottomY = 0.75 * fontSize * -1 - boxHeight + margin / 2;

    context.font = `${fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    context.scale(1, -1);

    let startPointIndex = 0;

    for (const [contourIndex, contourInfo] of enumerate(glyph.path.contourInfo)) {
      const startPoint = glyph.path.getPoint(startPointIndex);

      const strLine = `${contourIndex}`;
      const width = context.measureText(strLine).width + 2 * margin;

      context.fillStyle = parameters.boxColor;
      drawRoundRect(
        context,
        startPoint.x - width / 2,
        -startPoint.y - bottomY + margin,
        width,
        -boxHeight / 2 - 2 * margin,
        boxHeight / 4 // corner radius
      );

      context.fillStyle = parameters.color;
      context.fillText(strLine, startPoint.x, -startPoint.y - bottomY);
      startPointIndex = contourInfo.endPoint + 1;
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.component.index",
  name: "sidebar.user-settings.glyph.component",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 600,
  screenParameters: { fontSize: 11 },
  colors: { boxColor: "#FFFB", color: "#000" },
  colorsDarkMode: { boxColor: "#1118", color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const fontSize = parameters.fontSize;

    const margin = 0.5 * fontSize;
    const boxHeight = 1.68 * fontSize;
    const lineHeight = fontSize;
    const bottomY = -boxHeight / 2;

    context.font = `${fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    context.scale(1, -1);

    for (const [shapeIndex, componentController] of enumerate(glyph.components)) {
      const bounds = componentController.controlBounds;
      if (!bounds) {
        // Shouldn't happen due to the "empty base glyph placeholder",
        // a.k.a. makeEmptyComponentPlaceholderGlyph(), but let's be safe.
        continue;
      }
      const pt = {
        x: (bounds.xMax - bounds.xMin) / 2 + bounds.xMin,
        y: (bounds.yMax - bounds.yMin) / 2 + bounds.yMin,
      };

      const strLine1 = `${componentController.compo.name}`;
      const strLine2 = `${shapeIndex}`;
      const width =
        Math.max(
          context.measureText(strLine1).width,
          context.measureText(strLine2).width
        ) +
        2 * margin;
      context.fillStyle = parameters.boxColor;
      drawRoundRect(
        context,
        pt.x - width / 2,
        -pt.y - bottomY + margin,
        width,
        -boxHeight - 2 * margin,
        boxHeight / 4 // corner radius
      );

      context.fillStyle = parameters.color;
      context.fillText(strLine1, pt.x, -pt.y - bottomY - lineHeight);
      context.fillText(strLine2, pt.x, -pt.y - bottomY);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.component.nodes",
  name: "sidebar.user-settings.component.nodes",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 450,
  screenParameters: {
    cornerSize: 8,
    smoothSize: 8,
    handleSize: 6.5,
    strokeWidth: 1,
  },
  colors: {
    smoothColor: "#7A4FE8B0",
    squircleColor: "#0D9488B0",
    cornerColor: "#C2410CB0",
    handleColor: "#A0A0B0B0",
  },
  colorsDarkMode: {
    smoothColor: "#A78BFAB0",
    squircleColor: "#2DD4BFB0",
    cornerColor: "#FB923CB0",
    handleColor: "#7E8290B0",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const cornerSize = parameters.cornerSize;
    const smoothSize = parameters.smoothSize;
    const handleSize = parameters.handleSize;

    const componentTangents = computeSmoothTangents(glyph.componentsPath);

    context.strokeStyle = parameters.handleColor;
    context.lineWidth = parameters.strokeWidth;
    for (const [pt1, pt2] of glyph.componentsPath.iterHandles()) {
      strokeLine(context, pt1.x, pt1.y, pt2.x, pt2.y);
    }

    let pointIndex = 0;
    for (const pt of glyph.componentsPath.iterPoints()) {
      strokeNode(
        context,
        pt,
        cornerSize,
        smoothSize,
        handleSize,
        parameters,
        componentTangents.get(pointIndex++)
      );
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.handles",
  name: "Bezier handles",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: { strokeWidth: 1 },
  colors: { color: "#BBB" },
  colorsDarkMode: { color: "#777" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    context.strokeStyle = parameters.color;
    context.lineWidth = parameters.strokeWidth;
    for (const [pt1, pt2] of glyph.path.iterHandles()) {
      strokeLine(context, pt1.x, pt1.y, pt2.x, pt2.y);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.nodes",
  name: "Nodes",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    cornerSize: 8,
    smoothSize: 8,
    handleSize: 6.5,
    strokeWidth: 1.5,
  },
  colors: {
    smoothColor: "#7A4FE8",
    squircleColor: "#0D9488",
    cornerColor: "#C2410C",
    handleColor: "#A0A0B0",
  },
  colorsDarkMode: {
    smoothColor: "#A78BFA",
    squircleColor: "#2DD4BF",
    cornerColor: "#FB923C",
    handleColor: "#7E8290",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const cornerSize = parameters.cornerSize;
    const smoothSize = parameters.smoothSize;
    const handleSize = parameters.handleSize;

    // unselected nodes are HOLLOW: type-colored outline only (solid fill
    // marks the active/selected nodes, see fontra.selected.nodes)
    context.lineWidth = parameters.strokeWidth;
    const tangents = computeSmoothTangents(glyph.path);
    let pointIndex = 0;
    for (const pt of glyph.path.iterPoints()) {
      strokeNode(
        context,
        pt,
        cornerSize,
        smoothSize,
        handleSize,
        parameters,
        tangents.get(pointIndex++)
      );
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.selected.nodes",
  name: "Selected nodes",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    cornerSize: 8,
    smoothSize: 8,
    handleSize: 6.5,
    strokeWidth: 1,
    hoverStrokeOffset: 4,
    underlayOffset: 2,
  },
  colors: {
    selectedColor: "#000",
    underColor: "#FFFA",
    smoothColor: "#7A4FE8",
    squircleColor: "#0D9488",
    cornerColor: "#C2410C",
    handleColor: "#A0A0B0",
  },
  colorsDarkMode: {
    selectedColor: "#FFF",
    underColor: "#0008",
    smoothColor: "#A78BFA",
    squircleColor: "#2DD4BF",
    cornerColor: "#FB923C",
    handleColor: "#7E8290",
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const cornerSize = parameters.cornerSize;
    const smoothSize = parameters.smoothSize;
    const handleSize = parameters.handleSize;

    const { point: hoveredPointIndices } = parseSelection(model.hoverSelection);
    const { point: selectedPointIndices } = parseSelection(model.selection);
    const tangents = computeSmoothTangents(glyph.path);

    // Under layer
    const underlayOffset = parameters.underlayOffset;
    const underColors = {
      corner: parameters.underColor,
      smooth: parameters.underColor,
      handle: parameters.underColor,
      // the halo follows the handle glyph shape (circle/diamond)
      handleShape: parameters.handleShape,
    };
    context.fillStyle = parameters.underColor;
    for (const [i, pt] of enumerate(iterPointsByIndex(glyph.path, selectedPointIndices))) {
      fillNode(
        context,
        pt,
        cornerSize + underlayOffset,
        smoothSize + underlayOffset,
        handleSize + underlayOffset,
        underColors,
        tangents.get(selectedPointIndices[i])
      );
    }
    // Selected (active) nodes are SOLID, in their type colors; the selected
    // off-curve handles use their own color setting
    context.fillStyle = parameters.selectedColor;
    const selectedColors = {
      ...parameters,
      handleColor: parameters.selectedHandleColor ?? parameters.handleColor,
    };
    for (const [i, pt] of enumerate(iterPointsByIndex(glyph.path, selectedPointIndices))) {
      fillNode(
        context,
        pt,
        cornerSize,
        smoothSize,
        handleSize,
        selectedColors,
        tangents.get(selectedPointIndices[i])
      );
    }
    // Hovered nodes get a type-colored ring
    context.lineWidth = parameters.strokeWidth;
    const hoverStrokeOffset = parameters.hoverStrokeOffset;
    for (const [i, pt] of enumerate(iterPointsByIndex(glyph.path, hoveredPointIndices))) {
      strokeNode(
        context,
        pt,
        cornerSize + hoverStrokeOffset,
        smoothSize + hoverStrokeOffset,
        handleSize + hoverStrokeOffset,
        parameters,
        tangents.get(hoveredPointIndices[i])
      );
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.coordinates",
  name: "sidebar.user-settings.glyph.coordinates",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 600,
  screenParameters: { fontSize: 10 },
  colors: { boxColor: "#FFFB", color: "#000" },
  colorsDarkMode: { boxColor: "#1118", color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const fontSize = parameters.fontSize;

    let {
      point: pointSelection,
      component: componentSelection,
      componentOrigin: componentOriginSelection,
      anchor: anchorSelection,
      guideline: guidelineSelection,
    } = parseSelection(model.sceneSettings.combinedSelection);
    componentSelection = unionIndexSets(componentSelection, componentOriginSelection);

    const margin = 0.2 * fontSize;
    const boxHeight = 1.68 * fontSize;
    const lineHeight = fontSize;
    const bottomY = 0.75 * fontSize;

    context.font = `${fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    context.scale(1, -1);

    for (const pt of chain(
      iterPointsByIndex(glyph.path, pointSelection),
      iterComponentOriginsByIndex(glyph.instance.components, componentSelection),
      iterAnchorsPointsByIndex(glyph.anchors, anchorSelection),
      iterGuidelinesPointsByIndex(glyph.guidelines, guidelineSelection)
    )) {
      const xString = `${round(pt.x, 1)}`;
      const yString = `${round(pt.y, 1)}`;
      const width =
        Math.max(
          context.measureText(xString).width,
          context.measureText(yString).width
        ) +
        2 * margin;
      context.fillStyle = parameters.boxColor;
      context.fillRect(
        pt.x - width / 2,
        -pt.y - bottomY + margin,
        width,
        -boxHeight - 2 * margin
      );

      context.fillStyle = parameters.color;
      context.fillText(xString, pt.x, -pt.y - bottomY - lineHeight);
      context.fillText(yString, pt.x, -pt.y - bottomY);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.point.index",
  name: "sidebar.user-settings.glyph.point.index",
  selectionFunc: glyphSelector("editing"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 600,
  screenParameters: { fontSize: 10 },
  colors: { boxColor: "#FFFB", color: "#000" },
  colorsDarkMode: { boxColor: "#1118", color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const glyph = positionedGlyph.glyph;
    const fontSize = parameters.fontSize;

    let { point: pointSelection } = parseSelection(
      model.sceneSettings.combinedSelection
    );

    const margin = 0.2 * fontSize;
    const boxHeight = (1.68 * fontSize) / 2;
    const bottomY = -0.75 * fontSize * 2;

    context.font = `${fontSize}px engramfont-ui-regular, sans-serif`;
    context.textAlign = "center";
    context.scale(1, -1);

    for (const pointIndex of pointSelection || []) {
      const pt = glyph.path.getPoint(pointIndex);
      if (!pt) {
        continue;
      }
      const xString = `${pointIndex}`;
      const width = context.measureText(xString).width + 2 * margin;
      context.fillStyle = parameters.boxColor;
      context.fillRect(
        pt.x - width / 2,
        -pt.y - bottomY + margin,
        width,
        -boxHeight - 2 * margin
      );

      context.fillStyle = parameters.color;
      context.fillText(xString, pt.x, -pt.y - bottomY);
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.connect-insert.point",
  name: "Connect/insert point",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    connectRadius: 11,
    insertHandlesRadius: 5,
    deleteOffCurveIndicatorLength: 7,
    canDragOffCurveIndicatorRadius: 9,
    strokeWidth: 2,
  },
  colors: { color: "#3080FF80" },
  colorsDarkMode: { color: "#50A0FF80" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const targetPoint = model.pathConnectTargetPoint;
    const insertHandles = model.pathInsertHandles;
    const danglingOffCurve = model.pathDanglingOffCurve;
    const canDragOffCurve = model.pathCanDragOffCurve;
    if (!targetPoint && !insertHandles && !danglingOffCurve && !canDragOffCurve) {
      return;
    }

    context.fillStyle = parameters.color;
    context.strokeStyle = parameters.color;
    context.lineWidth = parameters.strokeWidth;
    context.lineCap = "round";

    if (targetPoint) {
      const radius = parameters.connectRadius;
      fillRoundNode(context, targetPoint, 2 * radius);
    }
    for (const point of insertHandles?.points || []) {
      const radius = parameters.insertHandlesRadius;
      fillRoundNode(context, point, 2 * radius);
    }
    if (danglingOffCurve) {
      const d = parameters.deleteOffCurveIndicatorLength;
      const { x, y } = danglingOffCurve;
      let dx = d;
      let dy = d;
      const inner = 0.666;
      for (let i = 0; i < 4; i++) {
        [dx, dy] = [-dy, dx];
        strokeLine(context, x + inner * dx, y + inner * dy, x + dx, y + dy);
      }
    }
    if (canDragOffCurve) {
      const dashLength = (parameters.canDragOffCurveIndicatorRadius * Math.PI) / 6;
      context.setLineDash([dashLength]);
      strokeRoundNode(
        context,
        canDragOffCurve,
        2 * parameters.canDragOffCurveIndicatorRadius
      );
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.status.color",
  name: "sidebar.user-settings.glyph.statuscolor",
  selectionFunc: glyphSelector("all"),
  userSwitchable: true,
  defaultOn: false,
  zIndex: 100,
  screenParameters: {
    minThickness: 3,
    maxThickness: 15,
  },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const statusFieldDefinitions =
      model.fontController.customData["fontra.sourceStatusFieldDefinitions"];
    if (!statusFieldDefinitions) {
      return;
    }

    const sourceIndex = positionedGlyph.glyph.sourceIndex;
    if (sourceIndex === undefined) {
      return;
    }

    let status =
      positionedGlyph.varGlyph.sources[sourceIndex].customData[
        "fontra.development.status"
      ];

    if (status === undefined) {
      status = statusFieldDefinitions.find((statusDef) => statusDef.isDefault)?.value;
      if (status === undefined) {
        return;
      }
    }

    if (!statusFieldDefinitions[status]) {
      return;
    }

    const color = [...statusFieldDefinitions[status].color];
    if (positionedGlyph.isEditing) {
      // in editing mode reduce opacity (user setting, 0..1; screenParameters
      // would zoom-scale it, so it travels via glyphParameters)
      color[3] = color[3] * (parameters.editingOpacity ?? 0.4);
    }

    const thickness = clamp(
      0.05 * model.fontController.unitsPerEm,
      parameters.minThickness,
      parameters.maxThickness
    );
    context.fillStyle = rgbaToCSS(color);
    context.fillRect(
      0,
      -0.12 * model.fontController.unitsPerEm - thickness,
      positionedGlyph.glyph.xAdvance,
      thickness
    );
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.background.layers.nodes-and-handles",
  name: "sidebar.user-settings.glyph.background-nodes-and-handles",
  userSwitchable: true,
  defaultOn: false,
  selectionFunc: glyphSelector("editing"),
  zIndex: 490,
  screenParameters: {
    strokeWidth: 0.5,
    cornerSize: 5.5,
    smoothSize: 5.5,
    handleSize: 4.5,
  },
  colors: { backgroundColor: "#DDDF" },
  colorsDarkMode: { backgroundColor: "#555F" },

  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.lineWidth = parameters.strokeWidth;

    context.strokeStyle = parameters.backgroundColor;
    context.fillStyle = parameters.backgroundColor;

    drawBackgroundHandlesAndNodes(
      context,
      Object.values(model.backgroundLayerGlyphs || {}),
      parameters.cornerSize,
      parameters.smoothSize,
      parameters.handleSize
    );
  },
});

// The editing-layer ghost nodes used to share the background layer and drew in
// lavender #BBFF at zIndex 490 -- UNDER the hollow node rings (zIndex 500).
// Through a ring's hole the lavender fill read as "a dot inside every
// inactive node" (rgb(187,187,255)). Their visibility now lives in the theme
// settings panel ("Editing layer nodes": color + alpha slider); the layer is
// always registered and applies the color via applyVisualTokenSettings (color-alpha compose)()
// below -- an alpha of 0 makes it draw nothing (the default).
registerVisualizationLayerDefinition({
  identifier: "fontra.edit.editing.layers.nodes-and-handles",
  name: "sidebar.user-settings.glyph.editing-nodes-and-handles",
  selectionFunc: glyphSelector("editing"),
  zIndex: 490,
  screenParameters: {
    strokeWidth: 0.5,
    cornerSize: 5.5,
    smoothSize: 5.5,
    handleSize: 4.5,
  },
  colors: { editColor: "transparent" },
  colorsDarkMode: { editColor: "transparent" },

  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    if (parameters.editColor === "transparent") {
      // the off state: nothing to draw
      return;
    }
    context.lineWidth = parameters.strokeWidth;

    context.strokeStyle = parameters.editColor;
    context.fillStyle = parameters.editColor;

    drawBackgroundHandlesAndNodes(
      context,
      Object.values(model.editingLayerGlyphs || {}),
      parameters.cornerSize,
      parameters.smoothSize,
      parameters.handleSize
    );
  },
});

function drawBackgroundHandlesAndNodes(
  context,
  glyphs,
  cornerSize,
  smoothSize,
  handleSize
) {
  for (const glyph of glyphs) {
    for (const [pt1, pt2] of glyph.path.iterHandles()) {
      strokeLine(context, pt1.x, pt1.y, pt2.x, pt2.y);
    }

    const tangents = computeSmoothTangents(glyph.path);
    let pointIndex = 0;
    for (const pt of glyph.path.iterPoints()) {
      fillNode(
        context,
        pt,
        cornerSize,
        smoothSize,
        handleSize,
        undefined,
        tangents.get(pointIndex++)
      );
    }
  }
}

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.background.layers",
  name: "Background glyph layers",
  selectionFunc: glyphSelector("editing"),
  zIndex: 490,
  screenParameters: {
    strokeWidth: 1,
    anchorRadius: 4,
  },
  colors: { color: "#CCCF", colorAnchor: "#DDDF" },
  colorsDarkMode: { color: "#666F", colorAnchor: "#555F" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.lineJoin = "round";
    context.lineWidth = parameters.strokeWidth;
    for (const layerGlyph of Object.values(model.backgroundLayerGlyphs || {})) {
      context.strokeStyle = parameters.color;
      context.stroke(layerGlyph.flattenedPath2d);

      // visualizing anchors
      context.strokeStyle = parameters.colorAnchor;
      for (const anchor of layerGlyph.anchors) {
        strokeCircle(context, anchor.x, anchor.y, parameters.anchorRadius);
      }
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.editing.layers",
  name: "Editing glyph layers",
  selectionFunc: glyphSelector("editing"),
  zIndex: 490,
  screenParameters: {
    strokeWidth: 1,
    anchorRadius: 4,
  },
  colors: { color: "#99FF", colorAnchor: "#AAFF" },
  colorsDarkMode: { color: "#559F", colorAnchor: "#558F" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    const primaryEditingInstance = positionedGlyph.glyph;
    context.lineJoin = "round";
    context.lineWidth = parameters.strokeWidth;
    for (const layerGlyph of Object.values(model.editingLayerGlyphs || {})) {
      if (layerGlyph !== primaryEditingInstance) {
        context.strokeStyle = parameters.color;
        context.stroke(layerGlyph.flattenedPath2d);

        // visualizing anchors
        context.strokeStyle = parameters.colorAnchor;
        for (const anchor of layerGlyph.anchors) {
          strokeCircle(context, anchor.x, anchor.y, parameters.anchorRadius);
        }
      }
    }
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.path.under.stroke",
  name: "Underlying edit path stroke",
  selectionFunc: glyphSelector("editing"),
  zIndex: 490,
  screenParameters: {
    strokeWidth: 3,
  },
  colors: { color: "#FFF6" },
  colorsDarkMode: { color: "#0004" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.lineJoin = "round";
    context.lineWidth = parameters.strokeWidth;
    context.strokeStyle = parameters.color;
    context.stroke(
      derivedEditPath2d(positionedGlyph.glyph) ?? positionedGlyph.glyph.flattenedPath2d
    );
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.edit.path.stroke",
  name: "Edit path stroke",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    strokeWidth: 1,
  },
  colors: { color: "#000" },
  colorsDarkMode: { color: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.lineJoin = "round";
    context.lineWidth = parameters.strokeWidth;
    context.strokeStyle = parameters.color;
    context.stroke(
      derivedEditPath2d(positionedGlyph.glyph) ?? positionedGlyph.glyph.flattenedPath2d
    );
  },
});

registerVisualizationLayerDefinition({
  identifier: "fontra.rect.select",
  name: "Rect select",
  selectionFunc: glyphSelector("editing"),
  zIndex: 500,
  screenParameters: {
    strokeWidth: 1,
    lineDash: [10, 10],
  },
  // The marquee is an INVERTED double stroke: a dark solid line under a light
  // dashed one, which reads on any background -- that pair is why the colors
  // used to be hardcoded in draw(). They are regular theme colors now
  // (applyVisualTokenSettings); the defaults keep the theme-agnostic look.
  colors: { solidColor: "#000", dashColor: "#FFF" },
  colorsDarkMode: { solidColor: "#000", dashColor: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    if (model.selectionParallelogram !== undefined) {
      // Slanted (Glyphs-style) selection: a parallelogram with horizontal
      // top/bottom edges and slanted sides
      const para = model.selectionParallelogram;
      const dx = para.shearK * (para.y1 - para.y0);
      const polygon = [
        { x: para.x0, y: para.y0 },
        { x: para.x1, y: para.y0 },
        { x: para.x1 + dx, y: para.y1 },
        { x: para.x0 + dx, y: para.y1 },
      ];
      context.lineWidth = parameters.strokeWidth;
      context.strokeStyle = parameters.solidColor;
      strokePolygon(context, polygon);
      context.strokeStyle = parameters.dashColor;
      context.setLineDash(parameters.lineDash);
      strokePolygon(context, polygon);
      return;
    }
    if (model.selectionRect === undefined) {
      return;
    }
    const selRect = model.selectionRect;
    const x = selRect.xMin;
    const y = selRect.yMin;
    const w = selRect.xMax - x;
    const h = selRect.yMax - y;
    context.lineWidth = parameters.strokeWidth;
    context.strokeStyle = parameters.solidColor;
    context.strokeRect(x, y, w, h);
    context.strokeStyle = parameters.dashColor;
    context.setLineDash(parameters.lineDash);
    context.strokeRect(x, y, w, h);
  },
});

//
// allGlyphsCleanVisualizationLayerDefinition is not registered, but used
// separately for the "clean" display.
//
export const allGlyphsCleanVisualizationLayerDefinition = {
  identifier: "fontra.all.glyphs",
  name: "All glyphs",
  selectionFunc: glyphSelector("all"),
  zIndex: 500,
  colors: { fillColor: "#000" },
  colorsDarkMode: { fillColor: "#FFF" },
  draw: ({ context, positionedGlyph, parameters, model, controller }) => {
    context.fillStyle = parameters.fillColor;
    context.fill(positionedGlyph.glyph.flattenedPath2d);
  },
};

// ---- visual token application (R4.T4.38, docs/visual-settings-inventory.md §8) ----
//
// One table-driven applier replaces the former per-feature apply*Settings
// functions: every row of VISUAL_TOKENS (fontra-core/src/visual-tokens.js)
// declares which layer slots it feeds, and this pass writes them all.
//
// Color resolution per token:
//   - no override   -> the layer definition's hand-tuned per-theme defaults
//                      are LEFT IN PLACE (they beat any formula)
//   - overridden    -> light theme gets the user color; dark theme gets an
//                      OKLCH-derived counterpart (hue/chroma preserved,
//                      lightness re-solved for contrast against the dark
//                      canvas) so the user's choice survives theme switching
//                      without becoming illegible.
//
// The pristine snapshot must be taken lazily on the FIRST apply call: several
// layers (fontra.transform.selection, power ruler, ...) are registered by
// modules that load after this one, and the editor constructs only after the
// full import graph has evaluated.
let _pristineLayerDefs = null;
function getPristineLayerDefs() {
  if (!_pristineLayerDefs) {
    const defs = [
      ...visualizationLayerDefinitions,
      // the "clean display" layer def is exported but NOT registered in the
      // array (the editor composes it separately) -- it still takes tokens
      allGlyphsCleanVisualizationLayerDefinition,
    ];
    _pristineLayerDefs = new Map(
      defs.map((layerDef) => [
        layerDef.identifier,
        {
          colors: { ...layerDef.colors },
          colorsDarkMode: { ...layerDef.colorsDarkMode },
          screenParameters: { ...layerDef.screenParameters },
          glyphParameters: { ...layerDef.glyphParameters },
        },
      ])
    );
  }
  return _pristineLayerDefs;
}

function findTokenLayerDef(layerId) {
  if (layerId === allGlyphsCleanVisualizationLayerDefinition.identifier) {
    return allGlyphsCleanVisualizationLayerDefinition;
  }
  return visualizationLayerDefinitions.find((def) => def.identifier === layerId);
}

function isTokenOverridden(token, model) {
  const value = normalizeHex6(model[token.key]);
  if (value && value.toLowerCase() !== normalizeHex6(token.defaultLight).toLowerCase()) {
    return true;
  }
  if (token.type === "color-alpha") {
    return clampAlpha(model[alphaKeyOf(token)]) !== (token.defaultAlpha ?? 100);
  }
  return false;
}

export function applyVisualTokenSettings(model) {
  const pristine = getPristineLayerDefs();
  // The canvas background override (setupCanvasBackgroundOverride) is one
  // value for both themes; when it is not set, the CSS defaults apply
  // (--background-color-light: #fff / --background-color-dark: #333).
  const lightCanvas = model.canvasBackgroundColor || "#FFFFFF";
  const darkCanvas = model.canvasBackgroundColor || "#333333";

  const writes = new Map();
  const getWrite = (layerId) => {
    let w = writes.get(layerId);
    if (!w) {
      w = { colors: {}, colorsDark: {}, params: {}, glyphParams: {} };
      writes.set(layerId, w);
    }
    return w;
  };

  for (const token of VISUAL_TOKENS) {
    if (!token.apply) {
      continue;
    }
    const overridden = isTokenOverridden(token, model);
    for (const spec of token.apply) {
      const w = getWrite(spec.layer);
      if (token.type === "number") {
        // scale lets a percent-valued token feed a 0..1 parameter
        // (e.g. statusBarEditingOpacity 0-100 -> editingOpacity 0..1)
        const value = (model[token.key] ?? token.default) * (token.scale ?? 1);
        if (token.write) {
          // composed mappings (e.g. dash arrays) route through the hook
          token.write(w, value, model);
        } else {
          for (const slot of Object.keys(spec.params ?? {})) {
            w.params[slot] = value;
          }
          for (const slot of Object.keys(spec.glyphParams ?? {})) {
            w.glyphParams[slot] = value;
          }
        }
      } else if (token.type === "boolean") {
        token.write?.(w, !!model[token.key], model);
      } else if (overridden) {
        // color / color-alpha
        let light;
        if (token.type === "color-alpha") {
          light = composeAlphaColor(
            normalizeHex6(model[token.key]) ?? token.defaultLight,
            clampAlpha(model[alphaKeyOf(token)])
          );
        } else {
          light = normalizeHex6(model[token.key]);
        }
        const dark =
          light === "transparent"
            ? "transparent"
            : deriveDarkColor(light, lightCanvas, darkCanvas);
        for (const slot of Object.keys(spec.colors ?? {})) {
          w.colors[slot] = light;
          w.colorsDark[slot] = dark;
        }
      }
    }
  }

  // Reset every touched layer from its pristine defaults first, then overlay
  // the token writes -- so clearing an override restores the hand-tuned
  // per-theme defaults instead of keeping a stale value from a previous run.
  const touchedLayers = new Set();
  for (const token of VISUAL_TOKENS) {
    for (const spec of token.apply ?? []) {
      touchedLayers.add(spec.layer);
    }
  }
  for (const layerId of touchedLayers) {
    const layerDef = findTokenLayerDef(layerId);
    const base = pristine.get(layerId);
    if (!layerDef || !base) {
      continue;
    }
    const w = writes.get(layerId);
    layerDef.colors = { ...base.colors, ...w?.colors };
    layerDef.colorsDarkMode = { ...base.colorsDarkMode, ...w?.colorsDark };
    layerDef.screenParameters = { ...base.screenParameters, ...w?.params };
    layerDef.glyphParameters = { ...base.glyphParameters, ...w?.glyphParams };
  }

  applyStartpointGeometry(model);
}

// The start-point chevron sits outside the node icon, so it needs the node
// size for two reasons: to clear the icon by a constant gap, and to scale its
// own ">" / "<" along with the node icons. The gap deliberately does NOT
// scale. This cross-token coupling lives outside the generic table pass.
function applyStartpointGeometry(model) {
  const layerDef = visualizationLayerDefinitions.find(
    (layerDef) => layerDef.identifier === "fontra.startpoint.indicator"
  );
  if (!layerDef) {
    return;
  }
  const base = getPristineLayerDefs().get("fontra.startpoint.indicator");
  const nodeScale = (model.nodeSize ?? NODE_SIZE_DEFAULT) / NODE_SIZE_DEFAULT;
  // user multiplier for the chevron size (1 = the designed default)
  const chevronScale = model.startpointChevronSize ?? 1;
  // merge over the CURRENT screenParameters (the generic pass may already
  // have written token params such as startpointChevronStrokeWidth)
  layerDef.screenParameters = {
    ...layerDef.screenParameters,
    cornerSize: model.nodeSize ?? NODE_SIZE_DEFAULT,
    smoothSize: model.nodeSize ?? NODE_SIZE_DEFAULT,
    gap: model.startpointChevronGap ?? layerDef.screenParameters.gap,
    chevronLength: base.screenParameters.chevronLength * nodeScale * chevronScale,
    chevronSpread: base.screenParameters.chevronSpread * nodeScale * chevronScale,
  };
}

// Drawing helpers

// Node type colors, designed to be DISTINCT from FontLab (blue/green/red
// nodes) and Glyphs.app (white/black nodes): violet rounds for smooth
// nodes, burnt-orange squares for corner nodes, neutral lavender for off-curve
// handles — echoing the keyboard dock's violet/yellow chip palette
//
// squircle is a distinct third kind and needs a hue that cannot be confused
// with the smooth node's violet: teal (#0D9488 light / #2DD4BF dark). Teal is
// ~180 deg away in hue from both the violet smooth node and the orange corner
// node, and keeps enough chroma to stay legible on white and black canvases
// alike. (An earlier pink/red #D6336C was rejected by the user; the original
// amber corner #D99A1F vanished against the white canvas, hence the darker
// burnt orange #C2410C light / #FB923C dark.)
const nodeTypeColors = {
  light: {
    smooth: "#7A4FE8",
    squircle: "#0D9488",
    corner: "#C2410C",
    handle: "#A0A0B0",
  },
  dark: {
    smooth: "#A78BFA",
    squircle: "#2DD4BF",
    corner: "#FB923C",
    handle: "#7E8290",
  },
};

function fillNode(
  context,
  pt,
  cornerNodeSize,
  smoothNodeSize,
  handleNodeSize,
  colors,
  axis
) {
  if (!pt.type && !pt.smooth) {
    fillSquareNode(context, pt, cornerNodeSize, colors?.cornerColor);
  } else if (!pt.type && pt.squircle) {
    // squircle node: curvature-continuous join. The icon IS a shape whose
    // curvature changes continuously -- shape equals meaning (see the design
    // note, section 3.2; Glyphs uses a star here, which we deliberately do not)
    fillSquircleNode(
      context,
      pt,
      smoothNodeSize,
      colors?.squircleColor ?? colors?.smoothColor,
      colors?.squircleExponent
    );
  } else if (!pt.type) {
    // smooth on-curve point (the old round dot): an eye oriented along
    // the curve tangent, its two pointed ends riding the curve
    if (axis) {
      fillEyeNode(context, pt, smoothNodeSize, colors?.smoothColor, axis);
    } else {
      fillRoundNode(context, pt, smoothNodeSize, colors?.smoothColor);
    }
  } else {
    if (colors?.handleShape === "diamond") {
      fillDiamondNode(context, pt, handleNodeSize, colors?.handleColor);
    } else {
      fillRoundNode(context, pt, handleNodeSize, colors?.handleColor);
    }
  }
}

function strokeNode(
  context,
  pt,
  cornerNodeSize,
  smoothNodeSize,
  handleNodeSize,
  colors,
  axis
) {
  if (!pt.type && !pt.smooth) {
    strokeSquareNode(context, pt, cornerNodeSize, colors?.cornerColor);
  } else if (!pt.type && pt.squircle) {
    strokeSquircleNode(
      context,
      pt,
      smoothNodeSize,
      colors?.squircleColor ?? colors?.smoothColor,
      colors?.squircleExponent
    );
  } else if (!pt.type) {
    if (axis) {
      strokeEyeNode(context, pt, smoothNodeSize, colors?.smoothColor, axis);
    } else {
      strokeRoundNode(context, pt, smoothNodeSize, colors?.smoothColor);
    }
  } else {
    if (colors?.handleShape === "diamond") {
      strokeDiamondNode(context, pt, handleNodeSize, colors?.handleColor);
    } else {
      strokeRoundNode(context, pt, handleNodeSize, colors?.handleColor);
    }
  }
}

// Diamond handle glyphs (the nodeHandleShapeDiamond setting): a rhombus with
// half-diagonals of nodeSize / 2, filled/stroked like the round variant.
export function fillDiamondNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.fillStyle = color;
  }
  const s = nodeSize / 2;
  context.beginPath();
  context.moveTo(pt.x, pt.y - s);
  context.lineTo(pt.x + s, pt.y);
  context.lineTo(pt.x, pt.y + s);
  context.lineTo(pt.x - s, pt.y);
  context.closePath();
  context.fill();
}

export function strokeDiamondNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.strokeStyle = color;
  }
  const s = nodeSize / 2;
  context.beginPath();
  context.moveTo(pt.x, pt.y - s);
  context.lineTo(pt.x + s, pt.y);
  context.lineTo(pt.x, pt.y + s);
  context.lineTo(pt.x - s, pt.y);
  context.closePath();
  context.stroke();
}

// Squircle node icon: the superellipse |x/a|^n + |y/b|^n = 1, i.e. a rounded
// square. It is the icon for curvature-continuous joins: the shape itself is a
// curve whose curvature changes continuously, so shape equals meaning -- see the
// design note "字体设计图例符号系统设计说明" section 3.2. Glyphs uses a
// five-pointed star for this case; we deliberately do not, because a star
// carries no intuition about curvature and is pure convention.
//
// The exponent n is FIXED at 3 (the designed rounded-square look; there was
// a user setting for a while, which was removed as meaningless -- the icon's
// shape is part of the node type language, not a preference):
// n = 1 diamond, 2 circle, 3 rounded square, higher = squarer.
// It travels through the layers' glyphParameters, so it is never zoom-scaled.

// The icon is based on the corner square's box (half-extent = nodeSize / 2),
// but scaled up slightly: a rounded square of the same side as a sharp square
// loses area at its corners and therefore reads a touch smaller, so the
// squircle is drawn SQUIRCLE_SIZE_FACTOR bigger to look equally substantial.
// (Inscribing by equal AREA instead would shrink it to ~58% of the box at
// n = 3 -- far too small, which is what it looked like at first.)
//
// The settings colour swatch keeps filling its own 1.7em box, so all the
// swatches stay aligned in one column; the swatch shows the shape, not the
// icon's exact scale relative to the square.
const SQUIRCLE_SIZE_FACTOR = 1.15;

function squircleHalfExtent(nodeSize) {
  return (nodeSize / 2) * SQUIRCLE_SIZE_FACTOR;
}

function squirclePath(context, pt, nodeSize, exponent) {
  const a = squircleHalfExtent(nodeSize);
  const n = exponent || SQUIRCLE_EXPONENT_DEFAULT;
  const STEPS = 72;
  context.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * 2 * Math.PI;
    const cx = Math.cos(t);
    const cy = Math.sin(t);
    // superellipse parameterisation
    const x = Math.sign(cx) * Math.pow(Math.abs(cx), 2 / n);
    const y = Math.sign(cy) * Math.pow(Math.abs(cy), 2 / n);
    const px = pt.x + x * a;
    const py = pt.y + y * a;
    if (i === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
}

export function fillSquircleNode(context, pt, nodeSize, color, exponent) {
  if (color !== undefined) {
    context.fillStyle = color;
  }
  squirclePath(context, pt, nodeSize, exponent);
  context.fill();
}

export function strokeSquircleNode(context, pt, nodeSize, color, exponent) {
  if (color !== undefined) {
    context.strokeStyle = color;
  }
  squirclePath(context, pt, nodeSize, exponent);
  context.stroke();
}

// Unit tangent axis for each smooth on-curve point (the old round dots):
// average of the incoming/outgoing segment directions (point → neighbor;
// the neighbor is the bezier handle for curves, the previous on-curve point
// for lines), so the eye's two pointed ends ride the curve in any
// direction. Degenerate cases fall back to the round dot.
function computeSmoothTangents(path) {
  const tangents = new Map();
  let contourStart = 0;
  for (const contourInfo of path.contourInfo) {
    const count = contourInfo.endPoint - contourStart + 1;
    for (let i = 0; i < count; i++) {
      const index = contourStart + i;
      const pt = path.getPoint(index);
      if (pt.type || !pt.smooth) {
        continue;
      }
      const prev =
        i > 0 || contourInfo.isClosed
          ? path.getPoint(contourStart + ((i - 1 + count) % count))
          : null;
      const next =
        i < count - 1 || contourInfo.isClosed
          ? path.getPoint(contourStart + ((i + 1) % count))
          : null;
      let ax = 0;
      let ay = 0;
      let have = false;
      if (prev) {
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.hypot(dx, dy);
        if (len > 1e-6) {
          ax = dx / len;
          ay = dy / len;
          have = true;
        }
      }
      if (next) {
        const dx = next.x - pt.x;
        const dy = next.y - pt.y;
        const len = Math.hypot(dx, dy);
        if (len > 1e-6) {
          if (have) {
            ax += dx / len;
            ay += dy / len;
          } else {
            ax = dx / len;
            ay = dy / len;
            have = true;
          }
        }
      }
      if (!have) {
        continue;
      }
      const len = Math.hypot(ax, ay);
      if (len < 1e-6) {
        continue;
      }
      tangents.set(index, { x: ax / len, y: ay / len });
    }
    contourStart += count;
  }
  return tangents;
}

// Eye (smooth-node) proportions live near the top of this file
// (EYE_HALF_LEN_FACTOR / EYE_HALF_WIDTH_FACTOR), next to the other node
// rendering constants.

function eyePath(context, pt, nodeSize, axis) {
  // pointed-oval (eye) through pt, long axis along `axis`; the two sharp
  // tips read as arrows riding the curve
  const halfLen = nodeSize * EYE_HALF_LEN_FACTOR;
  const halfWidth = nodeSize * EYE_HALF_WIDTH_FACTOR;
  const nx = -axis.y;
  const ny = axis.x;
  const control = halfWidth * 2; // quadratic bulge = control / 2
  context.beginPath();
  context.moveTo(pt.x - axis.x * halfLen, pt.y - axis.y * halfLen);
  context.quadraticCurveTo(
    pt.x + nx * control,
    pt.y + ny * control,
    pt.x + axis.x * halfLen,
    pt.y + axis.y * halfLen
  );
  context.quadraticCurveTo(
    pt.x - nx * control,
    pt.y - ny * control,
    pt.x - axis.x * halfLen,
    pt.y - axis.y * halfLen
  );
  context.closePath();
}

export function fillEyeNode(context, pt, nodeSize, color, axis) {
  if (color !== undefined) {
    context.fillStyle = color;
  }
  eyePath(context, pt, nodeSize, axis);
  context.fill();
}

export function strokeEyeNode(context, pt, nodeSize, color, axis) {
  if (color !== undefined) {
    context.strokeStyle = color;
  }
  eyePath(context, pt, nodeSize, axis);
  context.stroke();
}


function fillSquareNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.fillStyle = color;
  }
  context.fillRect(pt.x - nodeSize / 2, pt.y - nodeSize / 2, nodeSize, nodeSize);
}

export function fillRoundNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.fillStyle = color;
  }
  context.beginPath();
  context.arc(pt.x, pt.y, nodeSize / 2, 0, 2 * Math.PI, false);
  context.fill();
}

export function strokeSquareNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.strokeStyle = color;
  }
  context.strokeRect(pt.x - nodeSize / 2, pt.y - nodeSize / 2, nodeSize, nodeSize);
}

export function strokeRoundNode(context, pt, nodeSize, color) {
  if (color !== undefined) {
    context.strokeStyle = color;
  }
  context.beginPath();
  context.arc(pt.x, pt.y, nodeSize / 2, 0, 2 * Math.PI, false);
  context.stroke();
}

export function strokeLine(context, x1, y1, x2, y2) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function strokeLineDashed(context, x1, y1, x2, y2, pattern = [5, 5]) {
  context.beginPath();
  context.setLineDash(pattern);
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function strokeCircle(context, cx, cy, radius) {
  context.beginPath();
  context.arc(cx, cy, radius, 0, 2 * Math.PI, false);
  context.stroke();
}

function strokePolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const pt of points.slice(1)) {
    context.lineTo(pt.x, pt.y);
  }
  context.closePath();
  context.stroke();
}

function drawWithDoubleStroke(
  context,
  path,
  outerLineWidth,
  innerLineWidth,
  strokeStyle,
  fillStyle
) {
  context.lineJoin = "round";
  context.lineWidth = outerLineWidth;
  context.strokeStyle = strokeStyle;
  context.stroke(path);
  context.lineWidth = innerLineWidth;
  context.strokeStyle = "black";
  context.globalCompositeOperation = "destination-out";
  context.stroke(path);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = fillStyle;
  context.fill(path);
}

function lenientUnion(setA, setB) {
  if (!setA) {
    return setB || new Set();
  }
  if (!setB) {
    return setA || new Set();
  }
  return union(setA, setB);
}

function* iterPointsByIndex(path, pointIndices) {
  if (!pointIndices) {
    return;
  }
  for (const index of pointIndices) {
    const pt = path.getPoint(index);
    if (pt) {
      yield pt;
    }
  }
}

function* iterAnchorsPointsByIndex(anchors, anchorIndices) {
  if (!anchorIndices || !anchors.length) {
    return;
  }
  for (const index of anchorIndices) {
    if (anchors[index]) {
      yield anchors[index];
    }
  }
}

function* iterGuidelinesPointsByIndex(guidelines, guidelineIndices) {
  if (!guidelineIndices || !guidelines.length) {
    return;
  }
  for (const index of guidelineIndices) {
    if (guidelines[index]) {
      yield guidelines[index];
    }
  }
}

function* iterComponentOriginsByIndex(components, componentIndices) {
  if (!componentIndices) {
    return;
  }
  for (const index of componentIndices) {
    const compo = components[index];
    if (compo) {
      yield { x: compo.transformation.translateX, y: compo.transformation.translateY };
    }
  }
}

// {
//   identifier: "fontra.baseline",
//   name: "Baseline",
//   selectionFunc: glyphSelector("hovered")  // choice from all, unselected, hovered, selected, editing
//   selectionFilter: (positionedGlyph) => ...some condition...,  // OPTIONAL
//   zIndex: 50
//   screenParameters: {},  // in screen/pixel units
//   glyphParameters: {},  // in glyph units
//   colors: {},
//   colorsDarkMode: {},
//   draw: ({context, positionedGlyph, parameters, model, controller}) => { /* ... */ },
// }

function drawRoundRect(context, x, y, width, height, radii) {
  // older versions of Safari don't support roundRect,
  // so we use rect instead
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(x, y, width, height, radii);
  } else {
    context.rect(x, y, width, height);
  }
  context.fill();
}

function getTextVerticalCenter(context, text) {
  const metrics = context.measureText(text);
  return (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
}
