#!/usr/bin/env python3
"""
Backend API Testing Suite for ERPNext Clone
Tests all backend endpoints and verifies functionality
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://854fb39e-52c2-4636-9ab9-cfd2c12f3f08.preview.emergentagent.com"

class BackendTester:
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
        
    async def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/") as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "ERPNext Clone API" in data["message"]:
                        self.log_test("Health Check", True, "API is running", data)
                        return True
                    else:
                        self.log_test("Health Check", False, f"Unexpected response: {data}", data)
                        return False
                else:
                    self.log_test("Health Check", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    async def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/dashboard/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["sales_orders", "purchase_orders", "outstanding_amount", "stock_value"]
                    
                    if all(field in data for field in required_fields):
                        # Verify data types
                        all_numeric = all(isinstance(data[field], (int, float)) for field in required_fields)
                        if all_numeric:
                            self.log_test("Dashboard Stats", True, "All required fields present with numeric values", data)
                            return True
                        else:
                            self.log_test("Dashboard Stats", False, "Non-numeric values in stats", data)
                            return False
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test("Dashboard Stats", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_test("Dashboard Stats", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Error: {str(e)}")
            return False
    
    async def test_dashboard_transactions(self):
        """Test dashboard transactions endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/dashboard/transactions") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        if len(data) > 0:
                            # Check first transaction structure
                            transaction = data[0]
                            required_fields = ["id", "type", "reference_number", "amount", "date", "status"]
                            
                            if all(field in transaction for field in required_fields):
                                self.log_test("Dashboard Transactions", True, f"Retrieved {len(data)} transactions", {"count": len(data), "sample": transaction})
                                return True
                            else:
                                missing = [f for f in required_fields if f not in transaction]
                                self.log_test("Dashboard Transactions", False, f"Missing fields in transaction: {missing}", transaction)
                                return False
                        else:
                            self.log_test("Dashboard Transactions", True, "Empty transaction list (valid)", data)
                            return True
                    else:
                        self.log_test("Dashboard Transactions", False, "Response is not a list", data)
                        return False
                else:
                    self.log_test("Dashboard Transactions", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Dashboard Transactions", False, f"Error: {str(e)}")
            return False
    
    async def test_auth_me(self):
        """Test authentication me endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/auth/me") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["id", "name", "email", "role"]
                    
                    if all(field in data for field in required_fields):
                        self.log_test("Auth Me", True, f"User profile retrieved: {data['name']}", data)
                        return True
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test("Auth Me", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_test("Auth Me", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Auth Me", False, f"Error: {str(e)}")
            return False
    
    async def test_sales_orders(self):
        """Test sales orders endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/sales/orders") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        if len(data) > 0:
                            # Check first order structure
                            order = data[0]
                            required_fields = ["id", "order_number", "customer_id", "customer_name", "total_amount", "status"]
                            
                            if all(field in order for field in required_fields):
                                self.log_test("Sales Orders", True, f"Retrieved {len(data)} sales orders", {"count": len(data), "sample": order})
                                return True
                            else:
                                missing = [f for f in required_fields if f not in order]
                                self.log_test("Sales Orders", False, f"Missing fields in order: {missing}", order)
                                return False
                        else:
                            self.log_test("Sales Orders", True, "Empty sales orders list (valid)", data)
                            return True
                    else:
                        self.log_test("Sales Orders", False, "Response is not a list", data)
                        return False
                else:
                    self.log_test("Sales Orders", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Sales Orders", False, f"Error: {str(e)}")
            return False
    
    async def test_sales_customers(self):
        """Test sales customers endpoint"""
        try:
            async with self.session.get(f"{self.base_url}/api/sales/customers") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        if len(data) > 0:
                            # Check first customer structure
                            customer = data[0]
                            required_fields = ["id", "name", "email", "company_id"]
                            
                            if all(field in customer for field in required_fields):
                                self.log_test("Sales Customers", True, f"Retrieved {len(data)} customers", {"count": len(data), "sample": customer})
                                return True
                            else:
                                missing = [f for f in required_fields if f not in customer]
                                self.log_test("Sales Customers", False, f"Missing fields in customer: {missing}", customer)
                                return False
                        else:
                            self.log_test("Sales Customers", True, "Empty customers list (valid)", data)
                            return True
                    else:
                        self.log_test("Sales Customers", False, "Response is not a list", data)
                        return False
                else:
                    self.log_test("Sales Customers", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            self.log_test("Sales Customers", False, f"Error: {str(e)}")
            return False
    
    async def test_database_initialization(self):
        """Test if sample data was initialized properly by checking multiple endpoints"""
        try:
            # Test customers endpoint for sample data
            async with self.session.get(f"{self.base_url}/api/sales/customers") as response:
                if response.status == 200:
                    customers = await response.json()
                    has_customers = len(customers) > 0
                else:
                    has_customers = False
            
            # Test transactions endpoint for sample data
            async with self.session.get(f"{self.base_url}/api/dashboard/transactions") as response:
                if response.status == 200:
                    transactions = await response.json()
                    has_transactions = len(transactions) > 0
                else:
                    has_transactions = False
            
            # Test dashboard stats for non-zero values
            async with self.session.get(f"{self.base_url}/api/dashboard/stats") as response:
                if response.status == 200:
                    stats = await response.json()
                    has_stats = any(stats.get(field, 0) > 0 for field in ["sales_orders", "purchase_orders", "stock_value"])
                else:
                    has_stats = False
            
            if has_customers and has_transactions and has_stats:
                self.log_test("Database Initialization", True, "Sample data properly initialized", {
                    "customers": len(customers) if has_customers else 0,
                    "transactions": len(transactions) if has_transactions else 0,
                    "stats_populated": has_stats
                })
                return True
            else:
                self.log_test("Database Initialization", False, f"Sample data missing - customers: {has_customers}, transactions: {has_transactions}, stats: {has_stats}")
                return False
                
        except Exception as e:
            self.log_test("Database Initialization", False, f"Error checking sample data: {str(e)}")
            return False
    
    async def test_error_handling(self):
        """Test error handling for invalid endpoints"""
        try:
            # Test invalid endpoint
            async with self.session.get(f"{self.base_url}/api/invalid-endpoint") as response:
                if response.status == 404:
                    self.log_test("Error Handling", True, "404 returned for invalid endpoint")
                    return True
                else:
                    self.log_test("Error Handling", False, f"Expected 404, got {response.status}")
                    return False
        except Exception as e:
            self.log_test("Error Handling", False, f"Error: {str(e)}")
            return False
    
    async def test_search_suggestions(self):
        """Test global search suggestions endpoint"""
        try:
            # Test with short query (should return empty suggestions)
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=A") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and isinstance(data["suggestions"], list):
                        self.log_test("Search Suggestions - Short Query", True, f"Short query returned {len(data['suggestions'])} suggestions", data)
                    else:
                        self.log_test("Search Suggestions - Short Query", False, "Invalid response structure", data)
                        return False
                else:
                    self.log_test("Search Suggestions - Short Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with valid query for ABC (should find ABC Corp)
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=ABC") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and isinstance(data["suggestions"], list):
                        # Check if ABC Corp is in suggestions
                        abc_found = any(s.get("text", "").lower() == "abc corp" for s in data["suggestions"])
                        if abc_found:
                            self.log_test("Search Suggestions - ABC Query", True, f"Found ABC Corp in {len(data['suggestions'])} suggestions", data)
                        else:
                            self.log_test("Search Suggestions - ABC Query", False, f"ABC Corp not found in suggestions: {data['suggestions']}")
                            return False
                    else:
                        self.log_test("Search Suggestions - ABC Query", False, "Invalid response structure", data)
                        return False
                else:
                    self.log_test("Search Suggestions - ABC Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with Product query (should find Product A and Product B)
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=Product") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and isinstance(data["suggestions"], list):
                        product_suggestions = [s for s in data["suggestions"] if "product" in s.get("text", "").lower()]
                        if len(product_suggestions) > 0:
                            self.log_test("Search Suggestions - Product Query", True, f"Found {len(product_suggestions)} product suggestions", data)
                        else:
                            self.log_test("Search Suggestions - Product Query", False, f"No product suggestions found: {data['suggestions']}")
                            return False
                    else:
                        self.log_test("Search Suggestions - Product Query", False, "Invalid response structure", data)
                        return False
                else:
                    self.log_test("Search Suggestions - Product Query", False, f"HTTP {response.status}")
                    return False
            
            # Test case-insensitive search
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=xyz") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and isinstance(data["suggestions"], list):
                        xyz_found = any("xyz" in s.get("text", "").lower() for s in data["suggestions"])
                        if xyz_found:
                            self.log_test("Search Suggestions - Case Insensitive", True, "Case-insensitive search working", data)
                        else:
                            self.log_test("Search Suggestions - Case Insensitive", True, "No XYZ results (acceptable)", data)
                    else:
                        self.log_test("Search Suggestions - Case Insensitive", False, "Invalid response structure", data)
                        return False
                else:
                    self.log_test("Search Suggestions - Case Insensitive", False, f"HTTP {response.status}")
                    return False
            
            # Test response structure
            async with self.session.get(f"{self.base_url}/api/search/suggestions?query=ABC") as response:
                if response.status == 200:
                    data = await response.json()
                    if "suggestions" in data and len(data["suggestions"]) > 0:
                        suggestion = data["suggestions"][0]
                        required_fields = ["text", "type", "category"]
                        if all(field in suggestion for field in required_fields):
                            self.log_test("Search Suggestions - Response Structure", True, "All required fields present in suggestions", suggestion)
                        else:
                            missing = [f for f in required_fields if f not in suggestion]
                            self.log_test("Search Suggestions - Response Structure", False, f"Missing fields: {missing}", suggestion)
                            return False
                    else:
                        self.log_test("Search Suggestions - Response Structure", True, "Empty suggestions (valid)", data)
                else:
                    self.log_test("Search Suggestions - Response Structure", False, f"HTTP {response.status}")
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("Search Suggestions", False, f"Error: {str(e)}")
            return False
    
    async def test_global_search(self):
        """Test global search full results endpoint"""
        try:
            # Test with short query (should return empty results)
            async with self.session.get(f"{self.base_url}/api/search/global?query=A") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["query", "total_results", "results", "categories"]
                    if all(field in data for field in required_fields):
                        if data["total_results"] == 0 and len(data["results"]) == 0:
                            self.log_test("Global Search - Short Query", True, "Short query correctly returned empty results", data)
                        else:
                            self.log_test("Global Search - Short Query", False, f"Short query should return empty results, got {data['total_results']}", data)
                            return False
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test("Global Search - Short Query", False, f"Missing fields: {missing}", data)
                        return False
                else:
                    self.log_test("Global Search - Short Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with ABC query (should find ABC Corp customer)
            async with self.session.get(f"{self.base_url}/api/search/global?query=ABC") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] > 0:
                        # Check if ABC Corp is in results
                        abc_found = any("abc corp" in r.get("title", "").lower() for r in data["results"])
                        if abc_found:
                            self.log_test("Global Search - ABC Query", True, f"Found ABC Corp in {data['total_results']} results", {"total": data["total_results"], "categories": data["categories"]})
                        else:
                            self.log_test("Global Search - ABC Query", False, f"ABC Corp not found in results", data)
                            return False
                    else:
                        self.log_test("Global Search - ABC Query", False, "No results found for ABC query", data)
                        return False
                else:
                    self.log_test("Global Search - ABC Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with Product query (should find Product A and Product B)
            async with self.session.get(f"{self.base_url}/api/search/global?query=Product") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] > 0:
                        product_results = [r for r in data["results"] if "product" in r.get("title", "").lower()]
                        if len(product_results) > 0:
                            self.log_test("Global Search - Product Query", True, f"Found {len(product_results)} product results", {"total": data["total_results"], "categories": data["categories"]})
                        else:
                            self.log_test("Global Search - Product Query", False, f"No product results found", data)
                            return False
                    else:
                        self.log_test("Global Search - Product Query", False, "No results found for Product query", data)
                        return False
                else:
                    self.log_test("Global Search - Product Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with PROD-A query (should find Product A by item code)
            async with self.session.get(f"{self.base_url}/api/search/global?query=PROD-A") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] > 0:
                        prod_a_found = any("prod-a" in r.get("subtitle", "").lower() or "product a" in r.get("title", "").lower() for r in data["results"])
                        if prod_a_found:
                            self.log_test("Global Search - Item Code Query", True, f"Found Product A by item code in {data['total_results']} results", {"total": data["total_results"], "categories": data["categories"]})
                        else:
                            self.log_test("Global Search - Item Code Query", False, f"Product A not found by item code", data)
                            return False
                    else:
                        self.log_test("Global Search - Item Code Query", False, "No results found for PROD-A query", data)
                        return False
                else:
                    self.log_test("Global Search - Item Code Query", False, f"HTTP {response.status}")
                    return False
            
            # Test with XYZ query (should find XYZ Suppliers)
            async with self.session.get(f"{self.base_url}/api/search/global?query=XYZ") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] > 0:
                        xyz_found = any("xyz" in r.get("title", "").lower() for r in data["results"])
                        if xyz_found:
                            self.log_test("Global Search - XYZ Query", True, f"Found XYZ Suppliers in {data['total_results']} results", {"total": data["total_results"], "categories": data["categories"]})
                        else:
                            self.log_test("Global Search - XYZ Query", False, f"XYZ Suppliers not found", data)
                            return False
                    else:
                        self.log_test("Global Search - XYZ Query", False, "No results found for XYZ query", data)
                        return False
                else:
                    self.log_test("Global Search - XYZ Query", False, f"HTTP {response.status}")
                    return False
            
            # Test limit parameter
            async with self.session.get(f"{self.base_url}/api/search/global?query=Product&limit=1") as response:
                if response.status == 200:
                    data = await response.json()
                    if len(data["results"]) <= 1:
                        self.log_test("Global Search - Limit Parameter", True, f"Limit parameter working, got {len(data['results'])} results", {"total": data["total_results"], "results_count": len(data["results"])})
                    else:
                        self.log_test("Global Search - Limit Parameter", False, f"Limit not respected, got {len(data['results'])} results", data)
                        return False
                else:
                    self.log_test("Global Search - Limit Parameter", False, f"HTTP {response.status}")
                    return False
            
            # Test category filtering
            async with self.session.get(f"{self.base_url}/api/search/global?query=ABC&category=customers") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] > 0:
                        # All results should be customers
                        all_customers = all(r.get("type") == "customer" for r in data["results"])
                        if all_customers:
                            self.log_test("Global Search - Category Filter", True, f"Category filtering working, all {len(data['results'])} results are customers", {"categories": data["categories"]})
                        else:
                            self.log_test("Global Search - Category Filter", False, f"Category filter not working properly", data)
                            return False
                    else:
                        self.log_test("Global Search - Category Filter", True, "No customer results for ABC (acceptable)", data)
                else:
                    self.log_test("Global Search - Category Filter", False, f"HTTP {response.status}")
                    return False
            
            # Test result structure
            async with self.session.get(f"{self.base_url}/api/search/global?query=ABC") as response:
                if response.status == 200:
                    data = await response.json()
                    if len(data["results"]) > 0:
                        result = data["results"][0]
                        required_fields = ["id", "type", "title", "subtitle", "description", "url", "relevance"]
                        if all(field in result for field in required_fields):
                            self.log_test("Global Search - Result Structure", True, "All required fields present in results", result)
                        else:
                            missing = [f for f in required_fields if f not in result]
                            self.log_test("Global Search - Result Structure", False, f"Missing fields: {missing}", result)
                            return False
                    else:
                        self.log_test("Global Search - Result Structure", True, "No results to check structure (acceptable)", data)
                else:
                    self.log_test("Global Search - Result Structure", False, f"HTTP {response.status}")
                    return False
            
            # Test relevance scoring (results should be sorted by relevance)
            async with self.session.get(f"{self.base_url}/api/search/global?query=Product") as response:
                if response.status == 200:
                    data = await response.json()
                    if len(data["results"]) > 1:
                        relevance_scores = [r.get("relevance", 0) for r in data["results"]]
                        is_sorted = all(relevance_scores[i] >= relevance_scores[i+1] for i in range(len(relevance_scores)-1))
                        if is_sorted:
                            self.log_test("Global Search - Relevance Sorting", True, f"Results properly sorted by relevance: {relevance_scores}", {"scores": relevance_scores})
                        else:
                            self.log_test("Global Search - Relevance Sorting", False, f"Results not sorted by relevance: {relevance_scores}", data)
                            return False
                    else:
                        self.log_test("Global Search - Relevance Sorting", True, "Not enough results to test sorting (acceptable)", data)
                else:
                    self.log_test("Global Search - Relevance Sorting", False, f"HTTP {response.status}")
                    return False
            
            # Test empty query
            async with self.session.get(f"{self.base_url}/api/search/global?query=") as response:
                if response.status == 200:
                    data = await response.json()
                    if data["total_results"] == 0:
                        self.log_test("Global Search - Empty Query", True, "Empty query correctly returned no results", data)
                    else:
                        self.log_test("Global Search - Empty Query", False, f"Empty query should return no results, got {data['total_results']}", data)
                        return False
                else:
                    self.log_test("Global Search - Empty Query", False, f"HTTP {response.status}")
                    return False
            
            # Test special characters
            async with self.session.get(f"{self.base_url}/api/search/global?query=@#$%") as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_test("Global Search - Special Characters", True, f"Special characters handled gracefully, got {data['total_results']} results", data)
                else:
                    self.log_test("Global Search - Special Characters", False, f"HTTP {response.status}")
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("Global Search", False, f"Error: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for ERPNext Clone")
        print(f"📍 Testing URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            self.test_health_check,
            self.test_dashboard_stats,
            self.test_dashboard_transactions,
            self.test_auth_me,
            self.test_sales_orders,
            self.test_sales_customers,
            self.test_database_initialization,
            self.test_error_handling
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                result = await test()
                if result:
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
        
        return passed, total, self.test_results

async def main():
    """Main test runner"""
    async with BackendTester() as tester:
        passed, total, results = await tester.run_all_tests()
        
        # Save detailed results to file
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "passed": passed,
                    "total": total,
                    "success_rate": f"{(passed/total)*100:.1f}%",
                    "timestamp": datetime.now().isoformat()
                },
                "detailed_results": results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
        return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)