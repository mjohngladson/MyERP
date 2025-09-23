from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import os

from database import purchase_orders_collection, suppliers_collection, items_collection

# Optional email/SMS/PDF services (reused pattern from invoices/sales)
try:
    from services.email_service import SendGridEmailService, BRAND_PLACEHOLDER
    from services.pdf_service import generate_invoice_pdf
except Exception:
    SendGridEmailService = None
    BRAND_PLACEHOLDER = {"company_name": "Your Company"}
    def generate_invoice_pdf(doc, brand):
        return None
try:
    from services.sms_service import TwilioSmsService
except Exception:
    TwilioSmsService = None

router = APIRouter(prefix="/api/purchase", tags=["purchase"])

@router.get("/orders", response_model=List[dict])
async def list_purchase_orders(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query('order_date'),
    sort_dir: Optional[str] = Query('desc'),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        query = {}
        if status:
            query["status"] = status
        if supplier_id:
            query["supplier_id"] = supplier_id
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"supplier_name": {"$regex": search, "$options": "i"}},
            ]

        # Build aggregation pipeline with normalized date
        sort_field = (sort_by or '').lower()
        sort_map = {
            'order_number': 'order_number',
            'order_date': 'order_date_sort',
            'total_amount': 'total_amount',
        }
        sort_key = sort_map.get(sort_field, 'created_at')
        sort_direction = DESCENDING if (sort_dir or 'desc').lower() == 'desc' else ASCENDING

        pipeline = [
            { '$addFields': {
                'order_date_sort': { '$toDate': { '$ifNull': [ '$order_date', '$created_at' ] } }
            }},
        ]
        if query:
            pipeline.append({'$match': query})
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            pipeline.append({'$match': {'order_date_sort': date_match}})
        pipeline.extend([
            {'$sort': { sort_key: -1 if sort_direction==DESCENDING else 1 }},
            {'$skip': skip},
            {'$limit': limit}
        ])

        orders = await purchase_orders_collection.aggregate(pipeline).to_list(length=limit)

        # Count
        count_pipeline = pipeline[:1]
        if query:
            count_pipeline.append({'$match': query})
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            count_pipeline.append({'$match': {'order_date_sort': date_match}})
        count_pipeline.append({'$count': 'total'})
        total_docs = await purchase_orders_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = total_docs[0]['total'] if total_docs else 0

        transformed = []
        for o in orders:
            if '_id' in o:
                o['id'] = str(o['_id'])
                del o['_id']
            o.setdefault('order_number', '')
            o.setdefault('supplier_name', '')
            o.setdefault('status', 'draft')
            o.setdefault('total_amount', 0.0)
            o.setdefault('items', [])
            o['_meta'] = { 'total_count': total_count, 'page_size': limit, 'current_page': (skip//limit)+1 }
            transformed.append(o)
        return transformed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching purchase orders: {str(e)}")

@router.get("/orders/{order_id}")
async def get_purchase_order(order_id: str):
    try:
        o = await purchase_orders_collection.find_one({ 'id': order_id })
        if not o:
            try:
                o = await purchase_orders_collection.find_one({ '_id': ObjectId(order_id) })
            except Exception:
                pass
        if not o:
            raise HTTPException(status_code=404, detail='Purchase order not found')
        if '_id' in o:
            o['id'] = str(o['_id'])
            del o['_id']
        return o
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching purchase order: {str(e)}")

@router.post("/orders", response_model=dict)
async def create_purchase_order(payload: dict):
    try:
        now = datetime.now(timezone.utc)
        payload.setdefault('status', 'draft')
        payload['id'] = payload.get('id') or str(ObjectId())
        payload['created_at'] = now
        payload['updated_at'] = now
        # order number
        if not payload.get('order_number'):
            count = await purchase_orders_collection.count_documents({})
            payload['order_number'] = f"PO-{now.strftime('%Y%m%d')}-{count+1:04d}"
        # supplier enrichment
        if payload.get('supplier_id'):
            s = await suppliers_collection.find_one({ 'id': payload['supplier_id'] })
            if s:
                payload['supplier_name'] = s.get('name', payload.get('supplier_name',''))
                payload['supplier_email'] = s.get('email', '')
                payload['supplier_phone'] = s.get('phone', '')
                payload['supplier_address'] = s.get('address', '')
        # items normalization + totals
        items = []
        for it in (payload.get('items') or []):
            q = float(it.get('quantity', 0))
            r = float(it.get('rate', 0))
            items.append({
                'item_id': it.get('item_id',''),
                'item_name': it.get('item_name',''),
                'quantity': q,
                'rate': r,
                'amount': q*r
            })
        subtotal = sum(i['amount'] for i in items)
        discount_amount = float(payload.get('discount_amount', 0))
        tax_rate = float(payload.get('tax_rate', 18))
        discounted = max(0.0, subtotal - discount_amount)
        tax_amount = (discounted * tax_rate) / 100.0
        total_amount = discounted + tax_amount
        payload.update({
            'items': items,
            'subtotal': subtotal,
            'tax_rate': tax_rate,
            'tax_amount': tax_amount,
            'discount_amount': discount_amount,
            'total_amount': total_amount
        })
        res = await purchase_orders_collection.insert_one(payload)
        if res.inserted_id:
            payload['_id'] = str(res.inserted_id)
            return { 'success': True, 'order': payload }
        raise HTTPException(status_code=500, detail='Failed to create purchase order')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating purchase order: {str(e)}")

@router.put("/orders/{order_id}")
async def update_purchase_order(order_id: str, payload: dict):
    try:
        existing = await purchase_orders_collection.find_one({ 'id': order_id })
        if not existing:
            try:
                existing = await purchase_orders_collection.find_one({ '_id': ObjectId(order_id) })
            except Exception:
                pass
        if not existing:
            raise HTTPException(status_code=404, detail='Purchase order not found')
        payload['updated_at'] = datetime.now(timezone.utc)
        # recalc totals if items/tax/discount changed
        need_recalc = ('items' in payload) or ('tax_rate' in payload) or ('discount_amount' in payload)
        if need_recalc:
            src_items = payload.get('items', existing.get('items', []))
            items = []
            for it in (src_items or []):
                q = float(it.get('quantity', 0))
                r = float(it.get('rate', 0))
                items.append({
                    'item_id': it.get('item_id',''),
                    'item_name': it.get('item_name',''),
                    'quantity': q,
                    'rate': r,
                    'amount': q*r
                })
            subtotal = sum(i['amount'] for i in items)
            discount_amount = float(payload.get('discount_amount', existing.get('discount_amount', 0)))
            tax_rate = float(payload.get('tax_rate', existing.get('tax_rate', 18)))
            discounted = max(0.0, subtotal - discount_amount)
            tax_amount = (discounted * tax_rate) / 100.0
            total_amount = discounted + tax_amount
            payload.update({
                'items': items if 'items' in payload else existing.get('items', []),
                'subtotal': subtotal,
                'tax_rate': tax_rate,
                'tax_amount': tax_amount,
                'discount_amount': discount_amount,
                'total_amount': total_amount
            })
        res = await purchase_orders_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
        return { 'success': True, 'modified': res.modified_count }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating purchase order: {str(e)}")

@router.delete("/orders/{order_id}")
async def delete_purchase_order(order_id: str):
    try:
        res = await purchase_orders_collection.delete_one({ 'id': order_id })
        if res.deleted_count == 0:
            try:
                res = await purchase_orders_collection.delete_one({ '_id': ObjectId(order_id) })
            except Exception:
                pass
        if res.deleted_count > 0:
            return { 'success': True }
        raise HTTPException(status_code=404, detail='Purchase order not found')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting purchase order: {str(e)}")

@router.post("/orders/{order_id}/send")
async def send_purchase_order(order_id: str, body: dict):
    """Send purchase order via email and/or SMS. Body: { email?: str, phone?: str, include_pdf?: bool, subject?, message? }"""
    try:
        order = await purchase_orders_collection.find_one({"id": order_id})
        if not order:
            try:
                order = await purchase_orders_collection.find_one({"_id": ObjectId(order_id)})
            except Exception:
                pass
        if not order:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        to_email = (body or {}).get("email") or order.get("supplier_email")
        phone = (body or {}).get("phone") or order.get("supplier_phone")
        include_pdf = bool((body or {}).get("include_pdf"))
        subject = (body or {}).get("subject") or f"Purchase Order {order.get('order_number','')} from {BRAND_PLACEHOLDER.get('company_name','Your Company')}"
        preface = (body or {}).get("message") or f"Dear {order.get('supplier_name','Supplier')}, Please find your purchase order details below."

        if not to_email and not phone:
            raise HTTPException(status_code=400, detail="Provide at least an email or phone to send")

        results = {"email": None, "sms": None}
        sent_via = []

        # Email
        if to_email:
            if SendGridEmailService is None or not os.environ.get("SENDGRID_API_KEY"):
                raise HTTPException(status_code=503, detail="Email service not configured. Set SENDGRID_API_KEY.")
            pdf_bytes = None
            if include_pdf:
                try:
                    pdf_bytes = generate_invoice_pdf(order, BRAND_PLACEHOLDER)
                except Exception:
                    pdf_bytes = None
            svc = SendGridEmailService()
            email_resp = svc.send_invoice(to_email, order, BRAND_PLACEHOLDER, pdf_bytes=pdf_bytes, subject_override=subject, preface=preface)
            results["email"] = email_resp
            if email_resp.get("success"):
                sent_via.append("email")

        # SMS
        if phone:
            if TwilioSmsService is None or not (os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN") and os.environ.get("TWILIO_FROM_PHONE")):
                results["sms"] = {"success": False, "configured": False, "message": "SMS not configured"}
            else:
                sms = TwilioSmsService()
                sms_resp = sms.send_sms(phone, f"Purchase Order {order.get('order_number','')} total ₹{order.get('total_amount',0)}.")
                results["sms"] = sms_resp
                if sms_resp.get("success"):
                    sent_via.append("sms")

        # Save result on document
        sent_at_iso = None
        update_fields = {
            "last_send_result": results,
            "last_send_attempt_at": datetime.now(timezone.utc).isoformat()
        }
        if sent_via:
            sent_at_iso = datetime.now(timezone.utc).isoformat()
            update_fields.update({"sent_at": sent_at_iso, "sent_via": sent_via})
        await purchase_orders_collection.update_one({"_id": order["_id"]}, {"$set": update_fields})

        return {"success": bool(sent_via), "sent_via": sent_via, "result": results, "sent_at": sent_at_iso}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending purchase order: {str(e)}")