"""
Workflow Helper Functions for Document Automation
Extracted common workflow logic to be reused in both CREATE and UPDATE endpoints
"""
from datetime import datetime, timezone, timedelta
import uuid
from typing import Dict, Optional


async def create_journal_entry_for_sales_invoice(
    invoice_id: str,
    invoice_data: dict,
    journal_entries_collection,
    accounts_collection
) -> Optional[str]:
    """
    Create Journal Entry for Sales Invoice
    Dr: Accounts Receivable (total)
    Cr: Sales Revenue (subtotal)
    Cr: Output Tax Payable (tax amount)
    """
    # Get accounts
    receivables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Receivable", "$options": "i"}})
    sales_account = await accounts_collection.find_one({"account_name": {"$regex": "Sales", "$options": "i"}})
    # Use Output Tax Payable for sales tax (liability account)
    output_tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Output Tax", "$options": "i"}})
    
    total_amt = invoice_data.get("total_amount", 0)
    tax_amt = invoice_data.get("tax_amount", 0)
    sales_amt = total_amt - tax_amt
    
    # Create Journal Entry for Sales Invoice
    je_accounts = []
    if receivables_account:
        je_accounts.append({
            "account_id": receivables_account["id"],
            "account_name": receivables_account["account_name"],
            "debit_amount": total_amt,
            "credit_amount": 0,
            "description": f"Sales Invoice {invoice_data.get('invoice_number', '')}"
        })
    if sales_account:
        je_accounts.append({
            "account_id": sales_account["id"],
            "account_name": sales_account["account_name"],
            "debit_amount": 0,
            "credit_amount": sales_amt,
            "description": f"Sales for Invoice {invoice_data.get('invoice_number', '')}"
        })
    if output_tax_account and tax_amt > 0:
        je_accounts.append({
            "account_id": output_tax_account["id"],
            "account_name": output_tax_account["account_name"],
            "debit_amount": 0,
            "credit_amount": tax_amt,
            "description": f"Output Tax on Invoice {invoice_data.get('invoice_number', '')}"
        })
    
    if je_accounts:
        je_id = str(uuid.uuid4())
        journal_entry = {
            "id": je_id,
            "entry_number": f"JE-INV-{invoice_data.get('invoice_number', '')}",
            "posting_date": invoice_data.get("invoice_date"),
            "reference": invoice_data.get("invoice_number", ""),
            "description": f"Sales Invoice entry for {invoice_data.get('customer_name', '')}",
            "voucher_type": "Sales Invoice",
            "voucher_id": invoice_id,
            "accounts": je_accounts,
            "total_debit": total_amt,
            "total_credit": total_amt,
            "status": "posted",
            "is_auto_generated": True,
            "company_id": invoice_data.get("company_id", "default_company"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await journal_entries_collection.insert_one(journal_entry)
        return je_id
    return None


async def create_payment_entry_for_sales_invoice(
    invoice_data: dict,
    payments_collection
) -> str:
    """Create Payment Entry for Sales Invoice"""
    payment_id = str(uuid.uuid4())
    total_amt = invoice_data.get("total_amount", 0)
    payment_entry = {
        "id": payment_id,
        "payment_number": f"REC-{datetime.now().strftime('%Y%m%d')}-{await payments_collection.count_documents({}) + 1:04d}",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party_id": invoice_data.get("customer_id"),
        "party_name": invoice_data.get("customer_name"),
        "payment_date": invoice_data.get("invoice_date"),
        "amount": total_amt,
        "base_amount": total_amt,
        "unallocated_amount": total_amt,
        "payment_method": "To Be Paid",
        "currency": "INR",
        "exchange_rate": 1.0,
        "status": "draft",  # Draft until actual payment received
        "reference_number": invoice_data.get("invoice_number", ""),
        "description": f"Payment entry for Invoice {invoice_data.get('invoice_number', '')}",
        "company_id": invoice_data.get("company_id", "default_company"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await payments_collection.insert_one(payment_entry)
    return payment_id


async def create_journal_entry_for_purchase_invoice(
    invoice_id: str,
    invoice_data: dict,
    journal_entries_collection,
    accounts_collection
) -> Optional[str]:
    """
    Create Journal Entry for Purchase Invoice
    Dr: Purchase Expense (subtotal)
    Dr: Input Tax Credit (tax amount)
    Cr: Accounts Payable (total)
    """
    # Get accounts
    payables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
    purchases_account = await accounts_collection.find_one({"account_name": {"$regex": "Purchases", "$options": "i"}})
    # Use Input Tax Credit for purchase tax (asset account)
    input_tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Input Tax", "$options": "i"}})
    
    total_amt = invoice_data.get("total_amount", 0)
    tax_amt = invoice_data.get("tax_amount", 0)
    purchases_amt = total_amt - tax_amt
    
    # Create Journal Entry for Purchase Invoice
    je_accounts = []
    if purchases_account:
        je_accounts.append({
            "account_id": purchases_account["id"],
            "account_name": purchases_account["account_name"],
            "debit_amount": purchases_amt,
            "credit_amount": 0,
            "description": f"Purchases for Invoice {invoice_data.get('invoice_number', '')}"
        })
    if input_tax_account and tax_amt > 0:
        je_accounts.append({
            "account_id": input_tax_account["id"],
            "account_name": input_tax_account["account_name"],
            "debit_amount": tax_amt,
            "credit_amount": 0,
            "description": f"Input Tax on Invoice {invoice_data.get('invoice_number', '')}"
        })
    if payables_account:
        je_accounts.append({
            "account_id": payables_account["id"],
            "account_name": payables_account["account_name"],
            "debit_amount": 0,
            "credit_amount": total_amt,
            "description": f"Purchase Invoice {invoice_data.get('invoice_number', '')}"
        })
    
    if je_accounts:
        je_id = str(uuid.uuid4())
        journal_entry = {
            "id": je_id,
            "entry_number": f"JE-PINV-{invoice_data.get('invoice_number', '')}",
            "posting_date": invoice_data.get("invoice_date"),
            "reference": invoice_data.get("invoice_number", ""),
            "description": f"Purchase Invoice entry for {invoice_data.get('supplier_name', '')}",
            "voucher_type": "Purchase Invoice",
            "voucher_id": invoice_id,
            "accounts": je_accounts,
            "total_debit": total_amt,
            "total_credit": total_amt,
            "status": "posted",
            "is_auto_generated": True,
            "company_id": invoice_data.get("company_id", "default_company"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await journal_entries_collection.insert_one(journal_entry)
        return je_id
    return None


async def create_payment_entry_for_purchase_invoice(
    invoice_data: dict,
    payments_collection
) -> str:
    """Create Payment Entry for Purchase Invoice"""
    payment_id = str(uuid.uuid4())
    total_amt = invoice_data.get("total_amount", 0)
    payment_entry = {
        "id": payment_id,
        "payment_number": f"PAY-{datetime.now().strftime('%Y%m%d')}-{await payments_collection.count_documents({}) + 1:04d}",
        "payment_type": "Pay",
        "party_type": "Supplier",
        "party_id": invoice_data.get("supplier_id"),
        "party_name": invoice_data.get("supplier_name"),
        "payment_date": invoice_data.get("invoice_date"),
        "amount": total_amt,
        "base_amount": total_amt,
        "unallocated_amount": total_amt,
        "payment_method": "To Be Paid",
        "currency": "INR",
        "exchange_rate": 1.0,
        "status": "draft",  # Draft until actual payment made
        "reference_number": invoice_data.get("invoice_number", ""),
        "description": f"Payment entry for Purchase Invoice {invoice_data.get('invoice_number', '')}",
        "company_id": invoice_data.get("company_id", "default_company"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await payments_collection.insert_one(payment_entry)
    return payment_id


async def create_journal_entry_for_credit_note(
    note_id: str,
    note_data: dict,
    journal_entries_collection,
    accounts_collection
) -> Optional[str]:
    """Create Journal Entry for Credit Note"""
    # Get accounts
    sales_return_account = await accounts_collection.find_one({"account_name": {"$regex": "Sales Returns", "$options": "i"}})
    receivables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Receivable", "$options": "i"}})
    tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Tax", "$options": "i"}})
    
    total_amt = note_data.get("total_amount", 0)
    tax_amt = note_data.get("tax_amount", 0)
    return_amt = total_amt - tax_amt
    
    # Create Journal Entry for Credit Note
    je_accounts = []
    if sales_return_account:
        je_accounts.append({
            "account_id": sales_return_account["id"],
            "account_name": sales_return_account["account_name"],
            "debit_amount": return_amt,
            "credit_amount": 0,
            "description": f"Sales Return for CN {note_data.get('note_number', '')}"
        })
    if tax_account and tax_amt > 0:
        je_accounts.append({
            "account_id": tax_account["id"],
            "account_name": tax_account["account_name"],
            "debit_amount": tax_amt,
            "credit_amount": 0,
            "description": f"Tax reversal for CN {note_data.get('note_number', '')}"
        })
    if receivables_account:
        je_accounts.append({
            "account_id": receivables_account["id"],
            "account_name": receivables_account["account_name"],
            "debit_amount": 0,
            "credit_amount": total_amt,
            "description": f"Credit Note {note_data.get('note_number', '')}"
        })
    
    if je_accounts:
        je_id = str(uuid.uuid4())
        journal_entry = {
            "id": je_id,
            "entry_number": f"JE-CN-{note_data.get('note_number', '')}",
            "posting_date": note_data.get("note_date"),
            "reference": note_data.get("note_number", ""),
            "description": f"Credit Note entry for {note_data.get('customer_name', '')}",
            "voucher_type": "Credit Note",
            "voucher_id": note_id,
            "accounts": je_accounts,
            "total_debit": total_amt,
            "total_credit": total_amt,
            "status": "posted",
            "is_auto_generated": True,
            "company_id": note_data.get("company_id", "default_company"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await journal_entries_collection.insert_one(journal_entry)
        return je_id
    return None


async def create_journal_entry_for_debit_note(
    note_id: str,
    note_data: dict,
    journal_entries_collection,
    accounts_collection
) -> Optional[str]:
    """Create Journal Entry for Debit Note"""
    # Get accounts
    purchase_return_account = await accounts_collection.find_one({"account_name": {"$regex": "Purchase Returns", "$options": "i"}})
    payables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Payable", "$options": "i"}})
    tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Tax", "$options": "i"}})
    
    total_amt = note_data.get("total_amount", 0)
    tax_amt = note_data.get("tax_amount", 0)
    return_amt = total_amt - tax_amt
    
    # Create Journal Entry for Debit Note
    je_accounts = []
    if payables_account:
        je_accounts.append({
            "account_id": payables_account["id"],
            "account_name": payables_account["account_name"],
            "debit_amount": total_amt,
            "credit_amount": 0,
            "description": f"Debit Note {note_data.get('note_number', '')}"
        })
    if purchase_return_account:
        je_accounts.append({
            "account_id": purchase_return_account["id"],
            "account_name": purchase_return_account["account_name"],
            "debit_amount": 0,
            "credit_amount": return_amt,
            "description": f"Purchase Return for DN {note_data.get('note_number', '')}"
        })
    if tax_account and tax_amt > 0:
        je_accounts.append({
            "account_id": tax_account["id"],
            "account_name": tax_account["account_name"],
            "debit_amount": 0,
            "credit_amount": tax_amt,
            "description": f"Tax reversal for DN {note_data.get('note_number', '')}"
        })
    
    if je_accounts:
        je_id = str(uuid.uuid4())
        journal_entry = {
            "id": je_id,
            "entry_number": f"JE-DN-{note_data.get('note_number', '')}",
            "posting_date": note_data.get("note_date"),
            "reference": note_data.get("note_number", ""),
            "description": f"Debit Note entry for {note_data.get('supplier_name', '')}",
            "voucher_type": "Debit Note",
            "voucher_id": note_id,
            "accounts": je_accounts,
            "total_debit": total_amt,
            "total_credit": total_amt,
            "status": "posted",
            "is_auto_generated": True,
            "company_id": note_data.get("company_id", "default_company"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await journal_entries_collection.insert_one(journal_entry)
        return je_id
    return None
