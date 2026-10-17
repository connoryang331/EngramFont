// L2 theme presets (docs/visual-settings-inventory.md §8.4): curated full
// color looks over the visual token system. A preset VALUES object covers all
// color/color-alpha model keys (so a preset can never leave "ink darker than
// the canvas" surprises); number/boolean tokens (sizes, toggles) are
// deliberately NOT included -- the user keeps their own sizes.
//
// Presets are defined as compact OVERRIDES in 8-digit hex (#rrggbbaa); the
// builder splits them into the model's rgb + alpha-percent keys via the token
// table, and fills every non-overridden color key with the table's current
// hand-tuned light default. Adding a token to VISUAL_TOKENS automatically
// adds it to every preset.
//
// Quality bar (qa/node-icons/test-preset-contrast.mjs): every structural mark
// (node colors, ink, guidelines, metrics, crosshair, marquee, anchors...)
// must reach WCAG 1.4.11 non-text contrast (3:1) against the preset's canvas;
// faint-by-design marks (grid, ghost path, under-stroke, zone fills...) are
// reported but not thresholded.

import { VISUAL_TOKENS, alphaKeyOf } from "./visual-tokens.js";
import { parseHexColor } from "./color-derive.js";

function rgb6(parsed) {
  const to2 = (c) =>
    Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0");
  return "#" + to2(parsed.r) + to2(parsed.g) + to2(parsed.b);
}

// current table defaults for every color-ish model key
function defaultColorSnapshot() {
  const values = {};
  for (const token of VISUAL_TOKENS) {
    if (token.type === "color" || token.type === "color-alpha") {
      values[token.key] = token.defaultLight;
      if (token.type === "color-alpha") {
        values[alphaKeyOf(token)] = token.defaultAlpha ?? 100;
      }
    }
  }
  return values;
}

// factory-default snapshot over ALL token keys (colors AND sizes/toggles) --
// used by the "Restore defaults" button in the preset card
export function buildDefaultTokenValues() {
  const values = {};
  for (const token of VISUAL_TOKENS) {
    if (token.type === "number" || token.type === "boolean") {
      values[token.key] = token.default;
    } else {
      values[token.key] = token.defaultLight;
      if (token.type === "color-alpha") {
        values[alphaKeyOf(token)] = token.defaultAlpha ?? 100;
      }
    }
  }
  return values;
}

// {tokenKey: "#rrggbb" | "#rrggbbaa"} -> full model-key snapshot
function presetValues(overrides) {
  const values = defaultColorSnapshot();
  for (const [key, hex] of Object.entries(overrides)) {
    const token = VISUAL_TOKENS.find((t) => t.key === key);
    const parsed = parseHexColor(hex);
    if (!token || !parsed) {
      console.warn(`theme-presets: unknown token "${key}" ignored`);
      continue;
    }
    values[key] = rgb6(parsed);
    if (token.type === "color-alpha") {
      values[alphaKeyOf(token)] = Math.round(parsed.a * 100);
    }
  }
  return values;
}

export const THEME_PRESETS = [
  {
    id: "high-contrast",
    displayName: "High contrast",
    values: presetValues({
      canvasBackgroundColor: "#FFFFFF",
      upmGridColor: "#A6A6A6",
      editPathStrokeColor: "#000000",
      contextGlyphColor: "#000000",
      selectedGlyphColor: "#000000",
      selectedGlyphOutlineColor: "#000000CC",
      selectedNodeColor: "#000000",
      nodeSmoothColor: "#5430C2",
      nodeSquircleColor: "#0B7A6B",
      nodeCornerColor: "#A63A08",
      nodeHandleColor: "#70708A",
      selectedHandleColor: "#70708A",
      handleLineColor: "#8A8A96",
      guidelineColor: "#00000099",
      fontGuidelineColor: "#0088BB",
      guidelineNodeSelectedColor: "#000000",
      baselineColor: "#00000073",
      lineMetricsColor: "#00000073",
      crosshairColor: "#333333",
      rectSelectSolidColor: "#000000",
      rectSelectDashColor: "#FFFFFF",
      anchorColor: "#666666",
      componentHoveredColor: "#999999",
      componentSelectedColor: "#555555",
      startpointChevronColor: "#6E6E6E",
    }),
  },
  {
    id: "low-noise",
    displayName: "Low noise (muted)",
    values: presetValues({
      canvasBackgroundColor: "#F4F4F1",
      upmGridColor: "#DEDED9",
      editPathStrokeColor: "#3D3D3D",
      contextGlyphColor: "#3D3D3D",
      selectedGlyphColor: "#3D3D3D",
      selectedGlyphOutlineColor: "#3D3D3D55",
      selectedNodeColor: "#1A1A1A",
      nodeSmoothColor: "#63639C",
      nodeSquircleColor: "#4F8A6E",
      nodeCornerColor: "#A5714F",
      nodeHandleColor: "#85858F",
      selectedHandleColor: "#4A4A55",
      handleLineColor: "#B0B0A8",
      guidelineColor: "#00000030",
      fontGuidelineColor: "#5A8A9E",
      baselineColor: "#0000004D",
      lineMetricsColor: "#0000004D",
      lineMetricsZoneColor: "#88AACC14",
      lineMetricsZoneStrokeColor: "#88AACC20",
      crosshairColor: "#8A8A8A",
      startpointChevronColor: "#78786E",
      anchorColor: "#8A8A8A",
      ghostPathColor: "#AAAAAA50",
      editingLayerOutlineColor: "#99999990",
      bgLayerOutlineColor: "#CCCCCC90",
      bgLayerNodesColor: "#D8D8D2",
      referenceFontColor: "#AAAAAA60",
    }),
  },
  {
    id: "warm-paper",
    displayName: "Warm paper",
    values: presetValues({
      canvasBackgroundColor: "#FAF2E6",
      upmGridColor: "#E4D6C0",
      editPathStrokeColor: "#33231A",
      contextGlyphColor: "#33231A",
      selectedGlyphColor: "#33231A",
      selectedGlyphOutlineColor: "#33231A66",
      selectedNodeColor: "#241A12",
      nodeSmoothColor: "#9A4E86",
      nodeSquircleColor: "#3F8C5F",
      nodeCornerColor: "#C25A1E",
      nodeHandleColor: "#A08060",
      selectedHandleColor: "#5A4632",
      handleLineColor: "#C4AE94",
      guidelineColor: "#5A3E1E55",
      fontGuidelineColor: "#C2801E",
      baselineColor: "#33231A44",
      lineMetricsColor: "#33231A44",
      lineMetricsZoneColor: "#E0982B1A",
      lineMetricsZoneStrokeColor: "#E0982B26",
      crosshairColor: "#8A7460",
      startpointChevronColor: "#A08868",
      anchorColor: "#8A7460",
    }),
  },
  {
    id: "cool-paper",
    displayName: "Cool paper",
    values: presetValues({
      canvasBackgroundColor: "#ECF2F8",
      upmGridColor: "#D4DEE8",
      editPathStrokeColor: "#1A2632",
      contextGlyphColor: "#1A2632",
      selectedGlyphColor: "#1A2632",
      selectedGlyphOutlineColor: "#1A263266",
      selectedNodeColor: "#101A24",
      nodeSmoothColor: "#4A6EE0",
      nodeSquircleColor: "#0E7FA8",
      nodeCornerColor: "#C05A28",
      nodeHandleColor: "#6E84A0",
      selectedHandleColor: "#32465C",
      handleLineColor: "#AEC2D4",
      guidelineColor: "#1E3A5C55",
      fontGuidelineColor: "#1E88C8",
      baselineColor: "#1A263244",
      lineMetricsColor: "#1A263244",
      lineMetricsZoneColor: "#2E9BFF1A",
      lineMetricsZoneStrokeColor: "#2E9BFF26",
      crosshairColor: "#6A8298",
      startpointChevronColor: "#7E94AA",
      anchorColor: "#6A8298",
    }),
  },
];

// registration hook for future preset packs (content, not code -- a pack
// file imported via the theme-pack importer stays the main distribution path)
export function registerThemePreset(preset) {
  if (THEME_PRESETS.some((existing) => existing.id === preset.id)) {
    console.warn(`registerThemePreset: duplicate id "${preset.id}" ignored`);
    return false;
  }
  THEME_PRESETS.push(preset);
  return true;
}
