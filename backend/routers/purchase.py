from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import os

from database import purchase_orders_collection, suppliers_collection, items_collection
from validators import (
    validate_required_fields, validate_items, validate_amounts,
    validate_status_transition, validate_transaction_update, validate_transaction_delete,
    PURCHASE_ORDER_STATUS_TRANSITIONS
)

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
                'order_date_sort': { '$toDate': { '$cond': [ { '$or': [ { '$eq': [ '$order_date', None ] }, { '$eq': [ '$order_date', '' ] } ] }, '$created_at', '$order_date' ] } }
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
            payload['id'] = str(res.inserted_id)
            if '_id' in payload:
                del payload['_id']
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
        # If status changed to "submitted", create Purchase Invoice
        if payload.get('status') == 'submitted' and existing.get('status') != 'submitted':
            from database import purchase_invoices_collection
            import uuid
            from datetime import timedelta
            
            # Create Purchase Invoice from Purchase Order
            invoice_data = {
                'id': str(uuid.uuid4()),
                'invoice_number': f"PINV-{datetime.now().strftime('%Y%m%d')}-{await purchase_invoices_collection.count_documents({}) + 1:04d}",
                'purchase_order_id': order_id,
                'order_number': existing.get('order_number', ''),
                'supplier_id': existing.get('supplier_id'),
                'supplier_name': existing.get('supplier_name'),
                'invoice_date': datetime.now().strftime('%Y-%m-%d'),
                'due_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                'status': 'draft',
                'items': payload.get('items', existing.get('items', [])),
                'subtotal': payload.get('subtotal', existing.get('subtotal', 0)),
                'discount_amount': payload.get('discount_amount', existing.get('discount_amount', 0)),
                'tax_rate': payload.get('tax_rate', existing.get('tax_rate', 18)),
                'tax_amount': payload.get('tax_amount', existing.get('tax_amount', 0)),
                'total_amount': payload.get('total_amount', existing.get('total_amount', 0)),
                'company_id': existing.get('company_id', 'default_company'),
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            }
            
            await purchase_invoices_collection.insert_one(invoice_data)
            res = await purchase_orders_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
            return { 'success': True, 'message': 'Purchase Order updated and Purchase Invoice created', 'invoice_id': invoice_data['id'], 'modified': res.modified_count }
        
        res = await purchase_orders_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
        return { 'success': True, 'modified': res.modified_count }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating purchase order: {str(e)}")

@router.delete("/orders/{order_id}")
async def delete_purchase_order(order_id: str):
    try:
        # Check if order exists
        order = await purchase_orders_collection.find_one({'id': order_id})
        if not order:
            try:
                order = await purchase_orders_collection.find_one({'_id': ObjectId(order_id)})
            except Exception:
                pass
        if not order:
            raise HTTPException(status_code=404, detail='Purchase order not found')
        
        # Check if order is linked to any purchase invoices
        from database import purchase_invoices_collection
        linked_invoice = await purchase_invoices_collection.find_one({"purchase_order_id": order_id})
        if linked_invoice:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete purchase order. It is linked to invoice {linked_invoice.get('invoice_number', 'N/A')}"
            )
        
        # Only allow deletion of draft or cancelled orders
        if order.get("status") not in ["draft", "cancelled"]:
            raise HTTPException(
                status_code=400, 
                detail="Only draft or cancelled purchase orders can be deleted"
            )
        
        res = await purchase_orders_collection.delete_one({'id': order_id})
        if res.deleted_count > 0:
            return {'success': True, 'message': 'Purchase order deleted successfully'}
        raise HTTPException(status_code=500, detail='Failed to delete purchase order')
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
        await purchase_orders_collection.update_one({"_id": order["_id"]}, {"$set": update_fields})

        return get_uniform_send_response(
            send_results=results,
            sent_via=sent_via,
            errors=errors
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending purchase order: {str(e)}")

@router.get("/orders/stats/overview")
async def purchase_order_stats(
    status: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        match_stage = {}
        if status:
            match_stage["status"] = status
        if supplier_id:
            match_stage["supplier_id"] = supplier_id
        if search:
            match_stage["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"supplier_name": {"$regex": search, "$options": "i"}},
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
            'fulfilled': { '$sum': { '$cond': [ { '$eq': [ '$status', 'fulfilled' ] }, 1, 0 ] } },
            'cancelled': { '$sum': { '$cond': [ { '$eq': [ '$status', 'cancelled' ] }, 1, 0 ] } },
        }})
        res = await purchase_orders_collection.aggregate(pipeline).to_list(1)
        if not res:
            return { 'total_orders': 0, 'draft': 0, 'submitted': 0, 'fulfilled': 0, 'cancelled': 0, 'total_amount': 0 }
        grp = res[0]
        return {
            'total_orders': grp.get('total_count', 0),
            'draft': grp.get('draft', 0),
            'submitted': grp.get('submitted', 0),
            'fulfilled': grp.get('fulfilled', 0),
            'cancelled': grp.get('cancelled', 0),
            'total_amount': grp.get('total_amount', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")