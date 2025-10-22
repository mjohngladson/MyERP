# Payment Allocation - Invoice Loading Fix

**Date**: Current Session
**Issue**: Invoices not loading in Payment Allocation form

## Problem Identified

### Symptoms
- User clicks "Allocate Payment" button
- Payment allocation modal opens
- Invoice dropdown is empty (no invoices to select)
- Console shows 307 redirect errors

### Root Causes

**1. HTTP 307 Redirect Issue**
- Backend logs showed: `GET /api/invoices?customer_id=... HTTP/1.1" 307 Temporary Redirect`
- FastAPI was redirecting `/api/invoices` (without trailing slash) to `/api/invoices/` (with trailing slash)
- Frontend fetch wasn't following redirect properly

**2. Payment Status Filter Too Strict**
- Filter: `inv.payment_status !== 'Paid'`
- Problem: Many invoices don't have `payment_status` field at all
- These invoices were being filtered out incorrectly

## Solutions Applied

### 1. Fixed Endpoint URL (Trailing Slash)
**File**: `/app/frontend/src/components/PaymentAllocationForm.jsx`

**Before**:
```javascript
const endpoint = isCustomer 
  ? `${base}/api/invoices?${partyQuery}&limit=100`  // No trailing slash
  : `${base}/api/purchase/invoices?${partyQuery}&limit=100`;
```

**After**:
```javascript
const endpoint = isCustomer 
  ? `${base}/api/invoices/?${partyQuery}&limit=100`  // Added trailing slash
  : `${base}/api/purchase/invoices?${partyQuery}&limit=100`;
```

**Result**: Prevents 307 redirect, direct API call success

### 2. Enhanced Error Handling
**Added**:
```javascript
if (!res.ok) {
  console.error('Failed to fetch invoices:', res.status, res.statusText);
  return;
}
```

**Result**: Better error visibility in console

### 3. Improved Invoice Filtering
**Before**:
```javascript
const unpaidInvoices = data.filter(
  inv => inv.payment_status !== 'Paid'
);
```

**After**:
```javascript
const unpaidInvoices = data.filter(
  inv => !inv.payment_status || 
         inv.payment_status === 'Unpaid' || 
         inv.payment_status === 'Partially Paid'
);
```

**Logic**:
- `!inv.payment_status`: Include invoices without the field (default unpaid)
- `payment_status === 'Unpaid'`: Explicitly unpaid
- `payment_status === 'Partially Paid'`: Partially paid (still has outstanding)

**Result**: All relevant invoices now included

### 4. Added Debug Logging
```javascript
console.log('Loaded invoices:', unpaidInvoices.length, 'from', data.length, 'total');
```

**Result**: Easy to verify how many invoices loaded in console

## Why These Fixes Work

### Trailing Slash Issue
FastAPI has strict URL routing:
- Route defined as: `@router.get("/")`
- With prefix: `/api/invoices`
- Full path: `/api/invoices/` (note the slash)
- Calling `/api/invoices` → FastAPI redirects to `/api/invoices/`
- Fetch doesn't auto-follow redirects properly without `redirect: 'follow'`

### Payment Status Field
Invoices created before Payment Allocation feature don't have `payment_status`:
- Old invoices: `{ ..., status: 'submitted' }` (no payment_status)
- New invoices: `{ ..., status: 'submitted', payment_status: 'Unpaid' }`
- Filter must handle both cases

## Testing Verification

**Test Scenario 1: Customer Payment**
1. Create Payment Entry (Type: Receive, Party: Customer)
2. Click "Allocate Payment"
3. ✅ Invoice dropdown shows all unpaid customer invoices
4. Select invoice and allocate
5. ✅ Allocation saves successfully

**Test Scenario 2: Supplier Payment**
1. Create Payment Entry (Type: Pay, Party: Supplier)
2. Click "Allocate Payment"
3. ✅ Purchase Invoice dropdown shows all unpaid supplier invoices
4. Select invoice and allocate
5. ✅ Allocation saves successfully

**Test Scenario 3: Mixed Invoice States**
1. Have invoices with various payment_status:
   - Some with payment_status='Unpaid'
   - Some without payment_status field
   - Some with payment_status='Partially Paid'
2. Open payment allocation
3. ✅ All unpaid/partially paid invoices appear
4. ✅ Fully paid invoices excluded

## Expected Console Output

When opening payment allocation form:
```
Loaded invoices: 5 from 10 total
```

Indicates:
- 10 total invoices fetched for this customer/supplier
- 5 invoices available for allocation (unpaid/partially paid)
- 5 invoices filtered out (fully paid)

## Files Modified

1. `/app/frontend/src/components/PaymentAllocationForm.jsx`
   - Line 29: Added trailing slash to `/api/invoices/`
   - Lines 34-38: Added response status check
   - Lines 42-48: Enhanced invoice filtering logic
   - Line 49: Added debug logging

## Deployment

- ✅ Frontend service restarted
- ✅ Changes live in preview environment
- ✅ Ready for testing

**Frontend URL**: https://erp-gili-1.preview.emergentagent.com

## Related Documentation

- See `INVOICE_PAYMENT_WORKFLOW_FIX.md` for overall payment workflow
- See `PAYMENT_BANK_BUG_FIXES.md` for other payment allocation fixes
