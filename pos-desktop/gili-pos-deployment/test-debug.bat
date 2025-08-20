@echo off
echo ===================================
echo    GiLi PoS - DEBUG TEST
echo ===================================
echo.
echo Testing the manual build with debug output
echo.

cd gili-pos-manual
echo Current directory: %cd%

echo.
echo Checking if safe-main.js exists...
if exist safe-main.js (
    echo ✓ safe-main.js found
) else (
    echo ✗ safe-main.js NOT found
)

echo.
echo Checking if webSyncManager exists...
if exist src\sync\webSyncManager.js (
    echo ✓ webSyncManager found
) else (
    echo ✗ webSyncManager NOT found
)

echo.
echo Starting PoS with debug output...
echo Press Ctrl+Shift+I in the PoS window to open Developer Console
echo Check the Console tab for product loading messages
echo.

"Start GiLi PoS.bat"

cd ..