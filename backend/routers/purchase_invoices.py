from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING

from database import purchase_invoices_collection, suppliers_collection
from validators import (
    validate_required_fields, validate_items, validate_amounts,
    validate_status_transition, validate_transaction_update,
    PURCHASE_INVOICE_STATUS_TRANSITIONS
)

router = APIRouter(prefix="/api/purchase", tags=["purchase_invoices"])

# Import workflow helpers
from workflow_helpers import (
    create_journal_entry_for_purchase_invoice,
    create_payment_entry_for_purchase_invoice
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
            if '_id' in inv:
                inv['id'] = str(inv['_id'])
                del inv['_id']
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
        if '_id' in inv:
            inv['id'] = str(inv['_id'])
            del inv['_id']
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
        
        now = datetime.now(timezone.utc)
        payload.setdefault('status', 'draft')
        payload['id'] = payload.get('id') or str(ObjectId())
        payload['created_at'] = now
        payload['updated_at'] = now
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
        # If status changed to "submitted", create Journal Entry and Payment Entry
        if payload.get('status') == 'submitted' and existing.get('status') != 'submitted':
            from database import journal_entries_collection, payments_collection, accounts_collection
            import uuid
            
            # Get accounts for journal entry
            payables_account = await accounts_collection.find_one({'account_name': {'$regex': 'Accounts Payable', '$options': 'i'}})
            purchases_account = await accounts_collection.find_one({'account_name': {'$regex': 'Purchases|Cost of Goods', '$options': 'i'}})
            tax_account = await accounts_collection.find_one({'account_name': {'$regex': 'Tax', '$options': 'i'}})
            
            total_amt = payload.get('total_amount', existing.get('total_amount', 0))
            tax_amt = payload.get('tax_amount', existing.get('tax_amount', 0))
            purchase_amt = total_amt - tax_amt
            
            # Create Journal Entry for Purchase Invoice
            je_accounts = []
            if purchases_account:
                je_accounts.append({
                    'account_id': purchases_account['id'],
                    'account_name': purchases_account['account_name'],
                    'debit_amount': purchase_amt,
                    'credit_amount': 0,
                    'description': f"Purchase Invoice {existing.get('invoice_number', '')}"
                })
            if tax_account and tax_amt > 0:
                je_accounts.append({
                    'account_id': tax_account['id'],
                    'account_name': tax_account['account_name'],
                    'debit_amount': tax_amt,
                    'credit_amount': 0,
                    'description': f"Tax on Purchase Invoice {existing.get('invoice_number', '')}"
                })
            if payables_account:
                je_accounts.append({
                    'account_id': payables_account['id'],
                    'account_name': payables_account['account_name'],
                    'debit_amount': 0,
                    'credit_amount': total_amt,
                    'description': f"Purchase Invoice {existing.get('invoice_number', '')}"
                })
            
            if je_accounts:
                je_id = str(uuid.uuid4())
                journal_entry = {
                    'id': je_id,
                    'entry_number': f"JE-PINV-{existing.get('invoice_number', '')}",
                    'posting_date': payload.get('invoice_date', existing.get('invoice_date')),
                    'reference': existing.get('invoice_number', ''),
                    'description': f"Purchase Invoice entry for {existing.get('supplier_name', '')}",
                    'voucher_type': 'Purchase Invoice',
                    'voucher_id': invoice_id,
                    'accounts': je_accounts,
                    'total_debit': total_amt,
                    'total_credit': total_amt,
                    'status': 'posted',
                    'is_auto_generated': True,
                    'company_id': existing.get('company_id', 'default_company'),
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc)
                }
                await journal_entries_collection.insert_one(journal_entry)
            
            # Create Payment Entry (draft - to be marked paid when actual payment made)
            payment_id = str(uuid.uuid4())
            payment_entry = {
                'id': payment_id,
                'payment_number': f"PAY-{datetime.now().strftime('%Y%m%d')}-{await payments_collection.count_documents({}) + 1:04d}",
                'payment_type': 'Pay',
                'party_type': 'Supplier',
                'party_id': existing.get('supplier_id'),
                'party_name': existing.get('supplier_name'),
                'payment_date': payload.get('invoice_date', existing.get('invoice_date')),
                'amount': total_amt,
                'base_amount': total_amt,
                'unallocated_amount': total_amt,
                'payment_method': 'To Be Paid',
                'currency': 'INR',
                'exchange_rate': 1.0,
                'status': 'draft',  # Draft until actual payment made
                'reference_number': existing.get('invoice_number', ''),
                'description': f"Payment entry for Purchase Invoice {existing.get('invoice_number', '')}",
                'company_id': existing.get('company_id', 'default_company'),
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            }
            await payments_collection.insert_one(payment_entry)
            
            res = await purchase_invoices_collection.update_one({ '_id': existing['_id'] }, { '$set': payload })
            return { 'success': True, 'message': 'Purchase Invoice updated, Journal Entry and Payment Entry created', 'journal_entry_id': je_id if je_accounts else None, 'payment_entry_id': payment_id }
        
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