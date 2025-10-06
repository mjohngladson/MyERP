# Debit Note Accounting Function - Add after generate_debit_note_number()

async def create_debit_note_accounting_entries(debit_note: Dict[str, Any]):
    """Create reversal journal entry and adjust payment for debit note"""
    from database import journal_entries_collection, payments_collection, accounts_collection
    
    # Get accounts
    payables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
    purchase_return_account = await accounts_collection.find_one({"account_name": {"$regex": "Purchase Return|Returns Outward", "$options": "i"}})
    tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Tax", "$options": "i"}})
    
    if not payables_account or not purchase_return_account:
        return
    
    total_amt = debit_note.get("total_amount", 0)
    tax_amt = debit_note.get("tax_amount", 0)
    purchase_amt = total_amt - tax_amt
    
    # Create reversal journal entry
    je_accounts = []
    je_accounts.append({
        "account_id": payables_account["id"],
        "account_name": payables_account["account_name"],
        "debit_amount": total_amt,
        "credit_amount": 0,
        "description": f"Debit Note {debit_note.get('debit_note_number', '')}"
    })
    
    je_accounts.append({
        "account_id": purchase_return_account["id"],
        "account_name": purchase_return_account["account_name"],
        "debit_amount": 0,
        "credit_amount": purchase_amt,
        "description": f"Purchase return for DN {debit_note.get('debit_note_number', '')}"
    })
    
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
    
    # Find and adjust related payment entry if linked to invoice
    if debit_note.get("reference_invoice_id"):
        payment = await payments_collection.find_one({
            "party_id": debit_note.get("supplier_id"),
            "payment_type": "Pay",
            "reference_number": debit_note.get("reference_invoice")
        })
        
        if payment:
            new_amount = payment.get("amount", 0) - total_amt
            await payments_collection.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "amount": max(0, new_amount),
                    "base_amount": max(0, new_amount),
                    "unallocated_amount": max(0, payment.get("unallocated_amount", 0) - total_amt),
                    "updated_at": now_utc()
                }}
            )
    
    return je_id