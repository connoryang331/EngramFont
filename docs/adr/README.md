# 架构决策记录（ADR）索引与规则

> 一决策一文档：`NNNN-<slug>.md`（四位编号递增）。改架构、定口径、删机制、
> 引入/废除一种通用机制——写 ADR；实现细节留在特性包与代码里。
> AGENTS.md 只沉淀定稿后的架构事实，不放决策过程。

## 状态

`accepted`（现行）· `superseded`（被 NNNN 取代，文件头标注取代者）。

## 格式（对齐 visee）

```markdown
---
Id: ADR-NNNN
tags: [<领域标签，词表见 docs/README.md>]
Status: accepted / superseded
Date: YYYY-MM-DD
---
# <一句话决策>
## 背景      ← 现状与问题（可带表）
## 决策      ← 定了什么（可带"用户明确决定"标注）
## 理由      ← 为什么这么定
## 被否决的方案 ← 每条说清否决原因
## 后果      ← 落地影响面（文件 / 迁移 / 兼容）
## 关联      ← 特性包 / bugfixes / 台账链接
```

## 索引

| 编号 | 决策 | Status | 日期 |
|---|---|---|---|
| [ADR-0001](0001-fork-patch-discipline-src-js.md) | fork 贴片纪律：前端改动只做 `src-js/`，client 目录是构建产物 | accepted | 2026-10-12 |
| [ADR-0002](0002-node-appearance-always-on.md) | 节点外观设置常开，删除总开关 `nodeAppearanceCustom` | accepted | 2026-10-14 |
| [ADR-0003](0003-slanted-selection-shear-space.md) | 斜向框选：剪切空间命中测试，复用矩形判定 | accepted | 2026-10-14 |
| [ADR-0004](0004-settings-rows-text-first-combined.md) | 设置面板行：文字在前 + combined 行类型 + 行级 reset | accepted | 2026-10-14 |
| [ADR-0005](0005-node-icons-eye-on-curves.md) | 节点图标几何语义：曲线点 = 眼形（切线朝向），直线点 = 方形 | accepted | 2026-10-14 |
| [ADR-0006](0006-toggle-smooth-glyphs-convert.md) | 双击转曲：直线段变真曲线，手柄按过节点的公切线生成（Glyphs/FontLab 语义） | accepted | 2026-10-14 |
| [ADR-0007](0007-startpoint-chevron-indicator.md) | 起始点方向指示：圆弧改为尖角箭头（`>` / `<`） | accepted | 2026-10-14 |
| [ADR-0008](0008-node-size-unified.md) | 节点尺寸合并为单一设置 + 箭头随尺寸缩放 + 眼形比例改为眼睛形 | accepted | 2026-10-14 |
| [ADR-0009](0009-squircle-g2-nodes.md) | Squircle 节点：曲率连续（G2）闭式解，图标用超椭圆而非五角星 | accepted | 2026-10-14 |
| [ADR-0010](0010-node-slide-g2.md) | G2 解允许沿切线微移节点：滑动解与原地解取代价更小者 | accepted | 2026-10-15 |
| [ADR-0011](0011-node-kind-state-is-geometry.md) | 节点类型即几何：降格必须改线段与手柄，Alt+双击才是"只改标志" | accepted | 2026-10-15 |
| [ADR-0012](0012-squircle-line-curve-derived-transition.md) | 线↔曲线的 squircle（雨滴点）：渲染与导出时派生过渡，屏幕≡导出由共享真值表锁死（**未实现**） | accepted | 2026-10-15 |
