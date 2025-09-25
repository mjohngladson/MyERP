from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timedelta
from database import (
    transactions_collection,
    notifications_collection,
    sales_orders_collection,
    purchase_orders_collection,
    customers_collection,
    suppliers_collection,
    items_collection
)
from models import QuickStats, Transaction, Notification, MonthlyReport

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
        
        # Calculate outstanding amount from invoices where not paid
        try:
            from database import sales_invoices_collection as inv_coll
            inv_pipeline = [
                {"$match": {"status": {"$ne": "paid"}}},
                {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total_amount", 0]}}}}
            ]
            inv_result = await inv_coll.aggregate(inv_pipeline).to_list(1)
            outstanding = inv_result[0]["total"] if inv_result else 0
        except Exception:
            outstanding = sales_total * 0.15
        
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
async def get_recent_transactions(limit: int = 10, days_back: int = 2):
    """Get recent transactions from last 2 days, or last 10 if less than 10 found"""
    try:
        from database import sales_invoices_collection, purchase_invoices_collection, credit_notes_collection, debit_notes_collection, sales_orders_collection, purchase_orders_collection
        
        # Calculate date filter for last X days
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        all_transactions = []
        
        # Fetch Sales Invoices
        sales_invoices = await sales_invoices_collection.find({
            "created_at": {"$gte": cutoff_date}
        }).sort("created_at", -1).to_list(50)
        
        for invoice in sales_invoices:
            # Handle date fields properly
            invoice_date = invoice.get("invoice_date") or invoice.get("created_at") or datetime.utcnow()
            if isinstance(invoice_date, str) and invoice_date.strip() == "":
                invoice_date = datetime.utcnow()
            elif isinstance(invoice_date, str):
                try:
                    from dateutil.parser import parse
                    invoice_date = parse(invoice_date)
                except:
                    invoice_date = datetime.utcnow()
            
            created_at = invoice.get("created_at") or datetime.utcnow()
            if isinstance(created_at, str) and created_at.strip() == "":
                created_at = datetime.utcnow()
            elif isinstance(created_at, str):
                try:
                    from dateutil.parser import parse
                    created_at = parse(created_at)
                except:
                    created_at = datetime.utcnow()
            
            all_transactions.append({
                "id": invoice.get("id", str(invoice.get("_id"))),
                "type": "sales_invoice",
                "reference_number": invoice.get("invoice_number", "N/A"),
                "party_name": invoice.get("customer_name", "Unknown Customer"),
                "amount": invoice.get("total_amount", 0),
                "date": invoice_date,
                "status": invoice.get("status", "draft"),
                "created_at": created_at
            })
        
        # Fetch Purchase Invoices
        purchase_invoices = await purchase_invoices_collection.find({
            "created_at": {"$gte": cutoff_date}
        }).sort("created_at", -1).to_list(50)
        
        for invoice in purchase_invoices:
            all_transactions.append({
                "id": invoice.get("id", str(invoice.get("_id"))),
                "type": "purchase_invoice",
                "reference_number": invoice.get("invoice_number", "N/A"),
                "party_name": invoice.get("supplier_name", "Unknown Supplier"),
                "amount": invoice.get("total_amount", 0),
                "date": invoice.get("invoice_date", invoice.get("created_at")),
                "status": invoice.get("status", "draft"),
                "created_at": invoice.get("created_at", datetime.utcnow().isoformat())
            })
        
        # Fetch Credit Notes
        credit_notes = await credit_notes_collection.find({
            "created_at": {"$gte": cutoff_date}
        }).sort("created_at", -1).to_list(50)
        
        for note in credit_notes:
            all_transactions.append({
                "id": note.get("id", str(note.get("_id"))),
                "type": "credit_note",
                "reference_number": note.get("credit_note_number", "N/A"),
                "party_name": note.get("customer_name", "Unknown Customer"),
                "amount": note.get("total_amount", 0),
                "date": note.get("credit_note_date", note.get("created_at")),
                "status": note.get("status", "draft"),
                "created_at": note.get("created_at", datetime.utcnow().isoformat())
            })
        
        # Fetch Debit Notes
        debit_notes = await debit_notes_collection.find({
            "created_at": {"$gte": cutoff_date}
        }).sort("created_at", -1).to_list(50)
        
        for note in debit_notes:
            all_transactions.append({
                "id": note.get("id", str(note.get("_id"))),
                "type": "debit_note",
                "reference_number": note.get("debit_note_number", "N/A"),
                "party_name": note.get("supplier_name", "Unknown Supplier"),
                "amount": note.get("total_amount", 0),
                "date": note.get("debit_note_date", note.get("created_at")),
                "status": note.get("status", "draft"),
                "created_at": note.get("created_at", datetime.utcnow().isoformat())
            })
        
        # If we have less than 10 transactions from last 2 days, get the last 10 regardless of date
        if len(all_transactions) < limit:
            # Fetch more from all collections without date filter
            additional_sales = await sales_invoices_collection.find().sort("created_at", -1).to_list(limit)
            additional_purchases = await purchase_invoices_collection.find().sort("created_at", -1).to_list(limit)
            additional_credit = await credit_notes_collection.find().sort("created_at", -1).to_list(limit)
            additional_debit = await debit_notes_collection.find().sort("created_at", -1).to_list(limit)
            
            # Add additional transactions if not already in the list
            existing_ids = {t["id"] for t in all_transactions}
            
            for invoice in additional_sales:
                if invoice.get("id", str(invoice.get("_id"))) not in existing_ids:
                    all_transactions.append({
                        "id": invoice.get("id", str(invoice.get("_id"))),
                        "type": "sales_invoice",
                        "reference_number": invoice.get("invoice_number", "N/A"),
                        "party_name": invoice.get("customer_name", "Unknown Customer"),
                        "amount": invoice.get("total_amount", 0),
                        "date": invoice.get("invoice_date", invoice.get("created_at")),
                        "status": invoice.get("status", "draft"),
                        "created_at": invoice.get("created_at", datetime.utcnow().isoformat())
                    })
        
        # Sort all transactions by created_at descending
        all_transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Limit to requested number
        return all_transactions[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")

@router.get("/transactions/all")
async def get_all_transactions(days_back: int = 2, limit: int = 50):
    """Get all transactions for View All modal - last 2 days or last 10 transactions"""
    try:
        from database import sales_invoices_collection, purchase_invoices_collection, credit_notes_collection, debit_notes_collection
        
        # Calculate date filter for last X days
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        all_transactions = []
        
        # Fetch all transaction types from last X days
        collections_config = [
            (sales_invoices_collection, "sales_invoice", "invoice_number", "customer_name", "invoice_date"),
            (purchase_invoices_collection, "purchase_invoice", "invoice_number", "supplier_name", "invoice_date"),
            (credit_notes_collection, "credit_note", "credit_note_number", "customer_name", "credit_note_date"),
            (debit_notes_collection, "debit_note", "debit_note_number", "supplier_name", "debit_note_date")
        ]
        
        for collection, type_name, number_field, party_field, date_field in collections_config:
            documents = await collection.find({
                "created_at": {"$gte": cutoff_date}
            }).sort("created_at", -1).to_list(100)
            
            for doc in documents:
                all_transactions.append({
                    "id": doc.get("id", str(doc.get("_id"))),
                    "type": type_name,
                    "reference_number": doc.get(number_field, "N/A"),
                    "party_name": doc.get(party_field, "Unknown"),
                    "amount": doc.get("total_amount", 0),
                    "date": doc.get(date_field, doc.get("created_at")),
                    "status": doc.get("status", "draft"),
                    "created_at": doc.get("created_at", datetime.utcnow().isoformat())
                })
        
        # If less than 10 found in last 2 days, get last 10 regardless of date
        if len(all_transactions) < 10:
            for collection, type_name, number_field, party_field, date_field in collections_config:
                additional_docs = await collection.find().sort("created_at", -1).to_list(10)
                existing_ids = {t["id"] for t in all_transactions}
                
                for doc in additional_docs:
                    doc_id = doc.get("id", str(doc.get("_id")))
                    if doc_id not in existing_ids:
                        all_transactions.append({
                            "id": doc_id,
                            "type": type_name,
                            "reference_number": doc.get(number_field, "N/A"),
                            "party_name": doc.get(party_field, "Unknown"),
                            "amount": doc.get("total_amount", 0),
                            "date": doc.get(date_field, doc.get("created_at")),
                            "status": doc.get("status", "draft"),
                            "created_at": doc.get("created_at", datetime.utcnow().isoformat())
                        })
                        
                        if len(all_transactions) >= 10:
                            break
        
        # Sort by created_at descending
        all_transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {
            "transactions": all_transactions[:limit],
            "total": len(all_transactions),
            "days_back": days_back,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching all transactions: {str(e)}")

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