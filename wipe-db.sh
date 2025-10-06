#!/bin/bash

# Simple wrapper script for database wipe utility
# Usage: ./wipe-db.sh [options]

cd /app

echo "╔══════════════════════════════════════════════╗"
echo "║   DATABASE WIPE UTILITY - PREVIEW MODE       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not available"
    exit 1
fi

# Run the Python script with arguments
python3 wipe-database.py "$@"
