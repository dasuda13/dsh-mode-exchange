@echo off
rem ===========================================================================
rem  publish-npm.cmd - wrapper around publish-npm.ps1
rem
rem  Windows ships with an execution policy (RemoteSigned) that blocks
rem  unsigned local .ps1 files:
rem      .\scripts\publish-npm.ps1
rem      -> "is not digitally signed. You cannot run this script on the current system."
rem
rem  This wrapper launches the script with -ExecutionPolicy Bypass, which applies
rem  only to that one powershell process. The system-wide policy is untouched.
rem
rem  Usage (same arguments as the .ps1, passed through verbatim):
rem      scripts\publish-npm.cmd -DryRun
rem      scripts\publish-npm.cmd -Otp 123456
rem      scripts\publish-npm.cmd -Version 0.1.1
rem
rem  NOTE: this file is deliberately ASCII-only. cmd.exe reads batch files with
rem  the OEM code page (936/GBK on zh-CN), so UTF-8 Chinese comments would be
rem  mangled and, worse, echoed as failed commands.
rem ===========================================================================
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-npm.ps1" %*
set "CODE=%ERRORLEVEL%"
endlocal & exit /b %CODE%
