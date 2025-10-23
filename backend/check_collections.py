import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['gili_erp']
    
    print('Customers:', await db.customers.count_documents({}))
    print('Suppliers:', await db.suppliers.count_documents({}))
    print('Invoices:', await db.invoices.count_documents({}))
    
    # Get first customer
    customer = await db.customers.find_one()
    if customer:
        print('\nFirst customer:', customer.get('name'), '-', customer.get('id'))
    
    # Get first invoice
    invoice = await db.invoices.find_one()
    if invoice:
        print('First invoice:', invoice.get('invoice_number'), '- customer_id:', invoice.get('customer_id'))
    
    client.close()

asyncio.run(check())
