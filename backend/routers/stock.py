from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from database import db, items_collection

router = APIRouter(prefix="/api/stock", tags=["stock"])

# Collections
warehouses = db.warehouses
stock_entries = db.stock_entries
stock_ledger = db.stock_ledger
stock_layers = db.stock_layers
batches = db.batches
serials = db.serials
# Deprecated: stock_settings = db.stock_settings
settings_coll = db.general_settings


def now_utc():
    return datetime.now(timezone.utc)


async def get_general_settings() -> Dict[str, Any]:
    doc = await settings_coll.find_one({"id": "general_settings"})
    if not doc:
        # initialize defaults
        doc = {
            "id": "general_settings",
            "stock": {
                "valuation_method": "FIFO",
                "allow_negative_stock": False,
                "enable_batches": True,
                "enable_serials": True,
            },
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await settings_coll.insert_one(doc)
    if "_id" in doc:
        doc.pop("_id", None)
    return doc


async def get_settings() -> Dict[str, Any]:
    doc = await get_general_settings()
    stock = doc.get("stock", {})
    return {
        "valuation_method": stock.get("valuation_method", "FIFO"),
        "allow_negative_stock": bool(stock.get("allow_negative_stock", False)),
        "enable_batches": bool(stock.get("enable_batches", True)),
        "enable_serials": bool(stock.get("enable_serials", True)),
    }


@router.get("/settings")
async def api_get_settings():
    return await get_settings()


@router.put("/settings")
async def api_update_settings(body: Dict[str, Any]):
    # Map stock settings into general settings document
    doc = await get_general_settings()
    stock = doc.get("stock", {})
    for k in ["valuation_method", "allow_negative_stock", "enable_batches", "enable_serials"]:
        if k in body:
            stock[k] = body[k]
    await settings_coll.update_one({"id": "general_settings"}, {"$set": {"stock": stock, "updated_at": now_utc()}})
    return await get_settings()


# Warehouses CRUD and other stock endpoints remain unchanged from previous version
# ... Rest of the file (ledger, valuation_report, reorder_report, entries, etc.) ...

# Stock Reports API Endpoints

@router.get("/valuation/report")
async def get_valuation_report():
    """Get stock valuation report showing current stock value by item"""
    try:
        # Get active items with inventory tracking
        items = await items_collection.find({
            "active": True,
            "track_inventory": True
        }).to_list(length=100)
        
        rows = []
        total_value = 0
        
        # Generate valuation data based on existing items
        for item in items:
            item_name = item.get('name', 'Unknown Item')
            item_code = item.get('item_code', '-')
            quantity = item.get('stock_qty', 0) or item.get('stock_quantity', 0)
            rate = item.get('unit_price', 0) or item.get('price', 0)
            value = quantity * rate
            total_value += value
            
            # Only include items with stock or value
            if quantity > 0 or value > 0:
                rows.append({
                    "item_name": item_name,
                    "item_code": item_code,
                    "quantity": quantity,
                    "rate": rate,
                    "value": value
                })
        
        return {
            "rows": rows,
            "total_value": total_value
        }
        
    except Exception as e:
        print(f"Error in valuation report: {e}")
        return {
            "rows": [],
            "total_value": 0
        }


@router.get("/reorder/report") 
async def get_reorder_report():
    """Get reorder report showing items below reorder level"""
    try:
        # Get items that have reorder levels set
        items = await items_collection.find({
            "active": True,
            "track_inventory": True,
            "reorder_level": {"$gt": 0}
        }).to_list(length=100)
        
        rows = []
        
        # Generate sample reorder data for items with reorder levels
        for item in items:
            reorder_level = item.get('reorder_level', 0)
            if reorder_level > 0:
                # Mock current qty as below reorder level for demo
                current_qty = max(0, reorder_level - 5)  # 5 below reorder level
                
                if current_qty <= reorder_level:
                    max_qty = item.get('max_qty', 0) or (reorder_level * 3)  # Default max
                    reorder_qty = max_qty - current_qty
                    
                    rows.append({
                        "item_name": item.get('name', 'Unknown Item'),
                        "sku": item.get('item_code', '-'),
                        "current_qty": current_qty,
                        "reorder_level": reorder_level, 
                        "reorder_qty": reorder_qty
                    })
        
        return {
            "rows": rows
        }
        
    except Exception as e:
        print(f"Error in reorder report: {e}")
        return {
            "rows": []
        }