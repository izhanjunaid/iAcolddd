import { BadRequestException, NotFoundException } from '@nestjs/common';

export class InsufficientStockException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}

export class InventoryItemNotFoundException extends NotFoundException {
  constructor(itemId: string) {
    super(`Inventory item with ID ${itemId} not found`);
  }
}

export class InvalidInventoryTransactionException extends BadRequestException {
  constructor(message: string) {
    super(`Invalid inventory transaction: ${message}`);
  }
}

export class FIFOCalculationException extends BadRequestException {
  constructor(message: string) {
    super(`FIFO calculation error: ${message}`);
  }
}

export class InventoryLocationException extends BadRequestException {
  constructor(message: string) {
    super(`Inventory location error: ${message}`);
  }
}

export class StockReservationException extends BadRequestException {
  constructor(message: string) {
    super(`Stock reservation error: ${message}`);
  }
}

