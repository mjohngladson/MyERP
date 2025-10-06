# Where to Run the Backend Switching Scripts

## Quick Answer

Run the scripts in the **Emergent Platform Terminal** where your ERP application is deployed.

---

## Step-by-Step Instructions

### Method 1: Using Emergent Platform Terminal (Recommended)

1. **Open Emergent Platform**
   - Go to your Emergent workspace
   - Find your GiLi ERP project

2. **Open Terminal/Console**
   - Look for a "Terminal", "Console", or "Shell" button/tab
   - This opens a command line interface to your container

3. **Run the Switch Command**
   ```bash
   cd /app
   ./switch-backend.sh preview
   ```
   OR
   ```bash
   cd /app
   ./switch-backend.sh railway
   ```

---

### Method 2: If You Have SSH Access

If you have SSH access to your Emergent container:

```bash
# SSH into your container
ssh user@your-emergent-host

# Navigate to app directory
cd /app

# Run the script
./switch-backend.sh preview
```

---

## Visual Guide

```
┌─────────────────────────────────────────────┐
│  Emergent Platform Interface                │
├─────────────────────────────────────────────┤
│                                             │
│  Your Project: GiLi ERP                     │
│                                             │
│  [Overview] [Logs] [Terminal] [Settings]   │ ← Click "Terminal"
│                                             │
├─────────────────────────────────────────────┤
│  Terminal / Console / Shell                 │
│  ┌────────────────────────────────────────┐│
│  │ $ cd /app                              ││ ← Type here
│  │ $ ./switch-backend.sh preview          ││
│  │                                        ││
│  │ Current backend URL:                   ││
│  │ https://myerp-production.up.railway..││
│  │                                        ││
│  │ Switching to Preview Mode...          ││
│  │ ✓ Switched to Preview Mode            ││
│  │ ✓ Backend URL: https://retail-erp...  ││
│  │                                        ││
│  └────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: You're in Emergent Web Interface

1. Look for terminal/console access in your Emergent dashboard
2. Click to open terminal
3. You'll see a command prompt like: `root@container:/app#` or similar
4. Run: `./switch-backend.sh preview`

### Scenario 2: You're Working Locally (Testing)

If you've pulled the code to your local machine:

```bash
# Navigate to your local project directory
cd /path/to/your/gili-erp-project

# Run the script
./switch-backend.sh preview
```

### Scenario 3: Using Emergent CLI (If Available)

```bash
# If Emergent has a CLI tool
emergent exec your-project-id -- /app/switch-backend.sh preview
```

---

## Where NOT to Run

❌ **Don't run in:**
- Your local computer's terminal (unless you have the code locally)
- Railway dashboard/terminal (this switches the Emergent frontend)
- Git Bash or any local shell (unless connected to Emergent)
- Your code editor terminal (unless connected to Emergent container)

✅ **Do run in:**
- Emergent platform terminal/console
- SSH session to your Emergent container
- Any terminal that has access to `/app/switch-backend.sh`

---

## How to Know You're in the Right Place

**Check 1: Verify you're in the container**
```bash
pwd
# Should output: /app or similar container path
```

**Check 2: Verify script exists**
```bash
ls -la /app/switch-backend.sh
# Should show: -rwxr-xr-x ... /app/switch-backend.sh
```

**Check 3: Verify you can see the app files**
```bash
ls /app
# Should show: backend/ frontend/ switch-backend.sh ...
```

---

## Alternative: Manual Edit Without Script

If you can't run the script, you can manually edit the file:

1. **Open file editor in Emergent platform**
2. **Navigate to:** `/app/frontend/.env`
3. **Edit the file:**

   **For Preview:**
   ```bash
   REACT_APP_BACKEND_URL=https://erp-nextgen.preview.emergentagent.com
   # REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app
   ```

   **For Railway:**
   ```bash
   # REACT_APP_BACKEND_URL=https://erp-nextgen.preview.emergentagent.com
   REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app
   ```

4. **Save the file**

5. **Restart frontend manually:**
   ```bash
   sudo supervisorctl restart frontend
   ```

---

## Troubleshooting

### Problem: "Command not found"

**Check if you're in the right directory:**
```bash
cd /app
pwd  # Should show /app
```

**Check if script is executable:**
```bash
chmod +x /app/switch-backend.sh
```

### Problem: "Permission denied"

**Make script executable:**
```bash
chmod +x /app/switch-backend.sh
```

**Or run with bash:**
```bash
bash /app/switch-backend.sh preview
```

### Problem: Can't find Emergent terminal

**Look for these terms in Emergent UI:**
- Terminal
- Console
- Shell
- Command Line
- CLI
- Exec

**Or contact Emergent support for terminal access instructions**

---

## Quick Commands Reference

```bash
# Navigate to app directory
cd /app

# Check current backend
./switch-backend.sh current

# Switch to Preview
./switch-backend.sh preview

# Switch to Railway
./switch-backend.sh railway

# View help
./switch-backend.sh help

# Manual check of .env file
cat /app/frontend/.env | grep REACT_APP_BACKEND_URL
```

---

## Summary

**Location:** Run in **Emergent Platform Terminal/Console**  
**Directory:** `/app`  
**Command:** `./switch-backend.sh [preview|railway]`  
**Access:** Through Emergent web interface or SSH  

The script must run in the environment where your application is deployed, not on your local machine (unless you have the code locally).
