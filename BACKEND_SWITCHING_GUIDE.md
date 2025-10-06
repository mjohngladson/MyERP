# Backend URL Switching Guide

Easy guide to switch between Preview Mode and Railway deployment.

---

## Quick Switch Methods

### Method 1: Using the Switch Script (Recommended) ⚡

**Switch to Preview Mode:**
```bash
cd /app
./switch-backend.sh preview
```

**Switch to Railway:**
```bash
cd /app
./switch-backend.sh railway
```

**Check Current Backend:**
```bash
cd /app
./switch-backend.sh current
```

**The script will automatically:**
- ✅ Update the .env file
- ✅ Restart the frontend
- ✅ Show confirmation

---

### Method 2: Manual Edit 📝

Edit `/app/frontend/.env` file manually:

**For Preview Mode:**
```bash
# Option 1: Preview Mode (Emergent Platform)
REACT_APP_BACKEND_URL=https://erp-nextgen.preview.emergentagent.com

# Option 2: Railway Production
# REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app
```

**For Railway:**
```bash
# Option 1: Preview Mode (Emergent Platform)
# REACT_APP_BACKEND_URL=https://erp-nextgen.preview.emergentagent.com

# Option 2: Railway Production
REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app
```

**Then restart frontend:**
```bash
sudo supervisorctl restart frontend
```

---

## Backend URLs Reference

| Environment | URL | Use Case |
|------------|-----|----------|
| **Preview** | `https://erp-nextgen.preview.emergentagent.com` | Emergent platform preview/testing |
| **Railway** | `https://myerp-production.up.railway.app` | Production deployment on Railway |
| **Local** | `http://localhost:8001` | Local development (not recommended for frontend) |

---

## When to Use Each Mode

### Preview Mode (Emergent Platform)
**Use when:**
- ✅ Testing new features on Emergent platform
- ✅ Using Emergent's preview environment
- ✅ Debugging with Emergent tools
- ✅ Development within Emergent ecosystem

**Backend Server:** Hosted on Emergent infrastructure

### Railway Mode
**Use when:**
- ✅ Testing production deployment
- ✅ Verifying Railway-specific configurations
- ✅ Testing with production database
- ✅ End-to-end production testing

**Backend Server:** Hosted on Railway infrastructure

---

## Verification Steps

After switching, verify the change worked:

### 1. Check Environment Variable
```bash
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL
```

### 2. Check Frontend is Running
```bash
sudo supervisorctl status frontend
```
Should show: `frontend RUNNING`

### 3. Test in Browser
1. Open your frontend URL
2. Open DevTools (F12) → Network tab
3. Perform any action (e.g., login)
4. Check the API request URL:
   - Preview: Should go to `retail-erp.preview.emergentagent.com`
   - Railway: Should go to `myerp-production.up.railway.app`

### 4. Check Console Logs
```javascript
// In browser console:
console.log(process.env.REACT_APP_BACKEND_URL)
```

---

## Troubleshooting

### Issue: Changes Not Reflecting

**Solution:**
```bash
# Hard restart frontend
sudo supervisorctl stop frontend
sudo supervisorctl start frontend

# OR restart all services
sudo supervisorctl restart all
```

**Clear browser cache:**
- Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
- Or use Incognito/Private mode

### Issue: Frontend Not Starting

**Check logs:**
```bash
tail -f /var/log/supervisor/frontend.*.log
```

**Verify .env file:**
```bash
cat /app/frontend/.env
```

### Issue: 404 or Connection Errors

**Verify backend is accessible:**

**For Preview:**
```bash
curl https://erp-nextgen.preview.emergentagent.com/api/
```

**For Railway:**
```bash
curl https://myerp-production.up.railway.app/api/
```

Both should return a response (not 404 or connection refused).

---

## Script Usage Examples

### Check Current Backend
```bash
$ ./switch-backend.sh current
Current backend URL:
https://erp-nextgen.preview.emergentagent.com
```

### Switch to Railway
```bash
$ ./switch-backend.sh railway
Current backend URL:
https://erp-nextgen.preview.emergentagent.com

Switching to Railway...
✓ Switched to Railway
✓ Backend URL: https://myerp-production.up.railway.app

Restarting frontend to apply changes...
✓ Frontend restarted

Current backend URL:
https://myerp-production.up.railway.app
```

### Switch to Preview
```bash
$ ./switch-backend.sh preview
Current backend URL:
https://myerp-production.up.railway.app

Switching to Preview Mode...
✓ Switched to Preview Mode
✓ Backend URL: https://erp-nextgen.preview.emergentagent.com

Restarting frontend to apply changes...
✓ Frontend restarted

Current backend URL:
https://erp-nextgen.preview.emergentagent.com
```

---

## Important Notes

### ⚠️ URLs Are NOT Overwritten
- Both URLs are preserved in the .env file
- Only one is active at a time (uncommented)
- Switching just comments/uncomments the appropriate line

### 🔄 Frontend Must Be Restarted
- Changes to .env require frontend restart
- The script does this automatically
- Manual changes require: `sudo supervisorctl restart frontend`

### 🌐 No Backend Changes Needed
- Switching only affects the **frontend**
- Backend continues running normally
- No backend restart required

### 📦 For Railway Deployment
- The Railway frontend deployment needs `REACT_APP_BACKEND_URL` configured
- This is set in Railway dashboard, not via this script
- This script only affects the **local Emergent environment**

---

## Backend-Specific Considerations

### Preview Backend Features
- Connected to Emergent platform database
- Uses Emergent authentication
- Optimized for preview/testing

### Railway Backend Features
- Connected to Railway/MongoDB database
- Production configuration
- Production authentication setup

---

## Quick Reference Card

```bash
# Switch to Preview
./switch-backend.sh preview

# Switch to Railway  
./switch-backend.sh railway

# Check current
./switch-backend.sh current

# Get help
./switch-backend.sh help
```

---

## Files Modified

- ✅ `/app/frontend/.env` - Backend URL configuration
- ✅ `/app/switch-backend.sh` - Switching script
- ✅ `/app/BACKEND_SWITCHING_GUIDE.md` - This guide

---

## Summary

You can now easily switch between Preview and Railway backends without overwriting any URLs. Both are preserved and you can toggle between them anytime!

**Default Mode:** Preview (Emergent Platform)  
**Production Mode:** Railway  
**Switch Time:** ~2 seconds + frontend restart (~3 seconds)

Happy switching! 🚀
