from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from database import db, customers_collection, suppliers_collection, items_collection

router = APIRouter(prefix="/api", tags=["master-data"])


def now_utc():
    return datetime.now(timezone.utc)


def sanitize(doc: Dict[str, Any]):
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d


async def list_collection(col, search: Optional[str], limit: int):
    q: Dict[str, Any] = {}
    if search:
        q = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"item_code": {"$regex": search, "$options": "i"}},
        ]}
    cursor = col.find(q).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [sanitize(r) for r in rows]


# Customers CRUD
@router.get("/master/customers")
async def get_customers(search: Optional[str] = None, limit: int = Query(100, ge=1, le=500)):
    return await list_collection(customers_collection, search, limit)

@router.post("/master/customers")
async def create_customer(body: Dict[str, Any]):
    if not body or not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.get("name"),
        "email": body.get("email"),
        "phone": body.get("phone"),
        "address": body.get("address"),
        "active": body.get("active", True),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await customers_collection.insert_one(doc)
    return sanitize(doc)

@router.get("/master/customers/{cid}")
async def get_customer(cid: str):
    doc = await customers_collection.find_one({"id": cid})
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    return sanitize(doc)

@router.put("/master/customers/{cid}")
async def update_customer(cid: str, body: Dict[str, Any]):
    upd = {k: body.get(k) for k in ["name", "email", "phone", "address", "active"] if k in body}
    if not upd:
        return {"success": True}
    upd["updated_at"] = now_utc()
    res = await customers_collection.update_one({"id": cid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    doc = await customers_collection.find_one({"id": cid})
    return sanitize(doc)

@router.delete("/master/customers/{cid}")
async def delete_customer(cid: str):
    res = await customers_collection.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True}


# Suppliers CRUD
@router.get("/master/suppliers")
async def get_suppliers(search: Optional[str] = None, limit: int = Query(100, ge=1, le=500)):
    return await list_collection(suppliers_collection, search, limit)

@router.post("/master/suppliers")
async def create_supplier(body: Dict[str, Any]):
    if not body or not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.get("name"),
        "email": body.get("email"),
        "phone": body.get("phone"),
        "address": body.get("address"),
        "active": body.get("active", True),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await suppliers_collection.insert_one(doc)
    return sanitize(doc)

@router.get("/master/suppliers/{sid}")
async def get_supplier(sid: str):
    doc = await suppliers_collection.find_one({"id": sid})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return sanitize(doc)

@router.put("/master/suppliers/{sid}")
async def update_supplier(sid: str, body: Dict[str, Any]):
    upd = {k: body.get(k) for k in ["name", "email", "phone", "address", "active"] if k in body}
    if not upd:
        return {"success": True}
    upd["updated_at"] = now_utc()
    res = await suppliers_collection.update_one({"id": sid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    doc = await suppliers_collection.find_one({"id": sid})
    return sanitize(doc)

@router.delete("/master/suppliers/{sid}")
async def delete_supplier(sid: str):
    res = await suppliers_collection.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"success": True}


# Items CRUD
@router.get("/stock/items")
async def get_items(search: Optional[str] = None, limit: int = Query(100, ge=1, le=1000)):
    return await list_collection(items_collection, search, limit)

@router.post("/stock/items")
async def create_item(body: Dict[str, Any]):
    if not body or not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.get("name"),
        "item_code": body.get("item_code"),
        "category": body.get("category"),
        "unit_price": float(body.get("unit_price", 0) or 0),
        "active": body.get("active", True),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await items_collection.insert_one(doc)
    return sanitize(doc)

@router.get("/stock/items/{iid}")
async def get_item(iid: str):
    doc = await items_collection.find_one({"id": iid})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return sanitize(doc)

@router.put("/stock/items/{iid}")
async def update_item(iid: str, body: Dict[str, Any]):
    upd = {k: body.get(k) for k in ["name", "item_code", "category", "unit_price", "active"] if k in body}
    if "unit_price" in upd:
        try:
            upd["unit_price"] = float(upd["unit_price"])
        except Exception:
            upd["unit_price"] = 0
    if not upd:
        return {"success": True}
    upd["updated_at"] = now_utc()
    res = await items_collection.update_one({"id": iid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = await items_collection.find_one({"id": iid})
    return sanitize(doc)

@router.delete("/stock/items/{iid}")
async def delete_item(iid: str):
    res = await items_collection.delete_one({"id": iid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}