@echo off
rem Push the current branch with retries. Pure ASCII on purpose: cmd.exe reads
rem batch files in the OEM code page (936 here), so UTF-8 Chinese would break.
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-retry.ps1" %*
set "CODE=%ERRORLEVEL%"
endlocal & exit /b %CODE%
