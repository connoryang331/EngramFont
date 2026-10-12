import { test } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const fixturesDir = fileURLToPath(new URL("../.e2e-fonts/", import.meta.url));
const proj = fs.readdirSync(fixturesDir).find((d) => d.startsWith("Inter-E2E-") && d.endsWith(".fontra") && !d.includes("dup"));
test("arc visual", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGE-ERROR:", String(e).slice(0, 300)));
  await page.goto(`editor.html?project=${proj}`);
  await page.locator("#engramfont-project-name").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.locator("#kd-layout-handle").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/arc-split.png" });
  const info = await page.evaluate(() => {
    const arc = document.querySelector(".kd-arc");
    const keys = [...arc.querySelectorAll(".kd-key")];
    const rects = keys.map((k) => k.getBoundingClientRect());
    const leftMax = Math.max(...rects.filter((_, i) => i < 27).map((r) => r.right));
    const rightMin = Math.min(...rects.slice(27).map((r) => r.left));
    return {
      keys: keys.length,
      centerGap: Math.round(rightMin - leftMax),
      rotated: keys.filter((k) => (k.style.transform || "").includes("rotate")).length,
      arcW: Math.round(arc.getBoundingClientRect().width),
      arcH: Math.round(arc.getBoundingClientRect().height),
    };
  });
  console.log("ARC:", JSON.stringify(info));
});
