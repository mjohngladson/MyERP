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