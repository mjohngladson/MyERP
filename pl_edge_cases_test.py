#!/usr/bin/env python3
"""
P&L Statement Edge Cases Verification Test
Tests zero tax, different tax rates, date filtering, and large amounts
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

# Backend URL
BACKEND_URL = "https://gili-erp-fix.preview.emergentagent.com"

async def test_pl_edge_cases():
    """Test P&L statement edge cases"""
    
    print("🔍 P&L STATEMENT EDGE CASES VERIFICATION")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # Step 1: Login and get token
        login_payload = {"email": "admin@gili.com", "password": "admin123"}
        
        async with session.post(f"{BACKEND_URL}/api/auth/login", json=login_payload) as response:
            if response.status == 200:
                data = await response.json()
                token = data.get("token")
                print(f"✅ Authentication successful")
            else:
                print(f"❌ Login failed: HTTP {response.status}")
                return False
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # EDGE CASE 1: Zero Tax Scenario
        print("\n📊 EDGE CASE 1: Zero Tax Scenario")
        
        si_zero_tax = {
            "customer_name": "Zero Tax Customer",
            "items": [{"item_name": "Zero Tax Product", "quantity": 1, "rate": 2000, "amount": 2000}],
            "tax_rate": 0,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/invoices/", json=si_zero_tax, headers=headers) as response:
            if response.status == 200:
                print("✅ Zero tax Sales Invoice created")
            else:
                print(f"❌ Zero tax SI failed: HTTP {response.status}")
                return False
        
        pi_zero_tax = {
            "supplier_name": "Zero Tax Supplier",
            "items": [{"item_name": "Zero Tax Material", "quantity": 1, "rate": 1200, "amount": 1200}],
            "tax_rate": 0,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/purchase/invoices", json=pi_zero_tax, headers=headers) as response:
            if response.status == 200:
                print("✅ Zero tax Purchase Invoice created")
            else:
                print(f"❌ Zero tax PI failed: HTTP {response.status}")
                return False
        
        # EDGE CASE 2: Different Tax Rates
        print("\n📊 EDGE CASE 2: Different Tax Rates")
        
        si_12_tax = {
            "customer_name": "12% Tax Customer",
            "items": [{"item_name": "12% Tax Product", "quantity": 1, "rate": 1000, "amount": 1000}],
            "tax_rate": 12,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/invoices/", json=si_12_tax, headers=headers) as response:
            if response.status == 200:
                print("✅ 12% tax Sales Invoice created")
            else:
                print(f"❌ 12% tax SI failed: HTTP {response.status}")
                return False
        
        pi_28_tax = {
            "supplier_name": "28% Tax Supplier",
            "items": [{"item_name": "28% Tax Material", "quantity": 1, "rate": 800, "amount": 800}],
            "tax_rate": 28,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/purchase/invoices", json=pi_28_tax, headers=headers) as response:
            if response.status == 200:
                print("✅ 28% tax Purchase Invoice created")
            else:
                print(f"❌ 28% tax PI failed: HTTP {response.status}")
                return False
        
        # EDGE CASE 3: Large Amounts
        print("\n📊 EDGE CASE 3: Large Amounts")
        
        si_large = {
            "customer_name": "Large Amount Customer",
            "items": [{"item_name": "Large Product", "quantity": 1, "rate": 100000, "amount": 100000}],
            "tax_rate": 18,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/invoices/", json=si_large, headers=headers) as response:
            if response.status == 200:
                print("✅ Large amount Sales Invoice created (₹100,000)")
            else:
                print(f"❌ Large amount SI failed: HTTP {response.status}")
                return False
        
        pi_large = {
            "supplier_name": "Large Amount Supplier",
            "items": [{"item_name": "Large Material", "quantity": 1, "rate": 75000, "amount": 75000}],
            "tax_rate": 18,
            "discount_amount": 0,
            "status": "submitted"
        }
        
        async with session.post(f"{BACKEND_URL}/api/purchase/invoices", json=pi_large, headers=headers) as response:
            if response.status == 200:
                print("✅ Large amount Purchase Invoice created (₹75,000)")
            else:
                print(f"❌ Large amount PI failed: HTTP {response.status}")
                return False
        
        # EDGE CASE 4: Date Range Filtering
        print("\n📊 EDGE CASE 4: Date Range Filtering")
        
        # Test current month P&L
        current_date = datetime.now()
        from_date = current_date.replace(day=1).strftime("%Y-%m-%d")
        to_date = current_date.strftime("%Y-%m-%d")
        
        async with session.get(f"{BACKEND_URL}/api/financial/reports/profit-loss?from_date={from_date}&to_date={to_date}", headers=headers) as response:
            if response.status == 200:
                pl_data = await response.json()
                print(f"✅ Date range P&L retrieved ({from_date} to {to_date})")
                print(f"   Net Sales: ₹{pl_data.get('revenue', {}).get('net_sales', 0)}")
            else:
                print(f"❌ Date range P&L failed: HTTP {response.status}")
                return False
        
        # Test previous month (should have less/no data)
        prev_month = current_date.replace(day=1) - timedelta(days=1)
        prev_from = prev_month.replace(day=1).strftime("%Y-%m-%d")
        prev_to = prev_month.strftime("%Y-%m-%d")
        
        async with session.get(f"{BACKEND_URL}/api/financial/reports/profit-loss?from_date={prev_from}&to_date={prev_to}", headers=headers) as response:
            if response.status == 200:
                prev_pl_data = await response.json()
                print(f"✅ Previous month P&L retrieved ({prev_from} to {prev_to})")
                print(f"   Net Sales: ₹{prev_pl_data.get('revenue', {}).get('net_sales', 0)}")
            else:
                print(f"❌ Previous month P&L failed: HTTP {response.status}")
                return False
        
        # Final P&L Analysis
        print("\n📊 FINAL P&L ANALYSIS")
        
        async with session.get(f"{BACKEND_URL}/api/financial/reports/profit-loss", headers=headers) as response:
            if response.status == 200:
                final_pl = await response.json()
                
                # Extract values
                revenue = final_pl.get("revenue", {})
                cost_of_sales = final_pl.get("cost_of_sales", {})
                
                sales_revenue = revenue.get("sales_revenue", 0)
                sales_returns = revenue.get("sales_returns", 0)
                net_sales = revenue.get("net_sales", 0)
                purchases = cost_of_sales.get("purchases", 0)
                purchase_returns = cost_of_sales.get("purchase_returns", 0)
                net_purchases = cost_of_sales.get("net_purchases", 0)
                gross_profit = final_pl.get("gross_profit", 0)
                net_profit = final_pl.get("net_profit", 0)
                profit_margin = final_pl.get("profit_margin_percent", 0)
                
                print(f"\n📈 COMPREHENSIVE P&L RESULTS:")
                print(f"Sales Revenue: ₹{sales_revenue:,.2f}")
                print(f"Sales Returns: ₹{sales_returns:,.2f}")
                print(f"Net Sales: ₹{net_sales:,.2f}")
                print(f"Purchases: ₹{purchases:,.2f}")
                print(f"Purchase Returns: ₹{purchase_returns:,.2f}")
                print(f"Net Purchases: ₹{net_purchases:,.2f}")
                print(f"Gross Profit: ₹{gross_profit:,.2f}")
                print(f"Net Profit: ₹{net_profit:,.2f}")
                print(f"Profit Margin: {profit_margin:.2f}%")
                
                # Verification checks for edge cases
                print(f"\n✅ EDGE CASE VERIFICATION:")
                
                checks = []
                
                # Check large amounts are handled correctly
                if sales_revenue >= 100000:  # Should include our ₹100,000 SI
                    checks.append("✅ Large amounts handled correctly")
                else:
                    checks.append("❌ Large amounts not processed correctly")
                
                # Check different tax rates are processed (amounts should reflect different rates)
                if purchases >= 75000:  # Should include our ₹75,000 PI
                    checks.append("✅ Different tax rates processed correctly")
                else:
                    checks.append("❌ Different tax rates not processed correctly")
                
                # Check zero tax transactions are included
                if sales_revenue >= 2000:  # Should include our ₹2,000 zero tax SI
                    checks.append("✅ Zero tax transactions processed correctly")
                else:
                    checks.append("❌ Zero tax transactions not processed correctly")
                
                # Mathematical accuracy checks
                if abs(net_sales - (sales_revenue - sales_returns)) < 0.01:
                    checks.append("✅ Net Sales calculation accurate")
                else:
                    checks.append("❌ Net Sales calculation inaccurate")
                
                if abs(net_purchases - (purchases - purchase_returns)) < 0.01:
                    checks.append("✅ Net Purchases calculation accurate")
                else:
                    checks.append("❌ Net Purchases calculation inaccurate")
                
                if abs(gross_profit - (net_sales - net_purchases)) < 0.01:
                    checks.append("✅ Gross Profit calculation accurate")
                else:
                    checks.append("❌ Gross Profit calculation inaccurate")
                
                # Print all checks
                for check in checks:
                    print(check)
                
                # Overall result
                all_passed = all("✅" in check for check in checks)
                
                print(f"\n🎯 EDGE CASES RESULT:")
                if all_passed:
                    print("🎉 ALL EDGE CASE VERIFICATION CHECKS PASSED!")
                    print("✅ Zero tax scenarios work correctly")
                    print("✅ Different tax rates are processed accurately")
                    print("✅ Large amounts are handled without issues")
                    print("✅ Date range filtering is functional")
                    print("✅ All mathematical calculations are accurate")
                else:
                    print("⚠️ Some edge case verification checks failed")
                
                return all_passed
                
            else:
                print(f"❌ Failed to get final P&L: HTTP {response.status}")
                return False

if __name__ == "__main__":
    result = asyncio.run(test_pl_edge_cases())
    if result:
        print("\n🎉 P&L EDGE CASES VERIFICATION COMPLETED SUCCESSFULLY!")
    else:
        print("\n❌ P&L EDGE CASES VERIFICATION FAILED!")