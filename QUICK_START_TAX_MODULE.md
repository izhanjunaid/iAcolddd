# 🚀 QUICK START - Tax Module

## Step-by-Step Setup

### 1️⃣ Run Database Migration (2 minutes)

```bash
# Navigate to project
cd C:\cold-storeIACHA

# Run migration
docker-compose exec postgres psql -U postgres -d advance_erp -f /app/backend/src/database/migrations/001-create-tax-tables.sql

# OR if not using Docker:
cd backend
psql -U postgres -d advance_erp -f src/database/migrations/001-create-tax-tables.sql
```

**Expected Output:**
```
CREATE TYPE
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE INDEX (multiple)
...
INSERT 0 7  (7 default tax rates created)
```

### 2️⃣ Restart Backend (1 minute)

```bash
cd backend
npm run start:dev
```

**Look for:**
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG [RoutesResolver] TaxController {/api/tax}: <-- NEW!
```

### 3️⃣ Test API (Swagger) (2 minutes)

1. Open: http://localhost:3000/api/docs
2. Login with: `admin` / `Admin@123`
3. Copy JWT token
4. Click "Authorize" button (top right)
5. Paste token
6. Scroll to "Tax Management" section
7. Try: `GET /api/tax/rates`

**Expected Response:**
```json
{
  "data": [
    {
      "name": "Standard GST - 18%",
      "taxType": "GST",
      "rate": 18,
      ...
    },
    ...
  ],
  "total": 7,
  "page": 1
}
```

---

## 🧪 Quick Tests

### Test 1: Get Default GST Rate
```bash
curl http://localhost:3000/api/tax/rates?taxType=GST \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Calculate GST on PKR 100,000
```bash
curl -X POST http://localhost:3000/api/tax/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "taxType": "GST"
  }'
```

**Expected:**
```json
{
  "taxType": "GST",
  "taxRate": 18,
  "taxableAmount": 100000,
  "taxAmount": 18000,  <-- 18% of 100,000
  "isExempt": false
}
```

### Test 3: Calculate Invoice with GST + WHT
```bash
curl -X POST http://localhost:3000/api/tax/calculate-invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subtotal": 100000,
    "customerId": "CUSTOMER_ID_HERE"
  }'
```

**Expected:**
```json
{
  "subtotal": 100000,
  "gstAmount": 18000,    <-- Added
  "whtAmount": 4000,     <-- Deducted
  "totalTaxAmount": 14000,
  "grandTotal": 114000
}
```

---

## ✅ Verification Checklist

Run these commands to verify everything:

```sql
-- Connect to database
psql -U postgres -d advance_erp

-- Check tables exist
\dt tax*;
-- Should show: tax_rates, tax_configurations

-- Check default rates
SELECT name, tax_type, rate, is_default FROM tax_rates WHERE is_default = TRUE;
-- Should show 3 default rates (GST, WHT, Income Tax)

-- Check views
\dv v_*;
-- Should show: v_active_tax_rates, v_tax_exempt_entities

-- Check permissions
SELECT code, name FROM permissions WHERE module = 'tax';
-- Should show 6 tax permissions

-- Quit
\q
```

---

## 🎯 What You Can Do Now

### Via API:
✅ List all tax rates
✅ Create custom tax rates
✅ Update tax rates
✅ Delete unused tax rates
✅ Calculate taxes for amounts
✅ Calculate invoice taxes (GST + WHT)
✅ Set customer/product tax exemptions

### Pakistan Tax Scenarios Supported:

1. **Standard GST (18%)**
   ```typescript
   calculateTax({ amount: 100000, taxType: 'GST' })
   // Returns: 18,000 PKR
   ```

2. **Company WHT (4%)**
   ```typescript
   calculateTax({ amount: 100000, taxType: 'WHT', customerId: 'company_id' })
   // Returns: 4,000 PKR
   ```

3. **Individual WHT (1%)**
   ```typescript
   calculateTax({ amount: 100000, taxType: 'WHT', customerId: 'individual_id' })
   // Returns: 1,000 PKR
   ```

4. **Export (Zero-rated)**
   ```typescript
   // Just configure product/customer as export
   // GST will be 0%
   ```

5. **Tax-Exempt Entities**
   ```typescript
   // Create exemption certificate
   POST /api/tax/configurations
   {
     "entityType": "CUSTOMER",
     "entityId": "customer_uuid",
     "taxRateId": "gst_rate_uuid",
     "isExempt": true,
     "exemptionReason": "Government entity",
     "exemptionCertificateNumber": "EX-2025-001"
   }
   ```

---

## 🐛 Troubleshooting

### Migration Fails?

```bash
# Check if tables already exist
psql -U postgres -d advance_erp -c "\dt tax*"

# If yes, drop and recreate:
psql -U postgres -d advance_erp -c "DROP TABLE IF EXISTS tax_configurations, tax_rates CASCADE;"
psql -U postgres -d advance_erp -c "DROP TYPE IF EXISTS tax_type_enum, tax_applicability_enum, tax_entity_type_enum CASCADE;"

# Then re-run migration
```

### Backend Won't Start?

```bash
# Check for TypeScript errors
cd backend
npm run build

# Check if port 3000 is in use
netstat -an | findstr :3000

# Check database connection
psql -U postgres -d advance_erp -c "SELECT 1"
```

### API Returns 401 Unauthorized?

```bash
# Get fresh token:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'

# Copy accessToken from response
# Use in subsequent requests:
-H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## 📞 Next Steps

### Option A: Test Backend Thoroughly (Recommended)
```
1. Test all API endpoints
2. Try different tax scenarios
3. Configure some exemptions
4. Verify calculations
```

### Option B: Continue to Frontend (Day 5)
```
1. Create TaxRatesPage.tsx
2. Build tax rate management UI
3. Add tax calculator widget
4. Test end-to-end
```

### Option C: Move to Storage Billing (Day 6-7)
```
1. Implement billing calculator
2. Integrate with tax module
3. Test storage charge + tax calculation
```

---

## 🎉 You're Ready!

Your **Tax Calculation System** is:
- ✅ Installed
- ✅ Configured
- ✅ FBR-compliant structure
- ✅ Ready for integration

**Choose your path:**
- "Test the backend" 🧪
- "Build the frontend" 🎨
- "Continue to storage billing" 📦
- "Show me all APIs" 📡

Just tell me what you want to do next! 🚀
