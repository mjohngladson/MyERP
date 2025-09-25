from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from database import db

router = APIRouter(prefix="/api/sales", tags=["credit-notes"])

credit_notes_collection = db.credit_notes


def now_utc():
    return datetime.now(timezone.utc)


def sanitize(doc: Dict[str, Any]):
    if not doc:
        return doc
    d = dict(doc)
    d.pop("_id", None)
    return d


def generate_credit_note_number():
    """Generate credit note number in format CN-YYYYMMDD-XXXX"""
    now = datetime.now()
    date_str = now.strftime('%Y%m%d')
    return f"CN-{date_str}-{str(uuid.uuid4())[:4].upper()}"


@router.get("/credit-notes")
async def get_credit_notes(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get list of credit notes with filtering"""
    query = {}
    
    # Search filter
    if search:
        query["$or"] = [
            {"credit_note_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
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
        query["credit_note_date"] = date_query
    
    cursor = credit_notes_collection.find(query).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    
    # Get total count for pagination
    total_count = await credit_notes_collection.count_documents(query)
    
    result = [sanitize(row) for row in rows]
    if result:
        result[0]["_meta"] = {"total_count": total_count}
    
    return result


@router.post("/credit-notes")
async def create_credit_note(body: Dict[str, Any]):
    """Create new credit note"""
    if not body or not body.get("customer_name"):
        raise HTTPException(status_code=400, detail="customer_name is required")
    
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
        "credit_note_number": generate_credit_note_number(),
        "customer_name": body.get("customer_name"),
        "customer_email": body.get("customer_email"),
        "customer_phone": body.get("customer_phone"),
        "customer_address": body.get("customer_address"),
        
        "credit_note_date": body.get("credit_note_date"),
        "reference_invoice": body.get("reference_invoice"),  # Original invoice number
        "reason": body.get("reason", "Return"),  # Return, Allowance, Correction
        
        "items": items,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        
        "status": body.get("status", "Draft"),  # Draft, Issued, Applied
        "notes": body.get("notes"),
        
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    
    await credit_notes_collection.insert_one(doc)
    return {"success": True, "credit_note": sanitize(doc)}


@router.get("/credit-notes/{credit_note_id}")
async def get_credit_note(credit_note_id: str):
    """Get single credit note by ID"""
    doc = await credit_notes_collection.find_one({"id": credit_note_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Credit note not found")
    return sanitize(doc)


@router.put("/credit-notes/{credit_note_id}")
async def update_credit_note(credit_note_id: str, body: Dict[str, Any]):
    """Update credit note"""
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
    
    result = await credit_notes_collection.update_one(
        {"id": credit_note_id},
        {"$set": body}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Credit note not found")
    
    doc = await credit_notes_collection.find_one({"id": credit_note_id})
    return sanitize(doc)


@router.delete("/credit-notes/{credit_note_id}")
async def delete_credit_note(credit_note_id: str):
    """Delete credit note"""
    result = await credit_notes_collection.delete_one({"id": credit_note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit note not found")
    return {"success": True}


@router.post("/credit-notes/{credit_note_id}/send")
async def send_credit_note(credit_note_id: str, body: Dict[str, Any]):
    """Send credit note via email/SMS"""
    # Get the credit note
    credit_note = await credit_notes_collection.find_one({"id": credit_note_id})
    if not credit_note:
        raise HTTPException(status_code=404, detail="Credit note not found")
    
    try:
        # Update send status
        now = now_utc()
        method = body.get("method", "email")
        attach_pdf = body.get("attach_pdf", True)
        
        update_data = {
            "last_sent_at": now,
            "last_send_attempt_at": now,
            "sent_to": body.get("email") or body.get("phone"),
            "send_method": method,
            "pdf_attached": attach_pdf if method == "email" else False,
            "updated_at": now
        }
        
        await credit_notes_collection.update_one(
            {"id": credit_note_id}, 
            {"$set": update_data}
        )
        
        # Note: SMS and Email are currently mocked for demo purposes
        # In production, this would integrate with SendGrid for email and Twilio for SMS
        send_message = f"Credit note sent via {method}"
        if method == "email" and attach_pdf:
            send_message += " with PDF attachment"
        elif method == "sms":
            send_message += " (Demo mode - SMS not actually sent)"
        
        return {
            "success": True,
            "message": send_message,
            "sent_at": now.isoformat(),
            "method": method,
            "pdf_attached": attach_pdf if method == "email" else False
        }
        
    except Exception as e:
        # Update failed send attempt
        await credit_notes_collection.update_one(
            {"id": credit_note_id}, 
            {"$set": {
                "last_send_attempt_at": now_utc(),
                "last_send_error": str(e),
                "updated_at": now_utc()
            }}
        )
        raise HTTPException(status_code=500, detail=f"Failed to send credit note: {str(e)}")


@router.get("/credit-notes/stats/overview")
async def get_credit_notes_stats(
    search: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get credit notes statistics for dashboard - honors same filters as list"""
    query = {}
    
    # Apply same filters as list endpoint
    if search:
        query["$or"] = [
            {"credit_note_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
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
        query["credit_note_date"] = date_query
    
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
                "applied_count": {
                    "$sum": {"$cond": [{"$eq": ["$status", "Applied"]}, 1, 0]}
                }
            }
        }
    ]
    
    result = await credit_notes_collection.aggregate(pipeline).to_list(length=1)
    
    if result:
        stats = result[0]
        return {
            "total_notes": stats.get("total_notes", 0),
            "total_amount": float(stats.get("total_amount", 0)),
            "draft_count": stats.get("draft_count", 0),
            "issued_count": stats.get("issued_count", 0),
            "applied_count": stats.get("applied_count", 0)
        }
    
    return {
        "total_notes": 0,
        "total_amount": 0.0,
        "draft_count": 0,
        "issued_count": 0,
        "applied_count": 0
    }