import { useState, useEffect } from 'react';
import { costCentersApi } from '../services/cost-centers';
import type { CostCenter, CreateCostCenterDto, UpdateCostCenterDto } from '../types/cost-center';

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [treeData, setTreeData] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateCostCenterDto>({
    code: '',
    name: '',
    description: '',
    parentId: undefined,
    isActive: true,
  });

  useEffect(() => {
    loadCostCenters();
  }, [searchTerm]);

  const loadCostCenters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await costCentersApi.getAll({
        search: searchTerm || undefined,
        isActive: true,
        limit: 100,
      });
      setCostCenters(response.data);

      // Also load tree data
      const tree = await costCentersApi.getTree();
      setTreeData(tree);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load cost centers');
      console.error('Error loading cost centers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingCostCenter) {
        const updateData: UpdateCostCenterDto = {
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId,
          isActive: formData.isActive,
        };
        await costCentersApi.update(editingCostCenter.id, updateData);
      } else {
        await costCentersApi.create(formData);
      }
      setShowDialog(false);
      setEditingCostCenter(null);
      resetForm();
      await loadCostCenters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save cost center');
      console.error('Error saving cost center:', err);
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || '',
      parentId: costCenter.parentId || undefined,
      isActive: costCenter.isActive,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost center?')) {
      return;
    }

    try {
      setError(null);
      await costCentersApi.delete(id);
      await loadCostCenters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete cost center');
      console.error('Error deleting cost center:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      parentId: undefined,
      isActive: true,
    });
  };

  const openCreateDialog = () => {
    setEditingCostCenter(null);
    resetForm();
    setShowDialog(true);
  };

  const renderTreeNode = (node: CostCenter, level: number = 0) => {
    return (
      <div key={node.id} className="mb-2">
        <div
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {level > 0 && (
                <span className="text-gray-400">└─</span>
              )}
              <div>
                <div className="font-medium">{node.name}</div>
                <div className="text-sm text-gray-600">
                  Code: {node.code}
                  {node.description && ` • ${node.description}`}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {node.isActive ? (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
            ) : (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span>
            )}
            <button
              onClick={() => handleEdit(node)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(node.id)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading cost centers...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cost Centers</h1>
          <p className="text-gray-600 mt-1">Manage departments and cost tracking centers</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Cost Center
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
        </div>
        <div className="flex gap-2 border border-gray-300 rounded overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Tree View
          </button>
        </div>
      </div>

      {costCenters.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">No cost centers found.</p>
          <button
            onClick={openCreateDialog}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Cost Center
          </button>
        </div>
      ) : (
        <div>
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Parent</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {costCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{cc.code}</td>
                      <td className="px-4 py-3 text-sm">{cc.name}</td>
                      <td className="px-4 py-3 text-sm">{cc.parent?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cc.description || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {cc.isActive ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(cc)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cc.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {treeData.map((node) => renderTreeNode(node))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingCostCenter ? 'Edit Cost Center' : 'Create Cost Center'}
            </h2>

            <form onSubmit={handleCreateOrUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={!!editingCostCenter}
                    className="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
                    placeholder="WH-01"
                  />
                  {editingCostCenter && (
                    <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Warehouse A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Parent Cost Center</label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">None (Root Level)</option>
                    {costCenters
                      .filter((cc) => !editingCostCenter || cc.id !== editingCostCenter.id)
                      .map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingCostCenter(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingCostCenter ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

