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

# Base Models
class BaseGiLiModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ... existing models omitted for brevity ...

# Quotation Models
class QuotationItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
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