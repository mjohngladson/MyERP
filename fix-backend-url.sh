#!/bin/bash
# Automated Backend URL Fix Script
# This script fixes the backend URL issue that occurs after forking
# Run this script after forking to update all backend URL references

set -e

echo "=================================================="
echo "🔧 GiLi ERP - Backend URL Auto-Fix Script"
echo "=================================================="
echo ""

# Detect current preview URL from multiple sources

# Method 1: Check frontend .env file
if [ -f /app/frontend/.env ]; then
    DETECTED_URL=$(grep "REACT_APP_BACKEND_URL=" /app/frontend/.env | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
    if [ ! -z "$DETECTED_URL" ] && [[ $DETECTED_URL =~ preview.emergentagent.com ]]; then
        CURRENT_BACKEND_URL="$DETECTED_URL"
        echo "✅ Detected URL from .env: $CURRENT_BACKEND_URL"
    fi
fi

# Method 2: Try to detect from actual running frontend process
if [ -z "$CURRENT_BACKEND_URL" ]; then
    # Check supervisor logs for actual URL being used
    if [ -f /var/log/supervisor/frontend.out.log ]; then
        DETECTED_URL=$(grep -o "https://[^\"']*preview.emergentagent.com" /var/log/supervisor/frontend.out.log | head -1)
        if [ ! -z "$DETECTED_URL" ]; then
            CURRENT_BACKEND_URL="$DETECTED_URL"
            echo "✅ Detected URL from logs: $CURRENT_BACKEND_URL"
        fi
    fi
fi

# Method 3: Try hostname pattern
if [ -z "$CURRENT_BACKEND_URL" ]; then
    CURRENT_HOSTNAME=$(hostname)
    if [[ $CURRENT_HOSTNAME =~ erp-[a-zA-Z0-9-]+ ]]; then
        PREVIEW_PREFIX="${BASH_REMATCH[0]}"
        CURRENT_BACKEND_URL="https://erp-integrity.preview.emergentagent.com"
        echo "✅ Detected URL from hostname: $CURRENT_BACKEND_URL"
    fi
fi

# If still not detected, require manual input
if [ -z "$CURRENT_BACKEND_URL" ]; then
    echo "❌ Could not auto-detect backend URL"
    echo ""
    echo "Please run with your backend URL:"
    echo "  ./fix-backend-url.sh https://erp-integrity.preview.emergentagent.com"
    echo ""
    echo "To find your URL, check:"
    echo "  1. Your browser address bar when accessing the app"
    echo "  2. Run: grep REACT_APP_BACKEND_URL /app/frontend/.env"
    exit 1
fi

# Allow manual override
if [ ! -z "$1" ]; then
    CURRENT_BACKEND_URL="$1"
    echo "🔄 Using manually specified URL: $CURRENT_BACKEND_URL"
fi

echo ""
echo "🔄 Updating configuration files..."
echo ""

# 1. Update frontend .env file
echo "1️⃣ Updating /app/frontend/.env..."
if [ -f /app/frontend/.env ]; then
    # Backup existing .env
    cp /app/frontend/.env /app/frontend/.env.backup
    
    # Update the REACT_APP_BACKEND_URL in .env
    sed -i "s|REACT_APP_BACKEND_URL=https://[^\"]*|REACT_APP_BACKEND_URL=$CURRENT_BACKEND_URL|g" /app/frontend/.env
    
    echo "   ✅ Updated .env file"
else
    echo "   ⚠️  .env file not found, skipping"
fi

# 2. Update supervisor configuration
echo "2️⃣ Updating supervisor configuration..."
if [ -f /etc/supervisor/conf.d/supervisord.conf ]; then
    # Backup existing config
    sudo cp /etc/supervisor/conf.d/supervisord.conf /etc/supervisor/conf.d/supervisord.conf.backup
    
    # Update REACT_APP_BACKEND_URL in supervisor config
    sudo sed -i "s|REACT_APP_BACKEND_URL=\"https://[^\"]*\"|REACT_APP_BACKEND_URL=\"$CURRENT_BACKEND_URL\"|g" /etc/supervisor/conf.d/supervisord.conf
    
    echo "   ✅ Updated supervisor config"
else
    echo "   ⚠️  Supervisor config not found, skipping"
fi

# 3. Clean frontend cache
echo "3️⃣ Cleaning frontend cache..."
if [ -d /app/frontend ]; then
    cd /app/frontend
    rm -rf node_modules/.cache .cache build 2>/dev/null || true
    echo "   ✅ Cleaned frontend cache"
fi

# 4. Reload supervisor and restart services
echo "4️⃣ Restarting services..."
sudo supervisorctl reread
sudo supervisorctl update
sleep 2

# Stop frontend and kill any lingering processes
sudo supervisorctl stop frontend
sleep 2
sudo pkill -9 -f "react-scripts" 2>/dev/null || true
sudo pkill -9 -f "node.*start" 2>/dev/null || true
sleep 2

# Start frontend with new config
sudo supervisorctl start frontend
echo "   ✅ Frontend restarted"

# Restart backend for good measure
sudo supervisorctl restart backend
echo "   ✅ Backend restarted"

echo ""
echo "=================================================="
echo "✅ Backend URL Fix Complete!"
echo "=================================================="
echo ""
echo "Updated configuration:"
echo "  Backend URL: $CURRENT_BACKEND_URL"
echo ""
echo "⏳ Please wait 30-60 seconds for services to start..."
echo ""
echo "You can check service status with:"
echo "  sudo supervisorctl status"
echo ""
echo "Test login at:"
echo "  $CURRENT_BACKEND_URL"
echo ""
echo "Default credentials:"
echo "  Email: admin@gili.com"
echo "  Password: admin123"
echo ""
