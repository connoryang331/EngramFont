import { test } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { strToU8, zlibSync } from "fflate";
const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));
const proj = fs.readdirSync(fixturesDir).find((d) => d.startsWith("Inter-E2E-") && d.endsWith(".fontra") && !d.includes("dup"));
test("dock visual", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 300)));
  await page.goto(`editor.html?project=${proj}#` + Buffer.from(zlibSync(strToU8(JSON.stringify({ text: "handlo" })))).toString("base64"));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/dock-edit.png" });
  await page.locator('[data-special="mode"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/dock-proof.png" });
});
