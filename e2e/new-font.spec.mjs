// R4 · 新建字体 E2E（用例表见 docs/specs/04-new-font-templates/TEST.md）
import { test, expect } from "@playwright/test";

test("E2E-1 new font with latin-kernel template", async ({ page }) => {
  await page.goto("/");
  // TODO: 新建 → 选模板 → 项目出现 → 打开编辑器 → 种子字形可编辑
});

test("E2E-2 duplicate name -> 409", async ({ page }) => {
  // TODO
});
