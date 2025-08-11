@echo off
echo ===================================
echo    GiLi PoS - SIMPLE MODE  
echo ===================================
echo.
echo This uses a simplified startup without complex backup/hardware initialization.
echo Should work reliably based on the debug version that worked.
echo.
echo Starting GiLi PoS (Simple Mode)...
electron simple-main.js --no-sandbox --disable-dev-shm-usage
echo.
echo Application ended.
pause