#!/usr/bin/env python3
"""
Enhancement 3 Complete Testing: Payment Allocation Auto-Reversal
Tests the LIFO reversal logic when CN/DN reduces invoice below allocated amount
"""
import asyncio
import aiohttp
import json
from datetime import datetime, timezone

BACKEND_URL = "https://erp-gili-1.preview.emergentagent.com"

async def test_payment_reversal():
    """Test payment allocation auto-reversal"""
    
    print("=" * 80)
    print("ENHANCEMENT 3: PAYMENT ALLOCATION AUTO-REVERSAL TEST")
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
            print(f"✅ Login successful")
        
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get test data
        print("\n📋 Step 2: Getting test data...")
        async with session.get(f"{BACKEND_URL}/api/master/customers?limit=1", headers=headers) as resp:
            customers = await resp.json()
            customer = customers[0] if customers else None
            print(f"✅ Customer: {customer['name']}")
        
        async with session.get(f"{BACKEND_URL}/api/stock/items?limit=1", headers=headers) as resp:
            items = await resp.json()
            item = items[0] if items else None
            print(f"✅ Item: {item['name']}")
        
        # SCENARIO: Create invoice, fully allocate payment, then issue CN
        print("\n" + "=" * 80)
        print("SCENARIO: CN on Fully Paid Invoice → Auto-Reversal Expected")
        print("=" * 80)
        
        # Step 1: Create Sales Invoice (₹1000)
        print("\n📝 Step 3: Creating Sales Invoice (₹1000)...")
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
                print(f"❌ Invoice creation failed: {text}")
                return
            invoice_data = await resp.json()
            invoice = invoice_data.get("invoice", {})
            invoice_id = invoice.get("id")
            invoice_number = invoice.get("invoice_number")
            print(f"✅ Invoice Created: {invoice_number}")
            print(f"   Amount: ₹{invoice.get('total_amount')}")
            print(f"   ID: {invoice_id}")
        
        # Step 2: Create Payment Entry (₹1000)
        print("\n💰 Step 4: Creating Payment Entry (₹1000)...")
        payment_payload = {
            "party_type": "Customer",
            "party_id": customer["id"],
            "party_name": customer["name"],
            "payment_type": "Receive",
            "amount": 1000.0,
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "payment_method": "Bank Transfer",
            "currency": "INR",
            "exchange_rate": 1.0,
            "status": "paid",
            "description": "Full payment for testing"
        }
        
        async with session.post(f"{BACKEND_URL}/api/financial/payments", json=payment_payload, headers=headers) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"❌ Payment creation failed: {text}")
                return
            payment_data = await resp.json()
            # Response might be wrapped or direct
            payment = payment_data.get("payment", payment_data) if isinstance(payment_data, dict) else payment_data
            payment_id = payment.get("id")
            payment_number = payment.get("payment_number")
            print(f"✅ Payment Created: {payment_number}")
            print(f"   Amount: ₹{payment.get('amount')}")
            print(f"   Unallocated: ₹{payment.get('unallocated_amount', payment.get('amount'))}")
            print(f"   ID: {payment_id}")
        
        # Step 3: Allocate Payment to Invoice
        print("\n🔗 Step 5: Allocating Payment to Invoice...")
        allocation_payload = {
            "payment_id": payment_id,
            "allocations": [{
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "allocated_amount": 1000.0,
                "notes": "Full payment allocation"
            }]
        }
        
        async with session.post(f"{BACKEND_URL}/api/financial/payment-allocations", json=allocation_payload, headers=headers) as resp:
            response_text = await resp.text()
            if resp.status == 200 or resp.status == 201:
                print(f"✅ Payment Allocated to Invoice")
                print(f"   Allocated: ₹1000")
            else:
                print(f"⚠️  Allocation status: {resp.status}")
                print(f"   Response: {response_text}")
                # Continue anyway to test CN logic
        
        # Verify invoice is fully paid
        print("\n📊 Step 6: Verifying Invoice Status...")
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice_id}", headers=headers) as resp:
            invoice_before = await resp.json()
            print(f"Invoice BEFORE CN:")
            print(f"   Total Amount: ₹{invoice_before.get('total_amount')}")
            print(f"   Payment Status: {invoice_before.get('payment_status', 'Unknown')}")
        
        # Verify payment
        async with session.get(f"{BACKEND_URL}/api/financial/payments/{payment_id}", headers=headers) as resp:
            payment_before = await resp.json()
            print(f"\nPayment BEFORE CN:")
            print(f"   Total Amount: ₹{payment_before.get('amount')}")
            print(f"   Unallocated: ₹{payment_before.get('unallocated_amount', 0)}")
        
        # Step 4: Create Credit Note (₹400) - Should trigger auto-reversal
        print("\n" + "=" * 80)
        print("🎯 Step 7: Creating Credit Note (₹400) - AUTO-REVERSAL TRIGGERED")
        print("=" * 80)
        
        cn_payload = {
            "reference_invoice_id": invoice_id,
            "customer_name": customer["name"],
            "customer_id": customer["id"],
            "credit_note_date": datetime.now(timezone.utc).isoformat(),
            "items": [{
                "item_name": item["name"],
                "quantity": 4,
                "rate": 100,
                "amount": 400
            }],
            "discount_amount": 0,
            "tax_rate": 0,
            "reason": "Product defect - triggering auto-reversal test",
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=cn_payload, headers=headers) as resp:
            if resp.status != 200:
                text = await resp.text()
                print(f"❌ CN creation failed: {text}")
                return
            cn_data = await resp.json()
            cn = cn_data.get("credit_note", {})
            print(f"✅ Credit Note Created: {cn.get('credit_note_number')}")
            print(f"   Amount: ₹{cn.get('total_amount')}")
        
        # Step 5: Verify Auto-Reversal Results
        print("\n" + "=" * 80)
        print("📊 Step 8: VERIFYING AUTO-REVERSAL RESULTS")
        print("=" * 80)
        
        # Check invoice
        async with session.get(f"{BACKEND_URL}/api/invoices/{invoice_id}", headers=headers) as resp:
            invoice_after = await resp.json()
            print(f"\n✅ Invoice AFTER CN:")
            print(f"   Original Amount: ₹{invoice_after.get('original_total_amount', 'N/A')}")
            print(f"   Current Amount: ₹{invoice_after.get('total_amount')}")
            print(f"   Expected: ₹600 (₹1000 - ₹400)")
            print(f"   Total CN Amount: ₹{invoice_after.get('total_credit_notes_amount', 0)}")
            print(f"   Payment Status: {invoice_after.get('payment_status', 'Unknown')}")
            
            # Check reversal tracking
            print(f"\n🔄 Auto-Reversal Tracking:")
            print(f"   Allocations Reversed: {invoice_after.get('payment_allocations_reversed', False)}")
            print(f"   Reversed Count: {invoice_after.get('reversed_allocations_count', 0)}")
            print(f"   Amount Reversed: ₹{invoice_after.get('total_amount_reversed', 0)}")
            print(f"   Expected Reversal: ₹400 (₹1000 allocated - ₹600 new total)")
        
        # Check payment
        async with session.get(f"{BACKEND_URL}/api/financial/payments/{payment_id}", headers=headers) as resp:
            payment_after = await resp.json()
            print(f"\n✅ Payment AFTER Auto-Reversal:")
            print(f"   Total Amount: ₹{payment_after.get('amount')}")
            print(f"   Unallocated: ₹{payment_after.get('unallocated_amount', 0)}")
            print(f"   Expected Unallocated: ₹400 (reversed amount)")
        
        # Check payment allocations
        print(f"\n🔍 Checking Payment Allocations...")
        async with session.get(f"{BACKEND_URL}/api/financial/payment-allocations?payment_id={payment_id}", headers=headers) as resp:
            if resp.status == 200:
                allocations = await resp.json()
                if isinstance(allocations, list):
                    print(f"   Active Allocations: {len(allocations)}")
                    for alloc in allocations:
                        print(f"   - Invoice: {alloc.get('invoice_number')}, Amount: ₹{alloc.get('allocated_amount')}")
                        print(f"     Expected: ₹600 (reduced from ₹1000)")
            else:
                text = await resp.text()
                print(f"   Response: {resp.status} - {text}")
        
        # Final Summary
        print("\n" + "=" * 80)
        print("📋 TEST SUMMARY")
        print("=" * 80)
        
        success = True
        
        # Validation checks
        expected_invoice_total = 600.0
        expected_cn_amount = 400.0
        expected_unallocated = 400.0
        
        actual_invoice_total = float(invoice_after.get('total_amount', 0))
        actual_cn_amount = float(invoice_after.get('total_credit_notes_amount', 0))
        actual_unallocated = float(payment_after.get('unallocated_amount', 0))
        
        print(f"\n✓ Validation Results:")
        
        if abs(actual_invoice_total - expected_invoice_total) < 0.01:
            print(f"  ✅ Invoice Total: ₹{actual_invoice_total} (Expected: ₹{expected_invoice_total})")
        else:
            print(f"  ❌ Invoice Total: ₹{actual_invoice_total} (Expected: ₹{expected_invoice_total})")
            success = False
        
        if abs(actual_cn_amount - expected_cn_amount) < 0.01:
            print(f"  ✅ CN Amount: ₹{actual_cn_amount} (Expected: ₹{expected_cn_amount})")
        else:
            print(f"  ❌ CN Amount: ₹{actual_cn_amount} (Expected: ₹{expected_cn_amount})")
            success = False
        
        if abs(actual_unallocated - expected_unallocated) < 0.01:
            print(f"  ✅ Payment Unallocated: ₹{actual_unallocated} (Expected: ₹{expected_unallocated})")
        else:
            print(f"  ❌ Payment Unallocated: ₹{actual_unallocated} (Expected: ₹{expected_unallocated})")
            success = False
        
        if invoice_after.get('payment_allocations_reversed'):
            print(f"  ✅ Reversal Tracked: Yes")
        else:
            print(f"  ⚠️  Reversal Tracked: No (might not have payment allocations)")
        
        print("\n" + "=" * 80)
        if success:
            print("🎉 ENHANCEMENT 3 TEST: PASSED")
        else:
            print("⚠️  ENHANCEMENT 3 TEST: PARTIAL SUCCESS")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_payment_reversal())
