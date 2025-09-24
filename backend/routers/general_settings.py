from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime, timezone
from database import db

router = APIRouter(prefix="/api/settings", tags=["settings"])

settings_coll = db.general_settings


def now_utc():
    return datetime.now(timezone.utc)


DEFAULTS: Dict[str, Any] = {
    "id": "general_settings",
    "tax_country": "IN",
    "gst_enabled": True,
    "default_gst_percent": 18,
    "enable_variants": True,
    "uoms": ["NOS", "PCS", "PCK", "KG", "G", "L", "ML"],
    "payment_terms": ["Net 0", "Net 15", "Net 30", "Net 45"],
    "stock": {
        "valuation_method": "FIFO",
        "allow_negative_stock": False,
        "enable_batches": True,
        "enable_serials": True,
    },
    "created_at": now_utc(),
    "updated_at": now_utc(),
}


async def get_or_create() -> Dict[str, Any]:
    doc = await settings_coll.find_one({"id": "general_settings"})
    if not doc:
        await settings_coll.insert_one(DEFAULTS.copy())
        doc = await settings_coll.find_one({"id": "general_settings"})
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


@router.get("/general")
async def get_general_settings():
    return await get_or_create()


@router.put("/general")
async def update_general_settings(payload: Dict[str, Any]):
    doc = await get_or_create()
    # only allow specific fields
    allowed_top = ["tax_country", "gst_enabled", "default_gst_percent", "enable_variants", "uoms", "payment_terms", "stock"]
    update: Dict[str, Any] = {}
    for k in allowed_top:
        if k in payload:
            update[k] = payload[k]
    if not update:
        return doc
    update["updated_at"] = now_utc()
    await settings_coll.update_one({"id": "general_settings"}, {"$set": update})
    doc.update(update)
    return doc