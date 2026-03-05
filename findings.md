# Findings: Invoice Lockdown Research

## Industry Research (2026-02-25)

### SAP EWM + TM
- Uses Warehouse Billing Measurement Requests (WBMR) that auto-snapshot stock, deliveries, and tasks
- Invoices are generated from Forwarding Settlement Documents, not manual entry
- Event-based triggers like "proof of delivery" auto-generate invoices
- Manual billing document creation exists ONLY for exceptions (low-accuracy automated extractions routed to human review)

### Extensiv (3PL Central)
- SmartScan captures every billable event in real-time
- Invoices auto-generated on configurable cycles (daily/weekly/monthly)
- Client-specific rate cards applied automatically
- No standalone "Create Invoice" page; billing is ALWAYS derived from operational events

### Made4Net (WarehouseExpert)
- Built-in billing engine auto-tracks all services
- Supports activity-based, time-based, and UOM billing
- Manual override exists but ONLY as an adjustment layer on top of auto-generated charges, not as a parallel entry point
- Charges can be reviewed at any stage of the process

### Hopstack
- Activity-based billing captured automatically
- Client-specific rate cards
- Invoices generated from captured operational data only

### Logiwa / Zenventory
- All warehouse activities logged and billed automatically
- Invoices are outputs of the WMS billing engine, not manually created

### Key Insight: The "Adjustment Layer" Pattern
> Enterprise systems keep a controlled "manual adjustment" mechanism — not a full "Create Invoice" page, but the ability to add ad-hoc charges (demurrage, damage penalties, special handling) on top of auto-generated invoices.

---

## Codebase Analysis (2026-02-25)

### Invoice Generation Entry Points Found
1. **`InvoicesService.createInvoiceFromBilling()`** — Creates invoice from `StorageBillingService` calculation. Already requires Gate Pass reference (`GPO-` prefix). Located in `backend/src/invoices/services/invoices.service.ts`.
2. **`OutwardGatePassService`** — Located in `backend/src/cold-store/services/outward-gate-pass.service.ts`. Need to verify if approval auto-triggers invoice.
3. **`RentalBillingService`** — Located in `backend/src/cold-store/services/rental-billing.service.ts`. Handles periodic/recurring rental calculations.

### Billing Calculation Engines
1. **`StorageBillingService`** (`backend/src/billing/services/storage-billing.service.ts`) — Calculates charges based on weight × rate × days. Uses rate hierarchy (Explicit → Customer → Category → Duration → Fallback).
2. **`RentalBillingService`** (`backend/src/cold-store/services/rental-billing.service.ts`) — Need to analyze. Appears to handle periodic cold store rental billing.

### Frontend Pages to Audit
- `CreateInvoicePage.tsx` — Manual 3-step wizard (Select Customer → Calculator → Review). **This is the problem page.** It uses `StorageBillingCalculator` component and calls `invoiceService.createInvoiceFromBilling()`. The reference number field is OPTIONAL (placeholder says `PO-12345, GDN-67890`), meaning users can create invoices without any gate pass link.
- `InvoicesPage.tsx` — Invoice list page. Shows all invoices. Has a "Create Invoice" button linking to `/invoices/create`.
- Route: `/invoices/create` → `CreateInvoicePage` (requires `invoices.create` permission)
- Route: `/invoices` → `InvoicesPage` (requires `invoices.read` permission)

### Critical Discovery: The Gate Pass Auto-Generates Invoices!
`OutwardGatePassService.approve()` (lines 107-303) already creates invoices ATOMICALLY inside a transaction:
1. Calculates rental charges via `RentalBillingService.calculateChargesForLot()`
2. Generates invoice number via `SequencesService`
3. Creates `Invoice` entity with `InvoiceType.STORAGE`, `InvoiceStatus.DRAFT`
4. Creates detailed `InvoiceLineItem` entries (storage, handling, GST)
5. Closes the `RentalBillingCycle` and links it to the invoice
6. Creates Kandari (weighing) and Bardana (bag return) records
7. Updates lot status (bags_out, PARTIALLY_RELEASED / RELEASED)
8. Links invoice to gate pass (`gatePass.invoiceId = savedInvoice.id`)

**This means the system ALREADY has the correct enterprise flow. The `CreateInvoicePage.tsx` is a redundant, dangerous parallel path that must be removed.**

### RentalBillingService Analysis
- Supports two billing modes:
  - `PER_BAG`: Seasonal one-time charge = `rate_per_bag × bags_in` (days don't matter)
  - `PER_KG`: Daily accrual = `rate_per_kg_per_day × net_weight_kg × days_stored`
- Uses `TaxService` for dynamic GST/WHT calculation (not hardcoded)
- Days stored: always rounded UP, minimum 1 day
- This is the CORRECT billing engine used by the Gate Pass flow

### StorageBillingService vs RentalBillingService
| Feature | `StorageBillingService` | `RentalBillingService` |
|:---|:---|:---|
| Used by | `CreateInvoicePage` (manual flow) | `OutwardGatePassService` (gate pass flow) |
| Rate source | DB config with fallback hierarchy | Lot entity (`ratePerKgPerDay`, `ratePerBagPerSeason`) |
| Billing modes | Daily only | PER_BAG (seasonal) + PER_KG (daily) |
| Tax calculation | `TaxService` | `TaxService` |
| Lot awareness | None — works with raw numbers | Full — knows lot, customer, billing cycle |

**Verdict: `RentalBillingService` is the superior, lot-aware engine. `StorageBillingService` is a legacy calculator.**

### Backend Controller Analysis
`InvoicesController` has these relevant endpoints:
- `POST /invoices/billing` → `createFromBilling()` — This is the manual creation endpoint. **Should be removed or heavily guarded.**
- `PATCH /invoices/:id/sent` → `markAsSent()` — Maker-Checker approval trigger.
- `POST /invoices/:id/payment` → `recordPayment()` — Payment recording.
- `POST /invoices/:id/credit-note` → `createCreditNote()` — CN creation.
- `POST /invoices/:id/debit-note` → `createDebitNote()` — DN creation.

---

## GAAP & IRS Compliance Review (2026-03-02)

### 1. Structural Checks
- CoA framework follows exactly 5 standard categories with Assets, Liabilities, Equity, Revenue, and Expenses (1-xxxx to 5-xxxx). **However**, Customers are placed in `02`, causing a parallel root tree that violates strict categorization.
- Most accounts fall cleanly into hierarchy, BUT `Cold Storage Revenue` and `Service Revenue` exist as DETAIL accounts mapping directly to child accounts, breaking standard tree mapping where DETAIL accounts cannot be parents.

### 2. IRS Readiness
- Standard operational income and expenses are split via codes (4 vs 5).
- Payroll logic lacks corresponding liability structures (no Employee Benefits or dedicated withholding account mappings).
- Critical failure: `GST_PAYABLE` and `WHT_RECEIVABLE` share the exact same UUID ledger pointer as `inventory_asset`. IRS audits would fail immediately over combined asset-tax reporting. No `Income Tax Payable` exists.

### 3. GAAP / Accrual Accounting
- **Missing accruals:** Deferred (Unearned) Revenue, Accrued Expenses, Prepaid Expenses are fully absent.
- **Contra Accounts:** `Sales Returns` exists as a debit (correct), but `Accumulated Depreciation` does not exist.
- Inventory is partially ready (COGS configuration exists) but crippled by the UUID mapping overlap with GST.
- Retained earnings account exists physically as `3-0001-0002` but is unconnected to global configuration for EOFY closing routines.

**Conclusion: High Risk. 34/100 readiness score.**
