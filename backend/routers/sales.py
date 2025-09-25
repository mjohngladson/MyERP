from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_orders_collection, customers_collection, items_collection
from models import SalesOrder, SalesOrderCreate
import uuid
from datetime import datetime, timezone, time
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
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
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description='order_number|order_date|total_amount'),
    sort_dir: Optional[str] = Query('desc', description='asc|desc'),
    from_date: Optional[str] = Query(None, description='YYYY-MM-DD'),
    to_date: Optional[str] = Query(None, description='YYYY-MM-DD')
):
    try:
        query = {}
        if status:
            query["status"] = status
        if customer_id:
            query["customer_id"] = customer_id
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
            ]
        # Date filtering (assume stored as UTC datetimes)
        if from_date or to_date:
            date_query = {}
            if from_date:
                try:
                    y,m,d = map(int, from_date.split('-'))
                    start_dt = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
                except Exception:
                    start_dt = None
                if start_dt:
                    date_query["$gte"] = start_dt
            if to_date:
                try:
                    y,m,d = map(int, to_date.split('-'))
                    end_dt = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
                except Exception:
                    end_dt = None
                if end_dt:
                    date_query["$lte"] = end_dt
            if date_query:
                query["order_date"] = date_query
        # Sorting & retrieval using aggregation for robust date handling and count
        sort_field = (sort_by or '').lower()
        sort_map = {
            'order_number': 'order_number',
            'order_date': 'order_date_sort',
            'total_amount': 'total_amount'
        }
        sort_key = sort_map.get(sort_field, 'created_at')
        sort_direction = DESCENDING if (sort_dir or 'desc').lower() == 'desc' else ASCENDING

        # Build pipeline
        match_stage = query.copy()
        pipeline = [
            { '$addFields': {
                'order_date_sort': { '$toDate': { '$ifNull': [ '$order_date', '$created_at' ] } }
            }},
        ]
        if match_stage:
            pipeline.append({ '$match': match_stage })
        # Apply date range on normalized field if provided
        if from_date or to_date:
            date_match = {}
            if from_date:
                try:
                    y,m,d = map(int, from_date.split('-'))
                    date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
                except Exception:
                    pass
            if to_date:
                try:
                    y,m,d = map(int, to_date.split('-'))
                    date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
                except Exception:
                    pass
            if date_match:
                pipeline.append({ '$match': { 'order_date_sort': date_match } })
        pipeline.extend([
            { '$sort': { sort_key: sort_direction } },
            { '$skip': skip },
            { '$limit': limit }
        ])

        orders = await sales_orders_collection.aggregate(pipeline).to_list(length=limit)

        # Count pipeline
        count_pipeline = pipeline[:1]  # $addFields
        count_match = []
        if match_stage:
            count_match.append({ '$match': match_stage })
        if from_date or to_date:
            date_match = {}
            if from_date:
                try:
                    y,m,d = map(int, from_date.split('-'))
                    date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
                except Exception:
                    pass
            if to_date:
                try:
                    y,m,d = map(int, to_date.split('-'))
                    date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
                except Exception:
                    pass
            if date_match:
                count_match.append({ '$match': { 'order_date_sort': date_match } })
        count_pipeline = count_pipeline + count_match + [{ '$count': 'total' }]
        total_docs = await sales_orders_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = (total_docs[0]['total'] if total_docs else 0)

        transformed = []
        for order in orders:
            if "_id" in order:
                order["__mongo_id"] = str(order["_id"])  # keep mongo id for precise updates
                order["id"] = str(order["_id"])
                del order["_id"]
            order.setdefault("order_number", f"SO-{str(uuid.uuid4())[:8]}")
            order.setdefault("customer_name", "Unknown Customer")
            order.setdefault("total_amount", 0.0)
            order.setdefault("status", "draft")
            order.setdefault("items", [])
            order.setdefault("company_id", "default_company")
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
        # normalize order_date
        od = order_data.get("order_date")
        if isinstance(od, str) and od:
            try:
                # Accept YYYY-MM-DD
                dt = datetime.fromisoformat(od)
            except Exception:
                from datetime import datetime as dtmod
                dt = dtmod.strptime(od, '%Y-%m-%d')
            order_data["order_date"] = datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)
        elif not od:
            order_data["order_date"] = now
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
        # items normalization + taxes/discounts
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
        subtotal = sum(i["amount"] for i in items)
        discount_amount = float(order_data.get("discount_amount", 0))
        tax_rate = float(order_data.get("tax_rate", 18))
        discounted_subtotal = max(0.0, subtotal - discount_amount)
        tax_amount = (discounted_subtotal * tax_rate) / 100.0
        total_amount = discounted_subtotal + tax_amount
        order_data.update({
            "items": items,
            "subtotal": subtotal,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "discount_amount": discount_amount,
            "total_amount": total_amount
        })
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
        # keep status as provided (draft/submitted/fulfilled/cancelled)
        # recalc totals when items provided or tax/discount fields present
        need_recalc = ("items" in order_data) or ("tax_rate" in order_data) or ("discount_amount" in order_data)
        if need_recalc:
            src_items = order_data.get("items", existing.get("items", []))
            items = []
            for it in (src_items or []):
                q = float(it.get("quantity", 0))
                r = float(it.get("rate", 0))
                items.append({
                    "item_id": it.get("item_id", ""),
                    "item_name": it.get("item_name", ""),
                    "quantity": q,
                    "rate": r,
                    "amount": q * r
                })
            subtotal = sum(i["amount"] for i in items)
            discount_amount = float(order_data.get("discount_amount", existing.get("discount_amount", 0)))
            tax_rate = float(order_data.get("tax_rate", existing.get("tax_rate", 18)))
            discounted_subtotal = max(0.0, subtotal - discount_amount)
            tax_amount = (discounted_subtotal * tax_rate) / 100.0
            total_amount = discounted_subtotal + tax_amount
            order_data.update({
                "items": items if "items" in order_data else existing.get("items", []),
                "subtotal": subtotal,
                "tax_rate": tax_rate,
                "tax_amount": tax_amount,
                "discount_amount": discount_amount,
                "total_amount": total_amount
            })
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
        # Use uniform send tracking service
        from services.send_tracking import create_uniform_send_update, get_uniform_send_response
        
        # Build errors dict for uniform response
        errors = {}
        if results.get("email") and not results["email"].get("success"):
            errors["email"] = results["email"].get("error", "Unknown error")
        if results.get("sms") and not results["sms"].get("success"):
            errors["sms"] = results["sms"].get("error", results["sms"].get("message", "Unknown error"))
        
        update_fields = create_uniform_send_update(
            send_results=results,
            method="email" if to_email else "sms",  # Primary method
            recipient=to_email or phone,
            attach_pdf=include_pdf
        )
        filter_query = ({"_id": order["_id"]} if order.get("_id") else ( {"_id": ObjectId(order["__mongo_id"]) } if order.get("__mongo_id") else {"id": order_id} ))
        await sales_orders_collection.update_one(filter_query, {"$set": update_fields})
        return {"success": bool(sent_via), "sent_via": sent_via, "result": results, "sent_at": current_time_iso}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending sales order: {str(e)}")

# ============ STATS ============
@router.get("/orders/stats/overview")
async def sales_order_stats(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        match_stage = {}
        if status:
            match_stage["status"] = status
        if customer_id:
            match_stage["customer_id"] = customer_id
        if search:
            match_stage["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
            ]
        pipeline = [
            { '$addFields': {
                'order_date_sort': { '$toDate': { '$cond': [ { '$or': [ { '$eq': [ '$order_date', None ] }, { '$eq': [ '$order_date', '' ] } ] }, '$created_at', '$order_date' ] } }
            }},
        ]
        if match_stage:
            pipeline.append({ '$match': match_stage })
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            pipeline.append({ '$match': { 'order_date_sort': date_match } })
        pipeline.append({ '$group': {
            '_id': None,
            'total_count': { '$sum': 1 },
            'total_amount': { '$sum': { '$ifNull': [ '$total_amount', 0 ] } },
            'draft': { '$sum': { '$cond': [ { '$eq': [ '$status', 'draft' ] }, 1, 0 ] } },
            'submitted': { '$sum': { '$cond': [ { '$eq': [ '$status', 'submitted' ] }, 1, 0 ] } },
            'fulfilled_only': { '$sum': { '$cond': [ { '$eq': [ '$status', 'fulfilled' ] }, 1, 0 ] } },
            'delivered_only': { '$sum': { '$cond': [ { '$eq': [ '$status', 'delivered' ] }, 1, 0 ] } },
            'cancelled': { '$sum': { '$cond': [ { '$eq': [ '$status', 'cancelled' ] }, 1, 0 ] } },
        }})
        res = await sales_orders_collection.aggregate(pipeline).to_list(1)
        if not res:
            return { 'total_orders': 0, 'draft': 0, 'submitted': 0, 'fulfilled': 0, 'cancelled': 0, 'total_amount': 0 }
        grp = res[0]
        fulfilled_total = (grp.get('fulfilled_only', 0) or 0) + (grp.get('delivered_only', 0) or 0)
        return {
            'total_orders': grp.get('total_count', 0),
            'draft': grp.get('draft', 0),
            'submitted': grp.get('submitted', 0),
            'fulfilled': fulfilled_total,
            'cancelled': grp.get('cancelled', 0),
            'total_amount': grp.get('total_amount', 0)
        }
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