from fastapi import APIRouter, HTTPException
from typing import List
from database import sales_invoices_collection, customers_collection
from models import SalesInvoice, SalesInvoiceCreate
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

@router.get("/", response_model=List[SalesInvoice])
async def get_sales_invoices(limit: int = 20):
    """Get sales invoices"""
    try:
        cursor = sales_invoices_collection.find().sort("created_at", -1).limit(limit)
        invoices = await cursor.to_list(length=limit)
        
        # Transform data to match SalesInvoice model
        transformed_invoices = []
        for invoice in invoices:
            try:
                # Convert MongoDB ObjectId to string
                if "_id" in invoice:
                    invoice["id"] = str(invoice["_id"])
                    del invoice["_id"]
                
                # Ensure required fields exist with defaults
                if not invoice.get("invoice_number"):
                    invoice_id = invoice.get('id', str(uuid.uuid4())[:8])
                    invoice["invoice_number"] = f"SINV-{invoice_id[:8]}"
                
                # Handle customer_id - ensure it's a valid string
                if not invoice.get("customer_id") or invoice.get("customer_id") is None:
                    invoice["customer_id"] = "default_customer"
                else:
                    invoice["customer_id"] = str(invoice["customer_id"])
                    
                invoice.setdefault("customer_name", "Unknown Customer")
                invoice.setdefault("total_amount", 0.0)
                invoice.setdefault("status", "submitted")
                invoice.setdefault("items", [])
                invoice.setdefault("company_id", "default_company")
                invoice.setdefault("subtotal", 0.0)
                invoice.setdefault("tax_amount", 0.0)
                invoice.setdefault("discount_amount", 0.0)
                
                # Ensure items have proper structure
                fixed_items = []
                for item in invoice.get("items", []):
                    fixed_item = {
                        "item_id": item.get("item_id", item.get("product_id", "unknown")),
                        "item_name": item.get("item_name", item.get("product_name", "Unknown Item")),
                        "quantity": item.get("quantity", 0),
                        "rate": item.get("rate", item.get("unit_price", 0.0)),
                        "amount": item.get("amount", item.get("line_total", 0.0))
                    }
                    fixed_items.append(fixed_item)
                
                invoice["items"] = fixed_items
                
                transformed_invoices.append(SalesInvoice(**invoice))
            except Exception as item_error:
                # Skip invalid invoices and continue
                print(f"Skipping invalid invoice: {item_error}")
                continue
        
        return transformed_invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales invoices: {str(e)}")

@router.post("/", response_model=SalesInvoice)
async def create_sales_invoice(invoice_data: SalesInvoiceCreate):
    """Create a new sales invoice"""
    try:
        # Get customer details
        customer = await customers_collection.find_one({"id": invoice_data.customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Generate invoice number
        invoice_count = await sales_invoices_collection.count_documents({})
        invoice_number = f"SINV-2024-{invoice_count + 1:05d}"
        
        # Create sales invoice
        sales_invoice = SalesInvoice(
            invoice_number=invoice_number,
            customer_id=invoice_data.customer_id,
            customer_name=customer["name"],
            total_amount=invoice_data.total_amount,
            due_date=invoice_data.due_date,
            items=invoice_data.items,
            company_id=invoice_data.company_id,
            subtotal=invoice_data.subtotal,
            tax_amount=invoice_data.tax_amount,
            discount_amount=invoice_data.discount_amount
        )
        
        # Insert into database
        await sales_invoices_collection.insert_one(sales_invoice.dict())
        
        return sales_invoice
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sales invoice: {str(e)}")

@router.get("/raw")
async def get_raw_sales_invoices(limit: int = 5):
    """Get raw sales invoices for debugging"""
    try:
        cursor = sales_invoices_collection.find().sort("created_at", -1).limit(limit)
        invoices = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string for JSON serialization
        for invoice in invoices:
            if "_id" in invoice:
                invoice["_id"] = str(invoice["_id"])
        
        return {"invoices": invoices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching raw sales invoices: {str(e)}")