#!/usr/bin/env python3
"""
GiLi Backend Server - Railway Deployment Entry Point
"""
import os
import sys
import uvicorn

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Get port from Railway environment variable
    port = int(os.environ.get("PORT", 8001))
    
    print(f"🚀 Starting GiLi API on port {port}")
    print(f"🔧 Binding to 0.0.0.0:{port} for Railway compatibility")
    
    # Start the server
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True,
        reload=False  # Disable reload in production
    )