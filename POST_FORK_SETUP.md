# Post-Fork Setup Guide for GiLi ERP

## Issue After Forking

When you fork this project to a new environment, the frontend will fail to connect to the backend because the **backend URL is hardcoded** in the supervisor configuration file. This causes login failures with CORS errors.

### Why This Happens

1. The supervisor config (`/etc/supervisor/conf.d/supervisord.conf`) contains environment variables for the frontend
2. One of these variables is `REACT_APP_BACKEND_URL` which points to the old fork's URL
3. React embeds environment variables at **build time**, not runtime
4. After forking, the old URL is no longer valid, causing connection failures

### Symptoms

- ❌ Login page loads but login fails silently
- ❌ Browser console shows CORS errors pointing to old URL (e.g., `erp-gili-1.preview.emergentagent.com`)
- ❌ Console log shows: `Using backend URL from env: https://erp-[old-name].preview.emergentagent.com`

## Automated Fix

We've created an automated script to fix this issue. Simply run:

```bash
cd /app
./fix-backend-url.sh
```

### What the Script Does

1. ✅ **Auto-detects** your current preview URL from the hostname
2. ✅ **Updates** `/app/frontend/.env` with correct backend URL
3. ✅ **Updates** `/etc/supervisor/conf.d/supervisord.conf` with correct environment variable
4. ✅ **Cleans** frontend build cache to force rebuild
5. ✅ **Restarts** all services (frontend and backend)

### Manual Override

If auto-detection doesn't work, you can specify the URL manually:

```bash
./fix-backend-url.sh https://your-custom-url.preview.emergentagent.com
```

## Manual Fix (If Script Fails)

If the automated script doesn't work, follow these manual steps:

### Step 1: Find Your Current Backend URL

Your backend URL follows this pattern:
```
https://erp-[your-fork-name].preview.emergentagent.com
```

You can find it by running:
```bash
hostname
# Output: erp-debug-1 (example)
# Your URL: https://erp-debug-1.preview.emergentagent.com
```

### Step 2: Update Supervisor Config

```bash
# Replace OLD_URL with the old URL and NEW_URL with your current URL
sudo nano /etc/supervisor/conf.d/supervisord.conf

# Find this line in [program:frontend] section:
# environment=HOST="0.0.0.0",PORT="3000",REACT_APP_BACKEND_URL="https://OLD_URL"

# Change it to:
# environment=HOST="0.0.0.0",PORT="3000",REACT_APP_BACKEND_URL="https://NEW_URL"

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 3: Update Frontend .env

```bash
nano /app/frontend/.env

# Update this line:
REACT_APP_BACKEND_URL=https://your-new-url.preview.emergentagent.com

# Save and exit
```

### Step 4: Clean Cache and Restart

```bash
# Clean frontend cache
cd /app/frontend
rm -rf node_modules/.cache .cache build

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update

# Stop and kill frontend processes
sudo supervisorctl stop frontend
sudo pkill -9 -f "react-scripts"
sleep 2

# Start frontend
sudo supervisorctl start frontend

# Restart backend
sudo supervisorctl restart backend
```

### Step 5: Wait and Verify

Wait 30-60 seconds for the frontend to compile, then:

1. Open your browser to your preview URL
2. Open Developer Tools (F12) → Console
3. Look for: `🔧 API Service - Using backend URL from env: https://...`
4. Verify it shows your **current** URL, not the old one
5. Try logging in with:
   - Email: `admin@gili.com`
   - Password: `admin123`

## Verification Checklist

After running the fix, verify these items:

- [ ] Services are running: `sudo supervisorctl status`
- [ ] Backend is accessible: `curl https://your-url/api/auth/login`
- [ ] Frontend console shows correct URL
- [ ] Login works successfully
- [ ] Dashboard loads after login

## Troubleshooting

### Issue: Script can't detect URL

**Solution:** Run with manual URL:
```bash
./fix-backend-url.sh https://your-actual-url.preview.emergentagent.com
```

### Issue: Services won't start

**Solution:** Check logs:
```bash
# Backend logs
tail -n 50 /var/log/supervisor/backend.err.log

# Frontend logs
tail -n 50 /var/log/supervisor/frontend.err.log
```

### Issue: Still showing old URL after fix

**Solution:** Hard clear browser cache or try incognito mode. React bundles can be cached by the browser.

### Issue: 502 Bad Gateway

**Solution:** Wait longer (services are still starting) or restart:
```bash
sudo supervisorctl restart all
```

## Prevention for Future Forks

**Important:** Each time you fork this project to a new environment, you **must** run the fix script:

```bash
cd /app
./fix-backend-url.sh
```

This is a one-time setup required after each fork due to environment-specific URLs.

## Default Credentials

After successful setup, login with:

- **Email:** admin@gili.com
- **Password:** admin123

Additional test users:
- john.doe@company.com / password123
- jane.smith@company.com / password123

## Support

If you continue to experience issues after running the automated fix:

1. Verify you're using the correct backend URL
2. Check that all services are running: `sudo supervisorctl status`
3. Review browser console for specific error messages
4. Check backend logs for authentication errors

---

**Quick Command Reference:**

```bash
# Run automated fix
cd /app && ./fix-backend-url.sh

# Check service status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log

# Restart everything
sudo supervisorctl restart all
```
