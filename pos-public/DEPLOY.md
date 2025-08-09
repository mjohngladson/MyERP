# GiLi PoS - Railway Deployment Guide

## 🚀 Quick Railway Deployment

### Step 1: Prepare the files
Your PoS is ready to deploy! The `/app/pos-public/` folder contains:
- ✅ `package.json` - Node.js dependencies
- ✅ `server.js` - Express server
- ✅ `index.html` - PoS application
- ✅ `railway.json` - Railway configuration

### Step 2: Deploy to Railway
1. **Create new Railway project**: https://railway.app/new
2. **Connect your GitHub repo** or **deploy from CLI**
3. **Select the `pos-public` folder** as root
4. **Railway will auto-detect** Node.js and deploy

### Step 3: Configure after deployment
1. **Get your Railway URL** (e.g., `https://your-pos.railway.app`)
2. **Test the PoS** - it will automatically connect to your backend
3. **Share the public URL** with your team

## 🔧 Railway Configuration
- **Port**: Automatically configured (Railway provides PORT env var)
- **Start command**: `node server.js`
- **Health check**: `/health` endpoint
- **Static files**: Served from root directory

## 🎯 Expected Result
Once deployed, you'll have:
- 🌐 **Public URL**: `https://your-pos-name.railway.app`
- 🔄 **Auto-sync**: Connects to your GiLi backend automatically
- 📱 **Mobile friendly**: Works on phones, tablets, desktops
- ⚡ **Fast loading**: Static HTML with CDN resources

---
Deploy command: `railway up` (from pos-public folder)