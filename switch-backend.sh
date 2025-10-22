#!/bin/bash

# Script to switch between Preview and Railway backend URLs
# Usage: ./switch-backend.sh [preview|railway]

ENV_FILE="/app/frontend/.env"

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_current() {
    echo -e "${BLUE}Current backend URL:${NC}"
    grep "^REACT_APP_BACKEND_URL=" "$ENV_FILE" | sed 's/REACT_APP_BACKEND_URL=//'
    echo ""
}

switch_to_preview() {
    echo -e "${YELLOW}Switching to Preview Mode...${NC}"
    
    # Create temporary file with updated content
    sed -e 's|^REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com|' \
        -e 's|^# REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com|REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com|' \
        -e 's|^REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app|# REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app|' \
        "$ENV_FILE" > "${ENV_FILE}.tmp"
    
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
    
    echo -e "${GREEN}✓ Switched to Preview Mode${NC}"
    echo -e "${GREEN}✓ Backend URL: https://erp-gili-1.preview.emergentagent.com${NC}"
}

switch_to_railway() {
    echo -e "${YELLOW}Switching to Railway...${NC}"
    
    # Create temporary file with updated content
    sed -e 's|^REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app|' \
        -e 's|^# REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app|REACT_APP_BACKEND_URL=https://myerp-production.up.railway.app|' \
        -e 's|^REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com|# REACT_APP_BACKEND_URL=https://erp-gili-1.preview.emergentagent.com|' \
        "$ENV_FILE" > "${ENV_FILE}.tmp"
    
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
    
    echo -e "${GREEN}✓ Switched to Railway${NC}"
    echo -e "${GREEN}✓ Backend URL: https://myerp-production.up.railway.app${NC}"
}

restart_frontend() {
    echo ""
    echo -e "${YELLOW}Restarting frontend to apply changes...${NC}"
    sudo supervisorctl restart frontend
    sleep 2
    echo -e "${GREEN}✓ Frontend restarted${NC}"
}

show_help() {
    echo "Backend URL Switcher"
    echo ""
    echo "Usage: ./switch-backend.sh [option]"
    echo ""
    echo "Options:"
    echo "  preview    - Switch to Preview Mode (Emergent Platform)"
    echo "  railway    - Switch to Railway Production"
    echo "  current    - Show current backend URL"
    echo "  help       - Show this help message"
    echo ""
    echo "Example:"
    echo "  ./switch-backend.sh preview"
    echo "  ./switch-backend.sh railway"
    echo ""
}

# Main script logic
case "$1" in
    preview)
        show_current
        switch_to_preview
        restart_frontend
        echo ""
        show_current
        ;;
    railway)
        show_current
        switch_to_railway
        restart_frontend
        echo ""
        show_current
        ;;
    current)
        show_current
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${YELLOW}No option specified${NC}"
        echo ""
        show_help
        ;;
esac
