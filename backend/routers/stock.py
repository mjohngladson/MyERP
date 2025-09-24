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