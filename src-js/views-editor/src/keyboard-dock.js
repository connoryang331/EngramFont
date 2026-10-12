// R3 · virtual keyboard dock (meshfont-style, EngramFont port)
//
// Keymap authority: docs/specs/03-keyboard-dock/KEYMAP-VERIFIED.md (v5 final).
// The slider/colored keys are context-sensitive: in edit mode they target the
// glyph (anchors / placeholders), in proof mode the typesetting controls
// (letter/word spacing, line height).

import * as html from "@fontra/core/html-utils.js";
import { translate } from "@fontra/core/localization.js";
import { dialog, message } from "@fontra/web-components/modal-dialog.js";
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
const DOCK_ROWS = [
  // row1: digits + DEL (orange, 2 keys wide)
  [
    { key: "`", shift: "~" }, { key: "1", shift: "!" }, { key: "2", shift: "@" },
    { key: "3", shift: "#" }, { key: "4", shift: "$" }, { key: "5", shift: "%" },
    { key: "6", shift: "^" }, { key: "7", shift: "&" }, { key: "8", shift: "*" },
    { key: "9", shift: "(" }, { key: "0", shift: ")" }, { key: "-", shift: "_" },
    { key: "=", shift: "+" },
    { special: "del", style: "orange", span: 2, locked: true },
  ],
  // row2: purple (anchors / metric-lines) + q-row
  [
    { special: "purple", style: "purple", span: 2 },
    { key: "q" }, { key: "w" }, { key: "e" }, { key: "r" }, { key: "t" },
    { key: "y" }, { key: "u" }, { key: "i" }, { key: "o" }, { key: "p" },
    { key: "[", shift: "{" },
    { key: "]", shift: "}" },
    { key: "\\", shift: "|" },
  ],
  // row3: yellow capsule slider + a-row + mode key (blue, 2 keys wide)
  [
    { special: "slider", style: "yellow", span: 2, slider: "yellow" },
    { key: "a" }, { key: "s" }, { key: "d" }, { key: "f" }, { key: "g" },
    { key: "h" }, { key: "j" }, { key: "k" }, { key: "l" },
    { key: ";", shift: ":" },
    { key: "'", shift: '"' },
    { special: "mode", style: "blue", span: 2, locked: true },
  ],
  // row4: red slider + z-row + green slider
  [
    { special: "slider", style: "red", span: 2, slider: "red" },
    { key: "z" }, { key: "x" }, { key: "c" }, { key: "v" }, { key: "b" },
    { key: "n" }, { key: "m" },
    { key: ",", shift: "<" },
    { key: ".", shift: ">" },
    { key: "/", shift: "?" },
    { special: "slider", style: "green", span: 2, slider: "green" },
  ],
  // row5: ctrl / empty / alt / space / move / 4 placeholder toggles
  // (space key: required by T3.3; verified keymap's row5 has no explicit
  // space, so it takes a wide slot between alt and move)
  [
    { key: "ctrl", special: "ctrl", style: "dark" },
    { special: "empty", style: "dark", disabled: true },
    { key: "alt", special: "alt", style: "dark" },
    { special: "space", style: "dark", span: 4, locked: true },
    { special: "move", style: "dark", span: 4 },
    { special: "placeholder", style: "red" },
    { special: "placeholder", style: "yellow" },
    { special: "placeholder", style: "blue" },
    { special: "placeholder", style: "beige" },
  ],
];

// T3.7 split layout: per-row key index where the row is cut into the
// bottom-left and bottom-right clusters. Cuts are balanced so each cluster's
// rows have matching unit widths (left: 6 units per row, right: 9, row4: 8)
// — keys keep their fixed 52px width, no stretching, no blank edges.
const SPLIT_CUTS = [6, 5, 5, 5, 3];

// split mode: the left cluster gets its own space key (split-ergo style dual
// thumb keys); merged mode keeps the single wide space in the row.
// In split the right space/move narrow to 2/3 units to fit the 9-unit rows.
const SPLIT_ROW5_CUT = 3;

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

export class KeyboardDock {
  constructor(editorController) {
    this.editorController = editorController;
    this.collapsed =
      localStorage.getItem("engramfont-dock-collapsed") === "true";
    this.layout = localStorage.getItem("engramfont-dock-layout") || "merged";
    this.bindings = JSON.parse(
      localStorage.getItem("engramfont-key-bindings") || "{}"
    );
    this.altActive = false;
    this.ctrlActive = false;

    this.buildDom();
    this.applyLayout();
    this.applyCollapsed();
    addCanvasModeListener(() => this.updateModeUI());
    this.updateModeUI();
  }

  buildDom() {
    const container = document.querySelector(".main-container");
    this.dockElement = html.div({ id: "keyboard-dock" }, []);
    container.appendChild(this.dockElement);

    // two cluster containers: in merged mode they hold one continuous
    // keyboard (right cluster empty+hidden), in split mode they anchor to
    // the bottom-left / bottom-right canvas corners
    this.clusterLeft = html.div({ class: "kd-cluster kd-cluster-left" }, []);
    this.clusterRight = html.div({ class: "kd-cluster kd-cluster-right" }, []);
    this.dockElement.appendChild(this.clusterLeft);
    this.dockElement.appendChild(this.clusterRight);

    this.sliderElements = {};
    this.keyElements = DOCK_ROWS.map((row) => row.map((keyDef) => this.buildKey(keyDef)));
    this.spaceKeyLeft = this.buildKey({
      special: "space",
      style: "dark",
      span: 2,
      locked: true,
    });
    this.renderKeys();

    // split/merge handle (EngramFont original, T3.7)
    const layoutHandle = withAriaLabel(
      html.button(
        {
          id: "kd-layout-handle",
          title: translate("dock.layout.toggle"),
        },
        ["⇔"]
      ),
      translate("dock.layout.toggle")
    );
    layoutHandle.addEventListener("click", () => this.toggleLayout());
    this.dockElement.appendChild(layoutHandle);

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
  }

  buildKey(keyDef) {
    const element =
      keyDef.key !== undefined && !keyDef.special
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

  // ---- split/merge layout (EngramFont original, T3.7) ----

  renderKeys() {
    // (re)distribute the key elements into the cluster containers;
    // appendChild re-parents, so all listeners on the keys survive
    this.clusterLeft.replaceChildren();
    this.clusterRight.replaceChildren();
    const split = this.layout === "split";

    // bottom-row spans differ per layout (merged: space 4 / move 4;
    // split: space 2 / move 3 to match the 9-unit letter rows)
    const [spaceKey, moveKey] = this.keyElements[4].slice(3, 5);
    spaceKey.style.setProperty("--kd-span", split ? 2 : 4);
    moveKey.style.setProperty("--kd-span", split ? 3 : 4);

    for (const [rowIndex, rowElements] of this.keyElements.entries()) {
      let fragments;
      if (!split) {
        fragments = [rowElements];
      } else if (rowIndex === 4) {
        // bottom row: the left cluster gets its own space key
        fragments = [
          [...rowElements.slice(0, SPLIT_ROW5_CUT), this.spaceKeyLeft],
          rowElements.slice(SPLIT_ROW5_CUT),
        ];
      } else {
        fragments = [
          rowElements.slice(0, SPLIT_CUTS[rowIndex]),
          rowElements.slice(SPLIT_CUTS[rowIndex]),
        ];
      }
      for (const [fragmentIndex, fragment] of fragments.entries()) {
        const host =
          split && fragmentIndex === 1 ? this.clusterRight : this.clusterLeft;
        const rowElement = html.div({ class: "kd-row" }, []);
        rowElement.dataset.row = rowIndex;
        host.appendChild(rowElement);
        for (const keyElement of fragment) {
          rowElement.appendChild(keyElement);
        }
      }
    }
    this.clusterRight.classList.toggle("kd-hidden", !split);
  }

  applyLayout() {
    this.dockElement.classList.toggle("kd-split", this.layout === "split");
  }

  toggleLayout() {
    this.layout = this.layout === "merged" ? "split" : "merged";
    localStorage.setItem("engramfont-dock-layout", this.layout);
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
