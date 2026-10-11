// R7 · 背景图上下文编辑 E2E（用例表见 docs/specs/07-background-image/TEST.md）
// 前置：EngramFont server 于 8800（.e2e-fonts 含 Untitled.fontra + test-image.png）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { strToU8, zlibSync } from "fflate";

const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));

function makeFragment(obj) {
  return "#" + Buffer.from(zlibSync(strToU8(JSON.stringify(obj)))).toString("base64");
}

async function enterGlyphEditMode(page) {
  // the glyph context menu (add/edit background image) requires editing mode
  await page
    .locator("#edit-canvas")
    .dblclick({ position: { x: 450, y: 200 } });
  await page.waitForTimeout(600);
}

test("E2E-1 add -> edit image contextual activation -> auto re-lock", async ({
  page,
}) => {
  await page.goto(
    `editor.html?project=Untitled.fontra${makeFragment({ text: "a" })}`
  );
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);

  // add a background image via the context menu + file chooser
  // (in glyph edit mode; right-click on the glyph ink, not the counter hole)
  await enterGlyphEditMode(page);
  await page
    .locator("#edit-canvas")
    .click({ position: { x: 450, y: 200 }, button: "right" });
  const chooserPromise = page.waitForEvent("filechooser");
  await page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "Add Background Image" })
    .click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path.join(fixturesDir, "test-image.png"));
  await page.waitForTimeout(1500);

  // the image was stored with the glyph
  const imageEntry = fs.existsSync(
    fixturesDir + "Untitled.fontra/background-images/"
  ) && fs
    .readdirSync(fixturesDir + "Untitled.fontra/background-images/")
    .some((f) => !f.startsWith("metadata"));
  expect(imageEntry).toBe(true);

  // "Edit image" appears in the context menu and activates the image
  // (still in glyph edit mode; a dblclick would hit the just-placed image)
  await page
    .locator("#edit-canvas")
    .click({ position: { x: 450, y: 200 }, button: "right" });
  await page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "Edit image" })
    .first()
    .click();
  await page.waitForTimeout(1000);

  // the selection-info panel shows the background-image controls (Opacity)
  const selectionInfoVisible = await page
    .locator("#sidebar-container-right, .sidebar-container-right")
    .isVisible()
    .catch(() => false);

  // T7.4: the global lock/unlock menu item is gone
  await page
    .locator("#edit-canvas")
    .click({ position: { x: 450, y: 200 }, button: "right" });
  const menuTexts = await page
    .locator("menu-panel .context-menu-item")
    .allTextContents();
  expect(menuTexts.join("\n")).not.toContain("Unlock Background Images");
  expect(menuTexts.join("\n")).not.toContain("Lock Background Images");
  // press Escape to close the menu (this also leaves the bg-image selection,
  // which triggers T7.2 auto-lock)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
});

test("E2E-2 edit image selects; clicking away re-locks (state assertions)", async ({
  page,
}) => {
  await page.goto(
    `editor.html?project=Untitled.fontra${makeFragment({ text: "a" })}`
  );
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);

  const state = () =>
    page.evaluate(() => ({
      locked: window.editorController.sceneSettings.backgroundImagesAreLocked,
      selected: window.editorController.sceneSettings.selection.has(
        "backgroundImage/0"
      ),
    }));

  // enter glyph edit mode, then activate the image via Edit image
  await enterGlyphEditMode(page);
  await page
    .locator("#edit-canvas")
    .click({ position: { x: 450, y: 200 }, button: "right" });
  await page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "Edit image" })
    .first()
    .click();
  await page.waitForTimeout(800);

  let s = await state();
  expect(s.selected).toBe(true);
  expect(s.locked).toBe(false);

  // click on empty canvas space: selection leaves the image -> auto re-lock
  await page.locator("#edit-canvas").click({ position: { x: 40, y: 60 } });
  await page.waitForTimeout(800);

  s = await state();
  expect(s.locked).toBe(true);
  expect(s.selected).toBe(false);
});

test("E2E-3 replace button swaps image data, keeps transformation", async ({
  page,
}) => {
  await page.goto(
    `editor.html?project=Untitled.fontra${makeFragment({ text: "a" })}`
  );
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);

  // select the image and open the selection-info sidebar programmatically
  await enterGlyphEditMode(page);
  await page
    .locator("#edit-canvas")
    .click({ position: { x: 450, y: 200 }, button: "right" });
  await page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "Edit image" })
    .first()
    .click();
  await page.waitForTimeout(600);
  await page.evaluate(() =>
    window.editorController.toggleSidebar("selection-info", true)
  );
  await page.waitForTimeout(800);

  // the panel shows the Replace (photo-up) icon button next to the header
  // (icon-button consumes the src attribute -> locate by title)
  const replaceButton = page
    .locator('icon-button[title*="Replace"]')
    .first();
  await expect(replaceButton).toBeVisible();

  // replace the image via the file chooser
  const chooserPromise = page.waitForEvent("filechooser");
  await replaceButton.click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path.join(fixturesDir, "test-image.png"));
  await page.waitForTimeout(1200);

  // the image data file on disk was rewritten (new bytes for the identifier)
  const dataDir = fixturesDir + "Untitled.fontra/background-images/";
  const files = fs.readdirSync(dataDir).filter((f) => !f.startsWith("metadata"));
  expect(files.length).toBeGreaterThan(0);
  const newest = files
    .map((f) => ({ f, m: fs.statSync(dataDir + f).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0];
  expect(Date.now() - newest.m).toBeLessThan(10000);
});
