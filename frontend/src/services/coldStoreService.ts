import api from './api';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum BillingUnitType {
    PER_BAG = 'PER_BAG',
    PER_KG = 'PER_KG',
}

export enum ColdStoreLotStatus {
    IN_STORAGE = 'IN_STORAGE',
    PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
    RELEASED = 'RELEASED',
    CANCELLED = 'CANCELLED',
}

export enum GatePassStatus {
    DRAFT = 'DRAFT',
    APPROVED = 'APPROVED',
    CANCELLED = 'CANCELLED',
}

export enum RentalCycleStatus {
    ACTIVE = 'ACTIVE',
    CLOSED = 'CLOSED',
    INVOICED = 'INVOICED',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColdStoreLot {
    id: string;
    lotNumber: string;
    customerId: string;
    customer?: { id: string; name: string };
    commodity: string;
    variety?: string;
    chamberId?: string;
    chamber?: { id: string; name: string };
    bagsIn: number;
    bagsOut: number;
    grossWeightKg: number;
    tareWeightKg: number;
    netWeightKg: number;
    inwardDate: string;
    outwardDate?: string;
    billingStartDate: string;
    status: ColdStoreLotStatus;
    billingUnit: BillingUnitType;
    ratePerBagPerSeason?: number;
    ratePerKgPerDay?: number;
    notes?: string;
    createdAt: string;
}

export interface InwardGatePass {
    id: string;
    gatePassNumber: string;
    lotId?: string;
    lot?: ColdStoreLot;
    customerId: string;
    customer?: { id: string; name: string };
    commodity: string;
    variety?: string;
    chamberId?: string;
    vehicleNumber?: string;
    driverName?: string;
    bagsReceived: number;
    grossWeightKg: number;
    tareWeightKg: number;
    netWeightKg: number;
    billingUnit: BillingUnitType;
    ratePerBagPerSeason?: number;
    ratePerKgPerDay?: number;
    inwardDate: string;
    status: GatePassStatus;
    notes?: string;
    createdAt: string;
}

export interface OutwardGatePass {
    id: string;
    gatePassNumber: string;
    lotId: string;
    lot?: ColdStoreLot;
    customerId: string;
    customer?: { id: string; name: string };
    vehicleNumber?: string;
    driverName?: string;
    bagsReleased: number;
    grossWeightKg: number;
    tareWeightKg: number;
    netWeightKg: number;
    outwardDate: string;
    status: GatePassStatus;
    invoiceId?: string;
    notes?: string;
    createdAt: string;
}

export interface RentalBillingCycle {
    id: string;
    lotId: string;
    lot?: ColdStoreLot;
    customerId: string;
    customer?: { id: string; name: string };
    billingStartDate: string;
    billingEndDate?: string;
    daysStored?: number;
    bagsBilled?: number;
    weightBilledKg?: number;
    rateApplied: number;
    billingUnit: BillingUnitType;
    storageCharges: number;
    handlingChargesOut: number;
    otherCharges: number;
    subtotal: number;
    gstAmount: number;
    whtAmount: number;
    totalAmount: number;
    status: RentalCycleStatus;
    invoiceId?: string;
    createdAt: string;
}

export interface LotsSummary {
    totalLots: number;
    totalBagsInStorage: number;
    totalWeightKg: number;
    activeCycles: RentalBillingCycle[];
}

// ─── Create DTOs ──────────────────────────────────────────────────────────────

export interface CreateInwardGatePassDto {
    customerId: string;
    commodity: string;
    variety?: string;
    chamberId?: string;
    vehicleNumber?: string;
    driverName?: string;
    bagsReceived: number;
    grossWeightKg: number;
    tareWeightKg: number;
    inwardDate: string;
    billingUnit: BillingUnitType;
    ratePerBagPerSeason?: number;
    ratePerKgPerDay?: number;
    notes?: string;
}

export interface CreateOutwardGatePassDto {
    lotId: string;
    vehicleNumber?: string;
    driverName?: string;
    bagsReleased: number;
    grossWeightKg: number;
    tareWeightKg: number;
    outwardDate: string;
    notes?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = '/cold-store';

export const coldStoreService = {
    // Lots
    getLots: (params?: { customerId?: string; status?: ColdStoreLotStatus; commodity?: string }) =>
        api.get<ColdStoreLot[]>(`${BASE}/lots`, { params }).then((r) => r.data),

    getLotsSummary: () =>
        api.get<LotsSummary>(`${BASE}/lots/summary`).then((r) => r.data),

    getLot: (id: string) =>
        api.get<ColdStoreLot>(`${BASE}/lots/${id}`).then((r) => r.data),

    getLotAccruedCharges: (id: string) =>
        api.get<{ lot: ColdStoreLot; accruedCharges: any; billingCycles: RentalBillingCycle[] }>(
            `${BASE}/lots/${id}/accrued-charges`,
        ).then((r) => r.data),

    // Inward Gate Passes
    getInwardGatePasses: (params?: { customerId?: string; status?: GatePassStatus }) =>
        api.get<InwardGatePass[]>(`${BASE}/inward-gate-passes`, { params }).then((r) => r.data),

    createInwardGatePass: (dto: CreateInwardGatePassDto) =>
        api.post<InwardGatePass>(`${BASE}/inward-gate-passes`, dto).then((r) => r.data),

    approveInwardGatePass: (id: string) =>
        api.patch<InwardGatePass>(`${BASE}/inward-gate-passes/${id}/approve`).then((r) => r.data),

    cancelInwardGatePass: (id: string) =>
        api.patch<InwardGatePass>(`${BASE}/inward-gate-passes/${id}/cancel`).then((r) => r.data),

    // Outward Gate Passes
    getOutwardGatePasses: (params?: { lotId?: string; status?: GatePassStatus }) =>
        api.get<OutwardGatePass[]>(`${BASE}/outward-gate-passes`, { params }).then((r) => r.data),

    createOutwardGatePass: (dto: CreateOutwardGatePassDto) =>
        api.post<OutwardGatePass>(`${BASE}/outward-gate-passes`, dto).then((r) => r.data),

    approveOutwardGatePass: (id: string) =>
        api.patch<OutwardGatePass>(`${BASE}/outward-gate-passes/${id}/approve`).then((r) => r.data),

    cancelOutwardGatePass: (id: string) =>
        api.patch<OutwardGatePass>(`${BASE}/outward-gate-passes/${id}/cancel`).then((r) => r.data),

    // Billing
    getActiveBillingCycles: () =>
        api.get<RentalBillingCycle[]>(`${BASE}/billing/active-cycles`).then((r) => r.data),

    // Reports
    getSpaceUtilization: () =>
        api.get<any>(`${BASE}/reports/space-utilization`).then((r) => r.data),

    getProjectedRevenue: () =>
        api.get<any>(`${BASE}/reports/projected-revenue`).then((r) => r.data),

    getCustomerAging: () =>
        api.get<any>(`${BASE}/reports/customer-aging`).then((r) => r.data),
};
