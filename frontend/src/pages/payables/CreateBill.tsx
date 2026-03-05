import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { payablesService, type CreateBillDto } from '../../services/payablesService';
import { customersService } from '../../services/customers';
import { accountsService } from '../../services/accountsService';
import { costCentersApi } from '../../services/cost-centers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Trash2, Plus } from 'lucide-react';

export default function CreateBill() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<any[]>([]);
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // For real implementation, we should use a proper Vendor type, utilizing Customer for now
    // Assuming Suppliers are stored in Customers table or we need to filter by type?
    // User didn't specify separate Vendor table, so we use Customers as Vendors for now.

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateBillDto>({
        defaultValues: {
            billDate: new Date(),
            dueDate: new Date(),
            lines: [{ expenseAccountId: '', description: '', amount: 0, taxAmount: 0, costCenterId: '' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    });

    const lines = watch('lines');
    const totalAmount = lines.reduce((sum, line) => sum + (Number(line.amount) || 0) + (Number(line.taxAmount) || 0), 0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load Vendors (Customers)
            // Ideally we filter by 'VENDOR' type if it exists, but for now fetch all
            const customersRes = await customersService.getCustomers({ limit: 100 });
            setVendors(customersRes.data);

            // Load Expense Accounts
            // We need to filter for Expense type. accountsService might not have filter in getAccounts but we can filter client side or use tree
            // Assuming getAccounts with params or just fetch all and filter
            const accountsRes = await accountsService.getAccounts({ limit: 100 });
            // Naive filter for expense accounts (usually start with 5 or type 'EXPENSE')
            // We'll just show all for now or filter if 'type' property exists
            const expenses = accountsRes.data.filter((acc: any) => acc.type === 'EXPENSE' || acc.code.startsWith('5'));
            setExpenseAccounts(expenses.length > 0 ? expenses : accountsRes.data);

            // Load Cost Centers
            const costCentersRes = await costCentersApi.getAll({ limit: 100, isActive: true });
            setCostCenters(costCentersRes.data);

        } catch (e: any) {
            toast.error('Failed to load form data');
        }
    };

    const onSubmit = async (data: CreateBillDto) => {
        try {
            setLoading(true);
            await payablesService.createBill(data);
            toast.success('Bill created successfully');
            navigate('/payables/bills');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create bill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Create Supplier Bill</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-card border rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Bill Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Vendor</Label>
                            <select {...register('vendorId', { required: 'Vendor is required' })} className="w-full border rounded px-3 py-2 bg-background">
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            {errors.vendorId && <span className="text-red-500 text-sm">{errors.vendorId.message}</span>}
                        </div>
                        <div>
                            <Label>Bill Number</Label>
                            <Input {...register('billNumber', { required: 'Bill Number is required' })} placeholder="BILL-001" />
                            {errors.billNumber && <span className="text-red-500 text-sm">{errors.billNumber.message}</span>}
                        </div>
                        <div>
                            <Label>Vendor Invoice #</Label>
                            <Input {...register('vendorInvoiceNumber')} placeholder="INV-123" />
                        </div>
                        <div></div>
                        <div>
                            <Label>Bill Date</Label>
                            <Input type="date" {...register('billDate', { valueAsDate: true })} defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                            <Label>Due Date</Label>
                            <Input type="date" {...register('dueDate', { valueAsDate: true })} defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="col-span-2">
                            <Label>Notes</Label>
                            <Input {...register('notes')} placeholder="Additional notes..." />
                        </div>
                    </div>
                </div>

                <div className="bg-card border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Line Items</h3>
                        <Button type="button" onClick={() => append({ expenseAccountId: '', description: '', amount: 0, taxAmount: 0, costCenterId: '' })} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Add Line
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                                <div className="col-span-3">
                                    <Label className="text-xs">Expense Account</Label>
                                    <select {...register(`lines.${index}.expenseAccountId`, { required: true })} className="w-full border rounded px-2 py-1 text-sm bg-background">
                                        <option value="">Select Account</option>
                                        {expenseAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Description</Label>
                                    <Input {...register(`lines.${index}.description`)} placeholder="Description" className="h-8 text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Cost Center</Label>
                                    <select {...register(`lines.${index}.costCenterId`)} className="w-full border rounded px-2 py-1 text-sm bg-background">
                                        <option value="">None</option>
                                        {costCenters.map(cc => (
                                            <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Amount</Label>
                                    <Input type="number" step="0.01" {...register(`lines.${index}.amount`, { valueAsNumber: true })} className="h-8 text-sm" />
                                </div>
                                <div className="col-span-1">
                                    <Label className="text-xs">Tax</Label>
                                    <Input type="number" step="0.01" {...register(`lines.${index}.taxAmount`, { valueAsNumber: true })} className="h-8 text-sm" />
                                </div>
                                <div className="col-span-1 flex justify-center pb-1">
                                    {fields.length > 1 && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4">
                        <div className="text-right">
                            <span className="text-gray-500 mr-4">Total Amount:</span>
                            <span className="text-xl font-bold">{new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/payables/bills')}>Cancel</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Bill'}</Button>
                </div>
            </form>
        </div>
    );
}
