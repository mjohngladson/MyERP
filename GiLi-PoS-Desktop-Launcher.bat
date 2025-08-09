@echo off
title GiLi Point of Sale - Desktop Launcher
echo.
echo =============================================
echo         GiLi Point of Sale Launcher
echo =============================================
echo.

REM Check if we have a public URL
set PUBLIC_URL=https://your-pos-url.railway.app
echo Opening GiLi PoS...
echo.
echo If you haven't deployed to public URL yet:
echo 1. Deploy the pos-public folder to Railway
echo 2. Update PUBLIC_URL in this script
echo.

REM Try to open in app mode (looks like desktop app)
start "" --app=%PUBLIC_URL% chrome.exe
if %ERRORLEVEL% EQU 0 goto success

REM Fallback to default browser
start "" %PUBLIC_URL%
if %ERRORLEVEL% EQU 0 goto success

echo Error: Could not open browser
pause
exit /b 1

:success
echo.
echo GiLi PoS opened successfully!
echo.
echo Tips:
echo - Use Ctrl+Shift+I to open developer tools
echo - The app works offline after first load
echo - Bookmarking for easy access
echo.
timeout /t 5 /nobreak >nul
exit /b 0