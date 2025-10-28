# 📦 **Phase 2: Inventory Sub-Ledger - Implementation Plan**

**System:** Advance ERP - Cold Storage Management  
**Phase:** 2 of 7 (Inventory Sub-Ledger)  
**Duration:** 3 weeks  
**Start Date:** October 26, 2025  
**Priority:** 🔴 **CRITICAL - Core Business Function**

---

## 🎯 **Phase 2 Overview**

Inventory management is the **heart of cold storage operations**. This phase builds a complete inventory sub-ledger with FIFO costing, automated GL integration, and real-time stock tracking.

### **Why Critical for Cold Storage:**
- **Multi-Customer Inventory:** Track goods owned by different customers in same warehouse
- **Temperature-Sensitive Goods:** FIFO costing essential for perishable items
- **Complex Operations:** Receipts, dispatches, transfers, adjustments all need accounting integration
- **Profitability Analysis:** Accurate COGS calculation per customer/product
- **Regulatory Compliance:** Full audit trail for food storage operations

---

## 🏗️ **System Architecture**

### **Inventory Sub-Ledger Structure:**
```
┌─────────────────────────────────────────┐
│            GENERAL LEDGER               │
│     (Inventory Control Account)         │
└─────────────────┬───────────────────────┘
                  │ (Automated Posting)
                  ▼
┌─────────────────────────────────────────┐
│         INVENTORY SUB-LEDGER            │
├─────────────────────────────────────────┤
│ • Real-time Stock Balances              │
│ • FIFO Cost Layers                      │
│ • Transaction History                   │
│ • Customer/Warehouse Tracking           │
│ • Automated GL Integration              │
└─────────────────────────────────────────┘
```

### **Core Entities Relationship:**
```
InventoryItem (Master Data)
    ↓ (One-to-Many)
InventoryTransaction (All Movements)
    ↓ (Aggregates to)
InventoryBalance (Current Stock by Location/Customer)
    ↓ (Detailed by)
InventoryCostLayer (FIFO Costing)
```

---

## 📊 **Database Schema Design**

### **1. Inventory Items Master**
```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) NOT NULL,  -- 'KG', 'TON', 'PALLET', 'BAGS'
    
    -- Product specifications
    is_perishable BOOLEAN DEFAULT FALSE,
    shelf_life_days INTEGER,
    min_temperature DECIMAL(5,2),  -- Celsius
    max_temperature DECIMAL(5,2),  -- Celsius
    
    -- Costing
    standard_cost DECIMAL(18,4) DEFAULT 0,
    last_cost DECIMAL(18,4) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
```

### **2. Inventory Transactions (All Movements)**
```sql
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL,  -- 'RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT'
    transaction_date DATE NOT NULL,
    reference_type VARCHAR(50),  -- 'GRN', 'GDN', 'TRANSFER', 'ADJUSTMENT'
    reference_id UUID,
    reference_number VARCHAR(50),
    
    -- Item and location
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    customer_id UUID REFERENCES customers(id),  -- Owner of goods
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    room_id UUID REFERENCES rooms(id),
    
    -- From/To (for transfers)
    from_warehouse_id UUID REFERENCES warehouses(id),
    from_room_id UUID REFERENCES rooms(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    to_room_id UUID REFERENCES rooms(id),
    
    -- Quantity and costing
    quantity DECIMAL(18,3) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL,
    total_cost DECIMAL(18,2) NOT NULL,
    
    -- Lot/batch tracking
    lot_number VARCHAR(50),
    batch_number VARCHAR(50),
    expiry_date DATE,
    manufacture_date DATE,
    
    -- GL integration
    is_posted_to_gl BOOLEAN DEFAULT FALSE,
    gl_voucher_id UUID REFERENCES voucher_master(id),
    
    -- Audit
    fiscal_period_id UUID REFERENCES fiscal_periods(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    notes TEXT
);

CREATE INDEX idx_inv_trans_item ON inventory_transactions(item_id);
CREATE INDEX idx_inv_trans_customer ON inventory_transactions(customer_id);
CREATE INDEX idx_inv_trans_warehouse ON inventory_transactions(warehouse_id);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);
```

### **3. Current Stock Balances**
```sql
CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Item and location
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    customer_id UUID REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    room_id UUID REFERENCES rooms(id),
    lot_number VARCHAR(50),
    
    -- Quantities
    quantity_on_hand DECIMAL(18,3) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(18,3) NOT NULL DEFAULT 0,  -- For pending orders
    quantity_available DECIMAL(18,3) NOT NULL DEFAULT 0,  -- On hand - Reserved
    
    -- Costing
    weighted_average_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_value DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- Last movement
    last_movement_date DATE,
    last_movement_type VARCHAR(20),
    
    -- Audit
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(item_id, customer_id, warehouse_id, room_id, lot_number)
);

CREATE INDEX idx_inv_bal_item ON inventory_balances(item_id);
CREATE INDEX idx_inv_bal_customer ON inventory_balances(customer_id);
CREATE INDEX idx_inv_bal_warehouse ON inventory_balances(warehouse_id);
```

### **4. FIFO Cost Layers**
```sql
CREATE TABLE inventory_cost_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Item and location
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    customer_id UUID REFERENCES customers(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    room_id UUID REFERENCES rooms(id),
    lot_number VARCHAR(50),
    
    -- Receipt details
    receipt_date DATE NOT NULL,
    receipt_reference VARCHAR(50),
    receipt_transaction_id UUID REFERENCES inventory_transactions(id),
    
    -- Layer quantities
    original_quantity DECIMAL(18,3) NOT NULL,
    remaining_quantity DECIMAL(18,3) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL,
    
    -- Status
    is_fully_consumed BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_layers_item ON inventory_cost_layers(item_id);
CREATE INDEX idx_cost_layers_fifo ON inventory_cost_layers(item_id, customer_id, warehouse_id, receipt_date);
CREATE INDEX idx_cost_layers_remaining ON inventory_cost_layers(remaining_quantity) WHERE remaining_quantity > 0;
```

### **5. Supporting Tables**
```sql
-- Warehouses (if not exists)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms/Zones within warehouses
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    temperature_range VARCHAR(50),  -- e.g., "-18°C to -15°C"
    capacity_tons DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(warehouse_id, code)
);
```

---

## 🔄 **Business Logic & Workflows**

### **1. Goods Receipt (GRN) Flow**
```
Customer brings goods → System creates:

1. InventoryTransaction (RECEIPT)
   - Type: RECEIPT
   - Reference: GRN-2025-001
   - Quantity: +100 tons
   - Unit Cost: $500/ton
   - Total Cost: $50,000

2. InventoryBalance (Updated)
   - Quantity On Hand: +100 tons
   - Weighted Average Cost: Recalculated
   - Total Value: Updated

3. InventoryCostLayer (New FIFO Layer)
   - Original Quantity: 100 tons
   - Remaining Quantity: 100 tons
   - Unit Cost: $500/ton
   - Receipt Date: Today

4. Automatic GL Posting:
   DR: Inventory (Asset)           $50,000
       CR: GRN Payable (Liability)         $50,000
```

### **2. Goods Dispatch (GDN) Flow**
```
Customer takes goods → System creates:

1. FIFO Cost Calculation
   - Find oldest cost layers first
   - Consume from oldest to newest
   - Calculate accurate COGS

2. InventoryTransaction (ISSUE)
   - Type: ISSUE
   - Reference: GDN-2025-001
   - Quantity: -60 tons
   - Unit Cost: FIFO calculated cost
   - Total Cost: FIFO total

3. InventoryBalance (Updated)
   - Quantity On Hand: -60 tons
   - Recalculate weighted average
   - Update total value

4. InventoryCostLayer (Consume)
   - Update remaining quantities
   - Mark layers as consumed if empty

5. Automatic GL Posting:
   DR: Cost of Goods Sold (Expense)  $FIFO_Cost
       CR: Inventory (Asset)                    $FIFO_Cost
   
   DR: Accounts Receivable (Asset)   $Storage_Revenue
       CR: Storage Revenue (Revenue)            $Storage_Revenue
```

### **3. Stock Transfer Flow**
```
Move goods between warehouses/rooms:

1. InventoryTransaction (TRANSFER)
   - Type: TRANSFER
   - From: Warehouse A, Room 1
   - To: Warehouse B, Room 2
   - No cost change (same customer)

2. InventoryBalance (From Location)
   - Quantity On Hand: -50 tons

3. InventoryBalance (To Location)
   - Quantity On Hand: +50 tons

4. InventoryCostLayer (Update)
   - Move cost layers to new location
   - Maintain FIFO integrity

5. No GL Impact (internal movement)
```

### **4. Stock Adjustment Flow**
```
Physical count differences:

1. InventoryTransaction (ADJUSTMENT)
   - Type: ADJUSTMENT
   - Quantity: +/- difference
   - Reason: Shrinkage/Damage/Found

2. InventoryBalance (Updated)
   - Adjust quantity on hand

3. InventoryCostLayer (Adjust)
   - For losses: consume from oldest layers
   - For gains: create new layer at standard cost

4. Automatic GL Posting:
   For Loss:
   DR: Inventory Loss (Expense)    $Lost_Value
       CR: Inventory (Asset)                $Lost_Value
   
   For Gain:
   DR: Inventory (Asset)           $Gain_Value
       CR: Inventory Gain (Revenue)        $Gain_Value
```

---

## 💰 **FIFO Costing Engine**

### **Algorithm Implementation:**
```typescript
interface FIFOCalculation {
  totalCost: number;
  costBreakdown: {
    layerId: string;
    quantityUsed: number;
    unitCost: number;
    totalCost: number;
  }[];
  remainingQuantity: number;
}

class FIFOCostingService {
  async calculateFIFOCost(
    itemId: string,
    customerId: string,
    warehouseId: string,
    quantityToIssue: number,
    lotNumber?: string
  ): Promise<FIFOCalculation> {
    
    // 1. Get available cost layers (oldest first)
    const layers = await this.getAvailableCostLayers(
      itemId, customerId, warehouseId, lotNumber
    );
    
    let remainingToIssue = quantityToIssue;
    let totalCost = 0;
    const costBreakdown = [];
    
    // 2. Consume from oldest layers first
    for (const layer of layers) {
      if (remainingToIssue <= 0) break;
      
      const quantityFromThisLayer = Math.min(
        remainingToIssue, 
        layer.remainingQuantity
      );
      
      const costFromThisLayer = quantityFromThisLayer * layer.unitCost;
      
      costBreakdown.push({
        layerId: layer.id,
        quantityUsed: quantityFromThisLayer,
        unitCost: layer.unitCost,
        totalCost: costFromThisLayer
      });
      
      totalCost += costFromThisLayer;
      remainingToIssue -= quantityFromThisLayer;
    }
    
    // 3. Check if we have enough stock
    if (remainingToIssue > 0) {
      throw new InsufficientStockException(
        `Not enough stock. Required: ${quantityToIssue}, Available: ${quantityToIssue - remainingToIssue}`
      );
    }
    
    return {
      totalCost,
      costBreakdown,
      remainingQuantity: remainingToIssue
    };
  }
}
```

---

## 🔗 **GL Integration Points**

### **Account Mapping:**
```typescript
interface InventoryGLAccounts {
  inventoryAsset: string;        // "1-0001-0001-0004 - Inventory"
  costOfGoodsSold: string;       // "5-0001-0003-0001 - Cost of Goods Sold"
  grnPayable: string;           // "2-0001-0001-0002 - GRN Payable"
  inventoryLoss: string;        // "5-0001-0002-0001 - Inventory Loss"
  inventoryGain: string;        // "4-0001-0002-0001 - Inventory Gain"
  storageRevenue: string;       // "4-0001-0001-0001 - Storage Revenue"
  accountsReceivable: string;   // "1-0001-0001-0003 - Accounts Receivable"
}
```

### **Automatic Journal Entry Generation:**
```typescript
class InventoryGLService {
  async postReceiptToGL(transaction: InventoryTransaction): Promise<void> {
    const voucher = await this.vouchersService.create({
      voucherType: VoucherType.SYSTEM_GENERATED,
      voucherDate: transaction.transactionDate,
      description: `Inventory Receipt - ${transaction.referenceNumber}`,
      fiscalPeriodId: transaction.fiscalPeriodId,
      lineItems: [
        {
          accountCode: this.glAccounts.inventoryAsset,
          debit: transaction.totalCost,
          credit: 0,
          description: `Receipt: ${transaction.item.name}`,
          costCenterId: transaction.warehouse.costCenterId
        },
        {
          accountCode: this.glAccounts.grnPayable,
          debit: 0,
          credit: transaction.totalCost,
          description: `GRN Payable: ${transaction.referenceNumber}`
        }
      ]
    }, 'SYSTEM');
    
    // Link voucher to transaction
    await this.updateTransaction(transaction.id, {
      isPostedToGl: true,
      glVoucherId: voucher.id
    });
  }
}
```

---

## 📊 **Reports & Analytics**

### **1. Stock on Hand Report**
```sql
SELECT 
    ii.sku,
    ii.name AS item_name,
    c.name AS customer_name,
    w.name AS warehouse_name,
    r.name AS room_name,
    ib.lot_number,
    ib.quantity_on_hand,
    ib.quantity_reserved,
    ib.quantity_available,
    ib.weighted_average_cost,
    ib.total_value,
    ib.last_movement_date,
    CASE 
        WHEN ii.is_perishable AND ib.last_movement_date < NOW() - INTERVAL '90 days'
        THEN 'Slow Moving'
        WHEN ib.quantity_on_hand <= 0
        THEN 'Out of Stock'
        ELSE 'Active'
    END AS status
FROM inventory_balances ib
JOIN inventory_items ii ON ii.id = ib.item_id
LEFT JOIN customers c ON c.id = ib.customer_id
JOIN warehouses w ON w.id = ib.warehouse_id
LEFT JOIN rooms r ON r.id = ib.room_id
WHERE ib.quantity_on_hand > 0
ORDER BY ii.sku, c.name, w.name;
```

### **2. Inventory Valuation Report**
```sql
SELECT 
    w.name AS warehouse_name,
    ii.category,
    SUM(ib.quantity_on_hand) AS total_quantity,
    SUM(ib.total_value) AS total_value,
    AVG(ib.weighted_average_cost) AS avg_cost
FROM inventory_balances ib
JOIN inventory_items ii ON ii.id = ib.item_id
JOIN warehouses w ON w.id = ib.warehouse_id
WHERE ib.quantity_on_hand > 0
GROUP BY w.name, ii.category
ORDER BY total_value DESC;
```

### **3. Inventory Movement Summary**
```sql
SELECT 
    it.transaction_date,
    it.transaction_type,
    it.reference_number,
    ii.sku,
    ii.name AS item_name,
    c.name AS customer_name,
    w.name AS warehouse_name,
    it.quantity,
    it.unit_cost,
    it.total_cost,
    CASE 
        WHEN it.transaction_type IN ('RECEIPT', 'ADJUSTMENT') AND it.quantity > 0 
        THEN it.quantity 
        ELSE 0 
    END AS quantity_in,
    CASE 
        WHEN it.transaction_type IN ('ISSUE', 'ADJUSTMENT') AND it.quantity < 0 
        THEN ABS(it.quantity) 
        ELSE 0 
    END AS quantity_out
FROM inventory_transactions it
JOIN inventory_items ii ON ii.id = it.item_id
LEFT JOIN customers c ON c.id = it.customer_id
JOIN warehouses w ON w.id = it.warehouse_id
WHERE it.transaction_date BETWEEN :fromDate AND :toDate
ORDER BY it.transaction_date DESC, it.created_at DESC;
```

---

## 🛠️ **Implementation Phases**

### **Week 1: Foundation (Days 1-5)**
**Day 1-2: Database & Entities**
- [ ] Create database migrations
- [ ] Create TypeORM entities
- [ ] Create enums and interfaces
- [ ] Set up basic validation

**Day 3-4: Core Services**
- [ ] InventoryItemsService (CRUD)
- [ ] Basic InventoryTransactionsService
- [ ] InventoryBalancesService

**Day 5: Testing Foundation**
- [ ] Unit tests for services
- [ ] Database integration tests
- [ ] API endpoint testing

### **Week 2: Business Logic (Days 6-10)**
**Day 6-7: FIFO Engine**
- [ ] FIFO costing algorithm
- [ ] Cost layer management
- [ ] Stock availability checking

**Day 8-9: GL Integration**
- [ ] Automatic journal entry generation
- [ ] Account mapping configuration
- [ ] Transaction posting logic

**Day 10: Advanced Features**
- [ ] Stock transfers
- [ ] Stock adjustments
- [ ] Lot/batch tracking

### **Week 3: Frontend & Reports (Days 11-15)**
**Day 11-12: Frontend Components**
- [ ] Inventory items management
- [ ] Stock receipt/issue forms
- [ ] Stock balance views

**Day 13-14: Reports**
- [ ] Stock on hand report
- [ ] Inventory valuation report
- [ ] Movement history report

**Day 15: Testing & Integration**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation updates

---

## 🎯 **Success Criteria**

After Phase 2 completion, the system should:

### **Functional Requirements:**
- [ ] ✅ Track inventory by item, customer, warehouse, room
- [ ] ✅ Record all inventory movements (receipts, issues, transfers, adjustments)
- [ ] ✅ Calculate accurate FIFO costs for all issues
- [ ] ✅ Maintain real-time stock balances
- [ ] ✅ Automatically post all movements to General Ledger
- [ ] ✅ Generate comprehensive inventory reports
- [ ] ✅ Support lot/batch tracking for traceability

### **Technical Requirements:**
- [ ] ✅ All database tables created and indexed
- [ ] ✅ TypeORM entities with proper relationships
- [ ] ✅ RESTful APIs for all operations
- [ ] ✅ Data validation and error handling
- [ ] ✅ Audit trails for all transactions
- [ ] ✅ Integration with existing GL system

### **Business Requirements:**
- [ ] ✅ Accurate inventory valuation at any point in time
- [ ] ✅ Customer-wise profitability analysis capability
- [ ] ✅ Warehouse efficiency tracking
- [ ] ✅ Compliance with food storage regulations
- [ ] ✅ Seamless integration with existing workflows

---

## 🚨 **Risk Mitigation**

### **Technical Risks:**
1. **FIFO Complexity** → Start with simple implementation, add complexity gradually
2. **Performance** → Proper indexing, query optimization, caching strategies
3. **Data Integrity** → Database constraints, transaction management, validation

### **Business Risks:**
1. **Data Migration** → Plan migration from existing systems carefully
2. **User Adoption** → Comprehensive training, intuitive UI design
3. **Integration Issues** → Thorough testing with existing GL system

### **Operational Risks:**
1. **Downtime** → Implement during low-activity periods
2. **Data Loss** → Comprehensive backup strategies
3. **Performance Degradation** → Load testing, monitoring

---

## 📞 **Next Steps**

**Ready to begin implementation!** 🚀

**Phase 2 Kickoff:**
1. ✅ Create database migrations
2. ✅ Build TypeORM entities  
3. ✅ Implement core services
4. ✅ Add FIFO costing engine
5. ✅ Integrate with GL system
6. ✅ Build frontend components
7. ✅ Create reports
8. ✅ Test end-to-end

**This will transform your cold storage operations with professional inventory management and automated accounting integration!** 🏭✨

---

**Document Status:** ✅ **APPROVED - READY FOR IMPLEMENTATION**  
**Next Action:** Begin database schema creation and TypeORM entities  
**Estimated Completion:** 3 weeks from start date

