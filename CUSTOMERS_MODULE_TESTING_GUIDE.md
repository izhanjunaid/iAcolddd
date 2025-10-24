# 🧪 Customers Module - Testing Guide

**Module:** Phase 5 (Part 1) - Customers Module  
**Status:** ✅ Implementation Complete - Ready for Testing  
**Date:** October 22, 2025

---

## 📋 **Pre-Testing Setup**

### **Step 1: Run Database Migration**

The migration adds `customer_id` column to the `accounts` table and new enum values.

```bash
cd backend
npm run migration:run
```

**Expected Output:**
```
✅ Migration AddCustomerSupplierAccounts1729602000000 has been executed successfully
```

### **Step 2: Re-seed Permissions (if needed)**

The seed script now includes customer permissions. If you haven't seeded yet, run:

```bash
npm run seed
```

**New Permissions Added:**
- `customers.create`
- `customers.read`
- `customers.update`
- `customers.delete`

### **Step 3: Restart Backend Server**

```bash
cd backend
npm run start:dev
```

**Verify:**
- ✅ Server starts without errors
- ✅ No TypeScript compilation errors
- ✅ CustomersModule loaded successfully
- ✅ New endpoints available at `http://localhost:3000/api` (check Swagger docs)

### **Step 4: Restart Frontend Server**

```bash
cd frontend
npm run dev
```

**Verify:**
- ✅ Frontend compiles without errors
- ✅ No React/TypeScript errors
- ✅ Customers link visible in navigation

---

## 🎯 **Test Scenarios**

### **Test 1: Verify Swagger Documentation**

**URL:** `http://localhost:3000/api`

**Expected:**
- ✅ "Customers" tag visible in Swagger UI
- ✅ Endpoints visible:
  - `GET /customers` - Get all customers
  - `POST /customers` - Create customer
  - `GET /customers/:id` - Get customer by ID
  - `PATCH /customers/:id` - Update customer
  - `DELETE /customers/:id` - Delete customer
  - `GET /customers/:id/balance` - Get customer balance

---

### **Test 2: Create First Customer (Frontend)**

**Steps:**
1. Login as admin
2. Navigate to **Customers** from top nav or dashboard card
3. Click **"New Customer"** button
4. Fill in the form:
   - **Name:** ABC Trading Company *(required)*
   - **Contact Person:** John Doe
   - **Email:** john@abctrading.com
   - **Mobile:** +92-300-1234567
   - **Address Line 1:** 123 Main Street
   - **City:** Lahore
   - **State:** Punjab
   - **Country:** Pakistan
   - **Credit Limit:** 100000
   - **Credit Days:** 30
   - **Grace Days:** 3
   - **Tax ID:** 1234567-8
   - **GST Number:** GST-123456
   - **Active:** ✓ (checked)
5. Click **"Create"**

**Expected Result:**
- ✅ Success message: "Customer created successfully!"
- ✅ Dialog closes
- ✅ Customer appears in table with:
  - **Code:** `CUST-0001` (auto-generated)
  - **Name:** ABC Trading Company
  - **Contact Person:** John Doe
  - **Mobile:** +92-300-1234567
  - **City:** Lahore
  - **Credit Limit:** 100,000
  - **AR Account:** `02-0001` (auto-generated)
  - **Status:** Active (green badge)

**Backend Verification:**
- ✅ Customer record created in `customers` table
- ✅ AR account created in `accounts` table with:
  - **Code:** `02-0001`
  - **Name:** ABC Trading Company
  - **Category:** CUSTOMER
  - **Nature:** DEBIT
  - **Account Type:** DETAIL
  - **Parent:** `02` (Customers parent account)
  - **customer_id:** Links to customer record

**Database Check:**
```sql
-- Check customer
SELECT code, name, receivable_account_id FROM customers WHERE code = 'CUST-0001';

-- Check AR account
SELECT code, name, category, customer_id FROM accounts WHERE code = '02-0001';

-- Verify bidirectional link
SELECT 
  c.code AS customer_code,
  c.name AS customer_name,
  a.code AS account_code,
  a.name AS account_name,
  a.customer_id IS NOT NULL AS is_linked
FROM customers c
JOIN accounts a ON c.receivable_account_id = a.id
WHERE c.code = 'CUST-0001';
```

---

### **Test 3: Create Second Customer**

**Steps:**
1. Click **"New Customer"**
2. Fill in:
   - **Name:** XYZ Enterprises
   - **Mobile:** +92-301-9876543
   - **City:** Karachi
   - **Credit Limit:** 50000
   - *(Leave other fields empty - test optionality)*
3. Click **"Create"**

**Expected Result:**
- ✅ Customer created with code `CUST-0002`
- ✅ AR account created with code `02-0002`
- ✅ Optional fields are NULL in database
- ✅ Default values applied:
  - **Country:** Pakistan
  - **Credit Limit:** 0 (if not specified)
  - **Credit Days:** 0
  - **Grace Days:** 3
  - **Active:** true

---

### **Test 4: Customer Search**

**Steps:**
1. In the search box, type `ABC`
2. Wait for results

**Expected Result:**
- ✅ Table filters to show only "ABC Trading Company"
- ✅ XYZ Enterprises hidden

**Steps:**
1. Clear search box
2. Type `CUST-0002`

**Expected Result:**
- ✅ Table shows only XYZ Enterprises

---

### **Test 5: Edit Customer**

**Steps:**
1. Find "ABC Trading Company" in the list
2. Click the **Edit (pencil)** icon
3. Modify:
   - **Contact Person:** Jane Smith
   - **Credit Limit:** 150000
4. Click **"Update"**

**Expected Result:**
- ✅ Success message: "Customer updated successfully!"
- ✅ Table refreshes with updated data
- ✅ **Contact Person** now shows "Jane Smith"
- ✅ **Credit Limit** now shows 150,000

**Backend Verification:**
```sql
SELECT name, contact_person, credit_limit, updated_at
FROM customers 
WHERE code = 'CUST-0001';
```
- ✅ `updated_at` timestamp changed
- ✅ Values updated correctly

---

### **Test 6: Pagination**

**Steps:**
1. Create 25 customers (using API or UI)
2. Navigate to Customers page

**Expected Result:**
- ✅ Table shows first 20 customers (default limit)
- ✅ "Showing 1 to 20 of 25 customers" message
- ✅ **Next** button enabled
- ✅ **Previous** button disabled

**Steps:**
1. Click **Next**

**Expected Result:**
- ✅ Table shows customers 21-25
- ✅ "Showing 21 to 25 of 25 customers"
- ✅ **Previous** button enabled
- ✅ **Next** button disabled

---

### **Test 7: Soft Delete Customer**

**Steps:**
1. Find "XYZ Enterprises" in the list
2. Click the **Delete (trash)** icon
3. Confirm deletion in the alert

**Expected Result:**
- ✅ Success message: "Customer deleted successfully!"
- ✅ Customer disappears from list (soft deleted)

**Backend Verification:**
```sql
-- Customer should have deleted_at timestamp
SELECT code, name, deleted_at 
FROM customers 
WHERE code = 'CUST-0002';

-- Account should also be soft deleted
SELECT code, name, deleted_at 
FROM accounts 
WHERE code = '02-0002';
```
- ✅ Both records have `deleted_at` timestamp (not NULL)
- ✅ Customer removed from active list

---

### **Test 8: Customer Account Link Integrity**

**Test that customer and account are properly linked.**

**Steps:**
1. Create a customer via API:
```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Customer",
    "mobile": "+92-300-0000000",
    "city": "Islamabad"
  }'
```

2. Get the customer ID from response
3. Query the customer balance:
```bash
curl -X GET http://localhost:3000/customers/{CUSTOMER_ID}/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "customerId": "...",
  "customerName": "Test Customer",
  "accountCode": "02-0003",
  "balance": 0,
  "balanceType": "DR"
}
```

**Backend Verification:**
```sql
-- Check account is linked to customer
SELECT 
  c.id AS customer_id,
  c.code AS customer_code,
  a.id AS account_id,
  a.code AS account_code,
  a.customer_id
FROM customers c
JOIN accounts a ON c.receivable_account_id = a.id
WHERE c.code = 'CUST-0003';
```
- ✅ `a.customer_id` matches `c.id` (bidirectional link)

---

### **Test 9: CustomerSelector Component (Reusability)**

**This component will be used in GRN, GDN, Invoice forms.**

**Test Component:**
Create a test page to verify the CustomerSelector component works standalone:

```tsx
// frontend/src/pages/TestCustomerSelector.tsx
import { useState } from 'react';
import { CustomerSelector } from '../components/CustomerSelector';

export default function TestCustomerSelector() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">Test Customer Selector</h1>
      <CustomerSelector
        value={selectedCustomerId}
        onChange={setSelectedCustomerId}
        label="Select Customer"
        required={true}
      />
      <p className="mt-4 text-sm">
        Selected Customer ID: <code>{selectedCustomerId || 'None'}</code>
      </p>
    </div>
  );
}
```

**Add route temporarily to App.tsx:**
```tsx
<Route path="/test-customer-selector" element={<TestCustomerSelector />} />
```

**Steps:**
1. Navigate to `/test-customer-selector`
2. Open the dropdown
3. Type "ABC" in the search box
4. Select "ABC Trading Company"

**Expected Result:**
- ✅ Dropdown opens
- ✅ Search filters customers in real-time
- ✅ Selected customer displays as: `CUST-0001 - ABC Trading Company`
- ✅ Selected ID shown below

---

### **Test 10: Phase 3 Compatibility (Backward Compatibility)**

**Verify Phase 3 accounts functionality still works after our changes.**

**Steps:**
1. Navigate to **Chart of Accounts**
2. Click **"New Account"**
3. Create a regular account (not customer):
   - **Name:** Test Regular Account
   - **Account Type:** DETAIL
   - **Nature:** DEBIT
   - **Category:** ASSET *(not CUSTOMER)*
   - **Parent Account:** Select any existing parent
4. Click **"Create"**

**Expected Result:**
- ✅ Account created successfully
- ✅ No `customer_id` set (should be NULL)
- ✅ No errors related to new customer fields
- ✅ Existing functionality unchanged

**Database Check:**
```sql
SELECT code, name, category, customer_id
FROM accounts
WHERE name = 'Test Regular Account';
```
- ✅ `customer_id` is NULL
- ✅ Category is ASSET (not CUSTOMER)

---

### **Test 11: Database Constraint Verification**

**Test that database constraints are working.**

**Test A: CUSTOMER accounts must have customer_id**
```sql
-- This should FAIL (if constraint added)
INSERT INTO accounts (
  code, name, account_type, nature, category, 
  opening_balance, is_active
) VALUES (
  '02-9999', 'Invalid Customer Account', 'DETAIL', 'DEBIT', 'CUSTOMER',
  0, true
);
```

**Expected:** Error (if constraint implemented in migration)  
**Note:** Current migration doesn't add this constraint to avoid breaking changes. Add later.

**Test B: Customer cannot be deleted if referenced**
```sql
-- This should succeed (soft delete)
UPDATE customers SET deleted_at = NOW() WHERE code = 'CUST-0001';

-- This should also soft delete the account
SELECT deleted_at FROM accounts WHERE code = '02-0001';
```

---

## 🔗 **Integration Test: Customer → Account → General Ledger**

**Test the full integration flow.**

### **Scenario: Customer Transaction Flow**

**Step 1: Create a customer**
- Create "Integration Test Customer"
- Verify AR account `02-0004` created

**Step 2: Post a transaction to customer's AR account**
1. Navigate to **Vouchers → Create Journal Voucher**
2. Select account `02-0004` (Integration Test Customer)
3. Debit: 10,000 (customer owes us)
4. Credit: Select a revenue account
5. Post the voucher

**Step 3: Check customer balance**
1. Navigate to **General Ledger → Account Ledger**
2. Select account `02-0004`
3. View ledger

**Expected Result:**
- ✅ Opening balance: 0 DR
- ✅ Transaction shows: Debit 10,000
- ✅ Closing balance: 10,000 DR
- ✅ Balance type: DR (because it's an asset account)

**Step 4: Check Trial Balance**
1. Navigate to **Trial Balance**
2. Find account `02-0004`

**Expected Result:**
- ✅ Account appears in Trial Balance
- ✅ Debit: 10,000
- ✅ Credit: 0

**Step 5: Check Customer Balance API**
```bash
curl -X GET http://localhost:3000/customers/{CUSTOMER_ID}/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "customerId": "...",
  "customerName": "Integration Test Customer",
  "accountCode": "02-0004",
  "balance": 10000,
  "balanceType": "DR"
}
```

---

## ✅ **Success Criteria**

The Customers Module is ready for Phase 5 when:

- ✅ Can create customer (atomically creates AR account)
- ✅ Customer code auto-generated (CUST-0001, CUST-0002)
- ✅ Account code auto-generated (02-0001, 02-0002)
- ✅ Bidirectional link between customer and account
- ✅ Can search/filter customers
- ✅ Can edit customer (account name syncs)
- ✅ Can soft delete customer
- ✅ Pagination works correctly
- ✅ CustomerSelector component functional
- ✅ Phase 3 accounts functionality unaffected
- ✅ Database constraints enforced
- ✅ All permissions working
- ✅ Integration with General Ledger verified
- ✅ Swagger documentation complete
- ✅ No TypeScript/React errors
- ✅ No console errors in browser

---

## 🚨 **Known Limitations / Future Enhancements**

### **Current Implementation:**
- ✓ Customer CRUD operations
- ✓ AR account auto-creation
- ✓ Basic balance display (placeholder)
- ✓ Soft delete

### **To Be Implemented Later (Phase 5+):**
- ⏳ Customer balance from General Ledger (real-time)
- ⏳ Customer transaction history
- ⏳ Customer aging report
- ⏳ Block customer if over credit limit
- ⏳ Prevent deletion if customer has active GRNs/invoices

---

## 📊 **Performance Benchmarks**

**Expected Performance:**
- Customer creation: < 200ms (includes account creation)
- Customer list (20 items): < 100ms
- Customer search: < 50ms
- Customer balance query: < 100ms (when integrated with GL)

---

## 🐛 **Troubleshooting**

### **Issue: Migration fails**
```bash
ERROR: type "account_category_enum" already has value "CUSTOMER"
```
**Solution:** The enum value already exists. Skip or modify migration.

### **Issue: "customers.read" permission denied**
**Solution:** Re-run seed script to add new permissions.

### **Issue: Customer not showing AR account code in table**
**Solution:** Ensure `receivableAccount` relation is loaded in query.

### **Issue: CustomerSelector not loading customers**
**Solution:** 
1. Check backend is running
2. Check JWT token is valid
3. Check browser console for errors
4. Verify `/customers?limit=100&isActive=true` endpoint works

---

## 📝 **Testing Checklist**

- [ ] Database migration ran successfully
- [ ] Permissions seeded
- [ ] Backend server restarted without errors
- [ ] Frontend server restarted without errors
- [ ] Swagger docs show Customer endpoints
- [ ] Created first customer (CUST-0001, 02-0001)
- [ ] Created second customer (CUST-0002, 02-0002)
- [ ] Customer search works
- [ ] Customer edit works
- [ ] Customer delete works (soft delete)
- [ ] Pagination works (if 20+ customers)
- [ ] CustomerSelector component works
- [ ] Phase 3 accounts functionality works
- [ ] Customer-Account bidirectional link verified
- [ ] Integration with General Ledger tested
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All permissions working

---

**Status:** 📋 Ready for testing  
**Tester:** User  
**Expected Duration:** 30-45 minutes


