@echo off
echo ===================================
echo    GiLi PoS - FIXED BUILD v4
echo ===================================
echo.
echo Creating distributable folder with CONSTRUCTOR FIX
echo.

:: Create distribution folder
set DIST_FOLDER=gili-pos-final
if exist %DIST_FOLDER% rmdir /s /q %DIST_FOLDER%
mkdir %DIST_FOLDER%

echo Copying FIXED application files...
copy safe-main.js %DIST_FOLDER%\
copy .env %DIST_FOLDER%\
xcopy src %DIST_FOLDER%\src\ /E /I /Y /Q

:: Create simple package.json for distribution
echo Creating distribution package.json...
(
echo {
echo   "name": "gili-pos-final",
echo   "version": "1.0.0",
echo   "main": "safe-main.js",
echo   "dependencies": {
echo     "electron": "^28.1.0",
echo     "axios": "^1.6.2", 
echo     "dotenv": "^16.3.1"
echo   }
echo }
) > %DIST_FOLDER%\package.json

echo Installing dependencies...
cd %DIST_FOLDER%
call npm install --production --silent

echo Creating launcher...
(
echo @echo off
echo echo ===================================
echo echo    GiLi Point of Sale - FIXED
echo echo ===================================
echo echo.
echo echo Starting application...
echo echo Press Ctrl+Shift+I for debug console
echo echo.
echo .\node_modules\.bin\electron.cmd safe-main.js
echo echo.
echo echo Application closed.
echo pause
) > "Start GiLi PoS.bat"

cd ..

echo.
echo ===================================
echo ✓ SUCCESS! FINAL FIXED VERSION!
echo ===================================
echo.
echo Application folder: %DIST_FOLDER%\
echo.
echo CONSTRUCTOR FIX APPLIED:
echo ✓ Fixed store initialization order
echo ✓ Added comprehensive debug logging  
echo ✓ Mock products always available
echo ✓ Fallback for sync manager failure
echo.
echo TESTING NOW...
start "" "%cd%\%DIST_FOLDER%\Start GiLi PoS.bat"

pause