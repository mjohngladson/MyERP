#!/usr/bin/env python3
"""
COMPREHENSIVE DN VALIDATION TEST
Tests cumulative DN tracking - ensures multiple DNs cannot exceed PI amount
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BACKEND_URL = "https://erp-accounting-8.preview.emergentagent.com"

async def test_cumulative_dn_validation():
    """Test cumulative DN validation - multiple DNs should not exceed PI total"""
    
    print("=" * 80)
    print("COMPREHENSIVE DN VALIDATION TEST - Cumulative Tracking")
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
                        if dn_id and dn.get("status") == "draft":
                            try:
                                async with session.delete(f"{BACKEND_URL}/api/buying/debit-notes/{dn_id}") as del_resp:
                                    if del_resp.status == 200:
                                        print(f"  ✅ Deleted DN: {dn.get('debit_note_number')}")
                            except Exception as e:
                                pass
                    
                    print(f"  ✅ Cleanup complete")
        except Exception as e:
            print(f"  ⚠️  Cleanup error: {e}")
        
        print()
        
        # STEP 2: Create Test Purchase Invoice (₹100 + 18% = ₹118)
        print("STEP 2: Creating Test Purchase Invoice...")
        pi_payload = {
            "supplier_name": "Test Supplier Cumulative",
            "invoice_date": "2025-01-22",
            "invoice_number": f"PI-CUM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
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
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") and "invoice" in data:
                        pi_id = data["invoice"].get("id")
                        pi_total = data["invoice"].get("total_amount")
                        pi_number = data["invoice"].get("invoice_number")
                        
                        # Query back to get actual stored ID
                        async with session.get(f"{BACKEND_URL}/api/purchase/invoices/{pi_id}") as get_resp:
                            if get_resp.status == 200:
                                pi_data = await get_resp.json()
                                pi_id = pi_data.get("id")
                        
                        print(f"  ✅ PI Created: {pi_number}")
                        print(f"     ID: {pi_id}")
                        print(f"     Total: ₹{pi_total}")
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
        
        # STEP 3: Create First DN (₹50 + 18% = ₹59) - Should SUCCEED
        print("STEP 3: Creating First DN (₹59 - within limit)...")
        dn1_payload = {
            "reference_invoice_id": pi_id,
            "supplier_name": "Test Supplier Cumulative",
            "debit_note_date": "2025-01-22",
            "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "draft"
        }
        
        dn1_id = None
        dn1_total = None
        
        try:
            async with session.post(f"{BACKEND_URL}/api/buying/debit-notes", json=dn1_payload) as response:
                response_text = await response.text()
                
                if response.status == 200:
                    data = json.loads(response_text)
                    if data.get("success") and "debit_note" in data:
                        dn1_id = data["debit_note"].get("id")
                        dn1_total = data["debit_note"].get("total_amount")
                        dn1_number = data["debit_note"].get("debit_note_number")
                        print(f"  ✅ First DN Created: {dn1_number}")
                        print(f"     Total: ₹{dn1_total}")
                        print(f"     Remaining PI balance: ₹{pi_total - dn1_total}")
                    else:
                        print(f"  ❌ Invalid response structure")
                        return
                else:
                    print(f"  ❌ First DN creation failed: HTTP {response.status}")
                    print(f"     Response: {response_text}")
                    return
        except Exception as e:
            print(f"  ❌ Error creating first DN: {e}")
            return
        
        print()
        
        # STEP 4: Attempt to Create Second DN (₹100 + 18% = ₹118) - Should FAIL
        # Because: First DN = ₹59, Second DN = ₹118, Total = ₹177 > PI Total ₹118
        print("STEP 4: Attempting to create Second DN (₹118 - exceeds remaining balance)...")
        print(f"  PI Total: ₹{pi_total}")
        print(f"  First DN: ₹{dn1_total}")
        print(f"  Remaining: ₹{pi_total - dn1_total}")
        print(f"  Second DN Amount: ₹118")
        print(f"  Expected: HTTP 400 error (₹59 + ₹118 = ₹177 > ₹118)")
        print()
        
        dn2_payload = {
            "reference_invoice_id": pi_id,
            "supplier_name": "Test Supplier Cumulative",
            "debit_note_date": "2025-01-22",
            "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "draft"
        }
        
        dn2_created = False
        
        try:
            async with session.post(f"{BACKEND_URL}/api/buying/debit-notes", json=dn2_payload) as response:
                response_text = await response.text()
                http_status = response.status
                
                print(f"  HTTP Status: {http_status}")
                print(f"  Response: {response_text[:200]}...")
                print()
                
                if http_status == 200:
                    print("  ❌ CRITICAL BUG: Second DN was created (should be rejected)")
                    dn2_created = True
                elif http_status == 400:
                    print("  ✅ Correctly rejected with HTTP 400")
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get("detail", "")
                        if "exceeds available balance" in error_msg:
                            print(f"  ✅ Error message is correct")
                            # Check if it mentions the cumulative amount
                            if "Already debited" in error_msg and "59" in error_msg:
                                print(f"  ✅ Error message includes cumulative DN tracking")
                            else:
                                print(f"  ⚠️  Error message doesn't mention existing DN amount")
                        else:
                            print(f"  ⚠️  Error message unexpected: {error_msg}")
                    except:
                        pass
                else:
                    print(f"  ⚠️  Unexpected HTTP status: {http_status}")
        except Exception as e:
            print(f"  ❌ Error during second DN creation: {e}")
        
        print()
        
        # STEP 5: Verify DN count in database
        print("STEP 5: Verifying DN count in database...")
        
        try:
            async with session.get(f"{BACKEND_URL}/api/buying/debit-notes") as response:
                if response.status == 200:
                    dns = await response.json()
                    
                    # Filter DNs linked to our test PI
                    test_dns = [dn for dn in dns if dn.get("reference_invoice_id") == pi_id or dn.get("reference_invoice") == pi_number]
                    
                    print(f"  DNs linked to test PI: {len(test_dns)}")
                    
                    for dn in test_dns:
                        print(f"    - {dn.get('debit_note_number')}: ₹{dn.get('total_amount')} (status: {dn.get('status')})")
                    
                    print()
                    
                    if len(test_dns) == 1:
                        print("  ✅ CUMULATIVE VALIDATION WORKING: Only 1 DN created")
                        print("  ✅ TEST PASSED")
                    elif len(test_dns) == 2:
                        print("  ❌ CRITICAL BUG: 2 DNs created (cumulative tracking failed)")
                        print("  ❌ TEST FAILED")
                        total_dn_amount = sum(float(dn.get("total_amount", 0)) for dn in test_dns)
                        print(f"     Total DN amount: ₹{total_dn_amount} (exceeds PI total ₹{pi_total})")
                    else:
                        print(f"  ⚠️  Unexpected DN count: {len(test_dns)}")
                else:
                    print(f"  ⚠️  Could not fetch DNs: HTTP {response.status}")
        except Exception as e:
            print(f"  ❌ Error checking DNs: {e}")
        
        print()
        
        # STEP 6: Test with valid second DN (within remaining balance)
        print("STEP 6: Creating valid Second DN (₹59 - within remaining balance)...")
        print(f"  Remaining balance: ₹{pi_total - dn1_total}")
        print(f"  Second DN Amount: ₹59")
        print(f"  Expected: SUCCESS (₹59 + ₹59 = ₹118 = PI Total)")
        print()
        
        dn3_payload = {
            "reference_invoice_id": pi_id,
            "supplier_name": "Test Supplier Cumulative",
            "debit_note_date": "2025-01-22",
            "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "draft"
        }
        
        try:
            async with session.post(f"{BACKEND_URL}/api/buying/debit-notes", json=dn3_payload) as response:
                response_text = await response.text()
                
                if response.status == 200:
                    data = json.loads(response_text)
                    if data.get("success") and "debit_note" in data:
                        dn3_number = data["debit_note"].get("debit_note_number")
                        dn3_total = data["debit_note"].get("total_amount")
                        print(f"  ✅ Second DN Created: {dn3_number}")
                        print(f"     Total: ₹{dn3_total}")
                        print(f"     Cumulative DN amount: ₹{dn1_total + dn3_total} (equals PI total ₹{pi_total})")
                    else:
                        print(f"  ❌ Invalid response structure")
                else:
                    print(f"  ❌ Second DN creation failed: HTTP {response.status}")
                    print(f"     Response: {response_text}")
        except Exception as e:
            print(f"  ❌ Error creating second DN: {e}")
        
        print()
        print("=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_cumulative_dn_validation())
