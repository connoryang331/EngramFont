# R1 · 任务拆解

## T1.1 ExportManager 骨架 + 注入（0.5d）
- 文件：新增 `src/fontra/filesystem/exportmanager.py`；
  修改 `src/fontra/filesystem/__init__.py`（工厂传参）、`src/fontra/__main__.py`（如有装配点）
- 步骤：
  1. 实现 getSupportedExportFormats / exportAs 骨架（exportAs 首版抛 NotImplementedError）
  2. filesystem 工厂构造 PM 时 `exportManager=EngramFontExportManager(...)`
- DoD：启动后 GET /serverinfo 的 projectManagerFeatures["export-as"] == ["ttf","otf","woff2"]；
  File 菜单出现 Export As（灰态可接受）

## T1.2 TTF/OTF 编译（1d）
- 文件：exportmanager.py 编译函数
- 步骤：
  1. getBackend(projectIdentifier)（复用 PM.fontHandlers）
  2. 逐字形展平绘制（compile-bridge 逻辑移植：PointToSegmentPen + TransformPointPen）
  3. FontBuilder + feaLib(addOpenTypeFeaturesFromString)
  4. 落盘 .exports/ 并返回 downloadPath
- DoD：MicroTon.ttf 工程导出的 TTF 用 harfbuzzjs shape "ton" == 1 字形（连字进产物）

## T1.3 WOFF2（0.5d）
- requirements.txt + brotli；flavor 切换
- DoD：woff2 文件头 wOF2，且可被浏览器 FontFace 加载

## T1.4 前端下载接线（0.5d）
- 文件：view-controller.js（1 行）
- DoD：E2E 点击菜单 → 浏览器下载触发

## T1.5 家族导出（1d）
- 步骤：sources 遍历 → 逐 source 实例化编译（文件名带 source 名）
- DoD：两 source 工程 → 两个文件，OS/2 usWeightClass 各异
