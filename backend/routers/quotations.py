from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_quotations_collection, customers_collection, items_collection
from models import Quotation, QuotationCreate
import uuid
from datetime import datetime, timezone
from bson import ObjectId

# Email/SMS/PDF services
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

router = APIRouter(prefix="/api/quotations", tags=["quotations"])

@router.get("/", response_model=List[dict])
async def list_quotations(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description='quotation_number|quotation_date|total_amount'),
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
                {"quotation_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
            ]
        # Build pipeline
        sort_field = (sort_by or '').lower()
        sort_map = {
            'quotation_number': 'quotation_number',
            'quotation_date': 'quotation_date_sort',
            'total_amount': 'total_amount'
        }
        sort_key = sort_map.get(sort_field, 'created_at')
        sort_direction = -1 if (sort_dir or 'desc').lower() == 'desc' else 1

        pipeline = [
            { '$addFields': { 'quotation_date_sort': { '$toDate': { '$ifNull': [ '$quotation_date', '$created_at' ] } } } }
        ]
        if query:
            pipeline.append({ '$match': query })
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            pipeline.append({ '$match': { 'quotation_date_sort': date_match } })
        pipeline.extend([
            { '$sort': { sort_key: sort_direction } },
            { '$skip': skip },
            { '$limit': limit },
        ])

        quotes = await sales_quotations_collection.aggregate(pipeline).to_list(length=limit)

        # Count
        count_pipeline = [pipeline[0]]  # $addFields
        if query:
            count_pipeline.append({ '$match': query })
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            count_pipeline.append({ '$match': { 'quotation_date_sort': date_match } })
        count_pipeline.append({ '$count': 'total' })
        total_docs = await sales_quotations_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = total_docs[0]['total'] if total_docs else 0

        transformed = []
        for q in quotes:
            if "_id" in q:
                q["id"] = str(q["_id"])
                del q["_id"]
            q.setdefault("quotation_number", f"QTN-{str(uuid.uuid4())[:8]}")
            q.setdefault("customer_name", "Unknown Customer")
            q.setdefault("total_amount", 0.0)
            q.setdefault("status", "draft")
            q.setdefault("items", [])
            q.setdefault("subtotal", 0.0)
            q.setdefault("tax_amount", 0.0)
            q.setdefault("discount_amount", 0.0)
            q["_meta"] = {"total_count": total_count, "page_size": limit, "current_page": (skip // limit) + 1}
            transformed.append(q)
        return transformed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotations: {str(e)}")

@router.get("/{quotation_id}")
async def get_quotation(quotation_id: str):
    try:
        q = await sales_quotations_collection.find_one({"id": quotation_id})
        if not q:
            try:
                q = await sales_quotations_collection.find_one({"_id": ObjectId(quotation_id)})
            except Exception:
                pass
        if not q:
            raise HTTPException(status_code=404, detail="Quotation not found")
        if "_id" in q:
            q["id"] = str(q["_id"])
            del q["_id"]
        return q
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotation: {str(e)}")

@router.post("/", response_model=dict)
async def create_quotation(payload: dict):
    try:
        now = datetime.now(timezone.utc)
        payload.setdefault("status", "draft")
        payload["id"] = str(uuid.uuid4())
        payload["created_at"] = now
        payload["updated_at"] = now
        if not payload.get("quotation_number"):
            count = await sales_quotations_collection.count_documents({})
            payload["quotation_number"] = f"QTN-{now.strftime('%Y%m%d')}-{count + 1:04d}"
        if not payload.get("quotation_date"):
            payload["quotation_date"] = now
        if payload.get("customer_id"):
            customer = await customers_collection.find_one({"id": payload["customer_id"]})
            if customer:
                payload["customer_name"] = customer.get("name", payload.get("customer_name", ""))
        # items + totals
        items = []
        for it in (payload.get("items") or []):
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
        discount_amount = float(payload.get("discount_amount", 0))
        tax_rate = float(payload.get("tax_rate", 18))
        discounted_subtotal = max(0.0, subtotal - discount_amount)
        tax_amount = (discounted_subtotal * tax_rate) / 100.0
        total_amount = discounted_subtotal + tax_amount
        payload.update({
            "items": items,
            "subtotal": subtotal,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "discount_amount": discount_amount,
            "total_amount": total_amount
        })
        res = await sales_quotations_collection.insert_one(payload)
        if res.inserted_id:
            payload["_id"] = str(res.inserted_id)
            return {"success": True, "quotation": payload}
        raise HTTPException(status_code=500, detail="Failed to create quotation")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating quotation: {str(e)}")

@router.put("/{quotation_id}")
async def update_quotation(quotation_id: str, payload: dict):
    try:
        existing = await sales_quotations_collection.find_one({"id": quotation_id})
        if not existing:
            try:
                existing = await sales_quotations_collection.find_one({"_id": ObjectId(quotation_id)})
            except Exception:
                pass
        if not existing:
            raise HTTPException(status_code=404, detail="Quotation not found")
        payload["updated_at"] = datetime.now(timezone.utc)
        # recalc on items/tax/discount
        need_recalc = ("items" in payload) or ("tax_rate" in payload) or ("discount_amount" in payload)
        if need_recalc:
            src_items = payload.get("items", existing.get("items", []))
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
            discount_amount = float(payload.get("discount_amount", existing.get("discount_amount", 0)))
            tax_rate = float(payload.get("tax_rate", existing.get("tax_rate", 18)))
            discounted_subtotal = max(0.0, subtotal - discount_amount)
            tax_amount = (discounted_subtotal * tax_rate) / 100.0
            total_amount = discounted_subtotal + tax_amount
            payload.update({
                "items": items if "items" in payload else existing.get("items", []),
                "subtotal": subtotal,
                "tax_rate": tax_rate,
                "tax_amount": tax_amount,
                "discount_amount": discount_amount,
                "total_amount": total_amount
            })
        res = await sales_quotations_collection.update_one({"_id": existing["_id"]}, {"$set": payload})
        return {"success": True, "modified": res.modified_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating quotation: {str(e)}")

@router.delete("/{quotation_id}")
async def delete_quotation(quotation_id: str):
    try:
        # Check if quotation exists
        quotation = await sales_quotations_collection.find_one({"id": quotation_id})
        if not quotation:
            try:
                quotation = await sales_quotations_collection.find_one({"_id": ObjectId(quotation_id)})
            except Exception:
                pass
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        
        # Check if quotation is linked to any sales orders
        from database import sales_orders_collection
        linked_order = await sales_orders_collection.find_one({"quotation_id": quotation_id})
        if linked_order:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete quotation. It is linked to sales order {linked_order.get('order_number', 'N/A')}"
            )
        
        # Only allow deletion of draft or cancelled quotations
        if quotation.get("status") not in ["draft", "cancelled"]:
            raise HTTPException(
                status_code=400, 
                detail="Only draft or cancelled quotations can be deleted"
            )
        
        res = await sales_quotations_collection.delete_one({"id": quotation_id})
        if res.deleted_count > 0:
            return {"success": True, "message": "Quotation deleted successfully"}
        raise HTTPException(status_code=500, detail="Failed to delete quotation")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting quotation: {str(e)}")

@router.post("/{quotation_id}/send")
async def send_quotation(quotation_id: str, body: dict):
    try:
        q = await sales_quotations_collection.find_one({"id": quotation_id})
        if not q:
            try:
                q = await sales_quotations_collection.find_one({"_id": ObjectId(quotation_id)})
            except Exception:
                pass
        if not q:
            raise HTTPException(status_code=404, detail="Quotation not found")
        to_email = (body or {}).get("email")
        phone = (body or {}).get("phone")
        include_pdf = bool((body or {}).get("include_pdf"))
        subject = (body or {}).get("subject") or f"Quotation {q.get('quotation_number','')} from {BRAND_PLACEHOLDER.get('company_name','Your Company')}"
        preface = (body or {}).get("message") or f"Dear {q.get('customer_name','Customer')}, Please find your quotation details below."
        results = {"email": None, "sms": None}
        sent_via = []
        if to_email:
            if SendGridEmailService is None:
                raise HTTPException(status_code=503, detail="Email service not configured")
            pdf_bytes = generate_invoice_pdf(q, BRAND_PLACEHOLDER) if include_pdf else None
            svc = SendGridEmailService()
            email_resp = svc.send_invoice(to_email, q, BRAND_PLACEHOLDER, pdf_bytes=pdf_bytes, subject_override=subject, preface=preface)
            results["email"] = email_resp
            if email_resp.get("success"):
                sent_via.append("email")
        if phone:
            if TwilioSmsService is None:
                results["sms"] = {"success": False, "message": "SMS not configured"}
            else:
                sms = TwilioSmsService()
                sms_resp = sms.send_sms(phone, f"Quotation {q.get('quotation_number','')}: total ₹{q.get('total_amount',0)}")
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
        await sales_quotations_collection.update_one({"_id": q["_id"]}, {"$set": update_fields})
        return get_uniform_send_response(
            send_results=results,
            sent_via=sent_via,
            errors=errors
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending quotation: {str(e)}")