#!/usr/bin/env python3
"""
Balance Sheet Comprehensive Testing
Tests the critical fix for Balance Sheet Net Profit/Loss inclusion in Equity section
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime, timedelta

# Backend URL
BACKEND_URL = "https://erp-integrity.preview.emergentagent.com"

class BalanceSheetTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.test_results = []
        self.token = None
        
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
        print(f"{status} - {test_name}: {details}")
    
    async def login(self):
        """Login and get token"""
        try:
            login_payload = {"email": "admin@gili.com", "password": "admin123"}
            async with self.session.post(f"{self.base_url}/api/auth/login", json=login_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    self.token = data.get("token", "")
                    self.log_test("Login", True, f"Successfully logged in")
                    return True
                else:
                    self.log_test("Login", False, f"Login failed with status {response.status}")
                    return False
        except Exception as e:
            self.log_test("Login", False, f"Exception: {str(e)}")
            return False
    
    async def clean_database(self):
        """Clean all transactions from database"""
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            print("🧹 Cleaning database...")
            
            # Delete all sales invoices
            try:
                async with self.session.get(f"{self.base_url}/api/invoices", headers=headers) as response:
                    if response.status == 200:
                        invoices = await response.json()
                        for invoice in invoices:
                            try:
                                await self.session.delete(f"{self.base_url}/api/invoices/{invoice['id']}", headers=headers)
                            except:
                                pass
            except:
                pass
            
            # Delete all purchase invoices
            try:
                async with self.session.get(f"{self.base_url}/api/purchase/invoices", headers=headers) as response:
                    if response.status == 200:
                        invoices = await response.json()
                        for invoice in invoices:
                            try:
                                await self.session.delete(f"{self.base_url}/api/purchase/invoices/{invoice['id']}", headers=headers)
                            except:
                                pass
            except:
                pass
            
            # Delete all credit notes
            try:
                async with self.session.get(f"{self.base_url}/api/credit-notes", headers=headers) as response:
                    if response.status == 200:
                        notes = await response.json()
                        for note in notes:
                            try:
                                await self.session.delete(f"{self.base_url}/api/credit-notes/{note['id']}", headers=headers)
                            except:
                                pass
            except:
                pass
            
            # Delete all debit notes
            try:
                async with self.session.get(f"{self.base_url}/api/debit-notes", headers=headers) as response:
                    if response.status == 200:
                        notes = await response.json()
                        for note in notes:
                            try:
                                await self.session.delete(f"{self.base_url}/api/debit-notes/{note['id']}", headers=headers)
                            except:
                                pass
            except:
                pass
            
            # Delete all journal entries
            try:
                async with self.session.get(f"{self.base_url}/api/financial/journal-entries", headers=headers) as response:
                    if response.status == 200:
                        entries = await response.json()
                        for entry in entries:
                            try:
                                await self.session.delete(f"{self.base_url}/api/financial/journal-entries/{entry['id']}", headers=headers)
                            except:
                                pass
            except:
                pass
            
            self.log_test("Database Cleanup", True, "Attempted to clean all transactions")
            return True
        except Exception as e:
            self.log_test("Database Cleanup", False, f"Exception: {str(e)}")
            return False
    
    async def test_scenario_1_single_sales_invoice(self):
        """
        SCENARIO 1: Single Sales Invoice (₹118)
        Expected:
        - Assets: Accounts Receivable ₹118
        - Liabilities: Output Tax Payable ₹18
        - Equity: Current Period Net Profit ₹100
        - Balance Sheet equation: Assets (₹118) = Liabilities (₹18) + Equity (₹100)
        """
        try:
            print("\n" + "="*80)
            print("SCENARIO 1: Single Sales Invoice (₹118)")
            print("="*80)
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Get customer and item
            async with self.session.get(f"{self.base_url}/api/master/customers", headers=headers) as response:
                customers = await response.json()
                if not customers or len(customers) == 0:
                    self.log_test("Scenario 1 - Prerequisites", False, "No customers found")
                    return False
                customer = customers[0]
            
            async with self.session.get(f"{self.base_url}/api/stock/items", headers=headers) as response:
                items_data = await response.json()
                # items_data might be a dict with 'items' key or a list
                if isinstance(items_data, dict):
                    items = items_data.get('items', items_data.get('data', []))
                else:
                    items = items_data
                
                if not items or len(items) == 0:
                    self.log_test("Scenario 1 - Prerequisites", False, "No items found")
                    return False
                item = items[0]
            
            # Create Sales Invoice
            sales_invoice_data = {
                "id": str(uuid.uuid4()),
                "invoice_number": f"SI-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "invoice_date": datetime.now().strftime("%Y-%m-%d"),
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "items": [{
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "quantity": 1,
                    "rate": 100.0,
                    "amount": 100.0,
                    "tax_rate": 18.0,
                    "tax_amount": 18.0
                }],
                "subtotal": 100.0,
                "tax_amount": 18.0,
                "total_amount": 118.0,
                "status": "submitted",
                "company_id": "default_company"
            }
            
            async with self.session.post(f"{self.base_url}/api/invoices", json=sales_invoice_data, headers=headers) as response:
                if response.status == 200:
                    print(f"✅ Sales Invoice created: {sales_invoice_data['invoice_number']}")
                else:
                    error_text = await response.text()
                    self.log_test("Scenario 1 - SI Creation", False, f"Failed: {error_text}")
                    return False
            
            # Wait for journal entry creation
            await asyncio.sleep(2)
            
            # Get Balance Sheet
            async with self.session.get(f"{self.base_url}/api/financial/reports/balance-sheet", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.log_test("Scenario 1 - Balance Sheet", False, f"HTTP {response.status}: {error_text}")
                    return False
                
                bs_data = await response.json()
                
                # Print Balance Sheet
                print("\n📊 BALANCE SHEET:")
                print(f"  Assets: ₹{bs_data.get('total_assets', 0)}")
                for asset in bs_data.get('assets', []):
                    print(f"    - {asset['account_name']}: ₹{asset['amount']}")
                
                print(f"\n  Liabilities: ₹{bs_data.get('total_liabilities', 0)}")
                for liability in bs_data.get('liabilities', []):
                    print(f"    - {liability['account_name']}: ₹{liability['amount']}")
                
                print(f"\n  Equity: ₹{bs_data.get('total_equity', 0)}")
                for equity in bs_data.get('equity', []):
                    print(f"    - {equity['account_name']}: ₹{equity['amount']}")
                
                print(f"\n  Total Liabilities + Equity: ₹{bs_data.get('total_liabilities_equity', 0)}")
                print(f"  Is Balanced: {bs_data.get('is_balanced', False)}")
                print(f"  Variance: ₹{bs_data.get('variance', 0)}")
                
                # Verify expectations
                total_assets = bs_data.get("total_assets", 0)
                total_liabilities = bs_data.get("total_liabilities", 0)
                total_equity = bs_data.get("total_equity", 0)
                total_liabilities_equity = bs_data.get("total_liabilities_equity", 0)
                is_balanced = bs_data.get("is_balanced", False)
                variance = bs_data.get("variance", 999)
                
                issues = []
                
                # CRITICAL: Check is_balanced = true
                if not is_balanced:
                    issues.append(f"❌ CRITICAL: Balance Sheet not balanced! Variance: ₹{variance}")
                
                # CRITICAL: Check Assets = Liabilities + Equity
                if abs(total_assets - total_liabilities_equity) > 0.01:
                    issues.append(f"❌ CRITICAL: Assets (₹{total_assets}) ≠ Liabilities + Equity (₹{total_liabilities_equity})")
                
                # CRITICAL: Check for Current Period Net Profit in equity
                equity_accounts = bs_data.get("equity", [])
                has_net_profit = any("Current Period Net Profit" in acc.get("account_name", "") or "Current Period Net Loss" in acc.get("account_name", "") for acc in equity_accounts)
                if not has_net_profit:
                    issues.append("❌ CRITICAL: Current Period Net Profit/Loss not found in Equity section")
                
                # Check for Output Tax Payable in liabilities
                liability_accounts = bs_data.get("liabilities", [])
                has_output_tax = any("Output Tax" in acc.get("account_name", "") or "Tax Payable" in acc.get("account_name", "") for acc in liability_accounts)
                if not has_output_tax:
                    issues.append("⚠️ Output Tax Payable not found in Liabilities section")
                
                # Check for Accounts Receivable in assets
                asset_accounts = bs_data.get("assets", [])
                has_receivable = any("Receivable" in acc.get("account_name", "") for acc in asset_accounts)
                if not has_receivable:
                    issues.append("⚠️ Accounts Receivable not found in Assets section")
                
                if issues:
                    critical_issues = [i for i in issues if "CRITICAL" in i]
                    if critical_issues:
                        self.log_test("Scenario 1 - Verification", False, f"Critical Issues: {'; '.join(critical_issues)}")
                        return False
                    else:
                        self.log_test("Scenario 1 - Verification", True, 
                                    f"✅ Balance Sheet balanced! Assets=₹{total_assets}, L+E=₹{total_liabilities_equity}. Minor issues: {'; '.join(issues)}")
                        return True
                else:
                    self.log_test("Scenario 1 - Verification", True, 
                                f"✅ All checks passed! Assets=₹{total_assets}, Liabilities=₹{total_liabilities}, Equity=₹{total_equity}, Balanced={is_balanced}")
                    return True
                    
        except Exception as e:
            self.log_test("Scenario 1", False, f"Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_scenario_2_sales_and_purchase(self):
        """
        SCENARIO 2: Sales Invoice + Purchase Invoice
        Expected:
        - Assets: Accounts Receivable ₹118 + Input Tax Credit ₹9 = ₹127
        - Liabilities: Output Tax Payable ₹18 + Accounts Payable ₹59 = ₹77
        - Equity: Current Period Net Profit ₹50 (₹100 sales - ₹50 purchases)
        - Balance Sheet equation: Assets (₹127) = Liabilities (₹77) + Equity (₹50)
        """
        try:
            print("\n" + "="*80)
            print("SCENARIO 2: Sales Invoice + Purchase Invoice")
            print("="*80)
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Get supplier and item
            async with self.session.get(f"{self.base_url}/api/master/suppliers", headers=headers) as response:
                suppliers = await response.json()
                if not suppliers or len(suppliers) == 0:
                    self.log_test("Scenario 2 - Prerequisites", False, "No suppliers found")
                    return False
                supplier = suppliers[0]
            
            async with self.session.get(f"{self.base_url}/api/stock/items", headers=headers) as response:
                items_data = await response.json()
                # items_data might be a dict with 'items' key or a list
                if isinstance(items_data, dict):
                    items = items_data.get('items', items_data.get('data', []))
                else:
                    items = items_data
                
                if not items or len(items) == 0:
                    self.log_test("Scenario 2 - Prerequisites", False, "No items found")
                    return False
                item = items[0]
            
            # Create Purchase Invoice
            purchase_invoice_data = {
                "id": str(uuid.uuid4()),
                "invoice_number": f"PI-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "supplier_id": supplier["id"],
                "supplier_name": supplier["name"],
                "invoice_date": datetime.now().strftime("%Y-%m-%d"),
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "items": [{
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "quantity": 1,
                    "rate": 50.0,
                    "amount": 50.0,
                    "tax_rate": 18.0,
                    "tax_amount": 9.0
                }],
                "subtotal": 50.0,
                "tax_amount": 9.0,
                "total_amount": 59.0,
                "status": "submitted",
                "company_id": "default_company"
            }
            
            async with self.session.post(f"{self.base_url}/api/purchase/invoices", json=purchase_invoice_data, headers=headers) as response:
                if response.status == 200:
                    print(f"✅ Purchase Invoice created: {purchase_invoice_data['invoice_number']}")
                else:
                    error_text = await response.text()
                    self.log_test("Scenario 2 - PI Creation", False, f"Failed: {error_text}")
                    return False
            
            # Wait for journal entry creation
            await asyncio.sleep(2)
            
            # Get Balance Sheet
            async with self.session.get(f"{self.base_url}/api/financial/reports/balance-sheet", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.log_test("Scenario 2 - Balance Sheet", False, f"HTTP {response.status}: {error_text}")
                    return False
                
                bs_data = await response.json()
                
                # Print Balance Sheet
                print("\n📊 BALANCE SHEET:")
                print(f"  Assets: ₹{bs_data.get('total_assets', 0)}")
                for asset in bs_data.get('assets', []):
                    print(f"    - {asset['account_name']}: ₹{asset['amount']}")
                
                print(f"\n  Liabilities: ₹{bs_data.get('total_liabilities', 0)}")
                for liability in bs_data.get('liabilities', []):
                    print(f"    - {liability['account_name']}: ₹{liability['amount']}")
                
                print(f"\n  Equity: ₹{bs_data.get('total_equity', 0)}")
                for equity in bs_data.get('equity', []):
                    print(f"    - {equity['account_name']}: ₹{equity['amount']}")
                
                print(f"\n  Total Liabilities + Equity: ₹{bs_data.get('total_liabilities_equity', 0)}")
                print(f"  Is Balanced: {bs_data.get('is_balanced', False)}")
                print(f"  Variance: ₹{bs_data.get('variance', 0)}")
                
                # Verify expectations
                total_assets = bs_data.get("total_assets", 0)
                total_liabilities = bs_data.get("total_liabilities", 0)
                total_equity = bs_data.get("total_equity", 0)
                total_liabilities_equity = bs_data.get("total_liabilities_equity", 0)
                is_balanced = bs_data.get("is_balanced", False)
                
                issues = []
                
                # CRITICAL: Check is_balanced = true
                if not is_balanced:
                    issues.append(f"❌ CRITICAL: Balance Sheet not balanced! Variance: ₹{bs_data.get('variance', 0)}")
                
                # CRITICAL: Check Assets = Liabilities + Equity
                if abs(total_assets - total_liabilities_equity) > 0.01:
                    issues.append(f"❌ CRITICAL: Assets (₹{total_assets}) ≠ Liabilities + Equity (₹{total_liabilities_equity})")
                
                # Check for Input Tax Credit in assets
                asset_accounts = bs_data.get("assets", [])
                has_input_tax = any("Input Tax" in acc.get("account_name", "") for acc in asset_accounts)
                if not has_input_tax:
                    issues.append("⚠️ Input Tax Credit not found in Assets section")
                
                # Check for Accounts Payable in liabilities
                liability_accounts = bs_data.get("liabilities", [])
                has_payable = any("Payable" in acc.get("account_name", "") for acc in liability_accounts)
                if not has_payable:
                    issues.append("⚠️ Accounts Payable not found in Liabilities section")
                
                if issues:
                    critical_issues = [i for i in issues if "CRITICAL" in i]
                    if critical_issues:
                        self.log_test("Scenario 2 - Verification", False, f"Critical Issues: {'; '.join(critical_issues)}")
                        return False
                    else:
                        self.log_test("Scenario 2 - Verification", True, 
                                    f"✅ Balance Sheet balanced! Assets=₹{total_assets}, L+E=₹{total_liabilities_equity}. Minor issues: {'; '.join(issues)}")
                        return True
                else:
                    self.log_test("Scenario 2 - Verification", True, 
                                f"✅ All checks passed! Assets=₹{total_assets}, Liabilities=₹{total_liabilities}, Equity=₹{total_equity}, Balanced={is_balanced}")
                    return True
                    
        except Exception as e:
            self.log_test("Scenario 2", False, f"Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_scenario_3_with_credit_note(self):
        """
        SCENARIO 3: With Credit Note (Sales Return ₹35.40)
        Expected:
        - Balance Sheet should still be balanced
        - Assets, Liabilities, and Equity should be updated correctly
        """
        try:
            print("\n" + "="*80)
            print("SCENARIO 3: With Credit Note (₹35.40)")
            print("="*80)
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Get customer, item, and sales invoice
            async with self.session.get(f"{self.base_url}/api/master/customers", headers=headers) as response:
                customers = await response.json()
                customer = customers[0]
            
            async with self.session.get(f"{self.base_url}/api/stock/items", headers=headers) as response:
                items_data = await response.json()
                # items_data might be a dict with 'items' key or a list
                if isinstance(items_data, dict):
                    items = items_data.get('items', items_data.get('data', []))
                else:
                    items = items_data
                item = items[0]
            
            async with self.session.get(f"{self.base_url}/api/invoices", headers=headers) as response:
                invoices = await response.json()
                if not invoices:
                    self.log_test("Scenario 3 - Prerequisites", False, "No sales invoices found")
                    return False
                sales_invoice = invoices[0]
            
            # Create Credit Note
            credit_note_data = {
                "id": str(uuid.uuid4()),
                "credit_note_number": f"CN-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "reference_invoice_id": sales_invoice["id"],
                "reference_invoice_number": sales_invoice["invoice_number"],
                "credit_note_date": datetime.now().strftime("%Y-%m-%d"),
                "items": [{
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "quantity": 1,
                    "rate": 30.0,
                    "amount": 30.0,
                    "tax_rate": 18.0,
                    "tax_amount": 5.40
                }],
                "subtotal": 30.0,
                "tax_amount": 5.40,
                "total_amount": 35.40,
                "reason": "Product return",
                "status": "submitted",
                "company_id": "default_company"
            }
            
            async with self.session.post(f"{self.base_url}/api/credit-notes", json=credit_note_data, headers=headers) as response:
                if response.status == 200:
                    print(f"✅ Credit Note created: {credit_note_data['credit_note_number']}")
                else:
                    error_text = await response.text()
                    self.log_test("Scenario 3 - CN Creation", False, f"Failed: {error_text}")
                    return False
            
            # Wait for journal entry creation
            await asyncio.sleep(2)
            
            # Get Balance Sheet
            async with self.session.get(f"{self.base_url}/api/financial/reports/balance-sheet", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.log_test("Scenario 3 - Balance Sheet", False, f"HTTP {response.status}: {error_text}")
                    return False
                
                bs_data = await response.json()
                
                # Print Balance Sheet
                print("\n📊 BALANCE SHEET:")
                print(f"  Assets: ₹{bs_data.get('total_assets', 0)}")
                for asset in bs_data.get('assets', []):
                    print(f"    - {asset['account_name']}: ₹{asset['amount']}")
                
                print(f"\n  Liabilities: ₹{bs_data.get('total_liabilities', 0)}")
                for liability in bs_data.get('liabilities', []):
                    print(f"    - {liability['account_name']}: ₹{liability['amount']}")
                
                print(f"\n  Equity: ₹{bs_data.get('total_equity', 0)}")
                for equity in bs_data.get('equity', []):
                    print(f"    - {equity['account_name']}: ₹{equity['amount']}")
                
                print(f"\n  Total Liabilities + Equity: ₹{bs_data.get('total_liabilities_equity', 0)}")
                print(f"  Is Balanced: {bs_data.get('is_balanced', False)}")
                print(f"  Variance: ₹{bs_data.get('variance', 0)}")
                
                # Verify Balance Sheet is balanced
                is_balanced = bs_data.get("is_balanced", False)
                total_assets = bs_data.get("total_assets", 0)
                total_liabilities_equity = bs_data.get("total_liabilities_equity", 0)
                
                issues = []
                
                if not is_balanced:
                    issues.append(f"Balance Sheet not balanced! Variance: ₹{bs_data.get('variance', 0)}")
                
                if abs(total_assets - total_liabilities_equity) > 0.01:
                    issues.append(f"Assets (₹{total_assets}) ≠ Liabilities + Equity (₹{total_liabilities_equity})")
                
                if issues:
                    self.log_test("Scenario 3 - Verification", False, f"Issues: {'; '.join(issues)}")
                    return False
                else:
                    self.log_test("Scenario 3 - Verification", True, 
                                f"Assets=₹{total_assets}, L+E=₹{total_liabilities_equity}, Balanced={is_balanced}")
                    return True
                    
        except Exception as e:
            self.log_test("Scenario 3", False, f"Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    async def run_all_tests(self):
        """Run all Balance Sheet tests"""
        print("\n" + "="*80)
        print("🧪 BALANCE SHEET COMPREHENSIVE TESTING")
        print("="*80 + "\n")
        
        # Login
        if not await self.login():
            print("❌ Login failed. Cannot proceed with tests.")
            return
        
        # Clean database
        if not await self.clean_database():
            print("⚠️ Database cleanup failed. Proceeding anyway...")
        
        # Run Scenario 1 and store invoice data
        scenario1_result = await self.test_scenario_1_single_sales_invoice()
        
        # Run Scenario 2
        await self.test_scenario_2_sales_and_purchase()
        
        # Run Scenario 3 (skip if Scenario 1 failed)
        if scenario1_result:
            await self.test_scenario_3_with_credit_note()
        else:
            self.log_test("Scenario 3", False, "Skipped due to Scenario 1 failure")
        
        # Print summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        print(f"\nTotal Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Show failed tests
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n" + "="*80 + "\n")

async def main():
    async with BalanceSheetTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
