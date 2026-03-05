# Implementation Plan: ERP Audit Remediation & Phase 2 Roadmap

This checklist is based on the comprehensive ERP Audit (Phase 1 + Phase 2) for the Cold Store focus.

## 🚨 Priority Defect & Risk Register

### P0 (Immediate / Critical)
- [x] **Inventory Control**: Add `PermissionsGuard` to all inventory controllers.
    - *Context*: Inventory controllers currently lack consistent authorization enforcement.
- [x] **Financial Integrity**: Implement deterministic unique posting linkage for `Invoice -> Voucher`.
    - *Context*: Current search-based linkage is weak and prone to duplicates.
- [x] **Data Integrity**: Replace sequence generation with DB-safe counters/sequences.
    - *Context*: Potential race condition on document numbering (Vouchers, Invoices).
- [x] **Governance**: Formalize Unpost/Reopen governance with Maker-Checker workflow.
    - *Context*: Critical financial actions currently lack dual approval.

### P1 (High Priority / Phase 2 Must-Haves)
- [x] **AP Domain**: Implement full AP (Visits/Bills) domain.
    - *Scope*: Vendor Master, AP Bills, Payment Runs.
    - *Status*: ✅ Vendor Master, AP Bills (with GL posting), AP Payments all implemented.
- [x] **Financial Operations**: Add AR/AP aging reports + Cash Forecast + Collections/Payments workbenches.
- [x] **Period Close**: Add Period Close Checklist and Exception Management.

### P2 (Scale & Optimization)
- [ ] **Reporting Performance**: Implement Materialized Views / Reporting Mart for large ledgers.
    - *Context*: Current iterative balance calculation is N+1 heavy.
- [ ] **Cold Store Ops**: Implement Telemetry integration and FEFO/Quality workflows.
- [ ] **Dashboard**: specialized role-based dashboards (CFO, Ops) with alerts.

---

## 🛠️ Phase 2 Blueprint Workstreams

### Workstream 1: Finance Control Hardening (Top Priority)
- [ ] **Maker-Checker Engine**
    - [ ] Design generic approval schema.
    - [ ] Implement for Post/Unpost/Close/Reopen actions.
- [ ] **Approval Matrices**
    - [ ] Define rules by Amount / Risk / Module.
- [ ] **Audit Trail**
    - [ ] Implement immutable event store for critical journal actions.
- [ ] **Period Control**
    - [ ] Refine period-end lock policies.
    - [ ] Define post-close adjustment protocol.

### Workstream 2: AP + Treasury + Procurement
- [x] **Vendor Management**
    - [x] Create Vendor Master entity.
    - [x] Vendor CRUD service & controller.
    - [x] Vendor type classification.
- [x] **AP Bills**
    - [x] Create Bill entity (Draft -> Approved -> Posted -> Paid).
    - [x] GL posting integration (AP Liability + Expense accounts).
- [x] **AP Payments**
    - [x] Create Payment entity & service.
    - [x] Payment GL integration (AP Liability debit, Cash/Bank credit).
    - [ ] Handle Remittance advice generation.
    - [ ] Implement Withholding Tax logic.
- [x] **Procurement (Internal Operations / MRO)**
    - *Note: For internal supplies (spare parts, consumables) and assets only. NOT for customer inventory.*
    - [x] Purchase Orders (Create, Issue, state machine).
    - [x] Goods Receipt Notes (GRN) — auto-creates inventory RECEIPT transactions (Internal Stock).
    - [x] PO status tracking (PARTIALLY_RECEIVED / RECEIVED).
    - [ ] Implement 2-way/3-way matching logic (PO → GRN → AP Bill).
- [ ] **Reconciliation**
    - [ ] Integrate Bank Reconciliation for AR Receipts.
    - [ ] Integrate Bank Reconciliation for AP Payments.
- [ ] **Cash Management**
    - [ ] Build Cash Forecasting (Inflows/Outflows, Due Ladders).

### Workstream 3: AR Maturity
- [ ] **Collections**
    - [ ] Build Collections module & Workbench.
    - [ ] Implement Dunning/Reminder workflows.
- [ ] **Disputes**
    - [ ] Implement Dispute / Credit Note / Debit Note lifecycle.
- [ ] **Credit Control**
    - [ ] Implement Customer Credit Limits & Exposure controls.
    - [ ] Automate credit hold triggers.

### Workstream 4: Reporting and Close Pack
- [ ] **Dashboards**
    - [ ] Build CFO Dashboard.
    - [ ] Build Controller Dashboard.
- [ ] **Data Architecture**
    - [ ] Design Reporting Mart with pre-aggregated balances.
- [ ] **Drill-down**
    - [ ] Implement full traceability: Statement Line -> Account -> Voucher -> Source Doc.
- [ ] **KPI Pack**
    - [ ] Margin by Customer/Item/Storage Class.
    - [ ] Inventory Carrying Cost.
    - [ ] Write-off/Expiry Loss Ratio.

### Workstream 5: Cold Store Domain Excellence (Customer Inventory / 3PL)
- [x] **Gate Operations (Inward/Outward)**
    - *Note: This is the core revenue-generating flow for storage customers.*
    - [x] Integrate **Inward Receipt (Gate Pass)**: Customer Goods -> Storage Locations (No Financial Value Ownership).
- [ ] **Quality & Compliance**
    - [ ] Implement Temperature Excursion tracking.
    - [ ] Build Compliance Logs.
    - [ ] Implement QA Release workflow (FEFO + Quarantine).
- [ ] **Costing**
    - [ ] Implement Utility/Power cost attribution to storage classes.

### Workstream 6: Cold Store Module Integrations Audit & Remediation
*Status: 100% Complete*
- [x] **General Ledger (GL)**: Assessed. Outward Gate Pass correctly builds AR Invoices. Posting them triggers `InvoiceGLService` to generate double-entry Vouchers mapping to `SERVICE_REVENUE`, `GST_PAYABLE`, and Customer AR. ✅ **Working**.
- [x] **Sales (AR)**: Assessed. Invoices are correctly linked to `customerId` and visible in the Accounts Receivable ledger. ✅ **Working**.
- [x] **Inventory**: Assessed. Cold Store `ColdStoreLot` properly maintains segregation from company-owned `inventory_items`. This correctly models 3PL (third-party logistics) rules. ✅ **Working**.
- [x] **Settings / Tax**: Assessed. `RentalBillingService` currently hardcodes GST (`18%`) and WHT (`4.5%`). ⚠️ **Gap Identified**.
    - **Solution**: Refactor `RentalBillingService` to inject and query global `SettingsService` or `TaxModule` for dynamic tax bracket retrieval.
- [x] **Purchases (AP)**: Assessed. Cold Store operations don't natively trigger AP (as customers bring their own goods), but utility bills (electricity for chillers) need mapping. ⚠️ **Gap Identified**.
    - **Complete Solution**: 
        1. Leverage the existing `cost_center_id` on the `ApBillLine` entity. 
        2. Automatically mirror each `Room` (Chamber) created in the Cold Store module as a `CostCenter` in the General Ledger. 
        3. When AP enters a Utility Bill for a Cold Store facility, the AP Clerk selects the corresponding Chamber Cost Center on the expense line item. 
        4. Develop a Month-End Allocation process that prorates this AP Expense across all active `ColdStoreLot` records residing in that Chamber based on their cubic capacity utilization (`netWeightKg`).
- [x] **Reports**: Assessed. No specialized analytical views exist for Cold Store operations. ⚠️ **Gap Identified**.
    - **Complete Solution**: Build three specialized analytical SQL Views / Jasper Reports:
        1. **Space Utilization**: `SUM(lot.netWeightKg)` grouped by `Chamber` divided by `Chamber.maxCapacity` to show idle refrigerated capacity.
        2. **Projected Accrual Revenue**: Aggregate `subtotal` from `RentalBillingService.calculateChargesForLot` for all `IN_STORAGE` lots to forecast upcoming invoice generation before month-end Outward passes.
        3. **Customer Stock Aging**: Calculate `CURRENT_DATE - inwardDate` for each lot to identify slow-moving customer stock occupying premium space.

---

## 📅 Execution Strategy

1.  **Start with P0**: These are critical risks. Address `PermissionsGuard` and DB Sequences immediately.
2.  **Parallel Workstream 1**: Begin designing the Maker-Checker engine as it impacts all modules.
3.  **Phase 2 Core**: Once P0 is stable, move to Workstream 2 (AP) as it's the biggest functional gap.
4.  **Remediation**: Execute Workstream 6 gaps (Tax rate parameterization) to finalize Cold Store robustness.

---

## 🛠️ ERP Stabilization Refactor (Audit Remediation)

### Phase 1: Database Hardening
- [x] Add strict explicit Foreign Keys.
  - [x] `inventory_transactions.lot_id` → `cold_store_lots.id`
  - [x] `inventory_balances.lot_id` → `cold_store_lots.id`
  - [x] Make `voucher_id` mandatory (NOT NULL) for posted AP Bills and Invoices.
- [x] Remove nullable status from `lot_id` throughout the system where possible.

### Phase 2: Transactional Fixes (Backend)
- [x] Pass `EntityManager` across service boundaries (Transaction Context).
- [x] Refactor `GRNService.complete` to pass the active `EntityManager` to `InventoryTransactionsService`.
- [x] Refactor `InvoiceGLService` and `PaymentGLService` to post vouchers synchronously within the parent transaction.

### Phase 3: Accounting & Workflow Logic
- [x] **Enforce Workflow Rules**: Ensure invoices check Outward Gate Pass status.
- [x] **Enforce WHT Constraints**: Adjust GL logic to use proportional WHT/Tax on CN/DN.
- [x] **Customer Credit Limit**: Ensure invoices explicitly verify Customer.creditLimit before finalization.
- [x] **Internal Consumption**: Allow issuance of internal inventory to expense accounts.
- [~] **Outward Gate Pass Inventory Link:** Update `OutwardGatePassService.approve` to invoke `InventoryTransactionsService` to reduce physical inventory. (Skipped due to parallel inventory systems: ColdStoreLots vs Procurement Items)
- [x] **Month-end Accruals:** Cron job to accrue `ACTIVE` Rental Billing Cycles at month-end. — `accrual-management.service.ts`
- [ ] **Revenue Segregation:** Split `SERVICE_REVENUE` into `STORAGE_REVENUE` and `HANDLING_REVENUE` and update `InvoiceGLService`.

### Phase 4: Frontend UI Locks
- [ ] Remove manual entry from `CreateInvoicePage.tsx` and `CreateBill.tsx`.
- [ ] AP Bills strictly generated from `GRN.items`.
- [ ] Storage Invoices strictly generated from `APPROVED` `OutwardGatePass` or month-end billing.
