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
        "customer_type": body.get("customer_type", "Individual"),  # Individual, Company
        
        # Contact Info
        "email": body.get("email"),
        "phone": body.get("phone"),
        "mobile": body.get("mobile"),
        "website": body.get("website"),
        
        # Address
        "billing_address": body.get("billing_address"),
        "shipping_address": body.get("shipping_address"),
        "city": body.get("city"),
        "state": body.get("state"),
        "country": body.get("country", "India"),
        "pincode": body.get("pincode"),
        
        # GST/Tax Info
        "gstin": body.get("gstin"),
        "pan": body.get("pan"),
        "tax_category": body.get("tax_category", "In State"),  # In State, Out of State, Export
        
        # Business Info
        "credit_limit": float(body.get("credit_limit", 0) or 0),
        "payment_terms": body.get("payment_terms", "Net 30"),
        "price_list": body.get("price_list", "Standard Selling"),
        
        # Additional Info
        "customer_group": body.get("customer_group", "All Customer Groups"),
        "territory": body.get("territory", "India"),
        "loyalty_points": float(body.get("loyalty_points", 0) or 0),
        
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
    allowed_fields = [
        "name", "customer_type", "email", "phone", "mobile", "website",
        "billing_address", "shipping_address", "city", "state", "country", "pincode",
        "gstin", "pan", "tax_category", "credit_limit", "payment_terms", "price_list",
        "customer_group", "territory", "loyalty_points", "active"
    ]
    upd = {k: body.get(k) for k in allowed_fields if k in body}
    
    # Handle float fields
    float_fields = ["credit_limit", "loyalty_points"]
    for field in float_fields:
        if field in upd:
            try:
                upd[field] = float(upd[field] or 0)
            except Exception:
                upd[field] = 0
    
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
        "supplier_type": body.get("supplier_type", "Company"),  # Company, Individual
        
        # Contact Info
        "email": body.get("email"),
        "phone": body.get("phone"),
        "mobile": body.get("mobile"),
        "website": body.get("website"),
        
        # Address
        "billing_address": body.get("billing_address"),
        "city": body.get("city"),
        "state": body.get("state"),
        "country": body.get("country", "India"),
        "pincode": body.get("pincode"),
        
        # GST/Tax Info
        "gstin": body.get("gstin"),
        "pan": body.get("pan"),
        "tax_category": body.get("tax_category", "In State"),  # In State, Out of State, Import
        
        # Business Info
        "credit_limit": float(body.get("credit_limit", 0) or 0),
        "payment_terms": body.get("payment_terms", "Net 30"),
        
        # Additional Info
        "supplier_group": body.get("supplier_group", "All Supplier Groups"),
        "territory": body.get("territory", "India"),
        
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
    allowed_fields = [
        "name", "supplier_type", "email", "phone", "mobile", "website",
        "billing_address", "city", "state", "country", "pincode",
        "gstin", "pan", "tax_category", "credit_limit", "payment_terms",
        "supplier_group", "territory", "active"
    ]
    upd = {k: body.get(k) for k in allowed_fields if k in body}
    
    # Handle float fields
    if "credit_limit" in upd:
        try:
            upd["credit_limit"] = float(upd["credit_limit"] or 0)
        except Exception:
            upd["credit_limit"] = 0
    
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
        "description": body.get("description"),
        "unit_price": float(body.get("unit_price", 0) or 0),
        "cost_price": float(body.get("cost_price", 0) or 0),
        "uom": body.get("uom", "NOS"),
        
        # GST/Tax fields
        "hsn_code": body.get("hsn_code"),
        "gst_rate": float(body.get("gst_rate", 0) or 0),
        
        # Inventory fields
        "track_inventory": body.get("track_inventory", True),
        "min_qty": float(body.get("min_qty", 0) or 0),
        "max_qty": float(body.get("max_qty", 0) or 0),
        "reorder_level": float(body.get("reorder_level", 0) or 0),
        
        # Variant fields
        "has_variants": body.get("has_variants", False),
        "variant_attributes": body.get("variant_attributes", []),  # ["Size", "Color"]
        
        # Dimensions & Weight
        "weight": float(body.get("weight", 0) or 0),
        "length": float(body.get("length", 0) or 0),
        "width": float(body.get("width", 0) or 0),
        "height": float(body.get("height", 0) or 0),
        
        # Status & Settings
        "is_service": body.get("is_service", False),
        "is_purchase": body.get("is_purchase", True),
        "is_sales": body.get("is_sales", True),
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
    allowed_fields = [
        "name", "item_code", "category", "description", "unit_price", "cost_price", 
        "uom", "hsn_code", "gst_rate", "track_inventory", "min_qty", "max_qty", 
        "reorder_level", "has_variants", "variant_attributes", "weight", "length", 
        "width", "height", "is_service", "is_purchase", "is_sales", "active"
    ]
    upd = {k: body.get(k) for k in allowed_fields if k in body}
    
    # Handle float fields
    float_fields = ["unit_price", "cost_price", "gst_rate", "min_qty", "max_qty", "reorder_level", "weight", "length", "width", "height"]
    for field in float_fields:
        if field in upd:
            try:
                upd[field] = float(upd[field] or 0)
            except Exception:
                upd[field] = 0
    
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