// EngramFont E2E 配置——e2e 自管理服务器：8801 端口、根目录 .e2e-fonts，
// 与日常实例（8800 / start-EngramFont.bat，根目录 fontra-test-fonts）完全隔离；
// reuseExistingServer 让重复运行复用已起的 e2e 服务器
// 对照环境：meshfont 克隆 8124（见 docs/specs/VERIFICATION-ENV.md）
import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const e2eFontRoot = fileURLToPath(new URL("./.e2e-fonts", import.meta.url));
const fontraExe = fileURLToPath(new URL("./venv/Scripts/fontra.exe", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8801",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `"${fontraExe}" --http-port 8801 filesystem "${e2eFontRoot}"`,
    url: "http://127.0.0.1:8801/serverinfo",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
