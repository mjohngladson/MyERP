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