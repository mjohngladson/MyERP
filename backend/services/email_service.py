import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, HtmlContent

logger = logging.getLogger(__name__)

BRAND_PLACEHOLDER = {
    "company_name": "Your Company",
    "logo_url": "https://dummyimage.com/140x40/1f2937/ffffff&text=Your+Logo",
    "address_lines": [
        "123 Business Street",
        "City, State, ZIP"
    ]
}

def format_inr(amount: float) -> str:
    try:
        return f"₹{float(amount):,.2f}"
    except Exception:
        return f"₹{amount}"


def generate_invoice_html(invoice: Dict[str, Any], brand: Optional[Dict[str, Any]] = None) -> str:
    b = brand or BRAND_PLACEHOLDER
    inv_no = invoice.get("invoice_number", "SINV")
    inv_date = invoice.get("invoice_date") or invoice.get("created_at")
    due_date = invoice.get("due_date")

    def fmt_date(d):
        try:
            if isinstance(d, datetime):
                return d.strftime('%d %b %Y')
            if isinstance(d, str) and d:
                # try parse ISO
                return datetime.fromisoformat(d.replace('Z', '+00:00')).strftime('%d %b %Y')
        except Exception:
            pass
        return "-"

    items = invoice.get("items", []) or []
    subtotal = invoice.get("subtotal", 0)
    tax_rate = invoice.get("tax_rate", 18)
    tax_amount = invoice.get("tax_amount", 0)
    discount_amount = invoice.get("discount_amount", 0)
    total_amount = invoice.get("total_amount", 0)

    customer_name = invoice.get("customer_name", "Customer")
    customer_email = invoice.get("customer_email", "")
    customer_phone = invoice.get("customer_phone", "")
    customer_address = invoice.get("customer_address", "")

    items_rows = "".join([
        f"""
        <tr class='item'>
            <td>{(it.get('item_name') or it.get('description') or 'Item')}</td>
            <td style='text-align:center'>{it.get('quantity', 0)}</td>
            <td style='text-align:right'>{format_inr(it.get('rate', 0))}</td>
            <td style='text-align:right'>{format_inr(it.get('amount') or (it.get('quantity',0)*it.get('rate',0)))}</td>
        </tr>
        """
        for it in items
    ])

    address_html = "<br/>".join(b.get("address_lines", []))

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8' />
        <title>Invoice {inv_no}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; color: #111827; }}
            .invoice {{ max-width: 900px; margin: 24px auto; padding: 24px; border: 1px solid #e5e7eb; }}
            .flex {{ display:flex; justify-content: space-between; align-items: center; }}
            .muted {{ color:#6b7280; font-size: 14px; }}
            table {{ width:100%; border-collapse: collapse; margin-top: 16px; }}
            th, td {{ border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }}
            th {{ background:#f9fafb; font-size: 12px; text-transform: uppercase; color:#6b7280; }}
            .totals td {{ border:0; }}
            .right {{ text-align:right; }}
            .print-btn {{ display:inline-block; padding:8px 12px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px; }}
            @media print {{ .no-print {{ display:none; }} .invoice {{ border:0; }} }}
        </style>
    </head>
    <body>
      <div class='invoice'>
        <div class='flex'>
          <div>
            <img src='{b.get('logo_url')}' alt='logo' style='height:40px' />
            <div style='margin-top:8px; font-weight:600'>{b.get('company_name')}</div>
            <div class='muted'>{address_html}</div>
          </div>
          <div style='text-align:right'>
            <div style='font-size:24px; font-weight:700'>Invoice</div>
            <div class='muted'>No: {inv_no}</div>
            <div class='muted'>Date: {fmt_date(inv_date)}</div>
            <div class='muted'>Due: {fmt_date(due_date)}</div>
          </div>
        </div>

        <div style='margin-top:16px' class='flex'>
          <div>
            <div style='font-weight:600'>Bill To</div>
            <div>{customer_name}</div>
            <div class='muted'>{customer_email}</div>
            <div class='muted'>{customer_phone}</div>
            <div class='muted'>{customer_address}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style='text-align:center'>Qty</th>
              <th class='right'>Rate</th>
              <th class='right'>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items_rows}
          </tbody>
        </table>

        <table class='totals' style='margin-top: 16px'>
          <tr>
            <td style='width:60%'></td>
            <td class='right muted'>Subtotal</td>
            <td class='right' style='width:160px'>{format_inr(subtotal)}</td>
          </tr>
          <tr>
            <td></td>
            <td class='right muted'>Discount</td>
            <td class='right'>{format_inr(discount_amount)}</td>
          </tr>
          <tr>
            <td></td>
            <td class='right muted'>Tax ({tax_rate}%)</td>
            <td class='right'>{format_inr(tax_amount)}</td>
          </tr>
          <tr>
            <td></td>
            <td class='right' style='font-weight:700'>Total</td>
            <td class='right' style='font-weight:700'>{format_inr(total_amount)}</td>
          </tr>
        </table>

        <div class='muted' style='margin-top:24px'>Thank you for your business.</div>
        <div class='no-print' style='margin-top:16px'><a class='print-btn' onclick='window.print()'>Print</a></div>
      </div>
    </body>
    </html>
    """
    return html


class SendGridEmailService:
    def __init__(self) -> None:
        api_key = os.environ.get("SENDGRID_API_KEY")
        if not api_key:
            raise RuntimeError("SENDGRID_API_KEY is not configured")
        self.client = SendGridAPIClient(api_key)
        self.default_from = os.environ.get("SENDGRID_FROM_EMAIL", "no-reply@example.com")

    def send_invoice(self, to_email: str, invoice: Dict[str, Any], brand: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        html = generate_invoice_html(invoice, brand)
        subject = f"Invoice {invoice.get('invoice_number', '')} from {BRAND_PLACEHOLDER['company_name']}"
        mail = Mail(
            from_email=Email(self.default_from),
            to_emails=To(to_email),
            subject=subject,
            html_content=HtmlContent(html)
        )
        try:
            resp = self.client.send(mail)
            return {
                "success": True,
                "status_code": resp.status_code,
                "message_id": resp.headers.get('X-Message-Id')
            }
        except Exception as e:
            logger.exception("SendGrid send failed")
            return {"success": False, "error": str(e)}