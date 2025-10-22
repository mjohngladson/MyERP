#!/bin/bash
# Auto-fix Backend URL on Startup
# This script runs automatically when the system starts
# It detects if the backend URL needs updating and fixes it

LOG_FILE="/var/log/auto-fix-backend-url.log"
LOCK_FILE="/tmp/backend-url-fix.lock"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Auto-fix Backend URL - Startup Check"
log "=========================================="

# Prevent multiple simultaneous runs
if [ -f "$LOCK_FILE" ]; then
    log "Lock file exists, another instance may be running. Exiting."
    exit 0
fi

touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Get current backend URL from .env
CURRENT_ENV_URL=""
if [ -f /app/frontend/.env ]; then
    CURRENT_ENV_URL=$(grep "REACT_APP_BACKEND_URL=" /app/frontend/.env | grep -v "^#" | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
fi

# Get backend URL from supervisor config
SUPERVISOR_URL=""
if [ -f /etc/supervisor/conf.d/supervisord.conf ]; then
    SUPERVISOR_URL=$(grep "REACT_APP_BACKEND_URL" /etc/supervisor/conf.d/supervisord.conf | grep -o 'https://[^"]*' | head -1)
fi

log "Current .env URL: $CURRENT_ENV_URL"
log "Supervisor config URL: $SUPERVISOR_URL"

# Check if URLs match
if [ "$CURRENT_ENV_URL" = "$SUPERVISOR_URL" ] && [ ! -z "$CURRENT_ENV_URL" ]; then
    log "URLs match. No fix needed."
    
    # Try to detect if this is the actual correct URL by testing it
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$CURRENT_ENV_URL/api/auth/login" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test","password":"test"}' 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "200" ]; then
        log "Backend is accessible. Configuration is correct."
        exit 0
    else
        log "Backend not accessible (HTTP $HTTP_CODE). May need fixing."
    fi
fi

# URLs don't match or backend not accessible - run fix
log "Configuration mismatch or backend not accessible. Running auto-fix..."

# Run the fix script
if [ -f /app/fix-backend-url.sh ]; then
    log "Executing fix-backend-url.sh..."
    /app/fix-backend-url.sh >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log "✅ Auto-fix completed successfully"
    else
        log "❌ Auto-fix failed. Manual intervention may be required."
    fi
else
    log "❌ Fix script not found at /app/fix-backend-url.sh"
    exit 1
fi

log "Auto-fix startup check complete."
log "=========================================="
