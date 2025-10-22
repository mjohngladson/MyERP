#!/usr/bin/env python3
"""
Critical Fixes Testing Script
Tests two critical fixes:
1. DN Over-Credit Prevention (even in draft)
2. Quantity Integer Validation (all transaction types)
"""

import asyncio
import sys
from backend_test import BackendTester

async def main():
    print("=" * 80)
    print("🔥 CRITICAL FIXES TESTING")
    print("=" * 80)
    print("Testing two critical fixes:")
    print("1. Prevent DN creation when amount exceeds PI (even in draft)")
    print("2. Restrict line item quantities to integers only (no decimals)")
    print("=" * 80)
    print()
    
    async with BackendTester() as tester:
        # Test 1: DN Over-Credit Prevention
        print("\n" + "=" * 80)
        print("TEST 1: DEBIT NOTE OVER-CREDIT PREVENTION")
        print("=" * 80)
        result1 = await tester.test_debit_note_over_credit_prevention()
        
        # Test 2: Quantity Integer Validation
        print("\n" + "=" * 80)
        print("TEST 2: QUANTITY INTEGER VALIDATION")
        print("=" * 80)
        result2 = await tester.test_quantity_integer_validation()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 CRITICAL FIXES TEST SUMMARY")
        print("=" * 80)
        
        tests_passed = sum([result1, result2])
        tests_failed = 2 - tests_passed
        
        print(f"✅ Passed: {tests_passed}/2")
        print(f"❌ Failed: {tests_failed}/2")
        
        if tests_failed == 0:
            print("\n🎉 ALL CRITICAL FIXES WORKING CORRECTLY!")
            print("=" * 80)
            return 0
        else:
            print("\n🚨 SOME CRITICAL FIXES FAILED!")
            print("=" * 80)
            
            # Show detailed failures
            print("\nFailed Tests:")
            if not result1:
                print("  ❌ DN Over-Credit Prevention")
            if not result2:
                print("  ❌ Quantity Integer Validation")
            
            print("\nPlease review the detailed test output above.")
            print("=" * 80)
            return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
