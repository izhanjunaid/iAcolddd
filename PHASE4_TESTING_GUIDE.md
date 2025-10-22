# Phase 4: End-to-End Testing Guide 🧪

**Date:** October 21, 2025  
**Status:** Ready for User Testing  
**Estimated Time:** 15-20 minutes

---

## 🎯 **Testing Objective**

Verify that the complete accounting system works end-to-end:
1. Create a journal voucher with double-entry validation
2. Post the voucher to the general ledger
3. Verify trial balance is balanced
4. View account ledger with running balance

---

## ⚙️ **Pre-Testing Setup**

### **Step 1: Restart Backend Server**
```bash
# Stop the current backend server (Ctrl+C)
# Then restart:
cd backend
npm run start:dev
```

**Expected Output:**
```
[Nest] Starting Nest application...
[Nest] VouchersModule dependencies initialized
[Nest] GeneralLedgerModule dependencies initialized
[Nest] Nest application successfully started
```

**⚠️ Important:** Backend MUST be restarted to load the new modules!

### **Step 2: Verify Frontend is Running**
```bash
cd frontend
npm run dev
```

**Expected:** Frontend running on `http://localhost:5173`

### **Step 3: Verify Database has Seed Data**
```bash
cd backend
npm run seed          # Creates admin user
npm run seed:accounts # Creates 19 accounts
```

---

## 🧪 **Test Workflow**

### **Test 1: Login**
1. Navigate to `http://localhost:5173`
2. Login with admin credentials:
   - Username: `admin`
   - Password: `Admin@123`

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ Dashboard shows 4 modules (Chart of Accounts, Vouchers, Trial Balance, Reports)

---

### **Test 2: Verify Chart of Accounts**
1. Click "Chart of Accounts" from dashboard
2. Verify 19 accounts are listed
3. Check for these key accounts:
   - `1-0001-0001-0001` - Cash
   - `3-0001-0001` - Owner's Equity/Capital

**Expected Result:**
- ✅ 19 accounts visible
- ✅ All accounts show opening balance of 0.00
- ✅ Tree view shows hierarchical structure

---

### **Test 3: Create Journal Voucher (Recording Opening Balances)**

**Scenario:** Record opening cash balance funded by owner's equity

1. Click "Vouchers" from navigation
2. Click "New Journal Voucher" button
3. Fill in voucher details:
   - **Voucher Date:** Today's date (default)
   - **Description:** "Opening balance - Initial capital contribution"

4. **Line Item 1 (Debit):**
   - Account: `1-0001-0001-0001 - Cash`
   - Description: "Initial cash"
   - Debit: `50000.00`
   - Credit: `0`

5. **Line Item 2 (Credit):**
   - Account: `3-0001-0001 - Owner's Equity`
   - Description: "Owner's capital contribution"
   - Debit: `0`
   - Credit: `50000.00`

**Expected Results:**
- ✅ Voucher number shows as "Next: JV-2025-0001"
- ✅ Total Debits: 50000.00
- ✅ Total Credits: 50000.00
- ✅ Balance indicator shows GREEN with "Voucher is Balanced ✓"
- ✅ Difference: 0.00
- ✅ "Save & Post" button is enabled

**Test Validation:**
- Try changing debit to 49000
- Balance indicator should turn RED
- Error: "Out of Balance"
- Difference: 1000.00
- "Save & Post" button should be disabled
- **Change it back to 50000**

---

### **Test 4: Post the Voucher**
1. Click "Save & Post" button
2. Wait for confirmation

**Expected Results:**
- ✅ Voucher created successfully
- ✅ Redirected to voucher list page
- ✅ Success message shown
- ✅ New voucher appears in list with number JV-2025-0001
- ✅ Status shows "Posted" (green badge)
- ✅ Amount shows 50000.00

---

### **Test 5: Verify Trial Balance**

1. Click "Trial Balance" from navigation
2. Review the report

**Expected Results:**
- ✅ Balance status shows GREEN: "Books are Balanced ✓"
- ✅ Total DR = Total CR indicator shows the same value
- ✅ Cash account shows:
  - Debit Balance: 50000.00
  - Credit Balance: 0 (or -)
- ✅ Owner's Equity shows:
  - Debit Balance: 0 (or -)
  - Credit Balance: 50000.00
- ✅ Total Debits: 50000.00
- ✅ Total Credits: 50000.00
- ✅ Difference: 0.00

**Category Summaries (at bottom):**
- ✅ ASSET: 50000.00 (1 account)
- ✅ EQUITY: 50000.00 (1 account)
- ✅ All other categories: 0.00

---

### **Test 6: View Cash Account Ledger**

1. From Trial Balance, click on the "Cash" account row
2. Review the ledger

**Expected Results:**
- ✅ Account Info shows:
  - Account: `1-0001-0001-0001 - Cash`
  - Opening Balance: 0.00 DR
  - Closing Balance: 50000.00 DR
  - Transactions: 1

- ✅ Transactions table shows:
  - **Opening Balance Row:** Balance 0.00
  - **Transaction Row:**
    - Date: Today
    - Voucher: JV-2025-0001 (clickable)
    - Type: JOURNAL
    - Description: "Initial cash"
    - Debit: 50000.00
    - Credit: - (or 0.00)
    - Balance: 50000.00 DR
  - **Closing Balance Row:** 50000.00 DR

**Running Balance Check:**
- Opening: 0.00
- After transaction: 0 + 50000 (DR) = 50000 DR ✓

---

### **Test 7: View Owner's Equity Ledger**

1. Navigate back to Trial Balance
2. Click on "Owner's Equity" account
3. Review the ledger

**Expected Results:**
- ✅ Account: `3-0001-0001 - Owner's Equity`
- ✅ Opening Balance: 0.00 CR
- ✅ Transaction shows:
  - Debit: - (or 0.00)
  - Credit: 50000.00
  - Balance: 50000.00 CR
- ✅ Closing Balance: 50000.00 CR

---

### **Test 8: Create Additional Voucher (Expense)**

**Scenario:** Record an expense (Rent payment)

1. Navigate to Vouchers → New Journal Voucher
2. Fill in:
   - **Description:** "Monthly rent payment"

3. **Line Item 1 (Debit - Expense):**
   - Account: `5-0001-0001-0001 - Rent Expense`
   - Description: "Office rent for Oct 2025"
   - Debit: `5000.00`
   - Credit: `0`

4. **Line Item 2 (Credit - Cash):**
   - Account: `1-0001-0001-0001 - Cash`
   - Description: "Rent payment"
   - Debit: `0`
   - Credit: `5000.00`

5. Click "Save & Post"

**Expected Results:**
- ✅ Voucher number: JV-2025-0002
- ✅ Voucher posted successfully
- ✅ Appears in voucher list

---

### **Test 9: Verify Updated Trial Balance**

1. Navigate to Trial Balance
2. Review updated balances

**Expected Results:**
- ✅ Still balanced (green)
- ✅ Cash account:
  - Debit Balance: 45000.00 (50000 - 5000)
  - Credit Balance: -
- ✅ Owner's Equity:
  - Debit Balance: -
  - Credit Balance: 50000.00 (unchanged)
- ✅ Rent Expense:
  - Debit Balance: 5000.00
  - Credit Balance: -
- ✅ Total Debits: 50000.00 (45000 + 5000)
- ✅ Total Credits: 50000.00
- ✅ Balanced ✓

---

### **Test 10: Verify Updated Cash Ledger**

1. Click on Cash account from Trial Balance
2. Review transactions

**Expected Results:**
- ✅ 2 transactions now
- ✅ Transaction 1 (Opening):
  - DR 50000.00, Balance: 50000.00 DR
- ✅ Transaction 2 (Rent):
  - CR 5000.00, Balance: 45000.00 DR
- ✅ Closing Balance: 45000.00 DR
- ✅ Running balance calculated correctly

**Running Balance Check:**
- Opening: 0.00
- After deposit: 0 + 50000 = 50000 DR
- After expense: 50000 - 5000 = 45000 DR ✓

---

### **Test 11: Attempt to Edit Posted Voucher**

1. Navigate to Vouchers list
2. Try to click Edit on a posted voucher

**Expected Results:**
- ✅ No edit button visible for posted vouchers
- ✅ Only View button available
- ✅ Delete button not visible for posted vouchers
- ✅ Post button not visible (already posted)

**Verification:** Posted vouchers are immutable ✓

---

### **Test 12: Export Trial Balance**

1. Navigate to Trial Balance
2. Click "Export CSV" button
3. Open downloaded file

**Expected Results:**
- ✅ CSV file downloads with name `trial-balance-{date}.csv`
- ✅ File contains all accounts with balances
- ✅ File includes totals row
- ✅ Data matches what's shown on screen

---

## ✅ **Test Completion Checklist**

Mark each test as you complete it:

- [ ] Test 1: Login successful
- [ ] Test 2: Chart of Accounts verified (19 accounts)
- [ ] Test 3: Created journal voucher with validation
- [ ] Test 4: Posted voucher successfully
- [ ] Test 5: Trial balance is balanced
- [ ] Test 6: Cash ledger shows transaction
- [ ] Test 7: Owner's Equity ledger shows transaction
- [ ] Test 8: Created second voucher (expense)
- [ ] Test 9: Trial balance updated correctly
- [ ] Test 10: Cash ledger shows both transactions
- [ ] Test 11: Cannot edit posted voucher
- [ ] Test 12: Export to CSV works

---

## 🐛 **Troubleshooting**

### **Issue: "Module not found" error in backend**
**Solution:** Make sure backend was restarted after implementation

### **Issue: Voucher number not showing**
**Solution:** Check backend API is responding at `/vouchers/next-number/JOURNAL`

### **Issue: Accounts not loading**
**Solution:** Run `npm run seed:accounts` to create initial accounts

### **Issue: "401 Unauthorized" on API calls**
**Solution:** 
1. Check you're logged in
2. Verify JWT token in localStorage
3. Restart backend to ensure JwtAuthGuard is loaded

### **Issue: Trial balance not balanced**
**Solution:** This would indicate a bug - please report with:
- Voucher details
- Expected vs actual balances
- Screenshot of trial balance

### **Issue: Running balance calculation wrong**
**Solution:** This would indicate a bug in balance calculation logic - please report

---

## 📊 **Expected Final State**

After completing all tests, your system should have:

**Vouchers:**
- 2 vouchers created and posted
- JV-2025-0001 (Opening balance)
- JV-2025-0002 (Rent expense)

**Trial Balance:**
- Total DR: 50000.00
- Total CR: 50000.00
- Balanced: ✅

**Account Balances:**
- Cash: 45000.00 DR
- Owner's Equity: 50000.00 CR
- Rent Expense: 5000.00 DR

**Ledgers:**
- Cash ledger: 2 transactions
- Owner's Equity ledger: 1 transaction
- Rent Expense ledger: 1 transaction

---

## 🎉 **Success Criteria**

Phase 4 is fully complete when:
- [x] All 12 tests pass
- [x] No errors in console (backend or frontend)
- [x] Trial balance is balanced
- [x] Account ledgers show correct running balances
- [x] Vouchers are immutable after posting
- [x] Real-time validation works
- [x] UI is responsive and professional
- [x] Export functionality works

---

## 📝 **Test Report Template**

After testing, please provide feedback:

```
## Test Results

**Date:** [Date]
**Tester:** [Your Name]
**Environment:** Local Development

### Results:
- Tests Passed: __/12
- Tests Failed: __/12
- Bugs Found: __

### Issues Found:
1. [Description]
2. [Description]

### Performance:
- Page load time: [Fast/Medium/Slow]
- API response time: [Fast/Medium/Slow]
- Overall UX: [Excellent/Good/Fair/Poor]

### Recommendations:
- [Any suggestions]
```

---

## 🚀 **After Testing**

Once all tests pass:
1. Mark Task 15 as complete in `IMPLEMENTATION_CHECKLIST.md`
2. Phase 4 will be 100% complete!
3. Celebrate! 🎉
4. Move to Phase 5 or other priorities

---

**Happy Testing!** 🧪✨

If you encounter any issues, refer to `PHASE4_COMPLETION_SUMMARY.md` for architecture details.

