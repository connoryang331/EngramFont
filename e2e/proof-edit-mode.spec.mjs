// R5 · Proof/Edit 模式 E2E（用例表见 docs/specs/05-proof-edit-mode/TEST.md）
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor.html?project=MicroTon.ttf");
  await page.waitForTimeout(4000);
});

test("E2E-1 proof mode: full-width line metrics guides", async ({ page }) => {
  // TODO: 切 proof → 导线宽度==整行（canvas 像素采样或 SVG 快照对照）
});

test("E2E-2 edit key returns to editing", async ({ page }) => {
  // TODO: pen 工具恢复可用
});

test("E2E-3 presets set text", async ({ page }) => {
  // TODO: 5 预设逐个点击 → characterLines 断言
});

test("E2E-4 mode persists across reload", async ({ page }) => {
  // TODO
});
