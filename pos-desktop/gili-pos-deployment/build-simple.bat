@echo off
echo ===================================
echo    GiLi PoS - Simplified Build
echo ===================================
echo.
echo This creates a portable folder instead of a single .exe
echo Much more reliable and faster!
echo.

echo Installing electron-builder...
call npm install --save-dev electron-builder
if %errorlevel% neq 0 (
    echo Failed to install electron-builder
    pause
    exit /b 1
)

echo.
echo Creating portable application...
call npm run pack

if %errorlevel% equ 0 (
    echo.
    echo ===================================
    echo ✓ SUCCESS! Portable app created!
    echo ===================================
    echo.
    echo Find your application in:
    echo dist\win-unpacked\
    echo.
    echo To run: Double-click "GiLi PoS.exe" in that folder
    echo.
    echo To distribute: Copy the entire "win-unpacked" folder
    echo.
    if exist "dist\win-unpacked\GiLi PoS.exe" (
        echo Testing the executable...
        start "" "dist\win-unpacked\GiLi PoS.exe"
    )
) else (
    echo Build failed. Let's try a different approach...
)

pause