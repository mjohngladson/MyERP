from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

def get_database():
    """Get database instance for PoS integration"""
    return db

# Collections
users_collection = db.users
companies_collection = db.companies
customers_collection = db.customers
suppliers_collection = db.suppliers
items_collection = db.items
sales_invoices_collection = db.sales_invoices  # Primary collection for PoS transactions
sales_orders_collection = db.sales_orders
sales_quotations_collection = db.sales_quotations
purchase_orders_collection = db.purchase_orders
purchase_invoices_collection = db.purchase_invoices
credit_notes_collection = db.credit_notes
debit_notes_collection = db.debit_notes
transactions_collection = db.transactions
notifications_collection = db.notifications

# Stock module collections
warehouses_collection = db.warehouses
stock_entries_collection = db.stock_entries
stock_ledger_collection = db.stock_ledger
stock_layers_collection = db.stock_layers
batches_collection = db.batches
serials_collection = db.serials
stock_settings_collection = db.stock_settings

async def init_sample_data():
    """Initialize sample data for demonstration"""
    
    # Check if sample data already exists
    if await companies_collection.count_documents({}) > 0:
        print("📊 Sample data already exists, skipping initialization")
        return
    
    await force_init_sample_data()

async def force_init_sample_data():
    """Force initialize sample data (even if already exists)"""
    print("🚀 Initializing sample data...")
    
    # Create sample company with default ID
    company_id = "default_company"
    company_data = {
        "id": company_id,
        "name": "Sample Company Ltd",
        "email": "admin@samplecompany.com",
        "phone": "+1234567890",
        "address": "123 Business Street, City, Country",
        "created_at": datetime.utcnow()
    }
    await companies_collection.insert_one(company_data)
    
    # Create demo users for authentication
    demo_users_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Admin User",
            "email": "admin@gili.com",
            "password": "admin123",  # In production, this should be hashed
            "role": "System Manager",
            "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        }
    ]
    await users_collection.insert_many(demo_users_data)
    print("✅ Demo users created: admin@gili.com")
    
    # Create sample user
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "name": "John Doe",
        "email": "john.doe@company.com",
        "role": "System Manager",
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(user_data)
    
    # Create sample customers
    default_customer_id = "default_customer"
    customers_data = [
        {
            "id": default_customer_id,
            "name": "Walk-in Customer",
            "email": "walkin@pos.local",
            "phone": None,
            "address": "Point of Sale",
            "loyalty_points": 0,
            "last_purchase": None,
            "active": True,
            "company_id": company_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    await customers_collection.insert_many(customers_data)
    
    # Create sample suppliers
    suppliers_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "XYZ Suppliers",
            "email": "sales@xyzsuppliers.com",
            "phone": "+1234567893",
            "address": "321 Supplier Street, City, Country",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        }
    ]
    await suppliers_collection.insert_many(suppliers_data)
    
    # Create sample items
    items_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Product A",
            "description": "High quality product A",
            "item_code": "PROD-A-001",
            "barcode": "123456789001",
            "unit_price": 100.0,
            "stock_qty": 50,
            "stock_quantity": 50,
            "price": 100.0,
            "category": "Electronics",
            "reorder_level": 20,
            "reorder_qty": 50,
            "active": True,
            "company_id": company_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
    ]
    await items_collection.insert_many(items_data)

    # Warehouses (sample)
    wh_main = {
        "id": "MAIN-WH",
        "name": "Main Warehouse",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    await warehouses_collection.insert_one(wh_main)

    # Stock settings default
    await stock_settings_collection.insert_one({
        "id": "stock_settings_default",
        "valuation_method": "FIFO",
        "allow_negative_stock": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })

    # Seed initial layers for Product A in Main Warehouse (50 qty @ 100)
    await stock_layers_collection.insert_one({
        "id": str(uuid.uuid4()),
        "item_id": items_data[0]["id"],
        "warehouse_id": wh_main["id"],
        "qty_remaining": 50.0,
        "rate": 100.0,
        "created_at": datetime.utcnow()
    })

    # Corresponding ledger
    await stock_ledger_collection.insert_one({
        "item_id": items_data[0]["id"],
        "warehouse_id": wh_main["id"],
        "qty": 50.0,
        "rate": 100.0,
        "value": 5000.0,
        "voucher_type": "Opening",
        "voucher_id": "OPENING",
        "timestamp": datetime.utcnow(),
        "direction": "+"
    })

    # Transactions (sample)
    base_date = datetime.utcnow()
    transactions_data = [
        {
            "id": str(uuid.uuid4()),
            "type": "sales_invoice",
            "reference_number": "SINV-2024-00001",
            "party_id": customers_data[0]["id"],
            "party_name": customers_data[0]["name"],
            "amount": 25000.0,
            "date": base_date - timedelta(days=1),
            "status": "completed",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        }
    ]
    await transactions_collection.insert_many(transactions_data)

    # Notifications (sample)
    notifications_data = [
        {
            "id": str(uuid.uuid4()),
            "title": "New Sales Order from ABC Corp",
            "message": "Sales order SINV-2024-00001 has been created",
            "type": "success",
            "user_id": user_id,
            "is_read": False,
            "created_at": base_date - timedelta(hours=2)
        }
    ]
    await notifications_collection.insert_many(notifications_data)

    print("✅ Sample data initialized successfully")