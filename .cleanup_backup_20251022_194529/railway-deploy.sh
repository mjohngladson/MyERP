#!/bin/bash

# GiLi Railway Deployment Script
# This script helps deploy all GiLi components to Railway with correct configurations

echo "🚀 GiLi Railway Deployment Helper"
echo "=================================="
echo

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "Please install Railway CLI first:"
    echo "npm install -g @railway/cli"
    echo "or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if user is logged in
if ! railway status &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI is ready!"
echo

# Deploy Backend
echo "📦 Step 1: Deploying Backend..."
echo "==============================="
cd backend
echo "Current directory: $(pwd)"
echo

echo "Choose your database option:"
echo "1. Railway PostgreSQL (Recommended)"
echo "2. External MongoDB Atlas"
echo "3. Skip database setup (I'll configure manually)"
read -p "Enter choice (1-3): " db_choice

case $db_choice in
    1)
        echo "Setting up with Railway PostgreSQL..."
        railway init --name "gili-backend"
        railway add postgresql
        railway variables set DB_NAME="gili_production"
        railway variables set PORT="8001"
        echo "ℹ️  PostgreSQL will be available as \$DATABASE_URL"
        ;;
    2)
        read -p "Enter your MongoDB Atlas connection string: " mongo_url
        railway init --name "gili-backend"
        railway variables set MONGO_URL="$mongo_url"
        railway variables set DB_NAME="gili_production"
        railway variables set PORT="8001"
        ;;
    3)
        railway init --name "gili-backend"
        railway variables set DB_NAME="gili_production"
        railway variables set PORT="8001"
        echo "⚠️  Remember to set MONGO_URL manually in Railway dashboard"
        ;;
esac

echo "Deploying backend..."
railway up

# Get backend URL
backend_url=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ -z "$backend_url" ]; then
    read -p "Enter your backend Railway URL (https://your-backend.railway.app): " backend_url
fi

echo "✅ Backend deployed at: $backend_url"
echo

# Deploy Frontend
echo "📦 Step 2: Deploying Frontend..."
echo "==============================="
cd ../frontend
echo "Current directory: $(pwd)"

railway init --name "gili-frontend"
railway variables set REACT_APP_BACKEND_URL="$backend_url"
railway variables set WDS_SOCKET_PORT="443"

echo "Deploying frontend..."
railway up

frontend_url=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ -z "$frontend_url" ]; then
    read -p "Enter your frontend Railway URL (https://your-frontend.railway.app): " frontend_url
fi

echo "✅ Frontend deployed at: $frontend_url"
echo

# Deploy PoS (Optional)
echo "📦 Step 3: Deploying PoS Web (Optional)..."
echo "=========================================="
read -p "Do you want to deploy the web PoS? (y/n): " deploy_pos

if [ "$deploy_pos" = "y" ] || [ "$deploy_pos" = "Y" ]; then
    cd ../pos-public
    echo "Current directory: $(pwd)"

    railway init --name "gili-pos-public"
    railway variables set BACKEND_URL="$backend_url"
    railway variables set PORT="3002"

    echo "Deploying PoS..."
    railway up

    pos_url=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ -z "$pos_url" ]; then
        read -p "Enter your PoS Railway URL (https://your-pos.railway.app): " pos_url
    fi

    echo "✅ PoS deployed at: $pos_url"
else
    echo "⏭️  Skipping PoS deployment"
fi

echo
echo "🎉 Deployment Complete!"
echo "======================="
echo "Backend:  $backend_url"
echo "Frontend: $frontend_url"
if [ ! -z "$pos_url" ]; then
    echo "PoS:      $pos_url"
fi
echo
echo "🔧 Next steps:"
echo "1. Test all URLs to ensure they're working"
echo "2. Update any hardcoded URLs in your code"
echo "3. Configure your database connection if needed"
echo "4. All services are now independent and will work 24/7!"
echo
echo "📚 For troubleshooting, see: /app/RAILWAY_DEPLOYMENT_COMPLETE_GUIDE.md"