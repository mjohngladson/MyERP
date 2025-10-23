#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     - agent: "main"
##       message: "USER REQUEST: Comprehensive P&L statement verification. TASK: Clean database and create fresh test dataset. Test comprehensive scenarios: (1) Net Purchases = Purchases - Purchase Returns (2) Sales Returns showing as POSITIVE values (3) Tax accounts (Input Tax Credit, Output Tax Payable) excluded from P&L (4) Mix of Sales Invoices, Purchase Invoices, Credit Notes, Debit Notes with various amounts and tax rates (5) Date range filtering. Expected P&L Structure: Revenue (Sales Revenue, -Sales Returns, =Net Sales), COGS (Purchases, -Purchase Returns, =Net Purchases), Gross Profit = Net Sales - Net Purchases, Operating Expenses, Net Profit, Profit Margin. All calculations must be mathematically correct per accounting principles. This is FINAL verification before production approval."

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#===================================================================================================

#===================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#===================================================================================================

user_problem_statement: "Fix two critical issues: (1) Prevent DN creation when amount exceeds PI (even in draft), (2) Restrict line item quantities to integers only"

backend:
  - task: "Debit Note Over-Credit Prevention - Draft + Submitted"
    implemented: true
    working: true
    file: "backend/routers/debit_notes.py"
    stuck_count: 0
    priority: "critical"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "USER REPORTED ISSUE 1: When DN amount exceeds Purchase Invoice amount, alert shows but DN is still created in draft status. Expected: DN should NOT be created at all (even in draft). ROOT CAUSE: The over-credit validation in cn_dn_enhanced_helpers.py (lines 298-310) was only executed when status='submitted' (via create_debit_note_accounting_entries). Draft DNs bypassed this validation entirely. FIX IMPLEMENTED: (1) Moved over-credit validation from helper to create_debit_note endpoint (debit_notes.py lines 230-244). (2) Validation now runs BEFORE DN document is created in database, for both draft and submitted status. (3) Raises HTTPException 400 with clear error message: 'Debit Note creation rejected: Amount (₹X) exceeds available balance. Invoice original total: ₹Y, Already debited: ₹Z, Available for debit: ₹W. Cannot create Debit Note (even in draft) that exceeds invoice amount.' (4) Same fix applied to Credit Notes (credit_notes.py lines 235-248). EXPECTED: Creating DN with amount > available PI balance should fail with HTTP 400 error, no DN created in database."
        - working: false
          agent: "testing"
          comment: "TESTING RESULTS (13 sub-tests): ✅ PASSED 6/7 core tests, ❌ FAILED 1/7 cumulative tracking test. PASSED TESTS: (1) PI Creation ₹118 - SUCCESS. (2) Reject DN Draft ₹177 > ₹118 - CORRECTLY REJECTED with error 'Debit Note creation rejected: Amount (₹177.00) exceeds available balance'. (3) Verify NO DN created in DB - CONFIRMED 0 DNs. (4) Reject DN Submitted ₹177 > ₹118 - CORRECTLY REJECTED. (5) Create Valid DN ₹59 - SUCCESS. (6) Verify 1 DN created - CONFIRMED. FAILED TEST: (7) Reject Second DN ₹118 when only ₹59 remaining - INCORRECTLY ALLOWED, second DN was created with HTTP 200. ROOT CAUSE: Cumulative DN tracking NOT working. The validation at debit_notes.py lines 240-258 checks invoice.get('total_debit_notes_amount', 0) but this field is ONLY updated when DN status='submitted' (via adjust_invoice_for_debit_note helper in cn_dn_enhanced_helpers.py line 465). Draft DNs are NOT tracked in this field. REQUIRED FIX: Instead of relying on 'total_debit_notes_amount' field, the validation should query debit_notes_collection to calculate total amount of ALL DNs (both draft and submitted) linked to this PI: existing_dns = await debit_notes_collection.find({'reference_invoice_id': reference_invoice_id}).to_list(length=1000); existing_dn_amount = sum(float(dn.get('total_amount', 0)) for dn in existing_dns). SEVERITY: HIGH - Multiple draft DNs can exceed PI amount."
        - working: true
          agent: "testing"
          comment: "RE-TESTING AFTER FIX (10 comprehensive tests): ✅ ALL TESTS PASSED 100%. SINGLE DN VALIDATION TESTS: (1) Create PI ₹118 - SUCCESS. (2) Attempt DN ₹177 > PI ₹118 with status='draft' - CORRECTLY REJECTED HTTP 400 with error 'Debit Note creation rejected: Amount (₹177.00) exceeds available balance. Invoice original total: ₹118.00, Already debited: ₹0.00, Available for debit: ₹118.00'. (3) Verify NO DN created in database - CONFIRMED 0 DNs linked to test PI. CUMULATIVE DN TRACKING TESTS: (4) Create first DN ₹59 (draft) - SUCCESS, remaining balance ₹59. (5) Attempt second DN ₹118 (would total ₹177 > PI ₹118) - CORRECTLY REJECTED HTTP 400 with error 'Already debited: ₹59.00, Available for debit: ₹59.00'. (6) Verify only 1 DN in database - CONFIRMED. (7) Create valid second DN ₹59 (totals exactly ₹118) - SUCCESS. (8) Verify 2 DNs in database totaling ₹118 - CONFIRMED. FIX VERIFICATION: The fix at debit_notes.py lines 248-253 correctly queries debit_notes_collection to calculate cumulative DN amount from ALL DNs (both draft and submitted): 'existing_dns = await debit_notes_collection.find({\"reference_invoice_id\": reference_invoice_id}).to_list(length=1000); existing_dn_amount = sum(float(dn.get(\"total_amount\", 0)) for dn in existing_dns)'. This replaces the previous broken approach that relied on invoice.get('total_debit_notes_amount') field. VALIDATION: (1) Single DN validation working perfectly. (2) Cumulative DN tracking working perfectly. (3) Error messages clear and include cumulative amounts. (4) No DNs created in database when validation fails. (5) Valid DNs within remaining balance are accepted. FIX IS PRODUCTION-READY AND WORKING 100% AS EXPECTED."
  
  - task: "Line Item Quantity Integer Validation"
    implemented: true
    working: true
    file: "backend/routers/debit_notes.py, credit_notes.py, invoices.py, purchase_invoices.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "USER REPORTED ISSUE 2: Line item quantities should not allow decimal/float values, only integers. FIX IMPLEMENTED: Added quantity validation in all transaction endpoints: (1) Debit Notes (debit_notes.py lines 222-228). (2) Credit Notes (credit_notes.py lines 221-227). (3) Sales Invoices (invoices.py lines 176-182). (4) Purchase Invoices (purchase_invoices.py lines 153-159). Validation logic: For each line item, check if quantity is integer or (if float) whether it represents whole number using is_integer(). If decimal detected, raise HTTPException 400: 'Line item X: Quantity must be a whole number (integer), not decimal. Received: Y'. Validation runs BEFORE any calculations or database insertion. EXPECTED: Creating any transaction with decimal quantity (e.g., 1.5, 2.3) should fail with HTTP 400 error."
        - working: true
          agent: "testing"
          comment: "TESTING RESULTS: ✅ ALL 7 TESTS PASSED PERFECTLY. (1) SI with qty=1.5 - CORRECTLY REJECTED with error 'Line item 1: Quantity must be a whole number (integer), not decimal. Received: 1.5'. (2) Verified NO SI created in DB - CONFIRMED 0 SIs. (3) PI with qty=2.3 - CORRECTLY REJECTED with error 'Received: 2.3'. (4) CN with qty=0.5 - CORRECTLY REJECTED with error 'Received: 0.5'. (5) DN with qty=3.7 - CORRECTLY REJECTED with error 'Received: 3.7'. (6) SI with qty=5 (integer) - CORRECTLY ACCEPTED, created INV-20251022-0001. (7) Verified 1 SI created in DB - CONFIRMED. VALIDATION: All transaction types (SI, PI, CN, DN) correctly reject decimal quantities and accept integer quantities. Error messages are clear and helpful. No invalid documents created in database. FIX IS WORKING 100% AS EXPECTED."

frontend: []

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Debit Note Over-Credit Prevention - Draft + Submitted"
  stuck_tasks:
    - "Debit Note Over-Credit Prevention - Draft + Submitted"
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "USER REQUESTS: (1) Prevent DN creation when amount exceeds PI (even in draft status). (2) Restrict line item quantities to integers only. TASKS FOR TESTING: SCENARIO 1 - DN Over-Credit Prevention: (1) Create Purchase Invoice: ₹100 + 18% tax = ₹118. (2) Attempt to create Debit Note: ₹150 (exceeds PI) with status='draft' → Should FAIL with HTTP 400 error, no DN created. (3) Attempt to create DN: ₹150 with status='submitted' → Should FAIL with HTTP 400 error, no DN created. (4) Create valid DN: ₹50 + tax = ₹59 (within PI balance) with status='draft' → Should SUCCEED. (5) Attempt to create another DN: ₹100 (would exceed remaining balance ₹59) → Should FAIL. SCENARIO 2 - Quantity Integer Validation: (1) Attempt to create Sales Invoice with item quantity=1.5 → Should FAIL with HTTP 400 error. (2) Attempt to create Purchase Invoice with item quantity=2.3 → Should FAIL. (3) Attempt to create Credit Note with quantity=0.5 → Should FAIL. (4) Attempt to create Debit Note with quantity=3.7 → Should FAIL. (5) Create Sales Invoice with quantity=5 (integer) → Should SUCCEED. CRITICAL: Verify no documents are created in database when validation fails. Verify error messages are clear and helpful."
    - agent: "testing"
      message: "COMPREHENSIVE TESTING COMPLETED (14 sub-tests across 2 critical fixes). RESULTS: ✅ FIX 2 (Quantity Integer Validation) - WORKING 100% PERFECTLY (7/7 tests passed). ❌ FIX 1 (DN Over-Credit Prevention) - PARTIALLY WORKING (6/7 tests passed, 1 CRITICAL FAILURE). DETAILED FINDINGS: **FIX 2 - Quantity Integer Validation**: All transaction types (SI, PI, CN, DN) correctly reject decimal quantities (1.5, 2.3, 0.5, 3.7) with clear error messages. Integer quantities accepted. No invalid documents created. THIS FIX IS PRODUCTION-READY. **FIX 1 - DN Over-Credit Prevention**: Single DN validation works perfectly (prevents DN ₹177 when PI is ₹118). HOWEVER, cumulative DN tracking FAILS - second DN ₹118 was created when only ₹59 remaining (after first DN ₹59). ROOT CAUSE: debit_notes.py line 246 checks invoice.get('total_debit_notes_amount', 0) but this field is ONLY updated for submitted DNs (via adjust_invoice_for_debit_note helper). Draft DNs are NOT tracked. REQUIRED FIX: Query debit_notes_collection to calculate total of ALL DNs (draft + submitted) instead of relying on invoice field. CODE CHANGE NEEDED in debit_notes.py lines 240-258: Replace 'existing_dn_amount = float(invoice.get(\"total_debit_notes_amount\", 0))' with 'existing_dns = await debit_notes_collection.find({\"reference_invoice_id\": reference_invoice_id}).to_list(length=1000); existing_dn_amount = sum(float(dn.get(\"total_amount\", 0)) for dn in existing_dns)'. SEVERITY: HIGH - Multiple draft DNs can exceed PI amount. SAME FIX NEEDED for credit_notes.py lines 242-260."
