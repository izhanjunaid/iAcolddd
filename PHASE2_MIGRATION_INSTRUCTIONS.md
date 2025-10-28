# 📦 **Phase 2: Inventory System - Migration Instructions**

**Date:** October 26, 2025  
**System:** Advance ERP - Cold Storage Management  
**Phase:** Phase 2 - Inventory Sub-Ledger  

---

## 🎯 **Migration Overview**

This migration creates the **complete inventory management system** including:
- ✅ **4 Core Tables**: inventory_items, inventory_transactions, inventory_balances, inventory_cost_layers
- ✅ **2 Supporting Tables**: warehouses, rooms  
- ✅ **FIFO Cost Layers**: For accurate inventory costing
- ✅ **Sample Data**: Test items, warehouses, and rooms
- ✅ **Indexes**: Optimized for performance
- ✅ **Permissions**: Inventory management permissions for Super Admin

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Run Database Migration**

Open your terminal in the `backend` directory and run:

```powershell
cd backend
npx typeorm migration:run -d src/database/data-source.ts
```

**Expected Output:**
```
query: CREATE TYPE "inventory_transaction_type_enum" AS ENUM(...)
query: CREATE TYPE "inventory_reference_type_enum" AS ENUM(...)
query: CREATE TYPE "unit_of_measure_enum" AS ENUM(...)
query: CREATE TABLE "warehouses" (...)
query: CREATE TABLE "rooms" (...)
query: CREATE TABLE "inventory_items" (...)
query: CREATE TABLE "inventory_transactions" (...)
query: CREATE TABLE "inventory_balances" (...)
query: CREATE TABLE "inventory_cost_layers" (...)
query: CREATE INDEX "idx_inventory_items_sku" ON "inventory_items" ("sku")
... (more indexes)
Migration CreateInventorySystem1729800000000 has been executed successfully.
```

### **Step 2: Reseed Permissions**

Run the seeder to add new inventory permissions:

```powershell
npm run seed
```

**Expected Output:**
```
Seeding users...
Super Admin user created successfully
Seeding permissions for Super Admin role...
Permission 'inventory.items.create' assigned to Super Admin role
Permission 'inventory.items.read' assigned to Super Admin role
Permission 'inventory.transactions.create' assigned to Super Admin role
... (more permissions)
Database seeded successfully!
```

### **Step 3: Restart Backend Server**

Stop the current backend server (Ctrl+C) and restart:

```powershell
npm run start:dev
```

**Expected Output:**
```
[Nest] Starting Nest application...
[Nest] InventoryModule dependencies initialized
[Nest] FIFOCostingService initialized  
[Nest] InventoryGLService initialized
[Nest] Nest application successfully started
```

---

## 🔍 **Verification Steps**

### **1. Check Database Tables**

Connect to your PostgreSQL database and verify:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%inventory%' OR table_name IN ('warehouses', 'rooms');

-- Expected: inventory_items, inventory_transactions, inventory_balances, 
--          inventory_cost_layers, warehouses, rooms
```

### **2. Check Sample Data**

```sql
-- Check sample warehouses
SELECT code, name FROM warehouses;
-- Expected: WH001 - Main Cold Storage, WH002 - Secondary Cold Storage, etc.

-- Check sample inventory items  
SELECT sku, name, category, unit_of_measure FROM inventory_items;
-- Expected: RICE001 - Basmati Rice Premium, MEAT001 - Beef Frozen Cuts, etc.

-- Check sample rooms
SELECT w.name as warehouse, r.code, r.name, r.temperature_range 
FROM rooms r 
JOIN warehouses w ON w.id = r.warehouse_id;
-- Expected: Various rooms with temperature ranges
```

### **3. Check API Endpoints**

Visit Swagger documentation: http://localhost:3000/api

**Expected New Sections:**
- 🏷️ **Inventory Items** (7 endpoints)
- 🔄 **Inventory Transactions** (10 endpoints)  
- 📊 **Inventory Balances & Reports** (4 endpoints)
- 📈 **Inventory Reports** (4 endpoints)

---

## ⚠️ **Troubleshooting**

### **Migration Fails**
```powershell
# If migration fails, check the error and try:
npx typeorm migration:revert -d src/database/data-source.ts
# Then fix the issue and run migration again
```

### **Permission Errors**
```sql
-- If backend shows permission errors, manually check:
SELECT p.code FROM permissions p 
JOIN role_permissions rp ON rp.permission_id = p.id 
JOIN roles r ON r.id = rp.role_id 
WHERE r.name = 'Super Admin' AND p.code LIKE 'inventory%';

-- Should show: inventory.items.create, inventory.items.read, etc.
```

### **TypeScript Compilation Errors**
```powershell
# If backend fails to start with TS errors:
npm run build
# Check for any compilation errors and fix them
```

---

## 📊 **Sample Data Created**

### **Warehouses:**
- **WH001** - Main Cold Storage (Karachi)
- **WH002** - Secondary Cold Storage (Lahore)  
- **WH003** - Dry Storage Facility (Islamabad)

### **Rooms (per warehouse):**
- **R001** - Frozen Section A (-18°C to -15°C, 500 tons)
- **R002** - Frozen Section B (-18°C to -15°C, 500 tons)
- **R003** - Chilled Section A (2°C to 4°C, 300 tons)
- **R004** - Chilled Section B (2°C to 4°C, 300 tons)
- **R005** - Dry Storage A (15°C to 25°C, 200 tons)

### **Inventory Items:**
- **RICE001** - Basmati Rice Premium (Grains, BAG, PKR 25.00)
- **MEAT001** - Beef Frozen Cuts (Meat, KG, PKR 800.00)
- **DAIRY001** - Milk Powder (Dairy, KG, PKR 150.00)
- **FRUIT001** - Frozen Mangoes (Fruits, KG, PKR 200.00)
- **VEG001** - Frozen Vegetables Mix (Vegetables, KG, PKR 120.00)

---

## ✅ **Success Indicators**

After successful migration and restart:

1. ✅ **Backend starts without errors**
2. ✅ **Swagger shows 25+ new inventory endpoints**  
3. ✅ **Database contains 6 new tables**
4. ✅ **Sample data is populated**
5. ✅ **Admin user has inventory permissions**
6. ✅ **Ready for API testing**

---

## 🚀 **Next Step: API Testing**

Once migration is complete and backend is running, we'll test the new inventory APIs using Playwright MCP to:

1. **Create new inventory items**
2. **Process stock receipts**  
3. **Issue stock with FIFO costing**
4. **Transfer stock between locations**
5. **Generate inventory reports**
6. **Verify GL integration**

**Ready to proceed with migration? Let me know when backend is running!** 🎯
