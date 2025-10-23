"""
Migration Script: Convert MongoDB ObjectId to UUID for customer/supplier references

This script fixes the ID format inconsistency where some documents use MongoDB ObjectId
while others use UUID format. It updates all references to use UUID consistently.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gili_production')

async def migrate_customer_supplier_ids():
    """Migrate all customer/supplier references from ObjectId to UUID"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("="*80)
    print("MIGRATION: Convert ObjectId to UUID for customer/supplier references")
    print("="*80)
    print()
    
    # Get customer and supplier mappings
    customers_collection = db['customers']
    suppliers_collection = db['suppliers']
    
    # Build mapping of customer names to UUIDs
    print("Step 1: Building customer name → UUID mapping...")
    customer_map = {}
    async for customer in customers_collection.find():
        customer_map[customer['name']] = customer['id']
    print(f"  Found {len(customer_map)} customers")
    
    # Build mapping of supplier names to UUIDs
    print("Step 2: Building supplier name → UUID mapping...")
    supplier_map = {}
    async for supplier in suppliers_collection.find():
        supplier_map[supplier['name']] = supplier['id']
    print(f"  Found {len(supplier_map)} suppliers")
    
    print()
    
    # Update sales invoices
    print("Step 3: Updating sales invoices...")
    invoices_collection = db['invoices']
    invoices_updated = 0
    async for invoice in invoices_collection.find():
        customer_name = invoice.get('customer_name')
        current_customer_id = invoice.get('customer_id')
        
        if customer_name and customer_name in customer_map:
            correct_uuid = customer_map[customer_name]
            
            # Only update if current ID is not the correct UUID
            if current_customer_id != correct_uuid:
                await invoices_collection.update_one(
                    {'_id': invoice['_id']},
                    {'$set': {
                        'customer_id': correct_uuid,
                        'updated_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"  ✅ Updated invoice {invoice.get('invoice_number')}: {current_customer_id} → {correct_uuid}")
                invoices_updated += 1
    
    print(f"  Total invoices updated: {invoices_updated}")
    print()
    
    # Update purchase invoices
    print("Step 4: Updating purchase invoices...")
    purchase_invoices_collection = db['purchase_invoices']
    pi_updated = 0
    async for invoice in purchase_invoices_collection.find():
        supplier_name = invoice.get('supplier_name')
        current_supplier_id = invoice.get('supplier_id')
        
        if supplier_name and supplier_name in supplier_map:
            correct_uuid = supplier_map[supplier_name]
            
            # Only update if current ID is not the correct UUID
            if current_supplier_id != correct_uuid:
                await purchase_invoices_collection.update_one(
                    {'_id': invoice['_id']},
                    {'$set': {
                        'supplier_id': correct_uuid,
                        'updated_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"  ✅ Updated PI {invoice.get('invoice_number')}: {current_supplier_id} → {correct_uuid}")
                pi_updated += 1
    
    print(f"  Total purchase invoices updated: {pi_updated}")
    print()
    
    # Update credit notes
    print("Step 5: Updating credit notes...")
    credit_notes_collection = db['credit_notes']
    cn_updated = 0
    async for cn in credit_notes_collection.find():
        customer_name = cn.get('customer_name')
        current_customer_id = cn.get('customer_id')
        
        if customer_name and customer_name in customer_map:
            correct_uuid = customer_map[customer_name]
            
            if current_customer_id != correct_uuid:
                await credit_notes_collection.update_one(
                    {'_id': cn['_id']},
                    {'$set': {
                        'customer_id': correct_uuid,
                        'updated_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"  ✅ Updated CN {cn.get('credit_note_number')}: {current_customer_id} → {correct_uuid}")
                cn_updated += 1
    
    print(f"  Total credit notes updated: {cn_updated}")
    print()
    
    # Update debit notes
    print("Step 6: Updating debit notes...")
    debit_notes_collection = db['debit_notes']
    dn_updated = 0
    async for dn in debit_notes_collection.find():
        supplier_name = dn.get('supplier_name')
        current_supplier_id = dn.get('supplier_id')
        
        if supplier_name and supplier_name in supplier_map:
            correct_uuid = supplier_map[supplier_name]
            
            if current_supplier_id != correct_uuid:
                await debit_notes_collection.update_one(
                    {'_id': dn['_id']},
                    {'$set': {
                        'supplier_id': correct_uuid,
                        'updated_at': datetime.now(timezone.utc)
                    }}
                )
                print(f"  ✅ Updated DN {dn.get('debit_note_number')}: {current_supplier_id} → {correct_uuid}")
                dn_updated += 1
    
    print(f"  Total debit notes updated: {dn_updated}")
    print()
    
    # Summary
    print("="*80)
    print("MIGRATION COMPLETE")
    print("="*80)
    print(f"Sales Invoices updated: {invoices_updated}")
    print(f"Purchase Invoices updated: {pi_updated}")
    print(f"Credit Notes updated: {cn_updated}")
    print(f"Debit Notes updated: {dn_updated}")
    print(f"Total documents updated: {invoices_updated + pi_updated + cn_updated + dn_updated}")
    print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_customer_supplier_ids())
