// R3 · virtual keyboard dock (meshfont-style, EngramFont port)
//
// Keymap authority: docs/specs/03-keyboard-dock/KEYMAP-VERIFIED.md (v5 final).
// The slider/colored keys are context-sensitive: in edit mode they target the
// glyph (anchors / placeholders), in proof mode the typesetting controls
// (letter/word spacing, line height).

import * as html from "@fontra/core/html-utils.js";
import { translate } from "@fontra/core/localization.js";
import { dialog, dialogSetup, message } from "@fontra/web-components/modal-dialog.js";
import "@fontra/web-components/inline-svg.js";
import { centeredRect, rectCenter } from "@fontra/core/rectangle.ts";
import { makeUPlusStringFromCodePoint } from "@fontra/core/utils.ts";
import { showMenu } from "@fontra/web-components/menu-panel.js";
import { getSuggestedGlyphName } from "@fontra/core/glyph-data.js";
import {
  addCanvasModeListener,
  isProofMode,
  setCanvasMode,
} from "./canvas-mode.js";

// shift variants for the number/punctuation rows (upper = shifted char)

// Row widths follow real ANSI geometry (each row totals 15 units): the wide
// modifiers sit at their physical positions — purple=Tab 1.5u, yellow=Caps
// 1.75u, red=left Shift 2.25u, green=right Shift 2.75u, DEL=Backspace 2u,
// blue=Enter 2.25u, \ = 1.5u — which produces the authentic row stagger
// (Q/A/Z step diagonally, not vertically aligned).
const U_CTRL = 1.25; // ctrl / win / alt / placeholder width

const DOCK_ROWS = [
// row1: digits + Backspace (DEL, 2u)
[
  { key: "`", shift: "~" }, { key: "1", shift: "!" }, { key: "2", shift: "@" },
  { key: "3", shift: "#" }, { key: "4", shift: "$" }, { key: "5", shift: "%" },
  { key: "6", shift: "^" }, { key: "7", shift: "&" }, { key: "8", shift: "*" },
  { key: "9", shift: "(" }, { key: "0", shift: ")" }, { key: "-", shift: "_" },
  { key: "=", shift: "+" },
  { special: "del", style: "orange", span: 2, locked: true },
],
// row2: Tab (purple) + q-row + \ (1.5u)
[
  { special: "purple", style: "purple", span: 1.5 },
  { key: "q" }, { key: "w" }, { key: "e" }, { key: "r" }, { key: "t" },
  { key: "y" }, { key: "u" }, { key: "i" }, { key: "o" }, { key: "p" },
  { key: "[", shift: "{" },
  { key: "]", shift: "}" },
  { key: "\\", shift: "|", span: 1.5 },
],
// row3: Caps (yellow) + a-row + Enter (blue, 2.25u)
[
  { special: "slider", style: "yellow", span: 1.75, slider: "yellow" },
  { key: "a" }, { key: "s" }, { key: "d" }, { key: "f" }, { key: "g" },
  { key: "h" }, { key: "j" }, { key: "k" }, { key: "l" },
  { key: ";", shift: ":" },
  { key: "'", shift: '"' },
  { special: "mode", style: "blue", span: 2.25, locked: true },
],
// row4: left Shift (red) + z-row + right Shift (green)
[
  { special: "slider", style: "red", span: 2.25, slider: "red" },
  { key: "z" }, { key: "x" }, { key: "c" }, { key: "v" }, { key: "b" },
  { key: "n" }, { key: "m" },
  { key: ",", shift: "<" },
  { key: ".", shift: ">" },
  { key: "/", shift: "?" },
  { special: "slider", style: "green", span: 2.75, slider: "green" },
],
// row5: ctrl / win / alt / space / move / 4 placeholder toggles (1.25u each)
[
  { key: "ctrl", special: "ctrl", style: "dark", span: U_CTRL },
  { special: "empty", style: "dark", disabled: true, span: U_CTRL },
  { key: "alt", special: "alt", style: "dark", span: U_CTRL },
  { special: "space", style: "dark", locked: true },
  { special: "move", style: "dark" },
  { special: "placeholder", style: "red", span: U_CTRL },
  { special: "placeholder", style: "yellow", span: U_CTRL },
  { special: "placeholder", style: "blue", span: U_CTRL },
  { special: "placeholder", style: "beige", span: U_CTRL },
],
];

// T3.7 split layout: per-row key index where the row is cut into the
// bottom-left and bottom-right clusters, at the authentic QWERTY seam
// (5/6, T/Y, G/H, B/N). The wide modifiers give each half the real row
// stagger; rows are outer-edge flush and step at the seam like real
// split-ergo boards.
const SPLIT_CUTS = [6, 6, 6, 6, 3];

// split mode: the left cluster gets its own space key (split-ergo style dual
// thumb keys); merged mode keeps the single wide space in the row.
const SPLIT_ROW5_CUT = 3;
const SPACE_SPAN_MERGED = 5;
const SPACE_SPAN_LEFT = 3.5;
const SPACE_SPAN_RIGHT = 2.5;
const MOVE_SPAN_MERGED = 1.25;
const MOVE_SPAN_SPLIT = 1.5;

// proof-mode slider specs (v5 context keymap)
const PROOF_SLIDERS = {
  yellow: {
    label: "letter-spacing",
    min: 0,
    max: 0.3,
    step: 0.005,
    get: (settings) => settings.letterSpacing ?? 0,
    set: (settings, value) => (settings.letterSpacing = value),
  },
  red: {
    label: "word-spacing",
    min: 0,
    max: 3,
    step: 0.05,
    get: (settings) => settings.wordSpacing ?? 1,
    set: (settings, value) => (settings.wordSpacing = value),
  },
  green: {
    label: "line-height",
    min: 0.5,
    max: 2,
    step: 0.05,
    get: (settings) => settings.lineHeight ?? 1,
    set: (settings, value) => (settings.lineHeight = value),
  },
};

const SHIFT_GLYPH_NAMES = {
  "~": "asciitilde", "!": "exclam", "@": "at", "#": "numbersign",
  $: "dollar", "%": "percent", "^": "asciicircum", "&": "ampersand",
  "*": "asterisk", "(": "parenleft", ")": "parenright", _: "underscore",
  "+": "plus", "{": "braceleft", "}": "braceright", "|": "bar",
  ":": "colon", '"': "quotedbl", "<": "less", ">": "greater",
  "?": "question",
};

// actions the user may bind to arbitrary keys (T3.8)
const DOCK_BINDABLE_ACTIONS = [
  { id: "zoom-100" },
  { id: "zoom-fit" },
  { id: "canvas-mode-proof" },
  { id: "canvas-mode-edit" },
];

// display names for bound actions in the settings dialog (English-only UI)
const BINDING_ACTION_LABELS = {
  "zoom-100": "Zoom to 100%",
  "zoom-fit": "Zoom to fit",
  "canvas-mode-proof": "Switch to proof mode",
  "canvas-mode-edit": "Switch to edit mode",
};

// physical keys replaced by font-function keys ("one key at a time"): each
// entry wires a key to NATIVE Fontra editor functions. A group of tools
// mirrors Fontra's native multi-tool button on ONE key position: the face
// icon is the current sub-tool, a quick click (re)selects it, and a long
// press / right click reveals the sub-tool options — same interaction as
// the native toolbar (which expands on hold/right-click and promotes the
// chosen sub-tool to the front).
const DOCK_FN_KEYS = {
  6: {
    titleKey: "editor.pointer-tools",
    tools: [
      {
        tool: "pointer-tool",
        icon: "/images/pointer.svg",
        titleKey: "editor.pointer-tool",
      },
      {
        tool: "pointer-tool-scale",
        icon: "/images/pointerscale.svg",
        titleKey: "editor.pointer-tool-scale",
        isSubtool: true,
      },
    ],
  },
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// html-utils' createDomElement assigns attributes as JS properties, which is
// a no-op for "aria-label" -> set the attribute explicitly
function withAriaLabel(element, label) {
  element.setAttribute("aria-label", label);
  return element;
}

export function glyphNameForCharacter(fontController, character) {
  // resolve via the font's cmap so "1" -> "one", "?" -> "question", ...
  if (!character) {
    return character;
  }
  const codePoint = character.codePointAt(0);
  for (const [glyphName, codePoints] of Object.entries(fontController.glyphMap)) {
    if (codePoints.includes(codePoint)) {
      return glyphName;
    }
  }
  return null;
}

export function defaultPreviewText(fontController) {
  // R5 §11: reset text = first 40 code-point-bearing glyphs in glyphMap order
  let text = "";
  for (const [glyphName, codePoints] of Object.entries(fontController.glyphMap)) {
    if (text.length >= 40) {
      break;
    }
    if (glyphName !== ".notdef" && codePoints?.length) {
      text += String.fromCodePoint(codePoints[0]);
    }
  }
  return text;
}

// keyboard layouts cycled by the handle: curved split (K860 arcs) ->
// straight split (neat rows) -> merged block -> arc
export const dockLayouts = ["arc", "straight", "merged"];

export const defaultDockLayout = "arc";

export class KeyboardDock {
  constructor(editorController) {
    this.editorController = editorController;
    this.collapsed =
      localStorage.getItem("engramfont-dock-collapsed") === "true";
    const storedLayout = localStorage.getItem("engramfont-dock-layout");
    // "split" was the pre-three-state value -> the straight layout
    this.layout = dockLayouts.includes(storedLayout)
      ? storedLayout
      : storedLayout === "split"
        ? "straight"
        : defaultDockLayout;
    this.bindings = JSON.parse(
      localStorage.getItem("engramfont-key-bindings") || "{}"
    );
    // day (light) keyboard theme is the default; the settings dialog flips it
    this.theme =
      localStorage.getItem("engramfont-dock-theme") === "dark"
        ? "dark"
        : "light";
    // whole-keyboard scale (0.6–1.6), set in the settings dialog
    const storedScale = parseFloat(localStorage.getItem("engramfont-dock-scale"));
    this.scale = Math.min(1.6, Math.max(0.6, storedScale || 1));
    // squircle corners: 0 = normal round corners, otherwise the superellipse
    // exponent (2 = classic squircle, higher = boxier); adjustable in the
    // settings dialog, applies to every key
    const storedSquircle = localStorage.getItem("engramfont-dock-squircle");
    const parsedSquircle = parseFloat(storedSquircle);
    this.squircle =
      storedSquircle === "true"
        ? 2 // legacy checkbox value
        : Number.isFinite(parsedSquircle) && parsedSquircle > 0
          ? Math.min(8, parsedSquircle)
          : 0;
    // key corner radius, its own slider in the settings dialog
    const storedRadius = parseFloat(localStorage.getItem("engramfont-dock-radius"));
    this.radius = Number.isFinite(storedRadius)
      ? Math.min(22, Math.max(0, storedRadius))
      : 6;
    // key outline width
    const storedOutlineWidth = parseFloat(
      localStorage.getItem("engramfont-dock-outline-width")
    );
    this.outlineWidth = Number.isFinite(storedOutlineWidth)
      ? Math.min(3, Math.max(0.5, storedOutlineWidth))
      : 1;
    // split layouts: distance between the keyboards and the browser edges
    const storedGap = parseFloat(localStorage.getItem("engramfont-dock-split-gap"));
    this.splitGap = Number.isFinite(storedGap)
      ? Math.min(40, Math.max(0, storedGap))
      : 12;
    // key label font size
    const storedFontSize = parseFloat(
      localStorage.getItem("engramfont-dock-font-size")
    );
    this.fontSize = Number.isFinite(storedFontSize)
      ? Math.min(24, Math.max(12, storedFontSize))
      : 16;
    this.altActive = false;
    this.ctrlActive = false;
    // function-key elements -> their DOCK_FN_KEYS definition
    this.fnKeyDefs = new Map();

    this.buildDom();
    this.applyLayout();
    this.applyTheme();
    this.applyScale();
    this.applySquircle();
    this.applyRadius();
    this.applyFontSize();
    this.applySplitGap();
    this.applyCollapsed();
    addCanvasModeListener(() => this.updateModeUI());
    this.updateModeUI();
  }

  buildDom() {
    const container = document.querySelector(".main-container");
    this.dockElement = html.div({ id: "keyboard-dock" }, []);
    container.appendChild(this.dockElement);

    // two cluster containers: merged mode holds one continuous keyboard in
    // the left cluster; split mode renders two separate curved half
    // keyboards (K860 style) floating over the canvas corners
    this.clusterLeft = html.div({ class: "kd-cluster kd-cluster-left" }, []);
    this.clusterRight = html.div({ class: "kd-cluster kd-cluster-right" }, []);
    this.halfLeft = html.div({ class: "kd-half kd-half-left" }, []);
    this.halfRight = html.div({ class: "kd-half kd-half-right" }, []);
    this.dockElement.appendChild(this.clusterLeft);
    this.dockElement.appendChild(this.clusterRight);
    this.dockElement.appendChild(this.halfLeft);
    this.dockElement.appendChild(this.halfRight);

    this.sliderElements = {};
    this.keyElements = DOCK_ROWS.map((row) => row.map((keyDef) => this.buildKey(keyDef)));
    this.spaceKeyLeft = this.buildKey({
      special: "space",
      style: "dark",
      span: SPACE_SPAN_LEFT,
      locked: true,
    });
    this.renderKeys();

    // collapse handle (the circle button re-appears once collapsed)
    const collapseHandle = withAriaLabel(
      html.button(
        {
          id: "kd-collapse-handle",
          title: translate("dock.toggle"),
        },
        ["–"]
      ),
      translate("dock.toggle")
    );
    collapseHandle.addEventListener("click", () => this.toggleCollapsed());
    this.dockElement.appendChild(collapseHandle);

    // keyboard settings handle (EngramFont original): pops the settings
    // dialog up in the middle of the screen (English-only UI by design)
    this.settingsHandle = withAriaLabel(
      html.button(
        {
          id: "kd-settings-handle",
          title: "Keyboard settings",
        },
        ["⚙︎"]
      ),
      "Keyboard settings"
    );
    this.settingsHandle.addEventListener("click", () => this.showSettingsDialog());
    this.dockElement.appendChild(this.settingsHandle);

    // collapse/expand button (stays visible when the dock is collapsed)
    this.collapseButton = withAriaLabel(
      html.button(
        {
          id: "dock-collapse-button",
          title: translate("dock.toggle"),
        },
        ["⌨"]
      ),
      translate("dock.toggle")
    );
    this.collapseButton.addEventListener("click", () => this.toggleCollapsed());
    container.appendChild(this.collapseButton);

    // keep the function keys' active state in sync with tool switches made
    // from Fontra's own toolbar or keyboard shortcuts (#edit-tools is the
    // native toolbar; every tool change toggles "selected" classes there)
    const nativeToolbar = document.querySelector("#edit-tools");
    if (nativeToolbar) {
      this.fnToolObserver = new MutationObserver(() => this.updateFnKeyStates());
      this.fnToolObserver.observe(nativeToolbar, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
    // the native tool setup ran before this dock was constructed, so the
    // observer above missed the initial selection — refresh once now
    this.updateFnKeyStates();
  }

  buildKey(keyDef) {
    const fnDef =
      keyDef.key !== undefined && !keyDef.special ? DOCK_FN_KEYS[keyDef.key] : undefined;
    const element = fnDef
      ? this.buildFnKey(keyDef, fnDef)
      : keyDef.key !== undefined && !keyDef.special
        ? this.buildCharacterKey(keyDef)
        : this.buildSpecialKey(keyDef);
    if (keyDef.span > 1) {
      element.style.setProperty("--kd-span", keyDef.span);
    }
    if (keyDef.style) {
      element.classList.add(`kd-style-${keyDef.style}`);
    }
    if (keyDef.disabled) {
      element.disabled = true;
      element.classList.add("kd-disabled");
    }
    if (keyDef.locked) {
      element.classList.add("kd-locked");
    }
    return element;
  }

  buildCharacterKey(keyDef) {
    const key = keyDef.key;
    const element = withAriaLabel(
      html.button(
        {
          class: "kd-key kd-char-key",
          "data-key": key,
        },
        []
      ),
      translate("dock.key.navigate", key)
    );
    if (keyDef.shift) {
      element.appendChild(html.div({ class: "kd-key-shift" }, [keyDef.shift]));
    }
    element.appendChild(html.div({ class: "kd-key-main" }, [key]));
    element.addEventListener("pointerdown", async (event) => {
      event.preventDefault();
      const shifted = event.shiftKey;
      const character = shifted ? keyDef.shift || key : key;
      if (this.dispatchBound(key, event)) {
        return;
      }
      const glyphName =
        glyphNameForCharacter(this.editorController.fontController, character) ||
        (shifted && SHIFT_GLYPH_NAMES[key]) ||
        (key.length === 1 && /\w/.test(key) ? key : null) ||
        (await getSuggestedGlyphName(character.codePointAt(0)));
      await this.navigateToGlyph(glyphName, character);
    });
    element.addEventListener("contextmenu", (event) =>
      this.showBindingMenu(event, keyDef, element)
    );
    return element;
  }

  buildFnKey(keyDef, fnDef) {
    // one key position mirroring Fontra's native multi-tool button (e.g. the
    // pointer tools): the face icon is the current sub-tool, a quick click
    // (re)selects it, and a long press / right click reveals the sub-tool
    // options — same interaction as the native toolbar
    const element = withAriaLabel(
      html.button(
        {
          class: "kd-key kd-char-key kd-fn-key kd-fn-multi",
          "data-fn": fnDef.tools.map((toolDef) => toolDef.tool).join(" "),
          title: translate(fnDef.titleKey),
        },
        []
      ),
      translate(fnDef.titleKey)
    );
    element.appendChild(
      html.createDomElement("inline-svg", {
        class: "kd-fn-icon",
        src: fnDef.tools[0].icon,
      })
    );
    this.fnKeyDefs.set(element, fnDef);
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      // native showSubTools: a 500ms hold reveals the sub-tools
      this._fnPressTimer = setTimeout(() => {
        this._fnPressTimer = null;
        this.showFnKeyOptions(fnDef, element);
      }, 500);
    });
    element.addEventListener("pointerup", () => {
      if (!this._fnPressTimer) {
        return; // options already open (or press ended elsewhere): no select
      }
      clearTimeout(this._fnPressTimer);
      this._fnPressTimer = null;
      if (this._fnFlyout) {
        return;
      }
      // native mouseup on the visible face: (re)select the current sub-tool
      const selected = this.editorController.selectedToolIdentifier;
      const face = fnDef.tools.find((toolDef) => toolDef.tool === selected);
      this.activateTool((face || fnDef.tools[0]).tool, face?.isSubtool);
    });
    element.addEventListener("pointerleave", () => {
      if (this._fnPressTimer) {
        clearTimeout(this._fnPressTimer);
        this._fnPressTimer = null;
      }
    });
    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      // native: right click reveals the sub-tools immediately
      this.showFnKeyOptions(fnDef, element);
    });
    return element;
  }

  showFnKeyOptions(fnDef, keyElement) {
    this.closeFnKeyOptions();
    const selected = this.editorController.selectedToolIdentifier;
    const options = html.div({ class: "kd-fn-options" }, []);
    // the flyout pops up ABOVE the key, so the array order renders
    // bottom-up: tools[0] (the face / default tool) ends up adjacent to the
    // key face, further tools stack above it
    for (const toolDef of [...fnDef.tools].reverse()) {
      const option = withAriaLabel(
        html.button(
          {
            class: "kd-fn-option",
            "data-tool": toolDef.tool,
            title: translate(toolDef.titleKey),
          },
          []
        ),
        translate(toolDef.titleKey)
      );
      if (toolDef.tool === selected) {
        option.classList.add("kd-active");
      }
      option.appendChild(
        html.createDomElement("inline-svg", {
          class: "kd-fn-icon",
          src: toolDef.icon,
        })
      );
      // the window closer closes on any mousedown — the option's own press
      // must not bubble into it (native stops the mousedown propagation too)
      option.addEventListener("pointerdown", (event) => {
        event.preventDefault();
      });
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      option.addEventListener("pointerup", (event) => {
        event.preventDefault();
        this.activateTool(toolDef.tool, toolDef.isSubtool);
        this.closeFnKeyOptions();
      });
      options.appendChild(option);
    }
    this.dockElement.appendChild(options);
    this._fnFlyout = options;
    // pop the options up above the key (drop below when there's no room)
    options.style.position = "fixed";
    const rect = keyElement.getBoundingClientRect();
    const flyWidth = options.offsetWidth;
    const flyHeight = options.offsetHeight;
    let left = rect.left + rect.width / 2 - flyWidth / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - flyWidth - 6));
    const top =
      rect.top - flyHeight - 8 >= 6 ? rect.top - flyHeight - 8 : rect.bottom + 8;
    options.style.left = `${Math.round(left)}px`;
    options.style.top = `${Math.round(top)}px`;
    // native collapseSubtoolsAndCleanUp: any mousedown or Escape closes
    this._fnFlyoutCloser = (event) => {
      if (event.type === "mousedown" || event.key === "Escape") {
        this.closeFnKeyOptions();
      }
    };
    window.addEventListener("mousedown", this._fnFlyoutCloser);
    window.addEventListener("keydown", this._fnFlyoutCloser);
  }

  closeFnKeyOptions() {
    if (this._fnFlyout) {
      this._fnFlyout.remove();
      this._fnFlyout = null;
    }
    if (this._fnFlyoutCloser) {
      window.removeEventListener("mousedown", this._fnFlyoutCloser);
      window.removeEventListener("keydown", this._fnFlyoutCloser);
      this._fnFlyoutCloser = null;
    }
  }

  activateTool(toolIdentifier, isSubtool = false) {
    // reproduce the native toolbar behavior: the tools only exist in edit
    // mode, and the canvas takes focus after the switch (like the native
    // tool-button clicks do)
    if (isProofMode()) {
      setCanvasMode("edit");
    }
    this.editorController.setSelectedTool(toolIdentifier, isSubtool);
    this.editorController.canvasController.canvas.focus();
    this.updateFnKeyStates();
  }

  updateFnKeyStates() {
    const selected = this.editorController.selectedToolIdentifier;
    for (const [element, fnDef] of this.fnKeyDefs) {
      const current = fnDef.tools.find((toolDef) => toolDef.tool === selected);
      element.classList.toggle("kd-active", !!current);
      // the face follows the selected group member, wherever it was chosen
      // (dock key, native toolbar, keyboard shortcut)
      if (current) {
        const icon = element.querySelector(".kd-fn-icon");
        if (icon && icon.getAttribute("src") !== current.icon) {
          icon.setAttribute("src", current.icon);
        }
      }
    }
  }

  buildSpecialKey(keyDef) {
    const element = withAriaLabel(
      html.button(
        {
          class: "kd-key kd-special-key",
          "data-special": keyDef.special,
        },
        []
      ),
      translate(`dock.key.${keyDef.special}`)
    );
    const label = {
      del: "DEL",
      mode: isProofMode() ? "edit" : "view",
      ctrl: "ctrl",
      alt: "alt",
      move: "move",
      space: "",
    }[keyDef.special] || "";
    if (label) {
      element.appendChild(html.div({ class: "kd-key-main" }, [label]));
    }
    if (keyDef.slider) {
      const thumb = html.div({ class: "kd-slider-thumb" }, []);
      element.classList.add("kd-slider");
      element.appendChild(thumb);
      this.sliderElements[keyDef.slider] = element;
      element.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.dragSlider(element, keyDef.slider, thumb, event);
      });
    } else {
      element.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (this.dispatchBound(keyDef.special, event)) {
          return;
        }
        this.handleSpecialKey(keyDef.special, event);
      });
    }
    if (!["empty", "placeholder"].includes(keyDef.special)) {
      element.addEventListener("contextmenu", (event) =>
        this.showBindingMenu(event, keyDef, element)
      );
    }
    return element;
  }

  updateSliderThumb(element, sliderKey) {
    const thumb = element.querySelector(".kd-slider-thumb");
    if (!isProofMode()) {
      thumb.style.left = "50%";
      return;
    }
    const spec = PROOF_SLIDERS[sliderKey];
    const value = spec.get(this.editorController.sceneSettingsController.model);
    thumb.style.left = `${clamp01((value - spec.min) / (spec.max - spec.min)) * 100}%`;
  }

  dragSlider(element, sliderKey, thumb, startEvent) {
    if (!isProofMode()) {
      return; // edit-mode slider semantics: thickness/anchors are P2/R6
    }
    const spec = PROOF_SLIDERS[sliderKey];
    const rect = element.getBoundingClientRect();
    const applyFromEvent = (event) => {
      const fraction = clamp01((event.clientX - rect.left) / rect.width);
      spec.set(this.editorController.sceneSettingsController.model, spec.min + fraction * (spec.max - spec.min));
      thumb.style.left = `${fraction * 100}%`;
    };
    applyFromEvent(startEvent);
    const moveHandler = (event) => applyFromEvent(event);
    const upHandler = () => {
      window.removeEventListener("pointermove", moveHandler);
      window.removeEventListener("pointerup", upHandler);
    };
    window.addEventListener("pointermove", moveHandler);
    window.addEventListener("pointerup", upHandler);
  }

  async handleSpecialKey(special, event) {
    switch (special) {
      case "del":
        this.resetText();
        break;
      case "space":
        this.appendSpace();
        break;
      case "mode":
        setCanvasMode(isProofMode() ? "edit" : "proof");
        break;
      case "ctrl":
        this.ctrlActive = !this.ctrlActive;
        event.currentTarget.classList.toggle("kd-active", this.ctrlActive);
        break;
      case "alt":
        // alt = remove anchors of the selected glyph (KEYMAP v3)
        await this.removeAnchors();
        break;
      case "move":
        this.togglePanMode(event.currentTarget);
        break;
      case "purple":
        this.togglePurple();
        break;
    }
  }

  async navigateToGlyph(glyphName, character) {
    const editorController = this.editorController;
    const fontController = editorController.fontController;
    if (glyphName && glyphName in fontController.glyphMap) {
      editorController.sceneSettings.selectedGlyph = {
        ...editorController.sceneSettings.selectedGlyph,
        glyphName,
        isEditing: !isProofMode(),
      };
    } else {
      await this.showDialogCreateGlyph(glyphName, character);
    }
  }

  async showDialogCreateGlyph(glyphName, character) {
    const fontController = this.editorController.fontController;
    if (fontController.readOnly) {
      await message(
        translate("dialog.cant-create-glyph.title", glyphName),
        translate("dialog.cant-edit-glyph.content")
      );
      return;
    }
    const uniString = makeUPlusStringFromCodePoint(character?.codePointAt(0));
    const charMsg = character
      ? translate("dialog.create-new-glyph.body.2", character, uniString)
      : "";
    const result = await dialog(
      translate("dialog.create-new-glyph.title", glyphName),
      translate("dialog.create-new-glyph.body", glyphName, charMsg),
      [
        { title: translate("dialog.cancel"), resultValue: "no", isCancelButton: true },
        { title: translate("dialog.create"), resultValue: "ok", isDefaultButton: true },
      ]
    );
    if (result === "ok") {
      await fontController.newGlyph(glyphName, character?.codePointAt(0), null, null);
      this.editorController.sceneSettings.selectedGlyph = {
        ...this.editorController.sceneSettings.selectedGlyph,
        glyphName,
        isEditing: !isProofMode(),
      };
    }
  }

  resetText() {
    this.editorController.sceneSettingsController.model.text = defaultPreviewText(
      this.editorController.fontController
    );
  }

  appendSpace() {
    this.editorController.sceneSettingsController.model.text += " ";
  }

  zoom100() {
    // 100%: magnification 1 (one font unit per screen pixel)
    const canvas = this.editorController.canvasController.canvas;
    const center = rectCenter(this.editorController.sceneSettings.viewBox);
    this.editorController.animateToViewBox(
      centeredRect(center.x, center.y, canvas.clientWidth, canvas.clientHeight)
    );
  }

  togglePanMode(button) {
    const isHand = this.editorController.selectedToolIdentifier === "hand-tool";
    this.editorController.setSelectedTool(isHand ? "pointer-tool" : "hand-tool");
    button?.classList.toggle("kd-active", !isHand);
  }

  togglePurple() {
    // edit: anchor visibility; proof: metric lines visibility (v5 keymap)
    const settings = this.editorController.visualizationLayersSettings;
    const layerID = isProofMode() ? "fontra.lineMetrics" : "fontra.anchors";
    settings.model[layerID] = !settings.model[layerID];
  }

  async removeAnchors() {
    const glyphName = this.editorController.sceneSettings.selectedGlyphName;
    if (!glyphName) {
      return;
    }
    await this.editorController.sceneController.editGlyphAndRecordChanges(
      (glyph) => {
        glyph.anchors = [];
        return "remove anchors";
      }
    );
  }

  updateModeUI() {
    const proof = isProofMode();
    this.dockElement.classList.toggle("kd-proof", proof);
    const modeKeyLabel = this.dockElement.querySelector(
      '[data-special="mode"] .kd-key-main'
    );
    if (modeKeyLabel) {
      modeKeyLabel.textContent = proof ? "edit" : "view";
    }
    for (const [sliderKey, element] of Object.entries(this.sliderElements)) {
      this.updateSliderThumb(element, sliderKey);
    }
    // belt & braces: tool keys reflect the current selection on mode switches
    this.updateFnKeyStates();
  }

  // ---- collapse/expand ----

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
    localStorage.setItem("engramfont-dock-collapsed", String(this.collapsed));
    this.applyCollapsed();
  }

  applyCollapsed() {
    this.dockElement.classList.toggle("kd-collapsed", this.collapsed);
    // the circle button shows only while the dock is collapsed
    this.collapseButton.classList.toggle("kd-collapsed", this.collapsed);
  }

  // ---- day/night keyboard theme (EngramFont original) ----

  applyTheme() {
    this.dockElement.classList.toggle("kd-theme-light", this.theme === "light");
    // class scope for the night-only surfaces (translucent keycaps) — kept
    // off the #id so :hover/.kd-active/space rules can override it
    this.dockElement.classList.toggle("kd-theme-dark", this.theme === "dark");
  }

  setTheme(value) {
    this.theme = value;
    localStorage.setItem("engramfont-dock-theme", value);
    this.applyTheme();
  }

  // ---- whole-keyboard scale (EngramFont original) ----

  applyScale() {
    // zoom (not transform: the fixed-position handles must stay put) on the
    // key containers only — the handle row keeps its size and centering
    for (const container of [
      this.clusterLeft,
      this.clusterRight,
      this.halfLeft,
      this.halfRight,
    ]) {
      container.style.zoom = String(this.scale);
    }
  }

  setScale(value) {
    this.scale = value;
    localStorage.setItem("engramfont-dock-scale", String(value));
    this.applyScale();
  }

  // ---- squircle (continuous) key corners (EngramFont original) ----

  applySquircle() {
    // needs an engine with corner-shape support; older ones just keep the
    // normal rounded corners (graceful degradation)
    this.dockElement.style.setProperty(
      "--kd-corner-shape",
      this.squircle > 0 ? `superellipse(${this.squircle})` : "round"
    );
  }

  setSquircle(value) {
    this.squircle = value;
    localStorage.setItem("engramfont-dock-squircle", String(value));
    this.applySquircle();
  }

  // ---- key corner radius (EngramFont original) ----

  applyRadius() {
    this.dockElement.style.setProperty("--kd-corner-radius", `${this.radius}px`);
  }

  setRadius(value) {
    this.radius = value;
    localStorage.setItem("engramfont-dock-radius", String(value));
    this.applyRadius();
  }

  // ---- key outline width (EngramFont original) ----

  applyOutlineWidth() {
    this.dockElement.style.setProperty(
      "--kd-key-outline-width",
      `${this.outlineWidth}px`
    );
  }

  setOutlineWidth(value) {
    this.outlineWidth = value;
    localStorage.setItem("engramfont-dock-outline-width", String(value));
    this.applyOutlineWidth();
  }

  // ---- split gap + key font size (EngramFont original) ----

  applyFontSize() {
    this.dockElement.style.setProperty(
      "--kd-key-font-size",
      `${this.fontSize}px`
    );
  }

  setFontSize(value) {
    this.fontSize = value;
    localStorage.setItem("engramfont-dock-font-size", String(value));
    this.applyFontSize();
  }

  applySplitGap() {
    // the distance between the split keyboards and the browser edges; the
    // arc half additionally uses it as its inner sidePad, so the VISUAL gap
    // is the same value in both split layouts
    const gap = `${this.splitGap}px`;
    if (this.layout === "straight") {
      this.dockElement.style.left = gap;
      this.dockElement.style.right = gap;
    } else {
      this.dockElement.style.left = "";
      this.dockElement.style.right = "";
    }
    if (this.layout === "arc") {
      this.halfLeft.style.left = "0px";
      this.halfRight.style.right = "0px";
      // the arc places its keys with sidePad = the gap; re-place them
      this.renderKeys();
    } else {
      this.halfLeft.style.left = "";
      this.halfRight.style.right = "";
    }
  }

  setSplitGap(value) {
    this.splitGap = value;
    localStorage.setItem("engramfont-dock-split-gap", String(value));
    this.applySplitGap();
  }

  // ---- keyboard settings dialog (EngramFont original) ----
  // English-only by design: no localization keys for this UI

  async showSettingsDialog() {
    const content = html.div({ class: "kd-settings" }, []);

    // layout (applies live)
    const layoutSection = html.div({ class: "kd-settings-section" }, []);
    layoutSection.appendChild(
      html.div({ class: "kd-settings-section-title" }, ["Layout"])
    );
    for (const value of dockLayouts) {
      const input = html.input({ type: "radio", name: "kd-layout", value });
      input.checked = this.layout === value;
      input.addEventListener("change", () => this.setLayout(value));
      layoutSection.appendChild(
        html.label({ class: "kd-settings-option" }, [
          input,
          translate(`dock.layout.${value}`),
        ])
      );
    }
    content.appendChild(layoutSection);

    // whole-keyboard scale (applies live)
    const scaleValue = html.span({ class: "kd-settings-scale-value" }, [
      `${Math.round(this.scale * 100)}%`,
    ]);
    const scaleInput = html.input({
      type: "range",
      min: "0.6",
      max: "1.6",
      step: "0.05",
    });
    scaleInput.value = String(this.scale);
    scaleInput.addEventListener("input", () => {
      const value = parseFloat(scaleInput.value);
      scaleValue.textContent = `${Math.round(value * 100)}%`;
      this.setScale(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Scale"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          scaleInput,
          scaleValue,
        ]),
      ])
    );

    // split layouts: distance between the keyboards and the browser edges
    const gapValue = html.span({ class: "kd-settings-scale-value" }, [
      `${this.splitGap}px`,
    ]);
    const gapInput = html.input({
      type: "range",
      min: "0",
      max: "40",
      step: "1",
    });
    gapInput.value = String(this.splitGap);
    gapInput.addEventListener("input", () => {
      const value = parseFloat(gapInput.value);
      gapValue.textContent = `${value}px`;
      this.setSplitGap(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Split gap"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          gapInput,
          gapValue,
        ]),
      ])
    );

    // key label font size
    const fontSizeValue = html.span({ class: "kd-settings-scale-value" }, [
      `${this.fontSize}px`,
    ]);
    const fontSizeInput = html.input({
      type: "range",
      min: "12",
      max: "24",
      step: "1",
    });
    fontSizeInput.value = String(this.fontSize);
    fontSizeInput.addEventListener("input", () => {
      const value = parseFloat(fontSizeInput.value);
      fontSizeValue.textContent = `${value}px`;
      this.setFontSize(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Font size"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          fontSizeInput,
          fontSizeValue,
        ]),
      ])
    );

    // corner style (squircle): an adjustable superellipse exponent that
    // applies to every key — 0 keeps the normal round corners
    const squircleValue = html.span({ class: "kd-settings-scale-value" }, [
      this.squircle > 0 ? String(this.squircle) : "off",
    ]);
    const squircleInput = html.input({
      type: "range",
      min: "0",
      max: "8",
      step: "0.5",
    });
    squircleInput.value = String(this.squircle);
    squircleInput.addEventListener("input", () => {
      const value = parseFloat(squircleInput.value);
      squircleValue.textContent = value > 0 ? String(value) : "off";
      this.setSquircle(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Squircle"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          squircleInput,
          squircleValue,
        ]),
      ])
    );

    // corner radius (works in every engine, squircle or not)
    const radiusValue = html.span({ class: "kd-settings-scale-value" }, [
      `${this.radius}px`,
    ]);
    const radiusInput = html.input({
      type: "range",
      min: "0",
      max: "22",
      step: "1",
    });
    radiusInput.value = String(this.radius);
    radiusInput.addEventListener("input", () => {
      const value = parseFloat(radiusInput.value);
      radiusValue.textContent = `${value}px`;
      this.setRadius(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Radius"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          radiusInput,
          radiusValue,
        ]),
      ])
    );

    // outline (border) width
    const outlineValue = html.span({ class: "kd-settings-scale-value" }, [
      `${this.outlineWidth}px`,
    ]);
    const outlineInput = html.input({
      type: "range",
      min: "0.5",
      max: "3",
      step: "0.5",
    });
    outlineInput.value = String(this.outlineWidth);
    outlineInput.addEventListener("input", () => {
      const value = parseFloat(outlineInput.value);
      outlineValue.textContent = `${value}px`;
      this.setOutlineWidth(value);
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Border width"]),
        html.div({ class: "kd-settings-option kd-settings-scale-row" }, [
          outlineInput,
          outlineValue,
        ]),
      ])
    );

    // day/night theme (applies live)
    const themeSection = html.div({ class: "kd-settings-section" }, []);
    themeSection.appendChild(
      html.div({ class: "kd-settings-section-title" }, ["Theme"])
    );
    for (const [value, label] of [
      ["light", "Day"],
      ["dark", "Night"],
    ]) {
      const input = html.input({ type: "radio", name: "kd-theme", value });
      input.checked = this.theme === value;
      input.addEventListener("change", () => this.setTheme(value));
      themeSection.appendChild(
        html.label({ class: "kd-settings-option" }, [input, label])
      );
    }
    content.appendChild(themeSection);

    // visibility
    const showInput = html.input({ type: "checkbox" });
    showInput.checked = !this.collapsed;
    showInput.addEventListener("change", () => {
      const wantCollapsed = !showInput.checked;
      if (wantCollapsed !== this.collapsed) {
        this.toggleCollapsed();
      }
    });
    content.appendChild(
      html.div({ class: "kd-settings-section" }, [
        html.div({ class: "kd-settings-section-title" }, ["Visibility"]),
        html.label({ class: "kd-settings-option" }, [
          showInput,
          "Show keyboard",
        ]),
      ])
    );

    // custom key bindings
    const bindingsSection = html.div({ class: "kd-settings-section" }, []);
    bindingsSection.appendChild(
      html.div({ class: "kd-settings-section-title" }, ["Custom key bindings"])
    );
    const boundEntries = Object.entries(this.bindings);
    const emptyNote = () =>
      html.div({ class: "kd-settings-bindings-empty" }, [
        "No custom bindings — right-click a key to add one",
      ]);
    if (!boundEntries.length) {
      bindingsSection.appendChild(emptyNote());
    }
    for (const [keyId, actionId] of boundEntries) {
      const row = html.div({ class: "kd-settings-binding-row" }, []);
      row.appendChild(html.span({ class: "kd-settings-binding-key" }, [keyId]));
      row.appendChild(
        html.span({ class: "kd-settings-binding-action" }, [
          BINDING_ACTION_LABELS[actionId] || actionId,
        ])
      );
      const removeButton = html.button(
        { class: "kd-settings-binding-remove", title: "Remove this binding" },
        ["✕"]
      );
      removeButton.addEventListener("click", () => {
        delete this.bindings[keyId];
        this.saveBindings();
        row.remove();
        const keyElement = this.dockElement.querySelector(
          `[data-key="${CSS.escape(keyId)}"], [data-special="${CSS.escape(keyId)}"]`
        );
        keyElement?.classList.remove("kd-bound");
      });
      row.appendChild(removeButton);
      bindingsSection.appendChild(row);
    }
    if (boundEntries.length) {
      const resetAll = html.button(
        { class: "kd-settings-bindings-reset" },
        ["Reset all"]
      );
      resetAll.addEventListener("click", () => {
        this.bindings = {};
        this.saveBindings();
        for (const element of this.dockElement.querySelectorAll(".kd-bound")) {
          element.classList.remove("kd-bound");
        }
        bindingsSection
          .querySelectorAll(".kd-settings-binding-row, .kd-settings-bindings-reset")
          .forEach((element) => element.remove());
        bindingsSection.appendChild(emptyNote());
      });
      bindingsSection.appendChild(resetAll);
    }
    content.appendChild(bindingsSection);

    const settingsDialog = await dialogSetup("Keyboard settings", null, [
      {
        title: "Done",
        resultValue: "done",
        isDefaultButton: true,
      },
    ]);
    settingsDialog.setContent(content);
    await settingsDialog.run();
  }

  // ---- split/merge layout (EngramFont original, T3.7) ----

  renderKeys() {
    // (re)distribute the key elements into the cluster containers;
    // appendChild re-parents, so all listeners on the keys survive
    this.clusterLeft.replaceChildren();
    this.clusterRight.replaceChildren();
    this.halfLeft.replaceChildren();
    this.halfRight.replaceChildren();
    // reset container visibility — each branch below re-adds as needed
    for (const container of [
      this.clusterLeft,
      this.clusterRight,
      this.halfLeft,
      this.halfRight,
    ]) {
      container.classList.remove("kd-hidden");
    }
    const split = this.layout !== "merged";

    // bottom-row spans differ per layout (merged: one 5u space; split: dual
    // 3.5u/2.5u spaces with a 1.5u move between them)
    const [spaceKey, moveKey] = this.keyElements[4].slice(3, 5);
    spaceKey.style.setProperty(
      "--kd-span",
      split ? SPACE_SPAN_RIGHT : SPACE_SPAN_MERGED
    );
    moveKey.style.setProperty(
      "--kd-span",
      split ? MOVE_SPAN_SPLIT : MOVE_SPAN_MERGED
    );

    if (this.layout === "arc") {
      this.renderArcKeys();
      this.clusterLeft.classList.add("kd-hidden");
      this.clusterRight.classList.add("kd-hidden");
      this.halfLeft.classList.remove("kd-hidden");
      this.halfRight.classList.remove("kd-hidden");
      return;
    }

    this.clusterLeft.classList.remove("kd-hidden");
    this.halfLeft.classList.add("kd-hidden");
    this.halfRight.classList.add("kd-hidden");
    // clear the arc layout's inline styles — they would break flow layout
    for (const rowElements of this.keyElements) {
      for (const keyElement of rowElements) {
        keyElement.style.position = "";
        keyElement.style.left = "";
        keyElement.style.top = "";
        keyElement.style.transform = "";
      }
    }
    this.spaceKeyLeft.style.position = "";
    this.spaceKeyLeft.style.left = "";
    this.spaceKeyLeft.style.top = "";
    this.spaceKeyLeft.style.transform = "";

    if (this.layout === "straight") {
      // neat split: two framed clusters anchored to the canvas corners,
      // rows cut at the QWERTY seam (fixed 52px keys, no stretching).
      // Split mode keeps dual thumb spaces: the left cluster gets its own
      // (bordered like the right one), as in the arc layout
      for (const [rowIndex, rowElements] of this.keyElements.entries()) {
        const cut = rowIndex === 4 ? SPLIT_ROW5_CUT : SPLIT_CUTS[rowIndex];
        const leftFragment = rowElements.slice(0, cut);
        if (rowIndex === 4) {
          leftFragment.push(this.spaceKeyLeft);
        }
        const fragments = [
          [this.clusterLeft, leftFragment],
          [this.clusterRight, rowElements.slice(cut)],
        ];
        for (const [host, fragment] of fragments) {
          const rowElement = html.div({ class: "kd-row" }, []);
          rowElement.dataset.row = rowIndex;
          host.appendChild(rowElement);
          for (const keyElement of fragment) {
            rowElement.appendChild(keyElement);
          }
        }
      }
      this.clusterRight.classList.remove("kd-hidden");
      return;
    }

    // merged: one continuous keyboard in the left cluster
    for (const [rowIndex, rowElements] of this.keyElements.entries()) {
      const rowElement = html.div({ class: "kd-row" }, []);
      rowElement.dataset.row = rowIndex;
      this.clusterLeft.appendChild(rowElement);
      for (const keyElement of rowElements) {
        rowElement.appendChild(keyElement);
      }
    }
    this.clusterRight.classList.add("kd-hidden");
  }

  buildSpaceArcButton(outerY, thetaStart, angularSpan, radius, frameX, mirror) {
    // K860-style spacebar: ONE continuously curved keycap drawn as an SVG
    // annular sector (outer arc + inner arc; rounded joins via a same-color
    // round stroke under the fill — MDN Paths recipe). The sector spans
    // [thetaStart, thetaStart + angularSpan] on the centerline `radius`
    // (thetaStart = the key's position along the row's arc).
    const keyHeight = 44;
    // the stroke only pads the geometry bbox (and, via CSS, takes the border
    // width setting); the outline's corner rounding is built into the path
    const strokeW = 12;
    const bandHalf = keyHeight / 2 - strokeW / 2; // path band; stroke pads it
    const ro = radius + bandHalf;
    const ri = radius - bandHalf;
    const cy = outerY + radius; // arc center is below the outer end

    const corner = (r, t) => {
      const x = frameX + (mirror ? -1 : 1) * r * Math.sin(t);
      const y = cy - r * Math.cos(t);
      return [x, y];
    };
    const [ax, ay] = corner(ro, thetaStart);
    const [bx, by] = corner(ro, thetaStart + angularSpan);
    const [cxx, cyy] = corner(ri, thetaStart + angularSpan);
    const [dx, dy] = corner(ri, thetaStart);
    // mirrored halves traverse the circle counter-clockwise on screen — the
    // sweep flags must flip, or the sector bows the wrong way (up instead of
    // sagging into the valley)
    const sweepOuter = mirror ? 0 : 1;
    const sweepInner = mirror ? 1 : 0;

    // the curved spacebar participates in the Radius / Squircle / Border
    // width settings: the outline gets corner fillets sized by the radius
    // setting, with the squircle exponent controlling how "full" each fillet
    // is, and the stroke width follows the border width setting (via CSS)
    const filletR = Math.max(
      0,
      Math.min(this.radius, bandHalf / 2, (ro * angularSpan) / 4)
    );
    const fullness = 0.55 + 0.05 * this.squircle;
    const unit = (from, to) => {
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      return [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
    };
    const toward = (point, other, dist) => {
      const [ux, uy] = unit(point, other);
      return [point[0] + ux * dist, point[1] + uy * dist];
    };
    const pull = (edge, cornerPoint) => [
      edge[0] + fullness * (cornerPoint[0] - edge[0]),
      edge[1] + fullness * (cornerPoint[1] - edge[1]),
    ];
    const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

    let pathD;
    if (filletR > 0.5) {
      // cut filletR into each edge at every corner and join with a cubic
      // whose handles sit on the edges — a round fillet at low squircle,
      // a fuller (boxier) one as the exponent rises
      const t0 = thetaStart;
      const t1 = thetaStart + angularSpan;
      const outStartArc = corner(ro, t0 + filletR / ro);
      const outEndArc = corner(ro, t1 - filletR / ro);
      const inEndArc = corner(ri, t1 - filletR / ri);
      const inStartArc = corner(ri, t0 + filletR / ri);
      const pOutStart = [ax, ay];
      const pOutEnd = [bx, by];
      const pInEnd = [cxx, cyy];
      const pInStart = [dx, dy];
      const eOutStart = toward(pOutStart, pInStart, filletR);
      const eOutEnd = toward(pOutEnd, pInEnd, filletR);
      const eInEnd = toward(pInEnd, pOutEnd, filletR);
      const eInStart = toward(pInStart, pOutStart, filletR);
      pathD =
        `M ${fmt(outStartArc)} ` +
        `A ${ro} ${ro} 0 0 ${sweepOuter} ${fmt(outEndArc)} ` +
        `C ${fmt(pull(outEndArc, pOutEnd))} ${fmt(pull(eOutEnd, pOutEnd))} ${fmt(eOutEnd)} ` +
        `L ${fmt(eInEnd)} ` +
        `A ${ri} ${ri} 0 0 ${sweepInner} ${fmt(inStartArc)} ` +
        `C ${fmt(pull(inStartArc, pInStart))} ${fmt(pull(eInStart, pInStart))} ${fmt(eInStart)} ` +
        `L ${fmt(eOutStart)} ` +
        `C ${fmt(pull(eOutStart, pOutStart))} ${fmt(pull(outStartArc, pOutStart))} ${fmt(outStartArc)} Z`;
    } else {
      pathD = `M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${ro} ${ro} 0 0 ${sweepOuter} ${bx.toFixed(1)} ${by.toFixed(1)} L ${cxx.toFixed(1)} ${cyy.toFixed(1)} A ${ri} ${ri} 0 0 ${sweepInner} ${dx.toFixed(1)} ${dy.toFixed(1)} Z`;
    }

    const minX = Math.min(ax, bx, cxx, dx) - strokeW / 2;
    const minY = Math.min(ay, by, cyy, dy) - strokeW / 2;
    const maxX = Math.max(ax, bx, cxx, dx) + strokeW / 2;
    const maxY = Math.max(ay, by, cyy, dy) + strokeW / 2;
    const width = maxX - minX;
    const height = maxY - minY;

    const button = withAriaLabel(
      html.button(
        {
          class: "kd-key kd-special-key kd-style-dark kd-locked kd-arc-space",
          "data-special": "space",
        },
        []
      ),
      translate("dock.key.space")
    );
    button.style.width = `${Math.round(width)}px`;
    button.style.height = `${Math.round(height)}px`;
    button.style.border = "none";
    button.style.background = "transparent";
    button.style.padding = "0";
    // fill/stroke colors come from the .kd-space-path CSS rule (theme vars)
    button.innerHTML = `<svg width="${Math.round(width)}" height="${Math.round(
      height
    )}" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(
      1
    )} ${height.toFixed(1)}"><path class="kd-space-path" d="${pathD}" stroke-width="${strokeW}" stroke-linejoin="round" paint-order="stroke fill"/></svg>`;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.appendSpace();
    });
    return { button, bbox: { minX, minY, maxX, maxY } };
  }

  renderArcKeys() {
    // K860-style valley split (reference photo): each half's rows are arcs
    // whose high point is the OUTER edge, sagging down towards the central
    // valley — the per-row arc center sits above the outer end. Outer edges
    // of all rows stack flush (Backspace/Enter/right-Shift right edges align
    // like the real board), and because the bottom rows are longer they sag
    // deeper, forming the V-shaped valley at the seam. Keys rotate along the
    // tangent, tilting into the valley.
    const halfLeft = this.halfLeft;
    const halfRight = this.halfRight;
    halfLeft.replaceChildren();
    halfRight.replaceChildren();

    const keyGap = 6;
    const keyHeight = 44;
    const rowHeight = keyHeight + 8;
    const radius = 1600; // sag of the rows into the valley
    // the inner side padding IS the split gap: it keeps the arc's visual
    // browser-edge distance equal to the straight layout's
    const sidePad = this.splitGap;
    const topPad = 16;
    const bottomPad = 14;
    const seamGap = 70; // horizontal gap between the halves

    const keyWidthPx = (span) => 52 * span + (span - 1) * keyGap;
    const spanOf = (keyElement) =>
      parseFloat(keyElement.style.getPropertyValue("--kd-span")) || 1;

    const halves = this.keyElements.map((rowElements, rowIndex) => {
      const cut = rowIndex === 4 ? SPLIT_ROW5_CUT : SPLIT_CUTS[rowIndex];
      const left = [...rowElements.slice(0, cut)];
      if (rowIndex === 4) {
        left.push(this.spaceKeyLeft);
      }
      const right = rowElements.slice(cut);
      return { left, right };
    });

    const leftPlacements = [];
    const rightPlacements = [];
    let leftMaxX = 0;
    let rightMaxX = 0;
    let leftMaxY = 0;
    let rightMaxY = 0;

    for (const [rowIndex, { left, right }] of halves.entries()) {
      const outerY = topPad + rowIndex * rowHeight;

      // LEFT half: array order = outer -> seam; the arc descends to the
      // right (keys rotate clockwise, tilting into the valley)
      let cursor = 0;
      let leftFrameX = sidePad; // screen x of every row's outer end
      for (const keyElement of left) {
        if (keyElement.dataset.special === "space") {
          // wide space: ONE continuously curved SVG annular-sector keycap;
          // the +2 keeps the alt gap: the thicker corner stroke spreads the
          // keycap 2px further along the arc than the old 8px stroke did
          const angularSpan = keyWidthPx(SPACE_SPAN_LEFT) / radius;
          const { button, bbox } = this.buildSpaceArcButton(
            outerY,
            cursor + (keyGap * 1.5 + 2) / radius,
            angularSpan,
            radius,
            leftFrameX,
            false
          );
          leftMaxX = Math.max(leftMaxX, bbox.maxX - sidePad);
          leftMaxY = Math.max(leftMaxY, bbox.maxY);
          leftPlacements.push({
            keyElement: button,
            screenLeft: bbox.minX,
            screenTop: bbox.minY,
            isSvg: true,
          });
          cursor += angularSpan;
          continue;
        }
        const width = keyWidthPx(spanOf(keyElement));
        const delta = (width + keyGap) / radius;
        const angle = cursor + delta / 2;
        cursor += delta;
        const x = radius * Math.sin(angle);
        const y = outerY + radius * (1 - Math.cos(angle));
        leftMaxX = Math.max(leftMaxX, x + width / 2);
        leftMaxY = Math.max(leftMaxY, y + keyHeight / 2);
        leftPlacements.push({ keyElement, x, y, rot: angle, width });
      }

      // RIGHT half: mirrored — the arc descends to the left (rotation
      // -angle); rows are right-flush: the outer end of every row sits at
      // the same right edge, like Backspace/Enter/right-Shift on a real board
      cursor = 0;
      const rightFrameX = sidePad + rightMaxX; // screen x of the outer ends
      for (const keyElement of [...right].reverse()) {
        // user-tuned: the blue placeholder sits ~2px low on the arc here
        const nudgeY =
          keyElement.dataset.special === "placeholder" &&
          keyElement.classList.contains("kd-style-blue")
            ? -2
            : 0;
        if (keyElement.dataset.special === "space") {
          // wide space: ONE continuously curved SVG annular-sector keycap
          // (the +2 compensates the thicker corner stroke, as on the left)
          const angularSpan = keyWidthPx(SPACE_SPAN_RIGHT) / radius;
          const { button, bbox } = this.buildSpaceArcButton(
            outerY,
            cursor + (keyGap * 1.5 + 2) / radius,
            angularSpan,
            radius,
            rightFrameX,
            true
          );
          rightMaxY = Math.max(rightMaxY, bbox.maxY);
          rightPlacements.push({
            keyElement: button,
            screenLeft: bbox.minX,
            screenTop: bbox.minY,
            isSvg: true,
            isRight: true,
          });
          cursor += angularSpan;
          continue;
        }
        const width = keyWidthPx(spanOf(keyElement));
        const delta = (width + keyGap) / radius;
        const angle = cursor + delta / 2;
        cursor += delta;
        const x = radius * Math.sin(angle);
        const y = outerY + radius * (1 - Math.cos(angle)) + nudgeY;
        rightMaxX = Math.max(rightMaxX, x + width / 2);
        rightMaxY = Math.max(rightMaxY, y + keyHeight / 2);
        rightPlacements.push({
          keyElement,
          x,
          y,
          rot: -angle,
          width,
          isRight: true,
        });
      }
    }

    halfLeft.style.width = `${Math.round(leftMaxX + sidePad * 2)}px`;
    halfLeft.style.height = `${Math.round(leftMaxY + bottomPad)}px`;
    halfRight.style.width = `${Math.round(rightMaxX + sidePad * 2)}px`;
    halfRight.style.height = `${Math.round(rightMaxY + bottomPad)}px`;

    for (const placement of [...leftPlacements, ...rightPlacements]) {
      if (placement.isSvg) {
        const { keyElement, screenLeft, screenTop, isRight } = placement;
        keyElement.style.position = "absolute";
        keyElement.style.left = `${Math.round(screenLeft)}px`;
        keyElement.style.top = `${Math.round(screenTop)}px`;
        (isRight ? halfRight : halfLeft).appendChild(keyElement);
        continue;
      }
      const { keyElement, x, y, rot, width, isRight } = placement;
      keyElement.style.position = "absolute";
      keyElement.style.left = isRight
        ? `${Math.round(sidePad + (rightMaxX - x) - width / 2)}px`
        : `${Math.round(sidePad + x - width / 2)}px`;
      keyElement.style.top = `${Math.round(y - keyHeight / 2)}px`;
      keyElement.style.transform = `rotate(${((rot * 180) / Math.PI).toFixed(2)}deg)`;
      (isRight ? halfRight : halfLeft).appendChild(keyElement);
    }
  }

  applyLayout() {
    this.dockElement.classList.toggle("kd-straight", this.layout === "straight");
    this.dockElement.classList.toggle("kd-arc", this.layout === "arc");
    // the split gap is applied as inline insets scoped to the active layout
    this.applySplitGap();
  }

  setLayout(value) {
    this.layout = value;
    localStorage.setItem("engramfont-dock-layout", value);
    this.renderKeys();
    this.applyLayout();
    this.updateModeUI();
  }

  // ---- custom key bindings (EngramFont original, T3.8) ----

  dispatchBound(keyId, event) {
    const actionId = this.bindings[keyId];
    if (!actionId) {
      return false;
    }
    this.runBoundAction(actionId);
    return true;
  }

  runBoundAction(actionId) {
    const editorController = this.editorController;
    switch (actionId) {
      case "zoom-100":
        this.zoom100();
        break;
      case "zoom-fit":
        editorController.zoomFit();
        break;
      case "canvas-mode-proof":
        setCanvasMode("proof");
        break;
      case "canvas-mode-edit":
        setCanvasMode("edit");
        break;
    }
  }

  showBindingMenu(event, keyDef, element) {
    event.preventDefault();
    if (keyDef.locked || keyDef.disabled || keyDef.special === "slider") {
      return;
    }
    const keyId = keyDef.key || keyDef.special;
    const items = [
      {
        title: translate("dock.bindings.reset"),
        callback: () => {
          delete this.bindings[keyId];
          this.saveBindings();
          element.classList.remove("kd-bound");
        },
      },
    ];
    for (const action of DOCK_BINDABLE_ACTIONS) {
      items.push({
        title: translate(`dock.bindings.action.${action.id}`),
        callback: () => {
          this.bindings[keyId] = action.id;
          this.saveBindings();
          element.classList.add("kd-bound");
        },
      });
    }
    showMenu(items, { x: event.clientX, y: event.clientY });
  }

  saveBindings() {
    localStorage.setItem(
      "engramfont-key-bindings",
      JSON.stringify(this.bindings)
    );
  }
}
