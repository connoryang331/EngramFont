import { ObservableController } from "./observable-object.ts";

function setupThemeOverride(value) {
  const rootElement = document.querySelector("html");
  rootElement.classList.remove("light-theme");
  rootElement.classList.remove("dark-theme");
  if (value !== "automatic") {
    rootElement.classList.add(value + "-theme");
  }
}

export const themeController = new ObservableController({
  theme: "automatic",
  // node appearance overrides (empty/false = use the built-in theme defaults)
  nodeAppearanceCustom: false,
  nodeSmoothColor: "#7A4FE8",
  nodeCornerColor: "#D99A1F",
  nodeHandleColor: "#A0A0B0",
  nodeCornerSize: 8,
  nodeSmoothSize: 8,
  nodeHandleSize: 6.5,
});

themeController.synchronizeWithLocalStorage("engramfont-");

themeController.addKeyListener("theme", (event) => {
  setupThemeOverride(themeController.model.theme);
});

setupThemeOverride(themeController.model.theme);
