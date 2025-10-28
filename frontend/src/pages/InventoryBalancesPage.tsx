import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { inventoryService } from '../services/inventory';
import { 
  InventoryBalance, 
  QueryInventoryBalancesDto,
  InventoryItem,
  Warehouse 
} from '../types/inventory';

const InventoryBalancesPage: React.FC = () => {
  // State management
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [onlyWithStock, setOnlyWithStock] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // Load data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadBalances();
  }, [searchTerm, selectedWarehouse, onlyWithStock]);

  const loadInitialData = async () => {
    try {
      const [itemsRes, warehousesRes] = await Promise.all([
        inventoryService.items.getItems({ limit: 1000 }),
        inventoryService.warehouses.getWarehouses(),
      ]);

      setItems(itemsRes.data);
      setWarehouses(warehousesRes);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadBalances = async (page = 1) => {
    try {
      setLoading(true);
      const queryParams: QueryInventoryBalancesDto = {
        page,
        limit: itemsPerPage,
        warehouseId: selectedWarehouse || undefined,
        onlyWithStock,
      };

      // Filter by search term on frontend for now
      const response = await inventoryService.balances.getBalances(queryParams);
      
      let filteredBalances = response.data;
      if (searchTerm) {
        filteredBalances = response.data.filter(balance => 
          balance.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          balance.item?.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setBalances(filteredBalances);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalValue = balances.reduce((sum, balance) => sum + balance.totalValue, 0);
  const totalQuantity = balances.reduce((sum, balance) => sum + balance.quantityOnHand, 0);
  const uniqueItems = new Set(balances.map(b => b.itemId)).size;
  const lowStockItems = balances.filter(b => b.quantityOnHand < 10).length; // Arbitrary low stock threshold

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Balances</h1>
          <p className="text-gray-600">View current stock levels and inventory valuation</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
            </div>
          </div>
        </div>
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

          {/* Warehouse filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>

          {/* Stock filter */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="onlyWithStock"
              checked={onlyWithStock}
              onChange={(e) => setOnlyWithStock(e.target.checked)}
              className="rounded mr-2"
            />
            <label htmlFor="onlyWithStock" className="text-sm font-medium">
              Only items with stock
            </label>
          </div>
        </div>
      </div>

      {/* Balances Table */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading inventory balances...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">On Hand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balances.map((balance) => (
                    <tr key={balance.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium">{balance.item?.name || 'Unknown Item'}</div>
                            <div className="text-sm text-gray-500">SKU: {balance.item?.sku}</div>
                            {balance.lotNumber && (
                              <div className="text-xs text-blue-600">Lot: {balance.lotNumber}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center text-sm">
                          <MapPin size={14} className="text-gray-400 mr-1" />
                          <div>
                            <div className="font-medium">{balance.warehouse?.name || 'Unknown'}</div>
                            {balance.room && (
                              <div className="text-xs text-gray-500">{balance.room.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          {balance.quantityOnHand.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {balance.item?.unitOfMeasure}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {balance.quantityReserved > 0 ? (
                            <span className="text-yellow-600 font-medium">
                              {balance.quantityReserved.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className={`text-sm font-medium ${
                          balance.quantityAvailable <= 0 ? 'text-red-600' :
                          balance.quantityAvailable < 10 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {balance.quantityAvailable.toLocaleString()}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          ${balance.weightedAverageCost.toFixed(2)}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          ${balance.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        {balance.lastMovementDate ? (
                          <div className="text-sm">
                            <Calendar size={12} className="inline text-gray-400 mr-1" />
                            {new Date(balance.lastMovementDate).toLocaleDateString()}
                            {balance.lastMovementType && (
                              <div className="text-xs text-gray-500">{balance.lastMovementType}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No movements</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* No data message */}
            {balances.length === 0 && (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No inventory balances found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {onlyWithStock 
                    ? "Try unchecking 'Only items with stock' to see all items"
                    : "Process some inventory transactions to see balances here"
                  }
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadBalances(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => loadBalances(currentPage + 1)}
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
    </div>
  );
};

export default InventoryBalancesPage;
