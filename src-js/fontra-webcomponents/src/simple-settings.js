import {
  UnlitElement,
  createDomElement,
  div,
  input,
  label,
  span,
} from "@fontra/core/html-utils.js";
import { IconButton } from "./icon-button.js"; // for <icon-button>

export class SimpleSettings extends UnlitElement {
  static styles = `
    :host {
      /* the smooth-node "eye" contour, shared by every color swatch variant;
         keep in sync with EYE_HALF_* in visualization-layer-definitions.js */
      --engramfont-eye-clip: polygon(
        0% 50%,
        8.33% 39.24%,
        16.67% 30.44%,
        25% 23.59%,
        33.33% 18.7%,
        41.67% 15.77%,
        50% 14.79%,
        58.33% 15.77%,
        66.67% 18.7%,
        75% 23.59%,
        83.33% 30.44%,
        91.67% 39.24%,
        100% 50%,
        91.67% 60.76%,
        83.33% 69.56%,
        75% 76.41%,
        66.67% 81.3%,
        58.33% 84.23%,
        50% 85.21%,
        41.67% 84.23%,
        33.33% 81.3%,
        25% 76.41%,
        16.67% 69.56%,
        8.33% 60.76%
      );
    }

    .header {
      margin: 0.2em 0 0.35em 0;
      font-weight: bold;
    }

    .settings-list > * + * {
      border-top: 1px solid
        color-mix(in srgb, var(--horizontal-rule-color) 35%, transparent);
    }

    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25em;
      padding: 0.4em 0;
      min-height: 2em;
    }

    .settings-label {
      min-width: 0;
    }

    .settings-control {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.6em;
      flex: none;
    }

    label {
      cursor: pointer;
    }

    .disabled {
      opacity: 0.4;
      transition: opacity 120ms ease;
    }

    input[type="checkbox"],
    input[type="radio"] {
      margin: 0;
      flex: none;
    }

    input[type="color"] {
      inline-size: 1.7em;
      block-size: 1.7em;
      padding: 0;
      border: 1px solid
        color-mix(in srgb, var(--horizontal-rule-color) 60%, transparent);
      border-radius: 0.45em;
      background: none;
      cursor: pointer;
      flex: none;
    }

    input[type="color"].swatch-round,
    input[type="color"].swatch-round::-webkit-color-swatch {
      border-radius: 50%;
    }

    input[type="color"].swatch-square,
    input[type="color"].swatch-square::-webkit-color-swatch {
      border-radius: 0.2em;
    }

    /* eye: the shape a smooth on-curve node is drawn as on the canvas (see
       eyePath), so the color swatch matches what the setting controls.

       All three swatches share the SAME 1.7em box (see input[type="color"]
       above), so the row's controls line up on one axis and the shapes are
       centred against each other. The eye fills that box: 1.7em wide and
       1.7 / 1.42 = 1.2em tall, following the Lucide eye icon's outer contour
       ratio (19.88 : 14.0 units, pupil dropped). A taller, fuller eye reads
       correctly next to the square; the earlier 2:1 version looked like a
       sliver and wasted most of the box.

       Polygon maths (13 samples per side, t = 0, 1/12, ... 1): the two
       quadratic curves give x = halfLen*(2t-1) and y = halfWidth*4t(1-t), so
       x% = 8.333*k and y% = 50 -/+ 35.21*4t(1-t), where 35.21% is the eye's
       half-height (0.6em) as a share of the 1.7em box. That reproduces the
       canvas shape, with sharp tips rather than an ellipse.

       Keep the ratio in sync with EYE_HALF_LEN_FACTOR /
       EYE_HALF_WIDTH_FACTOR in visualization-layer-definitions.js. */
    input[type="color"].swatch-eye,
    input[type="color"].swatch-eye::-webkit-color-swatch {
      border-radius: 0;
      clip-path: var(--engramfont-eye-clip);
    }

    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    /* A number control with an inline label ("n = 3"): the bare number would
       otherwise read as a size. Sits before the colour swatch so the swatches
       stay in one right-aligned column. */
    .control-with-prefix {
      display: flex;
      align-items: center;
      gap: 0.3em;
      flex: none;
    }

    .control-prefix {
      opacity: 0.65;
      white-space: nowrap;
      font-feature-settings: "tnum" 1;
    }

    /* squircle: the shape a curvature-continuous node is drawn as on the
       canvas (see squirclePath). Its exponent n is a user setting, so the
       clip-path cannot be a static CSS polygon -- the color builder computes
       it from the current model value and applies it inline. The swatch fills
       the same 1.7em box as the other swatches, and is scaled so its area
       matches a square of that box, exactly like the canvas icon. */
    input[type="color"].swatch-squircle {
      border-radius: 0;
    }
    input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 0.35em;
    }

    input[type="number"] {
      inline-size: 3em;
      text-align: center;
      background-color: var(--text-input-background-color);
      color: var(--text-input-foreground-color);
      border-radius: 0.3em;
      border: none;
      outline: none;
      padding: 0.15em 0.1em;
      font-family: inherit;
      font-feature-settings: "tnum" 1;
      flex: none;
    }

    input[type="number"]:focus-visible {
      outline: 1px solid var(--horizontal-rule-color);
    }

    /* Reset affordance: deliberately light grey and low-contrast, so it reads
       as a secondary action and never competes with the value controls. The
       icon uses stroke="currentColor", so the color set here tints it; it
       darkens slightly on hover to stay discoverable. */
    .reset-button {
      inline-size: 1.2em;
      block-size: 1.2em;
      color: var(--horizontal-rule-color);
      opacity: 0.6;
      transition: opacity 120ms ease, color 120ms ease;
    }

    .reset-button:hover {
      color: var(--foreground-color);
      opacity: 0.75;
    }
  `;

  static properties = {
    items: { type: Array },
  };

  get model() {
    return this.controller?.model;
  }

  get controller() {
    return this._controller;
  }

  set controller(controller) {
    if (this._controller) {
      this._controller.removeListener(this._modelListener);
    }
    this._controller = controller;
    this._modelListener = (event) => {
      if (event.senderInfo === this) {
        return;
      }
      if (this._keys.has(event.key)) {
        this.requestUpdate();
      }
    };
    this._controller?.addListener(this._modelListener);
    this.requestUpdate();
  }

  get descriptions() {
    return this._descriptions;
  }

  set descriptions(descriptions) {
    this._descriptions = descriptions;
    this._keys = new Set();
    for (const description of descriptions) {
      if (description.key) {
        this._keys.add(description.key);
      }
      for (const control of description.controls ?? []) {
        if (control.key) {
          this._keys.add(control.key);
        }
      }
    }
    this.requestUpdate();
  }

  async _render() {
    await super._render();
    this.refreshDisabledStates();
  }

  // Re-evaluate the `disabledWhen` conditions of all rendered rows without
  // re-rendering, so dependencies (like a master checkbox) update in place,
  // without losing input focus.
  refreshDisabledStates() {
    for (const element of this.shadowRoot.querySelectorAll(".settings-row, .header")) {
      const description = element._settingsDescription;
      if (!description?.disabledWhen) {
        continue;
      }
      const disabled = isDisabled(description, this.controller);
      element.classList.toggle("disabled", disabled);
      for (const control of element.querySelectorAll("input")) {
        control.disabled = disabled;
      }
    }
  }

  render() {
    if (!this._descriptions) {
      return;
    }

    return div(
      { class: "settings-list" },
      this._descriptions
        .map((description) =>
          uiTypes[description.ui](this, description, this.controller)
        )
        .flat()
    );
  }
}

const controlID = (key) => `simple-settings.${key}`;

// Build the `clip-path: polygon(...)` for a superellipse
// |x/a|^n + |y/b|^n = 1 centred in the swatch box, sampled at the same 72
// steps as the canvas icon (squirclePath in
// visualization-layer-definitions.js) so the two shapes match exactly.
//
// The extent fills the swatch box (a = 1). The canvas icon is inscribed in the
// square of side nodeSize, and the other swatches (round, square, eye) all fill
// this same box too, so every colour swatch in the panel occupies exactly the
// same footprint and the shapes read as one set. (Scaling by equal AREA instead
// would shrink the squircle to ~58% of the box at n = 3 and break that
// alignment -- which is exactly what it looked like before.)
function squircleClipPath(exponent) {
  const n = Math.max(0.5, Number(exponent) || 3);
  const STEPS = 72;
  const points = [];
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * 2 * Math.PI;
    const cx = Math.cos(t);
    const cy = Math.sin(t);
    const x = Math.sign(cx) * Math.pow(Math.abs(cx), 2 / n);
    const y = Math.sign(cy) * Math.pow(Math.abs(cy), 2 / n);
    points.push(`${((x + 1) * 50).toFixed(2)}% ${((1 - y) * 50).toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")})`;
}

// A small icon button that restores every control of a `combined` row to
// its `default`, updating the input elements in place (no re-render)
function makeResetButton(settingsElement, description, controller) {
  const button = createDomElement("icon-button", {
    src: "/tabler-icons/refresh.svg",
    class: "reset-button",
    title: "Reset to default",
    onclick: () => {
      for (const sub of description.controls ?? []) {
        if (sub.default === undefined) {
          continue;
        }
        controller.setItem(sub.key, sub.default, settingsElement);
        const control = settingsElement.shadowRoot.querySelector(
          `[id="${controlID(sub.key)}"]`
        );
        if (control) {
          control.value = sub.default;
        }
      }
    },
  });
  return button;
}

function isDisabled(description, controller) {  return description.disabledWhen
    ? !!description.disabledWhen(controller?.model ?? {})
    : false;
}

function tagDisabled(element, description) {
  element._settingsDescription = description;
  return element;
}

function settingsLabel(description, htmlFor) {
  const labelElement = label({ class: "settings-label" }, [description.displayName]);
  if (htmlFor) {
    labelElement.htmlFor = htmlFor;
  }
  return labelElement;
}

function settingsRow(description, controlElement, disabled, htmlFor) {
  return tagDisabled(
    div({ class: `settings-row${disabled ? " disabled" : ""}` }, [
      settingsLabel(description, htmlFor),
      div({ class: "settings-control" }, [controlElement]),
    ]),
    description
  );
}

const controlBuilders = {
  checkbox(settingsElement, description, controller, disabled) {
    return input({
      type: "checkbox",
      id: controlID(description.key),
      onchange: (event) => {
        controller.setItem(description.key, event.target.checked, settingsElement);
        settingsElement.refreshDisabledStates();
      },
      checked: controller.model[description.key],
      disabled,
    });
  },

  color(settingsElement, description, controller, disabled) {
    const attributes = {
      type: "color",
      id: controlID(description.key),
      value: controller.model[description.key] || description.default,
      onchange: (event) =>
        controller.setItem(description.key, event.target.value, settingsElement),
      oninput: (event) =>
        controller.setItem(description.key, event.target.value, settingsElement),
      disabled,
    };
    if (description.shape) {
      attributes.class = `swatch-${description.shape}`;
    }
    if (description.shape === "squircle") {
      // The superellipse exponent is a user setting, so the swatch outline has
      // to be computed rather than hard-coded in CSS. It is rebuilt whenever
      // the exponent control changes, keeping the swatch identical to what the
      // canvas draws.
      attributes.style = `clip-path: ${squircleClipPath(
        controller.model[description.exponentKey] ?? description.exponentDefault ?? 3
      )};`;
      if (description.exponentKey) {
        settingsElement.addEventListener(
          "input",
          (event) => {
            if (event.target?.id !== controlID(description.exponentKey)) {
              return;
            }
            const n = Number(event.target.value);
            const el = settingsElement.shadowRoot?.querySelector(
              `[id="${controlID(description.key)}"]`
            );
            if (el && Number.isFinite(n)) {
              el.style.clipPath = squircleClipPath(n);
            }
          },
          true
        );
      }
    }
    return input(attributes);
  },

  "number-wheel"(settingsElement, description, controller, disabled) {
    const clamp = (value) => {
      if (isNaN(value)) {
        value = description.default ?? 0;
      }
      if (description.min !== undefined) {
        value = Math.max(description.min, value);
      }
      if (description.max !== undefined) {
        value = Math.min(description.max, value);
      }
      return value;
    };
    const write = (value) => {
      value = clamp(value);
      controller.setItem(description.key, value, settingsElement);
      inputElement.value = value;
    };
    const inputElement = input({
      type: "number",
      id: controlID(description.key),
      value: controller.model[description.key] || description.default,
      min: description.min,
      max: description.max,
      step: description.step || 1,
      title: "Scroll or type",
      onchange: (event) => write(parseFloat(event.target.value)),
      onwheel: (event) => {
        // scroll to increment/decrement (like FontLab's number fields)
        event.preventDefault();
        const step = description.step || 1;
        const direction = event.deltaY < 0 ? 1 : -1;
        write((parseFloat(event.target.value) || 0) + direction * step);
      },
      disabled,
    });
    if (description.prefix) {
      // An inline label such as "n =" so a bare number is never mistaken for a
      // size control; the wrapper keeps the input on the same baseline.
      return div({ class: "control-with-prefix" }, [
        span({ class: "control-prefix" }, [description.prefix]),
        inputElement,
      ]);
    }
    return inputElement;
  },
};

const uiTypes = {
  header(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    return tagDisabled(
      div({ class: `header${disabled ? " disabled" : ""}` }, [description.displayName]),
      description
    );
  },

  plain(settingsElement, description, controller) {
    return div({ class: "plain" }, [description.displayName]);
  },

  checkbox(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    const controlElement = controlBuilders.checkbox(
      settingsElement,
      description,
      controller,
      disabled
    );
    return settingsRow(
      description,
      controlElement,
      disabled,
      controlID(description.key)
    );
  },

  color(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    const controlElement = controlBuilders.color(
      settingsElement,
      description,
      controller,
      disabled
    );
    return settingsRow(
      description,
      controlElement,
      disabled,
      controlID(description.key)
    );
  },

  "number-wheel"(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    const controlElement = controlBuilders["number-wheel"](
      settingsElement,
      description,
      controller,
      disabled
    );
    return settingsRow(
      description,
      controlElement,
      disabled,
      controlID(description.key)
    );
  },

  combined(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    const controlElements = (description.controls ?? []).map((sub) =>
      controlBuilders[sub.ui](settingsElement, sub, controller, disabled)
    );
    if (description.resettable) {
      controlElements.push(
        makeResetButton(settingsElement, description, controller)
      );
    }
    return tagDisabled(
      div({ class: `settings-row${disabled ? " disabled" : ""}` }, [
        div({ class: "settings-label" }, [description.displayName]),
        div({ class: "settings-control" }, controlElements),
      ]),
      description
    );
  },

  radio(settingsElement, description, controller) {
    const disabled = isDisabled(description, controller);
    const rows = [];
    if (description.displayName) {
      rows.push(div({ class: "header" }, [description.displayName]));
    }
    const id = controlID(description.key);
    for (const option of description.options) {
      const itemID = `${id}.${option.key}`;
      rows.push(
        tagDisabled(
          div({ class: "settings-row" }, [
            label({ class: "settings-label", for: itemID }, [option.displayName]),
            div({ class: "settings-control" }, [
              input({
                type: "radio",
                id: itemID,
                name: id,
                value: option.key,
                onchange: (event) =>
                  controller.setItem(
                    description.key,
                    event.target.value,
                    settingsElement
                  ),
                checked: controller.model[description.key] == option.key,
                disabled,
              }),
            ]),
          ]),
          description
        )
      );
    }
    return rows;
  },
};

customElements.define("simple-settings", SimpleSettings);
