import { Backend } from "@fontra/core/backend-api.js";
import { loaderSpinner } from "@fontra/core/loader-spinner.js";
import "@fontra/core/theme-settings.js";

export async function startupLandingPage(authenticateFunc) {
  if (authenticateFunc) {
    if (!authenticateFunc()) {
      return;
    }
  }
  const projectList = await loaderSpinner(Backend.getProjects());
  const projectListContainer = document.querySelector("#project-list");
  projectListContainer.classList.remove("hidden");

  for (const project of projectList) {
    const projectElement = document.createElement("a");
    projectElement.href = "/fontoverview.html?project=" + project;
    projectElement.className = "project-item";
    projectElement.append(project);
    projectListContainer.appendChild(projectElement);
  }

  setupImportFont();
  setupNewFont();
}

function setupNewFont() {
  const newFontButton = document.querySelector("#engramfont-newfont-button");
  const card = document.querySelector("#engramfont-newfont-card");
  const nameInput = document.querySelector("#engramfont-newfont-name");
  const templateSelect = document.querySelector("#engramfont-newfont-template");
  const createButton = document.querySelector("#engramfont-newfont-create");
  const errorBox = document.querySelector("#engramfont-newfont-error");

  newFontButton.addEventListener("click", () => {
    card.classList.toggle("hidden");
    if (!card.classList.contains("hidden")) {
      nameInput.focus();
    }
  });

  const submit = async () => {
    const name = nameInput.value.trim();
    errorBox.classList.add("hidden");
    createButton.disabled = true;
    try {
      const response = await fetch("/api/new-font", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, template: templateSelect.value }),
      });
      const result = await response.json();
      if (!response.ok) {
        errorBox.textContent = result.error;
        errorBox.classList.remove("hidden");
        return;
      }
      window.location.href = "/editor.html?project=" + result.project;
    } catch (error) {
      errorBox.textContent = String(error);
      errorBox.classList.remove("hidden");
    } finally {
      createButton.disabled = false;
    }
  };

  createButton.addEventListener("click", submit);
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submit();
    }
  });
}

function setupImportFont() {
  const fileInput = document.querySelector("#engramfont-import-file-input");
  const importButton = document.querySelector("#engramfont-import-button");
  const errorBox = document.querySelector("#engramfont-import-error");

  importButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) {
      return;
    }
    errorBox.classList.add("hidden");
    importButton.disabled = true;
    try {
      const response = await fetch("/api/import-font", {
        method: "POST",
        body: makeImportFormData(file),
      });
      const result = await response.json();
      if (!response.ok) {
        showError(errorBox, response.status, result);
        return;
      }
      window.location.href = "/editor.html?project=" + result.project;
    } catch (error) {
      showError(errorBox, 0, { error: String(error) });
    } finally {
      importButton.disabled = false;
    }
  });
}

function makeImportFormData(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return formData;
}

function showError(errorBox, status, result) {
  const messages = {
    400: `Can't import this file (${result.error}).`,
    409: `A project with this name already exists — try "${result.suggestion}".`,
  };
  errorBox.textContent = messages[status] || `Import failed: ${result.error}`;
  errorBox.classList.remove("hidden");
}
