export interface GoodsReceiptNoteItem {
    id: string;
    goodsReceiptNoteId: string;
    purchaseOrderItemId: string;
    itemId: string;
    item?: {
        id: string;
        sku: string;
        name: string;
        unitOfMeasure: string;
    };
    purchaseOrderItem?: {
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
    };
    description: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    totalAmount: number;
    warehouseId?: string;
    roomId?: string;
    lotNumber?: string;
    expiryDate?: string;
}

export interface GoodsReceiptNote {
    id: string;
    grnNumber: string;
    purchaseOrderId: string;
    purchaseOrder?: {
        id: string;
        poNumber: string;
        status: string;
        totalAmount: number;
    };
    vendorId: string;
    vendor?: {
        id: string;
        name: string;
        code: string;
    };
    receiptDate: string;
    status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
    totalAmount: number;
    notes?: string;
    items: GoodsReceiptNoteItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateGoodsReceiptNoteItemDto {
    purchaseOrderItemId: string;
    itemId: string;
    description?: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    warehouseId?: string;
    roomId?: string;
    lotNumber?: string;
    expiryDate?: string;
}

export interface CreateGoodsReceiptNoteDto {
    purchaseOrderId: string;
    receiptDate: string;
    notes?: string;
    items: CreateGoodsReceiptNoteItemDto[];
}
