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
stock_settings = db.stock_settings


def now_utc():
    return datetime.now(timezone.utc)


async def get_settings() -> Dict[str, Any]:
    s = await stock_settings.find_one({"id": {"$exists": True}})
    if not s:
        default = {
            "id": "stock_settings_default",
            "valuation_method": "FIFO",
            "allow_negative_stock": False,
            "enable_batches": True,
            "enable_serials": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await stock_settings.insert_one(default)
        s = default
    return s


async def get_item_wh_qty(item_id: str, warehouse_id: str) -> float:
    # Sum of ledger qty for this item+warehouse
    agg = [
        {"$match": {"item_id": item_id, "warehouse_id": warehouse_id}},
        {"$group": {"_id": None, "qty": {"$sum": "$qty"}}},
    ]
    res = await stock_ledger.aggregate(agg).to_list(1)
    return float(res[0]["qty"]) if res else 0.0


async def fifo_consume(item_id: str, warehouse_id: str, qty_to_issue: float) -> List[Dict[str, Any]]:
    """Consume layers FIFO and return list of consumptions with rate and qty.
    Also updates stock_layers in DB.
    """
    if qty_to_issue <= 0:
        return []
    remaining = qty_to_issue
    consumptions = []
    cursor = stock_layers.find({
        "item_id": item_id,
        "warehouse_id": warehouse_id,
        "qty_remaining": {"$gt": 0}
    }).sort("created_at", 1)
    async for layer in cursor:
        if remaining <= 0:
            break
        take = min(remaining, float(layer.get("qty_remaining", 0)))
        if take > 0:
            consumptions.append({
                "qty": take,
                "rate": float(layer.get("rate", 0)),
                "layer_id": str(layer.get("_id")),
                "batch_id": layer.get("batch_id"),
                "serial_numbers": layer.get("serial_numbers", [])
            })
            await stock_layers.update_one({"_id": layer["_id"]}, {"$inc": {"qty_remaining": -take}})
            remaining -= take
    if remaining > 1e-9:
        # Not enough stock in layers; caller should have validated against negative
        # For safety, raise
        raise HTTPException(status_code=400, detail="Insufficient stock to fulfill issue/transfer")
    return consumptions


@router.get("/settings")
async def api_get_settings():
    return await get_settings()


@router.put("/settings")
async def api_update_settings(body: Dict[str, Any]):
    current = await get_settings()
    update = {}
    if "allow_negative_stock" in body:
        update["allow_negative_stock"] = bool(body["allow_negative_stock"])
    if "valuation_method" in body:
        if body["valuation_method"] not in ("FIFO", "MovingAverage"):
            raise HTTPException(status_code=400, detail="Invalid valuation_method")
        update["valuation_method"] = body["valuation_method"]
    if not update:
        return current
    update["updated_at"] = now_utc()
    await stock_settings.update_one({"id": current["id"]}, {"$set": update})
    current.update(update)
    return current


# Warehouses CRUD
@router.get("/warehouses")
async def list_warehouses(limit: int = Query(100, ge=1, le=500)):
    cursor = warehouses.find().sort("created_at", -1).limit(limit)
    data = await cursor.to_list(length=limit)
    for w in data:
        if "_id" in w:
            w["id"] = str(w["_id"]) if not w.get("id") else w["id"]
            del w["_id"]
    return data


@router.post("/warehouses")
async def create_warehouse(body: Dict[str, Any]):
    name = (body or {}).get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "is_active": bool((body or {}).get("is_active", True)),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await warehouses.insert_one(doc)
    return doc


@router.put("/warehouses/{warehouse_id}")
async def update_warehouse(warehouse_id: str, body: Dict[str, Any]):
    upd = {k: body[k] for k in ["name", "is_active"] if k in body}
    if not upd:
        return {"success": True}
    upd["updated_at"] = now_utc()
    res = await warehouses.update_one({"id": warehouse_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    doc = await warehouses.find_one({"id": warehouse_id})
    if "_id" in doc:
        doc["id"] = doc.get("id") or str(doc["_id"]) 
        del doc["_id"]
    return doc


@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str):
    res = await warehouses.delete_one({"id": warehouse_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"success": True}


# Stock ledger and valuation
@router.get("/ledger")
async def get_ledger(item_id: Optional[str] = None, warehouse_id: Optional[str] = None, limit: int = 200):
    query: Dict[str, Any] = {}
    if item_id:
        query["item_id"] = item_id
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    cursor = stock_ledger.find(query).sort("timestamp", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    for r in rows:
        if "_id" in r:
            r["id"] = str(r["_id"]) 
            del r["_id"]
    # add current qty
    balances: Dict[str, float] = {}
    if item_id and warehouse_id:
        qty = await get_item_wh_qty(item_id, warehouse_id)
        balances[f"{item_id}:{warehouse_id}"] = qty
    return {"rows": rows, "balances": balances}


@router.get("/valuation/report")
async def valuation_report():
    # Sum remaining layers * rate per item + per warehouse
    pipeline = [
        {"$group": {
            "_id": {"item_id": "$item_id", "warehouse_id": "$warehouse_id"},
            "qty": {"$sum": "$qty_remaining"},
            "value": {"$sum": {"$multiply": ["$qty_remaining", "$rate"]}}
        }}
    ]
    rows = await stock_layers.aggregate(pipeline).to_list(length=None)
    data = []
    total_value = 0.0
    for r in rows:
        item_id = r["_id"]["item_id"]
        wh_id = r["_id"]["warehouse_id"]
        qty = float(r.get("qty", 0))
        value = float(r.get("value", 0))
        data.append({"item_id": item_id, "warehouse_id": wh_id, "qty": qty, "value": value})
        total_value += value
    return {"rows": data, "total_value": total_value}


@router.get("/reorder/report")
async def reorder_report():
    # Items with stock below reorder_level
    items = await items_collection.find({}).to_list(length=None)
    results = []
    for it in items:
        item_id = it.get("id") or str(it.get("_id"))
        reorder_level = float(it.get("reorder_level", 0) or 0)
        if reorder_level <= 0:
            continue
        # Sum across warehouses
        agg = [
            {"$match": {"item_id": item_id}},
            {"$group": {"_id": None, "qty": {"$sum": "$qty_remaining"}}}
        ]
        res = await stock_layers.aggregate(agg).to_list(1)
        qty = float(res[0]["qty"]) if res else 0.0
        if qty < reorder_level:
            results.append({
                "item_id": item_id,
                "item_name": it.get("name"),
                "sku": it.get("item_code") or it.get("sku"),
                "current_qty": qty,
                "reorder_level": reorder_level,
                "reorder_qty": float(it.get("reorder_qty", 0) or 0)
            })
    return {"rows": results}


# Create Stock Entry (Receipt/Issue/Transfer)
@router.post("/entries")
async def create_stock_entry(body: Dict[str, Any]):
    entry_type = (body or {}).get("type")
    date = (body or {}).get("date") or now_utc().isoformat()
    lines: List[Dict[str, Any]] = (body or {}).get("lines") or []
    if entry_type not in ("receipt", "issue", "transfer"):
        raise HTTPException(status_code=400, detail="Invalid type. Use receipt/issue/transfer")
    if not lines:
        raise HTTPException(status_code=400, detail="lines are required")

    # Load settings
    settings = await get_settings()
    allow_negative = bool(settings.get("allow_negative_stock", False))

    # Create entry document
    entry_id = str(uuid.uuid4())
    entry_doc = {
        "id": entry_id,
        "type": entry_type,
        "date": date,
        "lines": lines,
        "created_at": now_utc(),
    }
    await stock_entries.insert_one(entry_doc)

    # Process lines
    for ln in lines:
        item_id = ln.get("item_id")
        if not item_id:
            raise HTTPException(status_code=400, detail="item_id required on each line")
        qty = float(ln.get("qty", 0))
        if qty <= 0:
            raise HTTPException(status_code=400, detail="qty must be > 0")
        rate = float(ln.get("rate", 0) or 0)
        batch_id = ln.get("batch_id")
        serial_numbers = ln.get("serial_numbers", [])

        if entry_type == "receipt":
            warehouse_id = ln.get("warehouse_id")
            if not warehouse_id:
                raise HTTPException(status_code=400, detail="warehouse_id required for receipt")
            # Add layer
            layer = {
                "id": str(uuid.uuid4()),
                "item_id": item_id,
                "warehouse_id": warehouse_id,
                "qty_remaining": qty,
                "rate": rate,
                "batch_id": batch_id,
                "serial_numbers": serial_numbers,
                "created_at": now_utc(),
            }
            await stock_layers.insert_one(layer)
            # Ledger in
            await stock_ledger.insert_one({
                "item_id": item_id,
                "warehouse_id": warehouse_id,
                "qty": qty,
                "rate": rate,
                "value": qty * rate,
                "voucher_type": "Stock Entry",
                "voucher_id": entry_id,
                "timestamp": now_utc(),
                "direction": "+"
            })
        elif entry_type == "issue":
            warehouse_id = ln.get("warehouse_id")
            if not warehouse_id:
                raise HTTPException(status_code=400, detail="warehouse_id required for issue")
            # Validate negative
            if not allow_negative:
                available = await get_item_wh_qty(item_id, warehouse_id)
                if available - qty < -1e-9:
                    raise HTTPException(status_code=400, detail="Negative stock not allowed for this item/warehouse")
            # Consume layers FIFO
            consumptions = await fifo_consume(item_id, warehouse_id, qty)
            for c in consumptions:
                await stock_ledger.insert_one({
                    "item_id": item_id,
                    "warehouse_id": warehouse_id,
                    "qty": -c["qty"],
                    "rate": c["rate"],
                    "value": -c["qty"] * c["rate"],
                    "voucher_type": "Stock Entry",
                    "voucher_id": entry_id,
                    "timestamp": now_utc(),
                    "direction": "-"
                })
        else:  # transfer
            source_wh = ln.get("source_warehouse_id")
            target_wh = ln.get("target_warehouse_id")
            if not source_wh or not target_wh:
                raise HTTPException(status_code=400, detail="source_warehouse_id and target_warehouse_id required for transfer")
            if not allow_negative:
                available = await get_item_wh_qty(item_id, source_wh)
                if available - qty < -1e-9:
                    raise HTTPException(status_code=400, detail="Negative stock not allowed for this item/warehouse")
            # Consume from source
            consumptions = await fifo_consume(item_id, source_wh, qty)
            # For each consumed chunk, create target layer and ledger in/out
            for c in consumptions:
                # Ledger out from source
                await stock_ledger.insert_one({
                    "item_id": item_id,
                    "warehouse_id": source_wh,
                    "qty": -c["qty"],
                    "rate": c["rate"],
                    "value": -c["qty"] * c["rate"],
                    "voucher_type": "Stock Entry",
                    "voucher_id": entry_id,
                    "timestamp": now_utc(),
                    "direction": "-"
                })
                # Add layer to target at same rate
                new_layer = {
                    "id": str(uuid.uuid4()),
                    "item_id": item_id,
                    "warehouse_id": target_wh,
                    "qty_remaining": c["qty"],
                    "rate": c["rate"],
                    "batch_id": batch_id,
                    "serial_numbers": serial_numbers,
                    "created_at": now_utc(),
                }
                await stock_layers.insert_one(new_layer)
                # Ledger in to target
                await stock_ledger.insert_one({
                    "item_id": item_id,
                    "warehouse_id": target_wh,
                    "qty": c["qty"],
                    "rate": c["rate"],
                    "value": c["qty"] * c["rate"],
                    "voucher_type": "Stock Entry",
                    "voucher_id": entry_id,
                    "timestamp": now_utc(),
                    "direction": "+"
                })

    return {"success": True, "entry_id": entry_id}