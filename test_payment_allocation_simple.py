#!/usr/bin/env python3
"""
Simple test for CN/DN Payment Allocation Validation
Focuses on the core validation logic
"""

import requests
import json

BACKEND_URL = "https://erp-integrity.preview.emergentagent.com"

def test_payment_allocation_validation():
    """Test that CN cannot be created when it would violate payment allocation"""
    
    print("\n" + "="*80)
    print("PAYMENT ALLOCATION VALIDATION TEST")
    print("="*80)
    
    # Create customer
    print("\n1. Creating customer...")
    cust_resp = requests.post(f"{BACKEND_URL}/api/master/customers", json={
        "name": "Test Customer Payment Alloc",
        "email": "test.payalloc@example.com",
        "phone": "+91 9999888877"
    })
    customer_id = cust_resp.json()["id"]
    print(f"   ✓ Customer created: {customer_id}")
    
    # Create invoice (draft to avoid JE collision)
    print("\n2. Creating sales invoice...")
    inv_resp = requests.post(f"{BACKEND_URL}/api/invoices/", json={
        "customer_id": customer_id,
        "customer_name": "Test Customer Payment Alloc",
        "invoice_date": "2025-01-25",
        "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
        "discount_amount": 0,
        "tax_rate": 18,
        "status": "draft"
    })
    invoice = inv_resp.json()["invoice"]
    invoice_id = invoice["id"]
    invoice_total = invoice["total_amount"]
    print(f"   ✓ Invoice created: {invoice_id}, Total: ₹{invoice_total}")
    
    # Create payment
    print("\n3. Creating payment...")
    pmt_resp = requests.post(f"{BACKEND_URL}/api/financial/payments", json={
        "payment_type": "Receive",
        "party_type": "Customer",
        "party_id": customer_id,
        "party_name": "Test Customer Payment Alloc",
        "payment_date": "2025-01-25",
        "amount": 60,
        "payment_method": "Cash"
    })
    payment_id = pmt_resp.json()["payment_id"]
    print(f"   ✓ Payment created: {payment_id}, Amount: ₹60")
    
    # Allocate payment to invoice
    print("\n4. Allocating payment to invoice...")
    alloc_resp = requests.post(f"{BACKEND_URL}/api/financial/payment-allocation/allocate", json={
        "payment_id": payment_id,
        "allocations": [{"invoice_id": invoice_id, "allocated_amount": 60}]
    })
    print(f"   ✓ Payment allocated: ₹60 to invoice")
    
    # Test 1: CN within limit (₹30) - should SUCCEED
    print("\n5. Testing CN ₹30 (within limit)...")
    cn_resp_30 = requests.post(f"{BACKEND_URL}/api/sales/credit-notes", json={
        "reference_invoice_id": invoice_id,
        "customer_name": "Test Customer Payment Alloc",
        "credit_note_date": "2025-01-25",
        "items": [{"item_name": "Widget", "quantity": 3, "rate": 10, "amount": 30}],
        "discount_amount": 0,
        "tax_rate": 0,
        "status": "draft"
    })
    
    if cn_resp_30.status_code == 200:
        cn_id = cn_resp_30.json()["credit_note"]["id"]
        print(f"   ✅ PASS: CN ₹30 created successfully (ID: {cn_id})")
        test1_pass = True
    else:
        print(f"   ❌ FAIL: CN ₹30 rejected (should succeed)")
        print(f"      Error: {cn_resp_30.json().get('detail')}")
        test1_pass = False
    
    # Test 2: CN exceeding limit (₹50) - should FAIL
    print("\n6. Testing CN ₹50 (exceeds limit)...")
    cn_resp_50 = requests.post(f"{BACKEND_URL}/api/sales/credit-notes", json={
        "reference_invoice_id": invoice_id,
        "customer_name": "Test Customer Payment Alloc",
        "credit_note_date": "2025-01-25",
        "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
        "discount_amount": 0,
        "tax_rate": 0,
        "status": "draft"
    })
    
    if cn_resp_50.status_code == 400:
        error_msg = cn_resp_50.json().get("detail", "")
        if "allocated payments" in error_msg.lower() or "maximum cn amount" in error_msg.lower():
            print(f"   ✅ PASS: CN ₹50 correctly rejected")
            print(f"      Reason: {error_msg[:150]}...")
            test2_pass = True
        else:
            print(f"   ❌ FAIL: Wrong error message")
            print(f"      Got: {error_msg}")
            test2_pass = False
    else:
        print(f"   ❌ FAIL: CN ₹50 was created (should be rejected)")
        test2_pass = False
    
    # Test 3: Fully allocated invoice - CN should FAIL
    print("\n7. Testing fully allocated invoice...")
    # Create another invoice
    inv2_resp = requests.post(f"{BACKEND_URL}/api/invoices/", json={
        "customer_id": customer_id,
        "customer_name": "Test Customer Payment Alloc",
        "invoice_date": "2025-01-25",
        "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
        "discount_amount": 0,
        "tax_rate": 0,
        "status": "draft"
    })
    invoice2_id = inv2_resp.json()["invoice"]["id"]
    invoice2_total = inv2_resp.json()["invoice"]["total_amount"]
    print(f"   ✓ Invoice 2 created: {invoice2_id}, Total: ₹{invoice2_total}")
    
    # Create and allocate full payment
    pmt2_resp = requests.post(f"{BACKEND_URL}/api/financial/payments", json={
        "payment_type": "Receive",
        "party_type": "Customer",
        "party_id": customer_id,
        "party_name": "Test Customer Payment Alloc",
        "payment_date": "2025-01-25",
        "amount": invoice2_total,
        "payment_method": "Cash"
    })
    payment2_id = pmt2_resp.json()["payment_id"]
    
    requests.post(f"{BACKEND_URL}/api/financial/payment-allocation/allocate", json={
        "payment_id": payment2_id,
        "allocations": [{"invoice_id": invoice2_id, "allocated_amount": invoice2_total}]
    })
    print(f"   ✓ Payment fully allocated: ₹{invoice2_total}")
    
    # Try to create CN - should FAIL
    cn_resp_full = requests.post(f"{BACKEND_URL}/api/sales/credit-notes", json={
        "reference_invoice_id": invoice2_id,
        "customer_name": "Test Customer Payment Alloc",
        "credit_note_date": "2025-01-25",
        "items": [{"item_name": "Widget", "quantity": 1, "rate": 10, "amount": 10}],
        "discount_amount": 0,
        "tax_rate": 0,
        "status": "draft"
    })
    
    if cn_resp_full.status_code == 400:
        error_msg = cn_resp_full.json().get("detail", "")
        if "fully allocated" in error_msg.lower() or "allocated payments" in error_msg.lower():
            print(f"   ✅ PASS: CN on fully allocated invoice correctly rejected")
            print(f"      Reason: {error_msg[:150]}...")
            test3_pass = True
        else:
            print(f"   ❌ FAIL: Wrong error message")
            print(f"      Got: {error_msg}")
            test3_pass = False
    else:
        print(f"   ❌ FAIL: CN was created (should be rejected)")
        test3_pass = False
    
    # Cleanup
    print("\n8. Cleaning up...")
    if test1_pass and 'cn_id' in locals():
        requests.delete(f"{BACKEND_URL}/api/sales/credit-notes/{cn_id}")
    requests.delete(f"{BACKEND_URL}/api/invoices/{invoice_id}")
    requests.delete(f"{BACKEND_URL}/api/invoices/{invoice2_id}")
    requests.delete(f"{BACKEND_URL}/api/financial/payments/{payment_id}")
    requests.delete(f"{BACKEND_URL}/api/financial/payments/{payment2_id}")
    requests.delete(f"{BACKEND_URL}/api/master/customers/{customer_id}")
    print("   ✓ Cleanup completed")
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    total = 3
    passed = sum([test1_pass, test2_pass, test3_pass])
    print(f"Total Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - Payment allocation validation working correctly!")
        return True
    else:
        print("\n❌ SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = test_payment_allocation_validation()
    exit(0 if success else 1)
