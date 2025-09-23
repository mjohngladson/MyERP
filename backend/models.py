from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
from enum import Enum

# Enums
class OrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    DELIVERED = "delivered"  # kept for backward compatibility
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"

class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    WON = "won"
    LOST = "lost"
    CANCELLED = "cancelled"

class TransactionType(str, Enum):
    SALES_INVOICE = "sales_invoice"
    PURCHASE_ORDER = "purchase_order"
    PAYMENT_ENTRY = "payment_entry"
    STOCK_ENTRY = "stock_entry"

class NotificationType(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INFO = "info"

# Base Model
class BaseGiLiModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ----------------------- Users/Companies (minimal) -----------------------
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str = "User"
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "User"

class UserLogin(BaseModel):
    email: str
    password: str

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CompanyCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

# ----------------------- Customers/Suppliers/Items (minimal) -----------------------
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SupplierCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_id: str

class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    item_code: str
    unit_price: float
    stock_qty: int = 0
    warehouse_id: Optional[str] = None
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    item_code: str
    unit_price: float
    stock_qty: int = 0
    warehouse_id: Optional[str] = None
    company_id: str

# ----------------------- Sales Invoice Models -----------------------
class SalesInvoiceItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    rate: float
    amount: float

class SalesInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    customer_id: str
    customer_name: str
    total_amount: float
    status: OrderStatus = OrderStatus.SUBMITTED
    invoice_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    items: List[SalesInvoiceItem] = []
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    # Financials
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    # PoS metadata
    pos_metadata: Optional[dict] = None

class SalesInvoiceCreate(BaseModel):
    customer_id: str
    total_amount: float
    due_date: Optional[datetime] = None
    items: List[SalesInvoiceItem] = []
    company_id: str
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0

# ----------------------- Sales Order Models -----------------------
class SalesOrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    rate: float
    amount: float

class SalesOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: str
    customer_name: str
    total_amount: float
    status: OrderStatus = OrderStatus.DRAFT
    order_date: datetime = Field(default_factory=datetime.utcnow)
    delivery_date: Optional[datetime] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    items: List[SalesOrderItem] = []
    # Financials
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SalesOrderCreate(BaseModel):
    customer_id: str
    total_amount: float
    delivery_date: Optional[datetime] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    items: List[SalesOrderItem] = []
    # Financials
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    company_id: str

# ----------------------- Purchase Order Models -----------------------
class PurchaseOrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    rate: float
    amount: float

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    supplier_id: str
    supplier_name: str
    total_amount: float
    status: OrderStatus = OrderStatus.DRAFT
    order_date: datetime = Field(default_factory=datetime.utcnow)
    expected_date: Optional[datetime] = None
    items: List[PurchaseOrderItem] = []
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    total_amount: float
    expected_date: Optional[datetime] = None
    items: List[PurchaseOrderItem] = []
    company_id: str

# ----------------------- Quotation Models -----------------------
class QuotationItem(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    rate: float
    amount: float

class Quotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quotation_number: str
    customer_id: str
    customer_name: str
    total_amount: float
    status: QuoteStatus = QuoteStatus.DRAFT
    quotation_date: datetime = Field(default_factory=datetime.utcnow)
    items: List[QuotationItem] = []
    # Financials
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class QuotationCreate(BaseModel):
    customer_id: str
    total_amount: float
    items: List[QuotationItem] = []
    # Financials
    subtotal: float = 0.0
    tax_rate: float = 18.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    company_id: str

# ----------------------- Transactions & Dashboard -----------------------
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: TransactionType
    reference_number: str
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    amount: float
    date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "completed"
    company_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    type: TransactionType
    reference_number: str
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    amount: float
    company_id: str

class QuickStats(BaseModel):
    sales_orders: float
    purchase_orders: float
    outstanding_amount: float
    stock_value: float

class MonthlyReport(BaseModel):
    month: str
    sales: float
    purchases: float
    profit: float

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: Optional[str] = None
    type: NotificationType = NotificationType.INFO
    user_id: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    title: str
    message: Optional[str] = None
    type: NotificationType = NotificationType.INFO
    user_id: str