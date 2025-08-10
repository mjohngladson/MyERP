@echo off
echo ===================================
echo    GiLi PoS - DEBUG MODE
echo ===================================
echo.
echo This will run a simplified version to test if Electron can show a window.
echo If this works, we know the issue is in the production-main.js complexity.
echo.
echo Starting debug mode...
electron debug-main.js
echo.
echo Debug session ended.
pause