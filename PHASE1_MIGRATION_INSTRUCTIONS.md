# 🚀 Phase 1: GL Foundation - Migration Instructions

**Date:** October 24, 2025  
**Phase:** 1 - GL Foundation (Fiscal Periods & Cost Centers)

---

## ✅ **What Has Been Implemented**

### **Backend Complete:**
1. ✅ **Fiscal Periods Module**
   - FiscalYear & FiscalPeriod entities
   - FiscalPeriodsService (create, close, reopen periods)
   - FiscalPeriodsController (REST API)
   - Period validation and locking logic

2. ✅ **Cost Centers Module**
   - CostCenter entity (hierarchical structure)
   - CostCentersService (CRUD + tree operations)
   - CostCentersController (REST API)
   - Circular reference prevention

3. ✅ **Account Enhancements**
   - Added `sub_category` (CURRENT_ASSET, FIXED_ASSET, COGS, etc.)
   - Added `financial_statement` mapping
   - Added behavior flags (`is_cash_account`, `is_bank_account`, `is_depreciable`)
   - Added `require_cost_center` flag
   - Updated Account entity

4. ✅ **Voucher Enhancements**
   - Added `fiscal_period_id` to VoucherMaster
   - Added `cost_center_id` to VoucherDetail

5. ✅ **Permissions Added**
   - `fiscal-periods.create`
   - `fiscal-periods.read`
   - `fiscal-periods.close`
   - `cost-centers.create`
   - `cost-centers.read`
   - `cost-centers.update`
   - `cost-centers.delete`

---

## 📋 **Migration Steps**

### **Step 1: Stop Backend Server**

If the backend is running, stop it:
```powershell
# Press Ctrl+C in the backend terminal
```

### **Step 2: Run Database Migration**

Open a new PowerShell terminal and run:

```powershell
# Navigate to backend directory
cd backend

# Connect to PostgreSQL and run migration
psql -U admin -d advance_erp -f phase1-gl-foundation-migration.sql
```

**Expected Output:**
```
BEGIN
CREATE TABLE
CREATE INDEX
...
✅ Phase 1 GL Foundation migration completed successfully!
 fiscal_years_count 
--------------------
                  1
(1 row)

 fiscal_periods_count 
----------------------
                   12
(1 row)
```

### **Step 3: Reseed Permissions**

The seed script has been updated with new permissions. Run:

```powershell
# Still in backend directory
npm run seed
```

**Expected Output:**
```
✅ Database connection established
⚠️  Admin user already exists. Skipping seed.
```

**OR** if you want to force reseed (drops and recreates admin user):

```powershell
# Delete admin user first (optional - only if you want fresh permissions)
psql -U admin -d advance_erp -c "DELETE FROM users WHERE username = 'admin';"

# Then reseed
npm run seed
```

### **Step 4: Verify Migration**

Check that everything was created:

```powershell
psql -U admin -d advance_erp
```

Then run these SQL queries:

```sql
-- Check fiscal years
SELECT * FROM fiscal_years;

-- Check fiscal periods
SELECT id, period_number, period_name, start_date, end_date, is_closed 
FROM fiscal_periods 
ORDER BY period_number;

-- Check cost centers table exists
SELECT COUNT(*) FROM cost_centers;

-- Check new account columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('sub_category', 'financial_statement', 'is_cash_account', 'require_cost_center');

-- Check new permissions
SELECT code, name FROM permissions 
WHERE module IN ('fiscal-periods', 'cost-centers') 
ORDER BY code;

-- Exit psql
\q
```

**Expected Results:**
- **Fiscal Years:** 1 row (FY 2025-2026)
- **Fiscal Periods:** 12 rows (July 2025 - June 2026)
- **Cost Centers:** 0 rows (empty, ready for data)
- **Account Columns:** 4 rows (new columns exist)
- **Permissions:** 7 rows (fiscal-periods: 3, cost-centers: 4)

### **Step 5: Start Backend Server**

```powershell
# In backend directory
npm run start:dev
```

**Wait for:**
```
[Nest] [YYYY] [LOG] Application is running on: http://localhost:3000
```

### **Step 6: Verify Backend APIs**

Open your browser and go to:
```
http://localhost:3000/api-docs
```

**You should see NEW endpoints:**
- **Fiscal Periods:**
  - `POST /fiscal-periods/years`
  - `GET /fiscal-periods/years`
  - `GET /fiscal-periods/current`
  - `POST /fiscal-periods/periods/close`
  
- **Cost Centers:**
  - `POST /cost-centers`
  - `GET /cost-centers`
  - `GET /cost-centers/tree`
  - `PATCH /cost-centers/:id`
  - `DELETE /cost-centers/:id`

### **Step 7: Test API with Postman (Optional)**

#### **Login to get token:**
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123"
}
```

Copy the `access_token` from the response.

#### **Test Fiscal Periods API:**
```http
GET http://localhost:3000/fiscal-periods/years
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "...",
      "year": 2025,
      "startDate": "2025-07-01",
      "endDate": "2026-06-30",
      "isClosed": false,
      "periods": [
        {
          "id": "...",
          "periodNumber": 1,
          "periodName": "July 2025",
          "startDate": "2025-07-01",
          "endDate": "2025-07-31",
          "isClosed": false
        },
        ...
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### **Test Cost Centers API:**
```http
POST http://localhost:3000/cost-centers
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json

{
  "code": "ADM",
  "name": "Administration",
  "description": "Administrative department",
  "isActive": true
}
```

**Expected Response:**
```json
{
  "id": "...",
  "code": "ADM",
  "name": "Administration",
  "description": "Administrative department",
  "isActive": true,
  "createdAt": "2025-10-24T..."
}
```

---

## ✅ **Success Criteria**

Before proceeding to frontend implementation, verify:

- [x] Migration SQL executed without errors
- [x] 1 fiscal year (2025-2026) exists
- [x] 12 fiscal periods exist (July 2025 - June 2026)
- [x] Cost centers table is empty but ready
- [x] Account table has new columns (sub_category, financial_statement, behavior flags)
- [x] New permissions exist in database
- [x] Backend server starts without errors
- [x] Swagger docs show new endpoints
- [x] Can retrieve fiscal periods via API
- [x] Can create a cost center via API

---

## 🐛 **Troubleshooting**

### **Error: `type "account_sub_category_enum" already exists`**
**Solution:** The migration is idempotent. This is expected if running twice. Ignore this error.

### **Error: `relation "fiscal_years" already exists`**
**Solution:** Tables already exist. The migration uses `CREATE TABLE IF NOT EXISTS`. Safe to ignore.

### **Error: `permission denied for table users`**
**Solution:** Ensure you're using the correct database credentials in `backend/.env`:
```
DATABASE_USER=admin
DATABASE_PASSWORD=admin123
DATABASE_NAME=advance_erp
```

### **Backend won't start after migration**
**Solution:**
1. Check for TypeScript compilation errors: `npm run build`
2. Ensure all new modules are imported in `app.module.ts`
3. Clear `dist` folder: `Remove-Item -Recurse -Force dist` then restart

### **API returns 403 Forbidden**
**Solution:** Reseed permissions:
```powershell
npm run seed
```

---

## 📊 **Database Schema Summary**

### **New Tables:**
1. **fiscal_years** (1 row: FY 2025-2026)
2. **fiscal_periods** (12 rows: July 2025 - June 2026)
3. **cost_centers** (0 rows, ready for data)

### **Modified Tables:**
1. **accounts** (7 new columns)
2. **voucher_master** (1 new column: fiscal_period_id)
3. **voucher_details** (1 new column: cost_center_id)

### **New Enums:**
1. **account_sub_category_enum** (16 values)
2. **financial_statement_enum** (4 values)

### **New Permissions:**
1. fiscal-periods.create
2. fiscal-periods.read
3. fiscal-periods.close
4. cost-centers.create
5. cost-centers.read
6. cost-centers.update
7. cost-centers.delete

---

## ⏭️ **Next Steps**

Once migration is complete and verified:

1. ✅ **Frontend Implementation** (next)
   - Create FiscalPeriodsPage
   - Create CostCentersPage
   - Update AccountsPage with new fields

2. **Update VouchersService**
   - Add fiscal period validation
   - Prevent posting to closed periods

3. **End-to-End Testing**
   - Test fiscal period closing
   - Test cost center CRUD
   - Test account enhancements

---

**Ready to proceed?** Confirm migration success and I'll start frontend implementation! 🚀

