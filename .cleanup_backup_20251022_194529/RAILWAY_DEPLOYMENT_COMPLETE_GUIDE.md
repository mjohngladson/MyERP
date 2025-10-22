# Railway Deployment Configuration Guide

## 🚀 Step-by-Step Railway Deployment

### Step 1: Deploy Backend to Railway

1. **Create Backend Service:**
```bash
cd /app/backend
railway login
railway init
# Choose "Create new project" and name it (e.g., "gili-backend")
```

2. **Add Database Service:**
```bash
# Option A: MongoDB (if available)
railway add mongodb

# Option B: PostgreSQL (recommended - Railway built-in)
railway add postgresql

# Option C: Use external MongoDB Atlas (recommended for production)
# Sign up at https://www.mongodb.com/atlas
# Create cluster and get connection string
```

3. **Set Backend Environment Variables in Railway:**
```bash
# For Railway PostgreSQL:
railway variables set MONGO_URL=$DATABASE_URL
railway variables set DB_NAME=gili_production
railway variables set PORT=8001

# For External MongoDB Atlas:
railway variables set MONGO_URL="your-atlas-connection-string"
railway variables set DB_NAME=gili_production
railway variables set PORT=8001
```

4. **Deploy Backend:**
```bash
railway up
# Note down the Railway URL: https://your-backend-name.railway.app
```

### Step 2: Update Frontend Configuration

1. **Update frontend/.env with your actual Railway backend URL:**
```env
REACT_APP_BACKEND_URL=https://your-backend-name.railway.app
WDS_SOCKET_PORT=443
```

### Step 3: Deploy Frontend to Railway

1. **Create Frontend Service:**
```bash
cd /app/frontend
railway init
# Choose "Create new project" and name it (e.g., "gili-frontend")
```

2. **Set Frontend Environment Variables:**
```bash
railway variables set REACT_APP_BACKEND_URL=https://your-backend-name.railway.app
railway variables set WDS_SOCKET_PORT=443
```

3. **Deploy Frontend:**
```bash
railway up
# Note down the Railway URL: https://your-frontend-name.railway.app
```

### Step 4: Deploy PoS Web Version (Optional)

1. **Deploy Public PoS:**
```bash
cd /app/pos-public
railway init
# Name it "gili-pos-public"
```

2. **Set PoS Environment Variables:**
```bash
railway variables set BACKEND_URL=https://your-backend-name.railway.app
railway variables set PORT=3002
```

3. **Deploy PoS:**
```bash
railway up
# Note down the Railway URL: https://your-pos-name.railway.app
```

## 🎯 Final Configuration

After deployment, you'll have these independent Railway services:

1. **Backend API:** `https://your-backend-name.railway.app`
2. **Frontend UI:** `https://your-frontend-name.railway.app` 
3. **PoS System:** `https://your-pos-name.railway.app` (optional)
4. **Database:** Railway PostgreSQL or MongoDB Atlas

## ⚙️ Environment Variables Summary

### Backend (.env or Railway variables):
```
MONGO_URL=<railway-database-url>
DB_NAME=gili_production
PORT=8001
```

### Frontend (.env or Railway variables):
```
REACT_APP_BACKEND_URL=https://your-backend-name.railway.app
WDS_SOCKET_PORT=443
```

### PoS (.env or Railway variables):
```
BACKEND_URL=https://your-backend-name.railway.app
PORT=3002
```

## 🔧 Next Steps

1. Run the deployment commands above
2. Replace placeholder URLs with your actual Railway URLs
3. Test each service independently
4. All services will work 24/7 without depending on your local agent

---

**Remember:** After deployment, your apps will be completely independent and accessible even when your local development environment is offline!