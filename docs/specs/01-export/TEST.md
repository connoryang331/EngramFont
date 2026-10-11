# R1 · 测试验收与回归

## 单测（test-py/）
- UT1.1 ExportManager.getSupportedExportFormats == ["ttf","otf","woff2"]
- UT1.2 编译产物：glyphOrder 与后端一致；'ad' 等连体字形轮廓 bounds 与源数据一致
- UT1.3 FEA 编译：GSUB 存在且含 liga lookup（用 ton/lovely 用例）
- UT1.4 空字形/缺字形工程不崩溃（空 path 容错）

## E2E（Playwright）
- E2E-1 File 菜单含 Export As → 三格式各导出一次 → 下载文件头 magic 正确
  （TTF 00010000 / OTF OTTO / WOFF2 wOF2）
- E2E-2 导出 MicroTon.ttf（含 liga）→ 用 harfbuzzjs shape "ton" == 1 字形（连字进产物）
- E2E-3 导出期间编辑器仍可操作（异步不阻塞）

## 回归清单
- R：字形编辑/保存流程不受影响
- R：编辑性能无回退（导出为按需触发）
- R：只读工程（TTF 直开）导出行为——首版禁用或按 backend 能力提示
