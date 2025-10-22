"""
Enhanced Credit Note and Debit Note Helpers
Handles invoice balance adjustments, AR/AP adjustments, and refund workflows

Features:
- Validates CN/DN amount against remaining available credit
- Tracks cumulative CN/DN amounts per invoice
- Automatically reverses excess payment allocations
- Prevents over-crediting invoices
"""
from datetime import datetime, timezone
import uuid
from typing import Dict, Optional, Tuple
from fastapi import HTTPException


def now_utc():
    return datetime.now(timezone.utc)


async def adjust_invoice_for_credit_note(
    credit_note: Dict,
    sales_invoices_coll,
    payment_allocations_coll,
    payments_coll,
    journal_entries_coll,
    accounts_coll
) -> Tuple[Optional[str], Optional[str]]:
    """
    Adjust linked sales invoice when credit note is issued
    
    Validations:
    - Checks cumulative CN amount doesn't exceed original invoice total
    - Prevents over-crediting
    
    Actions:
    - Tracks CN in invoice's credit_notes array
    - Updates total_credit_notes_amount
    - Reverses excess payment allocations if needed
    - Creates refund or adjustment journal entries
    
    Returns: (adjustment_journal_entry_id, refund_entry_id)
    Raises: HTTPException if validation fails
    """
    reference_invoice_id = credit_note.get("reference_invoice_id")
    if not reference_invoice_id:
        return None, None
    
    # Get the linked invoice
    invoice = await sales_invoices_coll.find_one({"id": reference_invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Referenced invoice not found")
    
    cn_amount = float(credit_note.get("total_amount", 0))
    original_invoice_total = float(invoice.get("original_total_amount", invoice.get("total_amount", 0)))
    current_invoice_total = float(invoice.get("total_amount", 0))
    
    # VALIDATION 1: Check cumulative CN amount
    existing_cn_amount = float(invoice.get("total_credit_notes_amount", 0))
    total_cn_after_this = existing_cn_amount + cn_amount
    
    if total_cn_after_this > original_invoice_total:
        available_for_cn = original_invoice_total - existing_cn_amount
        raise HTTPException(
            status_code=400,
            detail=f"Credit Note amount (₹{cn_amount}) exceeds available balance. "
                   f"Invoice original total: ₹{original_invoice_total}, "
                   f"Already credited: ₹{existing_cn_amount}, "
                   f"Available for credit: ₹{available_for_cn}"
        )
    
    # Get payment allocations for this invoice
    allocations = await payment_allocations_coll.find({
        "invoice_id": reference_invoice_id,
        "status": "active"
    }).to_list(length=1000)
    
    total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    new_invoice_total = current_invoice_total - cn_amount
    
    adjustment_je_id = None
    refund_entry_id = None
    reversed_allocations = []
    
    # STEP 1: Handle payment allocation reversal if needed
    if total_allocated > new_invoice_total:
        # Need to reverse excess allocations
        excess_allocation = total_allocated - new_invoice_total
        remaining_to_reverse = excess_allocation
        
        # Reverse allocations (LIFO - most recent first)
        sorted_allocations = sorted(allocations, key=lambda x: x.get("created_at", ""), reverse=True)
        
        for allocation in sorted_allocations:
            if remaining_to_reverse <= 0:
                break
            
            alloc_amount = float(allocation.get("allocated_amount", 0))
            amount_to_reverse = min(alloc_amount, remaining_to_reverse)
            
            # Update or delete allocation
            if amount_to_reverse >= alloc_amount:
                # Delete entire allocation
                await payment_allocations_coll.delete_one({"id": allocation["id"]})
            else:
                # Reduce allocation amount
                new_alloc_amount = alloc_amount - amount_to_reverse
                await payment_allocations_coll.update_one(
                    {"id": allocation["id"]},
                    {"$set": {
                        "allocated_amount": new_alloc_amount,
                        "updated_at": now_utc()
                    }}
                )
            
            # Update payment's unallocated amount
            payment = await payments_coll.find_one({"id": allocation["payment_id"]})
            if payment:
                new_unallocated = float(payment.get("unallocated_amount", 0)) + amount_to_reverse
                await payments_coll.update_one(
                    {"id": allocation["payment_id"]},
                    {"$set": {
                        "unallocated_amount": new_unallocated,
                        "updated_at": now_utc()
                    }}
                )
            
            reversed_allocations.append({
                "allocation_id": allocation["id"],
                "payment_id": allocation["payment_id"],
                "amount_reversed": amount_to_reverse
            })
            
            remaining_to_reverse -= amount_to_reverse
        
        # Recalculate total allocated after reversals
        allocations = await payment_allocations_coll.find({
            "invoice_id": reference_invoice_id,
            "status": "active"
        }).to_list(length=1000)
        total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    
    # STEP 2: Determine scenario (fully paid vs partially paid)
    invoice_outstanding = new_invoice_total - total_allocated
    
    # Scenario 1: Invoice fully paid (or over-paid) - Issue refund
    if total_allocated >= new_invoice_total:
        # Create refund payment entry
        refund_entry_id = str(uuid.uuid4())
        refund_payment = {
            "id": refund_entry_id,
            "payment_number": f"REF-{credit_note.get('credit_note_number', '')}",
            "payment_type": "Pay",  # Refund is outgoing payment
            "party_type": "Customer",
            "party_id": credit_note.get("customer_id"),
            "party_name": credit_note.get("customer_name"),
            "payment_date": credit_note.get("credit_note_date") or now_utc(),
            "amount": min(cn_amount, original_invoice_total),  # Refund up to invoice amount
            "payment_method": "Bank Transfer",
            "reference_number": f"CN-{credit_note.get('credit_note_number')}",
            "currency": "INR",
            "exchange_rate": 1.0,
            "base_amount": min(cn_amount, original_invoice_total),
            "status": "draft",  # Draft until processed
            "description": f"Refund for Credit Note {credit_note.get('credit_note_number')}",
            "unallocated_amount": 0.0,
            "company_id": credit_note.get("company_id", "default_company"),
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        await payments_coll.insert_one(refund_payment)
        
        # Create journal entry for refund
        cash_account = await accounts_coll.find_one({"account_name": {"$regex": "Cash|Bank", "$options": "i"}})
        ar_account = await accounts_coll.find_one({"account_name": {"$regex": "Accounts Receivable", "$options": "i"}})
        
        if cash_account and ar_account:
            adjustment_je_id = str(uuid.uuid4())
            refund_je = {
                "id": adjustment_je_id,
                "entry_number": f"JE-REF-{credit_note.get('credit_note_number', '')}",
                "posting_date": credit_note.get("credit_note_date") or now_utc(),
                "reference": credit_note.get("credit_note_number", ""),
                "description": f"Refund for Credit Note {credit_note.get('credit_note_number')} against Invoice {invoice.get('invoice_number')}",
                "voucher_type": "Refund",
                "voucher_id": credit_note.get("id"),
                "accounts": [
                    {
                        "account_id": ar_account["id"],
                        "account_name": ar_account["account_name"],
                        "debit_amount": min(cn_amount, invoice_total),
                        "credit_amount": 0,
                        "description": "Reduce A/R for refund"
                    },
                    {
                        "account_id": cash_account["id"],
                        "account_name": cash_account["account_name"],
                        "debit_amount": 0,
                        "credit_amount": min(cn_amount, invoice_total),
                        "description": "Cash refund to customer"
                    }
                ],
                "total_debit": min(cn_amount, invoice_total),
                "total_credit": min(cn_amount, invoice_total),
                "status": "posted",
                "is_auto_generated": True,
                "company_id": credit_note.get("company_id", "default_company"),
                "created_at": now_utc(),
                "updated_at": now_utc()
            }
            await journal_entries_coll.insert_one(refund_je)
    
    # Scenario 2: Invoice partially/not paid - Reduce outstanding
    else:
        # Reduce invoice total amount
        new_invoice_total = max(0, current_invoice_total - cn_amount)
        
        # STEP 3: Update invoice with cumulative tracking
        existing_credit_notes = invoice.get("credit_notes", [])
        existing_credit_notes.append(credit_note.get("id"))
        
        update_data = {
            "total_amount": new_invoice_total,
            "original_total_amount": original_invoice_total,  # Preserve original
            "total_credit_notes_amount": total_cn_after_this,
            "credit_notes": existing_credit_notes,
            "updated_at": now_utc(),
            "credit_note_applied": True,
            "last_credit_note_id": credit_note.get("id"),
            "last_credit_note_amount": cn_amount
        }
        
        # Add reversal tracking if any allocations were reversed
        if reversed_allocations:
            update_data["payment_allocations_reversed"] = True
            update_data["reversed_allocations_count"] = len(reversed_allocations)
            update_data["total_amount_reversed"] = sum(r["amount_reversed"] for r in reversed_allocations)
        
        # Recalculate payment status
        if total_allocated >= new_invoice_total and new_invoice_total > 0:
            update_data["payment_status"] = "Paid"
            update_data["status"] = "paid"
        elif total_allocated > 0:
            update_data["payment_status"] = "Partially Paid"
        else:
            update_data["payment_status"] = "Unpaid"
        
        await sales_invoices_coll.update_one(
            {"id": reference_invoice_id},
            {"$set": update_data}
        )
        
        # Create adjustment JE to reduce AR
        ar_account = await accounts_coll.find_one({"account_name": {"$regex": "Accounts Receivable", "$options": "i"}})
        sales_return_account = await accounts_coll.find_one({"account_name": {"$regex": "Sales Return", "$options": "i"}})
        
        if ar_account and sales_return_account:
            adjustment_je_id = str(uuid.uuid4())
            adjustment_je = {
                "id": adjustment_je_id,
                "entry_number": f"JE-ADJ-{credit_note.get('credit_note_number', '')}",
                "posting_date": credit_note.get("credit_note_date") or now_utc(),
                "reference": f"{credit_note.get('credit_note_number', '')} for {invoice.get('invoice_number')}",
                "description": f"Invoice balance adjustment for Credit Note {credit_note.get('credit_note_number')}",
                "voucher_type": "Credit Note Adjustment",
                "voucher_id": credit_note.get("id"),
                "accounts": [
                    {
                        "account_id": sales_return_account["id"],
                        "account_name": sales_return_account["account_name"],
                        "debit_amount": cn_amount,
                        "credit_amount": 0,
                        "description": f"Sales return for CN {credit_note.get('credit_note_number')}"
                    },
                    {
                        "account_id": ar_account["id"],
                        "account_name": ar_account["account_name"],
                        "debit_amount": 0,
                        "credit_amount": cn_amount,
                        "description": f"Reduce A/R for invoice {invoice.get('invoice_number')}"
                    }
                ],
                "total_debit": cn_amount,
                "total_credit": cn_amount,
                "status": "posted",
                "is_auto_generated": True,
                "company_id": credit_note.get("company_id", "default_company"),
                "created_at": now_utc(),
                "updated_at": now_utc()
            }
            await journal_entries_coll.insert_one(adjustment_je)
    
    return adjustment_je_id, refund_entry_id


async def adjust_invoice_for_debit_note(
    debit_note: Dict,
    purchase_invoices_coll,
    payment_allocations_coll,
    payments_coll,
    journal_entries_coll,
    accounts_coll
) -> Tuple[Optional[str], Optional[str]]:
    """
    Adjust linked purchase invoice when debit note is issued
    
    Validations:
    - Checks cumulative DN amount doesn't exceed original invoice total
    - Prevents over-debiting
    
    Actions:
    - Tracks DN in invoice's debit_notes array
    - Updates total_debit_notes_amount
    - Reverses excess payment allocations if needed
    - Creates refund receipt or adjustment journal entries
    
    Returns: (adjustment_journal_entry_id, refund_entry_id)
    Raises: HTTPException if validation fails
    """
    reference_invoice_id = debit_note.get("reference_invoice_id")
    if not reference_invoice_id:
        return None, None
    
    # Get the linked invoice
    invoice = await purchase_invoices_coll.find_one({"id": reference_invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Referenced purchase invoice not found")
    
    dn_amount = float(debit_note.get("total_amount", 0))
    original_invoice_total = float(invoice.get("original_total_amount", invoice.get("total_amount", 0)))
    current_invoice_total = float(invoice.get("total_amount", 0))
    
    # VALIDATION 1: Check cumulative DN amount
    existing_dn_amount = float(invoice.get("total_debit_notes_amount", 0))
    total_dn_after_this = existing_dn_amount + dn_amount
    
    if total_dn_after_this > original_invoice_total:
        available_for_dn = original_invoice_total - existing_dn_amount
        raise HTTPException(
            status_code=400,
            detail=f"Debit Note amount (₹{dn_amount}) exceeds available balance. "
                   f"Invoice original total: ₹{original_invoice_total}, "
                   f"Already debited: ₹{existing_dn_amount}, "
                   f"Available for debit: ₹{available_for_dn}"
        )
    
    # Get payment allocations for this invoice
    allocations = await payment_allocations_coll.find({
        "invoice_id": reference_invoice_id,
        "status": "active"
    }).to_list(length=1000)
    
    total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    new_invoice_total = current_invoice_total - dn_amount
    
    adjustment_je_id = None
    refund_entry_id = None
    reversed_allocations = []
    
    # STEP 1: Handle payment allocation reversal if needed
    if total_allocated > new_invoice_total:
        # Need to reverse excess allocations
        excess_allocation = total_allocated - new_invoice_total
        remaining_to_reverse = excess_allocation
        
        # Reverse allocations (LIFO - most recent first)
        sorted_allocations = sorted(allocations, key=lambda x: x.get("created_at", ""), reverse=True)
        
        for allocation in sorted_allocations:
            if remaining_to_reverse <= 0:
                break
            
            alloc_amount = float(allocation.get("allocated_amount", 0))
            amount_to_reverse = min(alloc_amount, remaining_to_reverse)
            
            # Update or delete allocation
            if amount_to_reverse >= alloc_amount:
                # Delete entire allocation
                await payment_allocations_coll.delete_one({"id": allocation["id"]})
            else:
                # Reduce allocation amount
                new_alloc_amount = alloc_amount - amount_to_reverse
                await payment_allocations_coll.update_one(
                    {"id": allocation["id"]},
                    {"$set": {
                        "allocated_amount": new_alloc_amount,
                        "updated_at": now_utc()
                    }}
                )
            
            # Update payment's unallocated amount
            payment = await payments_coll.find_one({"id": allocation["payment_id"]})
            if payment:
                new_unallocated = float(payment.get("unallocated_amount", 0)) + amount_to_reverse
                await payments_coll.update_one(
                    {"id": allocation["payment_id"]},
                    {"$set": {
                        "unallocated_amount": new_unallocated,
                        "updated_at": now_utc()
                    }}
                )
            
            reversed_allocations.append({
                "allocation_id": allocation["id"],
                "payment_id": allocation["payment_id"],
                "amount_reversed": amount_to_reverse
            })
            
            remaining_to_reverse -= amount_to_reverse
        
        # Recalculate total allocated after reversals
        allocations = await payment_allocations_coll.find({
            "invoice_id": reference_invoice_id,
            "status": "active"
        }).to_list(length=1000)
        total_allocated = sum(float(a.get("allocated_amount", 0)) for a in allocations)
    
    # STEP 2: Determine scenario (fully paid vs partially paid)
    invoice_outstanding = new_invoice_total - total_allocated
    
    # Scenario 1: Invoice fully paid - Receive refund from supplier
    if total_allocated >= new_invoice_total:
        # Create refund receipt entry
        refund_entry_id = str(uuid.uuid4())
        refund_payment = {
            "id": refund_entry_id,
            "payment_number": f"REFR-{debit_note.get('debit_note_number', '')}",
            "payment_type": "Receive",  # Receiving refund from supplier
            "party_type": "Supplier",
            "party_id": debit_note.get("supplier_id"),
            "party_name": debit_note.get("supplier_name"),
            "payment_date": debit_note.get("debit_note_date") or now_utc(),
            "amount": min(dn_amount, original_invoice_total),
            "payment_method": "Bank Transfer",
            "reference_number": f"DN-{debit_note.get('debit_note_number')}",
            "currency": "INR",
            "exchange_rate": 1.0,
            "base_amount": min(dn_amount, original_invoice_total),
            "status": "draft",
            "description": f"Refund for Debit Note {debit_note.get('debit_note_number')}",
            "unallocated_amount": 0.0,
            "company_id": debit_note.get("company_id", "default_company"),
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        await payments_coll.insert_one(refund_payment)
        
        # Create journal entry for refund receipt
        cash_account = await accounts_coll.find_one({"account_name": {"$regex": "Cash|Bank", "$options": "i"}})
        ap_account = await accounts_coll.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
        
        if cash_account and ap_account:
            adjustment_je_id = str(uuid.uuid4())
            refund_je = {
                "id": adjustment_je_id,
                "entry_number": f"JE-REFR-{debit_note.get('debit_note_number', '')}",
                "posting_date": debit_note.get("debit_note_date") or now_utc(),
                "reference": debit_note.get("debit_note_number", ""),
                "description": f"Refund received for Debit Note {debit_note.get('debit_note_number')} against Invoice {invoice.get('invoice_number')}",
                "voucher_type": "Refund Receipt",
                "voucher_id": debit_note.get("id"),
                "accounts": [
                    {
                        "account_id": cash_account["id"],
                        "account_name": cash_account["account_name"],
                        "debit_amount": min(dn_amount, invoice_total),
                        "credit_amount": 0,
                        "description": "Cash refund received"
                    },
                    {
                        "account_id": ap_account["id"],
                        "account_name": ap_account["account_name"],
                        "debit_amount": 0,
                        "credit_amount": min(dn_amount, invoice_total),
                        "description": "Reduce A/P for refund"
                    }
                ],
                "total_debit": min(dn_amount, invoice_total),
                "total_credit": min(dn_amount, invoice_total),
                "status": "posted",
                "is_auto_generated": True,
                "company_id": debit_note.get("company_id", "default_company"),
                "created_at": now_utc(),
                "updated_at": now_utc()
            }
            await journal_entries_coll.insert_one(refund_je)
    
    # Scenario 2: Invoice not fully paid - Reduce outstanding
    else:
        # Reduce invoice total amount
        new_invoice_total = max(0, current_invoice_total - dn_amount)
        
        # STEP 3: Update invoice with cumulative tracking
        existing_debit_notes = invoice.get("debit_notes", [])
        existing_debit_notes.append(debit_note.get("id"))
        
        update_data = {
            "total_amount": new_invoice_total,
            "original_total_amount": original_invoice_total,  # Preserve original
            "total_debit_notes_amount": total_dn_after_this,
            "debit_notes": existing_debit_notes,
            "updated_at": now_utc(),
            "debit_note_applied": True,
            "last_debit_note_id": debit_note.get("id"),
            "last_debit_note_amount": dn_amount
        }
        
        # Add reversal tracking if any allocations were reversed
        if reversed_allocations:
            update_data["payment_allocations_reversed"] = True
            update_data["reversed_allocations_count"] = len(reversed_allocations)
            update_data["total_amount_reversed"] = sum(r["amount_reversed"] for r in reversed_allocations)
        
        # Recalculate payment status
        if total_allocated >= new_invoice_total and new_invoice_total > 0:
            update_data["payment_status"] = "Paid"
            update_data["status"] = "paid"
        elif total_allocated > 0:
            update_data["payment_status"] = "Partially Paid"
        else:
            update_data["payment_status"] = "Unpaid"
        
        await purchase_invoices_coll.update_one(
            {"id": reference_invoice_id},
            {"$set": update_data}
        )
        
        # Create adjustment JE to reduce AP
        ap_account = await accounts_coll.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
        purchase_return_account = await accounts_coll.find_one({"account_name": {"$regex": "Purchase Return", "$options": "i"}})
        
        if ap_account and purchase_return_account:
            adjustment_je_id = str(uuid.uuid4())
            adjustment_je = {
                "id": adjustment_je_id,
                "entry_number": f"JE-ADJ-{debit_note.get('debit_note_number', '')}",
                "posting_date": debit_note.get("debit_note_date") or now_utc(),
                "reference": f"{debit_note.get('debit_note_number', '')} for {invoice.get('invoice_number')}",
                "description": f"Invoice balance adjustment for Debit Note {debit_note.get('debit_note_number')}",
                "voucher_type": "Debit Note Adjustment",
                "voucher_id": debit_note.get("id"),
                "accounts": [
                    {
                        "account_id": ap_account["id"],
                        "account_name": ap_account["account_name"],
                        "debit_amount": dn_amount,
                        "credit_amount": 0,
                        "description": f"Reduce A/P for invoice {invoice.get('invoice_number')}"
                    },
                    {
                        "account_id": purchase_return_account["id"],
                        "account_name": purchase_return_account["account_name"],
                        "debit_amount": 0,
                        "credit_amount": dn_amount,
                        "description": f"Purchase return for DN {debit_note.get('debit_note_number')}"
                    }
                ],
                "total_debit": dn_amount,
                "total_credit": dn_amount,
                "status": "posted",
                "is_auto_generated": True,
                "company_id": debit_note.get("company_id", "default_company"),
                "created_at": now_utc(),
                "updated_at": now_utc()
            }
            await journal_entries_coll.insert_one(adjustment_je)
    
    return adjustment_je_id, refund_entry_id
