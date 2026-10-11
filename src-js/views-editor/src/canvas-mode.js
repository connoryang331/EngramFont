// R5 · canvas mode state machine: "edit" <-> "proof"
// Persisted under localStorage "engramfont-canvas-mode" (theme-settings pattern;
// storage key = prefix + model key).

import { ObservableController } from "@fontra/core/observable-object.ts";

export const canvasModes = ["edit", "proof"];

export const canvasModeController = new ObservableController({ mode: "edit" });

canvasModeController.synchronizeWithLocalStorage("engramfont-canvas-");

export function getCanvasMode() {
  const mode = canvasModeController.model.mode;
  return canvasModes.includes(mode) ? mode : "edit";
}

export function isProofMode() {
  return getCanvasMode() === "proof";
}

export function setCanvasMode(mode) {
  if (!canvasModes.includes(mode)) {
    throw new Error(`invalid canvas mode: ${mode}`);
  }
  canvasModeController.model.mode = mode;
}

export function addCanvasModeListener(listener) {
  return canvasModeController.addKeyListener("mode", listener);
}
