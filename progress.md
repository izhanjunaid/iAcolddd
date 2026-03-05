# Invoice System Audit — Progress Report

**Date:** 2026-03-01 (updated 2026-03-02)  
**Scope:** Verify that Misc Charges, Credit Notes, Debit Notes, Invoice GL postings, and Rental Billing Cycles follow enterprise logic.

---

## 1. Invoice Creation (Gate Pass Flow) ✅ CORRECT

| Aspect | Expected | Actual |
|:---|:---|:---|
| Source | Outward Gate Pass approval only | ✅ `OutwardGatePassService.approve()` triggers invoice creation |
| Manual creation | Blocked | ✅ `POST /invoices/billing` throws `ForbiddenException` |
| GL Voucher | Created when invoice marked SENT | ✅ `executeMarkAsSent()` → `InvoiceGLService.createInvoiceVoucher()` inside a transaction |
| Double-entry | DR Customer AR, CR Revenue, CR GST, DR WHT | ✅ Verified in `invoice-gl.service.ts` lines 23-145 |
| Voucher posted | Auto-posted immediately | ✅ `vouchersService.postVoucher()` called after create |
| Atomic | GL failure rolls back status change | ✅ Error is re-thrown inside transaction |

**Verified in DB:** INV-2026-0014 → SI-2026-0001 (DR 236, CR 200+36, balanced ✅)

---

## 2. Credit Note (CN) ✅ CORRECT

| Aspect | Expected | Actual |
|:---|:---|:---|
| Creates new invoice? | ✅ Yes — separate CREDIT_NOTE type | ✅ `invoiceType: InvoiceType.CREDIT_NOTE` |
| Modifies original invoice? | Yes — reduces `balanceDue`, adds to `creditsApplied` | ✅ Lines 312-328 |
| GL Voucher | DR Sales Return, CR Customer AR | ✅ `PaymentGLService.createCreditNoteVoucher()` lines 115-212 |
| Also handles GST/WHT reversal | Yes | ✅ Proportional split via ratio (lines 260-264) |
| Maker-Checker required? | No — immediate | ✅ No approval flow |
| CN Status | PAID immediately | ✅ `status: InvoiceStatus.PAID` (recognized instantly) |

**Finding:** CN can exceed balance due (strict check removed at line 257-258). This allows **credit balance** — customer gets more credit than owed. This is intentional per code comment.

---

## 3. Debit Note (DN) ✅ CORRECT

| Aspect | Expected | Actual |
|:---|:---|:---|
| Creates new invoice? | ✅ Yes — separate DEBIT_NOTE type | ✅ `invoiceType: InvoiceType.DEBIT_NOTE` |
| Modifies original invoice? | ❌ No — standalone | ✅ Original invoice untouched (no update to `balanceDue`) |
| GL Voucher | DR Customer AR, CR Revenue | ✅ `PaymentGLService.createDebitNoteVoucher()` lines 214-303 |
| Also handles GST/WHT | Yes | ✅ DR WHT Receivable, CR GST Payable included |
| Maker-Checker required? | No — immediate | ✅ No approval flow |
| DN Status | SENT immediately | ✅ `status: InvoiceStatus.SENT`, `balanceDue: dto.amount` |

**Finding:** DN does NOT update the original invoice. This is semantically correct — the DN is a standalone claim against the customer. However, it means the original invoice total stays the same and the DN must be paid separately.

---

## 4. Payment Recording ✅ CORRECT

| Aspect | Expected | Actual |
|:---|:---|:---|
| GL Voucher | DR Cash/Bank, CR Customer AR | ✅ `PaymentGLService.createPaymentVoucher()` lines 27-113 |
| Payment modes | Cash, Cheque, Online Transfer | ✅ `getCashBankAccount()` maps mode → GL config key |
| Updates invoice | `amountPaid` increases, `balanceDue` decreases | ✅ Lines 663-689 |
| Status transition | SENT → PARTIALLY_PAID → PAID | ✅ Lines 681-686 |
| Atomic | GL failure rolls back payment | ✅ Error thrown inside transaction |
| Over-payment blocked | Yes | ✅ `amount > balanceDue` check at line 659 |

---

## 5. Miscellaneous Charges ✅ RE-IMPLEMENTED

> [!NOTE]
> Backend code was missing from previous session. Re-implemented on 2026-03-01.

| Component | Status |
|:---|:---|
| `add-misc-charge.dto.ts` | ✅ Created |
| `dto/index.ts` export | ✅ Updated |
| `invoices.controller.ts` — `POST /:id/add-charge` | ✅ Added |
| `invoices.service.ts` — `requestAddCharge()` | ✅ Added |
| `invoices.service.ts` — `executeAddCharge()` | ✅ Added |
| `executeApprovalAction()` — `ADD_CHARGE` case | ✅ Added |
| DB enum — `ADD_CHARGE` in `approval_action_enum` | ✅ Migrated |

---

## 6. GL Account Configuration ✅

| Config Key | Used By |
|:---|:---|
| `SERVICE_REVENUE` | Invoice GL, Debit Note GL |
| `GST_PAYABLE` | Invoice GL, Credit Note GL, Debit Note GL |
| `WHT_RECEIVABLE` | Invoice GL, Credit Note GL, Debit Note GL |
| `SALES_RETURN` | Credit Note GL |
| `CASH_ACCOUNT` | Payment GL (Cash mode) |
| `BANK_ACCOUNT` | Payment GL (Cheque/Transfer mode) |

---

## 7. Partial Outward Billing ✅ FIXED

- **Fix Applied:** `RentalBillingCycle` now has a `billedQuantity` property. `RentalBillingService` generates charges proportionally using the actual items leaving. `OutwardGatePassService` keeps the billing cycle `ACTIVE` if bags remain.

---

## 8. Rental Billing Cycles — Full Module Audit

### 8.1 Lifecycle (How It Works Today)

```
Inward Gate Pass (DRAFT) 
  → Approve 
  → Creates: Lot (IN_STORAGE) + Billing Cycle (ACTIVE) + Kandari + Bardana

Outward Gate Pass (DRAFT)
  → Approve (atomic transaction) 
  → Calculates charges (proportional to bags leaving)
  → Creates Invoice (DRAFT) + line items
  → Updates cycle: billedQuantity += bagsReleased
  → If remainingBags <= 0 → cycle = INVOICED
  → If remainingBags >  0 → cycle stays ACTIVE
  → Creates Kandari (outward) + Bardana (returned)
  → Updates lot: bagsOut++, status = PARTIALLY_RELEASED or RELEASED
```

### 8.2 Entity Design

| Field | Purpose | Assessment |
|:---|:---|:---|
| `lotId` / `customerId` | FK links | ✅ Correct |
| `billingStartDate` | Set from inward date | ✅ |
| `billingEndDate` | Set when cycle closes | ✅ |
| `daysStored` | Calculated at close time | ✅ |
| `bagsBilled` / `weightBilledKg` | Snapshot of last billing | ⚠️ Overwrites on each partial — see Finding #1 |
| `billedQuantity` | Cumulative tracker | ✅ New, correct |
| `rateApplied` | Frozen rate from lot | ✅ |
| `billingUnit` | PER_BAG or PER_KG | ✅ |
| `storageCharges` → `totalAmount` | Financial snapshot | ⚠️ Overwrites on each partial — see Finding #1 |
| `invoiceId` | Links to invoice | ⚠️ Only stores LAST invoice — see Finding #2 |
| `outwardGatePassId` | Links to gate pass | ⚠️ Only stores LAST gate pass — see Finding #2 |
| `status` | ACTIVE / CLOSED / INVOICED | ⚠️ CLOSED never used — see Finding #3 |

### 8.3 Billing Calculation Engine

| Mode | Formula | Status |
|:---|:---|:---|
| PER_BAG (seasonal) | `rate × quantityToBill` | ✅ Correct — one-time charge per bag, days don't matter |
| PER_KG (daily) | `rate × proportionalWeight × days` | ✅ Correct, rounds to 3dp |
| Tax (GST) | Dynamic via `TaxService` | ✅ |
| Tax (WHT) | Dynamic via `TaxService` | ✅ (disabled by default) |
| WHT formula | `total = subtotal + GST − WHT` | ✅ WHT is deducted, not added |
| Days stored | `Math.ceil(diff / msPerDay)`, min 1 | ✅ Always rounds UP |

### 8.4 Findings & Improvement Opportunities

#### Finding #1: ⚠️ Cycle financial fields overwrite on each partial outward
When a second Outward Gate Pass is approved for the same lot, the cycle's `storageCharges`, `totalAmount`, `bagsBilled`, etc. are **overwritten** with the new partial amounts, losing the history of the first partial billing.

**Impact:** The cycle record only reflects the *last* partial billing, not the cumulative total.
**Recommendation:** Either accumulate these fields (add to existing), or accept that the cycle is a "header" and the invoices themselves are the source of truth for financial amounts.

#### Finding #2: ⚠️ Single `invoiceId` and `outwardGatePassId` — only stores the last one
With partial billing, multiple invoices can be generated against a single cycle. But `invoiceId` and `outwardGatePassId` are single UUID columns — they only store the **last** linked invoice/gate pass.

**Impact:** No direct link from the cycle to earlier partial invoices.
**Recommendation:** Either create a junction table (`cycle_invoices`) or accept that the invoice references are tracked via the `Invoice.referenceNumber` (which stores the gate pass number).

#### Finding #3: ⚠️ `CLOSED` status is defined but never used
The `RentalCycleStatus` enum has `ACTIVE`, `CLOSED`, `INVOICED` — but the code only ever transitions from `ACTIVE` → `INVOICED`. `CLOSED` is dead code.

**Recommendation:** Either remove it or define the semantics: e.g., `CLOSED` = cycle ended but invoice not yet generated (manual close scenario).

#### Finding #4: ✅ Accrued charges dashboard works correctly
`ColdStoreLotService.getLotWithAccruedCharges()` calculates live charges for IN_STORAGE and PARTIALLY_RELEASED lots. This is correct and useful for the dashboard.

#### Finding #5: ⚠️ No periodic/recurring billing mechanism
Currently, billing ONLY happens on Outward Gate Pass approval. There is no cron job or scheduled task to generate monthly invoices for goods still in storage. For PER_KG billing, this means the customer is only billed when they take goods out — not on a monthly cycle.

**Impact:** If goods sit in storage for 6 months, the cold store owner has no cash flow until the customer decides to remove them.
**Recommendation:** Add a monthly billing cron job that calculates accrued charges for all ACTIVE cycles and generates interim invoices.

#### Finding #6: ⚠️ Legacy data inconsistency
5 of the 6 INVOICED cycles have `billed_quantity = 0` (created before the partial billing fix), and their lots are PARTIALLY_RELEASED with `bags_out = 50` out of `bags_in = 100`. These lots have no ACTIVE cycle remaining — the 50 remaining bags are essentially "orphaned" from a billing perspective.

**Impact:** These 50-bag remainders cannot be billed through the normal outward flow because their cycle is already INVOICED and no new ACTIVE cycle was created.
**Recommendation:** A data repair script or manual cycle creation for these lots.

### 8.5 Summary Verdict

| Aspect | Rating |
|:---|:---|
| **Core billing logic** | ✅ Correct — formulas, tax, proportional math all sound |
| **Lifecycle (inward → outward)** | ✅ Correct — atomic transactions, proper status management |
| **Partial billing** | ✅ Fixed — proportional calculation + cycle stays open |
| **Data model for partials** | ⚠️ Needs improvement — overwrites instead of accumulates |
| **Recurring/periodic billing** | ❌ Missing — no cron/scheduled billing job |
| **Legacy data cleanup** | ⚠️ Needed — 5 orphaned lots from pre-fix era |
