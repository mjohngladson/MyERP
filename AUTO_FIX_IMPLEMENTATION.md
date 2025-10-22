# Automatic Backend URL Fix Implementation

## Overview

This document explains the automatic fix system that resolves the backend URL issue after forking the GiLi ERP application.

## Problem Statement

When forking the application to a new environment, the backend URL changes (e.g., from `erp-gili-1.preview.emergentagent.com` to `erp-debug-1.preview.emergentagent.com`), but the configuration still points to the old URL, causing login failures.

## Solution Architecture

### Components

1. **`/app/auto-fix-on-startup.sh`** - Automatic startup checker
   - Runs on every system startup via supervisor
   - Detects configuration issues
   - Triggers fix script if needed
   - Logs all actions

2. **`/app/fix-backend-url.sh`** - Core fix script
   - Auto-detects current backend URL
   - Updates configuration files
   - Cleans cache
   - Restarts services

3. **`/app/check-config.sh`** - Configuration verification tool
   - Checks current configuration
   - Verifies service status
   - Tests backend connectivity

4. **Supervisor Integration** - Automated execution
   - Auto-fix runs with priority 1 (first)
   - Other services start after auto-fix completes
   - Prevents race conditions

## How It Works

### Startup Sequence

```
System Startup
    ↓
1. MongoDB starts (priority 5)
    ↓
2. Auto-fix runs (priority 1) ← NEW
    ↓
   Checks configuration
    ↓
   Is config correct? ──Yes→ Exit (no action needed)
    ↓ No
   Run fix-backend-url.sh
    ↓
   Update .env and supervisor config
    ↓
   Clean cache
    ↓
   Restart services
    ↓
3. Backend starts (priority 10)
    ↓
4. Frontend starts (priority 20)
    ↓
System Ready
```

### Detection Logic

The auto-fix script uses multiple methods to detect the correct backend URL:

1. **Method 1:** Read from `/app/frontend/.env`
2. **Method 2:** Parse from supervisor logs
3. **Method 3:** Extract from hostname pattern

### Fix Trigger Conditions

The auto-fix runs when:
- Configuration URLs don't match (.env vs supervisor config)
- Backend is not accessible (HTTP errors)
- First startup after forking

## Files Modified

### 1. `/etc/supervisor/conf.d/supervisord.conf`

Added new program entry:
```ini
[program:auto-fix-backend-url]
command=/app/auto-fix-on-startup.sh
autostart=true
autorestart=false
startsecs=0
startretries=1
priority=1
```

Added priorities to existing programs:
- auto-fix-backend-url: priority=1 (runs first)
- mongodb: priority=5
- backend: priority=10
- frontend: priority=20

### 2. Created New Scripts

- `/app/auto-fix-on-startup.sh` - Automatic checker
- `/app/fix-backend-url.sh` - Core fix logic
- `/app/check-config.sh` - Configuration verifier

## Usage

### Automatic (Default Behavior)

After forking:
1. System starts automatically
2. Auto-fix detects and fixes configuration
3. Wait 60-90 seconds
4. Login at your new URL

### Manual Trigger

If you need to force a fix:
```bash
cd /app && ./fix-backend-url.sh
```

### Check Configuration

Verify your setup:
```bash
./check-config.sh
```

### View Auto-Fix Logs

```bash
# Main log file
cat /var/log/auto-fix-backend-url.log

# Supervisor logs
tail -f /var/log/auto-fix-backend-url.out.log
tail -f /var/log/auto-fix-backend-url.err.log
```

## Verification

After startup, verify the fix worked:

1. **Check services:**
   ```bash
   sudo supervisorctl status
   ```
   Expected: All RUNNING except auto-fix-backend-url (EXITED)

2. **Check configuration:**
   ```bash
   ./check-config.sh
   ```
   Expected: URLs match, backend accessible

3. **Check logs:**
   ```bash
   cat /var/log/auto-fix-backend-url.log
   ```
   Expected: "✅ Auto-fix completed successfully"

4. **Test login:**
   - Open your preview URL in browser
   - Login with admin@gili.com / admin123
   - Should redirect to dashboard

## Troubleshooting

### Auto-fix Failed

Check the logs:
```bash
cat /var/log/auto-fix-backend-url.log
```

Common issues:
- URL detection failed → Run manual fix with URL: `./fix-backend-url.sh https://your-url`
- Permissions issue → Check script has execute permission: `chmod +x /app/*.sh`
- Services didn't restart → Manual restart: `sudo supervisorctl restart all`

### Still Getting Old URL

1. Check browser console for actual URL being used
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache
4. Run manual fix: `./fix-backend-url.sh`
5. Verify logs show fix completed

### Services Not Starting

```bash
# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/frontend.err.log
tail -f /var/log/supervisor/backend.err.log

# Restart all
sudo supervisorctl restart all
```

## Technical Details

### Why This Approach?

1. **Automatic** - No manual intervention required
2. **Reliable** - Multiple detection methods ensure accuracy
3. **Safe** - Only runs when needed, doesn't break working configs
4. **Logged** - Full audit trail of all actions
5. **Priority-based** - Ensures fix runs before other services

### Alternative Approaches Considered

1. ❌ **Runtime environment variable detection** - React doesn't support this
2. ❌ **Proxy-based URL routing** - Too complex, adds latency
3. ❌ **Build-time injection** - Requires rebuild on every fork
4. ✅ **Startup script with supervisor** - Best balance of automation and reliability

### Edge Cases Handled

- First startup after fork
- Manual URL changes
- Service restart without reboot
- Multiple simultaneous fix attempts (lock file)
- Backend temporarily unavailable
- Missing configuration files

## Future Improvements

Possible enhancements:
- [ ] Add webhook to trigger fix on fork event
- [ ] Implement configuration validation API endpoint
- [ ] Add Slack/email notifications on auto-fix
- [ ] Create web UI for configuration management
- [ ] Add rollback capability if fix fails

## Maintenance

The auto-fix system requires minimal maintenance:

1. Scripts are version-controlled in `/app/`
2. Logs rotate automatically
3. No database dependencies
4. No external service dependencies
5. Idempotent - safe to run multiple times

## Summary

The automatic backend URL fix system provides a seamless experience after forking, eliminating the manual configuration step that previously caused login failures. The system is reliable, logged, and safe, with manual override options available if needed.

**For users:** Just wait 60-90 seconds after forking and start using the app!

**For developers:** The fix is transparent and logged, with full control via manual scripts if needed.
