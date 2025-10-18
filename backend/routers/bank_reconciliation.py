from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from database import db
import uuid
import csv
import io

router = APIRouter(prefix="/api/financial/bank", tags=["bank_reconciliation"])

statements_coll = db.bank_statements
transactions_coll = db.bank_transactions
payments_coll = db.payments
journal_entries_coll = db.journal_entries


def now_utc():
    return datetime.now(timezone.utc)


def parse_date(date_str: str) -> Optional[datetime]:
    """Try to parse date from various formats"""
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d %b %Y",
        "%d %B %Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


@router.post("/upload-statement")
async def upload_bank_statement(
    file: UploadFile = File(...),
    bank_account_id: str = "default_bank",
    bank_name: str = "Default Bank"
):
    """
    Upload and parse a bank statement (CSV format)
    Expected CSV columns: Date, Description, Reference, Debit, Credit, Balance
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported currently")
    
    # Read file content
    content = await file.read()
    content_str = content.decode('utf-8')
    
    # Parse CSV
    csv_reader = csv.DictReader(io.StringIO(content_str))
    
    # Create statement record
    statement_id = str(uuid.uuid4())
    statement_doc = {
        "id": statement_id,
        "file_name": file.filename,
        "bank_account_id": bank_account_id,
        "bank_name": bank_name,
        "upload_date": now_utc(),
        "total_transactions": 0,
        "matched_count": 0,
        "unmatched_count": 0,
        "total_debit": 0.0,
        "total_credit": 0.0,
        "status": "uploaded",
        "created_at": now_utc()
    }
    
    transactions = []
    total_debit = 0.0
    total_credit = 0.0
    
    # Parse transactions
    for row in csv_reader:
        # Handle various CSV formats
        date_str = row.get('Date') or row.get('date') or row.get('Transaction Date') or ''
        description = row.get('Description') or row.get('description') or row.get('Narration') or ''
        reference = row.get('Reference') or row.get('reference') or row.get('Ref No') or ''
        debit_str = row.get('Debit') or row.get('debit') or row.get('Withdrawal') or '0'
        credit_str = row.get('Credit') or row.get('credit') or row.get('Deposit') or '0'
        balance_str = row.get('Balance') or row.get('balance') or '0'
        
        # Parse amounts
        try:
            debit = float(debit_str.replace(',', '')) if debit_str else 0.0
        except:
            debit = 0.0
        
        try:
            credit = float(credit_str.replace(',', '')) if credit_str else 0.0
        except:
            credit = 0.0
        
        try:
            balance = float(balance_str.replace(',', '')) if balance_str else 0.0
        except:
            balance = 0.0
        
        # Parse date
        transaction_date = parse_date(date_str) if date_str else now_utc()
        if not transaction_date:
            transaction_date = now_utc()
        
        # Calculate net amount (credit is positive, debit is negative)
        amount = credit - debit
        
        transaction_doc = {
            "id": str(uuid.uuid4()),
            "statement_id": statement_id,
            "transaction_date": transaction_date,
            "description": description.strip(),
            "reference": reference.strip(),
            "debit_amount": debit,
            "credit_amount": credit,
            "amount": amount,
            "balance": balance,
            "is_matched": False,
            "matched_entry_id": None,
            "matched_entry_type": None,
            "created_at": now_utc()
        }
        
        transactions.append(transaction_doc)
        total_debit += debit
        total_credit += credit
    
    # Update statement totals
    statement_doc["total_transactions"] = len(transactions)
    statement_doc["unmatched_count"] = len(transactions)
    statement_doc["total_debit"] = total_debit
    statement_doc["total_credit"] = total_credit
    
    # Save to database
    await statements_coll.insert_one(statement_doc)
    if transactions:
        await transactions_coll.insert_many(transactions)
    
    statement_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": f"Statement uploaded successfully with {len(transactions)} transactions",
        "statement": statement_doc
    }


@router.get("/statements")
async def list_bank_statements(limit: int = 50, skip: int = 0):
    """List all uploaded bank statements"""
    statements = await statements_coll.find().sort("upload_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    for s in statements:
        s.pop("_id", None)
    
    total = await statements_coll.count_documents({})
    
    return {
        "statements": statements,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/statements/{statement_id}")
async def get_statement_details(statement_id: str):
    """Get details of a specific statement with all transactions"""
    statement = await statements_coll.find_one({"id": statement_id})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    statement.pop("_id", None)
    
    # Get all transactions for this statement
    transactions = await transactions_coll.find({"statement_id": statement_id}).sort("transaction_date", -1).to_list(length=10000)
    
    for t in transactions:
        t.pop("_id", None)
    
    statement["transactions"] = transactions
    
    return statement


@router.post("/auto-match")
async def auto_match_transactions(payload: Dict[str, Any]):
    """
    Automatically match bank transactions with payments/journal entries
    Uses date tolerance and amount tolerance from settings
    """
    statement_id = payload.get("statement_id")
    if not statement_id:
        raise HTTPException(status_code=400, detail="statement_id is required")
    
    # Get settings
    settings_coll = db.general_settings
    settings = await settings_coll.find_one({"id": "general_settings"})
    
    date_tolerance = 3  # days
    amount_tolerance = 0.01  # 1%
    
    if settings:
        recon_settings = settings.get("financial", {}).get("bank_reconciliation", {})
        date_tolerance = recon_settings.get("date_tolerance_days", 3)
        amount_tolerance = recon_settings.get("amount_tolerance_percent", 0.01)
    
    # Get unmatched transactions for this statement
    unmatched = await transactions_coll.find({"statement_id": statement_id, "is_matched": False}).to_list(length=10000)
    
    matched_count = 0
    
    for txn in unmatched:
        txn_date = txn.get("transaction_date")
        txn_amount = abs(float(txn.get("amount", 0)))
        
        if not txn_date or txn_amount == 0:
            continue
        
        # Calculate date range for matching
        date_start = txn_date - timedelta(days=date_tolerance)
        date_end = txn_date + timedelta(days=date_tolerance)
        
        # Calculate amount range for matching
        amount_min = txn_amount * (1 - amount_tolerance)
        amount_max = txn_amount * (1 + amount_tolerance)
        
        # Try to match with payments
        matching_payment = await payments_coll.find_one({
            "payment_date": {"$gte": date_start, "$lte": date_end},
            "amount": {"$gte": amount_min, "$lte": amount_max},
            "status": "paid"
        })
        
        if matching_payment:
            # Mark as matched
            await transactions_coll.update_one(
                {"id": txn.get("id")},
                {"$set": {
                    "is_matched": True,
                    "matched_entry_id": matching_payment.get("id"),
                    "matched_entry_type": "payment",
                    "matched_entry_number": matching_payment.get("payment_number"),
                    "matched_date": now_utc()
                }}
            )
            matched_count += 1
            continue
        
        # Try to match with journal entries if no payment match
        matching_entry = await journal_entries_coll.find_one({
            "posting_date": {"$gte": date_start, "$lte": date_end},
            "$or": [
                {"total_debit": {"$gte": amount_min, "$lte": amount_max}},
                {"total_credit": {"$gte": amount_min, "$lte": amount_max}}
            ],
            "status": "posted"
        })
        
        if matching_entry:
            await transactions_coll.update_one(
                {"id": txn.get("id")},
                {"$set": {
                    "is_matched": True,
                    "matched_entry_id": matching_entry.get("id"),
                    "matched_entry_type": "journal_entry",
                    "matched_entry_number": matching_entry.get("entry_number"),
                    "matched_date": now_utc()
                }}
            )
            matched_count += 1
    
    # Update statement matched counts
    all_transactions = await transactions_coll.find({"statement_id": statement_id}).to_list(length=10000)
    matched = sum(1 for t in all_transactions if t.get("is_matched"))
    unmatched_count = len(all_transactions) - matched
    
    await statements_coll.update_one(
        {"id": statement_id},
        {"$set": {
            "matched_count": matched,
            "unmatched_count": unmatched_count,
            "status": "partially_matched" if unmatched_count > 0 else "fully_matched"
        }}
    )
    
    return {
        "success": True,
        "message": f"Auto-matched {matched_count} transactions",
        "matched_count": matched_count,
        "total_matched": matched,
        "total_unmatched": unmatched_count
    }


@router.post("/manual-match")
async def manual_match_transaction(payload: Dict[str, Any]):
    """Manually match a bank transaction with a payment or journal entry"""
    transaction_id = payload.get("transaction_id")
    entry_id = payload.get("entry_id")
    entry_type = payload.get("entry_type")  # "payment" or "journal_entry"
    
    if not all([transaction_id, entry_id, entry_type]):
        raise HTTPException(status_code=400, detail="transaction_id, entry_id, and entry_type are required")
    
    # Get transaction
    txn = await transactions_coll.find_one({"id": transaction_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify entry exists
    if entry_type == "payment":
        entry = await payments_coll.find_one({"id": entry_id})
        entry_number = entry.get("payment_number") if entry else None
    elif entry_type == "journal_entry":
        entry = await journal_entries_coll.find_one({"id": entry_id})
        entry_number = entry.get("entry_number") if entry else None
    else:
        raise HTTPException(status_code=400, detail="entry_type must be 'payment' or 'journal_entry'")
    
    if not entry:
        raise HTTPException(status_code=404, detail=f"{entry_type} not found")
    
    # Update transaction
    await transactions_coll.update_one(
        {"id": transaction_id},
        {"$set": {
            "is_matched": True,
            "matched_entry_id": entry_id,
            "matched_entry_type": entry_type,
            "matched_entry_number": entry_number,
            "matched_date": now_utc(),
            "is_manual_match": True
        }}
    )
    
    # Update statement counts
    statement_id = txn.get("statement_id")
    if statement_id:
        all_transactions = await transactions_coll.find({"statement_id": statement_id}).to_list(length=10000)
        matched = sum(1 for t in all_transactions if t.get("is_matched"))
        unmatched_count = len(all_transactions) - matched
        
        await statements_coll.update_one(
            {"id": statement_id},
            {"$set": {
                "matched_count": matched,
                "unmatched_count": unmatched_count,
                "status": "partially_matched" if unmatched_count > 0 else "fully_matched"
            }}
        )
    
    return {
        "success": True,
        "message": "Transaction matched successfully"
    }


@router.get("/unmatched")
async def get_unmatched_transactions(statement_id: Optional[str] = None, limit: int = 100):
    """Get all unmatched transactions, optionally filtered by statement"""
    query = {"is_matched": False}
    if statement_id:
        query["statement_id"] = statement_id
    
    transactions = await transactions_coll.find(query).sort("transaction_date", -1).limit(limit).to_list(length=limit)
    
    for t in transactions:
        t.pop("_id", None)
    
    return {
        "transactions": transactions,
        "count": len(transactions)
    }


@router.get("/reconciliation-report")
async def get_reconciliation_report(statement_id: str):
    """Get reconciliation summary report for a statement"""
    statement = await statements_coll.find_one({"id": statement_id})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    statement.pop("_id", None)
    
    # Get matched and unmatched transactions
    all_transactions = await transactions_coll.find({"statement_id": statement_id}).to_list(length=10000)
    matched = [t for t in all_transactions if t.get("is_matched")]
    unmatched = [t for t in all_transactions if not t.get("is_matched")]
    
    # Calculate totals
    matched_debit = sum(float(t.get("debit_amount", 0)) for t in matched)
    matched_credit = sum(float(t.get("credit_amount", 0)) for t in matched)
    unmatched_debit = sum(float(t.get("debit_amount", 0)) for t in unmatched)
    unmatched_credit = sum(float(t.get("credit_amount", 0)) for t in unmatched)
    
    for t in matched:
        t.pop("_id", None)
    for t in unmatched:
        t.pop("_id", None)
    
    return {
        "statement": statement,
        "summary": {
            "total_transactions": len(all_transactions),
            "matched_count": len(matched),
            "unmatched_count": len(unmatched),
            "matched_percentage": (len(matched) / len(all_transactions) * 100) if all_transactions else 0,
            "matched_debit_total": matched_debit,
            "matched_credit_total": matched_credit,
            "unmatched_debit_total": unmatched_debit,
            "unmatched_credit_total": unmatched_credit
        },
        "matched_transactions": matched,
        "unmatched_transactions": unmatched
    }


@router.delete("/statements/{statement_id}")
async def delete_statement(statement_id: str):
    """Delete a bank statement and all its transactions"""
    statement = await statements_coll.find_one({"id": statement_id})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Delete all transactions for this statement
    await transactions_coll.delete_many({"statement_id": statement_id})
    
    # Delete statement
    await statements_coll.delete_one({"id": statement_id})
    
    return {
        "success": True,
        "message": "Statement and all transactions deleted successfully"
    }


@router.post("/unmatch")
async def unmatch_transaction(payload: Dict[str, Any]):
    """Unmatch a previously matched transaction"""
    transaction_id = payload.get("transaction_id")
    
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction_id is required")
    
    txn = await transactions_coll.find_one({"id": transaction_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction
    await transactions_coll.update_one(
        {"id": transaction_id},
        {"$set": {
            "is_matched": False,
            "matched_entry_id": None,
            "matched_entry_type": None,
            "matched_entry_number": None,
            "matched_date": None,
            "is_manual_match": False
        }}
    )
    
    # Update statement counts
    statement_id = txn.get("statement_id")
    if statement_id:
        all_transactions = await transactions_coll.find({"statement_id": statement_id}).to_list(length=10000)
        matched = sum(1 for t in all_transactions if t.get("is_matched"))
        unmatched_count = len(all_transactions) - matched
        
        await statements_coll.update_one(
            {"id": statement_id},
            {"$set": {
                "matched_count": matched,
                "unmatched_count": unmatched_count,
                "status": "partially_matched" if unmatched_count > 0 else "uploaded"
            }}
        )
    
    return {
        "success": True,
        "message": "Transaction unmatched successfully"
    }
