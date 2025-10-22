#!/usr/bin/env python3
"""
Timestamp Tracking Test for Credit Notes and Debit Notes
Tests the specific issue where last_sent_at timestamp is not being updated correctly
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timezone

# Get backend URL from environment
BACKEND_URL = "https://erp-gili-1.preview.emergentagent.com"

class TimestampTrackingTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        
    async def test_credit_notes_timestamp_tracking(self):
        """Test Credit Notes timestamp tracking issue"""
        try:
            print("\n🧾 TESTING CREDIT NOTES TIMESTAMP TRACKING")
            print("=" * 60)
            
            # Step 1: Create a test credit note
            create_payload = {
                "customer_name": "Test Customer for Timestamp",
                "customer_email": "timestamp.test@example.com",
                "customer_phone": "+15551234567",
                "credit_note_date": "2024-01-15",
                "reference_invoice": "INV-TEST-001",
                "reason": "Return",
                "items": [
                    {
                        "item_name": "Test Item",
                        "quantity": 1,
                        "rate": 100.0,
                        "amount": 100.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "Draft"
            }
            
            credit_note_id = None
            async with self.session.post(f"{self.base_url}/api/sales/credit-notes", json=create_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") and data.get("credit_note"):
                        credit_note_id = data["credit_note"]["id"]
                        self.log_test("Create Credit Note", True, f"Created credit note: {credit_note_id}")
                    else:
                        self.log_test("Create Credit Note", False, "Failed to create credit note")
                        return False
                else:
                    self.log_test("Create Credit Note", False, f"HTTP {response.status}")
                    return False
            
            if not credit_note_id:
                return False
            
            # Step 2: Simulate old timestamp (5 hours ago)
            old_timestamp = datetime.now(timezone.utc).replace(hour=datetime.now().hour - 5)
            
            async with self.session.put(f"{self.base_url}/api/sales/credit-notes/{credit_note_id}", json={
                "last_sent_at": old_timestamp.isoformat(),
                "sent_to": "old.test@example.com",
                "send_method": "email"
            }) as response:
                if response.status == 200:
                    self.log_test("Set Old Timestamp", True, f"Set old timestamp: {old_timestamp.isoformat()}")
                else:
                    self.log_test("Set Old Timestamp", False, f"HTTP {response.status}")
                    return False
            
            # Step 3: Verify old timestamp
            async with self.session.get(f"{self.base_url}/api/sales/credit-notes/{credit_note_id}") as response:
                if response.status == 200:
                    before_send_data = await response.json()
                    old_last_sent_at = before_send_data.get("last_sent_at")
                    self.log_test("Verify Old Timestamp", True, f"Old last_sent_at: {old_last_sent_at}")
                else:
                    self.log_test("Verify Old Timestamp", False, f"HTTP {response.status}")
                    return False
            
            # Step 4: Send Email (testing timestamp tracking)
            send_payload = {
                "method": "email",
                "email": "timestamp.test@example.com",
                "attach_pdf": False
            }
            
            send_time_before = datetime.now(timezone.utc)
            
            async with self.session.post(f"{self.base_url}/api/sales/credit-notes/{credit_note_id}/send", json=send_payload) as response:
                send_time_after = datetime.now(timezone.utc)
                
                if response.status == 200:
                    send_response = await response.json()
                    if send_response.get("success"):
                        sent_at_from_response = send_response.get("sent_at")
                        self.log_test("Send Email", True, f"Email sent successfully, response sent_at: {sent_at_from_response}")
                        
                        # Step 5: CRITICAL - Immediately get the credit note to verify timestamp update
                        async with self.session.get(f"{self.base_url}/api/sales/credit-notes/{credit_note_id}") as get_response:
                            if get_response.status == 200:
                                after_send_data = await get_response.json()
                                new_last_sent_at = after_send_data.get("last_sent_at")
                                
                                if new_last_sent_at:
                                    try:
                                        new_timestamp = datetime.fromisoformat(new_last_sent_at.replace('Z', '+00:00'))
                                        
                                        # Check if timestamp was updated (should be recent, not 5 hours ago)
                                        time_diff_seconds = (send_time_after - new_timestamp).total_seconds()
                                        
                                        if abs(time_diff_seconds) < 60:  # Within 1 minute of send time
                                            self.log_test("Verify Timestamp Update", True, f"✅ TIMESTAMP CORRECTLY UPDATED: New last_sent_at ({new_last_sent_at}) is current, not old ({old_last_sent_at})")
                                            
                                            # Additional verification - check other tracking fields
                                            last_send_attempt_at = after_send_data.get("last_send_attempt_at")
                                            sent_to = after_send_data.get("sent_to")
                                            send_method = after_send_data.get("send_method")
                                            
                                            if (last_send_attempt_at and sent_to == "timestamp.test@example.com" and send_method == "email"):
                                                self.log_test("Verify Tracking Fields", True, f"All tracking fields updated correctly: sent_to={sent_to}, method={send_method}")
                                                result = True
                                            else:
                                                self.log_test("Verify Tracking Fields", False, f"Tracking fields not updated correctly: sent_to={sent_to}, method={send_method}")
                                                result = False
                                        else:
                                            self.log_test("Verify Timestamp Update", False, f"❌ TIMESTAMP NOT UPDATED: New last_sent_at ({new_last_sent_at}) is not current. Time diff: {time_diff_seconds} seconds. This is the reported bug!")
                                            result = False
                                    except Exception as e:
                                        self.log_test("Verify Timestamp Update", False, f"Error parsing timestamps: {str(e)}")
                                        result = False
                                else:
                                    self.log_test("Verify Timestamp Update", False, "❌ CRITICAL: last_sent_at field is missing after send operation")
                                    result = False
                            else:
                                self.log_test("Verify Timestamp Update", False, f"Failed to get credit note after send: HTTP {get_response.status}")
                                result = False
                    else:
                        self.log_test("Send Email", False, f"Send failed: {send_response}")
                        result = False
                else:
                    self.log_test("Send Email", False, f"HTTP {response.status}")
                    result = False
            
            # Cleanup
            async with self.session.delete(f"{self.base_url}/api/sales/credit-notes/{credit_note_id}") as response:
                if response.status == 200:
                    self.log_test("Cleanup", True, "Test credit note deleted")
                else:
                    self.log_test("Cleanup", False, f"Failed to delete test credit note: HTTP {response.status}")
            
            return result
            
        except Exception as e:
            self.log_test("Credit Notes Timestamp Tracking", False, f"Error: {str(e)}")
            return False

    async def test_debit_notes_timestamp_tracking(self):
        """Test Debit Notes timestamp tracking issue"""
        try:
            print("\n📋 TESTING DEBIT NOTES TIMESTAMP TRACKING")
            print("=" * 60)
            
            # Step 1: Create a test debit note
            create_payload = {
                "supplier_name": "Test Supplier for Timestamp",
                "supplier_email": "timestamp.test@example.com",
                "supplier_phone": "+15551234567",
                "debit_note_date": "2024-01-15",
                "reference_invoice": "PINV-TEST-001",
                "reason": "Return",
                "items": [
                    {
                        "item_name": "Test Item",
                        "quantity": 1,
                        "rate": 100.0,
                        "amount": 100.0
                    }
                ],
                "discount_amount": 0,
                "tax_rate": 18,
                "status": "Draft"
            }
            
            debit_note_id = None
            async with self.session.post(f"{self.base_url}/api/buying/debit-notes", json=create_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") and data.get("debit_note"):
                        debit_note_id = data["debit_note"]["id"]
                        self.log_test("Create Debit Note", True, f"Created debit note: {debit_note_id}")
                    else:
                        self.log_test("Create Debit Note", False, "Failed to create debit note")
                        return False
                else:
                    self.log_test("Create Debit Note", False, f"HTTP {response.status}")
                    return False
            
            if not debit_note_id:
                return False
            
            # Step 2: Simulate old timestamp (5 hours ago)
            old_timestamp = datetime.now(timezone.utc).replace(hour=datetime.now().hour - 5)
            
            async with self.session.put(f"{self.base_url}/api/buying/debit-notes/{debit_note_id}", json={
                "last_sent_at": old_timestamp.isoformat(),
                "sent_to": "old.test@example.com",
                "send_method": "email"
            }) as response:
                if response.status == 200:
                    self.log_test("Set Old Timestamp", True, f"Set old timestamp: {old_timestamp.isoformat()}")
                else:
                    self.log_test("Set Old Timestamp", False, f"HTTP {response.status}")
                    return False
            
            # Step 3: Verify old timestamp
            async with self.session.get(f"{self.base_url}/api/buying/debit-notes/{debit_note_id}") as response:
                if response.status == 200:
                    before_send_data = await response.json()
                    old_last_sent_at = before_send_data.get("last_sent_at")
                    self.log_test("Verify Old Timestamp", True, f"Old last_sent_at: {old_last_sent_at}")
                else:
                    self.log_test("Verify Old Timestamp", False, f"HTTP {response.status}")
                    return False
            
            # Step 4: Send Email (testing timestamp tracking)
            send_payload = {
                "method": "email",
                "email": "timestamp.test@example.com",
                "attach_pdf": False
            }
            
            send_time_before = datetime.now(timezone.utc)
            
            async with self.session.post(f"{self.base_url}/api/buying/debit-notes/{debit_note_id}/send", json=send_payload) as response:
                send_time_after = datetime.now(timezone.utc)
                
                if response.status == 200:
                    send_response = await response.json()
                    if send_response.get("success"):
                        sent_at_from_response = send_response.get("sent_at")
                        self.log_test("Send Email", True, f"Email sent successfully, response sent_at: {sent_at_from_response}")
                        
                        # Step 5: CRITICAL - Immediately get the debit note to verify timestamp update
                        async with self.session.get(f"{self.base_url}/api/buying/debit-notes/{debit_note_id}") as get_response:
                            if get_response.status == 200:
                                after_send_data = await get_response.json()
                                new_last_sent_at = after_send_data.get("last_sent_at")
                                
                                if new_last_sent_at:
                                    try:
                                        new_timestamp = datetime.fromisoformat(new_last_sent_at.replace('Z', '+00:00'))
                                        
                                        # Check if timestamp was updated (should be recent, not 5 hours ago)
                                        time_diff_seconds = (send_time_after - new_timestamp).total_seconds()
                                        
                                        if abs(time_diff_seconds) < 60:  # Within 1 minute of send time
                                            self.log_test("Verify Timestamp Update", True, f"✅ TIMESTAMP CORRECTLY UPDATED: New last_sent_at ({new_last_sent_at}) is current, not old ({old_last_sent_at})")
                                            
                                            # Additional verification - check other tracking fields
                                            last_send_attempt_at = after_send_data.get("last_send_attempt_at")
                                            sent_to = after_send_data.get("sent_to")
                                            send_method = after_send_data.get("send_method")
                                            
                                            if (last_send_attempt_at and sent_to == "timestamp.test@example.com" and send_method == "email"):
                                                self.log_test("Verify Tracking Fields", True, f"All tracking fields updated correctly: sent_to={sent_to}, method={send_method}")
                                                result = True
                                            else:
                                                self.log_test("Verify Tracking Fields", False, f"Tracking fields not updated correctly: sent_to={sent_to}, method={send_method}")
                                                result = False
                                        else:
                                            self.log_test("Verify Timestamp Update", False, f"❌ TIMESTAMP NOT UPDATED: New last_sent_at ({new_last_sent_at}) is not current. Time diff: {time_diff_seconds} seconds. This is the reported bug!")
                                            result = False
                                    except Exception as e:
                                        self.log_test("Verify Timestamp Update", False, f"Error parsing timestamps: {str(e)}")
                                        result = False
                                else:
                                    self.log_test("Verify Timestamp Update", False, "❌ CRITICAL: last_sent_at field is missing after send operation")
                                    result = False
                            else:
                                self.log_test("Verify Timestamp Update", False, f"Failed to get debit note after send: HTTP {get_response.status}")
                                result = False
                    else:
                        self.log_test("Send Email", False, f"Send failed: {send_response}")
                        result = False
                else:
                    self.log_test("Send Email", False, f"HTTP {response.status}")
                    result = False
            
            # Cleanup
            async with self.session.delete(f"{self.base_url}/api/buying/debit-notes/{debit_note_id}") as response:
                if response.status == 200:
                    self.log_test("Cleanup", True, "Test debit note deleted")
                else:
                    self.log_test("Cleanup", False, f"Failed to delete test debit note: HTTP {response.status}")
            
            return result
            
        except Exception as e:
            self.log_test("Debit Notes Timestamp Tracking", False, f"Error: {str(e)}")
            return False

    async def run_tests(self):
        """Run all timestamp tracking tests"""
        print("🚀 TIMESTAMP TRACKING ISSUE TESTING")
        print(f"🌐 Testing against: {self.base_url}")
        print("🐛 Bug: After sending SMS/Email, it still shows 'sent 5h ago' instead of current time")
        print("🎯 Testing: last_sent_at timestamp update after send operations")
        print("=" * 80)
        
        # Health check
        try:
            async with self.session.get(f"{self.base_url}/api/") as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "GiLi API" in data["message"]:
                        self.log_test("Health Check", True, "API is running")
                    else:
                        self.log_test("Health Check", False, f"Unexpected response: {data}")
                        return
                else:
                    self.log_test("Health Check", False, f"HTTP {response.status}")
                    return
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return
        
        # Run tests
        credit_notes_result = await self.test_credit_notes_timestamp_tracking()
        debit_notes_result = await self.test_debit_notes_timestamp_tracking()
        
        # Summary
        print("\n" + "=" * 80)
        print("🏁 TIMESTAMP TRACKING TESTING COMPLETE")
        
        if credit_notes_result and debit_notes_result:
            print("✅ ALL TESTS PASSED - Timestamp tracking is working correctly")
        else:
            print("❌ TESTS FAILED - Timestamp tracking issue confirmed")
            if not credit_notes_result:
                print("   - Credit Notes timestamp tracking failed")
            if not debit_notes_result:
                print("   - Debit Notes timestamp tracking failed")
        
        print("=" * 80)

async def main():
    async with TimestampTrackingTester() as tester:
        await tester.run_tests()

if __name__ == "__main__":
    asyncio.run(main())