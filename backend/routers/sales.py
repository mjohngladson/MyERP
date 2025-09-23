from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_orders_collection, customers_collection, items_collection
from models import SalesOrder, SalesOrderCreate
import uuid
from datetime import datetime, timezone
from bson import ObjectId
import os

# Email/SMS/PDF services reused from invoices
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

router = APIRouter(prefix="/api/sales", tags=["sales"])

# ============ LIST WITH FILTERS/PAGINATION ============
@router.get("/orders", response_model=List[dict])
async def get_sales_orders(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    try:
        query = {}
        if status:
            # allow 'fulfilled' mapping
            query["status"] = "delivered" if status == "fulfilled" else status
        if customer_id:
            query["customer_id"] = customer_id
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
            ]
        total_count = await sales_orders_collection.count_documents(query)
        cursor = sales_orders_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        orders = await cursor.to_list(length=limit)

        transformed = []
        for order in orders:
            if "_id" in order:
                order["id"] = str(order["_id"])
                del order["_id"]
            order.setdefault("order_number", f"SO-{str(uuid.uuid4())[:8]}")
            order.setdefault("customer_name", "Unknown Customer")
            order.setdefault("total_amount", 0.0)
            order.setdefault("status", "draft")
            order.setdefault("items", [])
            order.setdefault("company_id", "default_company")
            # map delivered -> fulfilled for external
            if order.get("status") == "delivered":
                order["status"] = "fulfilled"
            order["_meta"] = {"total_count": total_count, "page_size": limit, "current_page": (skip // limit) + 1}
            transformed.append(order)
        return transformed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales orders: {str(e)}")

# ============ GET BY ID ============
@router.get("/orders/{order_id}")
async def get_sales_order(order_id: str):
    try:
        order = await sales_orders_collection.find_one({"id": order_id})
        if not order:
            try:
                order = await sales_orders_collection.find_one({"_id": ObjectId(order_id)})
            except Exception:
                pass
        if not order:
            raise HTTPException(status_code=404, detail="Sales order not found")
        if "_id" in order:
            order["id"] = str(order["_id"])
            del order["_id"]
        if order.get("status") == "delivered":
            order["status"] = "fulfilled"
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales order: {str(e)}")

# ============ CREATE ============
@router.post("/orders", response_model=dict)
async def create_sales_order(order_data: dict):
    try:
        # defaults
        order_data.setdefault("status", "draft")
        order_data["id"] = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        order_data["created_at"] = now
        order_data["updated_at"] = now
        # generate order number
        if not order_data.get("order_number"):
            count = await sales_orders_collection.count_documents({})
            order_data["order_number"] = f"SO-{now.strftime('%Y%m%d')}-{count + 1:04d}"
        # customer enrichment
        if order_data.get("customer_id"):
            customer = await customers_collection.find_one({"id": order_data["customer_id"]})
            if customer:
                order_data["customer_name"] = customer.get("name", order_data.get("customer_name", ""))
                order_data.setdefault("shipping_address", customer.get("address"))
        # items normalization
        items = []
        for it in (order_data.get("items") or []):
            q = float(it.get("quantity", 0))
            r = float(it.get("rate", 0))
            items.append({
                "item_id": it.get("item_id", ""),
                "item_name": it.get("item_name", ""),
                "quantity": q,
                "rate": r,
                "amount": q * r
            })
        order_data["items"] = items
        order_data["total_amount"] = sum(i["amount"] for i in items)
        # save
        result = await sales_orders_collection.insert_one(order_data)
        if result.inserted_id:
            order_data["_id"] = str(result.inserted_id)
            return {"success": True, "order": order_data}
        raise HTTPException(status_code=500, detail="Failed to create sales order")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sales order: {str(e)}")

# ============ UPDATE ============
@router.put("/orders/{order_id}")
async def update_sales_order(order_id: str, order_data: dict):
    try:
        existing = await sales_orders_collection.find_one({"id": order_id})
        if not existing:
            try:
                existing = await sales_orders_collection.find_one({"_id": ObjectId(order_id)})
            except Exception:
                pass
        if not existing:
            raise HTTPException(status_code=404, detail="Sales order not found")
        order_data["updated_at"] = datetime.now(timezone.utc)
        # normalize status mapping from fulfilled -> delivered for storage if needed
        if order_data.get("status") == "fulfilled":
            order_data["status"] = "delivered"
        # items recalc if provided
        if "items" in order_data:
            items = []
            for it in (order_data.get("items") or []):
                q = float(it.get("quantity", 0))
                r = float(it.get("rate", 0))
                items.append({
                    "item_id": it.get("item_id", ""),
                    "item_name": it.get("item_name", ""),
                    "quantity": q,
                    "rate": r,
                    "amount": q * r
                })
            order_data["items"] = items
            order_data["total_amount"] = sum(i["amount"] for i in items)
        result = await sales_orders_collection.update_one({"_id": existing["_id"]}, {"$set": order_data})
        return {"success": True, "modified": result.modified_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating sales order: {str(e)}")

# ============ DELETE ============
@router.delete("/orders/{order_id}")
async def delete_sales_order(order_id: str):
    try:
        result = await sales_orders_collection.delete_one({"id": order_id})
        if result.deleted_count == 0:
            try:
                result = await sales_orders_collection.delete_one({"_id": ObjectId(order_id)})
            except Exception:
                pass
        if result.deleted_count > 0:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Sales order not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting sales order: {str(e)}")

# ============ SEND (EMAIL/SMS) ============
@router.post("/orders/{order_id}/send")
async def send_sales_order(order_id: str, body: dict):
    try:
        order = await sales_orders_collection.find_one({"id": order_id})
        if not order:
            try:
                order = await sales_orders_collection.find_one({"_id": ObjectId(order_id)})
            except Exception:
                pass
        if not order:
            raise HTTPException(status_code=404, detail="Sales order not found")
        to_email = (body or {}).get("email")
        phone = (body or {}).get("phone")
        include_pdf = bool((body or {}).get("include_pdf"))
        subject = (body or {}).get("subject") or f"Sales Order {order.get('order_number','')} from {BRAND_PLACEHOLDER.get('company_name','Your Company')}"
        preface = (body or {}).get("message") or f"Dear {order.get('customer_name','Customer')}, Please find your sales order details below."
        results = {"email": None, "sms": None}
        sent_via = []
        # email
        if to_email:
            if SendGridEmailService is None or not os.environ.get("SENDGRID_API_KEY"):
                raise HTTPException(status_code=503, detail="Email service not configured.")
            pdf_bytes = None
            if include_pdf:
                pdf_bytes = generate_invoice_pdf(order, BRAND_PLACEHOLDER)
            svc = SendGridEmailService()
            email_resp = svc.send_invoice(to_email, order, BRAND_PLACEHOLDER, pdf_bytes=pdf_bytes, subject_override=subject, preface=preface)
            results["email"] = email_resp
            if email_resp.get("success"):
                sent_via.append("email")
        # sms
        if phone:
            if TwilioSmsService is None or not (os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN") and os.environ.get("TWILIO_FROM_PHONE")):
                results["sms"] = {"success": False, "message": "SMS not configured"}
            else:
                sms = TwilioSmsService()
                sms_resp = sms.send_sms(phone, f"Sales Order {order.get('order_number','')}: total ₹{order.get('total_amount',0)}")
                results["sms"] = sms_resp
                if sms_resp.get("success"):
                    sent_via.append("sms")
        # save attempt
        sent_at_iso = None
        update_fields = {
            "last_send_result": results,
            "last_send_attempt_at": datetime.now(timezone.utc).isoformat()
        }
        if sent_via:
            sent_at_iso = datetime.now(timezone.utc).isoformat()
            update_fields.update({"sent_at": sent_at_iso, "sent_via": sent_via})
        await sales_orders_collection.update_one({"_id": order["_id"]}, {"$set": update_fields})
        return {"success": bool(sent_via), "sent_via": sent_via, "result": results, "sent_at": sent_at_iso}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending sales order: {str(e)}")

# ============ STATS ============
@router.get("/orders/stats/overview")
async def sales_order_stats():
    try:
        total = await sales_orders_collection.count_documents({})
        draft = await sales_orders_collection.count_documents({"status": "draft"})
        submitted = await sales_orders_collection.count_documents({"status": "submitted"})
        delivered = await sales_orders_collection.count_documents({"status": "delivered"})
        fulfilled = await sales_orders_collection.count_documents({"status": "fulfilled"})
        pipeline = [{"$group": {"_id": None, "total_amount": {"$sum": "$total_amount"}}}]
        total_result = await sales_orders_collection.aggregate(pipeline).to_list(1)
        total_amount = total_result[0]["total_amount"] if total_result else 0
        return {"total_orders": total, "draft": draft, "submitted": submitted, "fulfilled": fulfilled + delivered, "total_amount": total_amount}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

# ============ Customers helpers retained ============
@router.get("/customers")
async def get_customers(limit: int = 50):
    try:
        cursor = customers_collection.find().sort("created_at", -1).limit(limit)
        customers = await cursor.to_list(length=limit)
        for c in customers:
            if "_id" in c:
                c["id"] = str(c["_id"])
                del c["_id"]
        return customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")