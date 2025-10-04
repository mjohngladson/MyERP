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
                date_filter["$gte"] = datetime.fromisoformat(from_date)
            if to_date:
                date_filter["$lte"] = datetime.fromisoformat(to_date)
            query["posting_date"] = date_filter
            
        entries = await journal_entries_collection.find(query).sort("posting_date", -1).skip(skip).limit(limit).to_list(length=limit)
        return [sanitize(entry) for entry in entries]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching journal entries: {str(e)}")

@router.post("/journal-entries", response_model=dict)
async def create_journal_entry(entry_data: dict):
    """Create new journal entry"""
    try:
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
        
        # Create journal entry
        entry_data = {
            "id": str(uuid.uuid4()),
            "entry_number": f"JE-PAY-{payment_data['payment_number']}",
            "posting_date": payment_data["payment_date"],
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
    """Generate trial balance report"""
    try:
        # In a real implementation, this would calculate balances from journal entries
        # For now, return account balances
        accounts = await accounts_collection.find({"is_active": True, "is_group": False}).to_list(length=None)
        
        total_debits = 0
        total_credits = 0
        trial_balance = []
        
        for account in accounts:
            balance = account.get("account_balance", 0)
            debit_balance = balance if balance > 0 and account["root_type"] in ["Asset", "Expense"] else 0
            credit_balance = abs(balance) if balance < 0 or account["root_type"] in ["Liability", "Equity", "Income"] else 0
            
            if balance != 0:  # Only show accounts with balances
                trial_balance.append({
                    "account_code": account["account_code"],
                    "account_name": account["account_name"],
                    "debit_balance": debit_balance,
                    "credit_balance": credit_balance
                })
                total_debits += debit_balance
                total_credits += credit_balance
        
        return {
            "as_of_date": as_of_date or datetime.now().strftime("%Y-%m-%d"),
            "accounts": trial_balance,
            "total_debits": total_debits,
            "total_credits": total_credits,
            "is_balanced": abs(total_debits - total_credits) < 0.01
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trial balance: {str(e)}")

@router.get("/reports/profit-loss")
async def get_profit_loss_statement(
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)")
):
    """Generate Profit & Loss statement"""
    try:
        # Get income and expense accounts
        income_accounts = await accounts_collection.find({
            "root_type": "Income", "is_active": True, "is_group": False
        }).to_list(length=None)
        
        expense_accounts = await accounts_collection.find({
            "root_type": "Expense", "is_active": True, "is_group": False
        }).to_list(length=None)
        
        total_income = sum(abs(acc.get("account_balance", 0)) for acc in income_accounts)
        total_expenses = sum(acc.get("account_balance", 0) for acc in expense_accounts)
        net_profit = total_income - total_expenses
        
        return {
            "from_date": from_date or datetime.now().replace(day=1).strftime("%Y-%m-%d"),
            "to_date": to_date or datetime.now().strftime("%Y-%m-%d"),
            "income": [
                {
                    "account_name": acc["account_name"],
                    "amount": abs(acc.get("account_balance", 0))
                } for acc in income_accounts if acc.get("account_balance", 0) != 0
            ],
            "expenses": [
                {
                    "account_name": acc["account_name"],
                    "amount": acc.get("account_balance", 0)
                } for acc in expense_accounts if acc.get("account_balance", 0) != 0
            ],
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_profit": net_profit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating P&L statement: {str(e)}")

@router.get("/reports/balance-sheet")
async def get_balance_sheet(
    as_of_date: Optional[str] = Query(None, description="As of date (YYYY-MM-DD)")
):
    """Generate Balance Sheet"""
    try:
        # Get asset, liability, and equity accounts
        asset_accounts = await accounts_collection.find({
            "root_type": "Asset", "is_active": True, "is_group": False
        }).to_list(length=None)
        
        liability_accounts = await accounts_collection.find({
            "root_type": "Liability", "is_active": True, "is_group": False
        }).to_list(length=None)
        
        equity_accounts = await accounts_collection.find({
            "root_type": "Equity", "is_active": True, "is_group": False
        }).to_list(length=None)
        
        total_assets = sum(acc.get("account_balance", 0) for acc in asset_accounts)
        total_liabilities = sum(abs(acc.get("account_balance", 0)) for acc in liability_accounts)
        total_equity = sum(abs(acc.get("account_balance", 0)) for acc in equity_accounts)
        
        return {
            "as_of_date": as_of_date or datetime.now().strftime("%Y-%m-%d"),
            "assets": [
                {
                    "account_name": acc["account_name"],
                    "amount": acc.get("account_balance", 0)
                } for acc in asset_accounts if acc.get("account_balance", 0) != 0
            ],
            "liabilities": [
                {
                    "account_name": acc["account_name"],
                    "amount": abs(acc.get("account_balance", 0))
                } for acc in liability_accounts if acc.get("account_balance", 0) != 0
            ],
            "equity": [
                {
                    "account_name": acc["account_name"],
                    "amount": abs(acc.get("account_balance", 0))
                } for acc in equity_accounts if acc.get("account_balance", 0) != 0
            ],
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_equity": total_equity,
            "total_liabilities_equity": total_liabilities + total_equity
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