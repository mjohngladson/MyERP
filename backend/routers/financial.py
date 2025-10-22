from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from database import (
    accounts_collection, journal_entries_collection, payments_collection,
    bank_accounts_collection, bank_transactions_collection, tax_rates_collection,
    currencies_collection, financial_settings_collection,
    sales_invoices_collection, purchase_invoices_collection
)
from models import (
    Account, JournalEntry, JournalEntryAccount, Payment, BankAccount,
    BankTransaction, TaxRate, Currency, FinancialSettings
)
import uuid
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/api/financial", tags=["financial"])

def sanitize(doc):
    """Remove MongoDB ObjectId and ensure proper serialization"""
    if isinstance(doc, dict) and "_id" in doc:
        del doc["_id"]
    return doc

def now_utc():
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)

# ==================== CHART OF ACCOUNTS ====================

@router.get("/accounts", response_model=List[dict])
async def get_accounts(
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    is_group: Optional[bool] = Query(None, description="Filter by group accounts"),
    parent_id: Optional[str] = Query(None, description="Filter by parent account")
):
    """Get chart of accounts"""
    try:
        query = {"is_active": True}
        if account_type:
            query["account_type"] = account_type
        if is_group is not None:
            query["is_group"] = is_group
        if parent_id:
            query["parent_account_id"] = parent_id
            
        accounts = await accounts_collection.find(query).sort("account_code", 1).to_list(length=None)
        return [sanitize(account) for account in accounts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching accounts: {str(e)}")

@router.post("/accounts", response_model=dict)
async def create_account(account_data: dict):
    """Create new account"""
    try:
        account_data["id"] = str(uuid.uuid4())
        account_data["created_at"] = now_utc()
        account_data["updated_at"] = now_utc()
        
        # Validate account code uniqueness
        existing = await accounts_collection.find_one({"account_code": account_data["account_code"]})
        if existing:
            raise HTTPException(status_code=400, detail="Account code already exists")
        
        result = await accounts_collection.insert_one(account_data)
        if result.inserted_id:
            return {"success": True, "message": "Account created successfully", "account_id": account_data["id"]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create account")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating account: {str(e)}")

@router.get("/accounts/{account_id}")
async def get_account(account_id: str):
    """Get single account by ID"""
    try:
        account = await accounts_collection.find_one({"id": account_id})
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return sanitize(account)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching account: {str(e)}")

@router.put("/accounts/{account_id}")
async def update_account(account_id: str, account_data: dict):
    """Update account"""
    try:
        account_data["updated_at"] = now_utc()
        result = await accounts_collection.update_one(
            {"id": account_id}, 
            {"$set": account_data}
        )
        if result.modified_count > 0:
            return {"success": True, "message": "Account updated successfully"}
        else:
            return {"success": True, "message": "No changes made to account"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating account: {str(e)}")

# ==================== JOURNAL ENTRIES ====================

@router.get("/journal-entries", response_model=List[dict])
async def get_journal_entries(
    limit: int = Query(50, description="Number of entries to return"),
    skip: int = Query(0, description="Number of entries to skip"),
    status: Optional[str] = Query(None, description="Filter by status"),
    voucher_type: Optional[str] = Query(None, description="Filter by voucher type"),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)")
):
    """Get journal entries with filtering"""
    try:
        query = {}
        if status:
            query["status"] = status
        if voucher_type:
            query["voucher_type"] = voucher_type
        if from_date or to_date:
            date_filter = {}
            if from_date:
                # Handle both date string and datetime
                date_filter["$gte"] = from_date
            if to_date:
                # Add one day to include the entire end date
                date_filter["$lte"] = to_date
            query["posting_date"] = date_filter
            
        entries = await journal_entries_collection.find(query).sort("posting_date", -1).skip(skip).limit(limit).to_list(length=limit)
        return [sanitize(entry) for entry in entries]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching journal entries: {str(e)}")

@router.post("/journal-entries", response_model=dict)
async def create_journal_entry(entry_data: dict):
    """Create new journal entry"""
    try:
        # Validations
        if not entry_data.get("posting_date"):
            raise HTTPException(status_code=400, detail="Posting date is required")
        if not entry_data.get("description"):
            raise HTTPException(status_code=400, detail="Description is required")
        if not entry_data.get("accounts") or len(entry_data.get("accounts", [])) < 2:
            raise HTTPException(status_code=400, detail="At least 2 account lines are required")
        
        # Validate each account line
        for idx, acc in enumerate(entry_data.get("accounts", [])):
            if not acc.get("account_id"):
                raise HTTPException(status_code=400, detail=f"Account is required for line {idx + 1}")
            debit = float(acc.get("debit_amount", 0))
            credit = float(acc.get("credit_amount", 0))
            if debit == 0 and credit == 0:
                raise HTTPException(status_code=400, detail=f"Either debit or credit amount is required for line {idx + 1}")
            if debit > 0 and credit > 0:
                raise HTTPException(status_code=400, detail=f"Line {idx + 1} cannot have both debit and credit amounts")
        
        entry_data["id"] = str(uuid.uuid4())
        
        # Generate entry number if not provided
        if not entry_data.get("entry_number"):
            date_str = datetime.now().strftime('%Y%m%d')
            prefix = "JE"
            
            # Find the highest entry number for this date
            pattern = f"{prefix}-{date_str}-"
            existing_entries = await journal_entries_collection.find({
                "entry_number": {"$regex": f"^{pattern}"}
            }).to_list(length=None)
            
            # Extract numbers and find max
            max_num = 0
            for entry in existing_entries:
                try:
                    num_part = entry.get("entry_number", "").split("-")[-1]
                    num = int(num_part)
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
            
            # Generate next number
            next_num = max_num + 1
            entry_data["entry_number"] = f"{prefix}-{date_str}-{next_num:04d}"
        
        # Default status and voucher type
        if not entry_data.get("status"):
            entry_data["status"] = "draft"
        if not entry_data.get("voucher_type"):
            entry_data["voucher_type"] = "Journal Entry"
        if not entry_data.get("is_auto_generated"):
            entry_data["is_auto_generated"] = False
        
        # Calculate totals
        total_debit = sum(float(acc.get("debit_amount", 0)) for acc in entry_data.get("accounts", []))
        total_credit = sum(float(acc.get("credit_amount", 0)) for acc in entry_data.get("accounts", []))
        
        # Validate balanced entry
        if abs(total_debit - total_credit) > 0.01:  # Allow for rounding differences
            raise HTTPException(status_code=400, detail="Journal entry must be balanced (total debits = total credits)")
        
        entry_data["total_debit"] = total_debit
        entry_data["total_credit"] = total_credit
        entry_data["created_at"] = now_utc()
        entry_data["updated_at"] = now_utc()
        
        result = await journal_entries_collection.insert_one(entry_data)
        if result.inserted_id:
            return {"success": True, "message": "Journal entry created successfully", "entry_id": entry_data["id"]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create journal entry")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating journal entry: {str(e)}")

@router.get("/journal-entries/{entry_id}")
async def get_journal_entry(entry_id: str):
    """Get single journal entry by ID"""
    try:
        entry = await journal_entries_collection.find_one({"id": entry_id})
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        return sanitize(entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching journal entry: {str(e)}")

@router.put("/journal-entries/{entry_id}")
async def update_journal_entry(entry_id: str, entry_data: dict):
    """Update journal entry"""
    try:
        # Check if entry exists
        existing_entry = await journal_entries_collection.find_one({"id": entry_id})
        if not existing_entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Cannot update posted entries
        if existing_entry.get("status") == "posted":
            raise HTTPException(status_code=400, detail="Cannot update posted journal entry")
        
        # Validations
        if "accounts" in entry_data and len(entry_data.get("accounts", [])) < 2:
            raise HTTPException(status_code=400, detail="At least 2 account lines are required")
        
        # Recalculate totals if accounts changed
        if "accounts" in entry_data:
            total_debit = sum(float(acc.get("debit_amount", 0)) for acc in entry_data.get("accounts", []))
            total_credit = sum(float(acc.get("credit_amount", 0)) for acc in entry_data.get("accounts", []))
            
            # Validate balanced entry
            if abs(total_debit - total_credit) > 0.01:
                raise HTTPException(status_code=400, detail="Journal entry must be balanced (total debits = total credits)")
            
            entry_data["total_debit"] = total_debit
            entry_data["total_credit"] = total_credit
        
        entry_data["updated_at"] = now_utc()
        
        result = await journal_entries_collection.update_one(
            {"id": entry_id},
            {"$set": entry_data}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Journal entry updated successfully"}
        else:
            return {"success": True, "message": "No changes made to journal entry"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating journal entry: {str(e)}")

@router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """Delete journal entry"""
    try:
        # Check if entry exists
        entry = await journal_entries_collection.find_one({"id": entry_id})
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Only allow deletion of draft entries
        if entry.get("status") != "draft":
            raise HTTPException(status_code=400, detail="Only draft journal entries can be deleted")
        
        # Delete the entry
        result = await journal_entries_collection.delete_one({"id": entry_id})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Journal entry deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete journal entry")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting journal entry: {str(e)}")

@router.post("/journal-entries/{entry_id}/post")
async def post_journal_entry(entry_id: str):
    """Post journal entry to ledger"""
    try:
        entry = await journal_entries_collection.find_one({"id": entry_id})
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        if entry["status"] == "posted":
            raise HTTPException(status_code=400, detail="Journal entry already posted")
        
        # Update account balances
        for account in entry.get("accounts", []):
            debit_amount = float(account.get("debit_amount", 0))
            credit_amount = float(account.get("credit_amount", 0))
            
            # Determine balance change based on account type
            account_info = await accounts_collection.find_one({"id": account["account_id"]})
            if account_info:
                balance_change = 0
                if account_info["root_type"] in ["Asset", "Expense"]:
                    balance_change = debit_amount - credit_amount
                else:  # Liability, Equity, Income
                    balance_change = credit_amount - debit_amount
                
                await accounts_collection.update_one(
                    {"id": account["account_id"]},
                    {"$inc": {"account_balance": balance_change}}
                )
        
        # Mark entry as posted
        await journal_entries_collection.update_one(
            {"id": entry_id},
            {"$set": {"status": "posted", "updated_at": now_utc()}}
        )
        
        return {"success": True, "message": "Journal entry posted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error posting journal entry: {str(e)}")

# ==================== PAYMENTS ====================

@router.get("/payments", response_model=List[dict])
async def get_payments(
    limit: int = Query(50, description="Number of payments to return"),
    skip: int = Query(0, description="Number of payments to skip"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """Get payments"""
    try:
        query = {}
        if payment_type:
            query["payment_type"] = payment_type
        if status:
            query["status"] = status
            
        payments = await payments_collection.find(query).sort("payment_date", -1).skip(skip).limit(limit).to_list(length=limit)
        return [sanitize(payment) for payment in payments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payments: {str(e)}")

@router.post("/payments", response_model=dict)
async def create_payment(payment_data: dict):
    """Create new payment"""
    try:
        # Validations
        if not payment_data.get("party_id"):
            raise HTTPException(status_code=400, detail="Party is required")
        if not payment_data.get("party_name"):
            raise HTTPException(status_code=400, detail="Party name is required")
        if not payment_data.get("payment_type") or payment_data.get("payment_type") not in ["Receive", "Pay"]:
            raise HTTPException(status_code=400, detail="Valid payment type is required (Receive or Pay)")
        if not payment_data.get("party_type") or payment_data.get("party_type") not in ["Customer", "Supplier"]:
            raise HTTPException(status_code=400, detail="Valid party type is required (Customer or Supplier)")
        if not payment_data.get("amount") or float(payment_data.get("amount", 0)) <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        if not payment_data.get("payment_date"):
            raise HTTPException(status_code=400, detail="Payment date is required")
        if not payment_data.get("payment_method"):
            raise HTTPException(status_code=400, detail="Payment method is required")
        
        payment_data["id"] = str(uuid.uuid4())
        
        # Generate payment number if not provided
        if not payment_data.get("payment_number"):
            prefix = "REC" if payment_data.get("payment_type") == "Receive" else "PAY"
            date_str = datetime.now().strftime('%Y%m%d')
            
            # Find the highest payment number for this prefix and date
            pattern = f"{prefix}-{date_str}-"
            existing_payments = await payments_collection.find({
                "payment_number": {"$regex": f"^{pattern}"}
            }).to_list(length=None)
            
            # Extract numbers and find max
            max_num = 0
            for payment in existing_payments:
                try:
                    num_part = payment.get("payment_number", "").split("-")[-1]
                    num = int(num_part)
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
            
            # Generate next number
            next_num = max_num + 1
            payment_data["payment_number"] = f"{prefix}-{date_str}-{next_num:04d}"
        
        # Default status to 'draft' 
        if not payment_data.get("status"):
            payment_data["status"] = "draft"
        
        # Calculate base amount if different currency
        exchange_rate = float(payment_data.get("exchange_rate", 1.0))
        payment_data["base_amount"] = float(payment_data["amount"]) * exchange_rate
        payment_data["unallocated_amount"] = payment_data["base_amount"]
        
        payment_data["created_at"] = now_utc()
        payment_data["updated_at"] = now_utc()
        
        result = await payments_collection.insert_one(payment_data)
        if result.inserted_id:
            # Create journal entry for the payment
            await create_payment_journal_entry(payment_data)
            return {"success": True, "message": "Payment created successfully", "payment_id": payment_data["id"]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create payment")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating payment: {str(e)}")

@router.get("/payments/{payment_id}")
async def get_payment(payment_id: str):
    """Get single payment by ID"""
    try:
        payment = await payments_collection.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        return sanitize(payment)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment: {str(e)}")

@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, payment_data: dict):
    """Update payment"""
    try:
        # Check if payment exists
        existing_payment = await payments_collection.find_one({"id": payment_id})
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Validations
        if payment_data.get("party_id") and not payment_data.get("party_id"):
            raise HTTPException(status_code=400, detail="Party is required")
        if payment_data.get("amount") is not None and float(payment_data.get("amount", 0)) <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        if payment_data.get("payment_type") and payment_data.get("payment_type") not in ["Receive", "Pay"]:
            raise HTTPException(status_code=400, detail="Valid payment type is required (Receive or Pay)")
        
        # Recalculate base amount if amount or exchange rate changed
        if "amount" in payment_data or "exchange_rate" in payment_data:
            amount = float(payment_data.get("amount", existing_payment.get("amount", 0)))
            exchange_rate = float(payment_data.get("exchange_rate", existing_payment.get("exchange_rate", 1.0)))
            payment_data["base_amount"] = amount * exchange_rate
            payment_data["unallocated_amount"] = payment_data["base_amount"]
        
        payment_data["updated_at"] = now_utc()
        
        result = await payments_collection.update_one(
            {"id": payment_id},
            {"$set": payment_data}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Payment updated successfully"}
        else:
            return {"success": True, "message": "No changes made to payment"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating payment: {str(e)}")

@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str):
    """Delete payment"""
    try:
        # Check if payment exists
        payment = await payments_collection.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Only allow deletion of draft or submitted payments, not paid ones
        if payment.get("status") == "paid":
            raise HTTPException(status_code=400, detail="Cannot delete paid payment. Please cancel it first.")
        
        # Delete the payment
        result = await payments_collection.delete_one({"id": payment_id})
        
        if result.deleted_count > 0:
            # Also delete associated journal entry if exists
            await journal_entries_collection.delete_one({"voucher_id": payment_id})
            return {"success": True, "message": "Payment deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete payment")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting payment: {str(e)}")

async def create_payment_journal_entry(payment_data: dict):
    """Create automatic journal entry for payment"""
    try:
        # Get default accounts (this would be configurable in a real implementation)
        cash_account_id = "cash_account_default"  # This should be from settings
        receivables_account_id = "receivables_account_default"  # This should be from settings
        payables_account_id = "payables_account_default"  # This should be from settings
        
        accounts = []
        if payment_data["payment_type"] == "Receive":
            # Debit: Cash/Bank, Credit: Accounts Receivable
            accounts = [
                {
                    "account_id": cash_account_id,
                    "account_name": "Cash",
                    "debit_amount": payment_data["base_amount"],
                    "credit_amount": 0.0,
                    "description": f"Payment received from {payment_data['party_name']}"
                },
                {
                    "account_id": receivables_account_id,
                    "account_name": "Accounts Receivable",
                    "debit_amount": 0.0,
                    "credit_amount": payment_data["base_amount"],
                    "description": f"Payment received from {payment_data['party_name']}"
                }
            ]
        else:  # Pay
            # Debit: Accounts Payable, Credit: Cash/Bank
            accounts = [
                {
                    "account_id": payables_account_id,
                    "account_name": "Accounts Payable",
                    "debit_amount": payment_data["base_amount"],
                    "credit_amount": 0.0,
                    "description": f"Payment made to {payment_data['party_name']}"
                },
                {
                    "account_id": cash_account_id,
                    "account_name": "Cash",
                    "debit_amount": 0.0,
                    "credit_amount": payment_data["base_amount"],
                    "description": f"Payment made to {payment_data['party_name']}"
                }
            ]
        
        # Ensure posting_date is a string in YYYY-MM-DD format
        posting_date = payment_data["payment_date"]
        if isinstance(posting_date, datetime):
            posting_date = posting_date.strftime("%Y-%m-%d")
        
        # Create journal entry
        entry_data = {
            "id": str(uuid.uuid4()),
            "entry_number": f"JE-PAY-{payment_data['payment_number']}",
            "posting_date": posting_date,
            "reference": payment_data["payment_number"],
            "description": f"Payment entry for {payment_data['party_name']}",
            "accounts": accounts,
            "total_debit": payment_data["base_amount"],
            "total_credit": payment_data["base_amount"],
            "status": "posted",
            "voucher_type": "Payment",
            "voucher_id": payment_data["id"],
            "is_auto_generated": True,
            "company_id": payment_data.get("company_id", "default_company"),
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        
        await journal_entries_collection.insert_one(entry_data)
    except Exception as e:
        print(f"Error creating payment journal entry: {e}")

# ==================== FINANCIAL REPORTS ====================

@router.get("/reports/trial-balance")
async def get_trial_balance(
    as_of_date: Optional[str] = Query(None, description="As of date (YYYY-MM-DD)")
):
    """
    Generate trial balance report - includes all posted journal entries and payments
    
    Account Balance Calculation:
    - Assets & Expenses: Balance = Total Debits - Total Credits (Debit balance is positive)
    - Liabilities, Equity & Income: Balance = Total Credits - Total Debits (Credit balance is positive)
    
    Trial Balance Display:
    - Debit balances shown in debit_balance column
    - Credit balances shown in credit_balance column
    - Total Debits must equal Total Credits
    """
    try:
        target_date = as_of_date or datetime.now().strftime("%Y-%m-%d")
        
        # Get all accounts
        accounts = await accounts_collection.find({"is_active": True}).to_list(length=None)
        
        # Calculate balances from journal entries up to target date
        account_balances = {}
        for account in accounts:
            # Skip group accounts (parent accounts with no transactions)
            if account.get("is_group", False):
                continue
                
            account_balances[account["id"]] = {
                "account_code": account.get("account_code", ""),
                "account_name": account["account_name"],
                "account_type": account.get("account_type", ""),
                "root_type": account.get("root_type", ""),
                "total_debit": 0.0,
                "total_credit": 0.0,
                "balance": 0.0
            }
        
        # Get all posted journal entries up to target date
        journal_entries = await journal_entries_collection.find({
            "status": "posted",
            "posting_date": {"$lte": target_date}
        }).to_list(length=None)
        
        # Aggregate balances from journal entries
        for entry in journal_entries:
            for acc in entry.get("accounts", []):
                account_id = acc.get("account_id")
                if account_id in account_balances:
                    debit = float(acc.get("debit_amount", 0))
                    credit = float(acc.get("credit_amount", 0))
                    
                    account_balances[account_id]["total_debit"] += debit
                    account_balances[account_id]["total_credit"] += credit
        
        # Calculate final balances based on account type
        for account_id, acc_data in account_balances.items():
            total_debit = acc_data["total_debit"]
            total_credit = acc_data["total_credit"]
            root_type = acc_data.get("root_type", "")
            
            # Calculate balance based on normal balance of account type
            if root_type in ["Asset", "Expense"]:
                # Debit-balance accounts: Balance = Debits - Credits
                acc_data["balance"] = total_debit - total_credit
            else:  # Liability, Equity, Income
                # Credit-balance accounts: Balance = Credits - Debits
                acc_data["balance"] = total_credit - total_debit
        
        # Build trial balance
        total_debits = 0
        total_credits = 0
        trial_balance = []
        
        for account_id, acc_data in account_balances.items():
            balance = acc_data["balance"]
            
            # Only show accounts with balances
            if abs(balance) > 0.01:
                # Positive balance = normal balance for that account type
                if balance > 0:
                    # Normal balance
                    if acc_data["root_type"] in ["Asset", "Expense"]:
                        debit_balance = balance
                        credit_balance = 0
                    else:  # Liability, Equity, Income
                        debit_balance = 0
                        credit_balance = balance
                else:
                    # Abnormal balance (negative)
                    if acc_data["root_type"] in ["Asset", "Expense"]:
                        debit_balance = 0
                        credit_balance = abs(balance)
                    else:  # Liability, Equity, Income
                        debit_balance = abs(balance)
                        credit_balance = 0
                
                trial_balance.append({
                    "account_code": acc_data["account_code"],
                    "account_name": acc_data["account_name"],
                    "account_type": acc_data["account_type"],
                    "root_type": acc_data["root_type"],
                    "total_debit": acc_data["total_debit"],
                    "total_credit": acc_data["total_credit"],
                    "debit_balance": round(debit_balance, 2),
                    "credit_balance": round(credit_balance, 2)
                })
                total_debits += debit_balance
                total_credits += credit_balance
        
        # Sort by account code
        trial_balance.sort(key=lambda x: x["account_code"])
        
        return {
            "as_of_date": target_date,
            "accounts": trial_balance,
            "total_debits": round(total_debits, 2),
            "total_credits": round(total_credits, 2),
            "is_balanced": abs(total_debits - total_credits) < 0.01,
            "variance": round(total_debits - total_credits, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trial balance: {str(e)}")

@router.get("/reports/profit-loss")
async def get_profit_loss_statement(
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)")
):
    """
    Generate Profit & Loss statement
    
    Structure:
    Revenue:
      Sales Revenue
      - Sales Returns
      = Net Sales
    
    Cost of Goods Sold:
      Purchases
      - Purchase Returns
      = Net Purchases
      
    Gross Profit = Net Sales - Net Purchases
    
    Operating Expenses:
      Operating Expenses
      Other Expenses
      
    Net Profit = Gross Profit - Operating Expenses
    
    Note: Tax accounts (Input Tax Credit, Output Tax Payable) are NOT included as they are balance sheet items
    """
    try:
        start_date = from_date or datetime.now().replace(day=1).strftime("%Y-%m-%d")
        end_date = to_date or datetime.now().strftime("%Y-%m-%d")
        
        # Get all accounts grouped by type
        # Note: Using $ne instead of False to include accounts where is_group is None/null
        all_accounts = await accounts_collection.find({
            "is_active": True,
            "is_group": {"$ne": True}  # Excludes only True, includes False and None
        }).to_list(length=None)
        
        # Initialize balances
        account_balances = {}
        for acc in all_accounts:
            account_balances[acc["id"]] = {
                "account_name": acc["account_name"],
                "account_code": acc.get("account_code", ""),
                "root_type": acc.get("root_type", ""),
                "account_type": acc.get("account_type", ""),
                "amount": 0.0
            }
        
        # Get all posted journal entries in date range
        journal_entries = await journal_entries_collection.find({
            "status": "posted",
            "posting_date": {"$gte": start_date, "$lte": end_date}
        }).to_list(length=None)
        
        # Aggregate amounts from journal entries
        for entry in journal_entries:
            for acc in entry.get("accounts", []):
                account_id = acc.get("account_id")
                if account_id in account_balances:
                    debit = float(acc.get("debit_amount", 0))
                    credit = float(acc.get("credit_amount", 0))
                    
                    root_type = account_balances[account_id]["root_type"]
                    
                    # Income accounts: credit increases, debit decreases
                    if root_type == "Income":
                        account_balances[account_id]["amount"] += (credit - debit)
                    # Expense accounts: debit increases, credit decreases
                    elif root_type == "Expense":
                        account_balances[account_id]["amount"] += (debit - credit)
        
        # Extract specific accounts for P&L structure
        sales_revenue = 0.0
        sales_returns = 0.0
        purchases = 0.0
        purchase_returns = 0.0
        cogs = 0.0
        operating_expenses = 0.0
        other_income = 0.0
        other_expenses = 0.0
        
        for acc_id, acc_data in account_balances.items():
            if acc_data["amount"] == 0:
                continue
                
            account_name = acc_data["account_name"].lower()
            root_type = acc_data["root_type"]
            amount = acc_data["amount"]
            
            # Skip tax accounts - they are balance sheet items, not P&L
            if "input tax" in account_name or "output tax" in account_name or "tax credit" in account_name:
                continue
            
            # Revenue section
            if root_type == "Income":
                if "sales return" in account_name or "return" in account_name and "sales" in account_name:
                    # Sales Returns are contra-revenue (debited by CN)
                    # Amount will be negative (credit - debit = 0 - 300 = -300)
                    # Use absolute value for display
                    sales_returns += abs(amount)
                elif "purchase return" in account_name or "return" in account_name and "purchase" in account_name:
                    # Purchase Returns are contra-expense (credited by DN)
                    # Amount will be positive (credit - debit = 200 - 0 = 200)
                    purchase_returns += abs(amount)
                elif "sales" in account_name or "revenue" in account_name:
                    sales_revenue += amount
                else:
                    other_income += amount
            
            # Expense section
            elif root_type == "Expense":
                if "purchase" in account_name and "return" not in account_name:
                    purchases += amount
                elif "cost of goods sold" in account_name or "cogs" in account_name:
                    cogs += amount
                elif "operating" in account_name:
                    operating_expenses += amount
                else:
                    other_expenses += amount
        
        # Calculate net figures
        net_sales = sales_revenue - sales_returns
        net_purchases = purchases - purchase_returns
        gross_profit = net_sales - (net_purchases + cogs)
        total_operating_expenses = operating_expenses + other_expenses
        net_profit = gross_profit - total_operating_expenses + other_income
        
        return {
            "from_date": start_date,
            "to_date": end_date,
            "revenue": {
                "sales_revenue": round(sales_revenue, 2),
                "sales_returns": round(sales_returns, 2),
                "net_sales": round(net_sales, 2)
            },
            "cost_of_sales": {
                "purchases": round(purchases, 2),
                "purchase_returns": round(purchase_returns, 2),
                "net_purchases": round(net_purchases, 2),
                "cost_of_goods_sold": round(cogs, 2),
                "total_cost_of_sales": round(net_purchases + cogs, 2)
            },
            "gross_profit": round(gross_profit, 2),
            "operating_expenses": {
                "operating_expenses": round(operating_expenses, 2),
                "other_expenses": round(other_expenses, 2),
                "total_operating_expenses": round(total_operating_expenses, 2)
            },
            "other_income": round(other_income, 2),
            "net_profit": round(net_profit, 2),
            "profit_margin_percent": round((net_profit / net_sales * 100) if net_sales > 0 else 0, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating P&L statement: {str(e)}")

@router.get("/reports/balance-sheet")
async def get_balance_sheet(
    as_of_date: Optional[str] = Query(None, description="As of date (YYYY-MM-DD)")
):
    """
    Generate Balance Sheet - includes all posted journal entries and payments
    
    Balance Sheet equation: Assets = Liabilities + Equity
    
    Equity includes:
    - Capital accounts
    - Retained Earnings (accumulated profits from previous periods)
    - Current Period Net Profit/Loss (calculated from P&L up to target date)
    """
    try:
        target_date = as_of_date or datetime.now().strftime("%Y-%m-%d")
        
        # Get asset, liability, and equity accounts
        # Note: Using {"$ne": True} to include accounts where is_group is False or None
        asset_accounts = await accounts_collection.find({
            "root_type": "Asset", "is_active": True, "is_group": {"$ne": True}
        }).to_list(length=None)
        
        liability_accounts = await accounts_collection.find({
            "root_type": "Liability", "is_active": True, "is_group": {"$ne": True}
        }).to_list(length=None)
        
        equity_accounts = await accounts_collection.find({
            "root_type": "Equity", "is_active": True, "is_group": {"$ne": True}
        }).to_list(length=None)
        
        # Initialize balances
        asset_balances = {acc["id"]: {"account_name": acc["account_name"], "amount": 0.0} for acc in asset_accounts}
        liability_balances = {acc["id"]: {"account_name": acc["account_name"], "amount": 0.0} for acc in liability_accounts}
        equity_balances = {acc["id"]: {"account_name": acc["account_name"], "amount": 0.0} for acc in equity_accounts}
        
        # Get all posted journal entries up to target date
        journal_entries = await journal_entries_collection.find({
            "status": "posted",
            "posting_date": {"$lte": target_date}
        }).to_list(length=None)
        
        # Aggregate balances from journal entries
        # Also calculate net profit/loss from income and expense accounts
        income_total = 0.0
        expense_total = 0.0
        
        for entry in journal_entries:
            for acc in entry.get("accounts", []):
                account_id = acc.get("account_id")
                debit = float(acc.get("debit_amount", 0))
                credit = float(acc.get("credit_amount", 0))
                
                # Asset accounts: debit increases, credit decreases
                if account_id in asset_balances:
                    asset_balances[account_id]["amount"] += (debit - credit)
                
                # Liability accounts: credit increases, debit decreases
                elif account_id in liability_balances:
                    liability_balances[account_id]["amount"] += (credit - debit)
                
                # Equity accounts: credit increases, debit decreases
                elif account_id in equity_balances:
                    equity_balances[account_id]["amount"] += (credit - debit)
                
                # Calculate P&L for current period net profit
                else:
                    # Find account to determine if it's income or expense
                    account_doc = await accounts_collection.find_one({"id": account_id})
                    if account_doc:
                        root_type = account_doc.get("root_type", "")
                        account_name = account_doc.get("account_name", "").lower()
                        
                        # Skip tax accounts from P&L calculation
                        if "input tax" in account_name or "output tax" in account_name or "tax credit" in account_name:
                            continue
                        
                        # Income: credit increases, debit decreases
                        if root_type == "Income":
                            income_total += (credit - debit)
                        # Expense: debit increases, credit decreases
                        elif root_type == "Expense":
                            expense_total += (debit - credit)
        
        # Calculate current period net profit/loss
        current_period_profit = income_total - expense_total
        
        # Filter out zero balances
        asset_list = [acc for acc in asset_balances.values() if abs(acc["amount"]) > 0.01]
        liability_list = [acc for acc in liability_balances.values() if abs(acc["amount"]) > 0.01]
        equity_list = [acc for acc in equity_balances.values() if abs(acc["amount"]) > 0.01]
        
        # Add current period profit/loss to equity section
        if abs(current_period_profit) > 0.01:
            if current_period_profit > 0:
                equity_list.append({
                    "account_name": "Current Period Net Profit",
                    "amount": round(current_period_profit, 2)
                })
            else:
                equity_list.append({
                    "account_name": "Current Period Net Loss",
                    "amount": round(current_period_profit, 2)
                })
        
        total_assets = sum(acc["amount"] for acc in asset_list)
        total_liabilities = sum(acc["amount"] for acc in liability_list)
        total_equity = sum(acc["amount"] for acc in equity_list)
        
        return {
            "as_of_date": target_date,
            "assets": [{"account_name": acc["account_name"], "amount": round(acc["amount"], 2)} for acc in asset_list],
            "liabilities": [{"account_name": acc["account_name"], "amount": round(acc["amount"], 2)} for acc in liability_list],
            "equity": [{"account_name": acc["account_name"], "amount": round(acc["amount"], 2)} for acc in equity_list],
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "total_equity": round(total_equity, 2),
            "total_liabilities_equity": round(total_liabilities + total_equity, 2),
            "is_balanced": abs(total_assets - (total_liabilities + total_equity)) < 0.01,
            "variance": round(total_assets - (total_liabilities + total_equity), 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating balance sheet: {str(e)}")

# ==================== FINANCIAL SETTINGS ====================

@router.get("/settings")
async def get_financial_settings():
    """Get financial settings"""
    try:
        settings = await financial_settings_collection.find_one({"company_id": "default_company"})
        if not settings:
            # Return default settings
            return {
                "base_currency": "INR",
                "accounting_standard": "Indian GAAP",
                "fiscal_year_start": "April",
                "gst_enabled": True,
                "multi_currency_enabled": False,
                "enable_auto_journal_entries": True
            }
        return sanitize(settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching financial settings: {str(e)}")

@router.post("/settings")
async def update_financial_settings(settings_data: dict):
    """Update financial settings"""
    try:
        settings_data["company_id"] = "default_company"
        settings_data["updated_at"] = now_utc()
        
        result = await financial_settings_collection.update_one(
            {"company_id": "default_company"},
            {"$set": settings_data},
            upsert=True
        )
        
        return {"success": True, "message": "Financial settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating financial settings: {str(e)}")

# ==================== INITIALIZATION ====================

@router.post("/initialize")
async def initialize_chart_of_accounts():
    """Initialize standard chart of accounts for Indian retail business"""
    try:
        # Check if accounts already exist
        existing_count = await accounts_collection.count_documents({})
        if existing_count > 0:
            return {"success": True, "message": "Chart of accounts already initialized"}
        
        # Standard Indian retail chart of accounts
        standard_accounts = [
            # ASSETS
            {"account_code": "1000", "account_name": "Current Assets", "account_type": "Asset", "is_group": True, "root_type": "Asset"},
            {"account_code": "1001", "account_name": "Cash", "account_type": "Asset", "is_group": False, "root_type": "Asset", "parent_account_id": None},
            {"account_code": "1002", "account_name": "Bank Account", "account_type": "Asset", "is_group": False, "root_type": "Asset", "parent_account_id": None},
            {"account_code": "1003", "account_name": "Accounts Receivable", "account_type": "Asset", "is_group": False, "root_type": "Asset", "parent_account_id": None},
            {"account_code": "1004", "account_name": "Inventory", "account_type": "Asset", "is_group": False, "root_type": "Asset", "parent_account_id": None},
            {"account_code": "1100", "account_name": "Fixed Assets", "account_type": "Asset", "is_group": True, "root_type": "Asset"},
            {"account_code": "1101", "account_name": "Equipment", "account_type": "Asset", "is_group": False, "root_type": "Asset", "parent_account_id": None},
            
            # LIABILITIES
            {"account_code": "2000", "account_name": "Current Liabilities", "account_type": "Liability", "is_group": True, "root_type": "Liability"},
            {"account_code": "2001", "account_name": "Accounts Payable", "account_type": "Liability", "is_group": False, "root_type": "Liability", "parent_account_id": None},
            {"account_code": "2002", "account_name": "GST Payable", "account_type": "Liability", "is_group": False, "root_type": "Liability", "parent_account_id": None},
            {"account_code": "2003", "account_name": "TDS Payable", "account_type": "Liability", "is_group": False, "root_type": "Liability", "parent_account_id": None},
            
            # EQUITY
            {"account_code": "3000", "account_name": "Equity", "account_type": "Equity", "is_group": True, "root_type": "Equity"},
            {"account_code": "3001", "account_name": "Owner's Capital", "account_type": "Equity", "is_group": False, "root_type": "Equity", "parent_account_id": None},
            {"account_code": "3002", "account_name": "Retained Earnings", "account_type": "Equity", "is_group": False, "root_type": "Equity", "parent_account_id": None},
            
            # INCOME
            {"account_code": "4000", "account_name": "Revenue", "account_type": "Income", "is_group": True, "root_type": "Income"},
            {"account_code": "4001", "account_name": "Sales Revenue", "account_type": "Income", "is_group": False, "root_type": "Income", "parent_account_id": None},
            {"account_code": "4002", "account_name": "Other Income", "account_type": "Income", "is_group": False, "root_type": "Income", "parent_account_id": None},
            
            # EXPENSES
            {"account_code": "5000", "account_name": "Cost of Goods Sold", "account_type": "Expense", "is_group": True, "root_type": "Expense"},
            {"account_code": "5001", "account_name": "Purchase", "account_type": "Expense", "is_group": False, "root_type": "Expense", "parent_account_id": None},
            {"account_code": "6000", "account_name": "Operating Expenses", "account_type": "Expense", "is_group": True, "root_type": "Expense"},
            {"account_code": "6001", "account_name": "Rent", "account_type": "Expense", "is_group": False, "root_type": "Expense", "parent_account_id": None},
            {"account_code": "6002", "account_name": "Salaries", "account_type": "Expense", "is_group": False, "root_type": "Expense", "parent_account_id": None},
            {"account_code": "6003", "account_name": "Utilities", "account_type": "Expense", "is_group": False, "root_type": "Expense", "parent_account_id": None},
        ]
        
        # Insert accounts
        for account in standard_accounts:
            account["id"] = str(uuid.uuid4())
            account["account_balance"] = 0.0
            account["opening_balance"] = 0.0
            account["currency"] = "INR"
            account["is_active"] = True
            account["company_id"] = "default_company"
            account["created_at"] = now_utc()
            account["updated_at"] = now_utc()
        
        await accounts_collection.insert_many(standard_accounts)
        
        # Initialize default currencies
        default_currencies = [
            {"currency_code": "INR", "currency_name": "Indian Rupee", "symbol": "₹", "exchange_rate": 1.0, "is_base_currency": True, "is_active": True},
            {"currency_code": "USD", "currency_name": "US Dollar", "symbol": "$", "exchange_rate": 83.0, "is_base_currency": False, "is_active": True},
            {"currency_code": "EUR", "currency_name": "Euro", "symbol": "€", "exchange_rate": 90.0, "is_base_currency": False, "is_active": True},
        ]
        
        for currency in default_currencies:
            currency["id"] = str(uuid.uuid4())
            currency["company_id"] = "default_company"
            currency["updated_at"] = now_utc()
        
        await currencies_collection.insert_many(default_currencies)
        
        # Initialize default tax rates
        default_tax_rates = [
            {"tax_name": "GST 0%", "tax_rate": 0.0, "tax_type": "GST", "tax_account_id": "gst_account", "is_active": True},
            {"tax_name": "GST 5%", "tax_rate": 5.0, "tax_type": "GST", "tax_account_id": "gst_account", "is_active": True},
            {"tax_name": "GST 12%", "tax_rate": 12.0, "tax_type": "GST", "tax_account_id": "gst_account", "is_active": True},
            {"tax_name": "GST 18%", "tax_rate": 18.0, "tax_type": "GST", "tax_account_id": "gst_account", "is_active": True},
            {"tax_name": "GST 28%", "tax_rate": 28.0, "tax_type": "GST", "tax_account_id": "gst_account", "is_active": True},
        ]
        
        for tax_rate in default_tax_rates:
            tax_rate["id"] = str(uuid.uuid4())
            tax_rate["company_id"] = "default_company"
            tax_rate["created_at"] = now_utc()
        
        await tax_rates_collection.insert_many(default_tax_rates)
        
        # Initialize default financial settings
        default_settings = {
            "id": str(uuid.uuid4()),
            "company_id": "default_company",
            "base_currency": "INR",
            "accounting_standard": "Indian GAAP",
            "fiscal_year_start": "April",
            "gst_enabled": True,
            "gstin": None,
            "gst_categories": ["Taxable", "Exempt", "Zero Rated", "Nil Rated"],
            "default_gst_rate": 18.0,
            "multi_currency_enabled": False,
            "auto_exchange_rate_update": False,
            "enable_auto_journal_entries": True,
            "require_payment_approval": False,
            "enable_budget_control": False,
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        
        await financial_settings_collection.insert_one(default_settings)
        
        return {"success": True, "message": "Chart of accounts and financial settings initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initializing chart of accounts: {str(e)}")

# Export router
def get_financial_router():
    return router