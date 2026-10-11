# 对照验证环境（下一会话执行必读）

> 本文档让任何新会话在不依赖历史对话的情况下，搭建并使用"EngramFont vs meshfont"对照验证环境。

## 1. meshfont 参照克隆（行为基准）
- 路径：`E:\visee-template\meshfont-clone`
- 启动：`cd E:\visee-template\meshfont-clone && node serve.mjs` → **http://127.0.0.1:8124/app**
  （或双击该目录 `start.bat`；也可用 `node start.mjs` 自动避端口冲突）
- 关键页面/行为基准：
  - 编辑器：/app → 欢迎弹窗 → 选 Inter → Start → 编辑器
  - **proof 模式**：文本输入 `lovely` → 键盘 `proof` 键 → 打样视图（5 预设下拉）
  - **edit 键**：键盘右下蓝色 `edit` → 回编辑模式
  - 连字基准：输入 `ton`（1 字形）/ `lovely`（2 字形）/ `advanced`（见下）
- 完整逆向档案：同目录 `NOTES.md`（技术栈/接线/坑）+ `RECON/`（截图/fixtures）

## 2. EngramFont 与资产清单
| 资产 | 路径 |
|---|---|
| EngramFont 仓库（fork） | `E:\engram-dev\EngramFont`（branch engramfont-main） |
| EngramFont 启动 | `start-EngramFont.bat` → **http://127.0.0.1:8800**（自动建 Untitled.fontra） |
| venv（含 fontTools） | `E:\engram-dev\EngramFont\venv`（验证：`venv\Scripts\python -c "import fontTools"`） |
| 测试工程 | `E:\engram-dev\fontra-test-fonts\Untitled.fontra`（含 ton/dance/vance/lovely 连体字形 + FEA） |
| 编译产物 | 同目录 `MicroTon.ttf`（= demo-liga/MicroTon.ttf） |
| 连体脚本 | `E:\engram-dev\engram-builder\demo-liga\`（add-*-liga.py / compile-bridge.py / verify-liga.mjs / shape-to-plane.mjs / glyph-order.json / glyph-paths.json） |
| 对照截图档案 | `E:\visee-template\meshfont-clone\RECON\`（engram-plane-*.png 等） |

## 3. 端口表
| 服务 | 端口 | 启动 |
|---|---|---|
| EngramFont server | 8800 | start-EngramFont.bat（或 `venv\Scripts\fontra --http-port 8800 filesystem <字体目录>`） |
| meshfont 克隆 | 8124 | meshfont-clone 目录 `node serve.mjs` |

## 4. 对照验证流程（每个需求的 TEST.md 引用本节）
1. 两端启动（先 EngramFont 后 meshfont；**改 Untitled.fontra 前必须停 8800 服务**——双写互踩，
   且强杀进程会丢未落盘字形：用户手绘的 A 字形已因此丢失过一次）
2. 并排打开 8800/editor 与 8124/app
3. 按 `05-proof-edit-mode/TEST.md` 与 `03-keyboard-dock/TEST.md` 用例逐项对照 meshfont 行为
4. 连字/导出类断言用 demo-liga 脚本（verify-liga.mjs / compile-bridge.py）机器验证

## 5. 已知状态快照（2026-10-11 会话结束时）
- Untitled.fontra 字形：a,ad,ance,c,d,dance,e,ed,l,l_o_v_e,l_y,n,o,space,t,t_on,v,vance,y
  （用户手绘 A 已丢失；y 存在）
- FEA 规则：t_on/ad/dance/vance/l_o_v_e/l_y 连字 + `sub [ance dance vance] d' by ed;`
- MicroTon.ttf GSUB 验证过的行为：ton=1、lovely=2、advanced=3、danced=2 字形
- EngramFont 品牌/重命名/文档：engramfont-main 分支（GitHub connoryang331/EngramFont，private）
