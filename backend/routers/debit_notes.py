from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from database import db
from validators import (
    validate_required_fields, validate_items, validate_amounts,
    validate_status_transition, validate_transaction_update, validate_transaction_delete,
    DEBIT_NOTE_STATUS_TRANSITIONS
)

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


async def create_debit_note_accounting_entries(debit_note: Dict[str, Any]):
    """Create reversal journal entry and adjust linked invoice if applicable"""
    from database import (
        journal_entries_collection, payments_collection, accounts_collection,
        purchase_invoices_collection, payment_allocations_collection
    )
    from cn_dn_enhanced_helpers import adjust_invoice_for_debit_note
    
    payables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
    purchase_return_account = await accounts_collection.find_one({"account_name": {"$regex": "Purchase Return|Returns Outward", "$options": "i"}})
    tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Tax", "$options": "i"}})
    
    if not payables_account or not purchase_return_account:
        return
    
    total_amt = debit_note.get("total_amount", 0)
    tax_amt = debit_note.get("tax_amount", 0)
    purchase_amt = total_amt - tax_amt
    
    # Create standard reversal journal entry
    je_accounts = [
        {
            "account_id": payables_account["id"],
            "account_name": payables_account["account_name"],
            "debit_amount": total_amt,
            "credit_amount": 0,
            "description": f"Debit Note {debit_note.get('debit_note_number', '')}"
        },
        {
            "account_id": purchase_return_account["id"],
            "account_name": purchase_return_account["account_name"],
            "debit_amount": 0,
            "credit_amount": purchase_amt,
            "description": f"Purchase return for DN {debit_note.get('debit_note_number', '')}"
        }
    ]
    
    if tax_account and tax_amt > 0:
        je_accounts.append({
            "account_id": tax_account["id"],
            "account_name": tax_account["account_name"],
            "debit_amount": 0,
            "credit_amount": tax_amt,
            "description": f"Tax reversal for DN {debit_note.get('debit_note_number', '')}"
        })
    
    je_id = str(uuid.uuid4())
    journal_entry = {
        "id": je_id,
        "entry_number": f"JE-DN-{debit_note.get('debit_note_number', '')}",
        "posting_date": debit_note.get("debit_note_date"),
        "reference": debit_note.get("debit_note_number", ""),
        "description": f"Debit Note for {debit_note.get('supplier_name', '')} - {debit_note.get('reason', '')}",
        "voucher_type": "Debit Note",
        "voucher_id": debit_note.get("id"),
        "accounts": je_accounts,
        "total_debit": total_amt,
        "total_credit": total_amt,
        "status": "posted",
        "is_auto_generated": True,
        "company_id": debit_note.get("company_id", "default_company"),
        "created_at": now_utc(),
        "updated_at": now_utc()
    }
    await journal_entries_collection.insert_one(journal_entry)
    
    # If linked to invoice, adjust invoice balance and handle refund workflow
    adjustment_je_id, refund_id = await adjust_invoice_for_debit_note(
        debit_note,
        purchase_invoices_collection,
        payment_allocations_collection,
        payments_collection,
        journal_entries_collection,
        accounts_collection
    )
    
    # Update debit note with audit trail
    audit_update = {
        "standard_journal_entry_id": je_id,
        "updated_at": now_utc()
    }
    
    if adjustment_je_id:
        audit_update["invoice_adjustment_je_id"] = adjustment_je_id
        audit_update["invoice_adjusted"] = True
    
    if refund_id:
        audit_update["refund_payment_id"] = refund_id
        audit_update["refund_issued"] = True
    
    await debit_notes_collection.update_one(
        {"id": debit_note.get("id")},
        {"$set": audit_update}
    )
    
    return je_id


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
    """Create new debit note with validation and linking"""
    # Validate and link to original purchase invoice if provided
    reference_invoice_id = body.get("reference_invoice_id")
    reference_invoice_number = body.get("reference_invoice")
    
    # If invoice is selected, auto-populate supplier details
    if reference_invoice_id:
        from database import purchase_invoices_collection
        original_invoice = await purchase_invoices_collection.find_one({"id": reference_invoice_id})
        if not original_invoice:
            raise HTTPException(status_code=404, detail="Referenced purchase invoice not found")
        
        # Auto-fill supplier details from invoice
        body.setdefault("supplier_id", original_invoice.get("supplier_id"))
        body.setdefault("supplier_name", original_invoice.get("supplier_name"))
        body.setdefault("supplier_email", original_invoice.get("supplier_email"))
        body.setdefault("supplier_phone", original_invoice.get("supplier_phone"))
        body.setdefault("supplier_address", original_invoice.get("supplier_address"))
        
        # Auto-fill reference number if not provided
        if not reference_invoice_number:
            reference_invoice_number = original_invoice.get("invoice_number")
            body["reference_invoice"] = reference_invoice_number
    
    # Validate required fields (supplier_name required even if not linked to invoice)
    validate_required_fields(
        body,
        ["supplier_name", "items"],
        "Debit Note"
    )
    
    # Validate items using centralized validator
    validate_items(body.get("items", []), "Debit Note")
    
    # Get items from body
    items = body.get("items", [])
    
    # Calculate totals
    subtotal = sum(float(item.get("amount", 0)) for item in items)
    discount_amount = float(body.get("discount_amount", 0))
    tax_rate = float(body.get("tax_rate", 18))
    
    discounted_total = subtotal - discount_amount
    tax_amount = (discounted_total * tax_rate) / 100
    total_amount = discounted_total + tax_amount
    
    doc = {
        "id": str(uuid.uuid4()),
        "debit_note_number": generate_debit_note_number(),
        "supplier_id": body.get("supplier_id"),
        "supplier_name": body.get("supplier_name"),
        "supplier_email": body.get("supplier_email"),
        "supplier_phone": body.get("supplier_phone"),
        "supplier_address": body.get("supplier_address"),
        
        "debit_note_date": body.get("debit_note_date"),
        "reference_invoice_id": reference_invoice_id,
        "reference_invoice": reference_invoice_number,
        "reason": body.get("reason", "Return"),
        
        "items": items,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        
        "status": body.get("status", "draft").lower(),
        "notes": body.get("notes"),
        "company_id": body.get("company_id", "default_company"),
        
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    
    # Validate amounts after calculation
    validate_amounts(doc, "Debit Note")
    
    await debit_notes_collection.insert_one(doc)
    
    # If created directly as submitted, create accounting entries
    if doc["status"] == "submitted":
        await create_debit_note_accounting_entries(doc)
        return {"success": True, "message": "Debit Note created and accounting entries generated", "debit_note": sanitize(doc)}
    
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
    # Get existing debit note
    existing = await debit_notes_collection.find_one({"id": debit_note_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Debit note not found")
    
    # Normalize status to lowercase if provided
    if "status" in body:
        body["status"] = body["status"].lower()
    
    # Check if updating a non-draft document
    if existing.get("status") != "draft" and existing.get("status") != body.get("status"):
        if set(body.keys()) - {"status", "updated_at"}:
            validate_transaction_update(existing.get("status", "draft"), "Debit Note")
    
    # Validate status transition if status is changing
    if "status" in body and body["status"] != existing.get("status"):
        validate_status_transition(
            existing.get("status", "draft"),
            body["status"],
            DEBIT_NOTE_STATUS_TRANSITIONS,
            "Debit Note"
        )
    
    # Validate items if provided
    if "items" in body:
        validate_items(body["items"], "Debit Note")
    
    # Calculate totals if items are provided or discount/tax fields are changed
    if "items" in body or "discount_amount" in body or "tax_rate" in body:
        items = body.get("items", existing.get("items", []))
        subtotal = sum(float(item.get("amount", 0)) for item in items)
        discount_amount = float(body.get("discount_amount", existing.get("discount_amount", 0)))
        tax_rate = float(body.get("tax_rate", existing.get("tax_rate", 18)))
        
        discounted_total = subtotal - discount_amount
        tax_amount = (discounted_total * tax_rate) / 100
        total_amount = discounted_total + tax_amount
        
        body.update({
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "total_amount": total_amount
        })
        # Validate amounts after recalculation
        validate_amounts(body, "Debit Note")
    
    body["updated_at"] = now_utc()
    
    # If status changed to submitted, create accounting entries
    if body.get("status") == "submitted" and existing.get("status") != "submitted":
        # Merge with existing data for accounting
        full_doc = {**existing, **body}
        await create_debit_note_accounting_entries(full_doc)
        
        result = await debit_notes_collection.update_one(
            {"id": debit_note_id},
            {"$set": body}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Debit note not found")
        
        return {"success": True, "message": "Debit Note updated and accounting entries created"}
    
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
    # Get existing to check status
    existing = await debit_notes_collection.find_one({"id": debit_note_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Debit note not found")
    
    # Validate deletion is allowed
    validate_transaction_delete(existing.get("status", "draft"), "Debit Note")
    
    result = await debit_notes_collection.delete_one({"id": debit_note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debit note not found")
    return {"success": True}


@router.post("/debit-notes/{debit_note_id}/send")
async def send_debit_note(debit_note_id: str, body: Dict[str, Any]):
    """Send debit note via email/SMS"""
    # Get the debit note
    debit_note = await debit_notes_collection.find_one({"id": debit_note_id})
    if not debit_note:
        raise HTTPException(status_code=404, detail="Debit note not found")
    
    try:
        # Update send status
        now = now_utc()
        method = body.get("method", "email")
        attach_pdf = body.get("attach_pdf", True)
        recipient = body.get("email") or body.get("phone")
        
        if not recipient:
            raise HTTPException(status_code=400, detail="Email or phone number is required")
        
        # Import services
        from services.email_service import SendGridEmailService
        from services.sms_service import TwilioSmsService
        
        send_result = None
        
        if method == "email":
            try:
                email_service = SendGridEmailService()
                # Convert debit note to invoice format for email template
                invoice_data = {
                    "invoice_number": debit_note.get("debit_note_number"),
                    "invoice_date": debit_note.get("debit_note_date"),
                    "due_date": debit_note.get("debit_note_date"),
                    "customer_name": debit_note.get("supplier_name"),  # Use supplier as customer for template
                    "customer_email": debit_note.get("supplier_email"),
                    "customer_phone": debit_note.get("supplier_phone"),
                    "customer_address": debit_note.get("supplier_address"),
                    "items": debit_note.get("items", []),
                    "subtotal": debit_note.get("subtotal", 0),
                    "tax_rate": debit_note.get("tax_rate", 18),
                    "tax_amount": debit_note.get("tax_amount", 0),
                    "discount_amount": debit_note.get("discount_amount", 0),
                    "total_amount": debit_note.get("total_amount", 0)
                }
                
                subject = f"Debit Note {debit_note.get('debit_note_number')} from GiLi ERP"
                preface = f"Please find your debit note for {debit_note.get('reason', 'Return')}."
                
                # Generate PDF if requested (mock for now)
                pdf_bytes = None
                if attach_pdf:
                    # TODO: Implement actual PDF generation using reportlab or similar
                    pdf_bytes = None  # For now, email will be sent without PDF
                
                send_result = email_service.send_invoice(
                    to_email=recipient,
                    invoice=invoice_data,
                    pdf_bytes=pdf_bytes,
                    subject_override=subject,
                    preface=preface
                )
                
            except Exception as e:
                send_result = {"success": False, "error": str(e)}
        
        elif method == "sms":
            try:
                sms_service = TwilioSmsService()
                message = f"Debit Note {debit_note.get('debit_note_number')} for {debit_note.get('total_amount', 0)} INR has been issued for {debit_note.get('reason', 'Return')}. Contact us for details."
                send_result = sms_service.send_sms(to=recipient, body=message)
            except Exception as e:
                send_result = {"success": False, "error": str(e)}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid method. Use 'email' or 'sms'")
        
        # Use uniform send tracking service
        from services.send_tracking import create_uniform_send_update, get_uniform_send_response
        
        # Build send results in expected format
        send_results = {method: send_result} if send_result else {}
        
        # Build errors dict
        errors = {}
        if send_result and not send_result.get("success"):
            errors[method] = send_result.get("error", "Unknown error")
        
        # Determine sent_via list
        sent_via = [method] if send_result and send_result.get("success") else []
        
        update_data = create_uniform_send_update(
            send_results=send_results,
            method=method,
            recipient=recipient,
            attach_pdf=attach_pdf
        )
        
        await debit_notes_collection.update_one(
            {"id": debit_note_id}, 
            {"$set": update_data}
        )
        
        if send_result and send_result.get("success"):
            return get_uniform_send_response(
                send_results=send_results,
                sent_via=sent_via,
                errors=errors
            )
        else:
            error_msg = send_result.get("error", "Unknown error") if send_result else "Unknown error"
            raise HTTPException(status_code=500, detail=f"Failed to send debit note: {error_msg}")
        
    except HTTPException:
        raise
    except Exception as e:
        # Update failed send attempt
        await debit_notes_collection.update_one(
            {"id": debit_note_id}, 
            {"$set": {
                "last_send_attempt_at": now_utc(),
                "last_send_error": str(e),
                "updated_at": now_utc()
            }}
        )
        raise HTTPException(status_code=500, detail=f"Failed to send debit note: {str(e)}")


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