// probe-keys.mjs — meshfont 键盘逐键语义探测（非破坏性：先 dump 再点安全键）
import { pathToFileURL } from "node:url";
const { loadPlaywright, launchChromium } = await import(
  pathToFileURL("C:/Users/Administrator/.zcode/skills/visee-template/scripts/lib/playwright-loader.mjs").href
);
const pw = loadPlaywright();
const browser = await launchChromium(pw.chromium);
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();

await page.goto("http://127.0.0.1:8124/app", { waitUntil: "networkidle", timeout: 40000 }).catch(() => {});
await page.waitForTimeout(3500);
// 进编辑器（Inter → Start）
const confirm = page.locator("[data-start=confirm]").first();
if (await confirm.count()) {
  const cards = page.locator("[role=dialog] button");
  if ((await cards.count()) > 1) await cards.nth(0).click().catch(() => {});
  await page.waitForTimeout(500);
  await confirm.click().catch(() => {});
  await page.waitForTimeout(3000);
}

// dump 键盘全部按键（含位置，用于识别彩色键）
const keys = await page.evaluate(() => {
  // 找键盘容器：含多个 button 且有特殊 aria 的区域
  const all = [...document.querySelectorAll("button")].filter(b => {
    const r = b.getBoundingClientRect();
    return r.y > 560 && r.width > 20; // 键盘区域（画布下方）
  });
  return all.map(b => {
    const r = b.getBoundingClientRect();
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      aria: b.getAttribute("aria-label"), title: b.getAttribute("title"),
      cls: (b.className || "").toString().slice(0, 60),
      text: (b.textContent || "").trim().slice(0, 16),
      color: getComputedStyle(b).backgroundColor,
    };
  });
});
console.log(JSON.stringify(keys, null, 0).replace(/\},\{/g, "}\n{"));
await page.screenshot({ path: "RECON/meshfont-keys-dump.png", fullPage: false });
await browser.close();
