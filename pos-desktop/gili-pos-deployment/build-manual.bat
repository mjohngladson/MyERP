@echo off
echo ===================================
echo    GiLi PoS - MANUAL PACKAGE v3
echo ===================================
echo.
echo Creating a distributable folder with FIXED sync manager
echo.

:: Create distribution folder
set DIST_FOLDER=gili-pos-manual-fixed
if exist %DIST_FOLDER% rmdir /s /q %DIST_FOLDER%
mkdir %DIST_FOLDER%

echo Copying application files...
copy safe-main.js %DIST_FOLDER%\
copy .env %DIST_FOLDER%\
xcopy src %DIST_FOLDER%\src\ /E /I /Y /Q

:: Create simple package.json for distribution
echo Creating distribution package.json...
(
echo {
echo   "name": "gili-pos-manual-fixed",
echo   "version": "1.0.0",
echo   "main": "safe-main.js",
echo   "dependencies": {
echo     "electron": "^28.1.0",
echo     "axios": "^1.6.2", 
echo     "dotenv": "^16.3.1"
echo   }
echo }
) > %DIST_FOLDER%\package.json

echo Installing dependencies in distribution folder...
cd %DIST_FOLDER%
call npm install --production

echo Creating launcher batch file...
(
echo @echo off
echo echo Starting GiLi Point of Sale...
echo echo.
echo echo Debug Console: Press Ctrl+Shift+I to see debug messages
echo echo.
echo .\node_modules\.bin\electron.cmd safe-main.js
echo pause
) > "Start GiLi PoS.bat"

cd ..

echo.
echo ===================================
echo ✓ SUCCESS! Fixed manual package created!
echo ===================================
echo.
echo Your distributable PoS is in: %DIST_FOLDER%\
echo.
echo FIXES APPLIED:
echo ✓ Removed electron-store dependency
echo ✓ Added simple file-based storage
echo ✓ Added mock product data for testing
echo ✓ Enhanced error handling and logging
echo.
echo To use:
echo 1. Copy the entire "%DIST_FOLDER%" folder to any Windows PC
echo 2. Double-click "Start GiLi PoS.bat" in that folder
echo 3. Press Ctrl+Shift+I to see debug console
echo.

pause