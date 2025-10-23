from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from database import db
import uuid

router = APIRouter(prefix="/api/financial/payment-allocation", tags=["payment_allocation"])

allocations_coll = db.payment_allocations
payments_coll = db.payments
# Don't hardcode collection - will be determined based on payment type
sales_invoices_coll = db.sales_invoices
purchase_invoices_coll = db.purchase_invoices


def now_utc():
    return datetime.now(timezone.utc)


@router.post("/allocate")
async def allocate_payment_to_invoices(payload: Dict[str, Any]):
    """
    Allocate a payment to one or more invoices
    Payload: {
        "payment_id": "...",
        "allocations": [
            {"invoice_id": "...", "allocated_amount": 1000.0, "notes": "..."}
        ]
    }
    """
    payment_id = payload.get("payment_id")
    allocations_list = payload.get("allocations", [])
    
    if not payment_id:
        raise HTTPException(status_code=400, detail="payment_id is required")
    
    if not allocations_list:
        raise HTTPException(status_code=400, detail="allocations list is required")
    
    # Get payment
    payment = await payments_coll.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get settings for validation
    settings_coll = db.general_settings
    settings = await settings_coll.find_one({"id": "general_settings"})
    allow_partial = settings.get("financial", {}).get("payment_allocation", {}).get("allow_partial_allocation", True) if settings else True
    
    # Calculate total allocation amount
    total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations_list)
    payment_amount = float(payment.get("amount", 0))
    
    # Check if total allocation exceeds payment amount
    if total_allocated > payment_amount:
        raise HTTPException(status_code=400, detail=f"Total allocation ({total_allocated}) exceeds payment amount ({payment_amount})")
    
    # Get existing allocations for this payment
    existing_allocations = await allocations_coll.find({"payment_id": payment_id}).to_list(length=1000)
    existing_total = sum(float(a.get("allocated_amount", 0)) for a in existing_allocations)
    
    # Check if new allocations would exceed payment amount
    if existing_total + total_allocated > payment_amount:
        raise HTTPException(status_code=400, detail=f"Total allocations ({existing_total + total_allocated}) would exceed payment amount ({payment_amount})")
    
    created_allocations = []
    
    # Determine which invoice collection to use based on payment type
    invoices_coll = sales_invoices_coll if payment.get("party_type") == "Customer" else purchase_invoices_coll
    party_field = "customer_id" if payment.get("party_type") == "Customer" else "supplier_id"
    
    for allocation in allocations_list:
        invoice_id = allocation.get("invoice_id")
        allocated_amount = float(allocation.get("allocated_amount", 0))
        notes = allocation.get("notes", "")
        
        if not invoice_id:
            continue
        
        # Verify invoice exists in the correct collection
        invoice = await invoices_coll.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
        
        # Check if invoice belongs to same party as payment
        if invoice.get(party_field) != payment.get("party_id"):
            raise HTTPException(status_code=400, detail=f"Invoice party does not match payment party")
        
        # Calculate invoice outstanding amount
        invoice_total = float(invoice.get("total_amount", 0))
        existing_invoice_allocations = await allocations_coll.find({"invoice_id": invoice_id}).to_list(length=1000)
        already_allocated = sum(float(a.get("allocated_amount", 0)) for a in existing_invoice_allocations)
        outstanding = invoice_total - already_allocated
        
        if allocated_amount > outstanding:
            raise HTTPException(status_code=400, detail=f"Allocation amount ({allocated_amount}) exceeds invoice outstanding ({outstanding})")
        
        # Create allocation
        allocation_doc = {
            "id": str(uuid.uuid4()),
            "payment_id": payment_id,
            "payment_number": payment.get("payment_number"),
            "invoice_id": invoice_id,
            "invoice_number": invoice.get("invoice_number"),
            "allocated_amount": allocated_amount,
            "allocation_date": now_utc(),
            "notes": notes,
            "status": "active",
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        
        await allocations_coll.insert_one(allocation_doc)
        allocation_doc.pop("_id", None)
        created_allocations.append(allocation_doc)
        
        # Update invoice status based on allocation
        new_allocated = already_allocated + allocated_amount
        if new_allocated >= invoice_total:
            await invoices_coll.update_one(
                {"id": invoice_id},
                {"$set": {"status": "paid", "payment_status": "Paid", "updated_at": now_utc()}}
            )
        elif new_allocated > 0:
            await invoices_coll.update_one(
                {"id": invoice_id},
                {"$set": {"status": "partially_paid", "payment_status": "Partially Paid", "updated_at": now_utc()}}
            )
    
    # Update payment's unallocated amount
    new_total_allocated = existing_total + total_allocated
    unallocated = payment_amount - new_total_allocated
    
    await payments_coll.update_one(
        {"id": payment_id},
        {"$set": {"unallocated_amount": unallocated, "updated_at": now_utc()}}
    )
    
    return {
        "success": True,
        "message": f"Payment allocated to {len(created_allocations)} invoice(s)",
        "allocations": created_allocations,
        "unallocated_amount": unallocated
    }


@router.get("/payments/{payment_id}/allocations")
async def get_payment_allocations(payment_id: str):
    """Get all allocations for a specific payment"""
    payment = await payments_coll.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    allocations = await allocations_coll.find({"payment_id": payment_id, "status": "active"}).to_list(length=1000)
    
    # Remove MongoDB _id
    for a in allocations:
        a.pop("_id", None)
    
    total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    payment_amount = float(payment.get("amount", 0))
    
    return {
        "payment_id": payment_id,
        "payment_number": payment.get("payment_number"),
        "payment_amount": payment_amount,
        "total_allocated": total_allocated,
        "unallocated_amount": payment_amount - total_allocated,
        "allocations": allocations
    }


@router.get("/invoices/{invoice_id}/payments")
async def get_invoice_payments(invoice_id: str):
    """Get all payment allocations for a specific invoice"""
    # Try to find invoice in both collections
    invoice = await sales_invoices_coll.find_one({"id": invoice_id})
    if not invoice:
        invoice = await purchase_invoices_coll.find_one({"id": invoice_id})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    allocations = await allocations_coll.find({"invoice_id": invoice_id, "status": "active"}).to_list(length=1000)
    
    # Remove MongoDB _id and enrich with payment details
    enriched_allocations = []
    for a in allocations:
        a.pop("_id", None)
        payment = await payments_coll.find_one({"id": a.get("payment_id")})
        if payment:
            a["payment_date"] = payment.get("payment_date")
            a["payment_method"] = payment.get("payment_method")
        enriched_allocations.append(a)
    
    invoice_total = float(invoice.get("total_amount", 0))
    total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    
    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice.get("invoice_number"),
        "invoice_total": invoice_total,
        "total_allocated": total_allocated,
        "outstanding_amount": invoice_total - total_allocated,
        "payment_status": invoice.get("payment_status", "Unpaid"),
        "allocations": enriched_allocations
    }


@router.delete("/allocations/{allocation_id}")
async def delete_allocation(allocation_id: str):
    """Delete/unallocate a payment allocation"""
    allocation = await allocations_coll.find_one({"id": allocation_id})
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    payment_id = allocation.get("payment_id")
    invoice_id = allocation.get("invoice_id")
    allocated_amount = float(allocation.get("allocated_amount", 0))
    
    # Mark as deleted
    await allocations_coll.update_one(
        {"id": allocation_id},
        {"$set": {"status": "deleted", "deleted_at": now_utc()}}
    )
    
    # Update payment unallocated amount
    payment = await payments_coll.find_one({"id": payment_id})
    if payment:
        current_unallocated = float(payment.get("unallocated_amount", 0))
        new_unallocated = current_unallocated + allocated_amount
        await payments_coll.update_one(
            {"id": payment_id},
            {"$set": {"unallocated_amount": new_unallocated, "updated_at": now_utc()}}
        )
    
    # Update invoice payment status - search in both collections
    invoice = await sales_invoices_coll.find_one({"id": invoice_id})
    invoices_coll_to_update = sales_invoices_coll
    if not invoice:
        invoice = await purchase_invoices_coll.find_one({"id": invoice_id})
        invoices_coll_to_update = purchase_invoices_coll
    
    if invoice:
        remaining_allocations = await allocations_coll.find({"invoice_id": invoice_id, "status": "active"}).to_list(length=1000)
        total_allocated = sum(float(a.get("allocated_amount", 0)) for a in remaining_allocations)
        invoice_total = float(invoice.get("total_amount", 0))
        
        if total_allocated == 0:
            await invoices_coll_to_update.update_one(
                {"id": invoice_id},
                {"$set": {"payment_status": "Unpaid", "updated_at": now_utc()}}
            )
        elif total_allocated < invoice_total:
            await invoices_coll_to_update.update_one(
                {"id": invoice_id},
                {"$set": {"status": "submitted", "payment_status": "Partially Paid", "updated_at": now_utc()}}
            )
    
    return {
        "success": True,
        "message": "Allocation deleted successfully"
    }


@router.put("/allocations/{allocation_id}")
async def update_allocation(allocation_id: str, payload: Dict[str, Any]):
    """Update an existing allocation amount"""
    allocation = await allocations_coll.find_one({"id": allocation_id})
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    new_amount = float(payload.get("allocated_amount", allocation.get("allocated_amount")))
    old_amount = float(allocation.get("allocated_amount", 0))
    amount_diff = new_amount - old_amount
    
    payment_id = allocation.get("payment_id")
    invoice_id = allocation.get("invoice_id")
    
    # Get payment and validate
    payment = await payments_coll.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    current_unallocated = float(payment.get("unallocated_amount", 0))
    if amount_diff > current_unallocated:
        raise HTTPException(status_code=400, detail=f"Insufficient unallocated amount. Available: {current_unallocated}")
    
    # Get invoice and validate - search in both collections
    invoice = await sales_invoices_coll.find_one({"id": invoice_id})
    invoices_coll_to_update = sales_invoices_coll
    if not invoice:
        invoice = await purchase_invoices_coll.find_one({"id": invoice_id})
        invoices_coll_to_update = purchase_invoices_coll
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice_total = float(invoice.get("total_amount", 0))
    other_allocations = await allocations_coll.find({"invoice_id": invoice_id, "id": {"$ne": allocation_id}, "status": "active"}).to_list(length=1000)
    other_allocated = sum(float(a.get("allocated_amount", 0)) for a in other_allocations)
    
    if new_amount + other_allocated > invoice_total:
        raise HTTPException(status_code=400, detail=f"Total allocation would exceed invoice total ({invoice_total})")
    
    # Update allocation
    await allocations_coll.update_one(
        {"id": allocation_id},
        {"$set": {"allocated_amount": new_amount, "updated_at": now_utc()}}
    )
    
    # Update payment unallocated amount
    new_unallocated = current_unallocated - amount_diff
    await payments_coll.update_one(
        {"id": payment_id},
        {"$set": {"unallocated_amount": new_unallocated, "updated_at": now_utc()}}
    )
    
    # Update invoice payment status using the correct collection
    total_allocated = new_amount + other_allocated
    if total_allocated >= invoice_total:
        await invoices_coll_to_update.update_one(
            {"id": invoice_id},
            {"$set": {"status": "paid", "payment_status": "Paid", "updated_at": now_utc()}}
        )
    elif total_allocated > 0:
        await invoices_coll_to_update.update_one(
            {"id": invoice_id},
            {"$set": {"payment_status": "Partially Paid", "updated_at": now_utc()}}
        )
    
    updated_allocation = await allocations_coll.find_one({"id": allocation_id})
    updated_allocation.pop("_id", None)
    
    return {
        "success": True,
        "message": "Allocation updated successfully",
        "allocation": updated_allocation
    }
