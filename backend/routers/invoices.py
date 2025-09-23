from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_invoices_collection, customers_collection, items_collection
from models import SalesInvoice, SalesInvoiceCreate, SalesInvoiceItem
import uuid
from datetime import datetime, timedelta
from bson import ObjectId
import os

# Email service (SendGrid)
try:
    from services.email_service import SendGridEmailService, BRAND_PLACEHOLDER, generate_invoice_html
except Exception:
    SendGridEmailService = None

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

@router.get("/", response_model=List[dict])
async def get_sales_invoices(
    limit: int = Query(50, description="Number of invoices to return"),
    skip: int = Query(0, description="Number of invoices to skip"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer"),
    search: Optional[str] = Query(None, description="Search in invoice number or customer name")
):
    """Get sales invoices with filtering and pagination"""
    try:
        # Build query
        query = {}
        
        if status:
            query["status"] = status
            
        if customer_id:
            query["customer_id"] = customer_id
            
        if search:
            query["$or"] = [
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}}
            ]

        # Get total count
        total_count = await sales_invoices_collection.count_documents(query)
        
        # Get invoices
        cursor = sales_invoices_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        invoices = await cursor.to_list(length=limit)
        
        # Transform data
        transformed_invoices = []
        for invoice in invoices:
            try:
                # Convert MongoDB ObjectId to string
                if "_id" in invoice:
                    invoice["id"] = str(invoice["_id"])
                    del invoice["_id"]
                
                # Ensure required fields exist
                invoice.setdefault("invoice_number", f"INV-{str(uuid.uuid4())[:8]}")
                invoice.setdefault("customer_name", "Unknown Customer")
                invoice.setdefault("total_amount", 0.0)
                invoice.setdefault("status", "draft")
                invoice.setdefault("items", [])
                invoice.setdefault("subtotal", 0.0)
                invoice.setdefault("tax_amount", 0.0)
                invoice.setdefault("discount_amount", 0.0)
                
                # Fix items structure
                fixed_items = []
                for item in invoice.get("items", []):
                    fixed_item = {
                        "item_id": item.get("item_id", item.get("product_id", "unknown")),
                        "item_name": item.get("item_name", item.get("product_name", "Unknown Item")),
                        "description": item.get("description", ""),
                        "quantity": item.get("quantity", 0),
                        "rate": item.get("rate", item.get("unit_price", 0.0)),
                        "amount": item.get("amount", item.get("line_total", 0.0))
                    }
                    fixed_items.append(fixed_item)
                
                invoice["items"] = fixed_items
                
                # Add pagination metadata
                invoice["_meta"] = {
                    "total_count": total_count,
                    "current_page": (skip // limit) + 1,
                    "page_size": limit
                }
                
                transformed_invoices.append(invoice)
                
            except Exception as item_error:
                print(f"Error processing invoice: {item_error}")
                continue
        
        return transformed_invoices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales invoices: {str(e)}")

@router.get("/{invoice_id}")
async def get_sales_invoice(invoice_id: str):
    """Get a specific sales invoice"""
    try:
        # Try to find by custom id first, then by ObjectId
        invoice = await sales_invoices_collection.find_one({"id": invoice_id})
        if not invoice:
            try:
                invoice = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
            except:
                pass
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Transform data
        if "_id" in invoice:
            invoice["id"] = str(invoice["_id"])
            del invoice["_id"]
            
        return invoice
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching invoice: {str(e)}")

@router.post("/", response_model=dict)
async def create_sales_invoice(invoice_data: dict):
    """Create a new sales invoice"""
    try:
        # Generate invoice number if not provided
        if not invoice_data.get("invoice_number"):
            invoice_count = await sales_invoices_collection.count_documents({})
            invoice_data["invoice_number"] = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_count + 1:04d}"
        
        # Set default values
        invoice_data["id"] = str(uuid.uuid4())
        invoice_data["created_at"] = datetime.now()
        invoice_data["updated_at"] = datetime.now()
        
        # Validate customer
        if invoice_data.get("customer_id"):
            customer = await customers_collection.find_one({"id": invoice_data["customer_id"]})
            if customer:
                invoice_data["customer_name"] = customer["name"]
                invoice_data["customer_email"] = customer.get("email", "")
                invoice_data["customer_phone"] = customer.get("phone", "")
                invoice_data["customer_address"] = customer.get("address", "")
        
        # Validate and process items
        processed_items = []
        for item in invoice_data.get("items", []):
            processed_item = {
                "item_id": item.get("item_id", ""),
                "item_name": item.get("item_name", ""),
                "description": item.get("description", ""),
                "quantity": float(item.get("quantity", 0)),
                "rate": float(item.get("rate", 0)),
                "amount": float(item.get("amount", 0))
            }
            
            # Get item details if item_id provided
            if processed_item["item_id"]:
                db_item = await items_collection.find_one({"id": processed_item["item_id"]})
                if db_item:
                    processed_item["item_name"] = db_item["name"]
                    if not processed_item["rate"]:
                        processed_item["rate"] = float(db_item.get("price", 0))
            
            # Calculate amount
            processed_item["amount"] = processed_item["quantity"] * processed_item["rate"]
            processed_items.append(processed_item)
        
        invoice_data["items"] = processed_items
        
        # Calculate totals
        subtotal = sum(item["amount"] for item in processed_items)
        discount_amount = float(invoice_data.get("discount_amount", 0))
        tax_rate = float(invoice_data.get("tax_rate", 18))
        
        discounted_subtotal = subtotal - discount_amount
        tax_amount = (discounted_subtotal * tax_rate) / 100
        total_amount = discounted_subtotal + tax_amount
        
        invoice_data.update({
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": total_amount
        })
        
        # Insert into database
        result = await sales_invoices_collection.insert_one(invoice_data)
        
        if result.inserted_id:
            invoice_data["_id"] = str(result.inserted_id)
            return {
                "success": True,
                "message": "Invoice created successfully",
                "invoice": invoice_data
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")

@router.put("/{invoice_id}")
async def update_sales_invoice(invoice_id: str, invoice_data: dict):
    """Update an existing sales invoice"""
    try:
        # Find existing invoice
        existing_invoice = await sales_invoices_collection.find_one({"id": invoice_id})
        if not existing_invoice:
            try:
                existing_invoice = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
            except:
                pass
        
        if not existing_invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Update timestamp
        invoice_data["updated_at"] = datetime.now()
        
        # Process items similar to create
        if "items" in invoice_data:
            processed_items = []
            for item in invoice_data["items"]:
                processed_item = {
                    "item_id": item.get("item_id", ""),
                    "item_name": item.get("item_name", ""),
                    "description": item.get("description", ""),
                    "quantity": float(item.get("quantity", 0)),
                    "rate": float(item.get("rate", 0)),
                    "amount": float(item.get("amount", 0))
                }
                
                # Calculate amount
                processed_item["amount"] = processed_item["quantity"] * processed_item["rate"]
                processed_items.append(processed_item)
            
            invoice_data["items"] = processed_items
            
            # Recalculate totals
            subtotal = sum(item["amount"] for item in processed_items)
            discount_amount = float(invoice_data.get("discount_amount", 0))
            tax_rate = float(invoice_data.get("tax_rate", 18))
            
            discounted_subtotal = subtotal - discount_amount
            tax_amount = (discounted_subtotal * tax_rate) / 100
            total_amount = discounted_subtotal + tax_amount
            
            invoice_data.update({
                "subtotal": subtotal,
                "tax_amount": tax_amount,
                "total_amount": total_amount
            })
        
        # Update in database
        result = await sales_invoices_collection.update_one(
            {"_id": existing_invoice["_id"]},
            {"$set": invoice_data}
        )
        
        if result.modified_count > 0:
            return {
                "success": True,
                "message": "Invoice updated successfully"
            }
        else:
            return {
                "success": True,
                "message": "No changes made to invoice"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating invoice: {str(e)}")

@router.delete("/{invoice_id}")
async def delete_sales_invoice(invoice_id: str):
    """Delete a sales invoice"""
    try:
        # Find and delete invoice
        result = await sales_invoices_collection.delete_one({"id": invoice_id})
        
        if result.deleted_count == 0:
            # Try with ObjectId
            try:
                result = await sales_invoices_collection.delete_one({"_id": ObjectId(invoice_id)})
            except:
                pass
        
        if result.deleted_count > 0:
            return {
                "success": True,
                "message": "Invoice deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting invoice: {str(e)}")

@router.post("/{invoice_id}/send")
async def send_invoice_email(invoice_id: str, email_data: dict):
    """Send invoice via email (SendGrid) and optionally accept phone for SMS (placeholder)."""
    try:
        # Get invoice
        invoice = await sales_invoices_collection.find_one({"id": invoice_id})
        if not invoice:
            # Try ObjectId
            try:
                invoice = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
                if invoice and "_id" in invoice:
                    invoice["id"] = str(invoice["_id"])
                    del invoice["_id"]
            except Exception:
                pass
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        to_email = (email_data or {}).get("email") or invoice.get("customer_email")
        phone = (email_data or {}).get("phone")
        if not to_email and not phone:
            raise HTTPException(status_code=400, detail="Provide at least an email or phone to send")

        result = {"email": None, "sms": {"success": False, "configured": False, "message": "SMS sending not configured"}}

        # Email via SendGrid if configured and email present
        api_key_present = bool(os.environ.get("SENDGRID_API_KEY"))
        if to_email:
            if not api_key_present or SendGridEmailService is None:
                raise HTTPException(status_code=503, detail="Email service not configured. Please set SENDGRID_API_KEY in environment.")
            svc = SendGridEmailService()
            email_resp = svc.send_invoice(to_email, invoice, BRAND_PLACEHOLDER)
            result["email"] = email_resp
        
        # SMS placeholder: accept phone but not implemented
        if phone:
            # Future: integrate Twilio or other provider
            result["sms"] = {"success": False, "configured": False, "message": "SMS provider not configured"}
        
        overall_success = (result.get("email", {}) or {}).get("success") is True
        return {
            "success": overall_success,
            "message": "Invoice processed for sending",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending invoice: {str(e)}")

@router.get("/stats/overview")
async def get_invoice_stats():
    """Get invoice statistics for dashboard"""
    try:
        total_invoices = await sales_invoices_collection.count_documents({})
        
        # Count by status
        draft_count = await sales_invoices_collection.count_documents({"status": "draft"})
        submitted_count = await sales_invoices_collection.count_documents({"status": "submitted"})
        paid_count = await sales_invoices_collection.count_documents({"status": "paid"})
        
        # Calculate totals
        pipeline = [
            {"$group": {
                "_id": None,
                "total_amount": {"$sum": "$total_amount"},
                "total_tax": {"$sum": "$tax_amount"}
            }}
        ]
        
        total_result = await sales_invoices_collection.aggregate(pipeline).to_list(1)
        total_amount = total_result[0]["total_amount"] if total_result else 0
        total_tax = total_result[0]["total_tax"] if total_result else 0
        
        # Recent invoices
        recent_invoices_cursor = sales_invoices_collection.find(
            {},
            {"invoice_number": 1, "customer_name": 1, "total_amount": 1, "status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(5)
        
        recent_invoices = []
        async for invoice in recent_invoices_cursor:
            # Convert ObjectId to string
            if "_id" in invoice:
                invoice["id"] = str(invoice["_id"])
                del invoice["_id"]
            recent_invoices.append(invoice)
        
        return {
            "total_invoices": total_invoices,
            "draft_count": draft_count,
            "submitted_count": submitted_count,
            "paid_count": paid_count,
            "total_amount": total_amount,
            "total_tax": total_tax,
            "recent_invoices": recent_invoices
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching invoice stats: {str(e)}")

# Export the router

def get_invoices_router():
    return router