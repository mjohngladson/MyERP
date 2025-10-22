# Credit Note & Debit Note Enhancements V2 - Testing Guide

## Overview
This document describes the enhanced CN/DN features implemented based on user requirements.

## Enhancements Implemented

### 1. Edge Case Handling - Over-Credit Prevention ✅
**Requirement:** Reject CN/DN if amount exceeds remaining invoice balance

**Implementation:**
- Validates CN/DN amount against `original_invoice_total - total_credit_notes_amount`
- Returns HTTP 400 with detailed error message if validation fails
- Error message includes: original total, already credited amount, available balance

**Example Error Response:**
```json
{
  "detail": "Credit Note amount (₹500) exceeds available balance. Invoice original total: ₹1000, Already credited: ₹700, Available for credit: ₹300"
}
```

---

### 2. Multiple CN/DNs Per Invoice ✅
**Requirement:** Track cumulative amounts & prevent exceeding original invoice

**Implementation:**

#### Invoice Schema Additions:
```javascript
{
  "original_total_amount": 1000.0,        // Preserved original amount
  "total_amount": 700.0,                  // Current amount after CN/DN
  "total_credit_notes_amount": 300.0,     // Cumulative CN amount
  "credit_notes": ["cn-id-1", "cn-id-2"], // Array of CN IDs
  "total_debit_notes_amount": 0.0,        // Cumulative DN amount (purchase invoices)
  "debit_notes": [],                       // Array of DN IDs (purchase invoices)
  "last_credit_note_id": "cn-id-2",       // Most recent CN
  "last_credit_note_amount": 150.0        // Most recent CN amount
}
```

#### Validation Logic:
1. Fetch invoice and check `original_total_amount`
2. Calculate: `existing_cn_amount = invoice.total_credit_notes_amount`
3. Validate: `existing_cn_amount + new_cn_amount <= original_total_amount`
4. Reject if exceeds with detailed error

---

### 3. Payment Allocation Auto-Reversal ✅
**Requirement:** Automatically reverse excess payment allocations when CN/DN reduces invoice total

**Implementation:**

#### Scenario:
- Invoice Original Total: ₹1000
- Payment Allocated: ₹1000 (fully paid)
- Credit Note Created: ₹300
- New Invoice Total: ₹700
- Excess Allocation: ₹300 (needs reversal)

#### Auto-Reversal Process:
1. **Detect Excess**: `if total_allocated > new_invoice_total`
2. **Calculate**: `excess = total_allocated - new_invoice_total`
3. **Reverse LIFO**: Most recent allocations reversed first
4. **Update Allocation**: Delete or reduce allocation amount
5. **Update Payment**: Increase payment's `unallocated_amount`
6. **Track Reversals**: Store reversal information in invoice

#### Invoice Tracking Fields:
```javascript
{
  "payment_allocations_reversed": true,
  "reversed_allocations_count": 2,
  "total_amount_reversed": 300.0
}
```

---

## Testing Scenarios

### Test 1: Single CN Within Limit
**Steps:**
1. Create Sales Invoice for ₹1000
2. Create Credit Note for ₹300
3. Expected: ✅ Success

**Verification:**
- Invoice `total_amount` = ₹700
- Invoice `total_credit_notes_amount` = ₹300
- Invoice `credit_notes` array contains CN ID

---

### Test 2: Multiple CNs Cumulative Validation
**Steps:**
1. Create Sales Invoice for ₹1000
2. Create Credit Note #1 for ₹600 → ✅ Success
3. Create Credit Note #2 for ₹500 → ❌ Should FAIL

**Expected Error:**
```
Credit Note amount (₹500) exceeds available balance.
Invoice original total: ₹1000
Already credited: ₹600
Available for credit: ₹400
```

**Verification:**
- Second CN rejected with HTTP 400
- Invoice still shows only first CN
- `total_credit_notes_amount` = ₹600

---

### Test 3: CN on Fully Paid Invoice with Auto-Reversal
**Steps:**
1. Create Sales Invoice for ₹1000
2. Create Payment Entry for ₹1000
3. Allocate full ₹1000 to invoice (fully paid)
4. Create Credit Note for ₹300

**Expected Results:**
- ✅ CN created successfully
- Invoice `total_amount` reduced to ₹700
- Payment allocation automatically reduced to ₹700
- Payment `unallocated_amount` increased by ₹300
- Invoice tracking shows:
  - `payment_allocations_reversed` = true
  - `reversed_allocations_count` = 1
  - `total_amount_reversed` = 300.0

---

### Test 4: Multiple Allocations with Partial Reversal
**Steps:**
1. Create Sales Invoice for ₹1000
2. Create Payment #1 for ₹400, allocate ₹400
3. Create Payment #2 for ₹600, allocate ₹600
4. Total allocated: ₹1000
5. Create Credit Note for ₹500

**Expected Auto-Reversal (LIFO):**
1. Payment #2 allocation fully reversed: ₹600 → ₹0 (deleted)
2. Remaining excess: ₹500 - ₹600 = -₹100
3. No further reversals needed
4. Payment #1 allocation remains: ₹400
5. Invoice new total: ₹500
6. Invoice allocated: ₹400
7. Invoice outstanding: ₹100

**Verification:**
- Payment #2 `unallocated_amount` increased by ₹600
- Payment #1 allocation unchanged
- Invoice shows ₹400 allocated, ₹100 outstanding

---

### Test 5: Debit Note with Payment Reversal
**Steps:**
1. Create Purchase Invoice for ₹2000
2. Create Payment for ₹2000 (fully paid)
3. Create Debit Note for ₹800

**Expected:**
- DN created successfully
- Invoice `total_amount` = ₹1200
- Payment allocation reduced to ₹1200
- Payment `unallocated_amount` increased by ₹800

---

### Test 6: Edge Case - CN Exactly Equals Available Balance
**Steps:**
1. Create Invoice for ₹1000
2. Create CN #1 for ₹400 → ✅ Success
3. Create CN #2 for ₹600 → ✅ Should succeed (exactly at limit)
4. Create CN #3 for ₹1 → ❌ Should fail

**Verification:**
- CN #2 accepted (₹400 + ₹600 = ₹1000)
- CN #3 rejected (₹1000 + ₹1 > ₹1000)
- Invoice `total_credit_notes_amount` = ₹1000
- Invoice `total_amount` = ₹0

---

## API Endpoints Modified

### POST /api/sales/credit-notes
**New Validations:**
- Checks cumulative CN amount
- Returns HTTP 400 if exceeds original invoice total

**New Response Fields:**
```json
{
  "success": true,
  "message": "Credit Note created and accounting entries generated",
  "credit_note": {...},
  "invoice_adjustments": {
    "original_total": 1000.0,
    "new_total": 700.0,
    "total_cn_amount": 300.0,
    "allocations_reversed": 2,
    "amount_reversed": 300.0
  }
}
```

### POST /api/buying/debit-notes
**Similar enhancements** as credit notes for purchase invoices

---

## Database Changes

### Sales Invoices Collection:
**New Fields:**
- `original_total_amount` (Float) - Preserved original amount
- `total_credit_notes_amount` (Float) - Cumulative CN amount
- `credit_notes` (Array) - List of CN IDs
- `payment_allocations_reversed` (Boolean)
- `reversed_allocations_count` (Integer)
- `total_amount_reversed` (Float)

### Purchase Invoices Collection:
**New Fields:**
- `original_total_amount` (Float)
- `total_debit_notes_amount` (Float)
- `debit_notes` (Array)
- `payment_allocations_reversed` (Boolean)
- `reversed_allocations_count` (Integer)
- `total_amount_reversed` (Float)

---

## Error Handling

### HTTP 400 - Validation Failed
**Over-Credit Attempt:**
```json
{
  "detail": "Credit Note amount (₹X) exceeds available balance. Invoice original total: ₹Y, Already credited: ₹Z, Available for credit: ₹W"
}
```

### HTTP 404 - Invoice Not Found
```json
{
  "detail": "Referenced invoice not found"
}
```

---

## Implementation Files Modified

1. `/app/backend/cn_dn_enhanced_helpers.py`
   - Enhanced validation logic
   - Payment allocation reversal
   - Cumulative tracking

2. `/app/backend/routers/credit_notes.py`
   - Calls enhanced helpers
   - Returns detailed responses

3. `/app/backend/routers/debit_notes.py`
   - Similar enhancements for purchase invoices

---

## Testing with curl

### Test Over-Credit Validation:
```bash
# 1. Create invoice
curl -X POST "$BACKEND_URL/api/invoices/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "items": [{"item_name": "Test", "quantity": 10, "rate": 100, "amount": 1000}],
    "status": "submitted"
  }'

# 2. Create first CN (should succeed)
curl -X POST "$BACKEND_URL/api/sales/credit-notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_invoice_id": "<invoice-id>",
    "items": [{"item_name": "Test", "quantity": 6, "rate": 100, "amount": 600}],
    "status": "submitted"
  }'

# 3. Create second CN exceeding limit (should fail with 400)
curl -X POST "$BACKEND_URL/api/sales/credit-notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reference_invoice_id": "<invoice-id>",
    "items": [{"item_name": "Test", "quantity": 5, "rate": 100, "amount": 500}],
    "status": "submitted"
  }'
```

---

## Summary

✅ **Implemented:**
1. Over-credit rejection with detailed error messages
2. Cumulative CN/DN tracking per invoice
3. Automatic payment allocation reversal (LIFO)
4. Complete audit trail in invoice documents
5. Validation preventing total CN/DN from exceeding original invoice

⏳ **Deferred:**
- Concurrency safety (MongoDB transactions/optimistic locking)

All features are working and backend has been restarted successfully.
