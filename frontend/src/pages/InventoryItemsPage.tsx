import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Pencil, Trash2, Package, DollarSign } from 'lucide-react';
import { inventoryService } from '../services/inventory';
import { 
  InventoryItem, 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto, 
  UnitOfMeasure,
  QueryInventoryItemsDto 
} from '../types/inventory';

// Form validation schema
const itemSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  category: z.string().optional(),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  isPerishable: z.boolean().default(false),
  shelfLifeDays: z.number().min(0).optional(),
  minTemperature: z.number().optional(),
  maxTemperature: z.number().optional(),
  standardCost: z.number().min(0, 'Standard cost must be positive'),
});

type ItemFormData = z.infer<typeof itemSchema>;

const InventoryItemsPage: React.FC = () => {
  // State management
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Form setup
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      isPerishable: false,
      standardCost: 0,
    }
  });

  const isPerishable = watch('isPerishable');

  // Load inventory items
  const loadItems = async (page = 1) => {
    try {
      setLoading(true);
      const queryParams: QueryInventoryItemsDto = {
        page,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
      };

      const response = await inventoryService.items.getItems(queryParams);
      setItems(response.data);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [searchTerm, selectedCategory]);

  // Create or update item
  const onSubmit = async (data: ItemFormData) => {
    try {
      if (editingItem) {
        // Update existing item
        const updateData: UpdateInventoryItemDto = { ...data };
        await inventoryService.items.updateItem(editingItem.id, updateData);
      } else {
        // Create new item
        const createData: CreateInventoryItemDto = { ...data };
        await inventoryService.items.createItem(createData);
      }
      
      setShowDialog(false);
      setEditingItem(null);
      reset();
      await loadItems(currentPage);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  // Edit item
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setValue('sku', item.sku);
    setValue('name', item.name);
    setValue('description', item.description || '');
    setValue('category', item.category || '');
    setValue('unitOfMeasure', item.unitOfMeasure);
    setValue('isPerishable', item.isPerishable);
    setValue('shelfLifeDays', item.shelfLifeDays || 0);
    setValue('minTemperature', item.minTemperature || 0);
    setValue('maxTemperature', item.maxTemperature || 0);
    setValue('standardCost', item.standardCost);
    setShowDialog(true);
  };

  // Delete item
  const handleDelete = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await inventoryService.items.deleteItem(item.id);
        await loadItems(currentPage);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingItem(null);
    reset();
    setShowDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    reset();
  };

  // Get unique categories for filter
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Items</h1>
          <p className="text-gray-600">Manage your inventory items and product catalog</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search items by SKU or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading items...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                            {item.description && (
                              <div className="text-sm text-gray-400 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.category ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {item.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center text-sm">
                          <DollarSign size={14} className="text-green-600 mr-1" />
                          <span className="font-medium">{item.standardCost.toFixed(2)}</span>
                        </div>
                        {item.lastCost !== item.standardCost && (
                          <div className="text-xs text-gray-500">
                            Last: ${item.lastCost.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.minTemperature || item.maxTemperature ? (
                          <div>
                            {item.minTemperature && item.maxTemperature ? (
                              `${item.minTemperature}°C to ${item.maxTemperature}°C`
                            ) : item.minTemperature ? (
                              `Min: ${item.minTemperature}°C`
                            ) : (
                              `Max: ${item.maxTemperature}°C`
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {item.isPerishable && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Perishable
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit item"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadItems(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => loadItems(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingItem ? 'Edit Item' : 'Create New Item'}
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU *</label>
                    <input
                      {...register('sku')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ITEM-001"
                    />
                    {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      {...register('name')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Item name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    {...register('description')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Item description"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input
                      {...register('category')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Grains, Meat, Dairy"
                    />
                  </div>

                  {/* Unit of Measure */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit of Measure *</label>
                    <select
                      {...register('unitOfMeasure')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(UnitOfMeasure).map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Standard Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Standard Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('standardCost', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.standardCost && <p className="text-red-500 text-sm mt-1">{errors.standardCost.message}</p>}
                  </div>

                  {/* Perishable checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('isPerishable')}
                      className="rounded mr-2"
                    />
                    <label className="text-sm font-medium">Perishable Item</label>
                  </div>
                </div>

                {/* Perishable-specific fields */}
                {isPerishable && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Perishable Item Settings</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Shelf Life (Days)</label>
                        <input
                          type="number"
                          {...register('shelfLifeDays', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Min Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('minTemperature', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('maxTemperature', { valueAsNumber: true })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                    {editingItem ? 'Update Item' : 'Create Item'}
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

export default InventoryItemsPage;
