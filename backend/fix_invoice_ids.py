import asyncio
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def fix_invoice_ids():
    """Fix corrupted invoice IDs in the database"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gili_production')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    collections = ['sales_invoices', 'purchase_invoices']
    
    for coll_name in collections:
        coll = db[coll_name]
        
        # Find all invoices
        invoices = await coll.find({}).to_list(length=10000)
        
        fixed_count = 0
        for inv in invoices:
            inv_id = inv.get('id')
            _id_str = str(inv.get('_id'))
            
            # Check if id is corrupted (matches _id string)
            if inv_id == _id_str:
                # Generate new UUID
                new_id = str(uuid.uuid4())
                
                # Update the invoice
                result = await coll.update_one(
                    {'_id': inv['_id']},
                    {'$set': {'id': new_id}}
                )
                
                if result.modified_count > 0:
                    fixed_count += 1
                    print(f"Fixed {coll_name}: {inv.get('invoice_number', 'N/A')} - {_id_str} → {new_id}")
        
        print(f"\n{coll_name}: Fixed {fixed_count} corrupted IDs")
    
    client.close()
    print("\n✅ Database ID fix complete!")

if __name__ == '__main__':
    asyncio.run(fix_invoice_ids())
