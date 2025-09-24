from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

# Existing models left intact above ... (this file is truncated in context)

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