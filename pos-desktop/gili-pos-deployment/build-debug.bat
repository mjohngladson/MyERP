@echo off
echo ===================================
echo    Building GiLi PoS Executable
echo ===================================
echo.
echo This will create a Windows executable (.exe) file.
echo The process may take several minutes...
echo.

echo Current directory: %cd%
echo Checking package.json...
if exist package.json (
    echo ✓ package.json found
) else (
    echo ✗ package.json NOT found - please run from gili-pos-deployment folder
    pause
    exit /b 1
)

echo.
echo Installing build dependencies...
call npm install --save-dev electron-builder
if %errorlevel% neq 0 (
    echo ERROR: Failed to install electron-builder
    echo Error code: %errorlevel%
    pause
    exit /b 1
)

echo.
echo ✓ electron-builder installed successfully
echo.
echo Building Windows executable...
echo Running: npm run build-win
echo.

call npm run build-win
set build_result=%errorlevel%

echo.
echo ===================================
if %build_result% equ 0 (
    echo ✓ Build completed successfully!
    echo.
    echo Look for the executable in the 'dist' folder:
    dir dist /b 2>nul
    if %errorlevel% equ 0 (
        echo Files created:
        dir dist /b
    ) else (
        echo ✗ dist folder not found - build may have failed
    )
) else (
    echo ✗ Build failed with error code: %build_result%
    echo.
    echo Common issues:
    echo 1. Native dependencies compilation failure
    echo 2. Missing Visual Studio Build Tools
    echo 3. Node.js version compatibility
    echo.
    echo Try the portable build instead:
    echo npm run pack
)

echo ===================================
echo Press any key to continue...
pause >nul