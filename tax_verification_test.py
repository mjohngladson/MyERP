#!/usr/bin/env python3
"""
Tax Calculation Verification Test for GiLi PoS System
Verifies that the tax calculation issue has been resolved with correct 18% tax rate
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://smart-retail-5.preview.emergentagent.com"

class TaxVerificationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
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
        print(f"{status} - {test_name}: {details}")

    async def test_pos_tax_calculation_verification(self):
        """VERIFICATION: Test that tax calculation issue has been resolved with correct 18% tax rate"""
        try:
            print("\n🔍 TAX CALCULATION VERIFICATION STARTED - Testing 18% Tax Rate")
            
            # Test Case 1: Product A (₹100) - Expected ₹118 (100 + 18% tax)
            test_transaction_1 = {
                "pos_transaction_id": "VERIFY-TAX-001",
                "cashier_id": "test-cashier",
                "store_location": "Test Store",
                "pos_device_id": "test-device",
                "receipt_number": "VERIFY-001",
                "transaction_timestamp": "2025-01-21T10:00:00Z",
                "customer_id": None,
                "customer_name": "Walk-in Customer",
                "items": [
                    {
                        "product_id": "test-product-a",
                        "product_name": "Product A",
                        "quantity": 1,
                        "unit_price": 100.0,
                        "line_total": 100.0
                    }
                ],
                "subtotal": 100.0,
                "tax_amount": 18.0,  # 18% tax rate
                "discount_amount": 0.0,
                "total_amount": 118.0,  # Expected: 100 + 18 = 118
                "payment_method": "cash",
                "payment_details": {},
                "status": "completed"
            }
            
            # Test Case 2: Product B (₹200) - Expected ₹236 (200 + 18% tax)
            test_transaction_2 = {
                "pos_transaction_id": "VERIFY-TAX-002",
                "cashier_id": "test-cashier",
                "store_location": "Test Store",
                "pos_device_id": "test-device",
                "receipt_number": "VERIFY-002",
                "transaction_timestamp": "2025-01-21T10:05:00Z",
                "customer_id": None,
                "customer_name": "Walk-in Customer",
                "items": [
                    {
                        "product_id": "test-product-b",
                        "product_name": "Product B",
                        "quantity": 1,
                        "unit_price": 200.0,
                        "line_total": 200.0
                    }
                ],
                "subtotal": 200.0,
                "tax_amount": 36.0,  # 18% tax rate
                "discount_amount": 0.0,
                "total_amount": 236.0,  # Expected: 200 + 36 = 236
                "payment_method": "cash",
                "payment_details": {},
                "status": "completed"
            }
            
            # Submit Test Case 1: Product A
            async with self.session.post(f"{self.base_url}/api/pos/transactions", json=test_transaction_1) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success"):
                        order_number_1 = data.get("order_number")
                        self.log_test("Tax Verification - Product A Transaction", True, f"Product A transaction processed successfully. Order: {order_number_1}, Expected: ₹118", data)
                    else:
                        self.log_test("Tax Verification - Product A Transaction", False, "Transaction not successful", data)
                        return False
                else:
                    self.log_test("Tax Verification - Product A Transaction", False, f"HTTP {response.status}")
                    return False
            
            # Submit Test Case 2: Product B
            async with self.session.post(f"{self.base_url}/api/pos/transactions", json=test_transaction_2) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success"):
                        order_number_2 = data.get("order_number")
                        self.log_test("Tax Verification - Product B Transaction", True, f"Product B transaction processed successfully. Order: {order_number_2}, Expected: ₹236", data)
                    else:
                        self.log_test("Tax Verification - Product B Transaction", False, "Transaction not successful", data)
                        return False
                else:
                    self.log_test("Tax Verification - Product B Transaction", False, f"HTTP {response.status}")
                    return False
            
            # Wait a moment for transactions to be processed
            await asyncio.sleep(2)
            
            # Verify transactions appear in sales orders with correct amounts
            async with self.session.get(f"{self.base_url}/api/sales/orders") as response:
                if response.status == 200:
                    orders = await response.json()
                    
                    # Find our test transactions
                    verify_tax_001_found = False
                    verify_tax_002_found = False
                    
                    for order in orders:
                        pos_metadata = order.get("pos_metadata", {})
                        
                        if pos_metadata.get("pos_transaction_id") == "VERIFY-TAX-001":
                            if abs(order.get("total_amount", 0) - 118.0) < 0.01:
                                verify_tax_001_found = True
                                self.log_test("Tax Verification - Product A Amount Check", True, f"✅ Product A shows correct amount: ₹{order['total_amount']} (Expected: ₹118)", order)
                            else:
                                self.log_test("Tax Verification - Product A Amount Check", False, f"❌ Product A shows incorrect amount: ₹{order['total_amount']} (Expected: ₹118)", order)
                                return False
                        
                        elif pos_metadata.get("pos_transaction_id") == "VERIFY-TAX-002":
                            if abs(order.get("total_amount", 0) - 236.0) < 0.01:
                                verify_tax_002_found = True
                                self.log_test("Tax Verification - Product B Amount Check", True, f"✅ Product B shows correct amount: ₹{order['total_amount']} (Expected: ₹236)", order)
                            else:
                                self.log_test("Tax Verification - Product B Amount Check", False, f"❌ Product B shows incorrect amount: ₹{order['total_amount']} (Expected: ₹236)", order)
                                return False
                    
                    if verify_tax_001_found and verify_tax_002_found:
                        self.log_test("Tax Verification - Complete Verification", True, "✅ VERIFICATION SUCCESSFUL: Both Product A (₹118) and Product B (₹236) show correct tax calculations with 18% rate", {
                            "product_a_amount": 118.0,
                            "product_b_amount": 236.0,
                            "tax_rate": "18%",
                            "verification_status": "PASSED"
                        })
                    else:
                        missing = []
                        if not verify_tax_001_found:
                            missing.append("Product A (VERIFY-TAX-001)")
                        if not verify_tax_002_found:
                            missing.append("Product B (VERIFY-TAX-002)")
                        self.log_test("Tax Verification - Complete Verification", False, f"❌ VERIFICATION FAILED: Could not find test transactions: {missing}")
                        return False
                else:
                    self.log_test("Tax Verification - Sales Orders Check", False, f"HTTP {response.status}")
                    return False
            
            # Additional verification: Check that old incorrect transactions are not being created
            print("\n🔍 Checking for absence of old incorrect tax calculations...")
            
            # Look for any recent transactions with incorrect amounts (₹104, ₹70.85)
            incorrect_amounts_found = []
            for order in orders:
                if order.get("order_number", "").startswith("POS-"):
                    amount = order.get("total_amount", 0)
                    # Check for the old incorrect amounts
                    if abs(amount - 104.0) < 0.01 or abs(amount - 70.85) < 0.01:
                        # Only flag if it's a recent transaction (created in last hour)
                        order_date = order.get("created_at")
                        if order_date and isinstance(order_date, str):
                            from datetime import datetime, timedelta
                            try:
                                created_time = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
                                if created_time > datetime.now() - timedelta(hours=1):
                                    incorrect_amounts_found.append(f"₹{amount}")
                            except:
                                pass
            
            if not incorrect_amounts_found:
                self.log_test("Tax Verification - No Incorrect Amounts", True, "✅ No new transactions found with old incorrect tax calculations (₹104, ₹70.85)")
            else:
                self.log_test("Tax Verification - No Incorrect Amounts", False, f"❌ Found recent transactions with incorrect amounts: {incorrect_amounts_found}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Tax Verification", False, f"Error during tax verification: {str(e)}")
            return False

    async def run_verification(self):
        """Run the complete tax verification test suite"""
        print("🚀 Starting Tax Calculation Verification Tests...")
        
        success = await self.test_pos_tax_calculation_verification()
        
        # Print summary
        print("\n" + "="*80)
        print("TAX CALCULATION VERIFICATION SUMMARY")
        print("="*80)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        
        print(f"Tests Passed: {passed_tests}/{total_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if success:
            print("\n✅ TAX CALCULATION VERIFICATION PASSED")
            print("The tax calculation issue has been resolved!")
            print("- Product A (₹100) correctly calculates to ₹118 (100 + 18% tax)")
            print("- Product B (₹200) correctly calculates to ₹236 (200 + 18% tax)")
            print("- No new transactions with old incorrect amounts found")
        else:
            print("\n❌ TAX CALCULATION VERIFICATION FAILED")
            print("The tax calculation issue may still exist!")
        
        print("\nDetailed Test Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        return success

async def main():
    """Main function to run tax verification tests"""
    async with TaxVerificationTester() as tester:
        success = await tester.run_verification()
        return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)