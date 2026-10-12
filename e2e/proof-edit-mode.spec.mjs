// R5 · Proof/Edit 双模式 E2E（用例表见 docs/specs/05-proof-edit-mode/TEST.md）
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
  // the editor mirrors its text into the URL fragment as zlib+base64 JSON
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

async function openEditor(page, project, text = "a") {
  await page.goto(`editor.html?project=${project}${makeFragment({ text })}`);
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  // reset to a known mode
  await page.evaluate(() => localStorage.removeItem("engramfont-canvas-mode"));
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2000);
}

test("E2E-1 mode toggle switches UI, persists across reload", async ({ page }) => {
  await openEditor(page, findImportedProject());

  // edit mode by default: proof toolbar hidden (the native tool cluster is
  // permanently hidden — the keyboard dock carries the tools now)
  await expect(page.locator("#proof-toolbar")).toBeHidden();

  await page.locator('[data-special="mode"]').click();
  await expect(page.locator("#proof-toolbar")).toBeVisible();
  await expect(page.locator("#edit-tools")).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("engramfont-canvas-mode"))
  ).toBe("proof");

  // persistence: reload keeps proof mode
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(1500);
  await expect(page.locator("#proof-toolbar")).toBeVisible();
  await expect(page.locator("#edit-tools")).toBeHidden();

  // back to edit hides the proof toolbar again
  await page.locator('[data-special="mode"]').click();
  await expect(page.locator("#proof-toolbar")).toBeHidden();
});

test("E2E-2 proof presets set the canvas text", async ({ page }) => {
  const project = findImportedProject();
  await openEditor(page, project);
  await page.locator('[data-special="mode"]').click();
  await expect(page.locator("#proof-toolbar")).toBeVisible();

  const expectedTexts = {
    kerning: "AVAT AT AV\nTo To Wa Wa\nYo Yo AVA",
    capitals: "ABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789",
    spacing: "nnnoonn\nHHooHH\nnHnH oHoH",
    shapes:
      "sphinx of black quartz, judge my vow.\npack my box with five dozen liquor jugs.",
  };

  for (const [preset, expected] of Object.entries(expectedTexts)) {
    await page.locator(`[data-preset="${preset}"]`).click();
    await page.waitForTimeout(800);
    const text = await readFragmentText(page);
    expect(text).toContain(expected.split("\n")[0]);
  }

  // "your text" restores the snapshot taken when entering proof mode
  await page.locator('[data-preset="your-text"]').click();
  await page.waitForTimeout(800);
  expect(await readFragmentText(page)).toContain("a");
});

test("E2E-3 proof mode metric lines span the full line width", async ({ page }) => {
  const project = findImportedProject();
  const text = "HHHHHHHH";
  await openEditor(page, project, text);

  const scanTopInk = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("#edit-canvas");
      const context = canvas.getContext("2d");
      const { width, height } = canvas;
      const image = context.getImageData(0, 0, width, height).data;
      // topmost row with ink (dark pixels) in the central columns — in proof
      // mode the full-line ascender stroke sits ABOVE the glyph caps
      const isDark = (x, y) => {
        const i = (y * width + x) * 4;
        return image[i] < 100 && image[i + 3] > 40;
      };
      for (let y = 0; y < height; y++) {
        for (let x = Math.floor(width * 0.25); x < width * 0.75; x++) {
          if (isDark(x, y)) {
            return y;
          }
        }
      }
      return height;
    });

  // edit mode: topmost ink is the glyph cap
  const editTop = await scanTopInk();
  expect(editTop).toBeLessThan(900);

  await page.evaluate(() => localStorage.setItem("engramfont-canvas-mode", "proof"));
  await page.reload();
  await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForTimeout(2500);

  const proofTop = await scanTopInk();
  // the full-line ascender stroke adds ink above the glyph caps in proof mode
  expect(proofTop).toBeLessThan(editTop - 5);
});
