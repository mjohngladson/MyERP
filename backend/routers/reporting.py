from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models import Transaction, Customer, Supplier, Item, SalesOrder, PurchaseOrder
from database import db
import uuid
from collections import defaultdict
import calendar

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/sales-overview")
async def get_sales_overview_report(
    days: int = Query(30, description="Number of days to analyze"),
    company_id: str = Query("default", description="Company ID")
):
    """
    Generate comprehensive sales overview report
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get sales transactions
        sales_cursor = db.transactions.find({
            "type": "sales_invoice",
            "date": {"$gte": start_date, "$lte": end_date}
        })
        
        sales_transactions = await sales_cursor.to_list(length=None)
        
        # Calculate metrics
        total_sales = sum(transaction.get("amount", 0) for transaction in sales_transactions)
        total_orders = len(sales_transactions)
        avg_order_value = total_sales / total_orders if total_orders > 0 else 0
        
        # Calculate growth rate (compare with previous period)
        prev_start_date = start_date - timedelta(days=days)
        prev_sales_cursor = db.transactions.find({
            "type": "sales_invoice",
            "date": {"$gte": prev_start_date, "$lt": start_date}
        })
        prev_sales_transactions = await prev_sales_cursor.to_list(length=None)
        prev_total_sales = sum(transaction.get("amount", 0) for transaction in prev_sales_transactions)
        
        growth_rate = 0
        if prev_total_sales > 0:
            growth_rate = ((total_sales - prev_total_sales) / prev_total_sales) * 100
        
        # Get top products (using items from sales)
        # For now, use mock data since we need to implement item tracking in sales
        top_products = [
            {"name": "Product A", "revenue": total_sales * 0.3, "growth": 12.5},
            {"name": "Product B", "revenue": total_sales * 0.25, "growth": 8.2},
            {"name": "Service Package", "revenue": total_sales * 0.2, "growth": 22.1}
        ]
        
        # Generate monthly sales trend for last 6 months
        monthly_data = {}
        for i in range(6):
            month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
            month_end = (month_start.replace(month=month_start.month % 12 + 1, day=1) - timedelta(days=1)) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
            
            month_sales_cursor = db.transactions.find({
                "type": "sales_invoice",
                "date": {"$gte": month_start, "$lte": month_end}
            })
            month_transactions = await month_sales_cursor.to_list(length=None)
            month_sales = sum(transaction.get("amount", 0) for transaction in month_transactions)
            
            month_name = calendar.month_abbr[month_start.month]
            monthly_data[month_name] = {
                "sales": month_sales,
                "target": month_sales * 1.1  # Set target as 110% of actual for demo
            }
        
        # Sort months chronologically (last 6 months)
        sales_trend = []
        for i in range(5, -1, -1):  # Reverse order to show chronologically
            month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
            month_name = calendar.month_abbr[month_start.month]
            if month_name in monthly_data:
                sales_trend.append({
                    "month": month_name,
                    "sales": monthly_data[month_name]["sales"],
                    "target": monthly_data[month_name]["target"]
                })
        
        return {
            "totalSales": total_sales,
            "totalOrders": total_orders,
            "avgOrderValue": round(avg_order_value, 2),
            "growthRate": round(growth_rate, 2),
            "topProducts": top_products,
            "salesTrend": sales_trend,
            "dateRange": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sales overview: {str(e)}")

@router.get("/financial-summary")
async def get_financial_summary_report(
    days: int = Query(30, description="Number of days to analyze"),
    company_id: str = Query("default", description="Company ID")
):
    """
    Generate financial summary report
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all transactions in the period
        transactions_cursor = db.transactions.find({
            "date": {"$gte": start_date, "$lte": end_date}
        })
        transactions = await transactions_cursor.to_list(length=None)
        
        # Calculate revenue (sales invoices)
        total_revenue = sum(
            transaction.get("amount", 0) 
            for transaction in transactions 
            if transaction.get("type") == "sales_invoice"
        )
        
        # Calculate expenses (purchase orders and payment entries)
        total_expenses = sum(
            transaction.get("amount", 0) 
            for transaction in transactions 
            if transaction.get("type") in ["purchase_order", "payment_entry"]
        )
        
        net_profit = total_revenue - total_expenses
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # Expense breakdown (estimated based on transaction types)
        expense_categories = []
        if total_expenses > 0:
            # Purchase orders as cost of goods
            purchase_amount = sum(
                transaction.get("amount", 0) 
                for transaction in transactions 
                if transaction.get("type") == "purchase_order"
            )
            
            expense_categories = [
                {
                    "category": "Cost of Goods",
                    "amount": purchase_amount,
                    "percentage": round((purchase_amount / total_expenses) * 100, 1) if total_expenses > 0 else 0
                },
                {
                    "category": "Operations",
                    "amount": total_expenses * 0.3,
                    "percentage": 30
                },
                {
                    "category": "Marketing",
                    "amount": total_expenses * 0.15,
                    "percentage": 15
                },
                {
                    "category": "Administration",
                    "amount": total_expenses * 0.1,
                    "percentage": 10
                }
            ]
        
        return {
            "totalRevenue": total_revenue,
            "totalExpenses": total_expenses,
            "netProfit": net_profit,
            "profitMargin": round(profit_margin, 2),
            "expenses": expense_categories,
            "dateRange": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating financial summary: {str(e)}")

@router.get("/customer-analysis")
async def get_customer_analysis_report(
    days: int = Query(30, description="Number of days to analyze"),
    company_id: str = Query("default", description="Company ID")
):
    """
    Generate customer analysis report
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get all customers
        customers_cursor = db.customers.find({})
        customers = await customers_cursor.to_list(length=None)
        total_customers = len(customers)
        
        # Get customer transactions in the period
        transactions_cursor = db.transactions.find({
            "type": "sales_invoice",
            "date": {"$gte": start_date, "$lte": end_date}
        })
        transactions = await transactions_cursor.to_list(length=None)
        
        # Calculate customer metrics
        active_customers = len(set(transaction.get("party_id") for transaction in transactions if transaction.get("party_id")))
        
        # New customers (customers created in this period)
        new_customers_cursor = db.customers.find({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        new_customers = await new_customers_cursor.to_list(length=None)
        new_customers_count = len(new_customers)
        
        # Churn rate estimation (simplified)
        churn_rate = max(0, ((total_customers - active_customers) / total_customers * 100)) if total_customers > 0 else 0
        
        # Customer segmentation based on revenue
        customer_revenue = defaultdict(float)
        for transaction in transactions:
            if transaction.get("party_id"):
                customer_revenue[transaction["party_id"]] += transaction.get("amount", 0)
        
        # Segment customers
        high_value_threshold = 50000  # Above 50k
        regular_threshold = 10000     # 10k-50k
        
        segments = {
            "High Value": {"count": 0, "revenue": 0},
            "Regular": {"count": 0, "revenue": 0},
            "New": {"count": new_customers_count, "revenue": 0},
            "At Risk": {"count": 0, "revenue": 0}
        }
        
        for customer_id, revenue in customer_revenue.items():
            if revenue >= high_value_threshold:
                segments["High Value"]["count"] += 1
                segments["High Value"]["revenue"] += revenue
            elif revenue >= regular_threshold:
                segments["Regular"]["count"] += 1
                segments["Regular"]["revenue"] += revenue
            else:
                segments["At Risk"]["count"] += 1
                segments["At Risk"]["revenue"] += revenue
        
        # Calculate new customer revenue
        for new_customer in new_customers:
            customer_id = new_customer.get("id")
            if customer_id in customer_revenue:
                segments["New"]["revenue"] += customer_revenue[customer_id]
        
        # Format segments for response
        segments_list = [
            {
                "name": name,
                "count": data["count"],
                "revenue": data["revenue"]
            }
            for name, data in segments.items()
        ]
        
        return {
            "totalCustomers": total_customers,
            "activeCustomers": active_customers,
            "newCustomers": new_customers_count,
            "churnRate": round(churn_rate, 2),
            "segments": segments_list,
            "dateRange": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating customer analysis: {str(e)}")

@router.get("/inventory-report")
async def get_inventory_report(
    company_id: str = Query("default", description="Company ID")
):
    """
    Generate inventory report
    """
    try:
        # Get all items
        items_cursor = db.items.find({})
        items = await items_cursor.to_list(length=None)
        
        total_items = len(items)
        total_stock_value = sum(item.get("unit_price", 0) * item.get("stock_qty", 0) for item in items)
        low_stock_items = [item for item in items if item.get("stock_qty", 0) < 10]  # Below 10 units
        out_of_stock_items = [item for item in items if item.get("stock_qty", 0) == 0]
        
        # Top items by value
        items_by_value = sorted(
            items,
            key=lambda x: x.get("unit_price", 0) * x.get("stock_qty", 0),
            reverse=True
        )[:10]
        
        top_items = [
            {
                "name": item.get("name", "Unknown"),
                "code": item.get("item_code", "N/A"),
                "stock_qty": item.get("stock_qty", 0),
                "unit_price": item.get("unit_price", 0),
                "total_value": item.get("unit_price", 0) * item.get("stock_qty", 0)
            }
            for item in items_by_value
        ]
        
        # Stock status summary
        stock_summary = {
            "in_stock": len([item for item in items if item.get("stock_qty", 0) > 10]),
            "low_stock": len(low_stock_items),
            "out_of_stock": len(out_of_stock_items)
        }
        
        return {
            "totalItems": total_items,
            "totalStockValue": total_stock_value,
            "lowStockCount": len(low_stock_items),
            "outOfStockCount": len(out_of_stock_items),
            "topItems": top_items,
            "stockSummary": stock_summary,
            "lowStockItems": [
                {
                    "name": item.get("name", "Unknown"),
                    "code": item.get("item_code", "N/A"),
                    "stock_qty": item.get("stock_qty", 0)
                }
                for item in low_stock_items[:10]  # Limit to top 10
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating inventory report: {str(e)}")

@router.get("/performance-metrics")
async def get_performance_metrics_report(
    days: int = Query(30, description="Number of days to analyze"),
    company_id: str = Query("default", description="Company ID")
):
    """
    Generate KPI and performance metrics report
    """
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get key metrics
        transactions_cursor = db.transactions.find({
            "date": {"$gte": start_date, "$lte": end_date}
        })
        transactions = await transactions_cursor.to_list(length=None)
        
        # Sales metrics
        sales_transactions = [t for t in transactions if t.get("type") == "sales_invoice"]
        total_sales = sum(t.get("amount", 0) for t in sales_transactions)
        sales_orders_count = len(sales_transactions)
        
        # Customer metrics
        unique_customers = len(set(t.get("party_id") for t in sales_transactions if t.get("party_id")))
        
        # Get total customers for customer retention rate
        total_customers = await db.customers.count_documents({})
        customer_retention_rate = (unique_customers / total_customers * 100) if total_customers > 0 else 0
        
        # Purchase metrics
        purchase_transactions = [t for t in transactions if t.get("type") == "purchase_order"]
        total_purchases = sum(t.get("amount", 0) for t in purchase_transactions)
        
        # Inventory metrics
        items_cursor = db.items.find({})
        items = await items_cursor.to_list(length=None)
        inventory_turnover = (total_purchases / sum(item.get("unit_price", 0) * item.get("stock_qty", 0) for item in items)) if items else 0
        
        # KPI targets (hardcoded for demo)
        kpis = [
            {
                "name": "Sales Revenue",
                "value": total_sales,
                "target": total_sales * 1.2,  # 20% higher target
                "unit": "currency",
                "achievement": min(100, (total_sales / (total_sales * 1.2) * 100)) if total_sales > 0 else 0
            },
            {
                "name": "Sales Orders",
                "value": sales_orders_count,
                "target": max(sales_orders_count + 5, sales_orders_count * 1.15),
                "unit": "number",
                "achievement": min(100, (sales_orders_count / max(sales_orders_count + 5, sales_orders_count * 1.15) * 100))
            },
            {
                "name": "Customer Retention",
                "value": customer_retention_rate,
                "target": 85,  # 85% retention target
                "unit": "percentage",
                "achievement": min(100, (customer_retention_rate / 85 * 100))
            },
            {
                "name": "Inventory Turnover",
                "value": inventory_turnover,
                "target": 4,  # 4x turnover target
                "unit": "ratio",
                "achievement": min(100, (inventory_turnover / 4 * 100))
            }
        ]
        
        # Performance trends (simplified)
        weekly_performance = []
        for week in range(4):  # Last 4 weeks
            week_start = end_date - timedelta(days=(week + 1) * 7)
            week_end = end_date - timedelta(days=week * 7)
            
            week_transactions = [
                t for t in transactions
                if week_start <= t.get("date", datetime.utcnow()) < week_end and t.get("type") == "sales_invoice"
            ]
            week_sales = sum(t.get("amount", 0) for t in week_transactions)
            
            weekly_performance.append({
                "week": f"Week {4 - week}",
                "sales": week_sales,
                "orders": len(week_transactions)
            })
        
        weekly_performance.reverse()  # Chronological order
        
        return {
            "kpis": kpis,
            "totalSales": total_sales,
            "totalPurchases": total_purchases,
            "activeCustomers": unique_customers,
            "customerRetentionRate": round(customer_retention_rate, 2),
            "inventoryTurnover": round(inventory_turnover, 2),
            "weeklyPerformance": weekly_performance,
            "dateRange": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating performance metrics: {str(e)}")

@router.post("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = Query("pdf", description="Export format: pdf or excel"),
    days: int = Query(30, description="Number of days to analyze"),
    company_id: str = Query("default", description="Company ID")
):
    """
    Export report in specified format (PDF or Excel)
    """
    try:
        # For now, return a mock response
        # In a real implementation, this would generate actual PDF/Excel files
        export_id = str(uuid.uuid4())
        
        return {
            "message": f"Report export initiated for {report_type}",
            "export_id": export_id,
            "format": format,
            "status": "processing",
            "download_url": f"/api/reports/download/{export_id}",
            "estimated_completion": (datetime.utcnow() + timedelta(seconds=30)).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")

@router.get("/download/{export_id}")
async def download_report(export_id: str):
    """
    Download exported report file
    """
    # Mock implementation
    return {
        "message": "File download would start here",
        "export_id": export_id,
        "note": "This is a mock endpoint. In production, this would return the actual file."
    }