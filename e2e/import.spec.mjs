// R2 · 导入 E2E（用例表见 docs/specs/02-import/TEST.md）
// 前置：EngramFont server 于 8800，根目录为 .e2e-fonts（含 Inter-Regular.ttf 固定资产）
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { strToU8, zlibSync } from "fflate";

// editor session state lives in a zlib+base64 JSON URL fragment (utils.ts)
function makeFragment(obj) {
  const compressed = zlibSync(strToU8(JSON.stringify(obj)));
  return "#" + Buffer.from(compressed).toString("base64");
}

const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));

// unique per run so the tests don't depend on prior server state;
// E2E-2 gets its own name so its FIRST upload succeeds (the 409 must come
// from the second upload, not a collision with E2E-1)
const importName = `Inter-E2E-${Date.now()}`;
const importFile = fixturesDir + importName + ".ttf";
fs.copyFileSync(fixturesDir + "Inter-Regular.ttf", importFile);
const importName2 = importName + "-dup";
const importFile2 = fixturesDir + importName2 + ".ttf";
fs.copyFileSync(fixturesDir + "Inter-Regular.ttf", importFile2);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator("#engramfont-import-button").waitFor({ timeout: 30000 });
});

test("E2E-1 import Inter.ttf -> editor opens imported project", async ({
  page,
}) => {
  await page.setInputFiles("#engramfont-import-file-input", importFile);
  // successful import navigates to the editor of the new project
  await page.waitForURL(`editor.html?project=${importName}.fontra`, {
    timeout: 60000,
  });
  await page
    .locator("#engramfont-project-name")
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  const projectName = await page
    .locator("#engramfont-project-name")
    .textContent();
  expect(projectName).toContain(importName);

  // edit -> autosave: load glyph 'a' via URL fragment, drag the right
  // sidebearing handle (metrics edit), verify it landed in the project
  const glyphPath = fixturesDir + importName + ".fontra/glyphs/a.json";
  const before = fs.readFileSync(glyphPath, "utf-8");
  await page.goto(
    `editor.html?project=${importName}.fontra${makeFragment({ text: "a" })}`
  );
  await page.waitForTimeout(2500); // editor + glyph render
  // select sidebearing via dock key "0" (the native toolbar is hidden),
  // THEN collapse the keyboard dock: it overlaps the sidebearing handles
  await page.locator('[data-fn*="kerning-tool"]').click();
  await page.waitForTimeout(300);
  await page.locator("#kd-collapse-handle").click();
  await page.waitForTimeout(400);
  // the right LSB/RSB handle sits below the glyph (fit-zoom, 1440x900 viewport)
  await page.locator("#edit-canvas").hover({ position: { x: 1095, y: 813 } });
  await page.mouse.down();
  await page.mouse.move(1135, 813, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(2500); // autosave debounce
  const after = fs.readFileSync(glyphPath, "utf-8");
  expect(after).not.toBe(before);
});

test("E2E-2 duplicate name -> 409 error message", async ({ page }) => {
  await page.setInputFiles("#engramfont-import-file-input", importFile2);
  await page.waitForURL(`editor.html?project=${importName2}.fontra`, {
    timeout: 60000,
  });
  // second import of the same name
  await page.goto("/");
  await page.locator("#engramfont-import-button").waitFor({ timeout: 30000 });
  await page.setInputFiles("#engramfont-import-file-input", importFile2);
  const errorBox = page.locator("#engramfont-import-error");
  await expect(errorBox).toBeVisible({ timeout: 30000 });
  await expect(errorBox).toContainText("already exists");
});

test("E2E-3 corrupted file -> 400 without crash", async ({ page }) => {
  await page.setInputFiles("#engramfont-import-file-input", {
    name: "corrupt.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.from("this is not a font"),
  });
  const errorBox = page.locator("#engramfont-import-error");
  await expect(errorBox).toBeVisible({ timeout: 30000 });
  await expect(errorBox).toContainText("Can't import this file");
});
