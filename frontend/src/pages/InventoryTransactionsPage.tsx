import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  RotateCcw,
  TrendingUp,
  Calendar,
  Package,
  MapPin,
  User
} from 'lucide-react';
import { inventoryService } from '../services/inventory';
import {
  type InventoryTransaction,
  type CreateInventoryTransactionDto,
  InventoryTransactionType,
  UnitOfMeasure,
  InventoryReferenceType,
  type InventoryItem,
  type Warehouse,
  type Room
} from '../types/inventory';

// Form validation schema
const transactionSchema = z.object({
  transactionType: z.nativeEnum(InventoryTransactionType),
  transactionDate: z.string().min(1, 'Date is required'),
  referenceType: z.nativeEnum(InventoryReferenceType).optional(),
  referenceNumber: z.string().optional(),
  itemId: z.string().min(1, 'Item is required'),
  customerId: z.string().optional(),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  roomId: z.string().optional(),
  fromWarehouseId: z.string().optional(),
  fromRoomId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  toRoomId: z.string().optional(),
  quantity: z.number().min(0.001, 'Quantity must be positive'),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  unitCost: z.number().min(0, 'Unit cost must be positive'),
  lotNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  manufactureDate: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const InventoryTransactionsPage: React.FC = () => {
  // State management
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState<InventoryTransactionType>(InventoryTransactionType.RECEIPT);

  // Form setup
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transactionType: InventoryTransactionType.RECEIPT,
      transactionDate: new Date().toISOString().split('T')[0],
      quantity: 0,
      unitCost: 0,
    }
  });

  const watchedTransactionType = watch('transactionType');
  const watchedWarehouseId = watch('warehouseId');
  const watchedFromWarehouseId = watch('fromWarehouseId');

  // Load data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (watchedWarehouseId) {
      loadRooms(watchedWarehouseId);
    }
  }, [watchedWarehouseId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, itemsRes, warehousesRes] = await Promise.all([
        inventoryService.transactions.getTransactions({ limit: 50 }),
        inventoryService.items.getItems({ limit: 1000 }),
        inventoryService.warehouses.getWarehouses(),
      ]);

      setTransactions(transactionsRes.data);
      setItems(itemsRes.data);
      setWarehouses(warehousesRes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (warehouseId: string) => {
    try {
      const roomsRes = await inventoryService.rooms.getRooms(warehouseId);
      setRooms(roomsRes);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  // Process transaction
  const onSubmit = async (data: TransactionFormData) => {
    try {
      let result: InventoryTransaction;

      switch (data.transactionType) {
        case InventoryTransactionType.RECEIPT:
          result = await inventoryService.transactions.processReceipt(data);
          break;
        case InventoryTransactionType.ISSUE:
          result = await inventoryService.transactions.processIssue(data);
          break;
        case InventoryTransactionType.TRANSFER:
          result = await inventoryService.transactions.processTransfer(data);
          break;
        case InventoryTransactionType.ADJUSTMENT:
          result = await inventoryService.transactions.processAdjustment(data);
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      setShowDialog(false);
      reset();
      await loadInitialData();
      alert(`${data.transactionType} processed successfully! Transaction #${result.transactionNumber}`);
    } catch (error) {
      console.error('Error processing transaction:', error);
      alert('Error processing transaction. Please try again.');
    }
  };

  // Open create dialog
  const handleCreate = (type: InventoryTransactionType) => {
    setSelectedTransactionType(type);
    reset();
    setValue('transactionType', type);
    setValue('transactionDate', new Date().toISOString().split('T')[0]);
    setShowDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setShowDialog(false);
    reset();
  };

  // Get transaction type display info
  const getTransactionTypeInfo = (type: InventoryTransactionType) => {
    switch (type) {
      case InventoryTransactionType.RECEIPT:
        return { icon: ArrowDown, color: 'text-green-600', bg: 'bg-green-100', label: 'Receipt' };
      case InventoryTransactionType.ISSUE:
        return { icon: ArrowUp, color: 'text-red-600', bg: 'bg-red-100', label: 'Issue' };
      case InventoryTransactionType.TRANSFER:
        return { icon: ArrowRight, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Transfer' };
      case InventoryTransactionType.ADJUSTMENT:
        return { icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Adjustment' };
      default:
        return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  // Auto-fill unit cost when item is selected
  const handleItemChange = (itemId: string) => {
    const selectedItem = items.find(item => item.id === itemId);
    if (selectedItem) {
      setValue('unitOfMeasure', selectedItem.unitOfMeasure);
      if (watchedTransactionType === InventoryTransactionType.RECEIPT) {
        setValue('unitCost', selectedItem.standardCost);
      }
    }
  };

  const isTransferType = watchedTransactionType === InventoryTransactionType.TRANSFER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Transactions</h1>
          <p className="text-gray-600">Process stock movements and track inventory changes</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreate(InventoryTransactionType.RECEIPT)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <ArrowDown size={20} />
            Goods Receipt
          </button>
          <button
            onClick={() => handleCreate(InventoryTransactionType.ISSUE)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <ArrowUp size={20} />
            Goods Issue
          </button>
          <button
            onClick={() => handleCreate(InventoryTransactionType.TRANSFER)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <ArrowRight size={20} />
            Transfer
          </button>
          <button
            onClick={() => handleCreate(InventoryTransactionType.ADJUSTMENT)}
            className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
          >
            <RotateCcw size={20} />
            Adjustment
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading transactions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const typeInfo = getTransactionTypeInfo(transaction.transactionType);
                  const TypeIcon = typeInfo.icon;

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${typeInfo.bg} mr-3`}>
                            <TypeIcon size={16} className={typeInfo.color} />
                          </div>
                          <div>
                            <div className="font-medium">{transaction.transactionNumber}</div>
                            <div className="text-sm text-gray-500">
                              <Calendar size={12} className="inline mr-1" />
                              {new Date(transaction.transactionDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{transaction.item?.name || 'Unknown Item'}</div>
                          <div className="text-sm text-gray-500">{transaction.item?.sku}</div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span className={`font-medium ${transaction.transactionType === InventoryTransactionType.ISSUE ? 'text-red-600' :
                              transaction.transactionType === InventoryTransactionType.RECEIPT ? 'text-green-600' :
                                'text-blue-600'
                            }`}>
                            {transaction.transactionType === InventoryTransactionType.ISSUE ? '-' : '+'}
                            {transaction.quantity}
                          </span>
                          <span className="text-gray-500 ml-1">{transaction.unitOfMeasure}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          @${transaction.unitCost.toFixed(2)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <MapPin size={12} className="text-gray-400 mr-1" />
                          {transaction.warehouse?.name || 'Unknown'}
                        </div>
                        {transaction.room && (
                          <div className="text-xs text-gray-500">{transaction.room.name}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {transaction.referenceNumber ? (
                          <div>
                            <span className="font-medium">{transaction.referenceNumber}</span>
                            {transaction.referenceType && (
                              <div className="text-xs text-gray-500">{transaction.referenceType}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${transaction.isPostedToGl
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {transaction.isPostedToGl ? 'Posted to GL' : 'Pending GL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Process {getTransactionTypeInfo(selectedTransactionType).label}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Transaction Type */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Transaction Type</label>
                    <select
                      {...register('transactionType')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(InventoryTransactionType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Transaction Date *</label>
                    <input
                      type="date"
                      {...register('transactionDate')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.transactionDate && <p className="text-red-500 text-sm mt-1">{errors.transactionDate.message}</p>}
                  </div>
                </div>

                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Item *</label>
                  <select
                    {...register('itemId')}
                    onChange={(e) => handleItemChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an item</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </option>
                    ))}
                  </select>
                  {errors.itemId && <p className="text-red-500 text-sm mt-1">{errors.itemId.message}</p>}
                </div>

                {/* Quantity and Cost */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="0.001"
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Unit of Measure</label>
                    <select
                      {...register('unitOfMeasure')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(UnitOfMeasure).map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('unitCost', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.unitCost && <p className="text-red-500 text-sm mt-1">{errors.unitCost.message}</p>}
                  </div>
                </div>

                {/* Location Fields */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Location Details</h3>

                  {isTransferType ? (
                    <div className="space-y-4">
                      {/* From Location */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">From Location</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">From Warehouse *</label>
                            <select
                              {...register('fromWarehouseId')}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select warehouse</option>
                              {warehouses.map(warehouse => (
                                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">From Room</label>
                            <select
                              {...register('fromRoomId')}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select room</option>
                              {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* To Location */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">To Location</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">To Warehouse *</label>
                            <select
                              {...register('toWarehouseId')}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select warehouse</option>
                              {warehouses.map(warehouse => (
                                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">To Room</label>
                            <select
                              {...register('toRoomId')}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select room</option>
                              {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Warehouse *</label>
                        <select
                          {...register('warehouseId')}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select warehouse</option>
                          {warehouses.map(warehouse => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                          ))}
                        </select>
                        {errors.warehouseId && <p className="text-red-500 text-sm mt-1">{errors.warehouseId.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Room</label>
                        <select
                          {...register('roomId')}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select room</option>
                          {rooms.map(room => (
                            <option key={room.id} value={room.id}>{room.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reference and Tracking */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Reference & Tracking</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Reference Type</label>
                      <select
                        {...register('referenceType')}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type</option>
                        {Object.values(InventoryReferenceType).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reference Number</label>
                      <input
                        {...register('referenceNumber')}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., GRN-001, PO-123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Lot Number</label>
                      <input
                        {...register('lotNumber')}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Batch Number</label>
                      <input
                        {...register('batchNumber')}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    {...register('notes')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Additional notes or comments"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseDialog}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Process Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTransactionsPage;
