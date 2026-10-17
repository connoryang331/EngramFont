import { ObservableController } from "./observable-object.ts";
import {
  VISUAL_TOKENS,
  VISUAL_TOKEN_COLOR_KEYS,
  alphaKeyOf,
  onVisualTokensRegistered,
} from "./visual-tokens.js";
import { normalizeHex6 } from "./color-derive.js";

function setupThemeOverride(value) {
  const rootElement = document.querySelector("html");
  rootElement.classList.remove("light-theme");
  rootElement.classList.remove("dark-theme");
  if (value !== "automatic") {
    rootElement.classList.add(value + "-theme");
  }
}

// Canvas background: the user's color is applied unconditionally as an inline
// --background-color on :root, which wins over the theme's light/dark
// definitions (core.css). One color for both themes, like every other color
// setting here. The default is pure white. (This token is applied as CSS, not
// via the visualization-layer token pass -- see visual-tokens.js.)
function setupCanvasBackgroundOverride(model) {
  const rootElement = document.querySelector("html");
  const value = model.canvasBackgroundColor;
  if (value) {
    rootElement.style.setProperty("--background-color", value);
  } else {
    rootElement.style.removeProperty("--background-color");
  }
}

// One-time migration: the node sizes used to be three separate settings
// (nodeCornerSize / nodeSmoothSize / nodeHandleSize). They are now a single
// nodeSize, since corner squares, smooth eyes and handles should all read as
// the same size. Copy whichever legacy value the user had, then drop the old
// keys.
(function migrateLegacyNodeSize() {
  const PREFIX = "engramfont-";
  try {
    if (localStorage.getItem(PREFIX + "nodeSize") === null) {
      const legacy =
        localStorage.getItem(PREFIX + "nodeSmoothSize") ??
        localStorage.getItem(PREFIX + "nodeCornerSize");
      if (legacy !== null) {
        localStorage.setItem(PREFIX + "nodeSize", legacy);
      }
    }
    localStorage.removeItem(PREFIX + "nodeCornerSize");
    localStorage.removeItem(PREFIX + "nodeSmoothSize");
    localStorage.removeItem(PREFIX + "nodeHandleSize");
    // the squircle exponent setting was removed (fixed n = 3)
    localStorage.removeItem(PREFIX + "nodeSquircleExponent");
    // superseded keys from the brief checkbox era of the canvas background
    localStorage.removeItem(PREFIX + "canvasBackgroundCustom");
  } catch (e) {
    // localStorage can be unavailable (private mode); the defaults still apply
  }
})();

// One-time cleanup: during a bug window the experimental Oklume picker
// overwrote/persisted color settings as oklch() strings (and one degenerate
// case wrote "undefined"). The native color picker needs #rrggbb -- anything
// else renders as black. Drop every color token key whose stored value does
// not start with "#", so the real defaults apply again; genuine hex picks are
// kept. The key list is DERIVED from VISUAL_TOKENS, so new color tokens are
// covered automatically.
(function migratePollutedColors() {
  const PREFIX = "engramfont-";
  try {
    for (const key of VISUAL_TOKEN_COLOR_KEYS) {
      const stored = localStorage.getItem(PREFIX + key);
      if (stored !== null && !stored.startsWith("#")) {
        localStorage.removeItem(PREFIX + key);
      }
    }
    // the ghost-node alpha must be numeric; also reset it ONCE to the
    // transparent default (the stored 100 came from the Oklume experiment)
    const alphaKey = PREFIX + "editingLayerNodesAlpha";
    const resetFlag = PREFIX + "ghostNodeAlphaReset";
    const alphaStored = localStorage.getItem(alphaKey);
    if (
      alphaStored === null ||
      isNaN(parseFloat(alphaStored)) ||
      localStorage.getItem(resetFlag) !== "1"
    ) {
      localStorage.removeItem(alphaKey);
      localStorage.setItem(resetFlag, "1");
    }
  } catch (e) {
    // localStorage can be unavailable (private mode); the defaults still apply
  }
})();

// The theme model's appearance defaults are DERIVED from VISUAL_TOKENS:
// color tokens default to their hand-tuned light value, color-alpha tokens
// carry a companion "<key>Alpha" percent, numbers/booleans their plain
// default. The token table is the single source of truth
// (docs/visual-settings-inventory.md §8).
const tokenModel = {};
for (const token of VISUAL_TOKENS) {
  if (token.type === "number" || token.type === "boolean") {
    tokenModel[token.key] = token.default;
  } else {
    tokenModel[token.key] = normalizeHex6(token.defaultLight);
    if (token.type === "color-alpha") {
      tokenModel[alphaKeyOf(token)] = token.defaultAlpha ?? 100;
    }
  }
}

export const themeController = new ObservableController({
  theme: "automatic",
  // name of the last imported theme pack / applied preset ("" = user's own)
  themePackName: "",
  // user-defined custom presets: [{id, name, values: {tokenKey: value}}]
  // persisted as JSON and cross-tab synced via the storage listener below
  themeCustomPresets: [],
  ...tokenModel,
});

themeController.synchronizeWithLocalStorage("engramfont-");

// Tokens registered AFTER load (registerVisualTokens -- our own later batches
// or future plug-ins) materialize their defaults into the live model here, so
// the applier and panel see complete values without a reload.
onVisualTokensRegistered((newTokens) => {
  for (const token of newTokens) {
    if (token.type === "number" || token.type === "boolean") {
      themeController.setItem(token.key, token.default);
    } else {
      themeController.setItem(token.key, normalizeHex6(token.defaultLight));
      if (token.type === "color-alpha") {
        themeController.setItem(alphaKeyOf(token), token.defaultAlpha ?? 100);
      }
    }
  }
});

themeController.addKeyListener("theme", (event) => {
  setupThemeOverride(themeController.model.theme);
});

setupThemeOverride(themeController.model.theme);

themeController.addKeyListener("canvasBackgroundColor", () => {
  setupCanvasBackgroundOverride(themeController.model);
});

setupCanvasBackgroundOverride(themeController.model);
