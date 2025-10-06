#!/usr/bin/env python3
"""
Database Wipe Script - Clear all data and optionally reinitialize
Usage: python wipe-database.py [--keep-admin] [--reinit]
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

# ANSI color codes
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
BOLD = '\033[1m'
RESET = '\033[0m'

def print_header():
    print(f"{BOLD}{RED}╔══════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{RED}║   DATABASE WIPE UTILITY - DANGER ZONE ⚠️    ║{RESET}")
    print(f"{BOLD}{RED}╚══════════════════════════════════════════════╝{RESET}")
    print()

def print_info(message):
    print(f"{BLUE}ℹ {message}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

async def get_collections(db):
    """Get all collection names"""
    return await db.list_collection_names()

async def count_documents(db, collection_name):
    """Count documents in a collection"""
    try:
        return await db[collection_name].count_documents({})
    except:
        return 0

async def backup_admin_user(db):
    """Backup admin user before wiping"""
    try:
        admin = await db.users.find_one({"email": "admin@gili.com"})
        return admin
    except:
        return None

async def restore_admin_user(db, admin_user):
    """Restore admin user after wiping"""
    if admin_user:
        try:
            await db.users.insert_one(admin_user)
            print_success("Admin user restored")
        except Exception as e:
            print_error(f"Failed to restore admin user: {e}")

async def wipe_database(keep_admin=False, reinit=False):
    """Wipe all data from database"""
    
    print_header()
    print_info(f"Database: {db_name}")
    print_info(f"MongoDB URL: {mongo_url}")
    print()
    
    # Connect to database
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        print_success("Connected to MongoDB")
    except Exception as e:
        print_error(f"Failed to connect to MongoDB: {e}")
        return False
    
    # Get all collections
    collections = await get_collections(db)
    print_info(f"Found {len(collections)} collections")
    print()
    
    # Show current data
    print(f"{BOLD}Current Data:{RESET}")
    total_docs = 0
    for collection in collections:
        count = await count_documents(db, collection)
        total_docs += count
        if count > 0:
            print(f"  • {collection}: {count} documents")
    print()
    
    if total_docs == 0:
        print_warning("Database is already empty!")
        return True
    
    # Confirm deletion
    print_warning(f"This will DELETE {total_docs} documents from {len(collections)} collections!")
    if keep_admin:
        print_info("Admin user will be preserved")
    if reinit:
        print_info("Sample data will be reinitialized after wipe")
    print()
    
    confirmation = input(f"{YELLOW}Type 'DELETE ALL' to confirm: {RESET}")
    if confirmation != "DELETE ALL":
        print_error("Operation cancelled")
        return False
    
    print()
    print(f"{BOLD}Starting database wipe...{RESET}")
    print()
    
    # Backup admin user if requested
    admin_user = None
    if keep_admin:
        admin_user = await backup_admin_user(db)
        if admin_user:
            print_success("Admin user backed up")
    
    # Delete all documents from all collections
    deleted_count = 0
    for collection in collections:
        try:
            result = await db[collection].delete_many({})
            deleted_count += result.deleted_count
            if result.deleted_count > 0:
                print_success(f"Cleared {collection}: {result.deleted_count} documents")
        except Exception as e:
            print_error(f"Failed to clear {collection}: {e}")
    
    print()
    print_success(f"Total documents deleted: {deleted_count}")
    
    # Restore admin user if backed up
    if admin_user:
        await restore_admin_user(db, admin_user)
    
    # Reinitialize sample data if requested
    if reinit:
        print()
        print(f"{BOLD}Reinitializing sample data...{RESET}")
        try:
            # Import and run initialization
            sys.path.insert(0, str(Path(__file__).parent / 'backend'))
            from database import force_init_sample_data
            await force_init_sample_data()
            print_success("Sample data reinitialized")
        except Exception as e:
            print_error(f"Failed to reinitialize sample data: {e}")
            print_info("You can manually run: python -m database to initialize")
    
    print()
    print_success("Database wipe completed!")
    
    # Close connection
    client.close()
    
    return True

def show_usage():
    """Show usage information"""
    print("Database Wipe Utility")
    print()
    print("Usage:")
    print("  python wipe-database.py                    # Wipe all data")
    print("  python wipe-database.py --keep-admin       # Wipe but keep admin user")
    print("  python wipe-database.py --reinit           # Wipe and reinitialize sample data")
    print("  python wipe-database.py --keep-admin --reinit  # Wipe, keep admin, and reinit")
    print()
    print("Options:")
    print("  --keep-admin    Keep admin@gili.com user")
    print("  --reinit        Reinitialize sample data after wipe")
    print("  --help          Show this help message")
    print()

async def main():
    """Main function"""
    
    # Parse arguments
    args = sys.argv[1:]
    
    if '--help' in args or '-h' in args:
        show_usage()
        return
    
    keep_admin = '--keep-admin' in args
    reinit = '--reinit' in args
    
    # Run wipe
    success = await wipe_database(keep_admin=keep_admin, reinit=reinit)
    
    if success:
        print()
        print(f"{GREEN}{BOLD}✓ Database is now clean and ready to use!{RESET}")
        if keep_admin:
            print_info("Login with: admin@gili.com / admin123")
    else:
        print()
        print_error("Database wipe failed or was cancelled")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
