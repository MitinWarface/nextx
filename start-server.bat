@echo off
set NODE_ENV=development
set PATH=%TEMP%\node22\node-v22.11.0-win-x64;%PATH%
cd /d D:\Messanger
"%TEMP%\node22\node-v22.11.0-win-x64\node.exe" server.js > D:\Messanger\server.log 2> D:\Messanger\server.err.log
