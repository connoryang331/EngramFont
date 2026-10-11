// R1 · 导出 E2E（用例表见 docs/specs/01-export/TEST.md）
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor.html?project=MicroTon.ttf");
  await page.waitForTimeout(4000);
});

test("E2E-1 File menu lists Export As formats", async ({ page }) => {
  // TODO: 打开 File 菜单 → 断言 ttf/otf/woff2 三项
});

test("E2E-2 export ttf downloads valid TTF", async ({ page }) => {
  // TODO: 触发导出 → download 事件 → 文件头 00010000
});

test("E2E-3 exported font keeps liga (ton -> t_on)", async ({ page }) => {
  // TODO: 下载产物 → harfbuzzjs shape("ton") == 1 字形
});
