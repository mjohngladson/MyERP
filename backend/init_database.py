#!/usr/bin/env python3
"""
Database Initialization Script
Creates essential users, chart of accounts, and sample master data for testing
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from datetime import datetime, timezone
import hashlib

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

def hash_password(password: str) -> str:
    """Simple password hashing (in production, use bcrypt)"""
    return hashlib.sha256(password.encode()).hexdigest()

def now_utc():
    return datetime.now(timezone.utc)

async def initialize_database():
    """Initialize database with essential data"""
    
    print("=" * 70)
    print("DATABASE INITIALIZATION SCRIPT")
    print("=" * 70)
    print(f"MongoDB URL: {MONGO_URL}")
    print(f"Database Name: {DB_NAME}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 70)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Create Users
    print("\n1️⃣  Creating Users...")
    users = [
        {
            "id": str(uuid.uuid4()),
            "name": "Admin User",
            "email": "admin@gili.com",
            "password": hash_password("admin123"),
            "role": "admin",
            "active": True,
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
    ]
    
    for user in users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"  ✅ Created user: {user['email']}")
        else:
            print(f"  ℹ️  User already exists: {user['email']}")
    
    # 2. Create Chart of Accounts
    print("\n2️⃣  Creating Chart of Accounts...")
    accounts = [
        # Assets
        {"id": str(uuid.uuid4()), "account_code": "1100", "account_name": "Cash", "account_type": "Asset", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "1200", "account_name": "Bank Account", "account_type": "Asset", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "1300", "account_name": "Accounts Receivable", "account_type": "Asset", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "1400", "account_name": "Inventory", "account_type": "Asset", "is_active": True},
        
        # Liabilities
        {"id": str(uuid.uuid4()), "account_code": "2100", "account_name": "Accounts Payable", "account_type": "Liability", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "2200", "account_name": "Tax Payable", "account_type": "Liability", "is_active": True},
        
        # Income
        {"id": str(uuid.uuid4()), "account_code": "4100", "account_name": "Sales", "account_type": "Income", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "4200", "account_name": "Service Income", "account_type": "Income", "is_active": True},
        
        # Expenses
        {"id": str(uuid.uuid4()), "account_code": "5100", "account_name": "Purchases", "account_type": "Expense", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "5200", "account_name": "Cost of Goods Sold", "account_type": "Expense", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "5300", "account_name": "Operating Expenses", "account_type": "Expense", "is_active": True},
        
        # Returns
        {"id": str(uuid.uuid4()), "account_code": "4300", "account_name": "Sales Returns", "account_type": "Income", "is_active": True},
        {"id": str(uuid.uuid4()), "account_code": "5400", "account_name": "Purchase Returns", "account_type": "Expense", "is_active": True},
    ]
    
    for account in accounts:
        existing = await db.accounts.find_one({"account_code": account["account_code"]})
        if not existing:
            await db.accounts.insert_one(account)
            print(f"  ✅ Created account: {account['account_code']} - {account['account_name']}")
        else:
            print(f"  ℹ️  Account already exists: {account['account_code']} - {account['account_name']}")
    
    # 3. Create Sample Customers
    print("\n3️⃣  Creating Sample Customers...")
    customers = [
        {
            "id": str(uuid.uuid4()),
            "name": "ABC Corporation",
            "email": "abc@example.com",
            "phone": "+91 9876543210",
            "address": "123 Business Street, Mumbai",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "XYZ Enterprises",
            "email": "xyz@example.com",
            "phone": "+91 9876543211",
            "address": "456 Corporate Road, Delhi",
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
    ]
    
    for customer in customers:
        existing = await db.customers.find_one({"email": customer["email"]})
        if not existing:
            await db.customers.insert_one(customer)
            print(f"  ✅ Created customer: {customer['name']}")
        else:
            print(f"  ℹ️  Customer already exists: {customer['name']}")
    
    # 4. Create Sample Suppliers
    print("\n4️⃣  Creating Sample Suppliers...")
    suppliers = [
        {
            "id": str(uuid.uuid4()),
            "name": "Global Suppliers Ltd",
            "email": "global@suppliers.com",
            "phone": "+91 9876543220",
            "address": "789 Supplier Avenue, Bangalore",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Prime Vendors Inc",
            "email": "prime@vendors.com",
            "phone": "+91 9876543221",
            "address": "321 Vendor Street, Chennai",
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
    ]
    
    for supplier in suppliers:
        existing = await db.suppliers.find_one({"email": supplier["email"]})
        if not existing:
            await db.suppliers.insert_one(supplier)
            print(f"  ✅ Created supplier: {supplier['name']}")
        else:
            print(f"  ℹ️  Supplier already exists: {supplier['name']}")
    
    # 5. Create Sample Items
    print("\n5️⃣  Creating Sample Items...")
    items = [
        {
            "id": str(uuid.uuid4()),
            "name": "Product A",
            "item_code": "PROD-A-001",
            "unit_price": 100.0,
            "description": "Standard Product A",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Product B",
            "item_code": "PROD-B-002",
            "unit_price": 200.0,
            "description": "Premium Product B",
            "created_at": now_utc(),
            "updated_at": now_utc()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Service Package",
            "item_code": "SRV-001",
            "unit_price": 500.0,
            "description": "Consulting Service Package",
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
    ]
    
    for item in items:
        existing = await db.items.find_one({"item_code": item["item_code"]})
        if not existing:
            await db.items.insert_one(item)
            print(f"  ✅ Created item: {item['name']} ({item['item_code']})")
        else:
            print(f"  ℹ️  Item already exists: {item['name']} ({item['item_code']})")
    
    client.close()
    
    print("\n" + "=" * 70)
    print("✅ DATABASE INITIALIZATION COMPLETE!")
    print("=" * 70)
    print("\n📋 Summary:")
    print(f"  - Users: {len(users)} created")
    print(f"  - Accounts: {len(accounts)} created")
    print(f"  - Customers: {len(customers)} created")
    print(f"  - Suppliers: {len(suppliers)} created")
    print(f"  - Items: {len(items)} created")
    print("\n🔐 Login Credentials:")
    print("  Email: admin@gili.com")
    print("  Password: admin123")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(initialize_database())
