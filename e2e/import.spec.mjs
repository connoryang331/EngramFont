// R2 · 导入 E2E（用例表见 docs/specs/02-import/TEST.md）
import { test, expect } from "@playwright/test";

test("E2E-1 import Inter.ttf -> editable project", async ({ page }) => {
  await page.goto("/");
  // TODO: 点导入 → 上传 Inter-Regular.ttf → 断言项目列表/编辑器/字形数
});

test("E2E-2 duplicate name -> 409 toast", async ({ page }) => {
  // TODO
});

test("E2E-3 corrupted file -> 400 without crash", async ({ page }) => {
  // TODO
});
