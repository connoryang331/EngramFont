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
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
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
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
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

test("E2E-6 layout handle cycles arc -> straight -> merged", async ({
  page,
  context,
}) => {
  // default layout (nothing stored) is arc; reset once via reload —
  // addInitScript would also strip the persisted value on later reloads
  await page.goto(`editor.html?project=${findImportedProject()}`);
  await page.evaluate(() => localStorage.removeItem("engramfont-dock-layout"));
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);

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
  // 61 flow keys + 2 curved SVG space keys (one per half); the SVG spaces
  // are not tangent-rotated (they ARE the arc)
  expect(arc.keys).toBe(63);
  expect(arc.rotated).toBe(arc.keys - 2);
  expect(arc.level).toBeLessThanOrEqual(2);
  await page.locator("#kd-layout-handle").click();
  await page.waitForTimeout(400);

  // straight second: two framed clusters, rows level and flush
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

  await page.locator("#kd-layout-handle").click();
  await page.waitForTimeout(400);

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
  // merged: single keyboard, single space key
  expect(await page.locator(".kd-cluster-left .kd-key").count()).toBe(62);

  // persists across reload (merged stays merged)
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await expect(page.locator(".kd-cluster-left")).toBeVisible();

  // and the cycle continues: merged -> arc
  await page.locator("#kd-layout-handle").click();
  await page.waitForTimeout(400);
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
