@echo off
rem ============================================================
rem  EngramFont 启动器：一键直达编辑器（新字体 · 可编辑状态）
rem  逻辑：确保 Untitled.fontra 存在（没有就创建）→ 起服务 →
rem        直接打开编辑器，跳过字体选择主页
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"
set FONTDIR=E:\engram-dev\fontra-test-fonts
set PORT=8800

rem 首次运行：创建新的可编辑字体项目（Fontra 原生格式）
if not exist "%FONTDIR%\Untitled.fontra" (
  echo Creating new font project: Untitled.fontra
  venv\Scripts\fontra.exe new "%FONTDIR%\Untitled.fontra"
)

rem 启动服务（最小化窗口；改前端源码时另开窗口跑 npm run bundle-watch）
start "EngramFont-server" /min cmd /c "venv\Scripts\fontra.exe --http-port %PORT% filesystem %FONTDIR%"

rem 等服务就绪
set /a tries=0
:waitloop
timeout /t 1 /nobreak >nul
curl -s -o nul --max-time 2 http://localhost:%PORT%/serverinfo && goto ready
set /a tries+=1
if %tries% lss 25 goto waitloop
echo [Error] EngramFont server failed to start. Check the EngramFont-server window.
pause
exit /b 1

:ready
echo EngramFont ready: http://localhost:%PORT%/editor.html?project=Untitled.fontra
start "" "http://localhost:%PORT%/editor.html?project=Untitled.fontra"
exit /b 0
