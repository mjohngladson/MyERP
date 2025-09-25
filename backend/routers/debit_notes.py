from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from database import db

router = APIRouter(prefix="/api/buying", tags=["debit-notes"])

debit_notes_collection = db.debit_notes


def now_utc():
    return datetime.now(timezone.utc)


def sanitize(doc: Dict[str, Any]):
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d


def generate_debit_note_number():
    """Generate debit note number in format DN-YYYYMMDD-XXXX"""
    now = datetime.now()
    date_str = now.strftime('%Y%m%d')
    return f"DN-{date_str}-{str(uuid.uuid4())[:4].upper()}"


@router.get("/debit-notes")
async def get_debit_notes(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get list of debit notes with filtering"""
    query = {}
    
    # Search filter
    if search:
        query["$or"] = [
            {"debit_note_number": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"reference_invoice": {"$regex": search, "$options": "i"}},
        ]
    
    # Status filter
    if status:
        query["status"] = status
    
    # Date range filter
    if from_date or to_date:
        date_query = {}
        if from_date:
            date_query["$gte"] = from_date
        if to_date:
            date_query["$lte"] = to_date
        query["debit_note_date"] = date_query
    
    cursor = debit_notes_collection.find(query).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    
    # Get total count for pagination
    total_count = await debit_notes_collection.count_documents(query)
    
    result = [sanitize(row) for row in rows]
    if result:
        result[0]["_meta"] = {"total_count": total_count}
    
    return result


@router.post("/debit-notes")
async def create_debit_note(body: Dict[str, Any]):
    """Create new debit note"""
    if not body or not body.get("supplier_name"):
        raise HTTPException(status_code=400, detail="supplier_name is required")
    
    # Calculate totals
    items = body.get("items", [])
    subtotal = sum(float(item.get("amount", 0)) for item in items)
    discount_amount = float(body.get("discount_amount", 0))
    tax_rate = float(body.get("tax_rate", 18))
    
    discounted_total = subtotal - discount_amount
    tax_amount = (discounted_total * tax_rate) / 100
    total_amount = discounted_total + tax_amount
    
    doc = {
        "id": str(uuid.uuid4()),
        "debit_note_number": generate_debit_note_number(),
        "supplier_name": body.get("supplier_name"),
        "supplier_email": body.get("supplier_email"),
        "supplier_phone": body.get("supplier_phone"),
        "supplier_address": body.get("supplier_address"),
        
        "debit_note_date": body.get("debit_note_date"),
        "reference_invoice": body.get("reference_invoice"),  # Original purchase invoice number
        "reason": body.get("reason", "Return"),  # Return, Quality Issue, Price Difference
        
        "items": items,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        
        "status": body.get("status", "Draft"),  # Draft, Issued, Accepted
        "notes": body.get("notes"),
        
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    
    await debit_notes_collection.insert_one(doc)
    return {"success": True, "debit_note": sanitize(doc)}


@router.get("/debit-notes/{debit_note_id}")
async def get_debit_note(debit_note_id: str):
    """Get single debit note by ID"""
    doc = await debit_notes_collection.find_one({"id": debit_note_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Debit note not found")
    return sanitize(doc)


@router.put("/debit-notes/{debit_note_id}")
async def update_debit_note(debit_note_id: str, body: Dict[str, Any]):
    """Update debit note"""
    # Calculate totals if items are provided
    if "items" in body:
        items = body.get("items", [])
        subtotal = sum(float(item.get("amount", 0)) for item in items)
        discount_amount = float(body.get("discount_amount", 0))
        tax_rate = float(body.get("tax_rate", 18))
        
        discounted_total = subtotal - discount_amount
        tax_amount = (discounted_total * tax_rate) / 100
        total_amount = discounted_total + tax_amount
        
        body.update({
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": total_amount
        })
    
    body["updated_at"] = now_utc()
    
    result = await debit_notes_collection.update_one(
        {"id": debit_note_id},
        {"$set": body}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Debit note not found")
    
    doc = await debit_notes_collection.find_one({"id": debit_note_id})
    return sanitize(doc)


@router.delete("/debit-notes/{debit_note_id}")
async def delete_debit_note(debit_note_id: str):
    """Delete debit note"""
    result = await debit_notes_collection.delete_one({"id": debit_note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debit note not found")
    return {"success": True}


@router.get("/debit-notes/stats/overview")
async def get_debit_notes_stats(
    search: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get debit notes statistics for dashboard - honors same filters as list"""
    query = {}
    
    # Apply same filters as list endpoint
    if search:
        query["$or"] = [
            {"debit_note_number": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"reference_invoice": {"$regex": search, "$options": "i"}},
        ]
    
    if status:
        query["status"] = status
    
    if from_date or to_date:
        date_query = {}
        if from_date:
            date_query["$gte"] = from_date
        if to_date:
            date_query["$lte"] = to_date
        query["debit_note_date"] = date_query
    
    pipeline = [
        {"$match": query} if query else {"$match": {}},
        {
            "$group": {
                "_id": None,
                "total_notes": {"$sum": 1},
                "total_amount": {"$sum": "$total_amount"},
                "draft_count": {
                    "$sum": {"$cond": [{"$eq": ["$status", "Draft"]}, 1, 0]}
                },
                "issued_count": {
                    "$sum": {"$cond": [{"$eq": ["$status", "Issued"]}, 1, 0]}
                },
                "accepted_count": {
                    "$sum": {"$cond": [{"$eq": ["$status", "Accepted"]}, 1, 0]}
                }
            }
        }
    ]
    
    result = await debit_notes_collection.aggregate(pipeline).to_list(length=1)
    
    if result:
        stats = result[0]
        return {
            "total_notes": stats.get("total_notes", 0),
            "total_amount": float(stats.get("total_amount", 0)),
            "draft_count": stats.get("draft_count", 0),
            "issued_count": stats.get("issued_count", 0),
            "accepted_count": stats.get("accepted_count", 0)
        }
    
    return {
        "total_notes": 0,
        "total_amount": 0.0,
        "draft_count": 0,
        "issued_count": 0,
        "accepted_count": 0
    }