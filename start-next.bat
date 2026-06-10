@echo off
set NODE_ENV=development
set PATH=%TEMP%\node22\node-v22.11.0-win-x64;%PATH%
cd /d D:\Messanger
start /B "" "%TEMP%\node22\node-v22.11.0-win-x64\node.exe" "node_modules\next\dist\bin\next" dev > D:\Messanger\next.log 2> D:\Messanger\next.err
