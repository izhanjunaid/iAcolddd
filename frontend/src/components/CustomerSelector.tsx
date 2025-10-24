import { useState, useEffect } from 'react';
import { customersService } from '../services/customers';
import type { Customer } from '../types/customer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Customer',
  required = false,
  error,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersService.getCustomers({
        search: search || undefined,
        isActive: true,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'ASC',
      });
      setCustomers(response.data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  // Find selected customer for display
  const selectedCustomer = customers.find((c) => c.id === value);

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select customer...">
            {selectedCustomer
              ? `${selectedCustomer.code} - ${selectedCustomer.name}`
              : 'Select customer...'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No customers found</div>
          ) : (
            customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs text-gray-500 mr-2">{customer.code}</span>
                  <span className="flex-1">{customer.name}</span>
                  {customer.city && (
                    <span className="text-xs text-gray-400 ml-2">({customer.city})</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

