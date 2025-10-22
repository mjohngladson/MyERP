#!/bin/bash

echo "=========================================="
echo "GiLi ERP Comprehensive Cleanup Script"
echo "=========================================="
echo ""

# Create backup directory
BACKUP_DIR="/app/.cleanup_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "✓ Created backup directory: $BACKUP_DIR"

# ==========================================
# PHASE 1: DOCUMENTATION CLEANUP
# ==========================================
echo ""
echo "PHASE 1: Cleaning up redundant documentation files..."
echo "----------------------------------------------"

# Files to KEEP (essential documentation)
KEEP_FILES=(
    "README.md"
    "POST_FORK_SETUP.md"
    "AUTO_FIX_IMPLEMENTATION.md"
    "test_result.md"
    "contracts.md"
)

# Move redundant MD files to backup
MD_FILES_TO_REMOVE=(
    "RAILWAY_FIX_EXPLANATION.md"
    "RAILWAY_DEPLOYMENT_COMPLETE_GUIDE.md"
    "RAILWAY_FIX_SUMMARY.md"
    "URL_SWITCH_TO_RAILWAY.md"
    "CN_DN_ENHANCED_IMPLEMENTATION.md"
    "SUPERVISOR_URL_FIX.md"
    "INVOICE_ID_CORRUPTION_FIX.md"
    "CN_DN_ENHANCEMENTS_V2_TESTING_GUIDE.md"
    "DESKTOP_DEPLOYMENT_GUIDE.md"
    "DEBIT_NOTE_BUG_FIX.md"
    "PAYMENT_BANK_BUG_FIXES.md"
    "RAILWAY_STATUS_REPORT.md"
    "RAILWAY_CORS_FIX.md"
    "RAILWAY_CORS_PREFLIGHT_FIX.md"
    "RAILWAY_DEPLOYMENT_CHECKLIST.md"
    "RAILWAY_DEPLOYMENT_FIX.md"
    "RAILWAY_DEPLOYMENT_GUIDE.md"
    "RAILWAY_FINAL_STATUS.md"
    "PREVIEW_ENVIRONMENT_SWITCH.md"
    "BACKEND_SWITCHING_GUIDE.md"
    "INVOICE_LOADING_FIX.md"
    "INVOICE_PAYMENT_WORKFLOW_FIX.md"
    "DATABASE_WIPE_GUIDE.md"
    "WHERE_TO_RUN_SCRIPTS.md"
)

for file in "${MD_FILES_TO_REMOVE[@]}"; do
    if [ -f "/app/$file" ]; then
        mv "/app/$file" "$BACKUP_DIR/"
        echo "  Moved: $file → backup"
    fi
done

# ==========================================
# PHASE 2: SCRIPTS CLEANUP
# ==========================================
echo ""
echo "PHASE 2: Cleaning up redundant scripts..."
echo "----------------------------------------------"

# Scripts to KEEP
# fix-backend-url.sh, auto-fix-on-startup.sh, check-config.sh, wipe-db.sh, cleanup.sh

# Scripts to remove
SCRIPTS_TO_REMOVE=(
    "railway-deploy.sh"
    "switch-backend.sh"
    "start.sh"
)

for script in "${SCRIPTS_TO_REMOVE[@]}"; do
    if [ -f "/app/$script" ]; then
        mv "/app/$script" "$BACKUP_DIR/"
        echo "  Moved: $script → backup"
    fi
done

# ==========================================
# PHASE 3: LOG FILES CLEANUP
# ==========================================
echo ""
echo "PHASE 3: Cleaning up log files..."
echo "----------------------------------------------"

# Clear supervisor logs
if [ -d "/var/log/supervisor" ]; then
    for log_file in /var/log/supervisor/*.log; do
        if [ -f "$log_file" ]; then
            > "$log_file"
            echo "  Cleared: $log_file"
        fi
    done
fi

# Remove application log files
LOG_FILES=(
    "/app/pos-web.log"
    "/app/pos-public/pos-public.log"
    "/app/backend/railway_test.log"
)

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        rm -f "$log_file"
        echo "  Removed: $log_file"
    fi
done

# ==========================================
# PHASE 4: MONGODB DATABASE CLEANUP
# ==========================================
echo ""
echo "PHASE 4: Cleaning up MongoDB databases..."
echo "----------------------------------------------"

# Drop test databases
python3 << 'EOF'
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')

# Drop test databases
test_dbs = ['gili_erp', 'test_database']
for db_name in test_dbs:
    if db_name in client.list_database_names():
        client.drop_database(db_name)
        print(f"  ✓ Dropped database: {db_name}")

# Clean up gili_production - keep only essential records
db = client['gili_production']

# Collections to clean (remove all test/dummy data)
collections_to_wipe = [
    'journal_entries',
    'credit_notes',
    'debit_notes',
    'purchase_invoices',
    'sales_invoices',
    'purchase_orders',
    'sales_orders',
    'sales_quotations',
    'payments',
    'payment_allocations',
    'bank_statements',
    'bank_transactions',
    'transactions',
    'stock_ledger',
    'stock_layers',
    'pos_transactions',
    'sync_log',
    'notifications'
]

print("\n  Cleaning gili_production database:")
for coll_name in collections_to_wipe:
    if coll_name in db.list_collection_names():
        count_before = db[coll_name].count_documents({})
        if count_before > 0:
            db[coll_name].delete_many({})
            print(f"    - {coll_name}: Removed {count_before} documents")

# Keep essential master data (users, accounts, items, customers, suppliers)
print(f"\n  ✓ Kept essential master data (users, accounts, items, customers, suppliers, etc.)")

EOF

# ==========================================
# PHASE 5: ARCHIVE test_result.md
# ==========================================
echo ""
echo "PHASE 5: Archiving test_result.md history..."
echo "----------------------------------------------"

if [ -f "/app/test_result.md" ]; then
    # Backup original
    cp "/app/test_result.md" "$BACKUP_DIR/test_result_full.md"
    echo "  ✓ Backed up full test_result.md (291KB)"
    
    # Create clean version (keep only protocol section)
    python3 << 'EOF'
# Extract only the testing protocol section
with open('/app/test_result.md', 'r') as f:
    content = f.read()

# Find the protocol section
protocol_start = content.find('#====================================================================================================')
protocol_end = content.find('#====================================================================================================', protocol_start + 10)
protocol_end = content.find('#====================================================================================================', protocol_end + 10)

if protocol_start != -1 and protocol_end != -1:
    protocol_section = content[protocol_start:protocol_end + 100]
    
    # Create fresh test_result.md with just the protocol
    with open('/app/test_result.md', 'w') as f:
        f.write(protocol_section)
        f.write('\n\n')
        f.write('#' + '='*99 + '\n')
        f.write('# Testing Data - Main Agent and testing sub agent both should log testing data below this section\n')
        f.write('#' + '='*99 + '\n\n')
        f.write('user_problem_statement: ""\n\n')
        f.write('backend: []\n\n')
        f.write('frontend: []\n\n')
        f.write('metadata:\n')
        f.write('  created_by: "main_agent"\n')
        f.write('  version: "1.0"\n')
        f.write('  test_sequence: 0\n')
        f.write('  run_ui: false\n\n')
        f.write('test_plan:\n')
        f.write('  current_focus: []\n')
        f.write('  stuck_tasks: []\n')
        f.write('  test_all: false\n')
        f.write('  test_priority: "high_first"\n\n')
        f.write('agent_communication: []\n')
    
    print("  ✓ Created clean test_result.md (protocol only)")
else:
    print("  ⚠ Could not parse test_result.md, keeping original")
EOF
fi

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo "=========================================="
echo "CLEANUP SUMMARY"
echo "=========================================="
echo ""
echo "✓ Documentation: Removed redundant MD files (20+ files)"
echo "✓ Scripts: Removed old deployment scripts"
echo "✓ Logs: Cleared all application and supervisor logs"
echo "✓ Databases: Dropped test databases (gili_erp, test_database)"
echo "✓ Production DB: Cleaned transaction data, kept master data"
echo "✓ test_result.md: Archived and reset (291KB → ~2KB)"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
