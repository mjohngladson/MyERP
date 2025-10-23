"""
Cleanup Script: Remove ALL test data from database
This script should be run after testing to keep the database clean.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gili_production')

async def cleanup_test_data():
    """Remove all test data from database"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("="*80)
    print("CLEANUP: Removing ALL test data from database")
    print("="*80)
    print()
    
    # Delete test sales invoices (test customer names, test invoice numbers)
    print("Cleaning Sales Invoices...")
    si_result = await db.sales_invoices.delete_many({
        "$or": [
            {"customer_name": {"$regex": "Test", "$options": "i"}},
            {"invoice_number": {"$regex": "TEST", "$options": "i"}},
            {"invoice_number": {"$regex": "-0012$"}},
            {"invoice_number": {"$regex": "-0013$"}},
            {"invoice_number": {"$regex": "-0014$"}},
            {"invoice_number": {"$regex": "-0015$"}},
            {"invoice_number": {"$regex": "-0016$"}},
            {"invoice_number": {"$regex": "-0017$"}},
            {"invoice_number": {"$regex": "-0018$"}},
            {"invoice_number": {"$regex": "-0019$"}},
            {"invoice_number": {"$regex": "-002[0-9]$"}},
        ]
    })
    print(f"  ✅ Deleted {si_result.deleted_count} test sales invoices")
    
    # Delete test purchase invoices
    print("Cleaning Purchase Invoices...")
    pi_result = await db.purchase_invoices.delete_many({
        "$or": [
            {"supplier_name": {"$regex": "Test", "$options": "i"}},
            {"invoice_number": {"$regex": "TEST", "$options": "i"}},
        ]
    })
    print(f"  ✅ Deleted {pi_result.deleted_count} test purchase invoices")
    
    # Delete test credit notes
    print("Cleaning Credit Notes...")
    cn_result = await db.credit_notes.delete_many({
        "$or": [
            {"customer_name": {"$regex": "Test", "$options": "i"}},
            {"credit_note_number": {"$regex": "TEST", "$options": "i"}},
        ]
    })
    print(f"  ✅ Deleted {cn_result.deleted_count} test credit notes")
    
    # Delete test debit notes
    print("Cleaning Debit Notes...")
    dn_result = await db.debit_notes.delete_many({
        "$or": [
            {"supplier_name": {"$regex": "Test", "$options": "i"}},
            {"debit_note_number": {"$regex": "TEST", "$options": "i"}},
        ]
    })
    print(f"  ✅ Deleted {dn_result.deleted_count} test debit notes")
    
    # Delete test payments
    print("Cleaning Payments...")
    payment_result = await db.payments.delete_many({
        "$or": [
            {"party_name": {"$regex": "Test", "$options": "i"}},
            {"payment_number": {"$regex": "TEST", "$options": "i"}},
            {"payment_number": {"$regex": "-001[0-9]$"}},
            {"payment_number": {"$regex": "-002[0-9]$"}},
        ]
    })
    print(f"  ✅ Deleted {payment_result.deleted_count} test payments")
    
    # Delete test payment allocations
    print("Cleaning Payment Allocations...")
    alloc_result = await db.payment_allocations.delete_many({
        "$or": [
            {"invoice_number": {"$regex": "Test", "$options": "i"}},
            {"invoice_number": {"$regex": "-001[5-9]$"}},
            {"invoice_number": {"$regex": "-002[0-9]$"}},
        ]
    })
    print(f"  ✅ Deleted {alloc_result.deleted_count} test payment allocations")
    
    # Summary
    print()
    print("="*80)
    print("CLEANUP COMPLETE")
    print("="*80)
    total = (si_result.deleted_count + pi_result.deleted_count + 
             cn_result.deleted_count + dn_result.deleted_count +
             payment_result.deleted_count + alloc_result.deleted_count)
    print(f"Total test documents deleted: {total}")
    print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_test_data())
