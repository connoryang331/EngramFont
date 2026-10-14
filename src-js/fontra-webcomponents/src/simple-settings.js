import { UnlitElement, div, input, label } from "@fontra/core/html-utils.js";

export class SimpleSettings extends UnlitElement {
  static styles = `
    .header {
      margin-top: 0.6em;
      margin-bottom: 0.2em;
      font-weight: bold;
    }
  `;

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
        // Event was triggered by us -- ignore
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
    this._keys = new Set(descriptions.map((description) => description.key));
    this.requestUpdate();
  }

  render() {
    if (!this._descriptions) {
      return;
    }

    return this._descriptions.map((description) =>
      uiTypes[description.ui](this, description, this.controller)
    );
  }
}

const uiTypes = {
  header(settingsElement, description, controller) {
    return div({ class: "header" }, [description.displayName]);
  },

  plain(settingsElement, description, controller) {
    return div({ class: "plain" }, [description.displayName]);
  },

  checkbox(settingsElement, description, controller) {
    const id = `simple-settings.${description.key}`;

    return div({}, [
      input({
        type: "checkbox",
        id: id,
        onchange: (event) =>
          controller.setItem(description.key, event.target.checked, settingsElement),
        checked: controller.model[description.key],
      }),
      label({ for: id }, [description.displayName]),
    ]);
  },

  color(settingsElement, description, controller) {
    const id = `simple-settings.${description.key}`;

    return div({}, [
      input({
        type: "color",
        id: id,
        value: controller.model[description.key] || description.default,
        onchange: (event) =>
          controller.setItem(description.key, event.target.value, settingsElement),
        oninput: (event) =>
          controller.setItem(description.key, event.target.value, settingsElement),
      }),
      label({ for: id }, [description.displayName]),
    ]);
  },

  "number-wheel"(settingsElement, description, controller) {
    const id = `simple-settings.${description.key}`;
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
      id: id,
      value: controller.model[description.key] || description.default,
      min: description.min,
      max: description.max,
      step: description.step || 1,
      onchange: (event) => write(parseFloat(event.target.value)),
      onwheel: (event) => {
        // scroll to increment/decrement (like FontLab's number fields)
        event.preventDefault();
        const step = description.step || 1;
        const direction = event.deltaY < 0 ? 1 : -1;
        write((parseFloat(event.target.value) || 0) + direction * step);
      },
    });
    return div({}, [inputElement, label({ for: id }, [description.displayName])]);
  },

  radio(settingsElement, description, controller) {
    const id = `simple-settings.${description.key}`;

    return [
      description.displayName
        ? div({ class: "header" }, [description.displayName])
        : "",
      ...description.options.map((option) => {
        const itemID = `${id}.${option.key}`;
        return div({}, [
          input({
            type: "radio",
            id: itemID,
            name: id,
            value: option.key,
            onchange: (event) =>
              controller.setItem(description.key, event.target.value, settingsElement),
            checked: controller.model[description.key] == option.key,
          }),
          label({ for: itemID }, [option.displayName]),
        ]);
      }),
    ];
  },
};

customElements.define("simple-settings", SimpleSettings);
