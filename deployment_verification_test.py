#!/usr/bin/env python3
"""
Deployment Verification Test for GiLi Backend API
Tests the 6 core endpoints requested in the review after deployment fixes
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://gili-erp-1.preview.emergentagent.com"

class DeploymentVerificationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        self.results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: any = None):
        """Log test results"""
        result = {
            "endpoint": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        
    async def test_health_check(self):
        """Test 1: Basic health check (GET /api/)"""
        try:
            async with self.session.get(f"{self.base_url}/api/") as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "GiLi API" in data["message"]:
                        self.log_result("GET /api/ (Health Check)", True, f"API is running: {data['message']}", data)
                        return True
                    else:
                        self.log_result("GET /api/ (Health Check)", False, f"Unexpected response: {data}", data)
                        return False
                else:
                    self.log_result("GET /api/ (Health Check)", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/ (Health Check)", False, f"Connection error: {str(e)}")
            return False
    
    async def test_dashboard_stats(self):
        """Test 2: Dashboard stats endpoint (GET /api/dashboard/stats)"""
        try:
            async with self.session.get(f"{self.base_url}/api/dashboard/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["sales_orders", "purchase_orders", "outstanding_amount", "stock_value"]
                    
                    if all(field in data for field in required_fields):
                        all_numeric = all(isinstance(data[field], (int, float)) for field in required_fields)
                        if all_numeric:
                            self.log_result("GET /api/dashboard/stats", True, f"All stats present - Stock Value: ₹{data['stock_value']}", data)
                            return True
                        else:
                            self.log_result("GET /api/dashboard/stats", False, "Non-numeric values in stats", data)
                            return False
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_result("GET /api/dashboard/stats", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_result("GET /api/dashboard/stats", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/dashboard/stats", False, f"Error: {str(e)}")
            return False
    
    async def test_dashboard_transactions(self):
        """Test 3: Dashboard transactions endpoint (GET /api/dashboard/transactions)"""
        try:
            async with self.session.get(f"{self.base_url}/api/dashboard/transactions") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        if len(data) > 0:
                            transaction = data[0]
                            required_fields = ["id", "type", "reference_number", "amount", "date", "status"]
                            
                            if all(field in transaction for field in required_fields):
                                self.log_result("GET /api/dashboard/transactions", True, f"Retrieved {len(data)} transactions - First: {transaction['type']} ₹{transaction['amount']}", {"count": len(data), "sample": transaction})
                                return True
                            else:
                                missing = [f for f in required_fields if f not in transaction]
                                self.log_result("GET /api/dashboard/transactions", False, f"Missing fields: {missing}", transaction)
                                return False
                        else:
                            self.log_result("GET /api/dashboard/transactions", True, "Empty transaction list (valid)", data)
                            return True
                    else:
                        self.log_result("GET /api/dashboard/transactions", False, "Response is not a list", data)
                        return False
                else:
                    self.log_result("GET /api/dashboard/transactions", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/dashboard/transactions", False, f"Error: {str(e)}")
            return False
    
    async def test_auth_me(self):
        """Test 4: Auth endpoint (GET /api/auth/me)"""
        try:
            async with self.session.get(f"{self.base_url}/api/auth/me") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["id", "name", "email", "role"]
                    
                    if all(field in data for field in required_fields):
                        self.log_result("GET /api/auth/me", True, f"User authenticated: {data['name']} ({data['role']})", data)
                        return True
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_result("GET /api/auth/me", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_result("GET /api/auth/me", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/auth/me", False, f"Error: {str(e)}")
            return False
    
    async def test_search_suggestions(self):
        """Test 5: Global search suggestions endpoint (GET /api/search/suggestions?q=ABC)"""
        try:
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=ABC") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and isinstance(data["suggestions"], list):
                        # Check if ABC Corp is in suggestions
                        abc_found = any(s.get("text", "").lower() == "abc corp" for s in data["suggestions"])
                        if abc_found:
                            self.log_result("GET /api/search/suggestions?q=ABC", True, f"Found ABC Corp in {len(data['suggestions'])} suggestions", data)
                            return True
                        else:
                            self.log_result("GET /api/search/suggestions?q=ABC", False, f"ABC Corp not found in suggestions", data)
                            return False
                    else:
                        self.log_result("GET /api/search/suggestions?q=ABC", False, "Invalid response structure", data)
                        return False
                else:
                    self.log_result("GET /api/search/suggestions?q=ABC", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/search/suggestions?q=ABC", False, f"Error: {str(e)}")
            return False
    
    async def test_sales_overview_report(self):
        """Test 6: Sales overview report endpoint (GET /api/reports/sales-overview)"""
        try:
            async with self.session.get(f"{self.base_url}/api/reports/sales-overview") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["totalSales", "totalOrders", "avgOrderValue", "growthRate", "topProducts", "salesTrend", "dateRange"]
                    
                    if all(field in data for field in required_fields):
                        # Verify data types and structure
                        if (isinstance(data["totalSales"], (int, float)) and
                            isinstance(data["totalOrders"], int) and
                            isinstance(data["avgOrderValue"], (int, float)) and
                            isinstance(data["growthRate"], (int, float)) and
                            isinstance(data["topProducts"], list) and
                            isinstance(data["salesTrend"], list) and
                            isinstance(data["dateRange"], dict)):
                            
                            self.log_result("GET /api/reports/sales-overview", True, f"Sales report working - Total Sales: ₹{data['totalSales']}, Orders: {data['totalOrders']}", data)
                            return True
                        else:
                            self.log_result("GET /api/reports/sales-overview", False, "Invalid data types in response", data)
                            return False
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_result("GET /api/reports/sales-overview", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_result("GET /api/reports/sales-overview", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_result("GET /api/reports/sales-overview", False, f"Error: {str(e)}")
            return False

    async def run_deployment_verification(self):
        """Run the 6 core endpoint tests requested in the review"""
        print(f"🚀 GiLi Backend Deployment Verification")
        print(f"📍 Testing URL: {self.base_url}")
        print(f"🎯 Testing 6 core endpoints after deployment fixes")
        print("=" * 70)
        
        tests = [
            ("1. Health Check", self.test_health_check),
            ("2. Dashboard Stats", self.test_dashboard_stats),
            ("3. Dashboard Transactions", self.test_dashboard_transactions),
            ("4. Authentication", self.test_auth_me),
            ("5. Global Search Suggestions", self.test_search_suggestions),
            ("6. Sales Overview Report", self.test_sales_overview_report)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running {test_name}...")
            try:
                result = await test_func()
                if result:
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test_name} failed with exception: {str(e)}")
        
        print("\n" + "=" * 70)
        print(f"📊 DEPLOYMENT VERIFICATION RESULTS: {passed}/{total} endpoints working")
        
        if passed == total:
            print("🎉 ✅ ALL CORE ENDPOINTS WORKING! Backend deployment successful.")
            print("🚀 The GiLi backend API is fully functional after deployment fixes.")
        else:
            print(f"⚠️  {total - passed} endpoints failed. Backend needs attention.")
        
        print("\n📋 ENDPOINT STATUS SUMMARY:")
        for result in self.results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['endpoint']}")
        
        return passed, total, self.results

async def main():
    """Main deployment verification runner"""
    async with DeploymentVerificationTester() as tester:
        passed, total, results = await tester.run_deployment_verification()
        
        # Save results
        with open('/app/deployment_verification_results.json', 'w') as f:
            json.dump({
                "deployment_verification": {
                    "passed": passed,
                    "total": total,
                    "success_rate": f"{(passed/total)*100:.1f}%",
                    "all_working": passed == total,
                    "timestamp": datetime.now().isoformat()
                },
                "endpoint_results": results
            }, f, indent=2)
        
        print(f"\n📄 Results saved to: /app/deployment_verification_results.json")
        return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)