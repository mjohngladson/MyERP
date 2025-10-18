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
    "timezone": "Asia/Kolkata",
    "date_format": "DD/MM/YYYY",
    "time_format": "12",
    "stock": {
        "valuation_method": "FIFO",
        "allow_negative_stock": False,
        "enable_batches": True,
        "enable_serials": True,
    },
    "financial": {
        "base_currency": "INR",
        "accounting_standard": "Indian GAAP",
        "fiscal_year_start": "April",
        "multi_currency_enabled": False,
        "auto_exchange_rate_update": False,
        "enable_auto_journal_entries": True,
        "require_payment_approval": False,
        "enable_budget_control": False,
        "gst_categories": ["Taxable", "Exempt", "Zero Rated", "Nil Rated"],
        "gstin": "",
        "auto_create_accounts": True,
        "default_payment_terms": "Net 30",
        "bank_reconciliation": {
            "supported_statement_formats": ["CSV", "Excel"],
            "date_tolerance_days": 3,
            "amount_tolerance_percent": 0.01,
            "enable_auto_matching": True,
            "enable_notifications": True
        },
        "payment_allocation": {
            "allow_partial_allocation": True,
            "require_allocation_approval": False,
            "auto_allocate_to_oldest": True
        }
    },
    "currencies": [
        {"code": "INR", "name": "Indian Rupee", "symbol": "₹", "rate": 1.0, "is_base": True},
        {"code": "USD", "name": "US Dollar", "symbol": "$", "rate": 83.0, "is_base": False},
        {"code": "EUR", "name": "Euro", "symbol": "€", "rate": 90.0, "is_base": False},
        {"code": "GBP", "name": "British Pound", "symbol": "£", "rate": 105.0, "is_base": False}
    ],
    "accounting_standards": [
        {"code": "IN_GAAP", "name": "Indian GAAP", "country": "India"},
        {"code": "IFRS", "name": "International Financial Reporting Standards", "country": "International"},
        {"code": "US_GAAP", "name": "US Generally Accepted Accounting Principles", "country": "USA"}
    ],
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
    allowed_top = ["tax_country", "gst_enabled", "default_gst_percent", "enable_variants", "uoms", "payment_terms", "stock", "financial", "currencies", "accounting_standards"]
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