@echo off
echo ===================================
echo    GiLi PoS - Desktop Application
echo ===================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the pos-desktop directory
    pause
    exit /b 1
)

echo Starting GiLi PoS Desktop Application...
echo.
echo Tips:
echo - If the UI doesn't appear, check the console output below
echo - Hardware errors are normal in development (printers, scanners, etc.)
echo - The app should connect to your Railway backend automatically
echo.
echo ===================================
echo.

:: Run the PoS application
npm start

echo.
echo ===================================
echo Application has stopped.
echo Check the output above for any errors.
pause