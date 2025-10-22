#!/usr/bin/env python3
import asyncio
import aiohttp
import json
from datetime import datetime

async def comprehensive_pos_test():
    base_url = 'https://erp-debug-1.preview.emergentagent.com'
    
    async with aiohttp.ClientSession() as session:
        print('🚀 Comprehensive PoS Integration API Testing')
        print('=' * 60)
        
        test_results = []
        
        # 1. PoS Health Check
        print('\n1. Testing PoS Health Check...')
        try:
            async with session.get(f'{base_url}/api/pos/health') as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["status", "timestamp", "database", "products_available", "customers_available", "api_version"]
                    if all(field in data for field in required_fields) and data["status"] == "healthy":
                        print(f'✅ Health Check: {data["status"]} - DB: {data["database"]}, Products: {data["products_available"]}, Customers: {data["customers_available"]}')
                        test_results.append(("PoS Health Check", True, data))
                    else:
                        print(f'❌ Health Check: Missing fields or unhealthy status')
                        test_results.append(("PoS Health Check", False, data))
                else:
                    print(f'❌ Health Check: HTTP {response.status}')
                    test_results.append(("PoS Health Check", False, f"HTTP {response.status}"))
        except Exception as e:
            print(f'❌ Health Check: {str(e)}')
            test_results.append(("PoS Health Check", False, str(e)))
        
        # 2. PoS Products Sync
        print('\n2. Testing PoS Products Sync...')
        try:
            # Default products
            async with session.get(f'{base_url}/api/pos/products') as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list) and len(data) > 0:
                        product = data[0]
                        required_fields = ["id", "name", "sku", "price", "category", "stock_quantity", "active"]
                        if all(field in product for field in required_fields):
                            print(f'✅ Products Default: {len(data)} products retrieved')
                            print(f'   Sample: {product["name"]} (${product["price"]}) - Stock: {product["stock_quantity"]}')
                            test_results.append(("PoS Products Default", True, {"count": len(data), "sample": product["name"]}))
                        else:
                            missing = [f for f in required_fields if f not in product]
                            print(f'❌ Products Default: Missing fields: {missing}')
                            test_results.append(("PoS Products Default", False, f"Missing fields: {missing}"))
                    else:
                        print(f'✅ Products Default: Empty list (valid for new system)')
                        test_results.append(("PoS Products Default", True, "Empty list"))
                else:
                    print(f'❌ Products Default: HTTP {response.status}')
                    test_results.append(("PoS Products Default", False, f"HTTP {response.status}"))
            
            # Test search functionality
            async with session.get(f'{base_url}/api/pos/products?search=Product') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ Products Search: Found {len(data)} products for "Product"')
                    test_results.append(("PoS Products Search", True, {"count": len(data)}))
                else:
                    print(f'❌ Products Search: HTTP {response.status}')
                    test_results.append(("PoS Products Search", False, f"HTTP {response.status}"))
            
            # Test category filtering
            async with session.get(f'{base_url}/api/pos/products?category=Electronics') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ Products Category Filter: Found {len(data)} Electronics products')
                    test_results.append(("PoS Products Category", True, {"count": len(data)}))
                else:
                    print(f'❌ Products Category Filter: HTTP {response.status}')
                    test_results.append(("PoS Products Category", False, f"HTTP {response.status}"))
                    
        except Exception as e:
            print(f'❌ Products Sync: {str(e)}')
            test_results.append(("PoS Products Sync", False, str(e)))
        
        # 3. PoS Customers Sync
        print('\n3. Testing PoS Customers Sync...')
        try:
            async with session.get(f'{base_url}/api/pos/customers') as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list) and len(data) > 0:
                        customer = data[0]
                        required_fields = ["id", "name", "email", "phone", "address", "loyalty_points"]
                        if all(field in customer for field in required_fields):
                            print(f'✅ Customers Default: {len(data)} customers retrieved')
                            print(f'   Sample: {customer["name"]} - {customer["loyalty_points"]} loyalty points')
                            test_results.append(("PoS Customers Default", True, {"count": len(data), "sample": customer["name"]}))
                        else:
                            missing = [f for f in required_fields if f not in customer]
                            print(f'❌ Customers Default: Missing fields: {missing}')
                            test_results.append(("PoS Customers Default", False, f"Missing fields: {missing}"))
                    else:
                        print(f'✅ Customers Default: Empty list (valid for new system)')
                        test_results.append(("PoS Customers Default", True, "Empty list"))
                else:
                    print(f'❌ Customers Default: HTTP {response.status}')
                    test_results.append(("PoS Customers Default", False, f"HTTP {response.status}"))
            
            # Test search functionality
            async with session.get(f'{base_url}/api/pos/customers?search=ABC') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ Customers Search: Found {len(data)} customers for "ABC"')
                    test_results.append(("PoS Customers Search", True, {"count": len(data)}))
                else:
                    print(f'❌ Customers Search: HTTP {response.status}')
                    test_results.append(("PoS Customers Search", False, f"HTTP {response.status}"))
                    
        except Exception as e:
            print(f'❌ Customers Sync: {str(e)}')
            test_results.append(("PoS Customers Sync", False, str(e)))
        
        # 4. PoS Full Sync
        print('\n4. Testing PoS Full Sync...')
        try:
            sync_data = {
                "device_id": "test-pos-device-003",
                "device_name": "Test PoS Terminal 3",
                "sync_types": ["products", "customers"]
            }
            
            async with session.post(f'{base_url}/api/pos/sync', json=sync_data) as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["success", "sync_timestamp", "products_updated", "customers_updated", "errors"]
                    if all(field in data for field in required_fields):
                        print(f'✅ Full Sync: Success={data["success"]}, Products={data["products_updated"]}, Customers={data["customers_updated"]}')
                        if data["errors"]:
                            print(f'   Errors: {data["errors"]}')
                        test_results.append(("PoS Full Sync", True, data))
                    else:
                        missing = [f for f in required_fields if f not in data]
                        print(f'❌ Full Sync: Missing fields: {missing}')
                        test_results.append(("PoS Full Sync", False, f"Missing fields: {missing}"))
                else:
                    print(f'❌ Full Sync: HTTP {response.status}')
                    test_results.append(("PoS Full Sync", False, f"HTTP {response.status}"))
        except Exception as e:
            print(f'❌ Full Sync: {str(e)}')
            test_results.append(("PoS Full Sync", False, str(e)))
        
        # 5. PoS Sync Status
        print('\n5. Testing PoS Sync Status...')
        try:
            device_id = "test-pos-device-003"
            async with session.get(f'{base_url}/api/pos/sync-status/{device_id}') as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["device_id", "status"]
                    if all(field in data for field in required_fields):
                        print(f'✅ Sync Status: Device {device_id} - Status: {data["status"]}')
                        if "last_sync" in data and data["last_sync"]:
                            print(f'   Last sync: {data["last_sync"]}')
                        test_results.append(("PoS Sync Status", True, data))
                    else:
                        missing = [f for f in required_fields if f not in data]
                        print(f'❌ Sync Status: Missing fields: {missing}')
                        test_results.append(("PoS Sync Status", False, f"Missing fields: {missing}"))
                else:
                    print(f'❌ Sync Status: HTTP {response.status}')
                    test_results.append(("PoS Sync Status", False, f"HTTP {response.status}"))
        except Exception as e:
            print(f'❌ Sync Status: {str(e)}')
            test_results.append(("PoS Sync Status", False, str(e)))
        
        # 6. PoS Categories
        print('\n6. Testing PoS Categories...')
        try:
            async with session.get(f'{base_url}/api/pos/categories') as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = ["categories", "count"]
                    if all(field in data for field in required_fields):
                        print(f'✅ Categories: Retrieved {data["count"]} categories: {data["categories"]}')
                        test_results.append(("PoS Categories", True, data))
                    else:
                        missing = [f for f in required_fields if f not in data]
                        print(f'❌ Categories: Missing fields: {missing}')
                        test_results.append(("PoS Categories", False, f"Missing fields: {missing}"))
                else:
                    print(f'❌ Categories: HTTP {response.status}')
                    test_results.append(("PoS Categories", False, f"HTTP {response.status}"))
        except Exception as e:
            print(f'❌ Categories: {str(e)}')
            test_results.append(("PoS Categories", False, str(e)))
        
        # Summary
        print('\n' + '=' * 60)
        passed = sum(1 for _, success, _ in test_results if success)
        total = len(test_results)
        print(f'📊 PoS Integration Test Results: {passed}/{total} tests passed')
        
        if passed == total:
            print('🎉 All PoS Integration tests passed!')
        else:
            print(f'⚠️  {total - passed} tests failed.')
            for test_name, success, details in test_results:
                if not success:
                    print(f'   ❌ {test_name}: {details}')
        
        return test_results

if __name__ == "__main__":
    asyncio.run(comprehensive_pos_test())