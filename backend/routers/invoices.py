from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_invoices_collection, customers_collection, items_collection
from models import SalesInvoice, SalesInvoiceCreate, SalesInvoiceItem
import uuid
from datetime import datetime, timezone, time
from bson import ObjectId
import os

# Email + PDF + SMS services
try:
    from services.email_service import SendGridEmailService, BRAND_PLACEHOLDER
    from services.pdf_service import generate_invoice_pdf
except Exception:
    SendGridEmailService = None
    BRAND_PLACEHOLDER = {"company_name": "Your Company"}
    def generate_invoice_pdf(invoice, brand):
        return None
try:
    from services.sms_service import TwilioSmsService
except Exception:
    TwilioSmsService = None

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

        total_count = await sales_invoices_collection.count_documents(query)
        cursor = sales_invoices_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        invoices = await cursor.to_list(length=limit)

        transformed_invoices = []
        for invoice in invoices:
            try:
                if "_id" in invoice:
                    invoice["id"] = str(invoice["_id"])
                    del invoice["_id"]
                invoice.setdefault("invoice_number", f"INV-{str(uuid.uuid4())[:8]}")
                invoice.setdefault("customer_name", "Unknown Customer")
                invoice.setdefault("total_amount", 0.0)
                invoice.setdefault("status", "draft")
                invoice.setdefault("items", [])
                invoice.setdefault("subtotal", 0.0)
                invoice.setdefault("tax_amount", 0.0)
                invoice.setdefault("discount_amount", 0.0)

                fixed_items = []
                for item in invoice.get("items", []):
                    fixed_items.append({
                        "item_id": item.get("item_id", item.get("product_id", "unknown")),
                        "item_name": item.get("item_name", item.get("product_name", "Unknown Item")),
                        "description": item.get("description", ""),
                        "quantity": item.get("quantity", 0),
                        "rate": item.get("rate", item.get("unit_price", 0.0)),
                        "amount": item.get("amount", item.get("line_total", 0.0))
                    })
                invoice["items"] = fixed_items

                invoice["_meta"] = {
                    "total_count": total_count,
                    "current_page": (skip // limit) + 1,
                    "page_size": limit
                }
                transformed_invoices.append(invoice)
            except Exception:
                continue
        return transformed_invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales invoices: {str(e)}")

@router.get("/{invoice_id}")
async def get_sales_invoice(invoice_id: str):
    try:
        invoice = await sales_invoices_collection.find_one({"id": invoice_id})
        if not invoice:
            try:
                invoice = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
            except Exception:
                pass
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
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
    try:
        if not invoice_data.get("invoice_number"):
            invoice_count = await sales_invoices_collection.count_documents({})
            invoice_data["invoice_number"] = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{invoice_count + 1:04d}"
        invoice_data["id"] = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc)
        invoice_data["created_at"] = now_iso
        invoice_data["updated_at"] = now_iso

        if invoice_data.get("customer_id"):
            customer = await customers_collection.find_one({"id": invoice_data["customer_id"]})
            if customer:
                invoice_data["customer_name"] = customer.get("name")
                invoice_data["customer_email"] = customer.get("email", "")
                invoice_data["customer_phone"] = customer.get("phone", "")
                invoice_data["customer_address"] = customer.get("address", "")

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
            if processed_item["item_id"]:
                db_item = await items_collection.find_one({"id": processed_item["item_id"]})
                if db_item:
                    processed_item["item_name"] = db_item.get("name", processed_item["item_name"])
                    if not processed_item["rate"]:
                        processed_item["rate"] = float(db_item.get("price", 0))
            processed_item["amount"] = processed_item["quantity"] * processed_item["rate"]
            processed_items.append(processed_item)
        invoice_data["items"] = processed_items

        subtotal = sum(i["amount"] for i in processed_items)
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

        result = await sales_invoices_collection.insert_one(invoice_data)
        if result.inserted_id:
            invoice_data["_id"] = str(result.inserted_id)
            return {"success": True, "message": "Invoice created successfully", "invoice": invoice_data}
        else:
            raise HTTPException(status_code=500, detail="Failed to create invoice")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")

@router.put("/{invoice_id}")
async def update_sales_invoice(invoice_id: str, invoice_data: dict):
    try:
        existing = await sales_invoices_collection.find_one({"id": invoice_id})
        if not existing:
            try:
                existing = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
            except Exception:
                pass
        if not existing:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice_data["updated_at"] = datetime.now(timezone.utc)
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
                processed_item["amount"] = processed_item["quantity"] * processed_item["rate"]
                processed_items.append(processed_item)
            invoice_data["items"] = processed_items
            subtotal = sum(i["amount"] for i in processed_items)
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

        result = await sales_invoices_collection.update_one({"_id": existing["_id"]}, {"$set": invoice_data})
        if result.modified_count > 0:
            return {"success": True, "message": "Invoice updated successfully"}
        else:
            return {"success": True, "message": "No changes made to invoice"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating invoice: {str(e)}")

@router.delete("/{invoice_id}")
async def delete_sales_invoice(invoice_id: str):
    try:
        result = await sales_invoices_collection.delete_one({"id": invoice_id})
        if result.deleted_count == 0:
            try:
                result = await sales_invoices_collection.delete_one({"_id": ObjectId(invoice_id)})
            except Exception:
                pass
        if result.deleted_count > 0:
            return {"success": True, "message": "Invoice deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Invoice not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting invoice: {str(e)}")

@router.post("/{invoice_id}/send")
async def send_invoice_email(invoice_id: str, email_data: dict):
    """Send invoice via email (SendGrid) and/or SMS (Twilio). Saves sent_at on success.
    Body: { email?: str, phone?: str, include_pdf?: bool }
    """
    try:
        inv = await sales_invoices_collection.find_one({"id": invoice_id})
        if not inv:
            try:
                inv = await sales_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
            except Exception:
                pass
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Prepare contact targets
        to_email = (email_data or {}).get("email") or inv.get("customer_email")
        phone = (email_data or {}).get("phone")
        include_pdf = bool((email_data or {}).get("include_pdf"))
        custom_subject = (email_data or {}).get("subject")
        custom_message = (email_data or {}).get("message")

        if not to_email and not phone:
            raise HTTPException(status_code=400, detail="Provide at least an email or phone to send")

        results = {"email": None, "sms": None}
        sent_via = []

        # Email send
        if to_email:
            if SendGridEmailService is None or not os.environ.get("SENDGRID_API_KEY"):
                raise HTTPException(status_code=503, detail="Email service not configured. Set SENDGRID_API_KEY.")
            pdf_bytes = None
            if include_pdf:
                try:
                    pdf_bytes = generate_invoice_pdf(inv, BRAND_PLACEHOLDER)
                except Exception:
                    pdf_bytes = None
            email_svc = SendGridEmailService()
            subject = custom_subject or f"Invoice {inv.get('invoice_number','')} from {BRAND_PLACEHOLDER.get('company_name','Your Company')}"
            preface = custom_message or f"Dear {inv.get('customer_name','Customer')}, Please find your invoice details below."
            email_resp = email_svc.send_invoice(to_email, inv, BRAND_PLACEHOLDER, pdf_bytes=pdf_bytes, subject_override=subject, preface=preface)
            results["email"] = email_resp
            if email_resp.get("success"):
                sent_via.append("email")

        # SMS send
        if phone:
            if TwilioSmsService is None or not (os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN") and os.environ.get("TWILIO_FROM_PHONE")):
                results["sms"] = {"success": False, "configured": False, "message": "SMS not configured"}
            else:
                sms_svc = TwilioSmsService()
                body = f"Invoice {inv.get('invoice_number','')} total ₹{inv.get('total_amount',0)}. Thank you."
                sms_resp = sms_svc.send_sms(phone, body)
                results["sms"] = sms_resp
                if sms_resp.get("success"):
                    sent_via.append("sms")

        overall_success = len(sent_via) > 0

        # Build human-friendly messages for failures
        errors = {}
        if results.get("email") and not results["email"].get("success"):
            err = (results["email"].get("error") or "Email failed")
            if any(x in str(err) for x in ["401", "Unauthorized", "unauthorized"]):
                err = f"{err} - SendGrid unauthorized. Check API key and verify your sender email/domain."
            errors["email"] = err
        if results.get("sms") and not results["sms"].get("success"):
            sms_code = str(results["sms"].get("code")) if isinstance(results["sms"], dict) and results["sms"].get("code") is not None else None
            err = (results["sms"].get("error") or results["sms"].get("message") or "SMS failed") if isinstance(results["sms"], dict) else "SMS failed"
            if sms_code == "21211":
                err = f"{err} - Invalid phone format. Use E.164 e.g. +919876543210."
            if sms_code == "21608":
                err = f"{err} - Twilio trial can send only to verified numbers or upgrade your account."
            errors["sms"] = err

        # Always save last send attempt result
        sent_at_iso = None
        update_fields = {
            "last_send_result": results,
            "last_send_errors": errors,
            "last_send_attempt_at": datetime.now(timezone.utc).isoformat(),
        }
        if overall_success:
            sent_at_iso = datetime.now(timezone.utc).isoformat()
            update_fields.update({
                "sent_at": sent_at_iso,
                "sent_via": sent_via,
            })
        await sales_invoices_collection.update_one({"_id": inv["_id"]}, {"$set": update_fields})

        message = f"Invoice sent via {', '.join(sent_via)}" if overall_success else "Sending failed"

        return {
            "success": overall_success,
            "message": message,
            "result": results,
            "errors": errors,
            "sent_via": sent_via,
            "sent_at": sent_at_iso,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending invoice: {str(e)}")

@router.get("/stats/overview")
async def get_invoice_stats():
    try:
        total_invoices = await sales_invoices_collection.count_documents({})
        draft_count = await sales_invoices_collection.count_documents({"status": "draft"})
        submitted_count = await sales_invoices_collection.count_documents({"status": "submitted"})
        paid_count = await sales_invoices_collection.count_documents({"status": "paid"})

        pipeline = [{"$group": {"_id": None, "total_amount": {"$sum": "$total_amount"}, "total_tax": {"$sum": "$tax_amount"}}}]
        total_result = await sales_invoices_collection.aggregate(pipeline).to_list(1)
        total_amount = total_result[0]["total_amount"] if total_result else 0
        total_tax = total_result[0]["total_tax"] if total_result else 0

        recent_cursor = sales_invoices_collection.find({}, {"invoice_number": 1, "customer_name": 1, "total_amount": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5)
        recent_invoices = []
        async for invoice in recent_cursor:
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


def get_invoices_router():
    return router