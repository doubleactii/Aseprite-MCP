@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" (
  "runtime\node.exe" "server\build\setup.js"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Install Node.js 22 or newer from https://nodejs.org, then reopen Setup.
  ) else (
    call npm ci --ignore-scripts && call npm run build && node server\build\setup.js
  )
)
pause
