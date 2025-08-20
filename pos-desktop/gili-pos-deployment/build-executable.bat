@echo off
echo ===================================
echo    Building GiLi PoS Executable
echo ===================================
echo.
echo This will create a Windows executable (.exe) file.
echo The process may take several minutes...
echo.

echo Installing build dependencies...
npm install --save-dev electron-builder

echo.
echo Building Windows executable...
npm run build-win

echo.
echo ===================================
echo Build completed!
echo.
echo Look for the executable in the 'dist' folder:
echo - GiLi PoS Setup.exe (Installer)
echo - GiLi-PoS-Portable.exe (Portable)
echo.
echo You can distribute these files to other Windows machines.
echo ===================================
pause