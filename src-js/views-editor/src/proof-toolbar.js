// R5 · proof-mode preset toolbar: five buttons that set the canvas text
// (sceneSettings.text drives characterLines + text-entry panel + URL fragment)

import * as html from "@fontra/core/html-utils.js";
import { translate } from "@fontra/core/localization.js";
import {
  addCanvasModeListener,
  isProofMode,
  setCanvasMode,
} from "./canvas-mode.js";

export const PROOF_PRESETS = {
  kerning: ["AVAT AT AV", "To To Wa Wa", "Yo Yo AVA"],
  capitals: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789"],
  spacing: ["nnnoonn", "HHooHH", "nHnH oHoH"],
  shapes: [
    "sphinx of black quartz, judge my vow.",
    "pack my box with five dozen liquor jugs.",
  ],
};

let textSnapshot = null;

export function setupProofToolbar(editorController) {
  const toolbar = document.querySelector("#proof-toolbar");
  if (!toolbar || toolbar.childElementCount) {
    return;
  }

  // interim mode toggle (R5): the keyboard dock's dedicated mode keys (R3)
  // will call setCanvasMode() directly and replace this button
  const modeButton = html.button(
    { id: "canvas-mode-button", class: "proof-toolbar-button" },
    [isProofMode() ? "edit" : "proof"]
  );
  modeButton.addEventListener("click", () => {
    setCanvasMode(isProofMode() ? "edit" : "proof");
  });
  toolbar.before(modeButton);

  const setText = (lines) => {
    editorController.sceneSettingsController.model.text = lines.join("\n");
  };

  const yourTextButton = html.button(
    { class: "proof-toolbar-button", "data-preset": "your-text" },
    [translate("proof.presets.your-text")]
  );
  yourTextButton.addEventListener("click", () => {
    if (textSnapshot !== null) {
      setText(textSnapshot);
    }
  });

  toolbar.appendChild(yourTextButton);
  for (const [presetKey, lines] of Object.entries(PROOF_PRESETS)) {
    const button = html.button(
      { class: "proof-toolbar-button", "data-preset": presetKey },
      [translate(`proof.presets.${presetKey}`)]
    );
    button.addEventListener("click", () => setText(lines));
    toolbar.appendChild(button);
  }

  // entering proof mode snapshots the user's text for the "your text" button
  addCanvasModeListener(() => {
    if (isProofMode()) {
      textSnapshot = editorController.sceneSettingsController.model.text;
    }
    toolbar.classList.toggle("hidden", !isProofMode());
    modeButton.textContent = isProofMode() ? "edit" : "proof";
  });
  toolbar.classList.toggle("hidden", !isProofMode());
}
