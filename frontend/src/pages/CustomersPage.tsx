import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Plus, Search, Building2 } from 'lucide-react';
import { customersService } from '../services/customers';
import type { Customer, CreateCustomerDto } from '../types/customer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
  } = useForm<CreateCustomerDto>({
    defaultValues: {
      country: 'Pakistan',
      creditLimit: 0,
      creditDays: 0,
      graceDays: 3,
      isActive: true,
    },
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersService.getCustomers({
        search: searchTerm || undefined,
        page,
        limit,
        sortBy: 'name',
        sortOrder: 'ASC',
      });
      setCustomers(response.data);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      alert(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, searchTerm]);

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      // Populate form with customer data
      Object.keys(customer).forEach((key) => {
        setValue(key as any, (customer as any)[key]);
      });
    } else {
      setEditingCustomer(null);
      reset({
        country: 'Pakistan',
        creditLimit: 0,
        creditDays: 0,
        graceDays: 3,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    reset();
  };

  const onSubmit = async (data: CreateCustomerDto) => {
    try {
      setLoading(true);
      if (editingCustomer) {
        await customersService.updateCustomer(editingCustomer.id, data);
        alert('Customer updated successfully!');
      } else {
        await customersService.createCustomer(data);
        alert('Customer created successfully!');
      }
      handleCloseDialog();
      loadCustomers();
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      alert(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await customersService.deleteCustomer(customer.id);
      alert('Customer deleted successfully!');
      loadCustomers();
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      alert(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">Manage customer accounts</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          New Customer
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name, code, or contact person..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Credit Limit</TableHead>
              <TableHead>AR Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                  <TableCell className="font-semibold">{customer.name}</TableCell>
                  <TableCell>{customer.contactPerson || '-'}</TableCell>
                  <TableCell>{customer.mobile || '-'}</TableCell>
                  <TableCell>{customer.city || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(customer.creditLimit).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {customer.receivableAccount?.code || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        customer.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(customer)}
                        disabled={loading}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
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
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} customers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Update customer information'
                : 'Create a new customer with AR account'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="ABC Trading Company"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    {...register('contactPerson')}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+92-300-1234567"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    {...register('mobile')}
                    placeholder="+92-301-7654321"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    {...register('addressLine1')}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    {...register('addressLine2')}
                    placeholder="Suite 100"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} placeholder="Lahore" />
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input id="state" {...register('state')} placeholder="Punjab" />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" {...register('country')} placeholder="Pakistan" />
                </div>

                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" {...register('postalCode')} placeholder="54000" />
                </div>
              </div>
            </div>

            {/* Business Terms */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Business Terms</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    step="0.01"
                    {...register('creditLimit', { valueAsNumber: true })}
                    placeholder="100000"
                  />
                </div>

                <div>
                  <Label htmlFor="creditDays">Credit Days</Label>
                  <Input
                    id="creditDays"
                    type="number"
                    {...register('creditDays', { valueAsNumber: true })}
                    placeholder="30"
                  />
                </div>

                <div>
                  <Label htmlFor="graceDays">Grace Days</Label>
                  <Input
                    id="graceDays"
                    type="number"
                    {...register('graceDays', { valueAsNumber: true })}
                    placeholder="3"
                  />
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Tax Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxId">Tax ID / NTN</Label>
                  <Input id="taxId" {...register('taxId')} placeholder="1234567-8" />
                </div>

                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input id="gstNumber" {...register('gstNumber')} placeholder="GST-123456" />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', !!checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

