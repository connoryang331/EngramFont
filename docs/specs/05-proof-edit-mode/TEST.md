# R5 · 测试验收与回归

## E2E
- E2E-1 edit→proof：画布切换、全宽导线出现（宽度==整行宽断言）、工具禁用
- E2E-2 proof→edit：回到编辑、pen 工具可用
- E2E-3 预设 5 连点：文本/画布同步变化
- E2E-4 模式持久化（reload）
- E2E-5 暗色主题两模式截图

## 回归
- R1：edit 态逐项回归（字形编辑/选择/缩放/连字 shaping——MicroTon "ton"=1 字形）
- R2：多行排版（换行符/行高调整）
- R3：text-entry 面板控件（size/line-height/align/features 开关）正常
