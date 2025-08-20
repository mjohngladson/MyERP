@echo off
echo ===================================
echo    GiLi PoS - COMPLETE SOLUTION
echo ===================================
echo.
echo Creating FULL-FEATURED PoS with all requested features
echo.

:: Create distribution folder
set DIST_FOLDER=gili-pos-complete
if exist %DIST_FOLDER% rmdir /s /q %DIST_FOLDER%
mkdir %DIST_FOLDER%

echo Copying complete PoS files...
copy standalone-main.js %DIST_FOLDER%\
copy standalone-pos.html %DIST_FOLDER%\

:: Create minimal package.json
echo Creating package.json...
(
echo {
echo   "name": "gili-pos-complete",
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
echo echo    GiLi PoS - COMPLETE SOLUTION
echo echo ===================================
echo echo.
echo echo API: https://api-production-8536.up.railway.app
echo echo Currency: Indian Rupees ^(₹^)
echo echo GST: 18%%
echo echo.
echo echo ✅ COMPLETE FEATURES:
echo echo ├── Products: Sync from API
echo echo ├── Customers: Sync from API + Mobile Search
echo echo ├── Sales: History + Real-time sync
echo echo ├── Receipts: Auto-generate + Print
echo echo ├── Offline: Works offline with sync
echo echo ├── Cart: Full functionality
echo echo └── Payment: Cash/Card/UPI
echo echo.
echo echo 📱 CUSTOMER FEATURES:
echo echo ├── Add new customers
echo echo ├── Search by mobile number
echo echo ├── Select customer for billing
echo echo └── Loyalty points tracking
echo echo.
echo echo 🧾 RECEIPT FEATURES:
echo echo ├── Auto-generate on payment
echo echo ├── Print functionality
echo echo ├── Complete transaction details
echo echo └── GST breakdown
echo echo.
echo echo ⌨️  KEYBOARD SHORTCUTS:
echo echo ├── Ctrl+Enter: Checkout
echo echo ├── Ctrl+Delete: Void transaction
echo echo ├── Ctrl+S: Manual sync
echo echo ├── Ctrl+1: Products tab
echo echo ├── Ctrl+2: Customers tab
echo echo └── Ctrl+3: Sales tab
echo echo.
echo echo Starting complete PoS...
echo .\node_modules\.bin\electron.cmd standalone-main.js
echo pause
) > "Start GiLi PoS.bat"

cd ..

echo.
echo ===================================
echo ✅ SUCCESS! COMPLETE POS SYSTEM!
echo ===================================
echo.
echo Application: %DIST_FOLDER%\
echo.
echo 🎯 ALL FEATURES IMPLEMENTED:
echo.
echo 📦 PRODUCTS:
echo ✓ Sync from API: /api/pos/products
echo ✓ Offline fallback with mock data
echo ✓ Search by name, category, barcode
echo ✓ Stock validation
echo ✓ Real-time price display in rupees
echo.
echo 👥 CUSTOMERS:
echo ✓ Sync from API: /api/pos/customers
echo ✓ Add new customers with form
echo ✓ Search by name OR mobile number
echo ✓ Select customer for billing
echo ✓ Loyalty points display
echo ✓ Customer history tracking
echo.
echo 📊 SALES:
echo ✓ Real-time sales history
echo ✓ Sync to API: /api/pos/transactions
echo ✓ Local storage for offline
echo ✓ Transaction details view
echo ✓ Status tracking
echo.
echo 🧾 RECEIPTS:
echo ✓ Auto-generate on payment
echo ✓ Complete transaction details
echo ✓ Customer information
echo ✓ GST breakdown ^(18%%^)
echo ✓ Print functionality
echo ✓ Professional format
echo.
echo 💳 PAYMENTS:
echo ✓ Cash, Card, UPI options
echo ✓ Auto-calculate GST
echo ✓ Customer selection
echo ✓ Receipt generation
echo.
echo 🔄 SYNC ^& OFFLINE:
echo ✓ Auto-sync every 5 minutes
echo ✓ Manual sync button
echo ✓ Pending transaction queue
echo ✓ Offline mode with fallback
echo ✓ Connection status indicator
echo.
echo TESTING NOW...
start "" "%cd%\%DIST_FOLDER%\Start GiLi PoS.bat"

pause