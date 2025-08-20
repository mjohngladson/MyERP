@echo off
echo ===================================
echo    GiLi PoS - SAFE BUILD v2
echo ===================================
echo.
echo This build excludes native dependencies that trigger antivirus
echo Uses web storage instead of SQLite
echo.

echo Backing up original package.json...
copy package.json package.json.backup

echo Using safe package.json...
copy package-safe.json package.json

echo Cleaning node_modules...
if exist node_modules rmdir /s /q node_modules

echo Installing safe dependencies...
call npm install

echo Building safe executable...
call npm run pack-safe

echo Restoring original package.json...
copy package.json.backup package.json

if exist "dist-safe\win-unpacked\GiLi PoS Safe.exe" (
    echo.
    echo ===================================
    echo ✓ SUCCESS! Safe build created!
    echo ===================================
    echo.
    echo Your safe executable is at:
    echo dist-safe\win-unpacked\GiLi PoS Safe.exe
    echo.
    echo This version:
    echo ✓ No SQLite/SerialPort dependencies
    echo ✓ Uses web storage (electron-store)
    echo ✓ Should pass antivirus scan
    echo ✓ Connects to Railway backend
    echo.
    echo Testing the executable...
    start "" "dist-safe\win-unpacked\GiLi PoS Safe.exe"
) else (
    echo Build failed or output not found
    if exist "dist-safe" (
        echo Contents of dist-safe:
        dir dist-safe /b /s
    )
)

pause