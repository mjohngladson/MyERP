from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

# Existing models left intact above ... (this file is truncated in context)

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: Optional[str] = None
    avatar: Optional[str] = None
    company_id: Optional[str] = None
    created_at: Optional[datetime] = None

class QuickStats(BaseModel):
    sales_orders: float = 0
    purchase_orders: float = 0
    outstanding_amount: float = 0
    stock_value: float = 0

class Transaction(BaseModel):
    id: str
    type: str
    reference_number: str
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    amount: float = 0
    date: datetime
    status: str = "completed"

class Notification(BaseModel):
    id: str
    title: str
    message: Optional[str] = None
    type: str = "info"
    user_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime

class MonthlyReport(BaseModel):
    month: str
    sales: float
    purchases: float
    profit: float

# Customer Models
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str = "default_company"
    loyalty_points: Optional[float] = 0
    created_at: Optional[datetime] = None

# Supplier Models
class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None

# Item Models
class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    item_code: Optional[str] = None
    category: Optional[str] = None
    unit_price: float = 0
    stock_qty: Optional[int] = 0
    company_id: str = "default_company"
    created_at: Optional[datetime] = None

# Sales Order Models
class SalesOrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    rate: float
    amount: float

class SalesOrderCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    items: List[SalesOrderItem]
    discount_amount: Optional[float] = 0
    tax_rate: Optional[float] = 0
    company_id: Optional[str] = "default_company"

class SalesOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: str
    customer_name: Optional[str] = None
    items: List[SalesOrderItem]
    subtotal: float = 0
    discount_amount: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    status: str = "draft"  # draft, submitted, delivered, cancelled
    order_date: Optional[datetime] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Purchase Order Models
class PurchaseOrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    rate: float
    amount: float

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    supplier_name: Optional[str] = None
    items: List[PurchaseOrderItem]
    discount_amount: Optional[float] = 0
    tax_rate: Optional[float] = 0
    company_id: Optional[str] = "default_company"

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    supplier_id: str
    supplier_name: Optional[str] = None
    items: List[PurchaseOrderItem]
    subtotal: float = 0
    discount_amount: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    status: str = "draft"  # draft, submitted, received, cancelled
    order_date: Optional[datetime] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Sales Invoice Models
class SalesInvoiceItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    rate: float
    amount: float

class SalesInvoiceCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    items: List[SalesInvoiceItem]
    discount_amount: Optional[float] = 0
    tax_rate: Optional[float] = 0
    company_id: Optional[str] = "default_company"

class SalesInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    customer_id: str
    customer_name: Optional[str] = None
    items: List[SalesInvoiceItem]
    subtotal: float = 0
    discount_amount: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    status: str = "draft"  # draft, submitted, paid, cancelled
    invoice_date: Optional[datetime] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Quotation Models
class QuotationItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    rate: float
    amount: float

class QuotationCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    items: List[QuotationItem]
    discount_amount: Optional[float] = 0
    tax_rate: Optional[float] = 0
    company_id: Optional[str] = "default_company"

class Quotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quotation_number: str
    customer_id: str
    customer_name: Optional[str] = None
    items: List[QuotationItem]
    subtotal: float = 0
    discount_amount: float = 0
    tax_amount: float = 0
    total_amount: float = 0
    status: str = "draft"  # draft, sent, accepted, rejected
    quotation_date: Optional[datetime] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Financial Management Models

class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_code: str  # e.g., "1001", "2001", etc.
    account_name: str  # e.g., "Cash", "Accounts Receivable"
    account_type: str  # Asset, Liability, Income, Expense, Equity
    parent_account_id: Optional[str] = None  # For account hierarchy
    is_group: bool = False  # True if this is a group account (has children)
    account_balance: float = 0.0
    opening_balance: float = 0.0
    currency: str = "INR"
    is_active: bool = True
    root_type: str  # Asset, Liability, Equity, Income, Expense
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class JournalEntryAccount(BaseModel):
    account_id: str
    account_name: str
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    description: Optional[str] = None

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entry_number: str  # JE-2024-00001
    posting_date: datetime
    reference: Optional[str] = None
    description: str
    accounts: List[JournalEntryAccount]
    total_debit: float = 0.0
    total_credit: float = 0.0
    status: str = "draft"  # draft, posted, cancelled
    voucher_type: str = "Journal Entry"  # Journal Entry, Sales Invoice, Purchase Invoice, Payment, Receipt
    voucher_id: Optional[str] = None  # Link to source document (invoice, payment, etc.)
    is_auto_generated: bool = False
    company_id: str = "default_company"
    created_by: Optional[str] = None
    posted_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_number: str  # PAY-2024-00001
    payment_type: str  # Receive, Pay
    party_type: str  # Customer, Supplier
    party_id: str
    party_name: str
    payment_date: datetime
    amount: float
    payment_method: str  # Cash, Bank Transfer, Credit Card, Debit Card, UPI, Cheque
    reference_number: Optional[str] = None  # Bank reference, cheque number, UPI ref
    bank_account_id: Optional[str] = None
    currency: str = "INR"
    exchange_rate: float = 1.0
    base_amount: float  # Amount in company's base currency
    status: str = "draft"  # draft, submitted, paid, cancelled
    description: Optional[str] = None
    # Payment allocation to invoices
    allocated_invoices: Optional[List[dict]] = []  # [{"invoice_id": "x", "allocated_amount": 100}]
    unallocated_amount: float = 0.0
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class BankAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_name: str
    bank_name: str
    account_number: str
    account_type: str  # Current, Savings, Overdraft
    currency: str = "INR"
    opening_balance: float = 0.0
    current_balance: float = 0.0
    account_id: str  # Link to Chart of Accounts
    is_default: bool = False
    is_active: bool = True
    company_id: str = "default_company"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class BankTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bank_account_id: str
    transaction_date: datetime
    description: str
    reference_number: Optional[str] = None
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    balance: float = 0.0
    is_reconciled: bool = False
    reconciliation_date: Optional[datetime] = None
    matched_payment_id: Optional[str] = None
    company_id: str = "default_company"
    created_at: Optional[datetime] = None

class TaxRate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tax_name: str  # GST, VAT, Sales Tax
    tax_rate: float  # 18.0 for 18%
    tax_type: str  # GST, IGST, CGST, SGST, VAT
    tax_account_id: str  # Link to tax liability account
    is_active: bool = True
    company_id: str = "default_company"
    created_at: Optional[datetime] = None

class Currency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    currency_code: str  # INR, USD, EUR
    currency_name: str  # Indian Rupee
    symbol: str  # ₹, $, €
    exchange_rate: float = 1.0  # Rate against base currency
    is_base_currency: bool = False
    is_active: bool = True
    company_id: str = "default_company"
    updated_at: Optional[datetime] = None

class FinancialSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str = "default_company"
    base_currency: str = "INR"
    accounting_standard: str = "Indian GAAP"  # Indian GAAP, IFRS, US GAAP
    fiscal_year_start: str = "April"  # April, January
    # GST Settings
    gst_enabled: bool = True
    gstin: Optional[str] = None
    gst_categories: List[str] = ["Taxable", "Exempt", "Zero Rated", "Nil Rated"]
    default_gst_rate: float = 18.0
    # Multi-currency settings
    multi_currency_enabled: bool = False
    auto_exchange_rate_update: bool = False
    # Accounting settings
    enable_auto_journal_entries: bool = True
    require_payment_approval: bool = False
    enable_budget_control: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None