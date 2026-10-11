# R2 · 测试验收与回归

## 单测
- UT2.1 往返一致：源 TTF glyphMap == 导入后 .fontra glyphMap（按名字集合）
- UT2.2 轮廓一致：随机抽 N 字形，源 vs 导入的 bounds 相等（容差 0.5）
- UT2.3 features 文本迁移非空（源含 GSUB 时）
- UT2.4 components 字形（连体）导入后仍为组件引用

## E2E
- E2E-1 导入 Inter-Regular.ttf → 项目列表出现 → 打开 → 字形数正确 → 编辑 d → 重开仍在
- E2E-2 导入重名（已存在 Inter-Regular.fontra）→ 提示/自动加后缀
- E2E-3 导入损坏文件 → 错误提示不崩溃

## 回归
- R：OTFBackend 只读打开（不经导入）行为不变
- R：landing 项目列表排序/刷新正常
