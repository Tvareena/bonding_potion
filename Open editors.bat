@echo off
rem Double-click to work on the game locally:
rem starts the local server (if it isn't running yet) and opens the Art editor and the Script editor in Microsoft Edge.
rem Keep the small "Bonding Potion server" window open while you work; close it to stop the server.
cd /d "%~dp0"
powershell -NoProfile -Command "try { Invoke-WebRequest http://localhost:8080/editor.html -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "Bonding Potion server - close to stop" /min powershell -NoProfile -ExecutionPolicy Bypass -File "tools\serve.ps1"
  timeout /t 2 /nobreak >nul
)
start "" msedge "http://localhost:8080/editor.html" "http://localhost:8080/script-editor.html"
