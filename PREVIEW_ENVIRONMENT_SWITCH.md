# Backend URL Switch - Preview Environment

**Date**: Current Session
**Action**: Reverted backend URL from Railway Production to Preview Environment

## Changes Made

### 1. Frontend Environment (.env)
- **File**: `/app/frontend/.env`
- **URL**: `https://erp-debug-1.preview.emergentagent.com`
- **Status**: ✅ Already configured correctly

### 2. Supervisor Configuration
- **File**: `/etc/supervisor/conf.d/supervisord.conf`
- **Section**: `[program:frontend]`
- **Before**: `REACT_APP_BACKEND_URL="https://myerp-production.up.railway.app"`
- **After**: `REACT_APP_BACKEND_URL="https://erp-debug-1.preview.emergentagent.com"`

### 3. Service Restart
```bash
sudo sed -i 's|myerp-production.up.railway.app|retail-nexus-18.preview.emergentagent.com|g' /etc/supervisor/conf.d/supervisord.conf
sudo supervisorctl reread
sudo supervisorctl update
```

## Verification

✅ **Frontend Process Environment**: Confirmed via `/proc/<pid>/environ`
```
REACT_APP_BACKEND_URL=https://erp-debug-1.preview.emergentagent.com
```

✅ **Services Status**: All services running
- Backend: RUNNING (port 8001)
- Frontend: RUNNING (port 3000)
- MongoDB: RUNNING

## Current Configuration

**Frontend URL**: https://erp-debug-1.preview.emergentagent.com (port 3000)
**Backend URL**: https://erp-debug-1.preview.emergentagent.com/api
**Environment**: Preview (Emergent Platform)

## Testing Access

The application is now configured for preview environment testing:
- Frontend accessible at: https://erp-debug-1.preview.emergentagent.com
- Backend API at: https://erp-debug-1.preview.emergentagent.com/api
- All API calls from frontend will use the preview backend

## Features Ready for Testing

1. **Bank Reconciliation**
   - Navigate to: Financial → Bank Reconciliation
   - Upload CSV: `/app/sample_bank_statement.csv`
   - Test auto-match, manual match, reports

2. **Payment Allocation**
   - Navigate to: Financial → Payment Entry
   - View any payment → Click "Allocate Payment"
   - Allocate payment to invoices

## Next Steps

- ✅ Environment switched to Preview
- ⏳ Ready for frontend testing
- ⏳ Manual or automated testing pending user choice
