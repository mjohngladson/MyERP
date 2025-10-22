#!/usr/bin/env python3
"""
Database Cleanup Script for Fresh Testing
Clears all transactional and master data while preserving users and settings
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

async def clean_database():
    """Clean all records from database for fresh testing"""
    
    print("=" * 70)
    print("DATABASE CLEANUP SCRIPT")
    print("=" * 70)
    print(f"MongoDB URL: {MONGO_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.get_default_database()
    
    # Collections to clean
    collections_to_clean = {
        "Transactional Data": [
            "sales_orders",
            "quotations", 
            "sales_invoices",
            "purchase_orders",
            "purchase_invoices",
            "credit_notes",
            "debit_notes",
            "payments",
            "payment_allocations",
            "journal_entries",
            "bank_transactions",
            "stock_entries"
        ],
        "Master Data": [
            "customers",
            "suppliers",
            "items",
            "products"
        ]
    }
    
    # Collections to PRESERVE
    preserved_collections = [
        "users",
        "general_settings",
        "accounts",
        "stock_settings",
        "bank_accounts"
    ]
    
    print("\n🗑️  COLLECTIONS TO BE CLEANED:")
    for category, collections in collections_to_clean.items():
        print(f"\n  {category}:")
        for coll in collections:
            count = await db[coll].count_documents({})
            print(f"    - {coll}: {count} records")
    
    print("\n✅ COLLECTIONS TO BE PRESERVED:")
    for coll in preserved_collections:
        count = await db[coll].count_documents({})
        print(f"    - {coll}: {count} records")
    
    print("\n" + "=" * 70)
    user_input = input("⚠️  Proceed with cleanup? This cannot be undone! (yes/no): ")
    
    if user_input.lower() != 'yes':
        print("❌ Cleanup cancelled.")
        client.close()
        return
    
    print("\n🧹 Starting cleanup...\n")
    
    total_deleted = 0
    
    # Clean transactional data
    for category, collections in collections_to_clean.items():
        print(f"\n{category}:")
        for coll_name in collections:
            try:
                result = await db[coll_name].delete_many({})
                deleted_count = result.deleted_count
                total_deleted += deleted_count
                print(f"  ✅ {coll_name}: Deleted {deleted_count} records")
            except Exception as e:
                print(f"  ⚠️  {coll_name}: Error - {str(e)}")
    
    print("\n" + "=" * 70)
    print(f"✅ CLEANUP COMPLETE!")
    print(f"Total records deleted: {total_deleted}")
    print("=" * 70)
    
    # Show final state
    print("\n📊 FINAL DATABASE STATE:")
    print("\nPreserved Collections:")
    for coll in preserved_collections:
        count = await db[coll].count_documents({})
        print(f"  - {coll}: {count} records")
    
    print("\nCleaned Collections (should be 0):")
    for category, collections in collections_to_clean.items():
        for coll in collections:
            count = await db[coll].count_documents({})
            if count > 0:
                print(f"  ⚠️  {coll}: {count} records (not fully cleaned)")
            else:
                print(f"  ✅ {coll}: 0 records")
    
    client.close()
    print("\n✅ Database cleanup completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(clean_database())
