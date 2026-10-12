import { test } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));
const proj = fs.readdirSync(fixturesDir).find((d) => d.startsWith("Inter-E2E-") && d.endsWith(".fontra") && !d.includes("dup"));
test("bent space visual", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 200)));
  await page.goto(`editor.html?project=${proj}`);
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.locator("#kd-layout-handle").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/bent-space.png" });
  const info = await page.evaluate(() => {
    const segs = [...document.querySelectorAll(".kd-half-left .kd-space-segment")];
    const segsR = [...document.querySelectorAll(".kd-half-right .kd-space-segment")];
    return { leftSegs: segs.length, rightSegs: segsR.length };
  });
  console.log("SEGS:", JSON.stringify(info));
});
