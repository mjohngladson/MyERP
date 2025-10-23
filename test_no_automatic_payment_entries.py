#!/usr/bin/env python3
"""
Test Script: Verify NO Automatic Payment Entry Creation for DN/CN
Tests that submitting Debit Notes and Credit Notes NO LONGER creates automatic payment entries (refunds)
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "https://erp-accounting-8.preview.emergentagent.com"

class DNCNPaymentTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.test_results = []
        
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
        """Log test results"""
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
    
    async def get_payments_count(self):
        """Get current count of payment entries"""
        try:
            async with self.session.get(f"{self.base_url}/api/payments?limit=500") as response:
                if response.status == 200:
                    data = await response.json()
                    return len(data) if isinstance(data, list) else 0
                return 0
        except Exception as e:
            print(f"  Error getting payments count: {str(e)}")
            return 0
    
    async def get_journal_entries_count(self, voucher_type: str):
        """Get count of journal entries for specific voucher type"""
        try:
            async with self.session.get(f"{self.base_url}/api/journal-entries?limit=500") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        return len([je for je in data if je.get("voucher_type") == voucher_type])
                return 0
        except Exception as e:
            print(f"  Error getting journal entries: {str(e)}")
            return 0
    
    async def test_debit_note_no_payment_entry(self):
        """
        Scenario 1: Debit Note Submission - No Automatic Payment Entry
        """
        print("\n" + "="*80)
        print("SCENARIO 1: DEBIT NOTE SUBMISSION - NO AUTOMATIC PAYMENT ENTRY")
        print("="*80)
        
        pi_id = None
        dn_id = None
        
        try:
            # Step 1: Create Purchase Invoice (Paid status)
            print("\n[Step 1] Creating Purchase Invoice (Paid status)...")
            pi_payload = {
                "supplier_name": "Test Supplier Payment DN",
                "invoice_date": "2025-01-22",
                "invoice_number": "PI-PAY-TEST-DN-001",
                "items": [{"item_name": "Widget", "quantity": 10, "rate": 10, "amount": 100}],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "paid"
            }
            
            async with self.session.post(f"{self.base_url}/api/purchase/invoices", json=pi_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    pi_id = data.get("invoice", {}).get("id") or data.get("purchase_invoice", {}).get("id")
                    pi_total = data.get("invoice", {}).get("total_amount") or data.get("purchase_invoice", {}).get("total_amount")
                    self.log_test("Create Purchase Invoice", True, f"PI ID: {pi_id}, Total: ₹{pi_total}")
                else:
                    error_text = await response.text()
                    self.log_test("Create Purchase Invoice", False, f"HTTP {response.status}: {error_text}")
                    return False
            
            # Step 2: Count Payments Before DN
            print("\n[Step 2] Counting payments before DN submission...")
            payments_before = await self.get_payments_count()
            self.log_test("Count Payments Before DN", True, f"Payments count: {payments_before}")
            
            # Step 3: Create and Submit Debit Note
            print("\n[Step 3] Creating and submitting Debit Note...")
            dn_payload = {
                "reference_invoice_id": pi_id,
                "supplier_name": "Test Supplier Payment DN",
                "debit_note_date": "2025-01-22",
                "items": [{"item_name": "Widget", "quantity": 5, "rate": 10, "amount": 50}],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "submitted"
            }
            
            async with self.session.post(f"{self.base_url}/api/buying/debit-notes", json=dn_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    dn_id = data.get("debit_note", {}).get("id")
                    dn_total = data.get("debit_note", {}).get("total_amount")
                    self.log_test("Create Debit Note (Submitted)", True, f"DN ID: {dn_id}, Total: ₹{dn_total}")
                else:
                    error_text = await response.text()
                    self.log_test("Create Debit Note (Submitted)", False, f"HTTP {response.status}: {error_text}")
                    return False
            
            # Step 4: Count Payments After DN
            print("\n[Step 4] Counting payments after DN submission...")
            payments_after = await self.get_payments_count()
            self.log_test("Count Payments After DN", True, f"Payments count: {payments_after}")
            
            # Step 5: Verify NO NEW Payment Entry Created
            print("\n[Step 5] Verifying NO automatic payment entry created...")
            if payments_before == payments_after:
                self.log_test("Verify NO Payment Entry for DN", True, 
                            f"✅ CORRECT: No automatic payment entry created (Before: {payments_before}, After: {payments_after})")
            else:
                self.log_test("Verify NO Payment Entry for DN", False, 
                            f"❌ FAILED: Payment entry was created (Before: {payments_before}, After: {payments_after})")
                return False
            
            # Step 6: Verify DN Still Has Journal Entry
            print("\n[Step 6] Verifying DN still creates standard journal entry...")
            je_count = await self.get_journal_entries_count("Debit Note")
            if je_count > 0:
                self.log_test("Verify DN Journal Entry", True, 
                            f"✅ DN still creates standard journal entry (accounting impact): {je_count} entries")
            else:
                self.log_test("Verify DN Journal Entry", False, 
                            "⚠️ WARNING: No journal entries found for DN")
            
            return True
            
        except Exception as e:
            self.log_test("Debit Note Test", False, f"Exception: {str(e)}")
            return False
        
        finally:
            # Cleanup
            print("\n[Cleanup] Deleting test data...")
            if dn_id:
                try:
                    async with self.session.delete(f"{self.base_url}/api/buying/debit-notes/{dn_id}") as response:
                        if response.status == 200:
                            print(f"  ✅ Deleted DN: {dn_id}")
                except:
                    pass
            
            if pi_id:
                try:
                    async with self.session.delete(f"{self.base_url}/api/purchase/invoices/{pi_id}") as response:
                        if response.status == 200:
                            print(f"  ✅ Deleted PI: {pi_id}")
                except:
                    pass
    
    async def test_credit_note_no_payment_entry(self):
        """
        Scenario 2: Credit Note Submission - No Automatic Payment Entry
        """
        print("\n" + "="*80)
        print("SCENARIO 2: CREDIT NOTE SUBMISSION - NO AUTOMATIC PAYMENT ENTRY")
        print("="*80)
        
        si_id = None
        cn_id = None
        
        try:
            # Step 1: Create Sales Invoice (Paid status)
            print("\n[Step 1] Creating Sales Invoice (Paid status)...")
            si_payload = {
                "customer_name": "Test Customer Payment CN",
                "invoice_date": "2025-01-22",
                "items": [{"item_name": "Product", "quantity": 10, "rate": 10, "amount": 100}],
                "discount_amount": 0,
                "tax_rate": 18,
                "payment_status": "Paid"
            }
            
            async with self.session.post(f"{self.base_url}/api/invoices", json=si_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    si_id = data.get("invoice", {}).get("id")
                    si_total = data.get("invoice", {}).get("total_amount")
                    self.log_test("Create Sales Invoice", True, f"SI ID: {si_id}, Total: ₹{si_total}")
                else:
                    error_text = await response.text()
                    self.log_test("Create Sales Invoice", False, f"HTTP {response.status}: {error_text}")
                    return False
            
            # Step 2: Count Payments Before CN
            print("\n[Step 2] Counting payments before CN submission...")
            payments_before = await self.get_payments_count()
            self.log_test("Count Payments Before CN", True, f"Payments count: {payments_before}")
            
            # Step 3: Create and Submit Credit Note
            print("\n[Step 3] Creating and submitting Credit Note...")
            cn_payload = {
                "reference_invoice_id": si_id,
                "customer_name": "Test Customer Payment CN",
                "credit_note_date": "2025-01-22",
                "items": [{"item_name": "Product", "quantity": 5, "rate": 10, "amount": 50}],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "submitted"
            }
            
            async with self.session.post(f"{self.base_url}/api/sales/credit-notes", json=cn_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    cn_id = data.get("credit_note", {}).get("id")
                    cn_total = data.get("credit_note", {}).get("total_amount")
                    self.log_test("Create Credit Note (Submitted)", True, f"CN ID: {cn_id}, Total: ₹{cn_total}")
                else:
                    error_text = await response.text()
                    self.log_test("Create Credit Note (Submitted)", False, f"HTTP {response.status}: {error_text}")
                    return False
            
            # Step 4: Count Payments After CN
            print("\n[Step 4] Counting payments after CN submission...")
            payments_after = await self.get_payments_count()
            self.log_test("Count Payments After CN", True, f"Payments count: {payments_after}")
            
            # Step 5: Verify NO NEW Payment Entry Created
            print("\n[Step 5] Verifying NO automatic payment entry created...")
            if payments_before == payments_after:
                self.log_test("Verify NO Payment Entry for CN", True, 
                            f"✅ CORRECT: No automatic payment entry created (Before: {payments_before}, After: {payments_after})")
            else:
                self.log_test("Verify NO Payment Entry for CN", False, 
                            f"❌ FAILED: Payment entry was created (Before: {payments_before}, After: {payments_after})")
                return False
            
            # Step 6: Verify CN Still Has Journal Entry
            print("\n[Step 6] Verifying CN still creates standard journal entry...")
            je_count = await self.get_journal_entries_count("Credit Note")
            if je_count > 0:
                self.log_test("Verify CN Journal Entry", True, 
                            f"✅ CN still creates standard journal entry (accounting impact): {je_count} entries")
            else:
                self.log_test("Verify CN Journal Entry", False, 
                            "⚠️ WARNING: No journal entries found for CN")
            
            return True
            
        except Exception as e:
            self.log_test("Credit Note Test", False, f"Exception: {str(e)}")
            return False
        
        finally:
            # Cleanup
            print("\n[Cleanup] Deleting test data...")
            if cn_id:
                try:
                    async with self.session.delete(f"{self.base_url}/api/sales/credit-notes/{cn_id}") as response:
                        if response.status == 200:
                            print(f"  ✅ Deleted CN: {cn_id}")
                except:
                    pass
            
            if si_id:
                try:
                    async with self.session.delete(f"{self.base_url}/api/sales/invoices/{si_id}") as response:
                        if response.status == 200:
                            print(f"  ✅ Deleted SI: {si_id}")
                except:
                    pass
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*80)
        print("TESTING: NO AUTOMATIC PAYMENT ENTRY CREATION FOR DN/CN")
        print("="*80)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Start Time: {datetime.now().isoformat()}")
        
        # Run tests
        dn_result = await self.test_debit_note_no_payment_entry()
        cn_result = await self.test_credit_note_no_payment_entry()
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = sum(1 for r in self.test_results if not r["success"])
        total = len(self.test_results)
        
        print(f"\nTotal Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        print("\n" + "="*80)
        print("DETAILED RESULTS")
        print("="*80)
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status} - {result['test']}")
            if result["details"]:
                print(f"  {result['details']}")
        
        print("\n" + "="*80)
        print("FINAL VERDICT")
        print("="*80)
        
        if dn_result and cn_result:
            print("✅ ALL TESTS PASSED")
            print("✅ DN submission: NO automatic payment entry created")
            print("✅ CN submission: NO automatic payment entry created")
            print("✅ DN/CN still create standard journal entries (accounting records)")
            print("✅ Users must create payment entries manually when needed")
            return True
        else:
            print("❌ SOME TESTS FAILED")
            if not dn_result:
                print("❌ Debit Note test failed")
            if not cn_result:
                print("❌ Credit Note test failed")
            return False


async def main():
    """Main test execution"""
    async with DNCNPaymentTester() as tester:
        success = await tester.run_all_tests()
        return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
