import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Calculator,
  Shield,
  CheckCircle2,
  Circle,
  Tag,
} from 'lucide-react';
import { taxService } from '../services/tax';
import type {
  TaxRate,
  CreateTaxRateDto,
  TaxType,
  TaxApplicability,
} from '../types/tax';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';

export default function TaxRatesPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTaxType, setFilterTaxType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTaxRateDto>({
    defaultValues: {
      taxType: 'GST' as TaxType,
      applicability: 'ALL' as TaxApplicability,
      isActive: true,
      isDefault: false,
      effectiveFrom: new Date().toISOString().split('T')[0],
    },
  });

  const watchTaxType = watch('taxType');
  const watchIsDefault = watch('isDefault');

  const loadTaxRates = async () => {
    try {
      setLoading(true);
      const response = await taxService.getTaxRates({
        search: searchTerm || undefined,
        taxType: filterTaxType ? (filterTaxType as TaxType) : undefined,
        isActive: filterActive === 'true' ? true : filterActive === 'false' ? false : undefined,
        page,
        limit,
      });
      setTaxRates(response.data);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Failed to load tax rates:', err);
      alert(err.response?.data?.message || 'Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxRates();
  }, [page, searchTerm, filterTaxType, filterActive]);

  const handleOpenDialog = (taxRate?: TaxRate) => {
    if (taxRate) {
      setEditingTaxRate(taxRate);
      Object.keys(taxRate).forEach((key) => {
        if (key === 'effectiveFrom' || key === 'effectiveTo') {
          const dateValue = (taxRate as any)[key];
          setValue(key as any, dateValue ? dateValue.split('T')[0] : '');
        } else {
          setValue(key as any, (taxRate as any)[key]);
        }
      });
    } else {
      setEditingTaxRate(null);
      reset({
        taxType: 'GST' as TaxType,
        applicability: 'ALL' as TaxApplicability,
        isActive: true,
        isDefault: false,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTaxRate(null);
    reset();
  };

  const handleSave = async (data: CreateTaxRateDto) => {
    try {
      if (editingTaxRate) {
        await taxService.updateTaxRate(editingTaxRate.id, data);
      } else {
        await taxService.createTaxRate(data);
      }
      handleCloseDialog();
      loadTaxRates();
    } catch (err: any) {
      console.error('Failed to save tax rate:', err);
      alert(err.response?.data?.message || 'Failed to save tax rate');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await taxService.deleteTaxRate(id);
      loadTaxRates();
    } catch (err: any) {
      console.error('Failed to delete tax rate:', err);
      alert(err.response?.data?.message || 'Failed to delete tax rate');
    }
  };

  const getTaxTypeBadgeColor = (type: TaxType) => {
    const colors: Record<TaxType, string> = {
      GST: 'bg-blue-100 text-blue-800',
      WHT: 'bg-purple-100 text-purple-800',
      INCOME_TAX: 'bg-green-100 text-green-800',
      PROVINCIAL_TAX: 'bg-yellow-100 text-yellow-800',
      CUSTOM_DUTY: 'bg-orange-100 text-orange-800',
      EXCISE_DUTY: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Tax Rates Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage tax rates, exemptions, and calculations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          New Tax Rate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={filterTaxType} onValueChange={setFilterTaxType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Tax Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tax Types</SelectItem>
            <SelectItem value="GST">GST</SelectItem>
            <SelectItem value="WHT">WHT</SelectItem>
            <SelectItem value="INCOME_TAX">Income Tax</SelectItem>
            <SelectItem value="PROVINCIAL_TAX">Provincial Tax</SelectItem>
            <SelectItem value="CUSTOM_DUTY">Custom Duty</SelectItem>
            <SelectItem value="EXCISE_DUTY">Excise Duty</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Rates</div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground">Active Rates</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {taxRates.filter((r) => r.isActive).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground">Default Rates</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">
            {taxRates.filter((r) => r.isDefault).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground">Inactive Rates</div>
          <div className="text-2xl font-bold mt-1 text-gray-600">
            {taxRates.filter((r) => !r.isActive).length}
          </div>
        </div>
      </div>

      {/* Tax Rates Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Applicability</TableHead>
              <TableHead>Effective Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading tax rates...
                </TableCell>
              </TableRow>
            ) : taxRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tax rates found
                </TableCell>
              </TableRow>
            ) : (
              taxRates.map((taxRate) => (
                <TableRow key={taxRate.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {taxRate.isDefault && (
                        <Tag className="h-4 w-4 text-blue-600" />
                      )}
                      {taxRate.name}
                    </div>
                    {taxRate.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {taxRate.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTaxTypeBadgeColor(taxRate.taxType)}>
                      {taxRate.taxType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {taxRate.rate}%
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {taxRate.applicability}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>From: {new Date(taxRate.effectiveFrom).toLocaleDateString()}</div>
                      {taxRate.effectiveTo && (
                        <div className="text-muted-foreground">
                          To: {new Date(taxRate.effectiveTo).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {taxRate.isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={taxRate.isActive ? 'text-green-600' : 'text-gray-500'}>
                        {taxRate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(taxRate)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(taxRate.id, taxRate.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tax
            rates
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTaxRate ? 'Edit Tax Rate' : 'Create New Tax Rate'}
            </DialogTitle>
            <DialogDescription>
              {editingTaxRate
                ? 'Update the tax rate details below.'
                : 'Enter the details for the new tax rate.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Tax Rate Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g., Standard GST - 18%"
                />
                {errors.name && (
                  <span className="text-sm text-destructive">{errors.name.message}</span>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe when this tax rate applies..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="taxType">Tax Type *</Label>
                <Select
                  value={watchTaxType}
                  onValueChange={(value) => setValue('taxType', value as TaxType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GST">GST (General Sales Tax)</SelectItem>
                    <SelectItem value="WHT">WHT (Withholding Tax)</SelectItem>
                    <SelectItem value="INCOME_TAX">Income Tax</SelectItem>
                    <SelectItem value="PROVINCIAL_TAX">Provincial Tax</SelectItem>
                    <SelectItem value="CUSTOM_DUTY">Custom Duty</SelectItem>
                    <SelectItem value="EXCISE_DUTY">Excise Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="applicability">Applicability *</Label>
                <Select
                  value={watch('applicability')}
                  onValueChange={(value) => setValue('applicability', value as TaxApplicability)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Entities</SelectItem>
                    <SelectItem value="REGISTERED">Registered Only</SelectItem>
                    <SelectItem value="UNREGISTERED">Unregistered Only</SelectItem>
                    <SelectItem value="COMPANY">Companies</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individuals</SelectItem>
                    <SelectItem value="IMPORT">Imports</SelectItem>
                    <SelectItem value="EXPORT">Exports</SelectItem>
                    <SelectItem value="LOCAL">Local Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rate">Tax Rate (%) *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register('rate', {
                    required: 'Rate is required',
                    min: { value: 0, message: 'Rate must be at least 0' },
                    max: { value: 100, message: 'Rate cannot exceed 100' },
                    valueAsNumber: true,
                  })}
                  placeholder="18.00"
                />
                {errors.rate && (
                  <span className="text-sm text-destructive">{errors.rate.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="effectiveFrom">Effective From *</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  {...register('effectiveFrom', { required: 'Effective from date is required' })}
                />
                {errors.effectiveFrom && (
                  <span className="text-sm text-destructive">{errors.effectiveFrom.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                <Input id="effectiveTo" type="date" {...register('effectiveTo')} />
              </div>

              <div>
                <Label htmlFor="liabilityAccountCode">GL Liability Account (Optional)</Label>
                <Input
                  id="liabilityAccountCode"
                  {...register('liabilityAccountCode')}
                  placeholder="e.g., 2-0001-0002-0001"
                />
              </div>

              <div className="col-span-2 flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={watch('isActive')}
                    onCheckedChange={(checked) => setValue('isActive', checked as boolean)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={watchIsDefault}
                    onCheckedChange={(checked) => setValue('isDefault', checked as boolean)}
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as Default for {watchTaxType}
                  </Label>
                </div>
              </div>

              {watchIsDefault && (
                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      This tax rate will be used by default for all {watchTaxType} calculations
                      unless a specific rate is configured for a customer or product.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingTaxRate ? 'Update' : 'Create'} Tax Rate</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
