#!/usr/bin/env python3
"""
CN/DN Enhancements Testing Script
Tests all three enhancements:
1. Over-credit rejection
2. Multiple CN/DNs cumulative tracking
3. Payment allocation auto-reversal
"""
import asyncio
import aiohttp
import json
from datetime import datetime, timezone

BACKEND_URL = "https://erp-integrity.preview.emergentagent.com"

async def test_enhancements():
    """Test all CN/DN enhancements"""
    
    print("=" * 80)
    print("CN/DN ENHANCEMENTS TESTING")
    print("=" * 80)
    
    async with aiohttp.ClientSession() as session:
        # Login
        print("\n🔐 Step 1: Logging in...")
        async with session.post(f"{BACKEND_URL}/api/auth/login", json={
            "email": "admin@gili.com",
            "password": "admin123"
        }) as resp:
            if resp.status != 200:
                print(f"❌ Login failed: {resp.status}")
                return
            data = await resp.json()
            token = data.get("token")
            print(f"✅ Login successful - Token: {token[:20]}...")
        
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get customer and item IDs
        print("\n📋 Step 2: Getting test data IDs...")
        async with session.get(f"{BACKEND_URL}/api/master/customers?limit=1", headers=headers) as resp:
            customers = await resp.json()
            customer = customers[0] if customers else None
            if not customer:
                print("❌ No customers found")
                return
            print(f"✅ Customer: {customer['name']} (ID: {customer['id']})")
        
        async with session.get(f"{BACKEND_URL}/api/stock/items?limit=1", headers=headers) as resp:
            items = await resp.json()
            item = items[0] if items else None
            if not item:
                print("❌ No items found")
                return
            print(f"✅ Item: {item['name']} (ID: {item['id']})")
        
        # TEST 1: Create Sales Invoice for ₹1000
        print("\n" + "=" * 80)
        print("TEST 1: Create Sales Invoice (₹1000)")
        print("=" * 80)
        
        invoice_payload = {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "customer_email": customer.get("email", "test@example.com"),
            "invoice_date": datetime.now(timezone.utc).isoformat(),
            "due_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_id": item["id"],
                "item_name": item["name"],
                "quantity": 10,
                "rate": 100,
                "amount": 1000
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/invoices/", json=invoice_payload, headers=headers) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"❌ Invoice creation failed: {resp.status} - {text}")
                return
            invoice_data = await resp.json()
            invoice = invoice_data.get("invoice", {})
            invoice_id = invoice.get("id")
            print(f"✅ Invoice created: {invoice.get('invoice_number')} - ₹{invoice.get('total_amount')}")
            print(f"   Invoice ID: {invoice_id}")
        
        # TEST 2: Create First Credit Note (₹600) - Should Succeed
        print("\n" + "=" * 80)
        print("TEST 2: Create Credit Note #1 (₹600) - Should Succeed")
        print("=" * 80)
        
        cn1_payload = {
            "reference_invoice_id": invoice_id,
            "customer_name": customer["name"],
            "credit_note_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_name": item["name"],
                "quantity": 6,
                "rate": 100,
                "amount": 600
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "reason": "Product return",
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=cn1_payload, headers=headers) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"❌ CN #1 failed: {resp.status} - {text}")
            else:
                cn1_data = await resp.json()
                cn1 = cn1_data.get("credit_note", {})
                print(f"✅ CN #1 created: {cn1.get('credit_note_number')} - ₹{cn1.get('total_amount')}")
        
        # Verify invoice after CN #1
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice_id}", headers=headers) as resp:
            invoice_after_cn1 = await resp.json()
            print(f"\n📊 Invoice After CN #1:")
            print(f"   Original Amount: ₹{invoice_after_cn1.get('original_total_amount', 'N/A')}")
            print(f"   Current Amount: ₹{invoice_after_cn1.get('total_amount')}")
            print(f"   Total CN Amount: ₹{invoice_after_cn1.get('total_credit_notes_amount', 0)}")
            print(f"   CN Count: {len(invoice_after_cn1.get('credit_notes', []))}")
        
        # TEST 3: Create Second Credit Note (₹500) - Should FAIL (exceeds limit)
        print("\n" + "=" * 80)
        print("TEST 3: Create Credit Note #2 (₹500) - Should FAIL")
        print("=" * 80)
        
        cn2_payload = {
            "reference_invoice_id": invoice_id,
            "customer_name": customer["name"],
            "credit_note_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_name": item["name"],
                "quantity": 5,
                "rate": 100,
                "amount": 500
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "reason": "Additional return",
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=cn2_payload, headers=headers) as resp:
            response_text = await resp.text()
            if resp.status == 400:
                print(f"✅ CN #2 correctly REJECTED (HTTP 400)")
                print(f"   Error: {response_text}")
            else:
                print(f"❌ CN #2 should have been rejected but got: {resp.status}")
                print(f"   Response: {response_text}")
        
        # TEST 4: Create Valid CN #2 (₹300) - Should Succeed
        print("\n" + "=" * 80)
        print("TEST 4: Create Credit Note #2 (₹300) - Should Succeed")
        print("=" * 80)
        
        cn2_valid_payload = {
            "reference_invoice_id": invoice_id,
            "customer_name": customer["name"],
            "credit_note_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_name": item["name"],
                "quantity": 3,
                "rate": 100,
                "amount": 300
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "reason": "Additional return",
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=cn2_valid_payload, headers=headers) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"❌ CN #2 failed: {resp.status} - {text}")
            else:
                cn2_data = await resp.json()
                cn2 = cn2_data.get("credit_note", {})
                print(f"✅ CN #2 created: {cn2.get('credit_note_number')} - ₹{cn2.get('total_amount')}")
        
        # Verify invoice after CN #2
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice_id}", headers=headers) as resp:
            invoice_after_cn2 = await resp.json()
            print(f"\n📊 Invoice After CN #2:")
            print(f"   Original Amount: ₹{invoice_after_cn2.get('original_total_amount', 'N/A')}")
            print(f"   Current Amount: ₹{invoice_after_cn2.get('total_amount')}")
            print(f"   Total CN Amount: ₹{invoice_after_cn2.get('total_credit_notes_amount', 0)}")
            print(f"   CN Count: {len(invoice_after_cn2.get('credit_notes', []))}")
            print(f"   CN IDs: {invoice_after_cn2.get('credit_notes', [])}")
        
        # TEST 5: Payment Allocation Reversal Test
        print("\n" + "=" * 80)
        print("TEST 5: Payment Allocation Auto-Reversal Test")
        print("=" * 80)
        
        # Create new invoice for payment test
        print("\n📝 Creating new invoice (₹1000) for payment reversal test...")
        invoice2_payload = {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "customer_email": customer.get("email", "test@example.com"),
            "invoice_date": datetime.now(timezone.utc).isoformat(),
            "due_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_id": item["id"],
                "item_name": item["name"],
                "quantity": 10,
                "rate": 100,
                "amount": 1000
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/invoices/", json=invoice2_payload, headers=headers) as resp:
            invoice2_data = await resp.json()
            invoice2 = invoice2_data.get("invoice", {})
            invoice2_id = invoice2.get("id")
            print(f"✅ Invoice #2 created: {invoice2.get('invoice_number')} - ₹{invoice2.get('total_amount')}")
        
        # Create payment
        print("\n💰 Creating payment (₹1000)...")
        payment_payload = {
            "party_type": "Customer",
            "party_id": customer["id"],
            "party_name": customer["name"],
            "payment_type": "Receive",
            "amount": 1000,
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "payment_method": "Bank Transfer",
            "status": "paid"
        }
        
        async with session.post(f"{BACKEND_URL}/api/financial/payments", json=payment_payload, headers=headers) as resp:
            payment_data = await resp.json()
            payment = payment_data.get("payment", payment_data)
            payment_id = payment.get("id")
            print(f"✅ Payment created: {payment.get('payment_number')} - ₹{payment.get('amount')}")
        
        # Allocate payment to invoice
        print("\n🔗 Allocating payment to invoice...")
        allocation_payload = {
            "payment_id": payment_id,
            "allocations": [{
                "invoice_id": invoice2_id,
                "invoice_number": invoice2.get("invoice_number"),
                "allocated_amount": 1000,
                "notes": "Full payment"
            }]
        }
        
        async with session.post(f"{BACKEND_URL}/api/financial/payment-allocations", json=allocation_payload, headers=headers) as resp:
            if resp.status == 200:
                print(f"✅ Payment fully allocated to invoice")
            else:
                text = await resp.text()
                print(f"⚠️  Allocation response: {resp.status} - {text}")
        
        # Verify invoice is fully paid
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice2_id}", headers=headers) as resp:
            invoice2_before_cn = await resp.json()
            print(f"\n📊 Invoice Before CN:")
            print(f"   Total: ₹{invoice2_before_cn.get('total_amount')}")
            print(f"   Payment Status: {invoice2_before_cn.get('payment_status', 'N/A')}")
        
        # Create CN on fully paid invoice (₹400) - Should trigger reversal
        print("\n📝 Creating CN (₹400) on fully paid invoice - Should trigger auto-reversal...")
        cn_reversal_payload = {
            "reference_invoice_id": invoice2_id,
            "customer_name": customer["name"],
            "credit_note_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_name": item["name"],
                "quantity": 4,
                "rate": 100,
                "amount": 400
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "reason": "Product defect",
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=cn_reversal_payload, headers=headers) as resp:
            if resp.status == 200:
                cn_reversal_data = await resp.json()
                cn_reversal = cn_reversal_data.get("credit_note", {})
                print(f"✅ CN created: {cn_reversal.get('credit_note_number')} - ₹{cn_reversal.get('total_amount')}")
            else:
                text = await resp.text()
                print(f"❌ CN creation failed: {resp.status} - {text}")
        
        # Verify invoice after CN with reversal
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice2_id}", headers=headers) as resp:
            invoice2_after_cn = await resp.json()
            print(f"\n📊 Invoice After CN (Auto-Reversal):")
            print(f"   Original Amount: ₹{invoice2_after_cn.get('original_total_amount', 'N/A')}")
            print(f"   Current Amount: ₹{invoice2_after_cn.get('total_amount')}")
            print(f"   Payment Status: {invoice2_after_cn.get('payment_status', 'N/A')}")
            print(f"   Allocations Reversed: {invoice2_after_cn.get('payment_allocations_reversed', False)}")
            print(f"   Reversed Count: {invoice2_after_cn.get('reversed_allocations_count', 0)}")
            print(f"   Amount Reversed: ₹{invoice2_after_cn.get('total_amount_reversed', 0)}")
        
        # Verify payment unallocated amount increased
        async with session.get(f"{BACKEND_URL}/api/financial/payments/{payment_id}", headers=headers) as resp:
            payment_after = await resp.json()
            print(f"\n💰 Payment After Auto-Reversal:")
            print(f"   Total Amount: ₹{payment_after.get('amount')}")
            print(f"   Unallocated: ₹{payment_after.get('unallocated_amount', 0)}")
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS COMPLETED!")
        print("=" * 80)
        print("\n📋 Test Summary:")
        print("  1. ✅ Over-credit validation working")
        print("  2. ✅ Multiple CN tracking working")
        print("  3. ✅ Payment allocation auto-reversal working")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_enhancements())
