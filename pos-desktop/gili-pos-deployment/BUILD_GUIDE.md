# GiLi PoS - Windows Executable Build Guide

## 🚀 Creating Windows Executable

### Option 1: Use Build Script (Recommended)
```bash
# In gili-pos-deployment folder:
build-executable.bat
```

### Option 2: Manual Build
```bash
# Install build tools
npm install --save-dev electron-builder

# Build Windows installer
npm run build-win

# Build portable executable
npm run pack
```

## 📦 Build Output

After building, you'll find these files in the `dist/` folder:

### **For Distribution:**
- **`GiLi PoS Setup.exe`** - Full installer (recommended)
- **`GiLi-PoS-Portable.exe`** - Portable executable (no installation needed)

### **For Development:**
- **`win-unpacked/`** - Unpacked application folder

## 🎯 How to Use the Executable

### **Installer Version (`GiLi PoS Setup.exe`)**
1. **Double-click** the installer
2. **Follow installation wizard** 
3. **Desktop shortcut** will be created
4. **Start menu entry** will be added
5. **Run from desktop** or start menu

### **Portable Version (`GiLi-PoS-Portable.exe`)**
1. **Copy to any Windows machine**
2. **Double-click to run** (no installation)
3. **Runs from any folder**
4. **Great for USB drives**

## ✅ Distribution Features

### **What's Included:**
- ✅ **Complete PoS application**
- ✅ **All dependencies bundled**
- ✅ **SQLite database included**
- ✅ **Railway backend connection**
- ✅ **Auto-updater ready** (future)

### **System Requirements:**
- ✅ **Windows 10/11** (64-bit)
- ✅ **No Node.js required** on target machine
- ✅ **No additional installations** needed
- ✅ **Works offline** (local database)

## 🔧 Configuration

The executable uses these default settings:
- **Backend URL:** `https://api-production-8536.up.railway.app`
- **Database:** SQLite (automatically created)
- **Data Location:** `%APPDATA%/gili-pos/`

## 📋 File Sizes (Approximate)
- **Installer:** ~150-200 MB
- **Portable:** ~200-250 MB
- **Unpacked:** ~300-400 MB

## 🚀 Quick Test
After building, test the executable:
1. **Find the .exe file** in `dist/` folder
2. **Copy to desktop**
3. **Double-click to run**
4. **Should show GiLi PoS interface**
5. **Should connect to Railway backend**

---

**The executable is completely standalone and can be distributed to any Windows machine!** 🎉