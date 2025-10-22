# GiLi ERP - Business Management System

## 🚀 Quick Start After Forking

**IMPORTANT:** If you just forked this project, run this command first:

```bash
cd /app && ./fix-backend-url.sh
```

This fixes the backend URL configuration issue that occurs after forking. Wait 60 seconds after running, then refresh your browser.

📖 **Full documentation:** See [POST_FORK_SETUP.md](POST_FORK_SETUP.md)

---

## Default Login Credentials

- **Email:** admin@gili.com
- **Password:** admin123

---

## System Status

Check if all services are running:
```bash
sudo supervisorctl status
```

Expected output:
- ✅ backend - RUNNING
- ✅ frontend - RUNNING  
- ✅ mongodb - RUNNING
- ✅ code-server - RUNNING

---

## Check Configuration

Before troubleshooting, run the checker to verify everything is configured correctly:

```bash
./check-config.sh
```

This will show you:
- ✅ Backend URL configuration
- ✅ Service status  
- ✅ Backend connectivity
- ⚠️  Any configuration issues

## Troubleshooting

### Can't Login?
1. Run the fix script: `./fix-backend-url.sh`
2. Wait 60 seconds for services to restart
3. Hard refresh browser (Ctrl+Shift+R)
4. Try login again

### Configuration Issues?
```bash
# Check your configuration
./check-config.sh

# If issues found, run fix
./fix-backend-url.sh
```

### Services Not Running?
```bash
sudo supervisorctl restart all
```

### Need Logs?
```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.err.log
```

---

## Here are your Instructions
