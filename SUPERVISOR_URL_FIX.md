# Supervisor Configuration URL Fix

## Problem
The frontend application was pointing to Railway backend URL (`https://myerp-production.up.railway.app`) instead of Preview backend URL (`https://erp-gili-1.preview.emergentagent.com`), despite the `.env` file being correctly configured.

## Root Cause
The issue was in the supervisor configuration file at `/etc/supervisor/conf.d/supervisord.conf`. The `REACT_APP_BACKEND_URL` environment variable was hardcoded in the supervisor config, overriding the `.env` file:

```ini
[program:frontend]
command=yarn start
environment=HOST="0.0.0.0",PORT="3000",REACT_APP_BACKEND_URL="https://myerp-production.up.railway.app",DANGEROUSLY_DISABLE_HOST_CHECK="true"
```

## Solution
Updated the supervisor configuration to use the Preview backend URL:

```ini
[program:frontend]
command=yarn start
environment=HOST="0.0.0.0",PORT="3000",REACT_APP_BACKEND_URL="https://erp-gili-1.preview.emergentagent.com",DANGEROUSLY_DISABLE_HOST_CHECK="true"
```

## Fix Applied
1. Modified `/etc/supervisor/conf.d/supervisord.conf` line 15
2. Reloaded supervisor configuration: `sudo supervisorctl reread && sudo supervisorctl update`
3. Verified the frontend process has the correct URL

## Verification
- Process environment check: `ps auxe | grep "react-scripts" | grep REACT_APP_BACKEND_URL`
  - Result: `REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com` ✅

- Backend API test: `curl https://erp-gili-1.preview.emergentagent.com/api/financial/accounts`
  - Result: Returns correct Chart of Accounts data ✅

- Frontend application now successfully connects to Preview backend

## Important Notes
- The `.env` file in `/app/frontend/.env` is correctly configured but was being overridden by supervisor
- Supervisor environment variables take precedence over `.env` files
- Any future URL changes must be made in BOTH locations:
  1. `/app/frontend/.env`
  2. `/etc/supervisor/conf.d/supervisord.conf` (line 15)

## Date Fixed
October 6, 2025
