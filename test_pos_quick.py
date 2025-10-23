#!/usr/bin/env python3
import asyncio
import aiohttp

async def test_pos_endpoints():
    base_url = 'https://erp-integrity.preview.emergentagent.com'
    
    async with aiohttp.ClientSession() as session:
        print('🔍 Testing PoS Integration Endpoints')
        print('=' * 50)
        
        # Test health check
        try:
            async with session.get(f'{base_url}/api/pos/health') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ PoS Health Check: {data["status"]} - Products: {data["products_available"]}, Customers: {data["customers_available"]}')
                else:
                    print(f'❌ PoS Health Check: HTTP {response.status}')
        except Exception as e:
            print(f'❌ PoS Health Check: {str(e)}')
        
        # Test products sync
        try:
            async with session.get(f'{base_url}/api/pos/products') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ PoS Products: Retrieved {len(data)} products')
                    if len(data) > 0:
                        print(f'   Sample product: {data[0]["name"]} - ${data[0]["price"]}')
                else:
                    print(f'❌ PoS Products: HTTP {response.status}')
        except Exception as e:
            print(f'❌ PoS Products: {str(e)}')
        
        # Test customers sync
        try:
            async with session.get(f'{base_url}/api/pos/customers') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ PoS Customers: Retrieved {len(data)} customers')
                    if len(data) > 0:
                        print(f'   Sample customer: {data[0]["name"]} - {data[0]["loyalty_points"]} points')
                else:
                    print(f'❌ PoS Customers: HTTP {response.status}')
        except Exception as e:
            print(f'❌ PoS Customers: {str(e)}')
        
        # Test categories
        try:
            async with session.get(f'{base_url}/api/pos/categories') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f'✅ PoS Categories: Retrieved {data["count"]} categories: {data["categories"]}')
                else:
                    print(f'❌ PoS Categories: HTTP {response.status}')
        except Exception as e:
            print(f'❌ PoS Categories: {str(e)}')

if __name__ == "__main__":
    asyncio.run(test_pos_endpoints())