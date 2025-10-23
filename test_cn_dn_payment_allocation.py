#!/usr/bin/env python3
"""
Test Credit/Debit Note Payment Allocation Validation
Tests that CN/DN cannot be created if it would violate payment allocation constraints
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BACKEND_URL = "https://erp-accounting-8.preview.emergentagent.com"

class PaymentAllocationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.test_results = []
        self.created_resources = {
            "invoices": [],
            "credit_notes": [],
            "debit_notes": [],
            "payments": [],
            "customers": [],
            "suppliers": []
        }
        
    async def __aenter__(self):
        connector = aiohttp.TCPConnector()
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            connector_owner=True
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"  Details: {details}")
    
    async def cleanup_resources(self):
        """Clean up all created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete credit notes
        for cn_id in self.created_resources["credit_notes"]:
            try:
                async with self.session.delete(f"{self.base_url}/api/sales/credit-notes/{cn_id}") as response:
                    if response.status in [200, 404]:
                        print(f"  ✓ Deleted Credit Note: {cn_id}")
            except Exception as e:
                print(f"  ✗ Failed to delete Credit Note {cn_id}: {e}")
        
        # Delete debit notes
        for dn_id in self.created_resources["debit_notes"]:
            try:
                async with self.session.delete(f"{self.base_url}/api/buying/debit-notes/{dn_id}") as response:
                    if response.status in [200, 404]:
                        print(f"  ✓ Deleted Debit Note: {dn_id}")
            except Exception as e:
                print(f"  ✗ Failed to delete Debit Note {dn_id}: {e}")
        
        # Delete invoices
        for inv_id in self.created_resources["invoices"]:
            try:
                async with self.session.delete(f"{self.base_url}/api/invoices/{inv_id}") as response:
                    if response.status in [200, 404]:
                        print(f"  ✓ Deleted Invoice: {inv_id}")
            except Exception as e:
                print(f"  ✗ Failed to delete Invoice {inv_id}: {e}")
        
        # Delete payments
        for pmt_id in self.created_resources["payments"]:
            try:
                async with self.session.delete(f"{self.base_url}/api/financial/payments/{pmt_id}") as response:
                    if response.status in [200, 404]:
                        print(f"  ✓ Deleted Payment: {pmt_id}")
            except Exception as e:
                print(f"  ✗ Failed to delete Payment {pmt_id}: {e}")
        
        # Delete customers
        for cust_id in self.created_resources["customers"]:
            try:
                async with self.session.delete(f"{self.base_url}/api/master/customers/{cust_id}") as response:
                    if response.status in [200, 404]:
                        print(f"  ✓ Deleted Customer: {cust_id}")
            except Exception as e:
                print(f"  ✗ Failed to delete Customer {cust_id}: {e}")
        
        print("✅ Cleanup completed\n")
    
    async def test_scenario_1_fully_allocated_invoice(self):
        """
        Scenario 1: Credit Note on Fully Allocated Invoice
        - Create SI with ₹118 total
        - Allocate full payment of ₹118
        - Attempt to create CN - should FAIL
        """
        print("\n" + "="*80)
        print("SCENARIO 1: Credit Note on Fully Allocated Invoice")
        print("="*80)
        
        # Step 0: Create Customer
        cust_payload = {
            "name": "Test Customer Allocation",
            "email": "test.allocation@example.com",
            "phone": "+91 9999999991"
        }
        
        async with self.session.post(f"{self.base_url}/api/master/customers", json=cust_payload) as response:
            if response.status == 200:
                data = await response.json()
                customer_id = data["id"]
                self.created_resources["customers"].append(customer_id)
                self.log_test("1.0 Create Customer", True, f"Customer ID: {customer_id}")
            else:
                text = await response.text()
                self.log_test("1.0 Create Customer", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 1: Create Sales Invoice
        si_payload = {
            "customer_id": customer_id,
            "customer_name": "Test Customer Allocation",
            "invoice_date": "2025-01-23",
            "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "submitted"
        }
        
        async with self.session.post(f"{self.base_url}/api/invoices/", json=si_payload) as response:
            if response.status == 200:
                data = await response.json()
                si_id = data["invoice"]["id"]
                si_total = data["invoice"]["total_amount"]
                self.created_resources["invoices"].append(si_id)
                self.log_test("1.1 Create Sales Invoice", True, f"SI ID: {si_id}, Total: ₹{si_total}")
            else:
                text = await response.text()
                self.log_test("1.1 Create Sales Invoice", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 2: Create Payment and Allocate Fully
        pmt_payload = {
            "payment_type": "Receive",
            "party_type": "Customer",
            "party_id": customer_id,
            "party_name": "Test Customer Allocation",
            "payment_date": "2025-01-23",
            "amount": si_total,
            "payment_method": "Cash"
        }
        
        async with self.session.post(f"{self.base_url}/api/financial/payments", json=pmt_payload) as response:
            if response.status == 200:
                data = await response.json()
                pmt_id = data["payment"]["id"]
                self.created_resources["payments"].append(pmt_id)
                self.log_test("1.2 Create Payment", True, f"Payment ID: {pmt_id}, Amount: ₹{si_total}")
            else:
                text = await response.text()
                self.log_test("1.2 Create Payment", False, f"HTTP {response.status}: {text}")
                return False
        
        # Allocate payment to invoice
        alloc_payload = {
            "payment_id": pmt_id,
            "allocations": [{
                "invoice_id": si_id,
                "allocated_amount": si_total
            }]
        }
        
        async with self.session.post(f"{self.base_url}/api/financial/payment-allocation/allocate", json=alloc_payload) as response:
            if response.status == 200:
                self.log_test("1.3 Allocate Payment to Invoice", True, f"Allocated ₹{si_total} to invoice")
            else:
                text = await response.text()
                self.log_test("1.3 Allocate Payment to Invoice", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 3: Attempt to Create CN - Should FAIL
        cn_payload = {
            "reference_invoice_id": si_id,
            "customer_name": "Test Customer Allocation",
            "credit_note_date": "2025-01-23",
            "items": [{"item_name": "Widget", "quantity": 2, "rate": 10, "amount": 20}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "draft"
        }
        
        async with self.session.post(f"{self.base_url}/api/sales/credit-notes", json=cn_payload) as response:
            if response.status == 400:
                data = await response.json()
                error_msg = data.get("detail", "")
                if "fully allocated" in error_msg.lower() or "allocated payments" in error_msg.lower():
                    self.log_test("1.4 Attempt CN on Fully Allocated Invoice", True, f"Correctly rejected: {error_msg}")
                    return True
                else:
                    self.log_test("1.4 Attempt CN on Fully Allocated Invoice", False, f"Wrong error message: {error_msg}")
                    return False
            else:
                text = await response.text()
                self.log_test("1.4 Attempt CN on Fully Allocated Invoice", False, f"Expected HTTP 400, got {response.status}: {text}")
                return False
    
    async def test_scenario_2_partial_allocation_within_limit(self):
        """
        Scenario 2: Credit Note on Partially Allocated Invoice (Within Limit)
        - Create SI with ₹118 total
        - Allocate partial payment of ₹60
        - Attempt CN ₹30 - should SUCCEED (invoice after CN: ₹88 > ₹60)
        - Attempt CN ₹50 - should FAIL (invoice after CN: ₹68 < ₹60)
        """
        print("\n" + "="*80)
        print("SCENARIO 2: Credit Note on Partially Allocated Invoice")
        print("="*80)
        
        # Step 0: Create Customer
        cust_payload = {
            "name": "Test Customer Partial",
            "email": "test.partial@example.com",
            "phone": "+91 9999999992"
        }
        
        async with self.session.post(f"{self.base_url}/api/master/customers", json=cust_payload) as response:
            if response.status == 200:
                data = await response.json()
                customer_id = data["id"]
                self.created_resources["customers"].append(customer_id)
                self.log_test("2.0 Create Customer", True, f"Customer ID: {customer_id}")
            else:
                text = await response.text()
                self.log_test("2.0 Create Customer", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 1: Create Sales Invoice
        si_payload = {
            "customer_id": customer_id,
            "customer_name": "Test Customer Partial",
            "invoice_date": "2025-01-23",
            "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
            "discount_amount": 0,
            "tax_rate": 18,
            "status": "submitted"
        }
        
        async with self.session.post(f"{self.base_url}/api/invoices/", json=si_payload) as response:
            if response.status == 200:
                data = await response.json()
                si_id = data["invoice"]["id"]
                si_total = data["invoice"]["total_amount"]
                self.created_resources["invoices"].append(si_id)
                self.log_test("2.1 Create Sales Invoice", True, f"SI ID: {si_id}, Total: ₹{si_total}")
            else:
                text = await response.text()
                self.log_test("2.1 Create Sales Invoice", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 2: Create Payment and Allocate Partially (₹60)
        pmt_payload = {
            "payment_type": "Receive",
            "party_type": "Customer",
            "party_id": customer_id,
            "party_name": "Test Customer Partial",
            "payment_date": "2025-01-23",
            "amount": 60,
            "payment_method": "Cash"
        }
        
        async with self.session.post(f"{self.base_url}/api/financial/payments", json=pmt_payload) as response:
            if response.status == 200:
                data = await response.json()
                pmt_id = data["payment"]["id"]
                self.created_resources["payments"].append(pmt_id)
                self.log_test("2.2 Create Payment", True, f"Payment ID: {pmt_id}, Amount: ₹60")
            else:
                text = await response.text()
                self.log_test("2.2 Create Payment", False, f"HTTP {response.status}: {text}")
                return False
        
        # Allocate payment to invoice
        alloc_payload = {
            "payment_id": pmt_id,
            "allocations": [{
                "invoice_id": si_id,
                "allocated_amount": 60
            }]
        }
        
        async with self.session.post(f"{self.base_url}/api/financial/payment-allocation/allocate", json=alloc_payload) as response:
            if response.status == 200:
                self.log_test("2.3 Allocate Partial Payment", True, "Allocated ₹60 to invoice")
            else:
                text = await response.text()
                self.log_test("2.3 Allocate Partial Payment", False, f"HTTP {response.status}: {text}")
                return False
        
        # Step 3: Attempt CN ₹30 - Should SUCCEED
        # Invoice: ₹118, Allocated: ₹60, After CN: ₹88 > ₹60 ✅
        cn_payload_30 = {
            "reference_invoice_id": si_id,
            "customer_name": "Test Customer Partial",
            "credit_note_date": "2025-01-23",
            "items": [{"item_name": "Widget", "quantity": 3, "rate": 10, "amount": 30}],
            "discount_amount": 0,
            "tax_rate": 0,
            "status": "draft"
        }
        
        async with self.session.post(f"{self.base_url}/api/sales/credit-notes", json=cn_payload_30) as response:
            if response.status == 200:
                data = await response.json()
                cn_id = data["credit_note"]["id"]
                self.created_resources["credit_notes"].append(cn_id)
                self.log_test("2.4 Attempt CN ₹30 (Within Limit)", True, f"CN created successfully: {cn_id}")
            else:
                text = await response.text()
                self.log_test("2.4 Attempt CN ₹30 (Within Limit)", False, f"Expected HTTP 200, got {response.status}: {text}")
                return False
        
        # Step 4: Attempt CN ₹50 - Should FAIL
        # After first CN, invoice would be ₹88, after second CN: ₹38 < ₹60 ❌
        cn_payload_50 = {
            "reference_invoice_id": si_id,
            "customer_name": "Test Customer Partial",
            "credit_note_date": "2025-01-23",
            "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
            "discount_amount": 0,
            "tax_rate": 0,
            "status": "draft"
        }
        
        async with self.session.post(f"{self.base_url}/api/sales/credit-notes", json=cn_payload_50) as response:
            if response.status == 400:
                data = await response.json()
                error_msg = data.get("detail", "")
                if "allocated payments" in error_msg.lower() or "maximum cn amount" in error_msg.lower():
                    self.log_test("2.5 Attempt CN ₹50 (Exceeds Limit)", True, f"Correctly rejected: {error_msg}")
                    return True
                else:
                    self.log_test("2.5 Attempt CN ₹50 (Exceeds Limit)", False, f"Wrong error message: {error_msg}")
                    return False
            else:
                text = await response.text()
                self.log_test("2.5 Attempt CN ₹50 (Exceeds Limit)", False, f"Expected HTTP 400, got {response.status}: {text}")
                return False
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*80)
        print("CREDIT/DEBIT NOTE PAYMENT ALLOCATION VALIDATION TESTS")
        print("="*80)
        
        try:
            # Run scenarios
            await self.test_scenario_1_fully_allocated_invoice()
            await self.test_scenario_2_partial_allocation_within_limit()
            
        finally:
            # Cleanup
            await self.cleanup_resources()
        
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for r in self.test_results:
                if not r["success"]:
                    print(f"  - {r['test']}: {r['details']}")
        
        return failed_tests == 0


async def main():
    async with PaymentAllocationTester() as tester:
        success = await tester.run_all_tests()
        return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
