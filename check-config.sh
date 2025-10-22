#!/bin/bash
# Configuration Checker Script
# Quickly verify if backend URL is correctly configured

echo "=================================================="
echo "🔍 GiLi ERP - Configuration Checker"
echo "=================================================="
echo ""

# Check .env file
echo "1️⃣ Frontend .env configuration:"
if [ -f /app/frontend/.env ]; then
    DOTENV_URL=$(grep "REACT_APP_BACKEND_URL=" /app/frontend/.env | grep -v "^#" | tail -1 | cut -d'=' -f2 | tr -d ' ')
    echo "   Backend URL: $DOTENV_URL"
else
    echo "   ⚠️  .env file not found"
fi

echo ""

# Check supervisor config
echo "2️⃣ Supervisor configuration:"
if [ -f /etc/supervisor/conf.d/supervisord.conf ]; then
    SUPERVISOR_URL=$(grep "REACT_APP_BACKEND_URL" /etc/supervisor/conf.d/supervisord.conf | grep -o 'https://[^"]*' | head -1)
    echo "   Backend URL: $SUPERVISOR_URL"
else
    echo "   ⚠️  Supervisor config not found"
fi

echo ""

# Check if URLs match
echo "3️⃣ Configuration consistency:"
if [ "$DOTENV_URL" = "$SUPERVISOR_URL" ]; then
    echo "   ✅ URLs match - configuration is consistent"
else
    echo "   ⚠️  URLs don't match - run ./fix-backend-url.sh"
    echo "      .env:       $DOTENV_URL"
    echo "      supervisor: $SUPERVISOR_URL"
fi

echo ""

# Check service status
echo "4️⃣ Service status:"
sudo supervisorctl status | while read line; do
    if [[ $line == *"RUNNING"* ]]; then
        echo "   ✅ $line"
    else
        echo "   ❌ $line"
    fi
done

echo ""

# Check if backend is accessible
echo "5️⃣ Backend connectivity:"
BACKEND_URL="${DOTENV_URL:-$SUPERVISOR_URL}"
if [ ! -z "$BACKEND_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/login" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test","password":"test"}' 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Backend is accessible (HTTP $HTTP_CODE)"
    else
        echo "   ❌ Backend not accessible (HTTP $HTTP_CODE)"
    fi
else
    echo "   ⚠️  Could not determine backend URL"
fi

echo ""
echo "=================================================="
echo "Summary:"
echo "=================================================="

if [ "$DOTENV_URL" = "$SUPERVISOR_URL" ] && [ "$HTTP_CODE" != "000" ]; then
    echo "✅ Configuration looks good!"
    echo ""
    echo "Login at: $BACKEND_URL"
    echo "Credentials: admin@gili.com / admin123"
else
    echo "⚠️  Configuration issues detected"
    echo ""
    echo "Run this to fix:"
    echo "  cd /app && ./fix-backend-url.sh"
fi

echo ""
