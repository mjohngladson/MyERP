@echo off
echo ===================================
echo    GiLi PoS - CONNECTION TEST
echo ===================================
echo.
echo Testing connection to Railway backend...
echo Backend URL: https://api-production-8536.up.railway.app
echo.

curl -s "https://api-production-8536.up.railway.app/api/pos/health" || echo "curl not available, using PowerShell..."

if %errorlevel% neq 0 (
    echo Using PowerShell to test connection...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://api-production-8536.up.railway.app/api/pos/health' -TimeoutSec 10; Write-Host 'Connection successful!'; Write-Host $response.Content } catch { Write-Host 'Connection failed:' $_.Exception.Message }"
)

echo.
echo If connection test passed, products should load in the PoS now.
echo.
pause