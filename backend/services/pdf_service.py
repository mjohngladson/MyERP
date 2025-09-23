from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from typing import Dict, Any

from .email_service import format_inr


def generate_invoice_pdf(invoice: Dict[str, Any], brand: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    c.setFont('Helvetica-Bold', 16)
    c.drawString(20*mm, (height-20*mm), brand.get('company_name', 'Your Company'))
    c.setFont('Helvetica', 10)
    c.drawString(20*mm, (height-26*mm), 'Invoice')
    c.drawString(20*mm, (height-31*mm), f"No: {invoice.get('invoice_number', '-')}")

    # Bill To
    y = height - 45*mm
    c.setFont('Helvetica-Bold', 11)
    c.drawString(20*mm, y, 'Bill To')
    y -= 6*mm
    c.setFont('Helvetica', 10)
    c.drawString(20*mm, y, invoice.get('customer_name', ''))
    y -= 5*mm
    c.drawString(20*mm, y, invoice.get('customer_email', ''))
    y -= 5*mm
    c.drawString(20*mm, y, invoice.get('customer_phone', ''))

    # Table header
    y -= 10*mm
    c.setFont('Helvetica-Bold', 10)
    c.drawString(20*mm, y, 'Item')
    c.drawString(100*mm, y, 'Qty')
    c.drawRightString(150*mm, y, 'Rate')
    c.drawRightString(190*mm, y, 'Amount')
    y -= 4*mm
    c.line(20*mm, y, 190*mm, y)

    # Items
    c.setFont('Helvetica', 10)
    y -= 6*mm
    for it in invoice.get('items', [])[:30]:
        c.drawString(20*mm, y, (it.get('item_name') or it.get('description') or 'Item')[:50])
        c.drawString(100*mm, y, str(it.get('quantity', 0)))
        c.drawRightString(150*mm, y, format_inr(it.get('rate', 0)))
        amount = it.get('amount') or (it.get('quantity',0)*it.get('rate',0))
        c.drawRightString(190*mm, y, format_inr(amount))
        y -= 6*mm
        if y < 40*mm:
            c.showPage()
            y = height - 40*mm

    # Totals
    y -= 2*mm
    c.line(120*mm, y, 190*mm, y)
    y -= 8*mm
    c.setFont('Helvetica', 10)
    c.drawRightString(150*mm, y, 'Subtotal')
    c.drawRightString(190*mm, y, format_inr(invoice.get('subtotal', 0)))
    y -= 6*mm
    c.drawRightString(150*mm, y, 'Discount')
    c.drawRightString(190*mm, y, format_inr(invoice.get('discount_amount', 0)))
    y -= 6*mm
    c.drawRightString(150*mm, y, f"Tax ({invoice.get('tax_rate', 18)}%)")
    c.drawRightString(190*mm, y, format_inr(invoice.get('tax_amount', 0)))
    y -= 8*mm
    c.setFont('Helvetica-Bold', 11)
    c.drawRightString(150*mm, y, 'Total')
    c.drawRightString(190*mm, y, format_inr(invoice.get('total_amount', 0)))

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes