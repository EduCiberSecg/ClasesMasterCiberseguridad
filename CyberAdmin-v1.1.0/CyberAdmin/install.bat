@echo off
REM CyberAdmin Security Center - lanzador del instalador (alternativa a install.ps1)
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if errorlevel 1 ( echo. & echo La preparacion ha fallado. Revisa los mensajes anteriores. & pause & exit /b 1 )
echo.
pause
