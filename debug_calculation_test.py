#!/usr/bin/env python3
"""
Debug Credit/Debit Notes Calculation Issue
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://crediti-debi.preview.emergentagent.com"

async def debug_credit_note_update():
    """Debug the credit note update calculation issue"""
    
    async with aiohttp.ClientSession() as session:
        # Create Credit Note
        test_payload = {
            "customer_name": "Debug Test Customer",
            "customer_email": "debug@example.com",
            "credit_note_date": "2024-01-15",
            "reference_invoice": "INV-DEBUG-001",
            "reason": "Return",
            "items": [
                {
                    "item_name": "Debug Item A",
                    "quantity": 1,
                    "rate": 350.0,
                    "amount": 350.0
                }
            ],
            "discount_amount": 50.0,
            "tax_rate": 18.0,
            "status": "Draft"
        }
        
        print("🔍 Creating Credit Note...")
        async with session.post(f"{BACKEND_URL}/api/sales/credit-notes", json=test_payload) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("success"):
                    credit_note = data.get("credit_note")
                    credit_note_id = credit_note.get("id")
                    
                    print(f"✅ Created Credit Note: {credit_note_id}")
                    print(f"   Subtotal: {credit_note.get('subtotal')}")
                    print(f"   Discount: {credit_note.get('discount_amount')}")
                    print(f"   Tax Rate: {credit_note.get('tax_rate')}%")
                    print(f"   Tax Amount: {credit_note.get('tax_amount')}")
                    print(f"   Total: {credit_note.get('total_amount')}")
                    print(f"   Items: {credit_note.get('items')}")
                    
                    # Get the credit note to see current state
                    print("\n🔍 Getting Credit Note before update...")
                    async with session.get(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}") as get_response:
                        if get_response.status == 200:
                            current_data = await get_response.json()
                            print(f"   Current Items: {current_data.get('items')}")
                            print(f"   Current Subtotal: {current_data.get('subtotal')}")
                            print(f"   Current Discount: {current_data.get('discount_amount')}")
                            print(f"   Current Tax: {current_data.get('tax_amount')}")
                            print(f"   Current Total: {current_data.get('total_amount')}")
                    
                    # Update with only discount_amount and tax_rate (no items)
                    print("\n🔍 Updating Credit Note (discount only)...")
                    update_payload = {
                        "discount_amount": 30.0,
                        "tax_rate": 18.0
                    }
                    
                    async with session.put(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}", json=update_payload) as update_response:
                        if update_response.status == 200:
                            updated_data = await update_response.json()
                            print(f"✅ Updated Credit Note")
                            print(f"   Updated Subtotal: {updated_data.get('subtotal')}")
                            print(f"   Updated Discount: {updated_data.get('discount_amount')}")
                            print(f"   Updated Tax Rate: {updated_data.get('tax_rate')}%")
                            print(f"   Updated Tax Amount: {updated_data.get('tax_amount')}")
                            print(f"   Updated Total: {updated_data.get('total_amount')}")
                            print(f"   Updated Items: {updated_data.get('items')}")
                        else:
                            print(f"❌ Update failed: HTTP {update_response.status}")
                            error_text = await update_response.text()
                            print(f"   Error: {error_text}")
                    
                    # Try update with items included
                    print("\n🔍 Updating Credit Note (with items)...")
                    update_payload_with_items = {
                        "items": [
                            {
                                "item_name": "Debug Item A",
                                "quantity": 1,
                                "rate": 350.0,
                                "amount": 350.0
                            }
                        ],
                        "discount_amount": 30.0,
                        "tax_rate": 18.0
                    }
                    
                    async with session.put(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}", json=update_payload_with_items) as update_response2:
                        if update_response2.status == 200:
                            updated_data2 = await update_response2.json()
                            print(f"✅ Updated Credit Note (with items)")
                            print(f"   Updated Subtotal: {updated_data2.get('subtotal')}")
                            print(f"   Updated Discount: {updated_data2.get('discount_amount')}")
                            print(f"   Updated Tax Rate: {updated_data2.get('tax_rate')}%")
                            print(f"   Updated Tax Amount: {updated_data2.get('tax_amount')}")
                            print(f"   Updated Total: {updated_data2.get('total_amount')}")
                            print(f"   Updated Items: {updated_data2.get('items')}")
                        else:
                            print(f"❌ Update with items failed: HTTP {update_response2.status}")
                            error_text = await update_response2.text()
                            print(f"   Error: {error_text}")
                    
                    # Clean up
                    await session.delete(f"{BACKEND_URL}/api/sales/credit-notes/{credit_note_id}")
                    print(f"\n🗑️ Cleaned up Credit Note: {credit_note_id}")
                    
                else:
                    print(f"❌ Credit note creation failed: {data}")
            else:
                print(f"❌ HTTP {response.status}")
                error_text = await response.text()
                print(f"   Error: {error_text}")

if __name__ == "__main__":
    asyncio.run(debug_credit_note_update())