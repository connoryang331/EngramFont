# EngramFont · 上游同步手册（SYNC）

## Git 拓扑
- `upstream` = https://github.com/fontra/fontra （上游，只读 fetch）
- `origin` = 你自己的 EngramFont 仓库（建好后 `git remote add origin <你的仓库>`）
- `main` = 上游镜像分支（保持纯净，只接受来自 upstream 的合并）
- `engram-main` = 产品分支（品牌 + 全部功能改动；发版从这里出）
- 功能分支从 `engram-main` 切出，完成后合回

## 同步 SOP（建议每 1-3 个月，或需要上游某个修复时）
```bash
git fetch upstream
git checkout main && git merge --ff-only upstream/main     # 快进上游镜像
git checkout engram-main && git merge main                  # 合入产品分支
npm ci && npm run bundle                                    # 重建
# 冒烟验收：start-EngramFont.bat → landing/editor/导出菜单/键盘输入
# 全绿后：git push origin engram-main
```

## 冲突预算（改动越集中，同步越便宜）
- 零冲突：新增文件（panel-keyboard-dock.js 这类）
- 低冲突：单行注册（editor.js 里 import + append 一行）、core.css 变量区
- 高冲突：原文件深改（标识符重命名 45 文件是当前最大项 → 见下方缓解方案）

## 冲突解决 playbook
1. 打开 ENGRAM-CHANGES.md 对照贴片清单，逐条判断上游是否动了同一位置
2. 机械型贴片（标识符替换）冲突：解决冲突标记后重跑 `node rebrand-identifiers.mjs`（幂等）
3. 上游改了机制导致贴片失效：回到贴片条目重新设计，不要硬怼

## 长期选项
- **回投上游**：通用性修复（bug fix）提 PR 给 fontra/fontra——合入后该项从你的 diff 里消失
- **品牌层迁移到构建期**（推荐评估）：源码保持上游原样（Fontra 标识符不动），
  品牌替换放到 webpack 打包阶段做 token 替换 + CSS 覆盖层 → 同步成本趋近于零
