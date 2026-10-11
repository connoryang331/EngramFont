// EngramFont E2E 配置——前置：EngramFont server 已在 8800 运行（start-EngramFont.bat）
// 对照环境：meshfont 克隆 8124（见 docs/specs/VERIFICATION-ENV.md）
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8800",
    viewport: { width: 1440, height: 900 },
  },
  // 不自动起服务——执行会话按 EXECUTION.md 手动启动（export manager 未就绪前 bundle 需手动 build）
  // webServer: { command: "venv/Scripts/fontra.exe --http-port 8800 filesystem E:/engram-dev/fontra-test-fonts", url: "http://127.0.0.1:8800/serverinfo", reuseExistingServer: true },
});
