// R1 · 导出 E2E（用例表见 docs/specs/01-export/TEST.md）
// 前置：EngramFont server 于 8800，工程目录含 Untitled.fontra（ton/dance/vance/lovely 连字）
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import * as hb from "harfbuzzjs";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor.html?project=Untitled.fontra");
  // #engramfont-project-name renders in the same setup pass as the export-as
  // action registration -> guarantees backendInfo (and the File menu) is ready
  await page
    .locator("#engramfont-project-name")
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  await page.locator("menu-bar .menu-item").first().waitFor({ timeout: 30000 });
});

async function openExportSubmenu(page) {
  await page.locator("menu-bar .menu-item").filter({ hasText: "File" }).click();
  const exportItem = page
    .locator("menu-panel .context-menu-item")
    .filter({ hasText: "Export as" });
  await exportItem.waitFor();
  await exportItem.hover();
  return exportItem;
}

test("E2E-1 File menu lists Export As formats", async ({ page }) => {
  await openExportSubmenu(page);
  const submenu = page.locator("body > menu-panel .context-menu-item");
  await expect(submenu.filter({ hasText: "TrueType (*.ttf)" })).toBeVisible();
  await expect(submenu.filter({ hasText: "OpenType (*.otf)" })).toBeVisible();
  await expect(submenu.filter({ hasText: "Webfont (*.woff2)" })).toBeVisible();
});

test("E2E-2 export ttf downloads valid TTF", async ({ page }) => {
  await openExportSubmenu(page);
  const downloadPromise = page.waitForEvent("download");
  await page
    .locator("body > menu-panel .context-menu-item")
    .filter({ hasText: "TrueType (*.ttf)" })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  const data = fs.readFileSync(path);
  // sfnt version 1.0
  expect(data.readUInt32BE(0)).toBe(0x00010000);
  expect(data.length).toBeGreaterThan(1000);
});

test("E2E-3 exported font keeps liga (ton -> t_on)", async ({ page }) => {
  await openExportSubmenu(page);
  const downloadPromise = page.waitForEvent("download");
  await page
    .locator("body > menu-panel .context-menu-item")
    .filter({ hasText: "TrueType (*.ttf)" })
    .click();
  const download = await downloadPromise;
  const face = new hb.Face(new hb.Blob(fs.readFileSync(await download.path())));
  const font = new hb.Font(face);
  const shape = (text) => {
    const buffer = new hb.Buffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    hb.shape(font, buffer);
    return buffer.getGlyphInfos().length;
  };
  expect(shape("ton")).toBe(1);
  expect(shape("lovely")).toBe(2);
  expect(shape("advanced")).toBe(3);
  expect(shape("abc")).toBe(3);
});

test("E2E-4 export woff2 downloads and loads as FontFace", async ({ page }) => {
  await openExportSubmenu(page);
  const downloadPromise = page.waitForEvent("download");
  await page
    .locator("body > menu-panel .context-menu-item")
    .filter({ hasText: "Webfont (*.woff2)" })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(fs.readFileSync(path).subarray(0, 4).toString("latin1")).toBe("wOF2");
  // DoD T1.3: loadable via browser FontFace API
  const b64 = fs.readFileSync(path).toString("base64");
  const loaded = await page.evaluate(async (data) => {
    const face = new FontFace("e2e-export", `url(data:font/woff2;base64,${data})`);
    try {
      await face.load();
      return face.family;
    } catch (error) {
      return `FAILED: ${error}`;
    }
  }, b64);
  expect(loaded).toBe("e2e-export");
});
