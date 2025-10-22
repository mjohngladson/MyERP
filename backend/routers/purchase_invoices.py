from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import uuid

from database import purchase_invoices_collection, suppliers_collection
from validators import (
    validate_required_fields, validate_items, validate_amounts,
    validate_status_transition, validate_transaction_update,
    PURCHASE_INVOICE_STATUS_TRANSITIONS
)

router = APIRouter(prefix="/api/purchase", tags=["purchase_invoices"])

# Import workflow helpers
from workflow_helpers import (
    create_journal_entry_for_purchase_invoice
)

@router.get("/invoices", response_model=List[dict])
async def list_purchase_invoices(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query('invoice_date'),
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
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"supplier_name": {"$regex": search, "$options": "i"}},
            ]

        sort_field = (sort_by or '').lower()
        sort_map = {
            'invoice_number': 'invoice_number',
            'invoice_date': 'invoice_date_sort',
            'total_amount': 'total_amount',
            'created_at': 'created_at',
        }
        sort_key = sort_map.get(sort_field, 'created_at')
        sort_direction = DESCENDING if (sort_dir or 'desc').lower() == 'desc' else ASCENDING

        pipeline = [
            { '$addFields': {
                'invoice_date_sort': { '$toDate': { '$cond': [ { '$or': [ { '$eq': [ '$invoice_date', None ] }, { '$eq': [ '$invoice_date', '' ] } ] }, '$created_at', '$invoice_date' ] } }
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
            pipeline.append({'$match': {'invoice_date_sort': date_match}})
        pipeline.extend([
            {'$sort': { sort_key: -1 if sort_direction==DESCENDING else 1 }},
            {'$skip': skip},
            {'$limit': limit}
        ])

        invoices = await purchase_invoices_collection.aggregate(pipeline).to_list(length=limit)

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
            count_pipeline.append({'$match': {'invoice_date_sort': date_match}})
        count_pipeline.append({'$count': 'total'})
        total_docs = await purchase_invoices_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = total_docs[0]['total'] if total_docs else 0

        transformed = []
        for inv in invoices:
            # Remove MongoDB _id but preserve UUID id field
            if '_id' in inv:
                del inv['_id']
            # Only set fallback id if no id field exists
            if 'id' not in inv or not inv['id']:
                inv['id'] = f"pinv-{str(uuid.uuid4())[:8]}"
            inv.setdefault('invoice_number', '')
            inv.setdefault('supplier_name', '')
            inv.setdefault('status', 'draft')
            inv.setdefault('total_amount', 0.0)
            inv.setdefault('items', [])
            inv['_meta'] = { 'total_count': total_count, 'page_size': limit, 'current_page': (skip//limit)+1 }
            transformed.append(inv)
        return transformed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching purchase invoices: {str(e)}")

@router.get("/invoices/{invoice_id}")
async def get_purchase_invoice(invoice_id: str):
    try:
        inv = await purchase_invoices_collection.find_one({ 'id': invoice_id })
        if not inv:
            try:
                inv = await purchase_invoices_collection.find_one({ '_id': ObjectId(invoice_id) })
            except Exception:
                pass
        if not inv:
            raise HTTPException(status_code=404, detail='Purchase invoice not found')
        # Remove MongoDB _id but preserve UUID id field
        if '_id' in inv:
            del inv['_id']
        # Only set fallback id if no id field exists
        if 'id' not in inv or not inv['id']:
            inv['id'] = f"pinv-{str(uuid.uuid4())[:8]}"
        return inv
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching purchase invoice: {str(e)}")

@router.post("/invoices", response_model=dict)
async def create_purchase_invoice(payload: dict):
    try:
        # Validate required fields
        validate_required_fields(
            payload,
            ["supplier_name", "items"],
            "Purchase Invoice"
        )
        
        # Validate items
        validate_items(payload.get("items", []), "Purchase Invoice")
        
        # CRITICAL: Validate line item quantities are integers only (no decimals)
        items_to_validate = payload.get("items", [])
        for idx, item in enumerate(items_to_validate):
            qty = item.get("quantity", 0)
            if not isinstance(qty, int) and (isinstance(qty, float) and not qty.is_integer()):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Line item {idx + 1}: Quantity must be a whole number (integer), not decimal. Received: {qty}"
                )
        
        now = datetime.now(timezone.utc)
        payload.setdefault('status', 'draft')
        payload['id'] = payload.get('id') or str(ObjectId())
        payload['created_at'] = now
        payload['updated_at'] = now
        # Set invoice_date to today if not provided (required for journal entry posting_date)
        if not payload.get('invoice_date'):
            payload['invoice_date'] = now.strftime('%Y-%m-%d')
        # invoice number
        if not payload.get('invoice_number'):
            count = await purchase_invoices_collection.count_documents({})
            payload['invoice_number'] = f"PINV-{now.strftime('%Y%m%d')}-{count+1:04d}"
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
        
        # Validate amounts after calculation
        validate_amounts(payload, "Purchase Invoice")
        
        res = await purchase_invoices_collection.insert_one(payload)
        if res.inserted_id:
            payload['id'] = str(res.inserted_id)
            if '_id' in payload:
                del payload['_id']
            invoice_id = payload.get('id')
            
            # If creating directly with submitted status, trigger workflow
            if payload.get('status') == 'submitted':
                from database import journal_entries_collection, accounts_collection
                
                # Create Journal Entry only (Payment Entry created separately)
                je_id = await create_journal_entry_for_purchase_invoice(
                    invoice_id, payload, journal_entries_collection, accounts_collection
                )
                
                return { 'success': True, 'invoice': payload, 'message': 'Purchase Invoice created and Journal Entry generated', 'journal_entry_id': je_id }
            
            return { 'success': True, 'invoice': payload }
        raise HTTPException(status_code=500, detail='Failed to create purchase invoice')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating purchase invoice: {str(e)}")

@router.put("/invoices/{invoice_id}")
async def update_purchase_invoice(invoice_id: str, payload: dict):
    try:
        existing = await purchase_invoices_collection.find_one({ 'id': invoice_id })
        if not existing:
            try:
                existing = await purchase_invoices_collection.find_one({ '_id': ObjectId(invoice_id) })
            except Exception:
                pass
        if not existing:
            raise HTTPException(status_code=404, detail='Purchase invoice not found')
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
        # If status changed to "submitted", create Journal Entry only (Payment Entry created separately)
        if payload.get('status') == 'submitted' and existing.get('status') != 'submitted':
            from database import journal_entries_collection, accounts_collection
            
            # Merge existing data with updates for workflow
            merged_data = {**existing, **payload}
            
            # Create Journal Entry only
            je_id = await create_journal_entry_for_purchase_invoice(
                invoice_id, merged_data, journal_entries_collection, accounts_collection
            )
            
            res = await purchase_invoices_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
            return { 'success': True, 'message': 'Purchase Invoice updated and Journal Entry created', 'journal_entry_id': je_id }
        
        res = await purchase_invoices_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
        return { 'success': True, 'modified': res.modified_count }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating purchase invoice: {str(e)}")

@router.delete("/invoices/{invoice_id}")
async def delete_purchase_invoice(invoice_id: str):
    try:
        res = await purchase_invoices_collection.delete_one({ 'id': invoice_id })
        if res.deleted_count == 0:
            try:
                res = await purchase_invoices_collection.delete_one({ '_id': ObjectId(invoice_id) })
            except Exception:
                pass
        if res.deleted_count > 0:
            return { 'success': True }
        raise HTTPException(status_code=404, detail='Purchase invoice not found')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting purchase invoice: {str(e)}")


@router.post("/invoices/{invoice_id}/send")
async def send_purchase_invoice(invoice_id: str, body: dict):
    """Send purchase invoice via email/SMS"""
    from typing import Dict, Any
    from services.send_tracking import track_send_status
    
    # Get the purchase invoice
    invoice = await purchase_invoices_collection.find_one({"id": invoice_id})
    if not invoice:
        # Try with ObjectId
        try:
            invoice = await purchase_invoices_collection.find_one({"_id": ObjectId(invoice_id)})
        except:
            pass
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Purchase invoice not found")
    
    try:
        method = body.get("method", "email")
        recipient = body.get("email") or body.get("phone")
        
        if not recipient:
            raise HTTPException(status_code=400, detail="Email or phone number is required")
        
        # Import services
        from services.email_service import SendGridEmailService
        from services.sms_service import TwilioSmsService
        
        send_result = None
        
        if method == "email":
            try:
                email_service = SendGridEmailService()
                # Convert to invoice format for email template
                invoice_data = {
                    "invoice_number": invoice.get("invoice_number"),
                    "invoice_date": invoice.get("invoice_date"),
                    "due_date": invoice.get("due_date"),
                    "supplier_name": invoice.get("supplier_name"),
                    "customer_name": invoice.get("supplier_name"),  # For template compatibility
                    "items": invoice.get("items", []),
                    "subtotal": invoice.get("subtotal", 0),
                    "tax_amount": invoice.get("tax_amount", 0),
                    "total_amount": invoice.get("total_amount", 0)
                }
                send_result = await email_service.send_invoice_email(
                    to_email=recipient,
                    invoice_data=invoice_data,
                    attach_pdf=body.get("attach_pdf", False)
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Email send failed: {str(e)}")
        
        elif method == "sms":
            try:
                sms_service = TwilioSmsService()
                message = f"Purchase Invoice {invoice.get('invoice_number')} from {invoice.get('supplier_name')} for ₹{invoice.get('total_amount', 0):.2f}. Due: {invoice.get('due_date', 'N/A')}"
                send_result = await sms_service.send_sms(to_phone=recipient, message=message)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"SMS send failed: {str(e)}")
        
        # Track send status
        invoice_id_str = str(invoice.get("id") or invoice.get("_id"))
        await track_send_status(
            collection=purchase_invoices_collection,
            document_id=invoice_id_str,
            method=method,
            recipient=recipient,
            success=bool(send_result)
        )
        
        return {
            "success": True,
            "message": f"Purchase invoice sent via {method}",
            "send_result": send_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending purchase invoice: {str(e)}")


@router.get("/invoices/stats/overview")
async def purchase_invoice_stats(
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
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"supplier_name": {"$regex": search, "$options": "i"}},
            ]
        pipeline = [
            { '$addFields': {
                'invoice_date_sort': { '$toDate': { '$cond': [ { '$or': [ { '$eq': [ '$invoice_date', None ] }, { '$eq': [ '$invoice_date', '' ] } ] }, '$created_at', '$invoice_date' ] } }
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
            pipeline.append({ '$match': { 'invoice_date_sort': date_match } })
        pipeline.append({ '$group': {
            '_id': None,
            'total_count': { '$sum': 1 },
            'total_amount': { '$sum': { '$ifNull': [ '$total_amount', 0 ] } },
            'draft': { '$sum': { '$cond': [ { '$eq': [ '$status', 'draft' ] }, 1, 0 ] } },
            'submitted': { '$sum': { '$cond': [ { '$eq': [ '$status', 'submitted' ] }, 1, 0 ] } },
            'paid': { '$sum': { '$cond': [ { '$eq': [ '$status', 'paid' ] }, 1, 0 ] } },
            'cancelled': { '$sum': { '$cond': [ { '$eq': [ '$status', 'cancelled' ] }, 1, 0 ] } },
        }})
        res = await purchase_invoices_collection.aggregate(pipeline).to_list(1)
        if not res:
            return { 'total_invoices': 0, 'draft': 0, 'submitted': 0, 'paid': 0, 'cancelled': 0, 'total_amount': 0 }
        grp = res[0]
        return {
            'total_invoices': grp.get('total_count', 0),
            'draft': grp.get('draft', 0),
            'submitted': grp.get('submitted', 0),
            'paid': grp.get('paid', 0),
            'cancelled': grp.get('cancelled', 0),
            'total_amount': grp.get('total_amount', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")