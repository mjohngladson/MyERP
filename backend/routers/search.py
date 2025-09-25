from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from models import Customer, Supplier, Item, SalesOrder, PurchaseOrder, Transaction
from database import db
import re

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/global")
async def global_search(
    query: str = Query(..., description="Search query string"),
    limit: int = Query(20, description="Maximum number of results to return"),
    category: Optional[str] = Query(None, description="Filter by category: customers, suppliers, items, sales_orders, purchase_orders, transactions")
):
    """
    Global search across all ERP modules
    Returns unified search results with relevance scoring
    """
    if not query or len(query.strip()) < 2:
        return {
            "query": query,
            "total_results": 0,
            "results": [],
            "categories": {}
        }
    
    search_term = query.strip()
    # Create case-insensitive regex pattern
    pattern = re.compile(search_term, re.IGNORECASE)
    
    results = []
    categories = {
        "customers": 0,
        "suppliers": 0, 
        "items": 0,
        "sales_orders": 0,
        "quotations": 0,
        "invoices": 0,
        "purchase_orders": 0,
        "purchase_invoices": 0,
        "credit_notes": 0,
        "debit_notes": 0,
        "transactions": 0
    }
    
    per = limit  # fetch up to 'limit' per category, trim overall later

    # Search customers if not filtered by category or if category is customers
    if not category or category == "customers":
        customer_cursor = db.customers.find({
            "$or": [
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}}
            ]
        }).limit(per)
        
        async for customer in customer_cursor:
            results.append({
                "id": customer.get("id") or str(customer.get("_id")),
                "type": "customer",
                "title": customer.get("name", "Customer"),
                "subtitle": customer.get("email", ""),
                "description": customer.get("phone", ""),
                "url": f"/sales/customers/{customer.get('id')}",
                "relevance": calculate_relevance(search_term, customer.get("name", ""))
            })
            categories["customers"] += 1
    
    # Search suppliers
    if not category or category == "suppliers":
        supplier_cursor = db.suppliers.find({
            "$or": [
                {"name": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
                {"phone": {"$regex": pattern}}
            ]
        }).limit(limit // 6 if not category else limit)
        
        async for supplier in supplier_cursor:
            results.append({
                "id": supplier["id"],
                "type": "supplier",
                "title": supplier["name"],
                "subtitle": supplier.get("email", ""),
                "description": supplier.get("phone", ""),
                "url": f"/buying/suppliers/{supplier['id']}",
                "relevance": calculate_relevance(search_term, supplier["name"])
            })
            categories["suppliers"] += 1
    
    # Search items
    if not category or category == "items":
        item_cursor = db.items.find({
            "$or": [
                {"name": {"$regex": pattern}},
                {"item_code": {"$regex": pattern}},
                {"description": {"$regex": pattern}}
            ]
        }).limit(limit // 6 if not category else limit)
        
        async for item in item_cursor:
            results.append({
                "id": item["id"],
                "type": "item",
                "title": item["name"],
                "subtitle": f"Code: {item.get('item_code', 'N/A')}",
                "description": f"₹{item.get('unit_price', 0)} - Stock: {item.get('stock_qty', 0)}",
                "url": f"/stock/items/{item['id']}",
                "relevance": calculate_relevance(search_term, item["name"])
            })
            categories["items"] += 1
    
    # Search sales orders
    if not category or category == "sales_orders":
        # Allow space-insensitive search like "SO 2025 0924" matching "SO-20250924..."
        normalized = re.sub(r"[^A-Za-z0-9]", "", search_term)
        pattern_order = re.compile(normalized, re.IGNORECASE)
        sales_order_cursor = db.sales_orders.find({
            "$or": [
                {"order_number": {"$regex": pattern}},
                {"order_number": {"$regex": pattern_order}},
                {"customer_name": {"$regex": pattern}}
            ]
        }).limit(per)
        
        async for order in sales_order_cursor:
            results.append({
                "id": order.get("id") or str(order.get("_id")),
                "type": "sales_order",
                "title": f"Sales Order {order.get('order_number','')}",
                "subtitle": order.get("customer_name", ""),
                "description": f"₹{order.get('total_amount', 0)} - {order.get('status', 'draft')}",
                "url": f"/sales/orders/{order.get('id')}",
                "relevance": calculate_relevance(search_term, order.get("order_number", ""))
            })
            categories["sales_orders"] += 1
    
    # Search invoices
    if not category or category == "invoices":
        invoice_cursor = db.sales_invoices.find({
            "$or": [
                {"invoice_number": {"$regex": pattern}},
                {"customer_name": {"$regex": pattern}}
            ]
        }).limit(limit // 6 if not category else limit)
        async for inv in invoice_cursor:
            results.append({
                "id": inv["id"],
                "type": "invoice",
                "title": f"Invoice {inv['invoice_number']}",
                "subtitle": inv.get("customer_name", ""),
                "description": f"₹{inv.get('total_amount', 0)} - {inv.get('status', 'draft')}",
                "url": f"/sales/invoices/{inv['id']}",
                "relevance": calculate_relevance(search_term, inv["invoice_number"])
            })
            categories["invoices"] += 1

    # Search quotations
    if not category or category == "quotations":
        quotation_cursor = db.quotations.find({
            "$or": [
                {"quotation_number": {"$regex": pattern}},
                {"customer_name": {"$regex": pattern}}
            ]
        }).limit(limit // 10 if not category else limit)
        
        async for quotation in quotation_cursor:
            results.append({
                "id": quotation.get("id") or str(quotation.get("_id")),
                "type": "quotation",
                "title": f"Quotation {quotation.get('quotation_number','')}",
                "subtitle": quotation.get("customer_name", ""),
                "description": f"₹{quotation.get('total_amount', 0)} - {quotation.get('status', 'draft')}",
                "url": f"/sales/quotations/{quotation.get('id')}",
                "relevance": calculate_relevance(search_term, quotation.get("quotation_number", ""))
            })
            categories["quotations"] = categories.get("quotations", 0) + 1

    # Search purchase orders
    if not category or category == "purchase_orders":
        purchase_order_cursor = db.purchase_orders.find({
            "$or": [
                {"order_number": {"$regex": pattern}},
                {"supplier_name": {"$regex": pattern}}
            ]
        }).limit(limit // 10 if not category else limit)
        
        async for order in purchase_order_cursor:
            results.append({
                "id": order["id"],
                "type": "purchase_order",
                "title": f"Purchase Order {order['order_number']}",
                "subtitle": order.get("supplier_name", ""),
                "description": f"₹{order.get('total_amount', 0)} - {order.get('status', 'draft')}",
                "url": f"/buying/orders/{order['id']}",
                "relevance": calculate_relevance(search_term, order["order_number"])
            })
            categories["purchase_orders"] += 1
    
    # Search purchase invoices
    if not category or category == "purchase_invoices":
        purchase_invoice_cursor = db.purchase_invoices.find({
            "$or": [
                {"invoice_number": {"$regex": pattern}},
                {"supplier_name": {"$regex": pattern}}
            ]
        }).limit(limit // 10 if not category else limit)
        
        async for invoice in purchase_invoice_cursor:
            results.append({
                "id": invoice.get("id") or str(invoice.get("_id")),
                "type": "purchase_invoice",
                "title": f"Purchase Invoice {invoice.get('invoice_number','')}",
                "subtitle": invoice.get("supplier_name", ""),
                "description": f"₹{invoice.get('total_amount', 0)} - {invoice.get('status', 'draft')}",
                "url": f"/buying/purchase-invoices/{invoice.get('id')}",
                "relevance": calculate_relevance(search_term, invoice.get("invoice_number", ""))
            })
            categories["purchase_invoices"] = categories.get("purchase_invoices", 0) + 1

    # Search credit notes
    if not category or category == "credit_notes":
        credit_note_cursor = db.credit_notes.find({
            "$or": [
                {"credit_note_number": {"$regex": pattern}},
                {"customer_name": {"$regex": pattern}}
            ]
        }).limit(limit // 10 if not category else limit)
        
        async for note in credit_note_cursor:
            results.append({
                "id": note.get("id") or str(note.get("_id")),
                "type": "credit_note",
                "title": f"Credit Note {note.get('credit_note_number','')}",
                "subtitle": note.get("customer_name", ""),
                "description": f"₹{note.get('total_amount', 0)} - {note.get('reason', 'Return')}",
                "url": f"/sales/credit-notes/{note.get('id')}",
                "relevance": calculate_relevance(search_term, note.get("credit_note_number", ""))
            })
            categories["credit_notes"] = categories.get("credit_notes", 0) + 1

    # Search debit notes
    if not category or category == "debit_notes":
        debit_note_cursor = db.debit_notes.find({
            "$or": [
                {"debit_note_number": {"$regex": pattern}},
                {"supplier_name": {"$regex": pattern}}
            ]
        }).limit(limit // 10 if not category else limit)
        
        async for note in debit_note_cursor:
            results.append({
                "id": note.get("id") or str(note.get("_id")),
                "type": "debit_note",
                "title": f"Debit Note {note.get('debit_note_number','')}",
                "subtitle": note.get("supplier_name", ""),
                "description": f"₹{note.get('total_amount', 0)} - {note.get('reason', 'Return')}",
                "url": f"/buying/debit-notes/{note.get('id')}",
                "relevance": calculate_relevance(search_term, note.get("debit_note_number", ""))
            })
            categories["debit_notes"] = categories.get("debit_notes", 0) + 1
    
    # Search transactions
    if not category or category == "transactions":
        transaction_cursor = db.transactions.find({
            "$or": [
                {"reference_number": {"$regex": pattern}},
                {"party_name": {"$regex": pattern}}
            ]
        }).limit(limit // 6 if not category else limit)
        
        async for transaction in transaction_cursor:
            results.append({
                "id": transaction["id"],
                "type": "transaction",
                "title": f"{transaction['type'].replace('_', ' ').title()} {transaction['reference_number']}",
                "subtitle": transaction.get("party_name", ""),
                "description": f"₹{transaction.get('amount', 0)} - {transaction.get('status', 'completed')}",
                "url": f"/accounts/transactions/{transaction['id']}",
                "relevance": calculate_relevance(search_term, transaction["reference_number"])
            })
            categories["transactions"] += 1
    
    # Sort results by relevance score (highest first)
    results.sort(key=lambda x: x["relevance"], reverse=True)
    
    # Limit total results
    if len(results) > limit:
        results = results[:limit]
    
    return {
        "query": query,
        "total_results": len(results),
        "results": results,
        "categories": categories
    }

@router.get("/suggestions")
async def search_suggestions(
    query: str = Query(..., description="Search query for suggestions"),
    limit: int = Query(8, description="Maximum number of suggestions")
):
    """
    Get search suggestions for autocomplete
    Returns quick suggestions based on popular searches
    """
    if not query or len(query.strip()) < 1:
        return {"suggestions": []}
    
    search_term = query.strip()
    pattern = re.compile(search_term, re.IGNORECASE)
    
    suggestions = []
    
    # Get customer name suggestions
    customer_cursor = db.customers.find(
        {"name": {"$regex": pattern}},
        {"name": 1, "_id": 0}
    ).limit(3)
    
    async for customer in customer_cursor:
        suggestions.append({
            "text": customer["name"],
            "type": "customer",
            "category": "Customers"
        })
    
    # Get item name suggestions
    item_cursor = db.items.find(
        {"name": {"$regex": pattern}},
        {"name": 1, "_id": 0}
    ).limit(3)
    
    async for item in item_cursor:
        suggestions.append({
            "text": item["name"],
            "type": "item", 
            "category": "Items"
        })
    
    # Get supplier name suggestions
    supplier_cursor = db.suppliers.find(
        {"name": {"$regex": pattern}},
        {"name": 1, "_id": 0}
    ).limit(2)
    
    async for supplier in supplier_cursor:
        suggestions.append({
            "text": supplier["name"],
            "type": "supplier",
            "category": "Suppliers"
        })
    
    # Limit total suggestions
    suggestions = suggestions[:limit]
    
    return {"suggestions": suggestions}

def calculate_relevance(search_term: str, text: str) -> float:
    """
    Calculate relevance score for search results
    Higher score = more relevant
    """
    if not text:
        return 0.0
    
    search_lower = search_term.lower()
    text_lower = text.lower()
    
    # Exact match gets highest score
    if search_lower == text_lower:
        return 1.0
    
    # Starts with search term gets high score
    if text_lower.startswith(search_lower):
        return 0.8
    
    # Contains search term gets medium score
    if search_lower in text_lower:
        return 0.6
    
    # Word boundaries match gets lower score
    words = text_lower.split()
    for word in words:
        if word.startswith(search_lower):
            return 0.4
        if search_lower in word:
            return 0.2
    
    return 0.0