"""
Script to fix duplicate payment numbers in the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from collections import defaultdict

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

async def fix_duplicate_payments():
    """Find and fix duplicate payment numbers"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    payments_collection = db.payments
    
    print("🔍 Checking for duplicate payment numbers...")
    
    # Get all payments
    all_payments = await payments_collection.find({}).to_list(length=None)
    
    # Group by payment_number
    payment_groups = defaultdict(list)
    for payment in all_payments:
        payment_number = payment.get("payment_number", "")
        payment_groups[payment_number].append(payment)
    
    # Find duplicates
    duplicates = {k: v for k, v in payment_groups.items() if len(v) > 1}
    
    if not duplicates:
        print("✅ No duplicate payment numbers found!")
        client.close()
        return
    
    print(f"⚠️  Found {len(duplicates)} duplicate payment numbers:")
    for payment_number, payments in duplicates.items():
        print(f"  - {payment_number}: {len(payments)} entries")
    
    print("\n🔧 Fixing duplicates...")
    
    # Fix each duplicate group
    fixed_count = 0
    for payment_number, payments in duplicates.items():
        # Sort by created_at to keep the oldest one with original number
        payments.sort(key=lambda x: x.get("created_at", ""))
        
        # Keep first payment as-is, renumber the rest
        for idx, payment in enumerate(payments[1:], start=1):
            # Extract prefix and date from original number
            parts = payment_number.split("-")
            if len(parts) == 3:
                prefix = parts[0]
                date_str = parts[1]
                
                # Find next available number for this prefix and date
                pattern = f"{prefix}-{date_str}-"
                existing = await payments_collection.find({
                    "payment_number": {"$regex": f"^{pattern}"}
                }).to_list(length=None)
                
                # Extract numbers and find max
                max_num = 0
                for p in existing:
                    try:
                        num_part = p.get("payment_number", "").split("-")[-1]
                        num = int(num_part)
                        if num > max_num:
                            max_num = num
                    except (ValueError, IndexError):
                        continue
                
                # Generate new unique number
                new_num = max_num + 1
                new_payment_number = f"{prefix}-{date_str}-{new_num:04d}"
                
                # Update the payment
                await payments_collection.update_one(
                    {"id": payment["id"]},
                    {"$set": {"payment_number": new_payment_number}}
                )
                
                print(f"  ✓ Updated payment {payment['id'][:8]}... from {payment_number} to {new_payment_number}")
                fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} duplicate payment numbers!")
    
    # Create unique index to prevent future duplicates
    print("\n🔒 Creating unique index on payment_number...")
    try:
        await payments_collection.create_index("payment_number", unique=True)
        print("✅ Unique index created successfully!")
    except Exception as e:
        print(f"⚠️  Could not create unique index: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_duplicate_payments())
