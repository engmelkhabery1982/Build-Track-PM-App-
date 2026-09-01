@echo off
setlocal
cd /d "F:\PM App\Project"
if not exist "tmp\local-agent-runs" mkdir "tmp\local-agent-runs"
"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "F:\PM App\Project\tools\watch-local-agent-work-orders.ps1" 1>>"tmp\local-agent-runs\watcher-console.log" 2>&1
exit /b %ERRORLEVEL%
