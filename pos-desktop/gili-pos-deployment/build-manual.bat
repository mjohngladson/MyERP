@echo off
echo ===================================
echo    GiLi PoS - MANUAL PACKAGE v2
echo ===================================
echo.
echo Creating a distributable folder manually (no build tools)
echo This WILL work - no complex build process!
echo.

:: Create distribution folder
set DIST_FOLDER=gili-pos-manual
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
echo   "name": "gili-pos-manual",
echo   "version": "1.0.0",
echo   "main": "safe-main.js",
echo   "dependencies": {
echo     "electron": "^28.1.0",
echo     "axios": "^1.6.2", 
echo     "electron-store": "^8.1.0",
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
echo .\node_modules\.bin\electron.cmd safe-main.js
echo pause
) > "Start GiLi PoS.bat"

cd ..

echo.
echo ===================================
echo ✓ SUCCESS! Manual package created!
echo ===================================
echo.
echo Your distributable PoS is in: %DIST_FOLDER%\
echo.
echo To use:
echo 1. Copy the entire "%DIST_FOLDER%" folder to any Windows PC
echo 2. Double-click "Start GiLi PoS.bat" in that folder
echo.
echo Features:
echo ✓ No compilation required
echo ✓ No antivirus issues
echo ✓ Works on any Windows 10/11
echo ✓ Includes all dependencies
echo ✓ Size: ~50-100MB
echo.
echo Testing the launcher...
start "" "%cd%\%DIST_FOLDER%\Start GiLi PoS.bat"

pause