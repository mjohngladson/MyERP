#!/usr/bin/env python3
"""
Initialize Chart of Accounts with default accounts
"""

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'gili_production')

def now_utc():
    return datetime.now(timezone.utc)

async def init_chart_of_accounts():
    """Initialize default Chart of Accounts"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    accounts_collection = db.accounts
    
    print("📊 Initializing Chart of Accounts...")
    print()
    
    # Check if accounts already exist
    existing_count = await accounts_collection.count_documents({})
    if existing_count > 0:
        print(f"⚠️  {existing_count} accounts already exist.")
        response = input("Do you want to add more accounts? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Cancelled")
            client.close()
            return
    
    default_accounts = [
        # Assets
        {
            "id": str(uuid.uuid4()),
            "account_name": "Cash",
            "account_type": "Cash",
            "root_type": "Asset",
            "parent_account": None,
            "account_number": "1000",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Bank Accounts",
            "account_type": "Bank",
            "root_type": "Asset",
            "parent_account": None,
            "account_number": "1100",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Accounts Receivable",
            "account_type": "Receivable",
            "root_type": "Asset",
            "parent_account": None,
            "account_number": "1200",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Inventory",
            "account_type": "Stock",
            "root_type": "Asset",
            "parent_account": None,
            "account_number": "1300",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        
        # Liabilities
        {
            "id": str(uuid.uuid4()),
            "account_name": "Accounts Payable",
            "account_type": "Payable",
            "root_type": "Liability",
            "parent_account": None,
            "account_number": "2000",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Tax Payable",
            "account_type": "Tax",
            "root_type": "Liability",
            "parent_account": None,
            "account_number": "2100",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        
        # Equity
        {
            "id": str(uuid.uuid4()),
            "account_name": "Capital",
            "account_type": "Equity",
            "root_type": "Equity",
            "parent_account": None,
            "account_number": "3000",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Retained Earnings",
            "account_type": "Equity",
            "root_type": "Equity",
            "parent_account": None,
            "account_number": "3100",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        
        # Income
        {
            "id": str(uuid.uuid4()),
            "account_name": "Sales Revenue",
            "account_type": "Income",
            "root_type": "Income",
            "parent_account": None,
            "account_number": "4000",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Sales Return",
            "account_type": "Income",
            "root_type": "Income",
            "parent_account": None,
            "account_number": "4100",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        
        # Expenses
        {
            "id": str(uuid.uuid4()),
            "account_name": "Cost of Goods Sold",
            "account_type": "Cost of Goods Sold",
            "root_type": "Expense",
            "parent_account": None,
            "account_number": "5000",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Purchase Return",
            "account_type": "Expense",
            "root_type": "Expense",
            "parent_account": None,
            "account_number": "5100",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "account_name": "Operating Expenses",
            "account_type": "Expense",
            "root_type": "Expense",
            "parent_account": None,
            "account_number": "5200",
            "account_balance": 0,
            "is_group": False,
            "company_id": "default_company",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
    ]
    
    # Insert accounts
    inserted_count = 0
    for account in default_accounts:
        # Check if account already exists
        existing = await accounts_collection.find_one({"account_name": account["account_name"]})
        if not existing:
            await accounts_collection.insert_one(account)
            print(f"✅ Created: {account['account_name']} ({account['root_type']})")
            inserted_count += 1
        else:
            print(f"⏭️  Skipped: {account['account_name']} (already exists)")
    
    print()
    print(f"✅ Initialization complete!")
    print(f"📊 Total accounts created: {inserted_count}")
    print(f"📊 Total accounts in database: {await accounts_collection.count_documents({})}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_chart_of_accounts())
