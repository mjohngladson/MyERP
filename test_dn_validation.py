#!/usr/bin/env python3
"""
CRITICAL DEBUG TEST - DN Creation Validation Issue
Tests if DN is created in database despite validation error when amount > PI amount
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BACKEND_URL = "https://erp-accounting-8.preview.emergentagent.com"

async def test_dn_validation():
    """Test DN validation - ensure DN is NOT created when amount exceeds PI"""
    
    print("=" * 80)
    print("CRITICAL DEBUG TEST - DN Creation Validation Issue")
    print("=" * 80)
    print()
    
    async with aiohttp.ClientSession() as session:
        
        # STEP 1: Clean up - Delete ALL existing Debit Notes
        print("STEP 1: Cleaning up existing Debit Notes...")
        try:
            async with session.get(f"{BACKEND_URL}/api/buying/debit-notes?limit=500") as response:
                if response.status == 200:
                    dns = await response.json()
                    print(f"  Found {len(dns)} existing DNs")
                    
                    for dn in dns:
                        dn_id = dn.get("id")
                        if dn_id:
                            try:
                                async with session.delete(f"{BACKEND_URL}/api/buying/debit-notes/{dn_id}") as del_resp:
                                    if del_resp.status == 200:
                                        print(f"  ✅ Deleted DN: {dn.get('debit_note_number')}")
                                    else:
                                        print(f"  ⚠️  Could not delete DN {dn.get('debit_note_number')} (status: {dn.get('status')})")
                            except Exception as e:
                                print(f"  ⚠️  Error deleting DN {dn_id}: {e}")
                    
                    print(f"  ✅ Cleanup complete")
                else:
                    print(f"  ⚠️  Could not fetch DNs: HTTP {response.status}")
        except Exception as e:
            print(f"  ⚠️  Cleanup error: {e}")
        
        print()
        
        # STEP 2: Create Test Purchase Invoice
        print("STEP 2: Creating Test Purchase Invoice...")
        pi_payload = {
            "supplier_name": "Test Supplier DN Validation",
            "invoice_date": "2025-01-22",
            "invoice_number": f"PI-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "paid"
        }
        
        pi_id = None
        pi_total = None
        pi_number = None
        
        try:
            async with session.post(f"{BACKEND_URL}/api/purchase/invoices", json=pi_payload) as response:
                response_text = await response.text()
                print(f"  HTTP Status: {response.status}")
                print(f"  Response: {response_text[:500]}")
                
                if response.status == 200:
                    data = json.loads(response_text)
                    if data.get("success") and "invoice" in data:
                        pi_id = data["invoice"].get("id")
                        pi_total = data["invoice"].get("total_amount")
                        pi_number = data["invoice"].get("invoice_number")
                        print(f"  ✅ PI Created: {pi_number}")
                        print(f"     ID from response: {pi_id}")
                        print(f"     Total: ₹{pi_total}")
                        
                        # Query the PI back to get the actual stored ID
                        async with session.get(f"{BACKEND_URL}/api/purchase/invoices/{pi_id}") as get_resp:
                            if get_resp.status == 200:
                                pi_data = await get_resp.json()
                                pi_id = pi_data.get("id")
                                print(f"     ID from database: {pi_id}")
                            else:
                                print(f"     ⚠️  Could not verify PI ID from database")
                    else:
                        print(f"  ❌ Invalid response structure")
                        return
                else:
                    print(f"  ❌ Failed to create PI")
                    return
        except Exception as e:
            print(f"  ❌ Error creating PI: {e}")
            return
        
        print()
        
        # STEP 3: Attempt to Create DN with Amount > PI (This should FAIL)
        print("STEP 3: Attempting to create DN with amount > PI amount...")
        print(f"  PI Total: ₹{pi_total}")
        print(f"  DN Amount: ₹177 (₹150 + 18% tax)")
        print(f"  Expected: HTTP 400 error, NO DN created in database")
        print()
        
        dn_payload = {
            "reference_invoice_id": pi_id,
            "supplier_name": "Test Supplier DN Validation",
            "debit_note_date": "2025-01-22",
            "items": [{"item_name": "Widget", "quantity": 15, "rate": 10, "amount": 150}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "draft"
        }
        
        dn_created = False
        
        try:
            async with session.post(f"{BACKEND_URL}/api/buying/debit-notes", json=dn_payload) as response:
                response_text = await response.text()
                http_status = response.status
                
                print(f"  HTTP Status: {http_status}")
                print(f"  Response Body: {response_text}")
                print()
                
                if http_status == 200:
                    print("  ❌ CRITICAL BUG: DN creation returned HTTP 200 (should be 400)")
                    dn_created = True
                elif http_status == 400:
                    print("  ✅ Correctly rejected with HTTP 400")
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get("detail", "")
                        if "exceeds available balance" in error_msg or "Debit Note creation rejected" in error_msg:
                            print(f"  ✅ Error message is correct: {error_msg[:100]}...")
                        else:
                            print(f"  ⚠️  Error message unexpected: {error_msg}")
                    except:
                        pass
                else:
                    print(f"  ⚠️  Unexpected HTTP status: {http_status}")
        except Exception as e:
            print(f"  ❌ Error during DN creation attempt: {e}")
        
        print()
        
        # STEP 4: CRITICAL - Check if DN was created in database despite validation error
        print("STEP 4: Checking if DN was created in database...")
        
        try:
            async with session.get(f"{BACKEND_URL}/api/buying/debit-notes") as response:
                if response.status == 200:
                    dns = await response.json()
                    
                    # Filter DNs linked to our test PI
                    test_dns = [dn for dn in dns if dn.get("reference_invoice_id") == pi_id or dn.get("reference_invoice") == pi_number]
                    dn_count = len(test_dns)
                    
                    print(f"  Total DNs in database: {len(dns)}")
                    print(f"  DNs linked to test PI ({pi_number}): {dn_count}")
                    print()
                    
                    if dn_count == 0:
                        print("  ✅ VALIDATION WORKING: NO DN created in database for test PI")
                        print("  ✅ TEST PASSED")
                    else:
                        print("  ❌ CRITICAL BUG: DN was created in database despite validation error!")
                        print("  ❌ TEST FAILED")
                        print()
                        print("  DNs linked to test PI:")
                        for dn in test_dns:
                            print(f"    - {dn.get('debit_note_number')}: ₹{dn.get('total_amount')} (status: {dn.get('status')})")
                        print()
                        print("  This confirms the user's report: Error message appears but DN is still created")
                else:
                    print(f"  ⚠️  Could not fetch DNs: HTTP {response.status}")
        except Exception as e:
            print(f"  ❌ Error checking DNs: {e}")
        
        print()
        print("=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_dn_validation())
