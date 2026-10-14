import * as html from "@fontra/core/html-utils.js";
import { addStyleSheet } from "@fontra/core/html-utils.js";
import { translate } from "@fontra/core/localization.js";
import { MultiPanelBasePanel } from "@fontra/core/multi-panel.js";
import { themeController } from "@fontra/core/theme-settings.js";

addStyleSheet(`
  .engramfont-ui-theme-settings-panel-card {
    background-color: var(--ui-element-background-color);
    border-radius: 0.5em;
    padding: 1em;
  }
  `);

export class ThemeSettingsPanel extends MultiPanelBasePanel {
  static title = "application-settings.theme-settings.title";
  static id = "theme-settings-panel";

  async setupUI() {
    this.panelElement.innerHTML = "";
    this.panelElement.style = "gap: 1em;";

    for (const cardContent of this.cards()) {
      const container = html.createDomElement("grouped-settings", {
        class: "engramfont-ui-theme-settings-panel-card",
      });
      container.items = [cardContent];
      this.panelElement.appendChild(container);
    }
  }

  cards() {
    return [
      {
        displayName: translate("sidebar.user-settings.theme"),
        controller: themeController,
        descriptions: [
          {
            key: "theme",
            ui: "radio",
            options: [
              {
                key: "automatic",
                displayName: translate("sidebar.user-settings.theme.auto"),
              },
              {
                key: "light",
                displayName: translate("sidebar.user-settings.theme.light"),
              },
              {
                key: "dark",
                displayName: translate("sidebar.user-settings.theme.dark"),
              },
            ],
          },
        ],
      },
      {
        displayName: "Node appearance",
        controller: themeController,
        descriptions: [
          {
            key: "nodeAppearanceCustom",
            ui: "checkbox",
            displayName: "Use custom node colors and sizes",
          },
          { key: "nodeSmoothColor", ui: "color", displayName: "Smooth node", default: "#7A4FE8" },
          { key: "nodeCornerColor", ui: "color", displayName: "Corner node", default: "#D99A1F" },
          { key: "nodeHandleColor", ui: "color", displayName: "Handle", default: "#A0A0B0" },
          {
            key: "nodeCornerSize",
            ui: "number-wheel",
            displayName: "Corner node size (scroll or type)",
            min: 4,
            max: 24,
            step: 1,
            default: 8,
          },
          {
            key: "nodeSmoothSize",
            ui: "number-wheel",
            displayName: "Smooth node size (scroll or type)",
            min: 4,
            max: 24,
            step: 1,
            default: 8,
          },
          {
            key: "nodeHandleSize",
            ui: "number-wheel",
            displayName: "Handle size (scroll or type)",
            min: 3,
            max: 20,
            step: 0.5,
            default: 6.5,
          },
        ],
      },
    ];
  }
}
