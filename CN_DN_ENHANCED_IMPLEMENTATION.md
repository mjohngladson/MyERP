# Credit Notes & Debit Notes - Enhanced Implementation

**Date**: Current Session
**Enhancement**: Complete overhaul of CN/DN workflow with invoice linking and balance adjustments

## Requirements Implemented

### ✅ 1. Invoice Selection Optional
- Credit Notes can be created **with or without** linking to an invoice
- Debit Notes can be created **with or without** linking to a purchase invoice
- If not linked: Standalone CN/DN for general returns/adjustments

### ✅ 2. Auto-fetch Customer/Supplier When Invoice Selected
- When `reference_invoice_id` is provided in CREATE request
- Backend automatically fetches and populates:
  - **Credit Note**: customer_id, customer_name, customer_email, customer_phone, customer_address
  - **Debit Note**: supplier_id, supplier_name, supplier_email, supplier_phone, supplier_address
- User doesn't need to manually enter party details if invoice is selected

### ✅ 3. Adjust Invoice Balance and AR/AP if Linked
Two scenarios handled:

**Scenario A: Invoice Not Fully Paid**
- Reduces original invoice `total_amount` by CN/DN amount
- Recalculates invoice `payment_status` based on new total
- Creates adjustment Journal Entry to reduce AR/AP
- Updates invoice with audit trail fields

**Scenario B: Invoice Fully Paid**
- Creates refund payment entry (draft status for processing)
- Creates refund Journal Entry for cash movement
- Tracks refund with proper audit trail

### ✅ 4. Handle Fully Paid Invoices via Refund Workflow

**For Credit Note (Customer Refund)**:
```
1. Customer paid ₹10,000 for invoice
2. Credit Note issued for ₹2,000
3. System creates:
   - Refund Payment Entry: REF-CN-20251018-0001 (₹2,000, Type: Pay, Status: Draft)
   - Refund Journal Entry:
     Debit:  A/R           ₹2,000
     Credit: Cash/Bank     ₹2,000
```

**For Debit Note (Supplier Refund)**:
```
1. Paid supplier ₹8,000 for purchase invoice
2. Debit Note issued for ₹1,500
3. System creates:
   - Refund Receipt Entry: REFR-DN-20251018-0001 (₹1,500, Type: Receive, Status: Draft)
   - Refund Journal Entry:
     Debit:  Cash/Bank     ₹1,500
     Credit: A/P           ₹1,500
```

### ✅ 5. Maintain Audit Trail

**New fields added to CN/DN documents**:
- `standard_journal_entry_id`: ID of standard reversal JE
- `invoice_adjusted`: Boolean flag if invoice was adjusted
- `invoice_adjustment_je_id`: ID of invoice balance adjustment JE
- `refund_issued`: Boolean flag if refund was created
- `refund_payment_id`: ID of refund payment entry

**Existing audit fields**:
- `reference_invoice_id`: Linked invoice ID
- `reference_invoice`: Linked invoice number
- `created_at`, `updated_at`: Timestamps

## Implementation Details

### New File: `cn_dn_enhanced_helpers.py`

**Functions**:
1. `adjust_invoice_for_credit_note()` - Handles sales invoice adjustments
2. `adjust_invoice_for_debit_note()` - Handles purchase invoice adjustments

**Logic**:
- Checks if invoice has payment allocations
- Calculates if invoice is fully paid, partially paid, or unpaid
- Creates appropriate JE and refund entries
- Updates invoice totals and status
- Returns audit trail IDs

### Modified Files

**1. `/app/backend/routers/credit_notes.py`**

**Changes**:
- Lines 39-125: Enhanced `create_credit_note_accounting_entries()`
  - Imports enhanced helper
  - Creates standard reversal JE
  - Calls `adjust_invoice_for_credit_note()` for balance adjustment
  - Updates CN with audit trail
  
- Lines 173-201: Enhanced `create_credit_note()`
  - Auto-populates customer details if invoice selected
  - Moved invoice validation before customer validation
  - Sets customer fields from invoice data

**2. `/app/backend/routers/debit_notes.py`**

**Changes**:
- Lines 36-116: Enhanced `create_debit_note_accounting_entries()`
  - Imports enhanced helper
  - Creates standard reversal JE
  - Calls `adjust_invoice_for_debit_note()` for balance adjustment
  - Updates DN with audit trail

- Lines 164-192: Enhanced `create_debit_note()`
  - Auto-populates supplier details if invoice selected
  - Moved invoice validation before supplier validation
  - Sets supplier fields from invoice data

## Workflow Examples

### Example 1: Credit Note for Unpaid Invoice

**Initial State**:
```
Invoice: SINV-001
  Total: ₹10,000
  Paid: ₹0
  Outstanding: ₹10,000
  Status: Unpaid
```

**Credit Note Created**:
```
CN-20251018-0001
  Amount: ₹2,000
  Linked to: SINV-001
  Status: Submitted
```

**System Actions**:
1. ✅ Standard reversal JE created (Debit: Sales Return ₹2,000, Credit: A/R ₹2,000)
2. ✅ Invoice adjustment JE created (Debit: Sales Return ₹2,000, Credit: A/R ₹2,000)
3. ✅ Invoice updated:
   ```
   Total: ₹8,000 (was ₹10,000)
   Outstanding: ₹8,000
   Status: Unpaid
   credit_note_applied: true
   credit_note_id: [CN ID]
   credit_note_amount: ₹2,000
   ```

### Example 2: Credit Note for Fully Paid Invoice

**Initial State**:
```
Invoice: SINV-002
  Total: ₹5,000
  Paid: ₹5,000 (via payment allocation)
  Outstanding: ₹0
  Status: Paid
```

**Credit Note Created**:
```
CN-20251018-0002
  Amount: ₹1,000
  Linked to: SINV-002
  Status: Submitted
```

**System Actions**:
1. ✅ Standard reversal JE created
2. ✅ Refund Payment Entry created:
   ```
   REF-CN-20251018-0002
   Type: Pay (outgoing)
   Amount: ₹1,000
   Status: Draft
   Description: "Refund for Credit Note CN-20251018-0002"
   ```
3. ✅ Refund JE created:
   ```
   Debit:  A/R        ₹1,000
   Credit: Cash/Bank  ₹1,000
   ```
4. ✅ CN updated with audit trail:
   ```
   standard_journal_entry_id: [JE ID]
   refund_issued: true
   refund_payment_id: [Payment ID]
   ```

### Example 3: Credit Note WITHOUT Invoice Link

**Credit Note Created**:
```
CN-20251018-0003
  Customer: Walk-in Customer
  Amount: ₹500
  Linked to: None
  Reason: Defective product
  Status: Submitted
```

**System Actions**:
1. ✅ Standard reversal JE created (general return)
2. ✅ No invoice adjustment (not linked)
3. ✅ No refund entry (standalone CN)

## Accounting Flow Diagram

### Credit Note on Unpaid Invoice
```
Step 1: Standard Reversal JE
  Dr: Sales Returns     ₹2,000
  Cr: A/R               ₹2,000

Step 2: Invoice Balance Adjustment
  Invoice Total: ₹10,000 → ₹8,000
  Outstanding: ₹10,000 → ₹8,000
  
Step 3: Adjustment JE
  Dr: Sales Returns     ₹2,000
  Cr: A/R               ₹2,000
```

### Credit Note on Paid Invoice
```
Step 1: Standard Reversal JE
  Dr: Sales Returns     ₹1,000
  Cr: A/R               ₹1,000

Step 2: Refund Payment Entry
  REF-CN-xxx: ₹1,000 (Draft)
  
Step 3: Refund JE
  Dr: A/R               ₹1,000
  Cr: Cash/Bank         ₹1,000
```

## Database Schema Updates

### Credit Notes Collection
**New Fields**:
- `standard_journal_entry_id`: String (UUID of standard reversal JE)
- `invoice_adjusted`: Boolean
- `invoice_adjustment_je_id`: String (UUID of adjustment JE)
- `refund_issued`: Boolean
- `refund_payment_id`: String (UUID of refund payment)

### Debit Notes Collection
**New Fields** (same as CN):
- `standard_journal_entry_id`
- `invoice_adjusted`
- `invoice_adjustment_je_id`
- `refund_issued`
- `refund_payment_id`

### Sales/Purchase Invoices
**New Fields** (when CN/DN applied):
- `credit_note_applied`: Boolean
- `credit_note_id`: String
- `credit_note_amount`: Float
- `debit_note_applied`: Boolean
- `debit_note_id`: String
- `debit_note_amount`: Float

## API Endpoints Unchanged

All existing endpoints work the same:
- `POST /api/sales/credit-notes` - Now with auto-population
- `PUT /api/sales/credit-notes/{id}`
- `GET /api/sales/credit-notes`
- `GET /api/sales/credit-notes/{id}`
- `DELETE /api/sales/credit-notes/{id}`

Same for Debit Notes under `/api/buying/debit-notes`

## Testing Scenarios

**Test 1: CN with Invoice Link - Unpaid**
1. Create sales invoice (₹10,000, unpaid)
2. Create credit note linked to invoice (₹2,000)
3. Submit credit note
4. ✅ Verify invoice total reduced to ₹8,000
5. ✅ Verify adjustment JE created
6. ✅ Verify CN has audit trail fields

**Test 2: CN with Invoice Link - Fully Paid**
1. Create sales invoice (₹5,000)
2. Create payment and allocate full amount
3. Create credit note linked to invoice (₹1,000)
4. Submit credit note
5. ✅ Verify refund payment entry created (Draft)
6. ✅ Verify refund JE created
7. ✅ Verify CN marked with `refund_issued: true`

**Test 3: CN WITHOUT Invoice Link**
1. Create credit note (no reference_invoice_id)
2. Manually enter customer details
3. Submit credit note
4. ✅ Verify standard reversal JE created
5. ✅ Verify no adjustment or refund entries
6. ✅ Verify CN has only standard_journal_entry_id

**Test 4: DN with Invoice Link**
1. Create purchase invoice (₹8,000, paid ₹5,000)
2. Create debit note linked to invoice (₹1,500)
3. Submit debit note
4. ✅ Verify invoice total reduced to ₹6,500
5. ✅ Verify invoice status changed to "Paid" (₹5,000 >= ₹6,500 is false, so still partially paid)
6. ✅ Verify adjustment JE created

## Benefits

1. ✅ **Accurate AR/AP Balances**: Invoices reflect true outstanding after CN/DN
2. ✅ **Automatic Refund Workflow**: System creates refund entries for paid invoices
3. ✅ **Complete Audit Trail**: Every adjustment tracked with JE IDs and flags
4. ✅ **Flexible Usage**: Can create CN/DN with or without invoice link
5. ✅ **User Convenience**: Auto-populates party details from invoice
6. ✅ **Payment Allocation Integrity**: Recalculates invoice status based on new totals

## Files Created/Modified

**New Files**:
- `/app/backend/cn_dn_enhanced_helpers.py` - Enhanced adjustment logic

**Modified Files**:
- `/app/backend/routers/credit_notes.py` - Enhanced accounting and auto-population
- `/app/backend/routers/debit_notes.py` - Enhanced accounting and auto-population

## Deployment

- ✅ Backend restarted
- ✅ Changes live in preview environment
- ✅ Ready for testing

**Frontend URL**: https://erp-gili-1.preview.emergentagent.com
