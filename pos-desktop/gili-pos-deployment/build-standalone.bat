@echo off
echo ===================================
echo    GiLi PoS - API INTEGRATED VERSION
echo ===================================
echo.
echo Creating PoS with FULL API INTEGRATION and RUPEES currency
echo.

:: Create distribution folder
set DIST_FOLDER=gili-pos-api-integrated
if exist %DIST_FOLDER% rmdir /s /q %DIST_FOLDER%
mkdir %DIST_FOLDER%

echo Copying API-integrated files...
copy standalone-main.js %DIST_FOLDER%\
copy standalone-pos.html %DIST_FOLDER%\

:: Create minimal package.json
echo Creating package.json...
(
echo {
echo   "name": "gili-pos-api-integrated",
echo   "version": "1.0.0",
echo   "main": "standalone-main.js",
echo   "dependencies": {
echo     "electron": "^28.1.0"
echo   }
echo }
) > %DIST_FOLDER%\package.json

echo Installing Electron...
cd %DIST_FOLDER%
call npm install --production --silent

echo Creating launcher...
(
echo @echo off
echo echo ===================================
echo echo    GiLi PoS - API INTEGRATED
echo echo ===================================
echo echo.
echo echo API: https://api-production-8536.up.railway.app
echo echo Currency: Indian Rupees ^(₹^)
echo echo GST: 18%%
echo echo.
echo echo API INTEGRATION FEATURES:
echo echo ✓ Loads products from Railway API
echo echo ✓ Sends sales data to API
echo echo ✓ Offline mode with local storage
echo echo ✓ Auto-sync pending transactions
echo echo ✓ Stock validation
echo echo.
echo echo Starting PoS...
echo .\node_modules\.bin\electron.cmd standalone-main.js
echo pause
) > "Start GiLi PoS.bat"

cd ..

echo.
echo ===================================
echo ✓ SUCCESS! API INTEGRATED PoS!
echo ===================================
echo.
echo Application: %DIST_FOLDER%\
echo.
echo API INTEGRATION FEATURES:
echo ✓ Products sync from: https://api-production-8536.up.railway.app/api/pos/products
echo ✓ Sales sync to: https://api-production-8536.up.railway.app/api/pos/transactions
echo ✓ Currency: Indian Rupees ^(₹^)
echo ✓ Tax: 18%% GST
echo ✓ Offline fallback with mock products
echo ✓ Pending transaction sync when online
echo ✓ Stock quantity validation
echo ✓ Auto-sync every 5 minutes
echo.
echo KEYBOARD SHORTCUTS:
echo ✓ Ctrl+Enter: Checkout
echo ✓ Ctrl+Delete: Void transaction
echo ✓ Ctrl+S: Manual sync
echo.
echo TESTING NOW...
start "" "%cd%\%DIST_FOLDER%\Start GiLi PoS.bat"

pause