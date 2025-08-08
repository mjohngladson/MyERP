from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timedelta
from ..database import (
    transactions_collection,
    notifications_collection,
    sales_orders_collection,
    purchase_orders_collection,
    customers_collection,
    suppliers_collection,
    items_collection
)
from ..models import QuickStats, Transaction, Notification, MonthlyReport

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=QuickStats)
async def get_dashboard_stats():
    """Get quick statistics for dashboard"""
    try:
        # Calculate total sales orders
        sales_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        sales_result = await sales_orders_collection.aggregate(sales_pipeline).to_list(1)
        sales_total = sales_result[0]["total"] if sales_result else 0
        
        # Calculate total purchase orders
        purchase_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        purchase_result = await purchase_orders_collection.aggregate(purchase_pipeline).to_list(1)
        purchase_total = purchase_result[0]["total"] if purchase_result else 0
        
        # Calculate outstanding amount (mock calculation)
        outstanding = sales_total * 0.15  # 15% of sales as outstanding
        
        # Calculate stock value
        stock_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$unit_price", "$stock_qty"]}}}}
        ]
        stock_result = await items_collection.aggregate(stock_pipeline).to_list(1)
        stock_value = stock_result[0]["total"] if stock_result else 0
        
        return QuickStats(
            sales_orders=sales_total,
            purchase_orders=purchase_total,
            outstanding_amount=outstanding,
            stock_value=stock_value
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

@router.get("/transactions", response_model=List[Transaction])
async def get_recent_transactions(limit: int = 10):
    """Get recent transactions"""
    try:
        cursor = transactions_collection.find().sort("created_at", -1).limit(limit)
        transactions = await cursor.to_list(length=limit)
        
        return [Transaction(**transaction) for transaction in transactions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(user_id: str, limit: int = 10):
    """Get user notifications"""
    try:
        cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        notifications = await cursor.to_list(length=limit)
        
        return [Notification(**notification) for notification in notifications]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")

@router.get("/reports", response_model=List[MonthlyReport])
async def get_monthly_reports():
    """Get monthly performance reports"""
    try:
        # Calculate monthly data for the last 6 months
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=180)  # 6 months
        
        monthly_data = []
        current_date = start_date
        
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        for i in range(6):
            month_start = current_date.replace(day=1)
            next_month = (month_start + timedelta(days=32)).replace(day=1)
            
            # Sales for the month
            sales_pipeline = [
                {"$match": {
                    "type": "sales_invoice",
                    "date": {"$gte": month_start, "$lt": next_month}
                }},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            sales_result = await transactions_collection.aggregate(sales_pipeline).to_list(1)
            sales = sales_result[0]["total"] if sales_result else 0
            
            # Purchases for the month
            purchase_pipeline = [
                {"$match": {
                    "type": "purchase_order",
                    "date": {"$gte": month_start, "$lt": next_month}
                }},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            purchase_result = await transactions_collection.aggregate(purchase_pipeline).to_list(1)
            purchases = purchase_result[0]["total"] if purchase_result else 0
            
            profit = sales - purchases
            
            monthly_data.append(MonthlyReport(
                month=months[month_start.month - 1],
                sales=sales,
                purchases=purchases,
                profit=profit
            ))
            
            current_date = next_month
        
        return monthly_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly reports: {str(e)}")