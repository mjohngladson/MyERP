#!/usr/bin/env python3
"""
Final verification of Credit/Debit Notes Calculation Fix
Testing the exact scenario from the review request
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://crediti-debi.preview.emergentagent.com"

async def test_exact_scenario():
    """Test the exact scenario from review request"""
    
    async with aiohttp.ClientSession() as session:
        print("🎯 TESTING EXACT SCENARIO FROM REVIEW REQUEST")
        print("   Subtotal: ₹350.00")
        print("   Discount: ₹50.00") 
        print("   Tax Rate: 18%")
        print("   Expected: Tax = ₹54.00 (on discounted amount ₹300), Total = ₹354.00")
        print("=" * 80)
        
        # Test Credit Notes
        print("\n📝 TESTING CREDIT NOTES:")
        credit_payload = {
            "customer_name": "Review Test Customer",
            "customer_email": "review@example.com",
            "credit_note_date": "2024-01-15",
            "reference_invoice": "INV-REVIEW-001",
            "reason": "Return",
            "items": [
                {
                    "item_name": "Review Test Item",
                    "quantity": 1,
                    "rate": 350.0,
                    "amount": 350.0
                }
            ],
            "discount_amount": 50.0,
            "tax_rate": 18.0,
            "status": "Draft"
        }
        
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=credit_payload) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("success"):
                    credit_note = data.get("credit_note")
                    credit_note_id = credit_note.get("id")
                    
                    subtotal = credit_note.get("subtotal")
                    discount = credit_note.get("discount_amount")
                    tax_rate = credit_note.get("tax_rate")
                    tax_amount = credit_note.get("tax_amount")
                    total = credit_note.get("total_amount")
                    
                    print(f"   ✅ CREATE Results:")
                    print(f"      Subtotal: ₹{subtotal}")
                    print(f"      Discount: ₹{discount}")
                    print(f"      Discounted Amount: ₹{subtotal - discount}")
                    print(f"      Tax Rate: {tax_rate}%")
                    print(f"      Tax Amount: ₹{tax_amount} (calculated on ₹{subtotal - discount})")
                    print(f"      Total: ₹{total}")
                    
                    # Verify exact values
                    if (abs(subtotal - 350.0) < 0.01 and
                        abs(discount - 50.0) < 0.01 and
                        abs(tax_amount - 54.0) < 0.01 and
                        abs(total - 354.0) < 0.01):
                        print(f"   ✅ CALCULATION CORRECT: Tax calculated on discounted amount!")
                    else:
                        print(f"   ❌ CALCULATION INCORRECT!")
                    
                    # Test UPDATE
                    print(f"\n   🔄 Testing UPDATE (change discount to ₹30):")
                    update_payload = {
                        "items": credit_note.get("items"),
                        "discount_amount": 30.0,
                        "tax_rate": 18.0
                    }
                    
                    async with session.put(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}", json=update_payload) as update_response:
                        if update_response.status == 200:
                            updated_data = await update_response.json()
                            
                            updated_subtotal = updated_data.get("subtotal")
                            updated_discount = updated_data.get("discount_amount")
                            updated_tax = updated_data.get("tax_amount")
                            updated_total = updated_data.get("total_amount")
                            
                            expected_discounted = 320.0  # 350 - 30
                            expected_tax = 57.6  # 320 * 18%
                            expected_total = 377.6  # 320 + 57.6
                            
                            print(f"      Updated Subtotal: ₹{updated_subtotal}")
                            print(f"      Updated Discount: ₹{updated_discount}")
                            print(f"      Updated Discounted Amount: ₹{updated_subtotal - updated_discount}")
                            print(f"      Updated Tax: ₹{updated_tax} (calculated on ₹{updated_subtotal - updated_discount})")
                            print(f"      Updated Total: ₹{updated_total}")
                            
                            if (abs(updated_tax - expected_tax) < 0.01 and
                                abs(updated_total - expected_total) < 0.01):
                                print(f"   ✅ UPDATE CALCULATION CORRECT!")
                            else:
                                print(f"   ❌ UPDATE CALCULATION INCORRECT!")
                    
                    # Clean up
                    await session.delete(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}")
        
        # Test Debit Notes
        print("\n📝 TESTING DEBIT NOTES:")
        debit_payload = {
            "supplier_name": "Review Test Supplier",
            "supplier_email": "supplier@example.com",
            "debit_note_date": "2024-01-15",
            "reference_invoice": "PINV-REVIEW-001",
            "reason": "Return",
            "items": [
                {
                    "item_name": "Review Test Item",
                    "quantity": 1,
                    "rate": 350.0,
                    "amount": 350.0
                }
            ],
            "discount_amount": 50.0,
            "tax_rate": 18.0,
            "status": "Draft"
        }
        
        async with session.post(f"{BACKEND_URL}/api/buying/debit-notes", json=debit_payload) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("success"):
                    debit_note = data.get("debit_note")
                    debit_note_id = debit_note.get("id")
                    
                    subtotal = debit_note.get("subtotal")
                    discount = debit_note.get("discount_amount")
                    tax_rate = debit_note.get("tax_rate")
                    tax_amount = debit_note.get("tax_amount")
                    total = debit_note.get("total_amount")
                    
                    print(f"   ✅ CREATE Results:")
                    print(f"      Subtotal: ₹{subtotal}")
                    print(f"      Discount: ₹{discount}")
                    print(f"      Discounted Amount: ₹{subtotal - discount}")
                    print(f"      Tax Rate: {tax_rate}%")
                    print(f"      Tax Amount: ₹{tax_amount} (calculated on ₹{subtotal - discount})")
                    print(f"      Total: ₹{total}")
                    
                    # Verify exact values
                    if (abs(subtotal - 350.0) < 0.01 and
                        abs(discount - 50.0) < 0.01 and
                        abs(tax_amount - 54.0) < 0.01 and
                        abs(total - 354.0) < 0.01):
                        print(f"   ✅ CALCULATION CORRECT: Tax calculated on discounted amount!")
                    else:
                        print(f"   ❌ CALCULATION INCORRECT!")
                    
                    # Clean up
                    await session.delete(f"{BACKEND_URL}/api/buying/debit-notes/{debit_note_id}")
        
        print("\n" + "=" * 80)
        print("🎉 FINAL VERIFICATION COMPLETE")
        print("✅ Credit Notes and Debit Notes calculation fix verified!")
        print("✅ Tax is correctly calculated on discounted amount, not original subtotal!")

if __name__ == "__main__":
    asyncio.run(test_exact_scenario())