# 📦 Phase 5: Warehouse Operations Module - Implementation Plan

**Status:** 🔴 Not Started  
**Estimated Duration:** 5-6 weeks  
**Complexity:** ⭐⭐⭐⭐⭐ (Very High)  
**Prerequisites:** Phases 1-4 Complete ✅

---

## 📊 Executive Summary

Phase 5 implements the **complete cold storage warehouse management system**, the core operational functionality of the ERP. This module handles:

- **Products & Inventory Master Data**
- **Warehouse Structure** (Warehouses → Rooms → Racks)
- **Goods Receipt Notes (GRN)** - Inbound inventory with weight tracking
- **Goods Delivery Notes (GDN)** - Outbound inventory management
- **Stock Tracking** - Real-time inventory balances by location
- **Inter-Room Transfers** - Stock movement between storage locations

**Business Context:** Cold storage facility for agricultural products (potatoes, vegetables) with rental-based revenue model.

---

## 🎯 Module Breakdown

### 1. **Products Module** (Week 1)

**Purpose:** Master data for inventory items

#### Backend Tasks:
- [ ] Create `ProductsModule` in NestJS
- [ ] Create `Product` entity with fields:
  - `id`, `code`, `name`, `description`
  - `unit` (kg, bag, crate, etc.)
  - `varieties` (JSON: Red Potato, White Potato, etc.)
  - `packingTypes` (JSON: Bag, Crate, Loose, etc.)
  - `isActive`, `createdBy`, `updatedBy`, `deletedAt`
- [ ] Create ProductsService with CRUD operations
- [ ] Create ProductsController with Swagger docs
- [ ] Add permissions: `products.read`, `products.create`, `products.update`, `products.delete`

#### Frontend Tasks:
- [ ] Create `ProductsPage.tsx` - List/Create/Edit products
- [ ] Create product form with varieties and packing types
- [ ] Create product selector component (reusable)
- [ ] Add routing and navigation

**Estimated Time:** 3-4 days

---

### 2. **Warehouses Module** (Week 1-2)

**Purpose:** Physical storage structure management

#### Backend Tasks:
- [ ] Create `WarehousesModule` in NestJS
- [ ] Create entities:
  - **Warehouse:** `id`, `code`, `name`, `address`, `capacity`, `isActive`
  - **Room:** `id`, `code`, `name`, `warehouseId`, `temperature`, `humidity`, `capacity`, `isActive`
  - **Rack:** `id`, `code`, `name`, `roomId`, `position`, `capacity`, `isActive`
- [ ] Create WarehousesService with:
  - CRUD for warehouses
  - CRUD for rooms (with warehouse association)
  - CRUD for racks (with room association)
  - Get warehouse hierarchy (with rooms and racks)
- [ ] Create WarehousesController with Swagger docs
- [ ] Add permissions: `warehouses.read`, `warehouses.create`, `warehouses.update`, `warehouses.delete`

#### Frontend Tasks:
- [ ] Create `WarehousesPage.tsx` - Manage warehouses
- [ ] Create `RoomsPage.tsx` - Manage rooms
- [ ] Create `RacksPage.tsx` - Manage racks
- [ ] Create warehouse hierarchy tree view component
- [ ] Create room/rack selector components (reusable)
- [ ] Add routing and navigation

**Estimated Time:** 5-6 days

---

### 3. **GRN (Goods Receipt Note) Module** (Week 2-4)

**Purpose:** Inbound inventory management with weight/quantity tracking

#### Backend Tasks:
- [ ] Create `GRNModule` in NestJS
- [ ] Create entities:
  - **GRNMaster:**
    - `id`, `grnNumber` (auto-generated), `grnDate`, `timeIn`
    - `customerId`, `subCustomer` (optional)
    - `vehicleNumber`, `builtyNumber`, `remarks`
    - `graceDays`, `labourAmount`, `labourDebitAccountCode`, `labourCreditAccountCode`
    - `carriageAmount`, `carriageDebitAccountCode`, `carriageCreditAccountCode`
    - `isApproved`, `approvedBy`, `approvedAt`
    - `createdBy`, `updatedBy`, `deletedAt`
  - **GRNDetail:**
    - `id`, `grnId`, `lineNumber`
    - `productId`, `variety`, `packingType`
    - `grossWeight`, `tareWeight`, `netWeight` (auto-calculated)
    - `quantity`, `rate`, `amount` (auto-calculated)
    - `roomId`, `rackId`
    - `ownershipDate` (defaults to grnDate, used for billing)
    - `labourRate`
- [ ] Create GRNService with:
  - `create()` - Create draft GRN
  - `update()` - Update draft GRN (only if not approved)
  - `approve()` - Approve GRN and update stock
  - `getNextGRNNumber()` - Auto-increment GRN number
  - `findAll()` - List GRNs with filters
  - `findOne()` - Get GRN with details
  - `getStockByGRN()` - Get remaining stock for a GRN
- [ ] Create GRNController with Swagger docs
- [ ] Implement GRN approval logic:
  - Lock GRN for editing
  - Update stock balances (create stock entries)
  - Post accounting voucher for labour/carriage charges
- [ ] Add permissions: `grn.read`, `grn.create`, `grn.update`, `grn.approve`

#### Frontend Tasks:
- [ ] Create `GRNPage.tsx` - List GRNs with filters
- [ ] Create `GRNFormPage.tsx` - Create/Edit GRN
  - Header section (customer, vehicle, builty, charges)
  - Dynamic detail lines (add/remove rows)
  - Product/Room/Rack selectors per line
  - Weight calculations (net = gross - tare)
  - Amount calculations (quantity × rate)
- [ ] Create `GRNDetailPage.tsx` - View GRN details
- [ ] Implement GRN approval flow
- [ ] Add GRN number display and status badges
- [ ] Create GRN reports (PDF generation - if time permits)
- [ ] Add routing and navigation

**Estimated Time:** 10-12 days

---

### 4. **Stock Tracking Module** (Week 3-4)

**Purpose:** Real-time inventory balance management

#### Backend Tasks:
- [ ] Create `StockModule` in NestJS
- [ ] Create `Stock` entity:
  - `id`, `grnDetailId` (reference to source GRN line)
  - `productId`, `roomId`, `rackId`
  - `quantity`, `grossWeight`, `netWeight`
  - `ownershipDate`, `customerId`
  - `isActive` (false when fully delivered)
- [ ] Create StockService with:
  - `getStockSummary()` - Group by product/room/customer
  - `getStockByLocation()` - Filter by room/rack
  - `getStockByCustomer()` - Filter by customer
  - `getStockDetails()` - Detailed view with GRN reference
  - `updateStock()` - Internal method for GRN/GDN operations
- [ ] Create StockController with Swagger docs
- [ ] Add permissions: `stock.read`

#### Frontend Tasks:
- [ ] Create `StockSummaryPage.tsx` - Dashboard view
  - Stock by product
  - Stock by room
  - Stock by customer
  - Filters and search
- [ ] Create `StockDetailsPage.tsx` - Detailed inventory view
- [ ] Create stock movement history component
- [ ] Add stock visualizations (charts)
- [ ] Add routing and navigation

**Estimated Time:** 5-6 days

---

### 5. **GDN (Goods Delivery Note) Module** (Week 4-5)

**Purpose:** Outbound inventory management

#### Backend Tasks:
- [ ] Create `GDNModule` in NestJS
- [ ] Create entities:
  - **GDNMaster:**
    - `id`, `gdnNumber` (auto-generated), `gdnDate`, `timeOut`
    - `customerId`, `vehicleNumber`, `remarks`
    - `labourAmount`, `labourDebitAccountCode`, `labourCreditAccountCode`
    - `isApproved`, `approvedBy`, `approvedAt`
    - `createdBy`, `updatedBy`, `deletedAt`
  - **GDNDetail:**
    - `id`, `gdnId`, `lineNumber`
    - `grnDetailId` (reference to source GRN)
    - `productId`, `variety`, `packingType`
    - `roomId`, `rackId`
    - `deliveredQuantity`, `deliveredWeight`
    - `labourRate`
- [ ] Create GDNService with:
  - `create()` - Create draft GDN (validate stock availability)
  - `update()` - Update draft GDN (only if not approved)
  - `approve()` - Approve GDN and reduce stock
  - `getNextGDNNumber()` - Auto-increment GDN number
  - `getAvailableStock()` - Get stock for customer to select
  - `findAll()` - List GDNs with filters
  - `findOne()` - Get GDN with details
- [ ] Create GDNController with Swagger docs
- [ ] Implement GDN approval logic:
  - Reduce stock quantities
  - Mark GRN detail as fully/partially delivered
  - Post accounting voucher for labour charges
- [ ] Add permissions: `gdn.read`, `gdn.create`, `gdn.update`, `gdn.approve`

#### Frontend Tasks:
- [ ] Create `GDNPage.tsx` - List GDNs with filters
- [ ] Create `GDNFormPage.tsx` - Create/Edit GDN
  - Select customer
  - Show available stock for customer
  - Select items to deliver (with quantity validation)
  - Dynamic detail lines
  - Labour charges
- [ ] Create `GDNDetailPage.tsx` - View GDN details
- [ ] Implement GDN approval flow
- [ ] Add GDN number display and status badges
- [ ] Create GDN reports (PDF generation - if time permits)
- [ ] Add routing and navigation

**Estimated Time:** 8-10 days

---

### 6. **Inter-Room Transfer Module** (Week 5-6)

**Purpose:** Move inventory between storage locations

#### Backend Tasks:
- [ ] Create `TransfersModule` in NestJS
- [ ] Create `InterRoomTransfer` entity:
  - `id`, `transferNumber` (auto-generated), `transferDate`
  - `fromRoomId`, `fromRackId`
  - `toRoomId`, `toRackId`
  - `grnDetailId` (item being transferred)
  - `quantity`, `weight`
  - `isApproved`, `approvedBy`, `approvedAt`
  - `createdBy`, `updatedBy`, `deletedAt`
- [ ] Create TransfersService with:
  - `create()` - Create transfer request
  - `approve()` - Approve and update stock location
  - `findAll()` - List transfers
  - `findOne()` - Get transfer details
- [ ] Create TransfersController with Swagger docs
- [ ] Implement transfer approval logic:
  - Update stock location (room/rack)
  - Validate destination capacity
- [ ] Add permissions: `transfers.read`, `transfers.create`, `transfers.approve`

#### Frontend Tasks:
- [ ] Create `TransfersPage.tsx` - List transfers
- [ ] Create `TransferFormPage.tsx` - Create transfer
  - Select source location (room/rack)
  - Show available stock at source
  - Select items to transfer
  - Select destination location
- [ ] Implement transfer approval flow
- [ ] Add transfer history view
- [ ] Add routing and navigation

**Estimated Time:** 4-5 days

---

### 7. **Reports & Analytics** (Week 6)

**Purpose:** Inventory reports and dashboards

#### Backend Tasks:
- [ ] Create `ReportsModule` in NestJS
- [ ] Implement reports:
  - Stock summary by product
  - Stock summary by room/warehouse
  - Stock summary by customer
  - GRN register (list of all receipts)
  - GDN register (list of all deliveries)
  - Stock movement report
  - Aging report (how long items have been stored)
- [ ] Add CSV export functionality
- [ ] Add permissions: `reports.read`, `reports.export`

#### Frontend Tasks:
- [ ] Create `ReportsPage.tsx` - Reports dashboard
- [ ] Create individual report pages
- [ ] Add filters and date range selectors
- [ ] Implement CSV export
- [ ] Add charts and visualizations
- [ ] Add routing and navigation

**Estimated Time:** 5-6 days

---

## 🗄️ Database Schema

### New Tables (9 tables):

1. **products**
   - Primary table for inventory items
   - Columns: id, code, name, description, unit, varieties (JSONB), packingTypes (JSONB), isActive

2. **warehouses**
   - Physical warehouse locations
   - Columns: id, code, name, address, capacity, isActive

3. **rooms**
   - Storage rooms within warehouses
   - Columns: id, code, name, warehouseId, temperature, humidity, capacity, isActive

4. **racks**
   - Storage racks within rooms
   - Columns: id, code, name, roomId, position, capacity, isActive

5. **grn_masters**
   - GRN header information
   - Columns: 15+ fields (see entity design above)

6. **grn_details**
   - GRN line items
   - Columns: 15+ fields (see entity design above)

7. **gdn_masters**
   - GDN header information
   - Columns: 12+ fields

8. **gdn_details**
   - GDN line items
   - Columns: 10+ fields

9. **stock_balances**
   - Real-time inventory positions
   - Columns: grnDetailId, productId, roomId, rackId, quantity, weights, customerId

10. **inter_room_transfers**
    - Stock movement records
    - Columns: id, transferNumber, fromRoomId, toRoomId, grnDetailId, quantity

---

## 🔗 Integration Points

### With Existing Modules:

1. **Customers (Phase 3 prerequisite - needs to be added)**
   - GRN/GDN reference customer accounts
   - Stock tracking by customer
   - **TODO: Add CustomersModule before starting Phase 5!**

2. **Accounts (Phase 3)**
   - Labour/carriage charges post to GL accounts
   - Future: Rental invoices will post to accounts

3. **Vouchers (Phase 4)**
   - GRN approval creates accounting vouchers
   - GDN approval creates accounting vouchers

---

## 📝 Business Rules to Implement

### 1. GRN Rules:
- [ ] GRN number auto-increment (format: GRN-YYYY-NNNN)
- [ ] Net weight = Gross weight - Tare weight (must be > 0)
- [ ] Amount = Quantity × Rate (reference only, not for billing)
- [ ] Grace days default from customer settings (can be overridden)
- [ ] Labour can be charged to customer or default expense account
- [ ] Ownership date defaults to GRN date (critical for billing calculation)
- [ ] Each GRN detail line assigned to specific Room + Rack
- [ ] Cannot edit/delete approved GRN

### 2. Stock Rules:
- [ ] Stock created only after GRN approval
- [ ] Stock tracked at GRN detail level (lot-based tracking)
- [ ] Stock balance = GRN quantity - GDN quantities
- [ ] Multiple lots of same product can be in different locations
- [ ] Stock must be available before GDN approval

### 3. GDN Rules:
- [ ] GDN number auto-increment (format: GDN-YYYY-NNNN)
- [ ] Can only deliver stock that exists for the customer
- [ ] Delivered quantity cannot exceed available stock
- [ ] GDN detail references specific GRN detail (lot tracking)
- [ ] Cannot edit/delete approved GDN
- [ ] Stock reduced only after GDN approval

### 4. Transfer Rules:
- [ ] Can only transfer stock that exists at source location
- [ ] Destination must have capacity
- [ ] Transfer updates stock location (room/rack)
- [ ] Transfer history maintained for audit

---

## 🎨 UI/UX Requirements

### Key UI Features:
1. **Dynamic Form Lines** - Add/remove GRN/GDN detail rows
2. **Auto-calculations** - Net weight, amounts
3. **Smart Selectors** - Customer, product, room, rack with search
4. **Real-time Validation** - Stock availability, capacity checks
5. **Status Badges** - Draft, Approved, Delivered
6. **Approval Workflow** - Clear approve/reject actions
7. **Stock Visualization** - Charts showing inventory by location/product
8. **Responsive Tables** - Handle large datasets with pagination

### Professional Features:
- ✅ Loading states during async operations
- ✅ Error handling with user-friendly messages
- ✅ Confirmation dialogs for critical actions
- ✅ Print-friendly reports
- ✅ Export to CSV/PDF
- ✅ Keyboard shortcuts for power users
- ✅ Audit trail display (created by, approved by, dates)

---

## 🧪 Testing Strategy

### Unit Tests:
- [ ] Service methods (CRUD operations)
- [ ] Business logic (weight calculations, stock updates)
- [ ] Validation rules

### Integration Tests:
- [ ] GRN approval workflow
- [ ] GDN approval workflow
- [ ] Stock balance calculations
- [ ] Accounting integration

### E2E Tests:
- [ ] Complete GRN flow (create → approve → verify stock)
- [ ] Complete GDN flow (create → approve → verify stock reduction)
- [ ] Inter-room transfer flow
- [ ] Stock reports accuracy

---

## ⚠️ Critical Prerequisites

### **BLOCKER: Customers Module Missing!**

Phase 5 requires a **CustomersModule** (not yet implemented). This must be added first!

**Recommended Approach:**
- **Option A:** Add simplified CustomersModule as Phase 4.5 (3-4 days)
- **Option B:** Use existing Accounts module for customers temporarily
- **Option C:** Build CustomersModule as part of Phase 5 (Week 1)

**Recommendation:** Go with **Option C** - build CustomersModule in Week 1 alongside ProductsModule.

---

## 📊 Estimated Effort

| Module | Backend | Frontend | Testing | Total |
|--------|---------|----------|---------|-------|
| Products | 1.5 days | 1.5 days | 0.5 days | 3-4 days |
| Warehouses | 2.5 days | 2.5 days | 1 day | 5-6 days |
| GRN | 5 days | 5 days | 2 days | 10-12 days |
| Stock | 2.5 days | 2.5 days | 1 day | 5-6 days |
| GDN | 4 days | 4 days | 2 days | 8-10 days |
| Transfers | 2 days | 2 days | 1 day | 4-5 days |
| Reports | 2 days | 2.5 days | 0.5 days | 5-6 days |
| **Total** | **19.5 days** | **20 days** | **8 days** | **~40-45 days (6-7 weeks)** |

**Buffer:** 1 week for bug fixes and polish  
**Total:** **7-8 weeks** (revised estimate)

---

## 🚀 Implementation Order

### Week 1: Foundation
1. ✅ Read and understand all legacy workflows
2. Create CustomersModule (simplified)
3. Create ProductsModule
4. Create WarehousesModule (Warehouses only)

### Week 2: Warehouse Structure
1. Complete WarehousesModule (Rooms, Racks)
2. Start GRN backend (entities, basic CRUD)

### Week 3: GRN Implementation
1. Complete GRN backend (approval, stock update logic)
2. Start GRN frontend (form, list)

### Week 4: GRN & Stock
1. Complete GRN frontend (approval flow, reports)
2. Create Stock Tracking module
3. Start GDN backend

### Week 5: GDN Implementation
1. Complete GDN backend
2. Complete GDN frontend

### Week 6: Transfers & Reports
1. Create Inter-Room Transfers module
2. Create Reports module
3. Integration testing

### Week 7: Testing & Polish
1. E2E testing
2. Bug fixes
3. Performance optimization
4. Documentation

---

## 📚 Reference Documents

**Must Read Before Starting:**
1. `old-version/legacy-analysis/legacy_workflows.md` - Complete workflow documentation
2. `database/postgres_schema.sql` - Database design (GRN/GDN tables)
3. `old-version/legacy-analysis/legacy_code_audit.md` - Business logic analysis
4. `docs/modernization-design/backend_blueprint.md` - Module design patterns

---

## ✅ Definition of Done

Phase 5 is complete when:
- [ ] All 9 database tables created and migrated
- [ ] All 6 modules (Products, Warehouses, GRN, GDN, Stock, Transfers) implemented
- [ ] Complete GRN flow works end-to-end
- [ ] Complete GDN flow works end-to-end
- [ ] Stock balances accurate in real-time
- [ ] Inter-room transfers update stock locations
- [ ] All accounting integrations working
- [ ] All UIs professional and responsive
- [ ] E2E tests passing
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

## 🎯 Success Metrics

- **Functional:** 100% of legacy GRN/GDN workflows reproduced
- **Performance:** GRN/GDN creation < 3 seconds
- **Accuracy:** Stock balances match physical inventory
- **UX:** Forms intuitive, minimal training required
- **Code Quality:** 0 linter errors, full TypeScript typing

---

**Ready to Start:** Once user confirms approach and prerequisites!  
**Next Step:** Review this plan, then begin with Week 1 tasks.

---

**Plan Created:** October 22, 2025  
**Estimated Completion:** December 15, 2025 (8 weeks)  
**Complexity:** ⭐⭐⭐⭐⭐ Very High (Core business logic)

