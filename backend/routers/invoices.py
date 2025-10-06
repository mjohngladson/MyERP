from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from database import sales_invoices_collection, customers_collection, items_collection
from models import SalesInvoice, SalesInvoiceCreate, SalesInvoiceItem
from validators import (
    validate_required_fields, validate_items, validate_amounts,
    validate_status_transition, validate_transaction_update, validate_transaction_delete,
    SALES_INVOICE_STATUS_TRANSITIONS
)
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
    search: Optional[str] = Query(None, description="Search in invoice number or customer name"),
    sort_by: Optional[str] = Query(None, description='invoice_number|invoice_date|total_amount'),
    sort_dir: Optional[str] = Query('desc', description='asc|desc'),
    from_date: Optional[str] = Query(None, description='YYYY-MM-DD'),
    to_date: Optional[str] = Query(None, description='YYYY-MM-DD')
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

        # Build pipeline for robust date sorting/filtering
        sort_field = (sort_by or '').lower()
        sort_map = {
            'invoice_number': 'invoice_number',
            'invoice_date': 'invoice_date_sort',
            'total_amount': 'total_amount'
        }
        sort_key = sort_map.get(sort_field, 'created_at')
        sort_direction = -1 if (sort_dir or 'desc').lower() == 'desc' else 1

        pipeline = [
            { '$addFields': {
                'invoice_date_sort': { '$toDate': { '$cond': [ { '$or': [ { '$eq': [ '$invoice_date', None ] }, { '$eq': [ '$invoice_date', '' ] } ] }, '$created_at', '$invoice_date' ] } }
            }},
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
            pipeline.append({ '$match': { 'invoice_date_sort': date_match } })
        pipeline.extend([
            { '$sort': { sort_key: sort_direction } },
            { '$skip': skip },
            { '$limit': limit },
        ])

        invoices = await sales_invoices_collection.aggregate(pipeline).to_list(length=limit)

        # Count
        count_pipeline = pipeline[:1]  # $addFields
        count_match = []
        if query:
            count_match.append({ '$match': query })
        if from_date or to_date:
            date_match = {}
            if from_date:
                y,m,d = map(int, from_date.split('-'))
                date_match['$gte'] = datetime(y,m,d,0,0,0,tzinfo=timezone.utc)
            if to_date:
                y,m,d = map(int, to_date.split('-'))
                date_match['$lte'] = datetime(y,m,d,23,59,59,tzinfo=timezone.utc)
            count_match.append({ '$match': { 'invoice_date_sort': date_match } })
        count_pipeline = count_pipeline + count_match + [{ '$count': 'total' }]
        total_docs = await sales_invoices_collection.aggregate(count_pipeline).to_list(length=1)
        total_count = (total_docs[0]['total'] if total_docs else 0)

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

        # If status changed to "submitted", create Journal Entry and Payment Entry (as pending)
        if invoice_data.get("status") == "submitted" and existing.get("status") != "submitted":
            from database import journal_entries_collection, payments_collection, accounts_collection
            import uuid
            
            # Get accounts for journal entry
            receivables_account = await accounts_collection.find_one({"account_name": {"$regex": "Accounts Receivable", "$options": "i"}})
            sales_account = await accounts_collection.find_one({"account_name": {"$regex": "Sales", "$options": "i"}})
            tax_account = await accounts_collection.find_one({"account_name": {"$regex": "Tax", "$options": "i"}})
            
            total_amt = invoice_data.get("total_amount", existing.get("total_amount", 0))
            tax_amt = invoice_data.get("tax_amount", existing.get("tax_amount", 0))
            sales_amt = total_amt - tax_amt
            
            # Create Journal Entry for Sales Invoice
            je_accounts = []
            if receivables_account:
                je_accounts.append({
                    "account_id": receivables_account["id"],
                    "account_name": receivables_account["account_name"],
                    "debit_amount": total_amt,
                    "credit_amount": 0,
                    "description": f"Sales Invoice {existing.get('invoice_number', '')}"
                })
            if sales_account:
                je_accounts.append({
                    "account_id": sales_account["id"],
                    "account_name": sales_account["account_name"],
                    "debit_amount": 0,
                    "credit_amount": sales_amt,
                    "description": f"Sales for Invoice {existing.get('invoice_number', '')}"
                })
            if tax_account and tax_amt > 0:
                je_accounts.append({
                    "account_id": tax_account["id"],
                    "account_name": tax_account["account_name"],
                    "debit_amount": 0,
                    "credit_amount": tax_amt,
                    "description": f"Tax on Invoice {existing.get('invoice_number', '')}"
                })
            
            if je_accounts:
                je_id = str(uuid.uuid4())
                journal_entry = {
                    "id": je_id,
                    "entry_number": f"JE-INV-{existing.get('invoice_number', '')}",
                    "posting_date": invoice_data.get("invoice_date", existing.get("invoice_date")),
                    "reference": existing.get("invoice_number", ""),
                    "description": f"Sales Invoice entry for {existing.get('customer_name', '')}",
                    "voucher_type": "Sales Invoice",
                    "voucher_id": invoice_id,
                    "accounts": je_accounts,
                    "total_debit": total_amt,
                    "total_credit": total_amt,
                    "status": "posted",
                    "is_auto_generated": True,
                    "company_id": existing.get("company_id", "default_company"),
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                await journal_entries_collection.insert_one(journal_entry)
            
            # Create Payment Entry (pending - to be marked paid when actual payment received)
            payment_id = str(uuid.uuid4())
            payment_entry = {
                "id": payment_id,
                "payment_number": f"REC-{datetime.now().strftime('%Y%m%d')}-{await payments_collection.count_documents({}) + 1:04d}",
                "payment_type": "Receive",
                "party_type": "Customer",
                "party_id": existing.get("customer_id"),
                "party_name": existing.get("customer_name"),
                "payment_date": invoice_data.get("invoice_date", existing.get("invoice_date")),
                "amount": total_amt,
                "base_amount": total_amt,
                "unallocated_amount": total_amt,
                "payment_method": "To Be Paid",
                "currency": "INR",
                "exchange_rate": 1.0,
                "status": "draft",  # Draft until actual payment received
                "reference_number": existing.get("invoice_number", ""),
                "description": f"Payment entry for Invoice {existing.get('invoice_number', '')}",
                "company_id": existing.get("company_id", "default_company"),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await payments_collection.insert_one(payment_entry)
            
            result = await sales_invoices_collection.update_one({"_id": existing["_id"]}, {"$set": invoice_data})
            return {"success": True, "message": "Invoice updated, Journal Entry and Payment Entry created", "journal_entry_id": je_id if je_accounts else None, "payment_entry_id": payment_id}
        
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

        # Use uniform send tracking service
        from services.send_tracking import create_uniform_send_update, get_uniform_send_response
        
        update_fields = create_uniform_send_update(
            send_results=results,
            method="email" if to_email else "sms",  # Primary method
            recipient=to_email or phone,
            attach_pdf=include_pdf
        )
        
        await sales_invoices_collection.update_one({"_id": inv["_id"]}, {"$set": update_fields})

        return get_uniform_send_response(
            send_results=results,
            sent_via=sent_via,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending invoice: {str(e)}")

@router.get("/stats/overview")
async def get_invoice_stats(
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
                {"invoice_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
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
        res = await sales_invoices_collection.aggregate(pipeline).to_list(1)
        if not res:
            return { 'total_invoices': 0, 'draft_count': 0, 'submitted_count': 0, 'paid_count': 0, 'cancelled_count': 0, 'total_amount': 0 }
        grp = res[0]
        return {
            'total_invoices': grp.get('total_count', 0),
            'draft_count': grp.get('draft', 0),
            'submitted_count': grp.get('submitted', 0),
            'paid_count': grp.get('paid', 0),
            'cancelled_count': grp.get('cancelled', 0),
            'total_amount': grp.get('total_amount', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching invoice stats: {str(e)}")


def get_invoices_router():
    return router