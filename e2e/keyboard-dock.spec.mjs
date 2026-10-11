// R3 · 键盘 Dock E2E（用例表见 docs/specs/03-keyboard-dock/TEST.md）
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor.html?project=MicroTon.ttf");
  await page.waitForTimeout(4000);
});

test("E2E-1 dock renders with aria-labels", async ({ page }) => {
  // TODO: 断言 .kd-key 数量 ≥ 28，每键 aria-label
});

test("E2E-2 letter key g switches glyph", async ({ page }) => {
  // TODO: 点 g 键 → selectedGlyph.glyphName == "g" + 画布渲染
});

test("E2E-3 missing glyph -> create dialog", async ({ page }) => {
  // TODO: 点未创建字形键 → 对话框出现 → 创建
});

test("E2E-4 DEL / space modify text", async ({ page }) => {
  // TODO: characterLines 断言
});

test("E2E-6 collapse persists across reload", async ({ page }) => {
  // TODO
});
