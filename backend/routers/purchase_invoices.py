from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING

from database import purchase_invoices_collection, suppliers_collection

router = APIRouter(prefix="/api/purchase", tags=["purchase_invoices"])

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