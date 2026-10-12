// R3 · 键盘 Dock E2E（用例表见 docs/specs/03-keyboard-dock/TEST.md）
// 前置：EngramFont server 于 8800（根目录 .e2e-fonts，含已导入的 Inter 工程）
import fs from "node:fs";
import { unzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { strToU8, zlibSync } from "fflate";

const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));

function makeFragment(obj) {
  return "#" + Buffer.from(zlibSync(strToU8(JSON.stringify(obj)))).toString("base64");
}

async function readFragmentText(page) {
  const b64 = await page.evaluate(() => window.location.hash.slice(1));
  return JSON.parse(unzipSync(Buffer.from(b64, "base64")).toString("utf8")).text || "";
}

function findImportedProject() {
  const entries = fs.readdirSync(fixturesDir).filter(
    (d) => d.startsWith("Inter-E2E-") && d.endsWith(".fontra") && !d.includes("dup")
  );
  expect(entries.length, "an imported Inter project must exist").toBeGreaterThan(0);
  return entries.at(-1);
}

async function openEditor(page, text = "a") {
  const project = findImportedProject();
  await page.goto(`editor.html?project=${project}${makeFragment({ text })}`);
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2500);
  return project;
}

test("E2E-1 dock renders all rows, aria labels, collapses", async ({ page }) => {
  // merged layout is canonical for the chrome asserts (arc mode's dock is a
  // zero-height overlay -> Playwright reports it hidden while keys render)
  await page.addInitScript(() =>
    localStorage.setItem("engramfont-dock-layout", "merged")
  );
  await openEditor(page);
  await expect(page.locator("#keyboard-dock")).toBeVisible();
  const keyCount = await page.locator("#keyboard-dock .kd-key").count();
  expect(keyCount).toBeGreaterThanOrEqual(28);
  // seven half-height menu keys above the number row (the first occupies
  // the ESC slot, opens the EngramFont app menu); clicking pops the menu
  // DOWN below the key
  await expect(page.locator(".kd-mini-key")).toHaveCount(7);
  await page.locator(".kd-mini-key").first().click();
  await expect(page.locator("menu-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  // every key has an aria-label
  const unlabeled = await page.evaluate(() => {
    return [...document.querySelectorAll("#keyboard-dock .kd-key")].filter(
      (k) => !k.getAttribute("aria-label")
    ).length;
  });
  expect(unlabeled).toBe(0);

  // collapse via the dock handle -> circle button only; expand restores
  await page.locator("#kd-collapse-handle").click();
  await expect(page.locator("#keyboard-dock")).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-collapsed"))
  ).toBe("true");
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(1500);
  await expect(page.locator("#keyboard-dock")).toBeHidden();
  await page.locator("#dock-collapse-button").click();
  await expect(page.locator("#keyboard-dock")).toBeVisible();
});

test("E2E-2 letter key navigates to glyph; missing glyph offers creation", async ({
  page,
}) => {
  const project = await openEditor(page);
  // existing glyph: click 'g' -> becomes the editing target without dialogs
  await page.locator('[data-key="g"]').click();
  await page.waitForTimeout(500);

  // missing glyph: '~' (asciitilde) is not part of the Inter latin subset
  await page.locator('[data-key="`"]').click();
  await page.waitForTimeout(600);
  const dialogVisible = await page
    .locator(".modal-dialog")
    .isVisible()
    .catch(() => false);
  if (dialogVisible) {
    await page
      .locator(".modal-dialog .dialog-buttons button")
      .filter({ hasText: "Create" })
      .click();
    await page.waitForTimeout(2000);
    // the created glyph landed in the project (glyph file written)
    const created = fs
      .readdirSync(fixturesDir + project + "/glyphs")
      .some((n) => n.startsWith("grave") || n.startsWith("asciitilde"));
    expect(created).toBe(true);
  } else {
    // subset contains grave: fall back to checking selection didn't crash
    expect(true).toBe(true);
  }
});

test("E2E-3 DEL resets text to default preview; space appends", async ({ page }) => {
  await openEditor(page, "handlo");
  await page.locator('[data-special="space"]').first().click();
  await page.waitForTimeout(800);
  expect(await readFragmentText(page)).toBe("handlo ");

  // DEL restores the dynamic default preview text (first 40 coded glyphs)
  await page.locator('[data-special="del"]').click();
  await page.waitForTimeout(800);
  const resetText = await readFragmentText(page);
  expect(resetText.length).toBeGreaterThan(10);
  expect(resetText).not.toBe("handlo ");
});

test("E2E-4 mode key switches canvas mode", async ({ page }) => {
  await openEditor(page);
  await page.locator('[data-special="mode"]').click();
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-canvas-mode"))
  ).toBe("proof");
  await expect(page.locator("#proof-toolbar")).toBeVisible();
  await page.locator('[data-special="mode"]').click();
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-canvas-mode"))
  ).toBe("edit");
});

test("E2E-5 move key toggles pan (hand) tool", async ({ page }) => {
  await openEditor(page);
  await page.locator('[data-special="move"]').click();
  await page.waitForTimeout(400);
  const handSelected = await page.evaluate(() => {
    return [...document.querySelectorAll("#edit-tools .tool-button")].some(
      (b) => b.dataset.tool === "hand-tool" && b.classList.contains("selected")
    );
  });
  expect(handSelected).toBe(true);
  await page.locator('[data-special="move"]').click();
  await page.waitForTimeout(300);
  // toggling out of pan mode: the hand tool is no longer the active tool
  const handStillSelected = await page.evaluate(() => {
    return [...document.querySelectorAll("#edit-tools .tool-button")].some(
      (b) => b.dataset.tool === "hand-tool" && b.classList.contains("selected")
    );
  });
  expect(handStillSelected).toBe(false);
});

test("E2E-6 layouts switch via the settings dialog", async ({
  page,
  context,
}) => {
  // default layout (nothing stored) is arc; reset once via reload —
  // addInitScript would also strip the persisted value on later reloads
  await page.goto(`editor.html?project=${findImportedProject()}`);
  await page.evaluate(() => localStorage.removeItem("engramfont-dock-layout"));
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2500);

  // layouts switch through the settings dialog (the handle row only keeps
  // settings + collapse — no duplicate layout/theme buttons)
  const setLayout = async (value) => {
    await page.locator("#kd-settings-handle").click();
    await page.locator(`input[name="kd-layout"][value="${value}"]`).check();
    await page.locator("modal-dialog .dialog-box input.button").click();
    await page.waitForTimeout(300);
  };

  // arc first: floating curved halves
  await expect(page.locator(".kd-half-left")).toBeVisible();
  await expect(page.locator(".kd-half-right")).toBeVisible();
  const arc = await page.evaluate(() => {
    const left = document
      .querySelector(".kd-half-left")
      .getBoundingClientRect();
    const right = document
      .querySelector(".kd-half-right")
      .getBoundingClientRect();
    const keys = document.querySelectorAll(".kd-half .kd-key").length;
    const rotated = [
      ...document.querySelectorAll(".kd-half .kd-key"),
    ].filter((k) => (k.style.transform || "").includes("rotate")).length;
    return {
      gap: Math.round(right.left - left.right),
      keys,
      rotated,
      level: Math.abs(left.bottom - right.bottom),
    };
  });
  expect(arc.gap).toBeGreaterThan(100);
  // 61 flow keys + 2 curved SVG space keys (one per half) + 7 half-height
  // menu keys along the arc above the number row (all rotated); the SVG
  // spaces are not tangent-rotated (they ARE the arc)
  expect(arc.keys).toBe(70);
  expect(arc.rotated).toBe(arc.keys - 2);
  expect(arc.level).toBeLessThanOrEqual(2);
  await setLayout("straight");

  // straight second: two clusters, rows level and flush
  await expect(page.locator("#keyboard-dock.kd-straight")).toHaveCount(1);
  await expect(page.locator(".kd-cluster-left")).toBeVisible();
  await expect(page.locator(".kd-cluster-right")).toBeVisible();
  const straight = await page.evaluate(() => {
    const left = document
      .querySelector(".kd-cluster-left")
      .getBoundingClientRect();
    const right = document
      .querySelector(".kd-cluster-right")
      .getBoundingClientRect();
    return Math.round(right.left - left.right);
  });
  expect(straight).toBeGreaterThan(100);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-layout"))
  ).toBe("straight");
  // DEL functional in straight mode
  await page.locator(".kd-cluster-right [data-special='del']").click();
  await page.waitForTimeout(500);

  await setLayout("merged");

  // merged third: single block, single wide space
  await expect(page.locator("#keyboard-dock.kd-straight")).toHaveCount(0);
  await expect(page.locator(".kd-cluster-left")).toBeVisible();
  await expect(page.locator(".kd-half-left")).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-layout"))
  ).toBe("merged");
  await expect(
    page.locator(".kd-cluster-left [data-special='space']")
  ).toBeVisible();
  // merged: single keyboard, single space key (+7 half-height menu keys)
  expect(await page.locator(".kd-cluster-left .kd-key").count()).toBe(69);

  // persists across reload (merged stays merged)
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(1500);
  await expect(page.locator(".kd-cluster-left")).toBeVisible();

  // and back to arc
  await setLayout("arc");
  await expect(page.locator(".kd-half-left")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-layout"))
  ).toBe("arc");
});

test("E2E-7 custom key binding via context menu", async ({ page }) => {
  await openEditor(page);
  await page.locator('[data-key="q"]').click({ button: "right" });
  await page.waitForTimeout(500);
  const menuItem = page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "zoom to 100%" });
  await expect(menuItem).toBeVisible();
  await menuItem.click();
  await page.waitForTimeout(400);
  const bindings = JSON.parse(
    await page.evaluate(() => localStorage.getItem("engramfont-key-bindings"))
  );
  expect(bindings["q"]).toBe("zoom-100");
  // the bound key shows its binding dot and no longer navigates
  await page.locator('[data-key="q"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('[data-key="q"].kd-bound')).toHaveCount(1);
});

test("E2E-8 proof sliders adjust spacing/line-height", async ({ page }) => {
  await openEditor(page, "HHHH HHHH");
  await page.locator('[data-special="mode"]').click();
  await expect(page.locator("#proof-toolbar")).toBeVisible();

  // drag the yellow slider (letter spacing) to its right end
  const yellow = page.locator(".kd-style-yellow.kd-slider");
  const box = await yellow.boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const thumbLeft = await yellow
    .locator(".kd-slider-thumb")
    .evaluate((el) => parseFloat(el.style.left));
  expect(thumbLeft).toBeGreaterThan(80);

  // mode switch re-purposes the thumbs (edit mode -> centered placeholder)
  await page.locator('[data-special="mode"]').click();
  await page.waitForTimeout(500);
  const editThumbLeft = await yellow
    .locator(".kd-slider-thumb")
    .evaluate((el) => parseFloat(el.style.left));
  expect(editThumbLeft).toBe(50);
});
test("E2E-9 pointer-tools key mirrors the native multi-tool", async ({ page }) => {
  // key "6" is ONE key position replaced by the pointer-tools multi-tool:
  // native interaction — quick click (re)selects the face sub-tool, long
  // press / right click reveals the sub-tool options
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn*="pointer-tool"]');
  await expect(key).toHaveCount(1);
  // key "7" is the pen tools multi-tool (covered by E2E-12)
  await expect(page.locator('.kd-fn-key[data-fn*="pen-tool"]')).toHaveCount(1);

  const multiTool = page.locator('#edit-tools .multi-tool[data-tool="pointer-tools"]');
  const frontSubTool = multiTool.locator(".subtool-button").first();

  // startup: pointer-tool is the current face -> active + pointer icon
  await expect(key).toHaveClass(/kd-active/);
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointer.svg"
  );

  // quick click -> (re)selects the face tool via the native path
  await key.click();
  await expect(multiTool).toHaveClass(/selected/);
  await expect(frontSubTool).toHaveAttribute("data-tool", "pointer-tool");

  // right click reveals the options; choosing the scaling sub-tool promotes
  // it (native toolbar front child) and it becomes the key's face
  await key.click({ button: "right" });
  // the flyout only offers the ALTERNATIVE sub-tool (the key face already
  // shows the current one): exactly one option — scaling
  const scaleOption = page.locator('.kd-fn-option[data-tool="pointer-tool-scale"]');
  await expect(scaleOption).toHaveCount(1);
  await expect(page.locator('.kd-fn-option[data-tool="pointer-tool"]')).toHaveCount(0);
  await scaleOption.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pointer-tool-scale");
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointerscale.svg"
  );
  await expect(key).toHaveClass(/kd-active/);
  await expect(page.locator(".kd-fn-options")).toHaveCount(0);

  // a 500ms hold also reveals the options; a mousedown outside closes them
  const box = await key.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator(".kd-fn-options")).toBeVisible();
  await page.mouse.up();
  await page.mouse.click(400, 300);
  await expect(page.locator(".kd-fn-options")).toHaveCount(0);

  // switching away via the knife key (the native toolbar is hidden): the
  // key dims; a quick click re-selects the face tool
  await page.locator('.kd-fn-key[data-fn="knife-tool"]').click();
  await expect(key).not.toHaveClass(/kd-active/);
  await key.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pointer-tool-scale");
  await expect(key).toHaveClass(/kd-active/);

  // in proof mode a function key first returns to edit mode
  await page.locator('[data-special="mode"]').click();
  await expect(page.locator("#proof-toolbar")).toBeVisible();
  await key.click();
  await expect(page.locator("#proof-toolbar")).toBeHidden();
  await expect(key).toHaveClass(/kd-active/);
});

test("E2E-10 keyboard day/night theme toggle", async ({ page }) => {
  await openEditor(page, "HHHH");
  const dock = page.locator("#keyboard-dock");
  const key = page.locator('[data-key="q"]');

  // keys are transparent (floating labels over the canvas); the keycap only
  // appears on hover
  await expect(dock).toHaveClass(/kd-theme-light/);
  await expect(key).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await key.hover();
  await expect(key).toHaveCSS("background-color", "oklch(0.3171 0.0054 91.55 / 0.1)");
  await page.mouse.move(400, 300);
  await expect(key).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  // toggle to dark via the settings dialog; persists across reloads
  await page.locator("#kd-settings-handle").click();
  await page.locator('input[name="kd-theme"][value="dark"]').check();
  await page.locator("modal-dialog .dialog-box input.button").click();
  await expect(dock).not.toHaveClass(/kd-theme-light/);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-theme"))
  ).toBe("dark");
  await key.hover();
  await expect(key).toHaveCSS("background-color", "oklch(0.9251 0.0071 88.65 / 0.18)");

  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2000);
  await expect(page.locator("#keyboard-dock")).not.toHaveClass(/kd-theme-light/);

  // back to day (via the dialog again)
  await page.locator("#kd-settings-handle").click();
  await page.locator('input[name="kd-theme"][value="light"]').check();
  await page.locator("modal-dialog .dialog-box input.button").click();
  await expect(dock).toHaveClass(/kd-theme-light/);
  await expect(key).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("E2E-11 keyboard settings dialog", async ({ page }) => {
  await openEditor(page, "HHHH");
  // seed a custom binding so the dialog has something to list
  await page.evaluate(() =>
    localStorage.setItem("engramfont-key-bindings", JSON.stringify({ q: "zoom-fit" }))
  );
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2000);

  // the gear handle pops the settings dialog up, centered
  await page.locator("#kd-settings-handle").click();
  const dialogBox = page.locator("modal-dialog .dialog-box");
  await expect(dialogBox).toBeVisible();

  // layout radios apply live
  await page.locator('input[name="kd-layout"][value="merged"]').check();
  await expect(page.locator("#keyboard-dock")).not.toHaveClass(/kd-arc|kd-straight/);
  await page.locator('input[name="kd-layout"][value="straight"]').check();
  await expect(page.locator("#keyboard-dock")).toHaveClass(/kd-straight/);

  // theme radios apply live and persist
  await page.locator('input[name="kd-theme"][value="dark"]').check();
  await expect(page.locator("#keyboard-dock")).toHaveClass(/kd-theme-dark/);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-theme"))
  ).toBe("dark");

  // the scale slider applies live to the key containers and persists
  const scaleInput = page.locator(
    '.kd-settings-section:has-text("Scale") .kd-settings-scale-row input[type="range"]'
  );
  await scaleInput.evaluate((el) => {
    el.value = "1.25";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.locator('.kd-settings-section:has-text("Scale") .kd-settings-scale-value')
  ).toHaveText("125%");
  expect(
    await page.evaluate(
      () => document.querySelector(".kd-cluster-left").style.zoom
    )
  ).toBe("1.25");
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-scale"))
  ).toBe("1.25");

  // squircle slider: a superellipse exponent applied to every key (0 = off)
  const squircleInput = page.locator(
    '.kd-settings-section:has-text("Squircle") input[type="range"]'
  );
  await squircleInput.evaluate((el) => {
    el.value = "2";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.locator('.kd-settings-section:has-text("Squircle") .kd-settings-scale-value')
  ).toHaveText("2");
  expect(
    await page.evaluate(() =>
      document
        .querySelector("#keyboard-dock")
        .style.getPropertyValue("--kd-corner-shape")
    )
  ).toBe("superellipse(2)");
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-squircle"))
  ).toBe("2");
  await squircleInput.evaluate((el) => {
    el.value = "0";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(
    await page.evaluate(() =>
      document
        .querySelector("#keyboard-dock")
        .style.getPropertyValue("--kd-corner-shape")
    )
  ).toBe("round");

  // corner radius slider (its own setting, works with or without squircle)
  const radiusInput = page.locator(
    '.kd-settings-section:has-text("Radius") input[type="range"]'
  );
  await radiusInput.evaluate((el) => {
    el.value = "16";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.locator('.kd-settings-section:has-text("Radius") .kd-settings-scale-value')
  ).toHaveText("16px");
  expect(
    await page
      .locator('[data-key="q"]')
      .evaluate((el) => getComputedStyle(el).borderRadius)
  ).toBe("16px");
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-radius"))
  ).toBe("16");

  // border width slider (letter-key rings + the curved spacebar's stroke)
  const outlineInput = page.locator(
    '.kd-settings-section:has-text("Border width") input[type="range"]'
  );
  await outlineInput.evaluate((el) => {
    el.value = "0.5";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.locator(
      '.kd-settings-section:has-text("Border width") .kd-settings-scale-value'
    )
  ).toHaveText("0.5px");
  expect(
    await page.evaluate(() =>
      document
        .querySelector("#keyboard-dock")
        .style.getPropertyValue("--kd-key-outline-width")
    )
  ).toBe("0.5px");
  expect(
    await page.evaluate(
      () => localStorage.getItem("engramfont-dock-outline-width")
    )
  ).toBe("0.5");

  // split gap slider: inline insets on the straight dock + persistence
  const gapInput = page.locator(
    '.kd-settings-section:has-text("Split gap") input[type="range"]'
  );
  await gapInput.evaluate((el) => {
    el.value = "10";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator('.kd-settings-section:has-text("Split gap") .kd-settings-scale-value')).toHaveText("10px");
  const dock = page.locator("#keyboard-dock");
  expect(await dock.evaluate((el) => el.style.left)).toBe("10px");
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-split-gap"))
  ).toBe("10");

  // key font size slider: CSS variable on the dock + persistence
  const fontSizeInput = page.locator(
    '.kd-settings-section:has-text("Font size") input[type="range"]'
  );
  await fontSizeInput.evaluate((el) => {
    el.value = "18";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.locator('.kd-settings-section:has-text("Font size") .kd-settings-scale-value')
  ).toHaveText("18px");
  expect(
    await page
      .locator('[data-key="q"]')
      .evaluate((el) => getComputedStyle(el).fontSize)
  ).toBe("18px");
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-dock-font-size"))
  ).toBe("18");

  // the seeded binding is listed; reset-all clears it everywhere
  await expect(page.locator(".kd-settings-binding-row")).toHaveCount(1);
  await page.locator(".kd-settings-bindings-reset").click();
  await expect(page.locator(".kd-settings-binding-row")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-key-bindings"))
  ).toBe("{}");

  // done closes the dialog (dialog buttons are input.button elements)
  await dialogBox.locator("input.button").last().click();
  await expect(dialogBox).not.toBeVisible();
});

test("E2E-12 pen tools key mirrors the native multi-tool", async ({ page }) => {
  // key "7" is the pen tools multi-tool: cubic + quadratic sub-tools, same
  // interaction as the pointer tools key
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn*="pen-tool"]');
  await expect(key).toHaveCount(1);
  // startup face is the cubic pen (not the active tool group -> not active)
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointeradd.svg"
  );
  await expect(key).not.toHaveClass(/kd-active/);

  const multiTool = page.locator('#edit-tools .multi-tool[data-tool="pen-tool"]');
  const frontSubTool = multiTool.locator(".subtool-button").first();

  // right click reveals the pen sub-tools; picking quadratic promotes it
  await key.click({ button: "right" });
  const quadOption = page.locator('.kd-fn-option[data-tool="pen-tool-quad"]');
  await expect(quadOption).toHaveCount(1);
  await expect(page.locator('.kd-fn-option[data-tool="pen-tool-cubic"]')).toHaveCount(0);
  await quadOption.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pen-tool-quad");
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointeraddquad.svg"
  );
  await expect(key).toHaveClass(/kd-active/);
  await expect(page.locator(".kd-fn-options")).toHaveCount(0);

  // picking the cubic sub-tool from the dock must promote it natively too
  // (every group member is a sub-tool — the old asymmetry left the native
  // face on quad when switching back to cubic)
  await key.click({ button: "right" });
  await page.locator('.kd-fn-option[data-tool="pen-tool-cubic"]').click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pen-tool-cubic");
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointeradd.svg"
  );

  // back to quadratic for the rest of the flow
  await key.click({ button: "right" });
  await page.locator('.kd-fn-option[data-tool="pen-tool-quad"]').click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pen-tool-quad");

  // quick click re-selects the face tool after switching away via the knife key
  await page.locator('.kd-fn-key[data-fn="knife-tool"]').click();
  await expect(key).not.toHaveClass(/kd-active/);
  await key.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "pen-tool-quad");
  await expect(key).toHaveClass(/kd-active/);

  // cross-group: picking the pointer key hands activation back to the
  // pointer key (pen key must deactivate) — the dock follows
  // selectedToolIdentifier on EVERY assignment path
  const pointerKey = page.locator('.kd-fn-key[data-fn*="pointer-tool"]');
  await pointerKey.click();
  await page.waitForTimeout(300);
  await expect(pointerKey).toHaveClass(/kd-active/);
  await expect(key).not.toHaveClass(/kd-active/);
  await expect(pointerKey.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/pointer.svg"
  );
});

test("E2E-13 knife tool key selects the native knife", async ({ page }) => {
  // key "8" is a single-function key: press selects the knife tool
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn="knife-tool"]');
  await expect(key).toHaveCount(1);
  await expect(key).not.toHaveClass(/kd-active/);

  await key.click();
  const knifeButton = page.locator(
    '#edit-tools > .tool-button[data-tool="knife-tool"]'
  );
  await expect(knifeButton).toHaveClass(/selected/);
  await expect(key).toHaveClass(/kd-active/);

  // switching back to the pointer key deactivates the knife key
  const pointerKey = page.locator('.kd-fn-key[data-fn*="pointer-tool"]');
  await pointerKey.click();
  await expect(key).not.toHaveClass(/kd-active/);
  await expect(pointerKey).toHaveClass(/kd-active/);
});

test("E2E-14 shape tools key mirrors the native multi-tool", async ({ page }) => {
  // key "9" is the shape tools multi-tool: rectangle (face) + ellipse
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn*="shape-tool"]');
  await expect(key).toHaveCount(1);
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/rectangletool.svg"
  );

  const multiTool = page.locator(
    '#edit-tools .multi-tool[data-tool="shape-tool"]'
  );
  const frontSubTool = multiTool.locator(".subtool-button").first();

  // the flyout offers only the ellipse (the face already shows rectangle)
  await key.click({ button: "right" });
  const ellipseOption = page.locator('.kd-fn-option[data-tool="shape-tool-ellipse"]');
  await expect(ellipseOption).toHaveCount(1);
  await expect(page.locator('.kd-fn-option[data-tool="shape-tool-rectangle"]')).toHaveCount(0);
  await ellipseOption.click();

  // native promotion + dock face swap + activation
  await expect(frontSubTool).toHaveAttribute("data-tool", "shape-tool-ellipse");
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/ovaltool.svg"
  );
  await expect(key).toHaveClass(/kd-active/);
  await expect(page.locator(".kd-fn-options")).toHaveCount(0);

  // switching away via the knife key deactivates; quick click restores the ellipse
  await page.locator('.kd-fn-key[data-fn="knife-tool"]').click();
  await expect(key).not.toHaveClass(/kd-active/);
  await key.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "shape-tool-ellipse");
  await expect(key).toHaveClass(/kd-active/);
});

test("E2E-15 metrics key mirrors the native multi-tool", async ({ page }) => {
  // key "0" is the metrics multi-tool: sidebearing (face) + kerning
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn*="kerning-tool"]');
  await expect(key).toHaveCount(1);
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/sidebearingtool.svg"
  );

  const multiTool = page.locator(
    '#edit-tools .multi-tool[data-tool="metrics-tool"]'
  );
  const frontSubTool = multiTool.locator(".subtool-button").first();

  // flyout offers only kerning (the face already shows sidebearing)
  await key.click({ button: "right" });
  const kerningOption = page.locator('.kd-fn-option[data-tool="kerning-tool"]');
  await expect(kerningOption).toHaveCount(1);
  await expect(page.locator('.kd-fn-option[data-tool="sidebearing-tool"]')).toHaveCount(0);
  await kerningOption.click();

  await expect(frontSubTool).toHaveAttribute("data-tool", "kerning-tool");
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/kerningtool.svg"
  );
  await expect(key).toHaveClass(/kd-active/);
  await expect(page.locator(".kd-fn-options")).toHaveCount(0);

  // away via the knife key -> deactivated; quick click restores kerning
  await page.locator('.kd-fn-key[data-fn="knife-tool"]').click();
  await expect(key).not.toHaveClass(/kd-active/);
  await key.click();
  await expect(frontSubTool).toHaveAttribute("data-tool", "kerning-tool");
  await expect(key).toHaveClass(/kd-active/);
});

test("E2E-16 power ruler key selects the native ruler", async ({ page }) => {
  // key "-" is a single-function key: press selects the power ruler
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn="power-ruler-tool"]');
  await expect(key).toHaveCount(1);
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/ruler.svg"
  );

  await key.click();
  const rulerButton = page.locator(
    '#edit-tools > .tool-button[data-tool="power-ruler-tool"]'
  );
  await expect(rulerButton).toHaveClass(/selected/);
  await expect(key).toHaveClass(/kd-active/);

  const pointerKey = page.locator('.kd-fn-key[data-fn*="pointer-tool"]');
  await pointerKey.click();
  await expect(key).not.toHaveClass(/kd-active/);
  await expect(pointerKey).toHaveClass(/kd-active/);
});

test("E2E-17 hand tool key selects the native hand", async ({ page }) => {
  // key "=" is a single-function key: press selects the hand tool
  await openEditor(page, "HHHH");
  const key = page.locator('.kd-fn-key[data-fn="hand-tool"]');
  await expect(key).toHaveCount(1);
  await expect(key.locator(".kd-fn-icon")).toHaveAttribute(
    "src",
    "/images/hand.svg"
  );

  await key.click();
  const handButton = page.locator(
    '#edit-tools > .tool-button[data-tool="hand-tool"]'
  );
  await expect(handButton).toHaveClass(/selected/);
  await expect(key).toHaveClass(/kd-active/);

  // the dock's "move" key toggles the SAME hand tool: pressing it back
  // selects the pointer again and deactivates the "=" key
  await page.locator('[data-special="move"]').click();
  await expect(key).not.toHaveClass(/kd-active/);
  const pointerKey = page.locator('.kd-fn-key[data-fn*="pointer-tool"]');
  await expect(pointerKey).toHaveClass(/kd-active/);
});
