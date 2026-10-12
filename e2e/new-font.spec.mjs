// R4 · 新建字体/模板流 E2E（用例表见 docs/specs/04-new-font-templates/TEST.md）
// 前置：EngramFont server 于 8800（根目录 .e2e-fonts）
import { test, expect } from "@playwright/test";

const uniqueName = () => `E2E-Font-${Date.now()}`;

test("E2E-1 landing card creates latin-kernel font, opens editor", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#engramfont-newfont-button").waitFor({ timeout: 30000 });
  await page.locator("#engramfont-newfont-button").click();
  await expect(page.locator("#engramfont-newfont-card")).toBeVisible();

  const name = uniqueName();
  await page.locator("#engramfont-newfont-name").fill(name);
  await page.locator("#engramfont-newfont-create").click();

  await page.waitForURL(`editor.html?project=${name}.fontra`, {
    timeout: 60000,
  });
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2000);

  // the latin-kernel template seeded 62 editable glyphs
  const glyphCount = await page.evaluate(
    () => Object.keys(window.editorController.fontController.glyphMap).length
  );
  expect(glyphCount).toBe(62);
});

test("E2E-2 duplicate name shows 409 error", async ({ page }) => {
  await page.goto("/");
  await page.locator("#engramfont-newfont-button").waitFor({ timeout: 30000 });
  await page.locator("#engramfont-newfont-button").click();

  const name = uniqueName();
  await page.locator("#engramfont-newfont-name").fill(name);
  await page.locator("#engramfont-newfont-create").click();
  await page.waitForURL(`editor.html?project=${name}.fontra`, {
    timeout: 60000,
  });

  // second attempt with the same name
  await page.goto("/");
  await page.locator("#engramfont-newfont-button").waitFor({ timeout: 30000 });
  await page.locator("#engramfont-newfont-button").click();
  await page.locator("#engramfont-newfont-name").fill(name);
  await page.locator("#engramfont-newfont-create").click();
  const errorBox = page.locator("#engramfont-newfont-error");
  await expect(errorBox).toBeVisible({ timeout: 30000 });
  await expect(errorBox).toContainText("name exists");
});

test("E2E-3 invalid name shows 400 error", async ({ page }) => {
  await page.goto("/");
  await page.locator("#engramfont-newfont-button").waitFor({ timeout: 30000 });
  await page.locator("#engramfont-newfont-button").click();
  await page.locator("#engramfont-newfont-name").fill("bad name!");
  await page.locator("#engramfont-newfont-create").click();
  const errorBox = page.locator("#engramfont-newfont-error");
  await expect(errorBox).toBeVisible({ timeout: 30000 });
  await expect(errorBox).toContainText("bad name");
});

test("E2E-4 File menu New Font opens dialog, opens new project in new tab", async ({
  page,
  context,
}) => {
  await page.goto("/editor.html?project=TestFont.fontra");
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2000);

  // the native menubar is hidden: open the File menu via the dock's File key
  await page.locator(".kd-mini-key").filter({ hasText: "File" }).click();
  const newItem = page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "New font" });
  await expect(newItem).toBeVisible();

  const popupPromise = context.waitForEvent("page");
  await newItem.click();
  await page
    .locator("#new-font-name-input")
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  // fill the modal dialog and submit with Enter
  const nameInput = page.locator("#new-font-name-input");
  await nameInput.fill(`InEditor-${Date.now()}`);
  await nameInput.press("Enter");

  const popup = await popupPromise;
  await popup.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  expect(popup.url()).toContain("editor.html?project=InEditor-");
});
