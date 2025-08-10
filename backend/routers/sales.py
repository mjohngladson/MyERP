from fastapi import APIRouter, HTTPException
from typing import List
from database import sales_orders_collection, customers_collection
from models import SalesOrder, SalesOrderCreate, Customer, CustomerCreate
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/sales", tags=["sales"])

@router.get("/orders", response_model=List[SalesOrder])
async def get_sales_orders(limit: int = 20):
    """Get sales orders"""
    try:
        cursor = sales_orders_collection.find().sort("created_at", -1).limit(limit)
        orders = await cursor.to_list(length=limit)
        
        # Transform data to match SalesOrder model
        transformed_orders = []
        for order in orders:
            # Convert MongoDB ObjectId to string
            if "_id" in order:
                order["id"] = str(order["_id"])
                del order["_id"]
            
            # Ensure required fields exist with defaults
            order.setdefault("order_number", f"SO-{order.get('id', '').split('-')[0][:8]}")
            
            # Handle customer_id - ensure it's a valid string
            if not order.get("customer_id") or order.get("customer_id") is None:
                order["customer_id"] = "default_customer"
            else:
                order["customer_id"] = str(order["customer_id"])
                
            order.setdefault("customer_name", "Unknown Customer")
            order.setdefault("total_amount", 0.0)
            order.setdefault("status", "draft")
            order.setdefault("items", [])
            order.setdefault("company_id", "default_company")
            
            # Ensure items have proper structure
            fixed_items = []
            for item in order.get("items", []):
                fixed_item = {
                    "item_id": item.get("item_id", item.get("product_id", "unknown")),
                    "item_name": item.get("item_name", item.get("product_name", "Unknown Item")),
                    "quantity": item.get("quantity", 0),
                    "rate": item.get("rate", item.get("unit_price", 0.0)),
                    "amount": item.get("amount", item.get("line_total", 0.0))
                }
                fixed_items.append(fixed_item)
            
            order["items"] = fixed_items
            
            # Handle status mapping
            if order.get("status") == "completed":
                order["status"] = "delivered"
            
            transformed_orders.append(SalesOrder(**order))
        
        return transformed_orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales orders: {str(e)}")

@router.post("/orders", response_model=SalesOrder)
async def create_sales_order(order_data: SalesOrderCreate):
    """Create a new sales order"""
    try:
        # Get customer details
        customer = await customers_collection.find_one({"id": order_data.customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Generate order number
        order_count = await sales_orders_collection.count_documents({})
        order_number = f"SO-2024-{order_count + 1:05d}"
        
        # Create sales order
        sales_order = SalesOrder(
            order_number=order_number,
            customer_id=order_data.customer_id,
            customer_name=customer["name"],
            total_amount=order_data.total_amount,
            delivery_date=order_data.delivery_date,
            items=order_data.items,
            company_id=order_data.company_id
        )
        
        # Insert into database
        await sales_orders_collection.insert_one(sales_order.dict())
        
        return sales_order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sales order: {str(e)}")

@router.get("/customers", response_model=List[Customer])
async def get_customers(limit: int = 50):
    """Get customers"""
    try:
        cursor = customers_collection.find().sort("created_at", -1).limit(limit)
        customers = await cursor.to_list(length=limit)
        
        return [Customer(**customer) for customer in customers]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")

@router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate):
    """Create a new customer"""
    try:
        customer = Customer(**customer_data.dict())
        
        # Insert into database
        await customers_collection.insert_one(customer.dict())
        
        return customer
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating customer: {str(e)}")