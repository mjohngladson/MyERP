#!/usr/bin/env python3
"""
Credit Note and Debit Note Enhanced Features Testing
Tests comprehensive CN/DN enhancements including:
- Invoice optional functionality
- Auto-population of customer/supplier details
- Fully paid invoice refund workflow
- Partially paid invoice adjustment workflow
- Audit trail maintenance
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Backend URL
BACKEND_URL = "https://erp-gili-1.preview.emergentagent.com"

class CNDNEnhancedTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.token = None
        self.test_results = []
        self.created_resources = {
            "sales_invoices": [],
            "purchase_invoices": [],
            "credit_notes": [],
            "debit_notes": [],
            "payments": [],
            "payment_allocations": [],
            "customers": [],
            "suppliers": [],
            "items": []
        }
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)[:500]}")
    
    async def login(self):
        """Login and get JWT token"""
        try:
            url = f"{self.base_url}/api/auth/login"
            payload = {
                "email": "admin@gili.com",
                "password": "admin123"
            }
            
            async with self.session.post(url, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.token = data.get("token")
                    self.log_test("Login", True, f"Token obtained: {self.token[:20]}...")
                    return True
                else:
                    text = await resp.text()
                    self.log_test("Login", False, f"Status {resp.status}: {text}")
                    return False
        except Exception as e:
            self.log_test("Login", False, f"Exception: {str(e)}")
            return False
    
    def get_headers(self):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    async def create_customer(self, name: str) -> Optional[str]:
        """Create a test customer"""
        try:
            url = f"{self.base_url}/api/master/customers"
            payload = {
                "name": name,
                "email": f"{name.lower().replace(' ', '.')}@test.com",
                "phone": "+91 9876543210",
                "address": "Test Address"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Response is the customer object directly, not wrapped
                    customer_id = data.get("id")
                    if customer_id:
                        self.created_resources["customers"].append(customer_id)
                    return customer_id
                return None
        except Exception as e:
            print(f"Error creating customer: {e}")
            return None
    
    async def create_supplier(self, name: str) -> Optional[str]:
        """Create a test supplier"""
        try:
            url = f"{self.base_url}/api/master/suppliers"
            payload = {
                "name": name,
                "email": f"{name.lower().replace(' ', '.')}@test.com",
                "phone": "+91 9876543210",
                "address": "Test Address"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Response is the supplier object directly, not wrapped
                    supplier_id = data.get("id")
                    if supplier_id:
                        self.created_resources["suppliers"].append(supplier_id)
                    return supplier_id
                return None
        except Exception as e:
            print(f"Error creating supplier: {e}")
            return None
    
    async def get_or_create_item(self) -> Optional[Dict]:
        """Get existing item or create one"""
        try:
            # Try to get existing items
            url = f"{self.base_url}/api/stock/items?limit=1"
            async with self.session.get(url, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data[0]
            
            # Create new item if none exist
            url = f"{self.base_url}/api/stock/items"
            payload = {
                "name": "Test Item CN/DN",
                "item_code": f"ITEM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "unit_price": 100.0,
                "description": "Test item for CN/DN testing"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Response could be wrapped in "item" key or direct
                    item = data.get("item") if "item" in data else data
                    item_id = item.get("id")
                    if item_id:
                        self.created_resources["items"].append(item_id)
                    return item
                return None
        except Exception as e:
            print(f"Error getting/creating item: {e}")
            return None
    
    async def create_sales_invoice(self, customer_id: str, customer_name: str, total_amount: float) -> Optional[Dict]:
        """Create a sales invoice"""
        try:
            item = await self.get_or_create_item()
            if not item:
                return None
            
            url = f"{self.base_url}/api/invoices"
            payload = {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "customer_email": f"{customer_name.lower().replace(' ', '.')}@test.com",
                "invoice_date": datetime.now(timezone.utc).isoformat(),
                "due_date": datetime.now(timezone.utc).isoformat(),
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": total_amount / 100,  # Assuming item price is 100
                        "rate": 100.0,
                        "amount": total_amount
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Response is wrapped in success/invoice structure
                    invoice = data.get("invoice", {})
                    invoice_id = invoice.get("id")
                    if invoice_id:
                        self.created_resources["sales_invoices"].append(invoice_id)
                    return invoice
                else:
                    text = await resp.text()
                    print(f"Error creating sales invoice: {resp.status} - {text}")
                    return None
        except Exception as e:
            print(f"Exception creating sales invoice: {e}")
            return None
    
    async def create_purchase_invoice(self, supplier_id: str, supplier_name: str, total_amount: float) -> Optional[Dict]:
        """Create a purchase invoice"""
        try:
            item = await self.get_or_create_item()
            if not item:
                return None
            
            url = f"{self.base_url}/api/purchase/invoices"
            payload = {
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "supplier_email": f"{supplier_name.lower().replace(' ', '.')}@test.com",
                "invoice_date": datetime.now(timezone.utc).isoformat(),
                "due_date": datetime.now(timezone.utc).isoformat(),
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": total_amount / 100,
                        "rate": 100.0,
                        "amount": total_amount
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    invoice = data.get("invoice", {})
                    self.created_resources["purchase_invoices"].append(invoice.get("id"))
                    return invoice
                else:
                    text = await resp.text()
                    print(f"Error creating purchase invoice: {resp.status} - {text}")
                    return None
        except Exception as e:
            print(f"Exception creating purchase invoice: {e}")
            return None
    
    async def create_payment_allocation(self, payment_id: str, invoice_id: str, amount: float, invoice_type: str = "sales") -> Optional[str]:
        """Create payment allocation"""
        try:
            url = f"{self.base_url}/api/financial/payment-allocations"
            payload = {
                "payment_id": payment_id,
                "invoice_id": invoice_id,
                "invoice_type": invoice_type,
                "allocated_amount": amount,
                "notes": "Test allocation"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    allocation_id = data.get("allocation", {}).get("id")
                    self.created_resources["payment_allocations"].append(allocation_id)
                    return allocation_id
                else:
                    text = await resp.text()
                    print(f"Error creating payment allocation: {resp.status} - {text}")
                    return None
        except Exception as e:
            print(f"Exception creating payment allocation: {e}")
            return None
    
    async def create_payment(self, party_type: str, party_id: str, party_name: str, amount: float, payment_type: str = "Receive") -> Optional[Dict]:
        """Create a payment entry"""
        try:
            url = f"{self.base_url}/api/financial/payments"
            payload = {
                "payment_type": payment_type,
                "party_type": party_type,
                "party_id": party_id,
                "party_name": party_name,
                "amount": amount,
                "payment_date": datetime.now(timezone.utc).isoformat(),
                "payment_method": "Bank Transfer",
                "status": "paid"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    payment = data.get("payment", {})
                    self.created_resources["payments"].append(payment.get("id"))
                    return payment
                else:
                    text = await resp.text()
                    print(f"Error creating payment: {resp.status} - {text}")
                    return None
        except Exception as e:
            print(f"Exception creating payment: {e}")
            return None
    
    # ==================== SCENARIO A: CREDIT NOTES - Invoice Optional ====================
    
    async def test_cn_without_invoice(self):
        """A1: Create CN WITHOUT invoice link"""
        try:
            customer_name = "CN Test Customer No Invoice"
            item = await self.get_or_create_item()
            if not item:
                self.log_test("A1: CN Without Invoice", False, "Failed to get item")
                return
            
            url = f"{self.base_url}/api/sales/credit-notes"
            payload = {
                "customer_name": customer_name,
                "customer_email": "cn.test@example.com",
                "credit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Product return without invoice",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 2,
                        "rate": 100.0,
                        "amount": 200.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    cn = data.get("credit_note", {})
                    self.created_resources["credit_notes"].append(cn.get("id"))
                    
                    # Verify CN created without invoice link
                    if not cn.get("reference_invoice_id") and cn.get("customer_name") == customer_name:
                        self.log_test("A1: CN Without Invoice", True, 
                                    f"CN {cn.get('credit_note_number')} created without invoice link")
                    else:
                        self.log_test("A1: CN Without Invoice", False, 
                                    "CN created but validation failed", cn)
                else:
                    text = await resp.text()
                    self.log_test("A1: CN Without Invoice", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("A1: CN Without Invoice", False, f"Exception: {str(e)}")
    
    async def test_cn_with_invoice_autopop(self):
        """A2: Create CN WITH invoice link and verify auto-population"""
        try:
            # Create customer and invoice
            customer_id = await self.create_customer("CN Test Customer With Invoice")
            if not customer_id:
                self.log_test("A2: CN With Invoice Auto-populate", False, "Failed to create customer")
                return
            
            invoice = await self.create_sales_invoice(customer_id, "CN Test Customer With Invoice", 500.0)
            if not invoice:
                self.log_test("A2: CN With Invoice Auto-populate", False, "Failed to create invoice")
                return
            
            # Create CN linked to invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/sales/credit-notes"
            payload = {
                "reference_invoice_id": invoice.get("id"),
                "credit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Product defect",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 1,
                        "rate": 100.0,
                        "amount": 100.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    cn = data.get("credit_note", {})
                    self.created_resources["credit_notes"].append(cn.get("id"))
                    
                    # Verify auto-population
                    auto_populated = (
                        cn.get("reference_invoice_id") == invoice.get("id") and
                        cn.get("customer_id") == customer_id and
                        cn.get("customer_name") == "CN Test Customer With Invoice" and
                        cn.get("customer_email") == invoice.get("customer_email")
                    )
                    
                    if auto_populated:
                        self.log_test("A2: CN With Invoice Auto-populate", True, 
                                    f"CN {cn.get('credit_note_number')} auto-populated customer details from invoice")
                    else:
                        self.log_test("A2: CN With Invoice Auto-populate", False, 
                                    "Auto-population failed", cn)
                else:
                    text = await resp.text()
                    self.log_test("A2: CN With Invoice Auto-populate", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("A2: CN With Invoice Auto-populate", False, f"Exception: {str(e)}")
    
    async def test_cn_items_validation(self):
        """A3: Verify CN items validation"""
        try:
            url = f"{self.base_url}/api/sales/credit-notes"
            payload = {
                "customer_name": "Test Customer",
                "credit_note_date": datetime.now(timezone.utc).isoformat(),
                "items": [],  # Empty items should fail
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 400:
                    self.log_test("A3: CN Items Validation", True, 
                                "Empty items correctly rejected with 400")
                else:
                    self.log_test("A3: CN Items Validation", False, 
                                f"Expected 400 for empty items, got {resp.status}")
        except Exception as e:
            self.log_test("A3: CN Items Validation", False, f"Exception: {str(e)}")
    
    # ==================== SCENARIO B: CREDIT NOTES - Fully Paid Invoice Refund ====================
    
    async def test_cn_fully_paid_refund(self):
        """B: CN for fully paid invoice - verify refund workflow"""
        try:
            # Create customer and invoice
            customer_id = await self.create_customer("CN Fully Paid Customer")
            if not customer_id:
                self.log_test("B: CN Fully Paid Refund", False, "Failed to create customer")
                return
            
            invoice = await self.create_sales_invoice(customer_id, "CN Fully Paid Customer", 1000.0)
            if not invoice:
                self.log_test("B: CN Fully Paid Refund", False, "Failed to create invoice")
                return
            
            # Create payment to mark invoice as fully paid
            payment = await self.create_payment("Customer", customer_id, "CN Fully Paid Customer", 1000.0, "Receive")
            if not payment:
                self.log_test("B: CN Fully Paid Refund", False, "Failed to create payment")
                return
            
            # Allocate payment to invoice
            allocation_id = await self.create_payment_allocation(payment.get("id"), invoice.get("id"), 1000.0, "sales")
            if not allocation_id:
                self.log_test("B: CN Fully Paid Refund", False, "Failed to create payment allocation")
                return
            
            # Create CN for fully paid invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/sales/credit-notes"
            payload = {
                "reference_invoice_id": invoice.get("id"),
                "credit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Full refund",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 5,
                        "rate": 100.0,
                        "amount": 500.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"  # Submit to trigger workflow
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    cn = data.get("credit_note", {})
                    self.created_resources["credit_notes"].append(cn.get("id"))
                    
                    # Wait a bit for async processing
                    await asyncio.sleep(2)
                    
                    # Fetch CN to check audit trail
                    cn_url = f"{self.base_url}/api/sales/credit-notes/{cn.get('id')}"
                    async with self.session.get(cn_url, headers=self.get_headers()) as cn_resp:
                        if cn_resp.status == 200:
                            cn_data = await cn_resp.json()
                            
                            # Verify audit trail fields
                            has_standard_je = cn_data.get("standard_journal_entry_id") is not None
                            has_refund_payment = cn_data.get("refund_payment_id") is not None
                            refund_issued = cn_data.get("refund_issued") == True
                            
                            if has_standard_je and has_refund_payment and refund_issued:
                                self.log_test("B: CN Fully Paid Refund", True, 
                                            f"Refund workflow completed: standard_je={has_standard_je}, refund_payment={has_refund_payment}, refund_issued={refund_issued}")
                            else:
                                self.log_test("B: CN Fully Paid Refund", False, 
                                            f"Refund workflow incomplete: standard_je={has_standard_je}, refund_payment={has_refund_payment}, refund_issued={refund_issued}", 
                                            cn_data)
                        else:
                            self.log_test("B: CN Fully Paid Refund", False, 
                                        f"Failed to fetch CN for verification: {cn_resp.status}")
                else:
                    text = await resp.text()
                    self.log_test("B: CN Fully Paid Refund", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("B: CN Fully Paid Refund", False, f"Exception: {str(e)}")
    
    # ==================== SCENARIO C: CREDIT NOTES - Partially Paid Invoice Adjustment ====================
    
    async def test_cn_partially_paid_adjustment(self):
        """C: CN for partially paid invoice - verify adjustment workflow"""
        try:
            # Create customer and invoice
            customer_id = await self.create_customer("CN Partial Paid Customer")
            if not customer_id:
                self.log_test("C: CN Partially Paid Adjustment", False, "Failed to create customer")
                return
            
            invoice = await self.create_sales_invoice(customer_id, "CN Partial Paid Customer", 1000.0)
            if not invoice:
                self.log_test("C: CN Partially Paid Adjustment", False, "Failed to create invoice")
                return
            
            invoice_id = invoice.get("id")
            
            # Create partial payment (50% of invoice)
            payment = await self.create_payment("Customer", customer_id, "CN Partial Paid Customer", 500.0, "Receive")
            if not payment:
                self.log_test("C: CN Partially Paid Adjustment", False, "Failed to create payment")
                return
            
            # Allocate partial payment to invoice
            allocation_id = await self.create_payment_allocation(payment.get("id"), invoice_id, 500.0, "sales")
            if not allocation_id:
                self.log_test("C: CN Partially Paid Adjustment", False, "Failed to create payment allocation")
                return
            
            # Create CN for partially paid invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/sales/credit-notes"
            payload = {
                "reference_invoice_id": invoice_id,
                "credit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Partial return",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 2,
                        "rate": 100.0,
                        "amount": 200.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"  # Submit to trigger workflow
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    cn = data.get("credit_note", {})
                    self.created_resources["credit_notes"].append(cn.get("id"))
                    
                    # Wait for async processing
                    await asyncio.sleep(2)
                    
                    # Fetch CN to check audit trail
                    cn_url = f"{self.base_url}/api/sales/credit-notes/{cn.get('id')}"
                    async with self.session.get(cn_url, headers=self.get_headers()) as cn_resp:
                        if cn_resp.status == 200:
                            cn_data = await cn_resp.json()
                            
                            # Verify audit trail
                            has_standard_je = cn_data.get("standard_journal_entry_id") is not None
                            has_adjustment_je = cn_data.get("invoice_adjustment_je_id") is not None
                            invoice_adjusted = cn_data.get("invoice_adjusted") == True
                            
                            # Fetch invoice to verify adjustment
                            inv_url = f"{self.base_url}/api/invoices/{invoice_id}"
                            async with self.session.get(inv_url, headers=self.get_headers()) as inv_resp:
                                if inv_resp.status == 200:
                                    inv_data = await inv_resp.json()
                                    
                                    # Original invoice was 1000, CN is 200, so new total should be 800
                                    expected_total = 800.0
                                    actual_total = float(inv_data.get("total_amount", 0))
                                    total_adjusted = abs(actual_total - expected_total) < 0.01
                                    
                                    # Payment status should be recalculated (500 paid on 800 total = Partially Paid)
                                    payment_status = inv_data.get("payment_status")
                                    
                                    if has_standard_je and has_adjustment_je and invoice_adjusted and total_adjusted:
                                        self.log_test("C: CN Partially Paid Adjustment", True, 
                                                    f"Adjustment workflow completed: standard_je={has_standard_je}, adjustment_je={has_adjustment_je}, invoice_adjusted={invoice_adjusted}, total_adjusted={total_adjusted} (expected={expected_total}, actual={actual_total}), payment_status={payment_status}")
                                    else:
                                        self.log_test("C: CN Partially Paid Adjustment", False, 
                                                    f"Adjustment workflow incomplete: standard_je={has_standard_je}, adjustment_je={has_adjustment_je}, invoice_adjusted={invoice_adjusted}, total_adjusted={total_adjusted} (expected={expected_total}, actual={actual_total})", 
                                                    {"cn": cn_data, "invoice": inv_data})
                                else:
                                    self.log_test("C: CN Partially Paid Adjustment", False, 
                                                f"Failed to fetch invoice for verification: {inv_resp.status}")
                        else:
                            self.log_test("C: CN Partially Paid Adjustment", False, 
                                        f"Failed to fetch CN for verification: {cn_resp.status}")
                else:
                    text = await resp.text()
                    self.log_test("C: CN Partially Paid Adjustment", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("C: CN Partially Paid Adjustment", False, f"Exception: {str(e)}")
    
    # ==================== SCENARIO D: DEBIT NOTES - Invoice Optional ====================
    
    async def test_dn_without_invoice(self):
        """D1: Create DN WITHOUT invoice link"""
        try:
            supplier_name = "DN Test Supplier No Invoice"
            item = await self.get_or_create_item()
            if not item:
                self.log_test("D1: DN Without Invoice", False, "Failed to get item")
                return
            
            url = f"{self.base_url}/api/buying/debit-notes"
            payload = {
                "supplier_name": supplier_name,
                "supplier_email": "dn.test@example.com",
                "debit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Product return without invoice",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 2,
                        "rate": 100.0,
                        "amount": 200.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    dn = data.get("debit_note", {})
                    self.created_resources["debit_notes"].append(dn.get("id"))
                    
                    # Verify DN created without invoice link
                    if not dn.get("reference_invoice_id") and dn.get("supplier_name") == supplier_name:
                        self.log_test("D1: DN Without Invoice", True, 
                                    f"DN {dn.get('debit_note_number')} created without invoice link")
                    else:
                        self.log_test("D1: DN Without Invoice", False, 
                                    "DN created but validation failed", dn)
                else:
                    text = await resp.text()
                    self.log_test("D1: DN Without Invoice", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("D1: DN Without Invoice", False, f"Exception: {str(e)}")
    
    async def test_dn_with_invoice_autopop(self):
        """D2: Create DN WITH invoice link and verify auto-population"""
        try:
            # Create supplier and invoice
            supplier_id = await self.create_supplier("DN Test Supplier With Invoice")
            if not supplier_id:
                self.log_test("D2: DN With Invoice Auto-populate", False, "Failed to create supplier")
                return
            
            invoice = await self.create_purchase_invoice(supplier_id, "DN Test Supplier With Invoice", 500.0)
            if not invoice:
                self.log_test("D2: DN With Invoice Auto-populate", False, "Failed to create invoice")
                return
            
            # Create DN linked to invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/buying/debit-notes"
            payload = {
                "reference_invoice_id": invoice.get("id"),
                "debit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Product defect",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 1,
                        "rate": 100.0,
                        "amount": 100.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    dn = data.get("debit_note", {})
                    self.created_resources["debit_notes"].append(dn.get("id"))
                    
                    # Verify auto-population
                    auto_populated = (
                        dn.get("reference_invoice_id") == invoice.get("id") and
                        dn.get("supplier_id") == supplier_id and
                        dn.get("supplier_name") == "DN Test Supplier With Invoice" and
                        dn.get("supplier_email") == invoice.get("supplier_email")
                    )
                    
                    if auto_populated:
                        self.log_test("D2: DN With Invoice Auto-populate", True, 
                                    f"DN {dn.get('debit_note_number')} auto-populated supplier details from invoice")
                    else:
                        self.log_test("D2: DN With Invoice Auto-populate", False, 
                                    "Auto-population failed", dn)
                else:
                    text = await resp.text()
                    self.log_test("D2: DN With Invoice Auto-populate", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("D2: DN With Invoice Auto-populate", False, f"Exception: {str(e)}")
    
    async def test_dn_items_validation(self):
        """D3: Verify DN items validation"""
        try:
            url = f"{self.base_url}/api/buying/debit-notes"
            payload = {
                "supplier_name": "Test Supplier",
                "debit_note_date": datetime.now(timezone.utc).isoformat(),
                "items": [],  # Empty items should fail
                "status": "draft"
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 400:
                    self.log_test("D3: DN Items Validation", True, 
                                "Empty items correctly rejected with 400")
                else:
                    self.log_test("D3: DN Items Validation", False, 
                                f"Expected 400 for empty items, got {resp.status}")
        except Exception as e:
            self.log_test("D3: DN Items Validation", False, f"Exception: {str(e)}")
    
    # ==================== SCENARIO E: DEBIT NOTES - Fully Paid Invoice Refund ====================
    
    async def test_dn_fully_paid_refund(self):
        """E: DN for fully paid invoice - verify refund workflow"""
        try:
            # Create supplier and invoice
            supplier_id = await self.create_supplier("DN Fully Paid Supplier")
            if not supplier_id:
                self.log_test("E: DN Fully Paid Refund", False, "Failed to create supplier")
                return
            
            invoice = await self.create_purchase_invoice(supplier_id, "DN Fully Paid Supplier", 1000.0)
            if not invoice:
                self.log_test("E: DN Fully Paid Refund", False, "Failed to create invoice")
                return
            
            # Create payment to mark invoice as fully paid
            payment = await self.create_payment("Supplier", supplier_id, "DN Fully Paid Supplier", 1000.0, "Pay")
            if not payment:
                self.log_test("E: DN Fully Paid Refund", False, "Failed to create payment")
                return
            
            # Allocate payment to invoice
            allocation_id = await self.create_payment_allocation(payment.get("id"), invoice.get("id"), 1000.0, "purchase")
            if not allocation_id:
                self.log_test("E: DN Fully Paid Refund", False, "Failed to create payment allocation")
                return
            
            # Create DN for fully paid invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/buying/debit-notes"
            payload = {
                "reference_invoice_id": invoice.get("id"),
                "debit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Full refund",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 5,
                        "rate": 100.0,
                        "amount": 500.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"  # Submit to trigger workflow
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    dn = data.get("debit_note", {})
                    self.created_resources["debit_notes"].append(dn.get("id"))
                    
                    # Wait for async processing
                    await asyncio.sleep(2)
                    
                    # Fetch DN to check audit trail
                    dn_url = f"{self.base_url}/api/buying/debit-notes/{dn.get('id')}"
                    async with self.session.get(dn_url, headers=self.get_headers()) as dn_resp:
                        if dn_resp.status == 200:
                            dn_data = await dn_resp.json()
                            
                            # Verify audit trail fields
                            has_standard_je = dn_data.get("standard_journal_entry_id") is not None
                            has_refund_payment = dn_data.get("refund_payment_id") is not None
                            refund_issued = dn_data.get("refund_issued") == True
                            
                            if has_standard_je and has_refund_payment and refund_issued:
                                self.log_test("E: DN Fully Paid Refund", True, 
                                            f"Refund workflow completed: standard_je={has_standard_je}, refund_payment={has_refund_payment}, refund_issued={refund_issued}")
                            else:
                                self.log_test("E: DN Fully Paid Refund", False, 
                                            f"Refund workflow incomplete: standard_je={has_standard_je}, refund_payment={has_refund_payment}, refund_issued={refund_issued}", 
                                            dn_data)
                        else:
                            self.log_test("E: DN Fully Paid Refund", False, 
                                        f"Failed to fetch DN for verification: {dn_resp.status}")
                else:
                    text = await resp.text()
                    self.log_test("E: DN Fully Paid Refund", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("E: DN Fully Paid Refund", False, f"Exception: {str(e)}")
    
    # ==================== SCENARIO F: DEBIT NOTES - Partially Paid Invoice Adjustment ====================
    
    async def test_dn_partially_paid_adjustment(self):
        """F: DN for partially paid invoice - verify adjustment workflow"""
        try:
            # Create supplier and invoice
            supplier_id = await self.create_supplier("DN Partial Paid Supplier")
            if not supplier_id:
                self.log_test("F: DN Partially Paid Adjustment", False, "Failed to create supplier")
                return
            
            invoice = await self.create_purchase_invoice(supplier_id, "DN Partial Paid Supplier", 1000.0)
            if not invoice:
                self.log_test("F: DN Partially Paid Adjustment", False, "Failed to create invoice")
                return
            
            invoice_id = invoice.get("id")
            
            # Create partial payment (50% of invoice)
            payment = await self.create_payment("Supplier", supplier_id, "DN Partial Paid Supplier", 500.0, "Pay")
            if not payment:
                self.log_test("F: DN Partially Paid Adjustment", False, "Failed to create payment")
                return
            
            # Allocate partial payment to invoice
            allocation_id = await self.create_payment_allocation(payment.get("id"), invoice_id, 500.0, "purchase")
            if not allocation_id:
                self.log_test("F: DN Partially Paid Adjustment", False, "Failed to create payment allocation")
                return
            
            # Create DN for partially paid invoice
            item = await self.get_or_create_item()
            url = f"{self.base_url}/api/buying/debit-notes"
            payload = {
                "reference_invoice_id": invoice_id,
                "debit_note_date": datetime.now(timezone.utc).isoformat(),
                "reason": "Partial return",
                "items": [
                    {
                        "item_id": item.get("id"),
                        "item_name": item.get("name"),
                        "quantity": 2,
                        "rate": 100.0,
                        "amount": 200.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 0,
                "status": "submitted"  # Submit to trigger workflow
            }
            
            async with self.session.post(url, json=payload, headers=self.get_headers()) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    dn = data.get("debit_note", {})
                    self.created_resources["debit_notes"].append(dn.get("id"))
                    
                    # Wait for async processing
                    await asyncio.sleep(2)
                    
                    # Fetch DN to check audit trail
                    dn_url = f"{self.base_url}/api/buying/debit-notes/{dn.get('id')}"
                    async with self.session.get(dn_url, headers=self.get_headers()) as dn_resp:
                        if dn_resp.status == 200:
                            dn_data = await dn_resp.json()
                            
                            # Verify audit trail
                            has_standard_je = dn_data.get("standard_journal_entry_id") is not None
                            has_adjustment_je = dn_data.get("invoice_adjustment_je_id") is not None
                            invoice_adjusted = dn_data.get("invoice_adjusted") == True
                            
                            # Fetch invoice to verify adjustment
                            inv_url = f"{self.base_url}/api/purchase/invoices/{invoice_id}"
                            async with self.session.get(inv_url, headers=self.get_headers()) as inv_resp:
                                if inv_resp.status == 200:
                                    inv_data = await inv_resp.json()
                                    
                                    # Original invoice was 1000, DN is 200, so new total should be 800
                                    expected_total = 800.0
                                    actual_total = float(inv_data.get("total_amount", 0))
                                    total_adjusted = abs(actual_total - expected_total) < 0.01
                                    
                                    # Payment status should be recalculated
                                    payment_status = inv_data.get("payment_status")
                                    
                                    if has_standard_je and has_adjustment_je and invoice_adjusted and total_adjusted:
                                        self.log_test("F: DN Partially Paid Adjustment", True, 
                                                    f"Adjustment workflow completed: standard_je={has_standard_je}, adjustment_je={has_adjustment_je}, invoice_adjusted={invoice_adjusted}, total_adjusted={total_adjusted} (expected={expected_total}, actual={actual_total}), payment_status={payment_status}")
                                    else:
                                        self.log_test("F: DN Partially Paid Adjustment", False, 
                                                    f"Adjustment workflow incomplete: standard_je={has_standard_je}, adjustment_je={has_adjustment_je}, invoice_adjusted={invoice_adjusted}, total_adjusted={total_adjusted} (expected={expected_total}, actual={actual_total})", 
                                                    {"dn": dn_data, "invoice": inv_data})
                                else:
                                    self.log_test("F: DN Partially Paid Adjustment", False, 
                                                f"Failed to fetch invoice for verification: {inv_resp.status}")
                        else:
                            self.log_test("F: DN Partially Paid Adjustment", False, 
                                        f"Failed to fetch DN for verification: {dn_resp.status}")
                else:
                    text = await resp.text()
                    self.log_test("F: DN Partially Paid Adjustment", False, 
                                f"Status {resp.status}: {text}")
        except Exception as e:
            self.log_test("F: DN Partially Paid Adjustment", False, f"Exception: {str(e)}")
    
    async def run_all_tests(self):
        """Run all CN/DN enhanced feature tests"""
        print("\n" + "="*80)
        print("CREDIT NOTE AND DEBIT NOTE ENHANCED FEATURES TESTING")
        print("="*80 + "\n")
        
        # Login first
        if not await self.login():
            print("❌ Login failed. Cannot proceed with tests.")
            return
        
        print("\n" + "-"*80)
        print("SCENARIO A: CREDIT NOTES - Invoice Optional Functionality")
        print("-"*80)
        await self.test_cn_without_invoice()
        await self.test_cn_with_invoice_autopop()
        await self.test_cn_items_validation()
        
        print("\n" + "-"*80)
        print("SCENARIO B: CREDIT NOTES - Fully Paid Invoice Refund Workflow")
        print("-"*80)
        await self.test_cn_fully_paid_refund()
        
        print("\n" + "-"*80)
        print("SCENARIO C: CREDIT NOTES - Partially Paid Invoice Adjustment Workflow")
        print("-"*80)
        await self.test_cn_partially_paid_adjustment()
        
        print("\n" + "-"*80)
        print("SCENARIO D: DEBIT NOTES - Invoice Optional Functionality")
        print("-"*80)
        await self.test_dn_without_invoice()
        await self.test_dn_with_invoice_autopop()
        await self.test_dn_items_validation()
        
        print("\n" + "-"*80)
        print("SCENARIO E: DEBIT NOTES - Fully Paid Invoice Refund Workflow")
        print("-"*80)
        await self.test_dn_fully_paid_refund()
        
        print("\n" + "-"*80)
        print("SCENARIO F: DEBIT NOTES - Partially Paid Invoice Adjustment Workflow")
        print("-"*80)
        await self.test_dn_partially_paid_adjustment()
        
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = sum(1 for r in self.test_results if not r["success"])
        total = len(self.test_results)
        
        print(f"\nTotal Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%\n")
        
        if failed > 0:
            print("\nFailed Tests:")
            for r in self.test_results:
                if not r["success"]:
                    print(f"  ❌ {r['test']}: {r['details']}")
        
        print("\n" + "="*80 + "\n")
        
        return self.test_results


async def main():
    """Main test runner"""
    async with CNDNEnhancedTester() as tester:
        results = await tester.run_all_tests()
        
        # Return exit code based on results
        failed = sum(1 for r in results if not r["success"])
        return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
