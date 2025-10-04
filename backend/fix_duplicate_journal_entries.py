"""
Script to fix duplicate journal entry numbers in the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

async def fix_duplicate_journal_entries():
    """Find and fix duplicate journal entry numbers"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    journal_entries_collection = db.journal_entries
    
    print("🔍 Checking for duplicate journal entry numbers...")
    
    # Get all entries
    all_entries = await journal_entries_collection.find({}).to_list(length=None)
    
    # Group by entry_number
    entry_groups = defaultdict(list)
    for entry in all_entries:
        entry_number = entry.get("entry_number", "")
        entry_groups[entry_number].append(entry)
    
    # Find duplicates
    duplicates = {k: v for k, v in entry_groups.items() if len(v) > 1}
    
    if not duplicates:
        print("✅ No duplicate journal entry numbers found!")
        client.close()
        return
    
    print(f"⚠️  Found {len(duplicates)} duplicate journal entry numbers:")
    for entry_number, entries in duplicates.items():
        print(f"  - {entry_number}: {len(entries)} entries")
    
    print("\n🔧 Fixing duplicates...")
    
    # Fix each duplicate group
    fixed_count = 0
    for entry_number, entries in duplicates.items():
        # Sort by created_at to keep the oldest one with original number
        entries.sort(key=lambda x: x.get("created_at") if isinstance(x.get("created_at"), datetime) else datetime.min)
        
        # Keep first entry as-is, renumber the rest
        for idx, entry in enumerate(entries[1:], start=1):
            # For auto-generated payment entries, generate a simpler unique ID
            if entry.get("is_auto_generated"):
                # Generate based on timestamp
                import time
                timestamp = int(time.time() * 1000)
                new_entry_number = f"JE-AUTO-{timestamp}"
            else:
                # Extract prefix and date from original number
                parts = entry_number.split("-")
                if len(parts) >= 3:
                    prefix = "JE"
                    date_str = datetime.now().strftime('%Y%m%d')
                    
                    # Find next available number for this date
                    pattern = f"{prefix}-{date_str}-"
                    existing = await journal_entries_collection.find({
                        "entry_number": {"$regex": f"^{pattern}"}
                    }).to_list(length=None)
                    
                    # Extract numbers and find max
                    max_num = 0
                    for e in existing:
                        try:
                            num_part = e.get("entry_number", "").split("-")[-1]
                            num = int(num_part)
                            if num > max_num:
                                max_num = num
                        except (ValueError, IndexError):
                            continue
                    
                    # Generate new unique number
                    new_num = max_num + 1
                    new_entry_number = f"{prefix}-{date_str}-{new_num:04d}"
                else:
                    # Fallback for unusual formats
                    import time
                    timestamp = int(time.time() * 1000)
                    new_entry_number = f"JE-FIX-{timestamp}"
            
            # Update the entry
            await journal_entries_collection.update_one(
                {"id": entry["id"]},
                {"$set": {"entry_number": new_entry_number}}
            )
            
            print(f"  ✓ Updated entry {entry['id'][:8]}... from {entry_number} to {new_entry_number}")
            fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} duplicate journal entry numbers!")
    
    # Create unique index to prevent future duplicates
    print("\n🔒 Creating unique index on entry_number...")
    try:
        await journal_entries_collection.create_index("entry_number", unique=True)
        print("✅ Unique index created successfully!")
    except Exception as e:
        print(f"⚠️  Could not create unique index: {e}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_duplicate_journal_entries())
