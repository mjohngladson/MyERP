@echo off
echo ===================================
echo    GiLi PoS - WEB VERSION SETUP
echo ===================================
echo.
echo Setting up the web-based PoS (no antivirus issues!)
echo.

:: Create web distribution folder
if not exist "gili-pos-web-dist" mkdir gili-pos-web-dist
cd gili-pos-web-dist

:: Copy web PoS files (assuming they exist in pos-public)
echo Copying web PoS files...
if exist "..\..\..\pos-public" (
    xcopy "..\..\..\pos-public\*" . /E /I /Y
) else (
    echo Creating simple web PoS...
    echo Creating package.json...
    echo { > package.json
    echo   "name": "gili-pos-web", >> package.json
    echo   "version": "1.0.0", >> package.json
    echo   "scripts": { >> package.json
    echo     "start": "node server.js" >> package.json
    echo   }, >> package.json
    echo   "dependencies": { >> package.json
    echo     "express": "^4.18.2", >> package.json
    echo     "cors": "^2.8.5" >> package.json
    echo   } >> package.json
    echo } >> package.json
    
    :: Create simple server
    echo Creating server.js...
    echo const express = require('express'); > server.js
    echo const app = express(); >> server.js
    echo const PORT = 3002; >> server.js
    echo app.use(express.static(__dirname)); >> server.js
    echo app.listen(PORT, () => console.log(`GiLi PoS running at http://localhost:${PORT}`)); >> server.js
)

:: Install dependencies
echo Installing dependencies...
call npm install

:: Create launcher
echo @echo off > "Start GiLi Web PoS.bat"
echo echo Starting GiLi Web PoS... >> "Start GiLi Web PoS.bat"
echo echo. >> "Start GiLi Web PoS.bat"
echo echo Web PoS will open at: http://localhost:3002 >> "Start GiLi Web PoS.bat"
echo echo. >> "Start GiLi Web PoS.bat"
echo start http://localhost:3002 >> "Start GiLi Web PoS.bat"
echo npm start >> "Start GiLi Web PoS.bat"

echo.
echo ===================================
echo ✓ Web PoS Setup Complete!
echo ===================================
echo.
echo Your web-based PoS is ready in: gili-pos-web-dist\
echo.
echo To use:
echo 1. Copy the "gili-pos-web-dist" folder anywhere
echo 2. Double-click "Start GiLi Web PoS.bat"
echo 3. Browser opens at http://localhost:3002
echo.
echo Benefits:
echo ✓ No antivirus issues
echo ✓ Works on any device with browser
echo ✓ Same functionality as desktop
echo ✓ Easy to distribute
echo.

cd ..
pause