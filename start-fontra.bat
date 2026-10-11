@echo off
rem engram-builder 开发启动：bundle-watch（热重建）+ fontra server（filesystem 模式）
chcp 65001 >nul
cd /d "%~dp0"
start "fontra-bundle-watch" cmd /k npm run bundle-watch
venv\Scripts\fontra.exe --launch filesystem E:\engram-dev\fontra-test-fonts --dev
