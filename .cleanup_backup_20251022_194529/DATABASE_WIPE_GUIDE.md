# Database Wipe Guide - Start Fresh

Complete guide to safely wipe your preview database and start fresh.

---

## ⚠️ IMPORTANT WARNINGS

### Before You Proceed

1. **THIS WILL DELETE ALL DATA** - All transactions, records, and entries will be permanently deleted
2. **CANNOT BE UNDONE** - There is no undo. Make sure you want to do this
3. **PREVIEW DATABASE ONLY** - This affects your preview environment database
4. **BACKUP FIRST** (Optional) - If you have important data, back it up first

---

## Quick Start

### Option 1: Wipe Everything and Start Fresh (Recommended)

```bash
cd /app
./wipe-db.sh --reinit
```

This will:
- ✅ Delete all data from all collections
- ✅ Reinitialize with sample data
- ✅ Create demo users and basic setup
- ✅ Ready to use immediately

### Option 2: Wipe But Keep Admin User

```bash
cd /app
./wipe-db.sh --keep-admin --reinit
```

This will:
- ✅ Delete all data
- ✅ Keep admin@gili.com user
- ✅ Reinitialize sample data
- ✅ Login with existing admin credentials

### Option 3: Complete Wipe (Empty Database)

```bash
cd /app
./wipe-db.sh
```

This will:
- ✅ Delete all data
- ⚠️ No sample data
- ⚠️ No users (can't login until you create one)

---

## Detailed Usage

### Command Options

```bash
./wipe-db.sh [options]

Options:
  --keep-admin    Keep admin@gili.com user (preserves login)
  --reinit        Reinitialize sample data after wipe
  --help          Show help message
```

### Common Scenarios

**Scenario 1: Testing - Want Clean Slate**
```bash
./wipe-db.sh --reinit
# Deletes everything, creates fresh sample data
```

**Scenario 2: Demo - Keep Admin But Clear Data**
```bash
./wipe-db.sh --keep-admin --reinit
# Keep your admin user, clear all transactions/data, add sample data
```

**Scenario 3: Production Setup - Empty Database**
```bash
./wipe-db.sh --keep-admin
# Keep admin user, clear everything else, no sample data
```

---

## What Gets Deleted

### All Collections Will Be Wiped:

**Master Data:**
- ✗ Customers
- ✗ Suppliers
- ✗ Items/Products
- ✗ Companies

**Transactions:**
- ✗ Sales Invoices
- ✗ Sales Orders
- ✗ Quotations
- ✗ Purchase Orders
- ✗ Purchase Invoices
- ✗ Credit Notes
- ✗ Debit Notes

**Stock Management:**
- ✗ Warehouses
- ✗ Stock Entries
- ✗ Stock Ledger
- ✗ Batches
- ✗ Serials

**Financial:**
- ✗ Accounts
- ✗ Journal Entries
- ✗ Payments
- ✗ Bank Transactions

**System:**
- ✗ Users (unless --keep-admin used)
- ✗ Notifications
- ✗ Settings

---

## What Gets Reinitialized (with --reinit)

**Sample Data Includes:**

1. **Company**
   - Sample Company Ltd

2. **Users**
   - admin@gili.com / admin123
   - Demo users

3. **Master Data**
   - Sample customers
   - Sample suppliers
   - Sample items/products

4. **Basic Settings**
   - Default warehouse
   - Basic configuration
   - Tax rates

---

## Step-by-Step Process

### Recommended: Full Wipe and Reinit

**1. Navigate to app directory:**
```bash
cd /app
```

**2. Run wipe script:**
```bash
./wipe-db.sh --reinit
```

**3. You'll see:**
```
╔══════════════════════════════════════════════╗
║   DATABASE WIPE UTILITY - DANGER ZONE ⚠️    ║
╚══════════════════════════════════════════════╝

ℹ Database: test_database
ℹ Connected to MongoDB
ℹ Found 20 collections

Current Data:
  • users: 5 documents
  • customers: 25 documents
  • suppliers: 15 documents
  • sales_invoices: 100 documents
  • ... (etc)

⚠ This will DELETE 500 documents from 20 collections!
ℹ Sample data will be reinitialized after wipe

Type 'DELETE ALL' to confirm:
```

**4. Type confirmation:**
```
DELETE ALL
```

**5. Wait for completion:**
```
Starting database wipe...

✓ Cleared users: 5 documents
✓ Cleared customers: 25 documents
✓ Cleared suppliers: 15 documents
... (etc)

✓ Total documents deleted: 500

Reinitializing sample data...
✓ Sample data reinitialized

✓ Database wipe completed!
✓ Database is now clean and ready to use!
```

**6. Done! Database is fresh and ready**

---

## Verification

### Check Database is Clean

**1. Check total documents:**
```bash
python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_database']
    collections = await db.list_collection_names()
    total = 0
    for col in collections:
        count = await db[col].count_documents({})
        if count > 0:
            print(f'{col}: {count}')
        total += count
    print(f'Total documents: {total}')
    client.close()
asyncio.run(check())
"
```

**2. Test Login:**
- Open your application
- Login with: admin@gili.com / admin123
- Should see clean dashboard with sample data (if --reinit used)

---

## Troubleshooting

### Issue: "Permission denied"

**Solution:**
```bash
chmod +x /app/wipe-db.sh
chmod +x /app/wipe-database.py
```

### Issue: "Python 3 not available"

**Solution:**
```bash
# Check Python version
python3 --version

# If not available, use:
python wipe-database.py --reinit
```

### Issue: "Cannot connect to MongoDB"

**Solution:**
```bash
# Check MongoDB is running
sudo supervisorctl status backend

# Check MONGO_URL in .env
cat /app/backend/.env | grep MONGO_URL
```

### Issue: Script hangs or doesn't complete

**Solution:**
```bash
# Stop script: Ctrl+C
# Check backend is not writing to database
sudo supervisorctl stop backend
# Run wipe again
./wipe-db.sh --reinit
# Restart backend
sudo supervisorctl start backend
```

---

## Advanced Options

### Wipe Specific Collections Only

For advanced users who want to wipe specific collections:

```python
# Create custom script: wipe-custom.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def wipe_specific():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_database']
    
    # Wipe only sales data
    await db.sales_invoices.delete_many({})
    await db.sales_orders.delete_many({})
    await db.sales_quotations.delete_many({})
    
    print("✓ Sales data wiped")
    client.close()

asyncio.run(wipe_specific())
```

### Backup Before Wipe

```bash
# Export all data (if needed)
mongodump --uri="mongodb://localhost:27017/test_database" --out=/app/backup

# After wipe, restore if needed
mongorestore --uri="mongodb://localhost:27017/test_database" /app/backup/test_database
```

---

## Post-Wipe Checklist

After wiping the database:

- [ ] Verify database is clean
- [ ] Test login (admin@gili.com / admin123)
- [ ] Check dashboard loads
- [ ] Verify sample data if --reinit used
- [ ] Test creating new records
- [ ] Restart services if needed:
  ```bash
  sudo supervisorctl restart all
  ```

---

## FAQ

**Q: Will this affect Railway database?**  
A: No. This only affects your preview/local database configured in backend/.env

**Q: Can I undo this?**  
A: No. Once deleted, data is gone. Make backups if needed.

**Q: How long does it take?**  
A: Usually 5-30 seconds depending on data volume

**Q: Will I lose admin access?**  
A: Only if you don't use --keep-admin. With --keep-admin, you keep access.

**Q: What if I want to keep some data?**  
A: Use the advanced option to wipe specific collections only

**Q: Will this break the application?**  
A: No. The app structure remains intact, only data is cleared.

---

## Safety Tips

1. **Test First**: Try on a non-critical environment first
2. **Backup**: If data is important, backup before wiping
3. **Confirm**: Always use --reinit unless you want empty database
4. **Verify**: Check everything works after wipe
5. **Document**: Note what data you need to recreate

---

## Quick Reference

```bash
# Full wipe + reinit (most common)
./wipe-db.sh --reinit

# Keep admin + reinit (for demos)
./wipe-db.sh --keep-admin --reinit

# Complete wipe (advanced)
./wipe-db.sh

# Check what will be deleted
cat DATABASE_WIPE_GUIDE.md

# Verify after wipe
python3 -m backend.database
```

---

## Summary

**Location:** Run in Emergent terminal at `/app`  
**Command:** `./wipe-db.sh --reinit`  
**Time:** ~10 seconds  
**Result:** Clean database with fresh sample data  
**Login:** admin@gili.com / admin123 (if --reinit used)

**Ready to start fresh? Just run the command and confirm!** 🚀
