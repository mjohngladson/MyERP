@echo off
echo ===================================
echo    GiLi PoS - MINIMAL SAFE BUILD
echo ===================================
echo.
echo Using the simplest possible configuration
echo.

echo Step 1: Backup original package.json
if exist package.json.backup del package.json.backup
copy package.json package.json.backup

echo Step 2: Use minimal configuration
copy package-minimal.json package.json

echo Step 3: Clean install
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist

echo Step 4: Install dependencies
call npm install

echo Step 5: Build executable
call npm run pack

echo Step 6: Check results
if exist "dist\win-unpacked\GiLi PoS.exe" (
    echo.
    echo ===================================
    echo ✓ SUCCESS! Minimal build worked!
    echo ===================================
    echo.
    echo Executable location:
    echo %cd%\dist\win-unpacked\GiLi PoS.exe
    echo.
    echo File size:
    for %%A in ("dist\win-unpacked\GiLi PoS.exe") do echo %%~zA bytes
    echo.
    echo Testing executable...
    start "" "%cd%\dist\win-unpacked\GiLi PoS.exe"
) else (
    echo ❌ Build failed or executable not found
    echo.
    echo Let's check what was created:
    if exist dist (
        echo Contents of dist folder:
        dir dist /s /b
    ) else (
        echo No dist folder created - build completely failed
    )
)

echo Step 7: Restore original package.json
copy package.json.backup package.json

echo.
pause