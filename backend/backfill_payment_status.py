"""
Migration Script: Backfill payment_status field for existing invoices

This script adds the payment_status field to all invoices that don't have it,
setting it to "Unpaid" by default.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gili_production')

async def backfill_payment_status():
    """Add payment_status field to all invoices without it"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("="*80)
    print("MIGRATION: Backfill payment_status field for invoices")
    print("="*80)
    print()
    
    # Update sales invoices
    print("Step 1: Updating sales invoices...")
    invoices_collection = db['sales_invoices']
    
    # Find invoices without payment_status field
    invoices_without_status = await invoices_collection.count_documents(
        {"payment_status": {"$exists": False}}
    )
    print(f"  Found {invoices_without_status} sales invoices without payment_status field")
    
    # Update all invoices without payment_status to "Unpaid"
    result = await invoices_collection.update_many(
        {"payment_status": {"$exists": False}},
        {"$set": {
            "payment_status": "Unpaid",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    print(f"  ✅ Updated {result.modified_count} sales invoices")
    print()
    
    # Update purchase invoices
    print("Step 2: Updating purchase invoices...")
    purchase_invoices_collection = db['purchase_invoices']
    
    pi_without_status = await purchase_invoices_collection.count_documents(
        {"payment_status": {"$exists": False}}
    )
    print(f"  Found {pi_without_status} purchase invoices without payment_status field")
    
    result_pi = await purchase_invoices_collection.update_many(
        {"payment_status": {"$exists": False}},
        {"$set": {
            "payment_status": "Unpaid",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    print(f"  ✅ Updated {result_pi.modified_count} purchase invoices")
    print()
    
    # Summary
    print("="*80)
    print("MIGRATION COMPLETE")
    print("="*80)
    print(f"Sales Invoices updated: {result.modified_count}")
    print(f"Purchase Invoices updated: {result_pi.modified_count}")
    print(f"Total invoices updated: {result.modified_count + result_pi.modified_count}")
    print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(backfill_payment_status())
