# URL Switch to Railway - Summary

## Date: October 6, 2025

## Action Performed
Switched frontend and API URLs from Preview (Emergent Platform) to Railway Production using the automated switch-backend.sh script.

## Changes Made

### 1. Frontend .env File
**File:** `/app/frontend/.env`
**Change:** 
- **Before:** `REACT_APP_BACKEND_URL=https://erp-nextgen.preview.emergentagent.com`
- **After:** `REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app`

### 2. Supervisor Configuration
**File:** `/etc/supervisor/conf.d/supervisord.conf`
**Change:** Line 15 environment variable
- **Before:** `REACT_APP_BACKEND_URL="https://erp-nextgen.preview.emergentagent.com"`
- **After:** `REACT_APP_BACKEND_URL="https://myerp-production.up.railway.app"`

## Verification Steps Completed
1. ✅ Ran switch-backend.sh script with 'railway' parameter
2. ✅ Updated supervisor configuration to use Railway URL
3. ✅ Reloaded supervisor configuration (supervisorctl reread && update)
4. ✅ Restarted frontend service
5. ✅ Verified process environment variables show Railway URL
6. ✅ Confirmed frontend service is running

## Current Status
- **Frontend:** RUNNING with Railway backend URL
  - Accessible at: https://ui-production-ccf6.up.railway.app
- **Backend:** RUNNING 
  - API endpoint: https://myerp-production.up.railway.app
- **MongoDB:** RUNNING (unchanged)
- **Code-Server:** RUNNING (unchanged)

## URLs in Use
- **Frontend URL:** https://ui-production-ccf6.up.railway.app (Railway Production UI)
- **Backend API URL:** https://myerp-production.up.railway.app (Railway Production API)

## How to Switch Back to Preview
Run the following command:
```bash
/app/switch-backend.sh preview
```

Then manually update the supervisor configuration:
```bash
sudo nano /etc/supervisor/conf.d/supervisord.conf
# Change line 15 back to Preview URL
sudo supervisorctl reread && sudo supervisorctl update
```

## Notes
- The switch-backend.sh script only updates the .env file and restarts frontend
- Supervisor configuration must be manually updated for persistent changes
- Both .env and supervisor config must match for proper operation
- Frontend will now make API calls to Railway production backend
