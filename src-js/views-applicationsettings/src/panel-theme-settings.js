import * as html from "@fontra/core/html-utils.js";
import { addStyleSheet } from "@fontra/core/html-utils.js";
import { MultiPanelBasePanel } from "@fontra/core/multi-panel.js";
import { themeController } from "@fontra/core/theme-settings.js";
import { THEME_PRESETS, buildDefaultTokenValues } from "@fontra/core/theme-presets.js";
import {
  VISUAL_TOKENS,
  VISUAL_TOKEN_KEYS,
  VISUAL_TOKEN_ALPHA_KEYS,
  VISUAL_TOKEN_CATEGORIES,
  THEME_PACK_FORMAT,
  THEME_PACK_VERSION,
  alphaKeyOf,
  validateThemePack,
} from "@fontra/core/visual-tokens.js";
import { normalizeHex6 } from "@fontra/core/color-derive.js";

addStyleSheet(`
  .engramfont-ui-theme-settings-panel-card {
    background-color: var(--ui-element-background-color);
    border-radius: 0.5em;
    padding: 1em;
  }
  .engramfont-ui-theme-pack-buttons {
    display: flex;
    gap: 0.5em;
    margin-top: 0.5em;
  }
  `);

// One settings row: a label plus whichever controls are given. `sizeKey` and
// `colorKey` may each be null, so a row can carry just a size (the shared node
// size) or just a color (the per-kind node colors). `extra` prepends further
// controls (e.g. the squircle exponent, which belongs BEFORE the colour).
function nodeAppearanceRow(
  displayName,
  sizeKey,
  colorKey,
  size,
  color,
  shape,
  extra = [],
  colorOptions = {}
) {
  const controls = [];
  if (sizeKey) {
    controls.push({
      key: sizeKey,
      ui: "number-wheel",
      min: size.min,
      max: size.max,
      step: size.step,
      default: size.default,
    });
  }
  // Shape parameters go BEFORE the colour swatch. Every row is right-aligned
  // (justify-content: flex-end) and every row ends with its reset button, so
  // putting the swatch LAST keeps all the swatches in one column with no
  // reserved empty space needed.
  controls.push(...extra);
  if (colorKey) {
    const colorControl = {
      key: colorKey,
      ui: "color",
      default: color,
      shape,
      ...colorOptions,
    };
    // a shape whose outline depends on a sibling numeric control (the squircle
    // exponent) needs to know which one, so the swatch can follow it
    const exponentExtra = extra.find((c) => c.ui === "number-wheel");
    if (shape === "squircle" && exponentExtra) {
      colorControl.exponentKey = exponentExtra.key;
      colorControl.exponentDefault = exponentExtra.default;
    }
    controls.push(colorControl);
  }
  return {
    ui: "combined",
    displayName,
    resettable: true,
    controls,
  };
}

// Panel cards in display order: one per category from VISUAL_TOKEN_CATEGORIES
// (visual-tokens.js -- extendable via registerTokenCategory); the rows of each
// card come from VISUAL_TOKENS. The tables are the single source of truth, the
// panel is generated from them.

function numberWheel(token, prefix) {
  return {
    key: token.key,
    ui: "number-wheel",
    min: token.control.min,
    max: token.control.max,
    step: token.control.step,
    default: token.default,
    prefix,
  };
}

function rowForToken(token, inlineExtras) {
  switch (token.type) {
    case "color":
      return nodeAppearanceRow(
        token.displayName,
        null,
        token.key,
        null,
        token.defaultLight,
        token.shape ?? null,
        inlineExtras.get(token.key) ?? []
      );
    case "color-alpha":
      return nodeAppearanceRow(
        token.displayName,
        null,
        token.key,
        null,
        token.defaultLight,
        null,
        [
          {
            key: alphaKeyOf(token),
            ui: "number-wheel",
            min: 0,
            max: 100,
            step: 5,
            default: token.defaultAlpha ?? 100,
            prefix: "α =",
          },
          ...(inlineExtras.get(token.key) ?? []),
        ]
      );
    case "number":
      return nodeAppearanceRow(
        token.displayName,
        token.key,
        null,
        {
          min: token.control.min,
          max: token.control.max,
          step: token.control.step,
          default: token.default,
        },
        null,
        null
      );
    case "boolean":
      return { ui: "checkbox", key: token.key, displayName: token.displayName };
    default:
      return null;
  }
}

// ---- theme packs (L4): export/import of {key: value} token snapshots -------
// Format constants and validation live in visual-tokens.js (generated from
// the token table; schema snapshot in docs/schemas/).

export class ThemeSettingsPanel extends MultiPanelBasePanel {
  static title = "application-settings.theme-settings.title";
  static id = "theme-settings-panel";

  async setupUI() {
    this.panelElement.innerHTML = "";
    this.panelElement.style = "gap: 1em; max-width: 32em;";

    this.panelElement.appendChild(this._makeGroupedCard(this._themeCard()));
    this.panelElement.appendChild(this._makePresetCard());
    this.panelElement.appendChild(this._makeThemePackCard());
    for (const card of this._categoryCards()) {
      this.panelElement.appendChild(this._makeGroupedCard(card));
    }
  }

  _makeGroupedCard(cardContent) {
    const container = html.createDomElement("grouped-settings", {
      class: "engramfont-ui-theme-settings-panel-card",
    });
    container.items = [cardContent];
    return container;
  }

  _themeCard() {
    return {
      displayName: "Theme",
      controller: themeController,
      descriptions: [
        {
          key: "theme",
          ui: "radio",
          options: [
            { key: "automatic", displayName: "Automatic (use OS setting)" },
            { key: "light", displayName: "Light" },
            { key: "dark", displayName: "Dark" },
          ],
        },
      ],
    };
  }

  _categoryCards() {
    const inlineExtras = new Map();
    for (const token of VISUAL_TOKENS) {
      if (token.inlineInto) {
        const prefix = token.key === "nodeSquircleExponent" ? "n =" : undefined;
        if (!inlineExtras.has(token.inlineInto)) {
          inlineExtras.set(token.inlineInto, []);
        }
        inlineExtras.get(token.inlineInto).push(numberWheel(token, prefix));
      }
    }

    const cards = [];
    for (const { id: category, displayName } of VISUAL_TOKEN_CATEGORIES) {
      const descriptions = VISUAL_TOKENS.filter(
        (token) => token.category === category && !token.inlineInto
      ).map((token) => rowForToken(token, inlineExtras));
      if (!descriptions.length) {
        continue;
      }
      cards.push({ displayName, controller: themeController, descriptions });
    }
    return cards;
  }

  // ---- theme pack card (export / import) ----------------------------------

  // ---- preset card (L2): built-in presets + user-defined custom presets ----

  _getCustomPresets() {
    const list = themeController.model.themeCustomPresets;
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter(
      (preset) =>
        preset &&
        typeof preset.id === "string" &&
        typeof preset.name === "string" &&
        typeof preset.values === "object" &&
        preset.values !== null
    );
  }

  _setCustomPresets(list) {
    themeController.setItem("themeCustomPresets", list);
  }

  _snapshotModelValues() {
    const values = {};
    for (const key of [...VISUAL_TOKEN_KEYS, ...VISUAL_TOKEN_ALPHA_KEYS]) {
      values[key] = themeController.model[key];
    }
    return values;
  }

  _applyPresetValues(values, packName) {
    const allowed = new Set([...VISUAL_TOKEN_KEYS, ...VISUAL_TOKEN_ALPHA_KEYS]);
    for (const [key, value] of Object.entries(values)) {
      if (allowed.has(key)) {
        themeController.setItem(key, value);
      }
    }
    themeController.setItem("themePackName", packName);
  }

  _makePresetCard() {
    const card = html.createDomElement("div", {
      class: "engramfont-ui-theme-settings-panel-card",
    });
    const title = html.createDomElement("div", {}, ["Preset"]);

    const select = html.createDomElement("select", {
      style: "margin-top: 0.5em; width: 100%;",
    });
    const makeOption = (value, label) =>
      html.createDomElement("option", { value }, [label]);

    const rebuildOptions = (selectedValue) => {
      select.innerHTML = "";
      select.appendChild(makeOption("", "Custom (user settings)"));
      const builtinGroup = html.createDomElement("optgroup", { label: "Built-in" });
      for (const preset of THEME_PRESETS) {
        builtinGroup.appendChild(makeOption(preset.id, preset.displayName));
      }
      select.appendChild(builtinGroup);
      const customs = this._getCustomPresets();
      if (customs.length) {
        const customGroup = html.createDomElement("optgroup", { label: "My presets" });
        for (const preset of customs) {
          customGroup.appendChild(makeOption("custom:" + preset.id, preset.name));
        }
        select.appendChild(customGroup);
      }
      select.value = selectedValue ?? "";
    };

    const nameInput = html.createDomElement("input", {
      type: "text",
      placeholder: "Preset name",
      style: "margin-top: 0.5em; width: 100%; box-sizing: border-box;",
    });

    this._presetStatus = html.createDomElement("div", {
      style: "margin-top: 0.3em; min-height: 1.2em; font-size: 0.9em;",
    });

    const saveButton = html.createDomElement("button", {}, ["Save as new"]);
    const restoreButton = html.createDomElement("button", {}, ["Restore defaults"]);
    const renameButton = html.createDomElement("button", {}, ["Rename"]);
    const deleteButton = html.createDomElement("button", {}, ["Delete"]);

    const selectedCustom = () => {
      const value = select.value;
      if (!value.startsWith("custom:")) {
        return null;
      }
      const id = value.slice(7);
      return this._getCustomPresets().find((preset) => preset.id === id) ?? null;
    };

    const updateButtons = () => {
      const isCustom = !!selectedCustom();
      renameButton.disabled = !isCustom;
      deleteButton.disabled = !isCustom;
      if (isCustom) {
        nameInput.value = selectedCustom().name;
      }
    };

    select.onchange = () => {
      const custom = selectedCustom();
      if (custom) {
        try {
          this._applyPresetValues(custom.values, custom.name);
          this._setPresetStatus(`Preset "${custom.name}" applied.`);
        } catch (error) {
          this._setPresetStatus(`Preset apply failed: ${error.message}`);
        }
        updateButtons();
        return;
      }
      const preset = THEME_PRESETS.find((p) => p.id === select.value);
      if (!preset) {
        return; // "Custom" chosen -- user regains control, nothing to apply
      }
      try {
        this._applyPresetValues(preset.values, preset.displayName);
        this._setPresetStatus(`Preset "${preset.displayName}" applied.`);
      } catch (error) {
        this._setPresetStatus(`Preset apply failed: ${error.message}`);
      }
      updateButtons();
    };

    saveButton.onclick = () => {
      const customs = this._getCustomPresets();
      const name =
        nameInput.value.trim() || `My preset ${customs.length + 1}`;
      const id =
        (crypto.randomUUID?.() ?? "c" + Date.now().toString(36)) + "";
      const preset = { id, name, values: this._snapshotModelValues() };
      this._setCustomPresets([...customs, preset]);
      rebuildOptions("custom:" + id);
      themeController.setItem("themePackName", name);
      this._setPresetStatus(`Saved "${name}".`);
      updateButtons();
    };

    renameButton.onclick = () => {
      const custom = selectedCustom();
      const name = nameInput.value.trim();
      if (!custom || !name) {
        this._setPresetStatus("Rename needs a name.");
        return;
      }
      const oldName = custom.name;
      this._setCustomPresets(
        this._getCustomPresets().map((preset) =>
          preset.id === custom.id ? { ...preset, name } : preset
        )
      );
      if (themeController.model.themePackName === oldName) {
        themeController.setItem("themePackName", name);
      }
      rebuildOptions(select.value);
      this._setPresetStatus(`Renamed to "${name}".`);
    };

    deleteButton.onclick = () => {
      const custom = selectedCustom();
      if (!custom) {
        return;
      }
      this._setCustomPresets(
        this._getCustomPresets().filter((preset) => preset.id !== custom.id)
      );
      if (themeController.model.themePackName === custom.name) {
        themeController.setItem("themePackName", "");
      }
      rebuildOptions("");
      this._setPresetStatus(`Deleted "${custom.name}".`);
      updateButtons();
    };

    restoreButton.onclick = () => {
      try {
        this._applyPresetValues(buildDefaultTokenValues(), "");
        rebuildOptions("");
        nameInput.value = "";
        this._setPresetStatus("Restored factory defaults.");
        updateButtons();
      } catch (error) {
        this._setPresetStatus(`Restore failed: ${error.message}`);
      }
    };

    // keep the select in sync: user edits any control -> Custom.
    // IMPORTANT: the <select> fires "input" BEFORE "change" -- if we let the
    // select's own input event reach this handler, the not-yet-applied model
    // mismatches the preset and the select rebounds to "Custom" before the
    // change handler ever applies it. So ignore events from the select.
    const updateSelection = (event) => {
      if (event && event.target === select) {
        return;
      }
      // customs FIRST in the fallback so an applied custom preset stays
      // selected even when its values coincide with a built-in's
      const allPresets = [
        ...this._getCustomPresets().map((preset) => ({
          id: "custom:" + preset.id,
          name: preset.name,
          values: preset.values,
        })),
        ...THEME_PRESETS,
      ];
      const valuesMatch = (preset) =>
        Object.entries(preset.values).every(
          ([key, value]) => themeController.model[key] === value
        );
      // exact: values match AND the active pack name agrees; fallback:
      // values-only match (customs first)
      const packName = themeController.model.themePackName;
      const matching =
        allPresets.find((preset) => valuesMatch(preset) && preset.name === packName) ??
        allPresets.find(valuesMatch);
      if (matching) {
        if (select.value !== matching.id) {
          rebuildOptions(matching.id);
        }
      } else if (select.value !== "") {
        rebuildOptions("");
      }
      updateButtons();
    };
    rebuildOptions("");
    updateButtons();
    this.panelElement.addEventListener("input", updateSelection);
    themeController.addKeyListener("themePackName", updateSelection);
    themeController.addKeyListener("themeCustomPresets", () => {
      rebuildOptions(select.value);
    });

    const nameRow = html.createDomElement("div", {
      class: "engramfont-ui-theme-pack-buttons",
    });
    nameRow.append(nameInput, saveButton);
    const manageRow = html.createDomElement("div", {
      class: "engramfont-ui-theme-pack-buttons",
    });
    manageRow.append(restoreButton, renameButton, deleteButton);

    card.append(title, select, nameRow, manageRow, this._presetStatus);
    return card;
  }

  _setPresetStatus(message) {
    if (this._presetStatus) {
      this._presetStatus.textContent = message;
    }
  }

  _makeThemePackCard() {
    const card = html.createDomElement("div", {
      class: "engramfont-ui-theme-settings-panel-card",
    });

    const title = html.createDomElement("div", {}, ["Theme packs"]);

    const packName = html.createDomElement("div", {
      style: "margin-top: 0.4em; opacity: 0.75;",
    });
    const updatePackName = () => {
      const name = themeController.model.themePackName;
      packName.textContent = name
        ? `Active pack: ${name}`
        : "Custom settings (no pack applied)";
    };
    updatePackName();
    themeController.addKeyListener("themePackName", updatePackName);

    this._packStatus = html.createDomElement("div", {
      style: "margin-top: 0.3em; min-height: 1.2em; font-size: 0.9em;",
    });

    const exportButton = html.createDomElement("button", {}, [
      "Export theme pack",
    ]);
    exportButton.onclick = () => this._exportThemePack();

    const importButton = html.createDomElement("button", {}, [
      "Import theme pack…",
    ]);
    importButton.onclick = () => this._fileInput.click();

    this._fileInput = html.createDomElement("input", {
      type: "file",
      accept: ".json,application/json",
      style: "display: none;",
    });
    this._fileInput.onchange = () => {
      const file = this._fileInput.files?.[0];
      this._fileInput.value = "";
      if (file) {
        this._importThemePack(file);
      }
    };

    const buttons = html.createDomElement("div", {
      class: "engramfont-ui-theme-pack-buttons",
    });
    buttons.append(exportButton, importButton);

    card.append(title, packName, this._packStatus, buttons, this._fileInput);
    return card;
  }

  _setPackStatus(message) {
    if (this._packStatus) {
      this._packStatus.textContent = message;
    }
  }

  _exportThemePack() {
    const name = themeController.model.themePackName || "Custom theme";
    const values = {};
    for (const key of [...VISUAL_TOKEN_KEYS, ...VISUAL_TOKEN_ALPHA_KEYS]) {
      values[key] = themeController.model[key];
    }
    const pack = {
      format: THEME_PACK_FORMAT,
      version: THEME_PACK_VERSION,
      name,
      values,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      (name.replace(/[^\w\- ]+/g, "").trim() || "engramfont-theme") + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this._setPackStatus(`Exported "${name}".`);
  }

  async _importThemePack(file) {
    try {
      const data = JSON.parse(await file.text());
      const result = validateThemePack(data);
      if (!result.ok && result.applicableKeys.length === 0) {
        throw new Error(result.errors.join("; "));
      }
      for (const key of result.applicableKeys) {
        themeController.setItem(key, data.values[key]);
      }
      themeController.setItem(
        "themePackName",
        typeof data.name === "string" && data.name ? data.name : ""
      );
      const notes = [];
      if (result.errors.length) {
        notes.push(result.errors.join("; "));
      }
      if (result.unknownKeys.length) {
        notes.push(
          `ignored ${result.unknownKeys.length} unknown key(s): ${result.unknownKeys.slice(0, 4).join(", ")}${result.unknownKeys.length > 4 ? "…" : ""}`
        );
      }
      if (result.invalidKeys.length) {
        notes.push(
          `skipped ${result.invalidKeys.length} invalid value(s): ${result.invalidKeys.slice(0, 4).join(", ")}${result.invalidKeys.length > 4 ? "…" : ""}`
        );
      }
      this._setPackStatus(
        `Imported ${result.applicableKeys.length} settings from "${data.name}".` +
          (notes.length ? ` (${notes.join(" — ")})` : "")
      );
    } catch (error) {
      this._setPackStatus(`Import failed: ${error.message}`);
    }
  }
}
