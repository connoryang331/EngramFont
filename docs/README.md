# docs/ 目录说明

> 借鉴 visee 的文档治理：**AGENTS.md 只放指针与定稿后的架构事实**，本体按「一特性一包 /
> 一 bug 一文档 / 一决策一 ADR」放进对应桶。本仓与 visee 的一个差异：特性文档不按类型拆散，
> 而是整包放 `specs/NN-<特性>/`（五件套同目录，互相引用路径最短）。

| 位置 | 放什么 | 索引 |
|---|---|---|
| `specs/NN-<特性>/` | **特性包（五件套）**：PRD（需求+验收+被否决方案）→ SPEC（技术规范）→ PLAN → TASKS（施工单）→ TEST（用例表+结果回填）。做特性前必读，实现后回填。 | [specs/README.md](specs/README.md) |
| `bugfixes/` | **修复记录**：一 bug 一文档——现象 / 根因（文件与行）/ 修复 / 验证。修 bug 必留痕。 | [bugfixes/INDEX.md](bugfixes/INDEX.md) |
| `adr/` | **架构决策记录**：改架构、定口径、删机制。背景 / 决策 / 理由 / 被否决方案 / 后果。 | [adr/README.md](adr/README.md) |
| 根目录散件 | `ENGRAM-CHANGES.md`（贴片台账，按时间）/ `backlog.md`（想法池与机制备忘——特性的源头输入）/ `SYNC.md`（上游同步纪律）/ `CHANGELOG.md`（上游 Fontra 原版，不改） | — |

## frontmatter 与受控标签

每篇 bugfix / ADR / 特性包文档头部带 frontmatter（可 grep，供未来工具聚合；本仓无
Obsidian，索引用手工表格维护——**新条目必须登记进对应 INDEX**）：

```markdown
---
Id: BUG-<n> / ADR-<n> / REQ-<特性>-<n>
tags: [<领域标签>]
Status: fixed|open|mitigated|wontfix / accepted|superseded / open|implemented|partial|rejected
---
```

**标签词表**（新增标签先在这里登记，禁止自造同义词；每篇 1–4 个，宁少勿多）：

- 技术层：`frontend` · `backend` · `canvas` · `webcomponents`
- 领域组件：`editor` · `settings` · `keyboard-dock` · `export` · `import` · `theme` ·
  `selection` · `nodes` · `testing` · `meta`

**Status 用英文**（供过滤/排序），按桶取值：specs → `open（定稿待实现）/ implemented /
partial / rejected`；bugfixes → `fixed / open / mitigated / wontfix`；ADR →
`accepted / superseded`。

## 约定

- **需求执行顺序**（无豁免）：特性 → 建包（PRD/SPEC/TASKS）→ 用户确认 → 实现（贴片纪律）→
  回填 TEST.md + ENGRAM-CHANGES.md；架构级决策升格 ADR。全文见 [AGENTS.md](../AGENTS.md)。
- **测试脚本**统一放 `e2e/`（Playwright）与 `test-py/` / `test-common/`——**TEST.md 只放
  测试记录**（用例表 / 结果 / 证据路径），不放脚本。e2e 自管理 8801 服务器 + `.e2e-fonts`。
- **提交前文档门禁**：`node docs/lint.cjs`（零依赖；规则：单 H1、Id 前缀↔目录、Id 唯一、
  Status 词表、受控标签、相对链接不断链；specs/ 只查 H1 与断链）。范围 = 新体系三桶
  （bugfixes / adr / specs）+ docs 根目录散件；历史目录（design/ discussions/ features/
  product/ requirements/ testing/ wiki/ 等）不受门禁。退出码非 0 = 有违规；
  可选接 `.githooks/pre-commit`（`git config core.hooksPath .githooks`，hook 文件自备）。
- **移动本目录文件必须同步更新引用方**（AGENTS.md / specs README / 代码注释 / 文档互引）。
- `docs/specs/VERIFICATION-ENV.md` 是对照环境清单（meshfont 克隆 / 端口表）——过夜执行前必读。
- 文档语言跟仓库惯例（中文为主，代码标识符保持原文）。
