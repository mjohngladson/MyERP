#!/bin/bash
echo "Starting deployment script..."
cd frontend
echo "Installing dependencies..."
npm install --legacy-peer-deps
echo "Building application..."
NODE_OPTIONS="--openssl-legacy-provider" npm run build
echo "Installing serve..."
npm install -g serve
echo "Starting server..."
serve -s build -l 3000