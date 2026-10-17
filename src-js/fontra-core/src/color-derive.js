// Color derivation for the visual-token theme system (see
// docs/visual-settings-inventory.md §8.3): when the user overrides a canvas
// foreground color (node, stroke, guideline, ...), the DARK theme color is
// DERIVED instead of reusing the light value, so the dark canvas keeps both
// legibility and the color's identity ("the same kind of color, tuned for a
// dark background").
//
// Method: keep hue H and chroma C (OKLCH), binary-search the lightness L so
// that the contrast ratio of the alpha-BLENDED color against the dark canvas
// matches the original color's contrast against the light canvas. Canvas
// compositing happens in gamma-encoded sRGB space, so blending is done there
// and the contrast is computed on the blended result. The stored/persisted
// format stays sRGB hex -- OKLCH is internal only, there is no OKLCH picker.
//
// Pure functions, no DOM. Direction note: on a dark canvas the derived L is
// HIGHER than the original (e.g. #7A4FE8 -> ~#A78BFA); it is the canvas
// background that gets darker, not the foreground.

function srgbChannelToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, v * 255)));
}

// Björn Ottosson's OKLab matrices (public domain), linear sRGB in/out.
function linearRgbToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// "#RGB" "#RGBA" "#RRGGBB" "#RRGGBBAA" -> {r, g, b, a} (0-255, a 0-1), or null.
export function parseHexColor(str) {
  if (typeof str !== "string") {
    return null;
  }
  let s = str.trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (s.length !== 6 && s.length !== 8) {
    return null;
  }
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    return null;
  }
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
    a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
  };
}

export function rgbToHex(r, g, b, a = 1) {
  const hex =
    "#" +
    [r, g, b]
      .map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0"))
      .join("");
  return a >= 1 ? hex : hex + Math.round(a * 255).toString(16).padStart(2, "0");
}

// Normalize any hex input to 6-digit "#rrggbb" (drops alpha), or null.
export function normalizeHex6(str) {
  const parsed = parseHexColor(str);
  return parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : null;
}

function relativeLuminance(r255, g255, b255) {
  return (
    0.2126 * srgbChannelToLinear(r255) +
    0.7152 * srgbChannelToLinear(g255) +
    0.0722 * srgbChannelToLinear(b255)
  );
}

export function contrastRatio(rgb1, rgb2) {
  const y1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const y2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const [hi, lo] = y1 >= y2 ? [y1, y2] : [y2, y1];
  return (hi + 0.05) / (lo + 0.05);
}

// Alpha compositing in gamma-encoded sRGB space (what canvas 2D does).
function blendOver(rgb, alpha, canvasRgb) {
  return {
    r: rgb.r * alpha + canvasRgb.r * (1 - alpha),
    g: rgb.g * alpha + canvasRgb.g * (1 - alpha),
    b: rgb.b * alpha + canvasRgb.b * (1 - alpha),
  };
}

function oklchToSrgb(L, C, H) {
  const rad = (H * Math.PI) / 180;
  const linear = oklabToLinearRgb(L, C * Math.cos(rad), C * Math.sin(rad));
  return {
    r: linearChannelToSrgb(linear[0]),
    g: linearChannelToSrgb(linear[1]),
    b: linearChannelToSrgb(linear[2]),
    ok: linear.every((c) => c >= -0.0001 && c <= 1.0001),
  };
}

// Reduce chroma until the color fits into sRGB gamut at this lightness.
function clampChroma(L, C, H) {
  let lo = 0;
  let hi = C;
  let best = oklchToSrgb(L, 0, H);
  if (C <= 0) {
    return best;
  }
  if (oklchToSrgb(L, C, H).ok) {
    return oklchToSrgb(L, C, H);
  }
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklchToSrgb(L, mid, H);
    if (candidate.ok) {
      best = candidate;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

// OKLab ΔE: Euclidean distance in OKLab space (L, a, b) -- used by the theme
// preset QA matrix to verify that node-type colors stay perceptually distinct.
export function deltaEOklab(hex1, hex2) {
  const c1 = parseHexColor(hex1);
  const c2 = parseHexColor(hex2);
  if (!c1 || !c2) {
    return NaN;
  }
  const lab1 = linearRgbToOklab(
    srgbChannelToLinear(c1.r),
    srgbChannelToLinear(c1.g),
    srgbChannelToLinear(c1.b)
  );
  const lab2 = linearRgbToOklab(
    srgbChannelToLinear(c2.r),
    srgbChannelToLinear(c2.g),
    srgbChannelToLinear(c2.b)
  );
  return Math.sqrt(
    (lab1.L - lab2.L) ** 2 +
      (lab1.a - lab2.a) ** 2 +
      (lab1.b - lab2.b) ** 2
  );
}

// Derive the dark-theme counterpart of `colorStr`: same OKLCH hue/chroma,
// lightness solved so the alpha-blended contrast against `darkCanvasHex`
// matches the original's contrast against `lightCanvasHex`. Returns a hex
// string with the SAME alpha as the input ("#rrggbb" or "#rrggbbaa").
export function deriveDarkColor(
  colorStr,
  lightCanvasHex = "#FFFFFF",
  darkCanvasHex = "#333333"
) {
  const parsed = parseHexColor(colorStr);
  const lightCanvas = parseHexColor(lightCanvasHex) ?? parseHexColor("#FFFFFF");
  const darkCanvas = parseHexColor(darkCanvasHex) ?? parseHexColor("#333333");
  if (!parsed) {
    return colorStr; // not a hex color ("transparent", ...) -- pass through
  }
  const { r, g, b, a } = parsed;
  if (a <= 0) {
    return colorStr; // fully transparent: nothing visible to derive
  }

  const source = { r, g, b };
  const effectiveLight = blendOver(source, a, lightCanvas);
  const targetContrast = contrastRatio(effectiveLight, lightCanvas);

  const lab = linearRgbToOklab(
    srgbChannelToLinear(r),
    srgbChannelToLinear(g),
    srgbChannelToLinear(b)
  );
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const hue = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

  // SIDE-FLIP rule: a mark that stands out against the LIGHT canvas by CR
  // stands out against the DARK canvas on the OPPOSITE side (brighter than
  // it) by the same ratio. A black outline on white becomes a near-white
  // outline on near-black -- never black-on-black. Target luminance:
  //   Y_d = CR * (Y_canvasDark + 0.05) - 0.05
  const yDarkCanvas = relativeLuminance(darkCanvas.r, darkCanvas.g, darkCanvas.b);
  const yTarget = Math.min(
    1,
    Math.max(0, targetContrast * (yDarkCanvas + 0.05) - 0.05)
  );

  // Luminance is monotonic in OKLCH lightness L, so a binary search on L
  // hitting yTarget (on the alpha-blended effective color) is well-behaved.
  // bestCandidate tracks the smallest L that reaches the target luminance.
  let lo = 0;
  let hi = 1;
  let bestCandidate = clampChroma(1, chroma, hue); // fallback: the lightest match
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const candidate = clampChroma(mid, chroma, hue);
    const effective = blendOver(candidate, a, darkCanvas);
    const yEffective = relativeLuminance(effective.r, effective.g, effective.b);
    if (yEffective < yTarget) {
      lo = mid;
    } else {
      bestCandidate = candidate;
      hi = mid;
    }
    if (hi - lo < 0.002) {
      break;
    }
  }

  // Un-blend the effective color back to the pure output color so that
  // compositing the result over the dark canvas reproduces the target.
  let out;
  if (a >= 1) {
    out = bestCandidate;
  } else {
    out = {
      r: (bestCandidate.r - darkCanvas.r * (1 - a)) / a,
      g: (bestCandidate.g - darkCanvas.g * (1 - a)) / a,
      b: (bestCandidate.b - darkCanvas.b * (1 - a)) / a,
    };
    out.r = Math.min(255, Math.max(0, out.r));
    out.g = Math.min(255, Math.max(0, out.g));
    out.b = Math.min(255, Math.max(0, out.b));
  }

  return rgbToHex(out.r, out.g, out.b, a);
}
