import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, TrendingUp, AlertTriangle, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { inventoryService } from '../services/inventory';
import {
    type InventoryValuationResponse,
    type InventoryValuationItem,
    type Warehouse
} from '../types/inventory';
import { toast } from 'sonner';

const InventoryValuationPage: React.FC = () => {
    const [valuationData, setValuationData] = useState<InventoryValuationResponse | null>(null);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [auditLoading, setAuditLoading] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadValuation();
    }, [selectedWarehouse]);

    const loadInitialData = async () => {
        try {
            const warehousesRes = await inventoryService.warehouses.getWarehouses();
            setWarehouses(warehousesRes);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Failed to load warehouses');
        }
    };

    const loadValuation = async () => {
        try {
            setLoading(true);
            const data = await inventoryService.valuation.getValuationSummary(selectedWarehouse || undefined);
            setValuationData(data);
        } catch (error) {
            console.error('Error loading valuation:', error);
            toast.error('Failed to load inventory valuation');
        } finally {
            setLoading(false);
        }
    };

    const handleAudit = async () => {
        try {
            setAuditLoading(true);
            const result = await inventoryService.valuation.auditInventory(selectedWarehouse || undefined);
            if (result.passed) {
                toast.success(`Audit passed! Checked ${result.checkedCount} records.`);
            } else {
                toast.error(`Audit failed! Found ${result.discrepancies.length} discrepancies.`);
                console.error('Audit discrepancies:', result.discrepancies);
            }
        } catch (error) {
            console.error('Audit error:', error);
            toast.error('Failed to run inventory audit');
        } finally {
            setAuditLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Valuation</h1>
                    <p className="text-gray-600">Real-time inventory value report based on FIFO costing</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadValuation}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={handleAudit}
                        disabled={auditLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {auditLoading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                        Run Audit
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                ${valuationData?.totalInventoryValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Items in Stock</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {valuationData?.itemCount?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Package className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <div className="w-64">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Warehouse</label>
                        <select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Valuation Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Valuation Details</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Calculating valuation...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {valuationData?.details.map((item, index) => (
                                    <tr key={`${item.itemId}-${item.warehouseId}-${index}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{item.itemName}</div>
                                            <div className="text-xs text-gray-500">{item.category || 'Uncategorized'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.sku}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.warehouseName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                            {item.quantity.toLocaleString()} <span className="text-gray-500 text-xs">{item.unitOfMeasure}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                            ${item.averageCost.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {(!valuationData?.details || valuationData.details.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No inventory items found with value.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryValuationPage;
