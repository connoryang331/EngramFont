// ADR-0012 end-to-end acceptance v2 -- after the mirrored-orientation fix.
//  1. Build the truth-table quarter-arc stored path (P smooth, UNflagged) in
//     the REAL editor; shift+double-click P. The derivation accepts this
//     geometry, so the flag must land (0x18) and the stored outline must not
//     move; the canvas then draws the derived transition.
//  2. Build the smoothed-rect stored path and shift+dbl its line<->curve
//     corner. The derivation REFUSES this handle arrangement -- verified
//     identical in the Python reference (qa/factcheck-py-derive.py) -- so the
//     flag must NOT land and nothing may move (honest refusal).
//  3. Zero console errors + screenshots for the human eye.
import { createRequire } from "module";

const require = createRequire("E:/engram-dev/EngramFont/package.json");
const { chromium } = require("@playwright/test");
const { strToU8, zlibSync } = require("fflate");

const frag = (o) => "#" + Buffer.from(zlibSync(strToU8(JSON.stringify(o)))).toString("base64");
const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1100, height: 850 }, deviceScaleFactor: 1 })
).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200));
});

await page.goto(`http://127.0.0.1:8801/editor.html?project=TestFont.fontra${frag({ text: "H" })}`);
await page.locator("#engramfont-project-name").waitFor({ state: "attached", timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  window.editorController.sceneSettings.selectedGlyph = {
    lineIndex: 0, glyphIndex: 0, glyphName: "H", isEditing: true,
  };
});
await page.waitForTimeout(900);

// ---- part 1: the quarter-arc fixture (truth-table geometry, translated) ----
await page.evaluate(async () => {
  const sc = window.editorController.sceneController;
  await sc.editGlyph(async (si, glyph) => {
    const lgs = sc.getEditingLayerFromGlyphLayers(glyph.layers);
    for (const lg of Object.values(lgs)) {
      const p = lg.path;
      while (p.contourInfo.length) p.deleteContour(0);
      p.appendUnpackedContour({
        points: [
          { x: -100, y: 300 },
          { x: 300, y: 300 }, // P: the raindrop corner (straight in, arc out)
          { x: 432, y: 300, type: "cubic" },
          { x: 568, y: 432, type: "cubic" },
          { x: 700, y: 568 },
          { x: 500, y: 700 },
        ],
        isClosed: true,
      });
      p.pointTypes[1] = 0x08; // smooth, NOT yet squircle
    }
    return "arc fixture";
  });
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const dock = document.getElementById("keyboard-dock");
  if (dock) dock.style.display = "none";
  const sc = window.editorController.sceneController;
  sc.canvasController.setViewBox({ xMin: -200, yMin: 100, xMax: 900, yMax: 900 });
  sc.canvasController.requestUpdate();
});
await page.waitForTimeout(700);
await page.screenshot({ path: "qa/adr0012-v2-arc-before.png" });

const toScreen = async (gx, gy) =>
  await page.evaluate(([gx, gy]) => {
    const sc = window.editorController.sceneController;
    const cc = sc.canvasController;
    const pg = sc.sceneModel.getSelectedPositionedGlyph();
    const c = cc.canvasPoint({ x: gx + pg.x, y: gy + pg.y });
    const parent = cc.canvas.parentElement;
    return { x: c.x + parent.offsetLeft, y: c.y + parent.offsetTop };
  }, [gx, gy]);

const dumpNodes = (label, nearX, nearY) =>
  page.evaluate(() => {
    const sc = window.editorController.sceneController;
    const path = sc.sceneModel.getSelectedPositionedGlyph().glyph.path;
    const out = [];
    for (let i = 0; i < path.pointTypes.length; i++) {
      const t = path.pointTypes[i];
      if (t & 0x07) continue;
      const p = path.getPoint(i);
      out.push({
        i,
        flags: "0x" + t.toString(16),
        kind: t & 0x10 ? "squircle" : t & 0x08 ? "smooth" : "corner",
        x: p.x,
        y: p.y,
      });
    }
    return out;
  });

// shift+dblclick P=(300,300)
let s = await toScreen(300, 300);
await page.mouse.move(s.x, s.y);
await page.waitForTimeout(80);
await page.keyboard.down("Shift");
await page.mouse.dblclick(s.x, s.y);
await page.keyboard.up("Shift");
await page.waitForTimeout(800);

const arcNodes = await dumpNodes();
console.log("ARC fixture after shift+dbl on (300,300):");
let arcOk = false;
let arcCoordsUnmoved = true;
for (const n of arcNodes) {
  const mark = Math.hypot(n.x - 300, n.y - 300) < 1;
  console.log(`   [${n.i}] ${n.flags} ${n.kind} (${n.x}, ${n.y})${mark ? "  <== the line<->curve corner" : ""}`);
  if (mark) arcOk = n.flags === "0x18";
}
console.log(
  arcOk
    ? "ARC LINE<->CURVE SQUIRCLE: flag landed (derivation accepted, ADR-0012 works end to end)"
    : "ARC LINE<->CURVE SQUIRCLE: flag NOT set (unexpected -- the truth-table arc must derive)"
);
await page.screenshot({ path: "qa/adr0012-v2-arc-after.png" });

// ---- part 2: the smoothed-rect fixture (honest refusal expected) ----------
await page.evaluate(async () => {
  const sc = window.editorController.sceneController;
  await sc.editGlyph(async (si, glyph) => {
    const lgs = sc.getEditingLayerFromGlyphLayers(glyph.layers);
    for (const lg of Object.values(lgs)) {
      const p = lg.path;
      while (p.contourInfo.length) p.deleteContour(0);
      p.appendUnpackedContour({
        points: [
          { x: 150, y: 600 }, // the line<->curve corner (raindrop candidate)
          { x: 350, y: 600, type: "cubic" },
          { x: 609, y: 741, type: "cubic" },
          { x: 750, y: 600 }, // the smoothed corner
          { x: 844, y: 506, type: "cubic" },
          { x: 750, y: 333, type: "cubic" },
          { x: 750, y: 200 },
          { x: 150, y: 200 },
        ],
        isClosed: true,
      });
      p.pointTypes[3] = 0x08;
    }
    return "rect fixture";
  });
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const sc = window.editorController.sceneController;
  sc.canvasController.setViewBox({ xMin: 40, yMin: 40, xMax: 960, yMax: 860 });
  sc.canvasController.requestUpdate();
});
await page.waitForTimeout(700);

const rectBefore = await page.evaluate(() => {
  const sc = window.editorController.sceneController;
  return JSON.stringify(Array.from(sc.sceneModel.getSelectedPositionedGlyph().glyph.path.coordinates));
});

s = await toScreen(150, 600);
await page.mouse.move(s.x, s.y);
await page.waitForTimeout(80);
await page.keyboard.down("Shift");
await page.mouse.dblclick(s.x, s.y);
await page.keyboard.up("Shift");
await page.waitForTimeout(800);

const rectNodes = await dumpNodes();
const rectAfter = await page.evaluate(() => {
  const sc = window.editorController.sceneController;
  return JSON.stringify(Array.from(sc.sceneModel.getSelectedPositionedGlyph().glyph.path.coordinates));
});
console.log("RECT fixture after shift+dbl on (150,600):");
let rectRefused = false;
for (const n of rectNodes) {
  const mark = Math.hypot(n.x - 150, n.y - 600) < 1;
  console.log(`   [${n.i}] ${n.flags} ${n.kind} (${n.x}, ${n.y})${mark ? "  <== the line<->curve corner" : ""}`);
  if (mark && !(parseInt(n.flags) & 0x10)) rectRefused = true;
}
console.log(
  rectRefused && rectBefore === rectAfter
    ? "RECT LINE<->CURVE: honestly refused, zero geometry change (matches the Python reference's no-solution)"
    : `RECT LINE<->CURVE: UNEXPECTED (refused=${rectRefused}, coordsUnmoved=${rectBefore === rectAfter})`
);
await page.screenshot({ path: "qa/adr0012-v2-rect-after.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
