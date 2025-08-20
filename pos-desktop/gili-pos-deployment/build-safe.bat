@echo off
echo ===================================
echo    GiLi PoS - SAFE BUILD
echo ===================================
echo.
echo This build excludes native dependencies that trigger antivirus
echo.

echo Backing up original package.json...
copy package.json package.json.backup

echo Using safe package.json...
copy package-safe.json package.json

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
    echo ✓ No native dependencies
    echo ✓ Web-only data storage  
    echo ✓ Should pass antivirus scan
    echo.
) else (
    echo Build failed or output not found
)

pause