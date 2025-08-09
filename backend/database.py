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
sales_orders_collection = db.sales_orders
purchase_orders_collection = db.purchase_orders
transactions_collection = db.transactions
notifications_collection = db.notifications

async def init_sample_data():
    """Initialize sample data for demonstration"""
    
    # Check if sample data already exists
    if await companies_collection.count_documents({}) > 0:
        return
    
    # Create sample company
    company_id = str(uuid.uuid4())
    company_data = {
        "id": company_id,
        "name": "Sample Company Ltd",
        "email": "admin@samplecompany.com",
        "phone": "+1234567890",
        "address": "123 Business Street, City, Country",
        "created_at": datetime.utcnow()
    }
    await companies_collection.insert_one(company_data)
    
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
    customers_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "ABC Corp",
            "email": "contact@abccorp.com",
            "phone": "+1234567891",
            "address": "456 Customer Ave, City, Country",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "DEF Ltd",
            "email": "info@defltd.com",
            "phone": "+1234567892",
            "address": "789 Client Road, City, Country",
            "company_id": company_id,
            "created_at": datetime.utcnow()
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
            "unit_price": 100.0,
            "stock_qty": 50,
            "company_id": company_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Product B",
            "description": "Premium product B",
            "item_code": "PROD-B-001",
            "unit_price": 200.0,
            "stock_qty": 30,
            "company_id": company_id,
            "created_at": datetime.utcnow()
        }
    ]
    await items_collection.insert_many(items_data)
    
    # Create sample transactions
    base_date = datetime.utcnow()
    transactions_data = [
        {
            "id": str(uuid.uuid4()),
            "type": "sales_invoice",
            "reference_number": "SINV-2024-00001",
            "party_id": customers_data[0]["id"],
            "party_name": "ABC Corp",
            "amount": 25000.0,
            "date": base_date - timedelta(days=1),
            "status": "completed",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "type": "purchase_order",
            "reference_number": "PO-2024-00001",
            "party_id": suppliers_data[0]["id"],
            "party_name": "XYZ Suppliers",
            "amount": 15000.0,
            "date": base_date - timedelta(days=2),
            "status": "completed",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "type": "payment_entry",
            "reference_number": "PAY-2024-00001",
            "party_id": customers_data[1]["id"],
            "party_name": "DEF Ltd",
            "amount": 10000.0,
            "date": base_date - timedelta(days=3),
            "status": "completed",
            "company_id": company_id,
            "created_at": datetime.utcnow()
        }
    ]
    await transactions_collection.insert_many(transactions_data)
    
    # Create sample notifications
    notifications_data = [
        {
            "id": str(uuid.uuid4()),
            "title": "New Sales Order from ABC Corp",
            "message": "Sales order SINV-2024-00001 has been created",
            "type": "success",
            "user_id": user_id,
            "is_read": False,
            "created_at": base_date - timedelta(hours=2)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Payment overdue - Invoice SINV-2024-00001",
            "message": "Payment for invoice SINV-2024-00001 is overdue",
            "type": "warning",
            "user_id": user_id,
            "is_read": False,
            "created_at": base_date - timedelta(hours=4)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Stock level low for Item PROD-A-001",
            "message": "Product A stock is running low",
            "type": "error",
            "user_id": user_id,
            "is_read": False,
            "created_at": base_date - timedelta(hours=6)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Monthly report generated successfully",
            "message": "Your monthly sales report is ready",
            "type": "info",
            "user_id": user_id,
            "is_read": False,
            "created_at": base_date - timedelta(days=1)
        }
    ]
    await notifications_collection.insert_many(notifications_data)

    print("✅ Sample data initialized successfully")