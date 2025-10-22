# Railway Deployment Configuration Guide

## Critical Issue Fixed: Frontend Environment Variables

### Problem
The frontend was receiving HTML instead of JSON during API calls because `REACT_APP_BACKEND_URL` wasn't available during the Docker build process on Railway.

### Root Cause
React environment variables (prefixed with `REACT_APP_`) must be available at **BUILD TIME**, not runtime. These variables are embedded into the JavaScript bundle during the webpack build process.

### Solution Implemented
Modified `/app/frontend/Dockerfile` to accept the backend URL as a build argument and set it as an environment variable before the build step.

---

## Railway Configuration Steps

### Frontend Service Configuration

1. **Navigate to your Frontend service in Railway dashboard**

2. **Go to the "Variables" tab**

3. **Add the following environment variable:**
   - Variable Name: `REACT_APP_BACKEND_URL`
   - Value: `https://erp-gili-1.preview.emergentagent.com` (or your backend URL)
   - **Important**: Make sure this is set as a **Build-time variable** (not just runtime)

4. **Verify the configuration:**
   ```
   REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com
   ```

5. **Trigger a new deployment:**
   - After adding the variable, trigger a new deployment
   - Railway will rebuild the Docker image with the environment variable available during build
   - The React app will now have the correct backend URL embedded in the JavaScript bundle

### Backend Service Configuration

1. **Navigate to your Backend service in Railway dashboard**

2. **Verify these environment variables are set:**
   - `MONGO_URL` - Your MongoDB connection string
   - `SENDGRID_API_KEY` - Your SendGrid API key (if using email)
   - `SENDGRID_FROM_EMAIL` - Your verified sender email
   - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID (if using SMS)
   - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
   - `TWILIO_FROM_PHONE` - Your Twilio phone number

3. **Health check is configured at:** `/api/`

---

## Verification Steps

### After Deployment

1. **Check the frontend build logs:**
   - Look for the Docker build process
   - Verify that `REACT_APP_BACKEND_URL` is being set during the build

2. **Test the login functionality:**
   - Navigate to your frontend URL
   - Open browser DevTools (F12) → Network tab
   - Try to login with credentials: `admin@gili.com` / `admin123`
   - Verify the API call goes to: `https://erp-gili-1.preview.emergentagent.com/api/auth/login`
   - Should receive JSON response with `success: true` and JWT token

3. **Check for the fix:**
   - **Before fix:** API calls went to frontend URL (returned HTML)
   - **After fix:** API calls go to backend URL (return JSON)

---

## Common Issues & Troubleshooting

### Issue: Still receiving HTML instead of JSON

**Solution:**
1. Verify `REACT_APP_BACKEND_URL` is set in Railway frontend service variables
2. Make sure it's a **build-time** variable (not just runtime)
3. Trigger a **new deployment** after adding the variable
4. Clear browser cache and try again

### Issue: CORS errors

**Solution:**
1. Verify backend CORS configuration includes your frontend URL
2. Check `/app/backend/server.py` - should include Railway frontend URL in allowed origins

### Issue: Backend URL not being read

**Solution:**
1. Check Railway build logs for any errors during Docker build
2. Verify the Dockerfile ARG and ENV instructions are present
3. Ensure Railway is passing the variable during build

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Railway Deployment                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend Service (Port 3000)                          │
│  ├─ Dockerfile build with REACT_APP_BACKEND_URL        │
│  ├─ React app with embedded backend URL                │
│  └─ Serves static files via 'serve'                    │
│                                                         │
│  Backend Service (Port 8001)                           │
│  ├─ FastAPI application                                │
│  ├─ Routes prefixed with /api                          │
│  └─ MongoDB connection                                  │
│                                                         │
│  Kubernetes Ingress                                    │
│  ├─ Routes /api/* → Backend (8001)                     │
│  └─ Routes /* → Frontend (3000)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Variables Reference

### Frontend (.env)
```bash
# Railway production backend URL
REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

### Backend (.env)
```bash
# MongoDB connection
MONGO_URL=mongodb://localhost:27017/gili_erp

# Email service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@example.com

# SMS service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_PHONE=+1234567890
```

---

## Next Steps

1. **Configure Railway environment variables** as described above
2. **Trigger a new deployment** for the frontend service
3. **Test the application** by logging in and verifying API calls
4. **Monitor the logs** for any errors during deployment

---

## Support

If you encounter issues after following this guide:
1. Check Railway build and runtime logs
2. Verify all environment variables are set correctly
3. Test API endpoints directly using curl or Postman
4. Ensure backend service is running and healthy

---

**Last Updated:** September 2025
**Deployment Platform:** Railway
**Tech Stack:** React + FastAPI + MongoDB
