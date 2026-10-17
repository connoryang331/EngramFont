# R10 · 任务分解（施工单）

## T10.1 · 特性包
PRD / SPEC / TASKS / TEST（本包）。DoD：四件套齐备。

## T10.2 · 实现 chevron
`fontra.startpoint.indicator` 的 `draw` 改为：取前进方向 → `save/translate/rotate` →
画顶点朝 +x 的 chevron（`upper → tip → lower`，只描边）→ `restore`；
删除 `START_POINT_ARC_GAP_ANGLE`，新增 `START_POINT_CHEVRON_HALF_ANGLE`。
DoD：单点轮廓跳过、多轮廓各自独立、朝向正确。

## T10.3 · 构建
`npm run bundle`。DoD：编译无错误。

## T10.4 · 验证（8801 隔离实例，禁止碰用户 8800）
构造四个方向各异的轮廓（右/左/上/下 + 斜向），截图确认：
① 无圆弧残留；② 朝右呈 `>`、朝左呈 `<`；③ 斜向随方向旋转；④ 亮/暗主题正常。
DoD：TEST.md 用例全绿 + 截图存档。

## T10.5 · 回填与记录
TEST.md 填结果与证据路径；ENGRAM-CHANGES 记 R10-T10.1；ADR-0007 记录画法决策；
AGENTS 判例速查加一行（改起始点指示动哪里）。
DoD：docs lint 通过。
