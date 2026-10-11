@echo off
rem ============================================================
rem  EngramFont launcher: server + straight into the editor
rem  (new font, editable state - skips the project picker page)
rem  NOTE: keep this file ASCII-only (cmd parses it in ANSI/GBK)
rem ============================================================
cd /d "%~dp0"
set FONTDIR=E:\engram-dev\fontra-test-fonts
set PORT=8800
set FONTRA_EXE=%~dp0venv\Scripts\fontra.exe
set CURL=curl
if exist "%SystemRoot%\System32\curl.exe" set CURL=%SystemRoot%\System32\curl.exe

rem First run: create a new editable font project (Fontra native format)
if not exist "%FONTDIR%\Untitled.fontra" (
  echo Creating new font project: Untitled.fontra
  "%FONTRA_EXE%" new "%FONTDIR%\Untitled.fontra"
)

rem Start the server - prefer Windows Terminal, fall back to a minimized cmd
where wt >nul 2>nul
if not errorlevel 1 (
  start "" wt --title "EngramFont server" "%FONTRA_EXE%" --http-port %PORT% filesystem %FONTDIR%
) else (
  start "EngramFont-server" /min "%FONTRA_EXE%" --http-port %PORT% filesystem %FONTDIR%
)

rem Wait for the server to come up
set /a tries=0
:waitloop
ping -n 2 127.0.0.1 >nul
%CURL% -s -o nul --max-time 2 http://localhost:%PORT%/serverinfo && goto ready
set /a tries+=1
if %tries% lss 25 goto waitloop
echo [Error] EngramFont server failed to start. Check the EngramFont-server window.
pause
exit /b 1

:ready
echo EngramFont ready: http://localhost:%PORT%/editor.html?project=Untitled.fontra
start "" "http://localhost:%PORT%/editor.html?project=Untitled.fontra"
exit /b 0
