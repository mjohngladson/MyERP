@echo off
echo ===================================
echo    GiLi PoS - Manual Packaging
echo ===================================
echo.
echo This creates a distributable folder manually
echo.

:: Create distribution folder
if not exist "manual-dist" mkdir manual-dist
cd manual-dist

:: Copy essential files
echo Copying application files...
xcopy "..\simple-main.js" . /Y
xcopy "..\package.json" . /Y  
xcopy "..\.env" . /Y
xcopy "..\src" "src\" /E /I /Y

:: Create a simple launcher
echo @echo off > "Start GiLi PoS.bat"
echo echo Starting GiLi Point of Sale... >> "Start GiLi PoS.bat"
echo electron simple-main.js --no-sandbox --disable-dev-shm-usage >> "Start GiLi PoS.bat"
echo pause >> "Start GiLi PoS.bat"

:: Install dependencies
echo Installing dependencies...
call npm install --production

echo.
echo ===================================
echo ✓ Manual package created!
echo ===================================
echo.
echo Your portable PoS is in: manual-dist\
echo.
echo To run: 
echo 1. Copy the "manual-dist" folder to any Windows PC
echo 2. Install Node.js on that PC
echo 3. Double-click "Start GiLi PoS.bat"
echo.

cd ..
pause