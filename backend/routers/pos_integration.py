# GiLi Backend - PoS Integration API
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
from bson import ObjectId

from database import get_database
from models import *

router = APIRouter(prefix="/api/pos", tags=["PoS Integration"])

# PoS-specific models
class PoSTransaction(BaseModel):
    pos_transaction_id: str
    store_location: Optional[str] = "Main Store"
    cashier_id: str
    customer_id: Optional[str] = None
    items: List[Dict[str, Any]]
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    payment_method: str
    payment_details: Dict[str, Any] = {}
    status: str = "completed"
    transaction_timestamp: datetime
    pos_device_id: Optional[str] = None
    receipt_number: Optional[str] = None

class PoSProduct(BaseModel):
    pos_product_id: str
    name: str
    sku: str
    barcode: Optional[str] = None
    price: float
    category: Optional[str] = None
    description: Optional[str] = None
    stock_quantity: int = 0
    image_url: Optional[str] = None
    active: bool = True
    last_updated: datetime

class PoSCustomer(BaseModel):
    pos_customer_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int = 0
    last_purchase: Optional[datetime] = None

class SyncRequest(BaseModel):
    device_id: str
    device_name: str
    last_sync: Optional[datetime] = None
    sync_types: List[str] = ["products", "customers", "transactions"]

class SyncResponse(BaseModel):
    success: bool
    sync_timestamp: datetime
    products_updated: int = 0
    customers_updated: int = 0
    transactions_processed: int = 0
    errors: List[str] = []

@router.post("/sync", response_model=SyncResponse)
async def sync_pos_data(sync_request: SyncRequest):
    """
    Complete data synchronization endpoint for PoS devices
    """
    try:
        db = get_database()
        sync_timestamp = datetime.now()
        errors = []
        
        response = SyncResponse(
            success=True,
            sync_timestamp=sync_timestamp
        )
        
        # Log sync request
        await db.sync_log.insert_one({
            "device_id": sync_request.device_id,
            "device_name": sync_request.device_name,
            "sync_timestamp": sync_timestamp,
            "sync_types": sync_request.sync_types,
            "status": "initiated"
        })
        
        # Process each sync type
        if "products" in sync_request.sync_types:
            try:
                response.products_updated = await sync_products_to_pos(db, sync_request.last_sync)
            except Exception as e:
                errors.append(f"Products sync failed: {str(e)}")
        
        if "customers" in sync_request.sync_types:
            try:
                response.customers_updated = await sync_customers_to_pos(db, sync_request.last_sync)
            except Exception as e:
                errors.append(f"Customers sync failed: {str(e)}")
        
        # Update sync log
        await db.sync_log.update_one(
            {"device_id": sync_request.device_id, "sync_timestamp": sync_timestamp},
            {"$set": {
                "status": "completed" if not errors else "completed_with_errors",
                "products_updated": response.products_updated,
                "customers_updated": response.customers_updated,
                "errors": errors,
                "completed_at": datetime.now()
            }}
        )
        
        response.errors = errors
        response.success = len(errors) == 0
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

async def sync_products_to_pos(db, last_sync: Optional[datetime] = None) -> int:
    """Sync products from main GiLi system to PoS format"""
    
    # Build query for incremental sync
    query = {"active": True}
    if last_sync:
        query["updated_at"] = {"$gte": last_sync}
    
    # Get products from main system
    products_cursor = db.items.find(query)
    updated_count = 0
    
    async for product in products_cursor:
        # Convert to PoS format
        pos_product = {
            "id": str(product["_id"]),
            "name": product.get("name", ""),
            "sku": product.get("item_code", ""),
            "barcode": product.get("barcode", ""),
            "price": float(product.get("price", 0)),
            "category": product.get("category", "General"),
            "description": product.get("description", ""),
            "stock_quantity": int(product.get("stock_quantity", 0)),
            "image_url": product.get("image", ""),
            "active": product.get("active", True),
            "updated_at": product.get("updated_at", datetime.now()).isoformat(),
            "synced_from_main": True
        }
        
        # Store in PoS-specific collection for caching
        await db.pos_products.update_one(
            {"id": pos_product["id"]},
            {"$set": pos_product},
            upsert=True
        )
        
        updated_count += 1
    
    return updated_count

async def sync_customers_to_pos(db, last_sync: Optional[datetime] = None) -> int:
    """Sync customers from main GiLi system to PoS format"""
    
    query = {"active": True}
    if last_sync:
        query["updated_at"] = {"$gte": last_sync}
    
    customers_cursor = db.customers.find(query)
    updated_count = 0
    
    async for customer in customers_cursor:
        # Convert to PoS format
        pos_customer = {
            "id": str(customer["_id"]),
            "name": customer.get("name", ""),
            "email": customer.get("email", ""),
            "phone": customer.get("phone", ""),
            "address": customer.get("address", ""),
            "loyalty_points": customer.get("loyalty_points", 0),
            "last_purchase": customer.get("last_purchase"),
            "updated_at": customer.get("updated_at", datetime.now()).isoformat(),
            "synced_from_main": True
        }
        
        await db.pos_customers.update_one(
            {"id": pos_customer["id"]},
            {"$set": pos_customer},
            upsert=True
        )
        
        updated_count += 1
    
    return updated_count

@router.get("/products", response_model=List[dict])
async def get_pos_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    limit: int = 1000
):
    """Get products optimized for PoS display"""
    
    try:
        db = get_database()
        
        # Build query
        query = {}
        if active_only:
            query["active"] = True
        if category:
            query["category"] = category
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}},
                {"barcode": {"$regex": search, "$options": "i"}}
            ]
        
        # Get from PoS cache first, fallback to main items
        products = []
        pos_products_cursor = db.pos_products.find(query).limit(limit)
        
        async for product in pos_products_cursor:
            product["_id"] = str(product.get("_id", ""))
            products.append(product)
        
        # If no cached products, sync from main system
        if not products:
            await sync_products_to_pos(db)
            pos_products_cursor = db.pos_products.find(query).limit(limit)
            async for product in pos_products_cursor:
                product["_id"] = str(product.get("_id", ""))
                products.append(product)
        
        return products
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get products: {str(e)}")

@router.get("/customers", response_model=List[dict])
async def get_pos_customers(
    search: Optional[str] = None,
    limit: int = 100
):
    """Get customers for PoS lookup"""
    
    try:
        db = get_database()
        
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        customers = []
        customers_cursor = db.pos_customers.find(query).limit(limit)
        
        async for customer in customers_cursor:
            customer["_id"] = str(customer.get("_id", ""))
            customers.append(customer)
        
        return customers
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customers: {str(e)}")

@router.post("/transactions")
async def receive_pos_transaction(transaction: PoSTransaction):
    """Receive transaction from PoS and create sales order in main system"""
    
    try:
        db = get_database()
        
        # Convert PoS transaction to Sales Order format
        sales_order = {
            "id": str(uuid.uuid4()),
            "customer_id": transaction.customer_id,
            "customer_name": "Walk-in Customer",  # Default
            "order_date": transaction.transaction_timestamp,
            "items": [],
            "subtotal": transaction.subtotal,
            "tax_amount": transaction.tax_amount,
            "discount_amount": transaction.discount_amount,
            "total_amount": transaction.total_amount,
            "status": "completed",
            "payment_method": transaction.payment_method,
            "payment_status": "paid",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            # PoS-specific metadata
            "pos_metadata": {
                "pos_transaction_id": transaction.pos_transaction_id,
                "cashier_id": transaction.cashier_id,
                "store_location": transaction.store_location,
                "pos_device_id": transaction.pos_device_id,
                "receipt_number": transaction.receipt_number,
                "payment_details": transaction.payment_details
            }
        }
        
        # Get customer info if provided
        if transaction.customer_id:
            customer = await db.customers.find_one({"_id": ObjectId(transaction.customer_id)})
            if customer:
                sales_order["customer_name"] = customer.get("name", "Unknown Customer")
        
        # Convert items
        total_quantity = 0
        for item in transaction.items:
            # Get product info
            product = await db.items.find_one({"_id": ObjectId(item["product_id"])})
            
            order_item = {
                "product_id": item["product_id"],
                "product_name": item.get("product_name", product.get("name", "") if product else "Unknown Product"),
                "sku": product.get("item_code", "") if product else "",
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount_percent": item.get("discount_percent", 0),
                "line_total": item["line_total"]
            }
            
            sales_order["items"].append(order_item)
            total_quantity += item["quantity"]
        
        sales_order["total_quantity"] = total_quantity
        
        # Insert sales order
        result = await db.sales_orders.insert_one(sales_order)
        
        # Update inventory
        for item in transaction.items:
            await db.items.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"stock_quantity": -item["quantity"]}}
            )
        
        # Update customer last purchase
        if transaction.customer_id:
            await db.customers.update_one(
                {"_id": ObjectId(transaction.customer_id)},
                {
                    "$set": {"last_purchase": transaction.transaction_timestamp},
                    "$inc": {"loyalty_points": int(transaction.total_amount)}
                }
            )
        
        # Store PoS transaction for reference
        pos_transaction_record = transaction.dict()
        pos_transaction_record["sales_order_id"] = str(result.inserted_id)
        pos_transaction_record["processed_at"] = datetime.now()
        
        await db.pos_transactions.insert_one(pos_transaction_record)
        
        return {
            "success": True,
            "sales_order_id": str(result.inserted_id),
            "transaction_processed": True,
            "inventory_updated": True,
            "message": "Transaction successfully integrated into GiLi system"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process transaction: {str(e)}")

@router.post("/transactions/batch")
async def receive_pos_transactions_batch(transactions: List[PoSTransaction]):
    """Receive multiple transactions from PoS (for bulk sync)"""
    
    results = []
    errors = []
    
    for transaction in transactions:
        try:
            result = await receive_pos_transaction(transaction)
            results.append({
                "pos_transaction_id": transaction.pos_transaction_id,
                "success": True,
                "sales_order_id": result["sales_order_id"]
            })
        except Exception as e:
            errors.append({
                "pos_transaction_id": transaction.pos_transaction_id,
                "error": str(e)
            })
    
    return {
        "processed": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors,
        "success": len(errors) == 0
    }

@router.get("/sync-status/{device_id}")
async def get_sync_status(device_id: str):
    """Get last sync status for PoS device"""
    
    try:
        db = get_database()
        
        last_sync = await db.sync_log.find_one(
            {"device_id": device_id},
            sort=[("sync_timestamp", -1)]
        )
        
        if not last_sync:
            return {
                "device_id": device_id,
                "last_sync": None,
                "status": "never_synced",
                "message": "Device has not synced yet"
            }
        
        return {
            "device_id": device_id,
            "last_sync": last_sync["sync_timestamp"],
            "status": last_sync["status"],
            "products_updated": last_sync.get("products_updated", 0),
            "customers_updated": last_sync.get("customers_updated", 0),
            "errors": last_sync.get("errors", []),
            "completed_at": last_sync.get("completed_at")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")

@router.get("/health")
async def pos_api_health():
    """Health check endpoint for PoS integration"""
    
    try:
        db = get_database()
        
        # Test database connection
        await db.command("ping")
        
        # Get some basic stats
        products_count = await db.items.count_documents({"active": True})
        customers_count = await db.customers.count_documents({"active": True})
        recent_transactions = await db.pos_transactions.count_documents({
            "transaction_timestamp": {"$gte": datetime.now() - timedelta(days=1)}
        })
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(),
            "database": "connected",
            "products_available": products_count,
            "customers_available": customers_count,
            "transactions_24h": recent_transactions,
            "api_version": "1.0.0"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/categories")
async def get_product_categories():
    """Get available product categories for PoS filtering"""
    
    try:
        db = get_database()
        
        categories = await db.items.distinct("category", {"active": True})
        
        return {
            "categories": [cat for cat in categories if cat],
            "count": len(categories)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")

@router.post("/customers")
async def create_pos_customer(customer: PoSCustomer):
    """Create customer from PoS (for walk-in customer registration)"""
    
    try:
        db = get_database()
        
        # Create in main customers collection
        customer_doc = {
            "id": str(uuid.uuid4()),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "loyalty_points": customer.loyalty_points,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "active": True,
            "source": "pos",
            "pos_customer_id": customer.pos_customer_id
        }
        
        result = await db.customers.insert_one(customer_doc)
        
        # Also store in PoS cache
        pos_customer_doc = customer.dict()
        pos_customer_doc["id"] = str(result.inserted_id)
        pos_customer_doc["main_customer_id"] = str(result.inserted_id)
        
        await db.pos_customers.update_one(
            {"pos_customer_id": customer.pos_customer_id},
            {"$set": pos_customer_doc},
            upsert=True
        )
        
        return {
            "success": True,
            "customer_id": str(result.inserted_id),
            "message": "Customer created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")

@router.get("/reports/pos-summary")
async def get_pos_summary_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    store_location: Optional[str] = None
):
    """Get PoS summary report for management"""
    
    try:
        db = get_database()
        
        # Parse dates
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_dt = datetime.now() - timedelta(days=30)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.now()
        
        # Build query
        query = {
            "transaction_timestamp": {"$gte": start_dt, "$lte": end_dt}
        }
        
        if store_location:
            query["store_location"] = store_location
        
        # Aggregate PoS data
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total_transactions": {"$sum": 1},
                    "total_revenue": {"$sum": "$total_amount"},
                    "total_items_sold": {
                        "$sum": {
                            "$sum": "$items.quantity"
                        }
                    },
                    "avg_transaction_value": {"$avg": "$total_amount"},
                    "payment_methods": {"$push": "$payment_method"},
                    "cashiers": {"$addToSet": "$cashier_id"},
                    "unique_customers": {"$addToSet": "$customer_id"}
                }
            }
        ]
        
        result = await db.pos_transactions.aggregate(pipeline).to_list(1)
        
        if not result:
            return {
                "period": {"start": start_dt, "end": end_dt},
                "summary": {
                    "total_transactions": 0,
                    "total_revenue": 0.0,
                    "total_items_sold": 0,
                    "avg_transaction_value": 0.0,
                    "unique_customers": 0,
                    "active_cashiers": 0
                },
                "payment_breakdown": {},
                "message": "No transactions found for the specified period"
            }
        
        summary_data = result[0]
        
        # Payment method breakdown
        from collections import Counter
        payment_counts = Counter(summary_data["payment_methods"])
        
        return {
            "period": {"start": start_dt, "end": end_dt},
            "summary": {
                "total_transactions": summary_data["total_transactions"],
                "total_revenue": round(summary_data["total_revenue"], 2),
                "total_items_sold": summary_data["total_items_sold"],
                "avg_transaction_value": round(summary_data["avg_transaction_value"], 2),
                "unique_customers": len([c for c in summary_data["unique_customers"] if c]),
                "active_cashiers": len(summary_data["cashiers"])
            },
            "payment_breakdown": dict(payment_counts),
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PoS report: {str(e)}")

# Export router
def get_pos_router():
    return router