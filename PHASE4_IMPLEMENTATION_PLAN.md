# Phase 4: Vouchers & General Ledger - Implementation Plan

**Start Date:** October 21, 2025  
**Estimated Duration:** 4 weeks (Fast-tracked to 2 weeks with AI assistance)  
**Priority:** 🔴 CRITICAL - Core Accounting Functionality

---

## 🎯 Objective

Build a **complete double-entry accounting system** with:
- Journal/Payment/Receipt vouchers
- Posting mechanism to General Ledger
- Real-time balance calculation
- Trial Balance & GL Reports

---

## 📊 Current State Analysis

### ✅ What We Have
- **Database Schema:** `voucher_master` and `voucher_detail` tables (excellent design)
- **Chart of Accounts:** Fully functional with hierarchical structure
- **Authentication:** JWT + RBAC working
- **Frontend:** React + TypeScript + Shadcn/ui ready

### ❌ What's Missing (CRITICAL)
- **No way to record transactions** - Can't create journal entries
- **No General Ledger** - Can't view account movements
- **No posting mechanism** - Vouchers don't update account balances
- **No Trial Balance** - Can't verify books balance
- **No financial reports** - Can't generate P&L or Balance Sheet

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCOUNTING SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Creates Voucher                                        │
│         ↓                                                    │
│  VoucherMaster (Header)                                      │
│         ├─→ VoucherDetail (DR lines)                         │
│         └─→ VoucherDetail (CR lines)                         │
│         ↓                                                    │
│  Validation: Total DR = Total CR                             │
│         ↓                                                    │
│  Save as Draft (is_posted = FALSE)                           │
│         ↓                                                    │
│  Approval/Posting (is_posted = TRUE)                         │
│         ↓                                                    │
│  Update Account Balances (via query/materialized view)       │
│         ↓                                                    │
│  General Ledger Reports                                      │
│         ├─→ Account Ledger (all transactions)                │
│         ├─→ Trial Balance (all accounts)                     │
│         ├─→ P&L Statement                                    │
│         └─→ Balance Sheet                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Tasks

### **Task 1: Backend - Voucher Module Setup**
**Duration:** 2 hours

- [ ] Create `VouchersModule`
- [ ] Create enums for voucher types
- [ ] Create Voucher entities (TypeORM)
  - `VoucherMaster` entity
  - `VoucherDetail` entity
- [ ] Create DTOs
  - `CreateVoucherDto`
  - `UpdateVoucherDto`
  - `VoucherLineItemDto`
  - `PostVoucherDto`
- [ ] Set up module dependencies

---

### **Task 2: Backend - Voucher Service (Core Logic)**
**Duration:** 6 hours

**2.1 CRUD Operations:**
- [ ] `create(createVoucherDto)` - Create draft voucher
- [ ] `findAll(filters)` - List vouchers with pagination/filters
- [ ] `findOne(id)` - Get single voucher with details
- [ ] `update(id, updateVoucherDto)` - Update draft voucher
- [ ] `remove(id)` - Soft delete voucher (only drafts)

**2.2 Validation Logic:**
- [ ] Validate debit = credit before save
- [ ] Validate all accounts exist
- [ ] Validate voucher date (not too far back)
- [ ] Validate at least one DR and one CR line
- [ ] Validate amounts > 0

**2.3 Voucher Number Generation:**
```typescript
Format: {TYPE}-{YEAR}-{SEQUENCE}
Examples:
  - JV-2025-0001 (Journal Voucher)
  - PV-2025-0001 (Payment Voucher)
  - RV-2025-0001 (Receipt Voucher)
```
- [ ] Implement auto-increment logic per type per year
- [ ] Handle concurrent requests (database-level locking)

**2.4 Posting Mechanism:**
- [ ] `postVoucher(id)` - Mark as posted (is_posted = TRUE)
- [ ] Set `posted_at` timestamp
- [ ] Set `posted_by` user
- [ ] Prevent editing after posting

**2.5 Unposting (Admin Only):**
- [ ] `unpostVoucher(id)` - Revert to draft
- [ ] Permission check: only admins can unpost
- [ ] Add audit log entry

---

### **Task 3: Backend - General Ledger Service**
**Duration:** 4 hours

**3.1 Account Balance Calculation:**
```sql
-- Calculate current balance for an account
SELECT 
  a.code,
  a.name,
  a.opening_balance,
  COALESCE(SUM(vd.debit_amount), 0) as total_debits,
  COALESCE(SUM(vd.credit_amount), 0) as total_credits,
  CASE 
    WHEN a.nature = 'DEBIT' THEN 
      a.opening_balance + SUM(vd.debit_amount) - SUM(vd.credit_amount)
    ELSE 
      a.opening_balance + SUM(vd.credit_amount) - SUM(vd.debit_amount)
  END as current_balance
FROM accounts a
LEFT JOIN voucher_detail vd ON vd.account_code = a.code
LEFT JOIN voucher_master vm ON vm.id = vd.voucher_id AND vm.is_posted = TRUE
WHERE a.code = '1-0001-0001-0001'
GROUP BY a.id, a.code, a.name, a.opening_balance, a.nature;
```

- [ ] Implement `getAccountBalance(accountCode, asOfDate?)`
- [ ] Implement `getAccountLedger(accountCode, dateRange)`
- [ ] Implement `getTrialBalance(asOfDate?)`
- [ ] Add caching for performance

**3.2 Trial Balance:**
- [ ] Get all accounts with balances
- [ ] Calculate DR and CR totals
- [ ] Verify: Total DR = Total CR
- [ ] Return as structured data

**3.3 Account Ledger:**
- [ ] Get all transactions for an account
- [ ] Include opening balance
- [ ] Show running balance
- [ ] Filter by date range
- [ ] Sort by date ascending

---

### **Task 4: Backend - Controllers & API Endpoints**
**Duration:** 3 hours

**Vouchers Controller:**
```typescript
POST   /vouchers                  // Create voucher
GET    /vouchers                  // List all (with filters)
GET    /vouchers/:id              // Get single voucher
PATCH  /vouchers/:id              // Update voucher (draft only)
DELETE /vouchers/:id              // Delete voucher (draft only)
POST   /vouchers/:id/post         // Post voucher
POST   /vouchers/:id/unpost       // Unpost voucher (admin only)
GET    /vouchers/next-number/:type // Get next voucher number
```

**General Ledger Controller:**
```typescript
GET    /general-ledger/account/:code        // Account ledger
GET    /general-ledger/trial-balance        // Trial balance
GET    /general-ledger/account-balance/:code // Current balance
```

- [ ] Add Swagger documentation
- [ ] Add permission guards
- [ ] Add request validation
- [ ] Add error handling

---

### **Task 5: Frontend - Voucher Types & Models**
**Duration:** 1 hour

- [ ] Create TypeScript types
- [ ] Create enums (VoucherType, PaymentMode)
- [ ] Create interfaces (Voucher, VoucherDetail)
- [ ] Create API service methods

---

### **Task 6: Frontend - Journal Voucher Form**
**Duration:** 8 hours

**Features:**
- [ ] Header section:
  - Voucher type selector
  - Voucher date picker
  - Description/narration
- [ ] Line items section:
  - Dynamic add/remove rows
  - Account selector (autocomplete)
  - Debit/Credit amount inputs
  - Line description
- [ ] Real-time validation:
  - Show total DR and CR
  - Show difference (DR - CR)
  - Visual indicator (green=balanced, red=unbalanced)
  - Disable save if unbalanced
- [ ] Actions:
  - Save as draft
  - Post voucher
  - Cancel/Reset

**UI/UX Requirements:**
- Clean, professional accounting interface
- Keyboard shortcuts (Tab, Enter for navigation)
- Copy previous line (for efficiency)
- Auto-focus on account field when adding line
- Confirm before deleting lines
- Show validation errors inline

---

### **Task 7: Frontend - Payment Voucher Form**
**Duration:** 4 hours

**Simplified Interface:**
- [ ] Pay From account (single select - Cash/Bank)
- [ ] Payment mode (Cash, Cheque, Online)
- [ ] Cheque details (if applicable)
- [ ] Pay To section:
  - Multiple expense/payable accounts
  - Amounts (DR side)
- [ ] Auto-balance: CR side = sum of DR amounts
- [ ] Save & Post

**Business Logic:**
```
Payment Voucher Structure:
DR: Expense/Payable accounts (multiple lines)
CR: Cash/Bank account (auto-calculated, single line)
```

---

### **Task 8: Frontend - Receipt Voucher Form**
**Duration:** 4 hours

**Similar to Payment, but reversed:**
- [ ] Receive Into account (single select - Cash/Bank)
- [ ] Receive From section:
  - Multiple customer/revenue accounts
  - Amounts (CR side)
- [ ] Auto-balance: DR side = sum of CR amounts

**Business Logic:**
```
Receipt Voucher Structure:
DR: Cash/Bank account (auto-calculated, single line)
CR: Customer/Revenue accounts (multiple lines)
```

---

### **Task 9: Frontend - Voucher List Page**
**Duration:** 4 hours

**Features:**
- [ ] Data table with columns:
  - Voucher Number
  - Type
  - Date
  - Description
  - Total Amount
  - Status (Draft/Posted)
  - Actions (View, Edit, Delete, Post)
- [ ] Filters:
  - Voucher type
  - Date range
  - Posted status
  - Search by number/description
- [ ] Pagination
- [ ] Sorting
- [ ] Bulk actions (if needed)

---

### **Task 10: Frontend - General Ledger Pages**
**Duration:** 6 hours

**10.1 Account Ledger:**
- [ ] Account selector
- [ ] Date range picker
- [ ] Transactions table:
  - Date
  - Voucher Number (clickable)
  - Description
  - Debit
  - Credit
  - Balance (running)
- [ ] Opening balance row
- [ ] Closing balance summary
- [ ] Export to Excel/PDF

**10.2 Trial Balance:**
- [ ] As of date selector
- [ ] Accounts table:
  - Account Code
  - Account Name
  - Debit Balance
  - Credit Balance
- [ ] Totals row
- [ ] Verify: Total DR = Total CR
- [ ] Visual indicator if unbalanced
- [ ] Export functionality
- [ ] Drill-down to account ledger

---

### **Task 11: Testing & Validation**
**Duration:** 4 hours

**Test Cases:**
1. **Create Journal Voucher:**
   - [ ] Create balanced voucher (DR = CR)
   - [ ] Verify cannot save unbalanced voucher
   - [ ] Verify voucher number auto-generation

2. **Post Voucher:**
   - [ ] Post voucher
   - [ ] Verify is_posted = TRUE
   - [ ] Verify cannot edit after posting
   - [ ] Verify balances updated

3. **Unpost Voucher:**
   - [ ] Admin can unpost
   - [ ] Non-admin cannot unpost
   - [ ] Verify balances reverted

4. **General Ledger:**
   - [ ] Account ledger shows all transactions
   - [ ] Running balance calculated correctly
   - [ ] Trial balance DR = CR

5. **Payment/Receipt Vouchers:**
   - [ ] Auto-balancing works
   - [ ] Posting updates correct accounts

---

## 📊 Database Considerations

### **Existing Schema (Good!):**
```sql
voucher_master:
  - id (UUID)
  - voucher_number (auto-generated)
  - voucher_type (ENUM: JV, PV, RV, etc.)
  - voucher_date
  - description
  - total_amount
  - is_posted (BOOLEAN)
  - posted_at, posted_by
  
voucher_detail:
  - id (UUID)
  - voucher_id (FK)
  - account_code (FK to accounts)
  - debit_amount
  - credit_amount
  - description
  - line_number
```

### **Indexes to Add (Performance):**
```sql
CREATE INDEX idx_voucher_detail_account_posted 
  ON voucher_detail(account_code) 
  WHERE voucher_id IN (
    SELECT id FROM voucher_master WHERE is_posted = TRUE
  );

CREATE INDEX idx_voucher_master_posted_date 
  ON voucher_master(voucher_date, is_posted);
```

---

## 🔒 Security & Permissions

**Required Permissions:**
- `vouchers.create` - Create vouchers
- `vouchers.read` - View vouchers
- `vouchers.update` - Edit draft vouchers
- `vouchers.delete` - Delete draft vouchers
- `vouchers.post` - Post vouchers
- `vouchers.unpost` - Unpost vouchers (admin only)
- `general-ledger.read` - View GL reports

---

## 🎨 UI/UX Considerations

### **Journal Voucher Form:**
```
┌─────────────────────────────────────────────────┐
│  Create Journal Voucher                         │
├─────────────────────────────────────────────────┤
│  Voucher Type: [JV ▼]  Date: [2025-10-21]      │
│  Description: Opening balances for Inventory    │
├─────────────────────────────────────────────────┤
│  Line Items:                                    │
│  ┌───┬────────────┬────────────┬───────┬───────┐│
│  │ # │ Account    │ Description│ Debit │ Credit││
│  ├───┼────────────┼────────────┼───────┼───────┤│
│  │ 1 │ Inventory  │ Opening bal│ 1000  │   0   ││
│  │ 2 │ Owner Cap  │ Opening bal│   0   │ 1000  ││
│  └───┴────────────┴────────────┴───────┴───────┘│
│  [+ Add Line]                                    │
├─────────────────────────────────────────────────┤
│  Total DR: 1000.00  Total CR: 1000.00  ✅       │
│  Difference: 0.00                                │
├─────────────────────────────────────────────────┤
│  [Save Draft] [Post Voucher] [Cancel]           │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Critical Business Rules

1. **Double-Entry Principle:**
   - Every transaction must have equal debits and credits
   - System must not allow saving unbalanced vouchers

2. **Posting is Final:**
   - Once posted, voucher is immutable
   - Only admins can unpost (for corrections)

3. **Voucher Numbers:**
   - Must be unique and sequential
   - Cannot be edited after creation
   - Format: TYPE-YEAR-SEQUENCE

4. **Account Validation:**
   - All accounts in voucher must exist
   - Only DETAIL accounts can be used in vouchers (not CONTROL/SUB_CONTROL)

5. **Date Validation:**
   - Voucher date cannot be in the future
   - Cannot be too far in the past (configurable limit)

---

## 📈 Performance Optimization

1. **Balance Calculation:**
   - Consider materialized view for frequently accessed balances
   - Cache trial balance (refresh on voucher post/unpost)

2. **Account Ledger:**
   - Paginate large ledgers
   - Index on (account_code, voucher_date)

3. **Database Queries:**
   - Use CTEs for complex balance calculations
   - Avoid N+1 queries (use proper joins)

---

## 🚀 Implementation Sequence

**Week 1 (Days 1-7):**
- Day 1-2: Backend voucher module (Tasks 1-2)
- Day 3-4: Backend GL service (Task 3)
- Day 5: Backend controllers (Task 4)
- Day 6-7: Frontend types & Journal Voucher form (Tasks 5-6)

**Week 2 (Days 8-14):**
- Day 8-9: Payment & Receipt vouchers (Tasks 7-8)
- Day 10-11: Voucher list & GL pages (Tasks 9-10)
- Day 12-13: Testing & bug fixes (Task 11)
- Day 14: Documentation & deployment

---

## ✅ Definition of Done

Phase 4 is complete when:
- [ ] User can create, edit, delete draft vouchers
- [ ] User can post vouchers (marks as final)
- [ ] Posted vouchers update account balances
- [ ] Trial balance shows all accounts with balances
- [ ] Trial balance DR total = CR total
- [ ] Account ledger shows all transactions with running balance
- [ ] Payment/Receipt vouchers have simplified UI
- [ ] All tests pass
- [ ] API documentation complete
- [ ] End-to-end testing completed

---

## 📝 Success Metrics

- **Functional:**
  - Can record opening balances for all accounts
  - Trial balance balances correctly
  - Can generate account ledgers
  - Payment/Receipt vouchers work correctly

- **Technical:**
  - API response time < 200ms for voucher CRUD
  - Trial balance generation < 1s for 1000 accounts
  - Account ledger loads < 500ms for 10,000 transactions

- **User Experience:**
  - Voucher form is intuitive
  - Real-time validation prevents errors
  - Clear visual feedback on balance status

---

**Ready to implement?** Let's start with Task 1: Backend Voucher Module Setup.

