# EngramFont E2E
- 前置：EngramFont server 于 8800（start-EngramFont.bat）；对照 meshfont 于 8124（见 docs/specs/VERIFICATION-ENV.md）
- 运行：`npx playwright test e2e/`（骨架用例由各需求实现时填充——用例表见 docs/specs/*/TEST.md）
- 安装：`npm i -D @playwright/test && npx playwright install chromium`（首执行会话补装）
