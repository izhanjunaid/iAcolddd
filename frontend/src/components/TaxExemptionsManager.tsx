import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, Trash2, Plus, FileText } from 'lucide-react';
import { taxService } from '../services/tax';
import type {
  TaxConfiguration,
  CreateTaxConfigurationDto,
  TaxEntityType,
  TaxRate,
} from '../types/tax';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface TaxExemptionsManagerProps {
  entityType: TaxEntityType;
  entityId: string;
  entityName?: string;
}

export function TaxExemptionsManager({
  entityType,
  entityId,
  entityName,
}: TaxExemptionsManagerProps) {
  const [exemptions, setExemptions] = useState<TaxConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTaxConfigurationDto>({
    defaultValues: {
      entityType,
      entityId,
      isExempt: true,
    },
  });

  const watchIsExempt = watch('isExempt');

  const loadExemptions = async () => {
    try {
      setLoading(true);
      const data = await taxService.getTaxConfigurationsForEntity(entityType, entityId);
      setExemptions(data);
    } catch (err: any) {
      console.error('Failed to load exemptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTaxRates = async () => {
    try {
      const response = await taxService.getTaxRates({
        isActive: true,
        limit: 100,
      });
      setTaxRates(response.data);
    } catch (err: any) {
      console.error('Failed to load tax rates:', err);
    }
  };

  useEffect(() => {
    loadExemptions();
    loadTaxRates();
  }, [entityType, entityId]);

  const handleOpenDialog = () => {
    reset({
      entityType,
      entityId,
      isExempt: true,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    reset();
  };

  const handleSave = async (data: CreateTaxConfigurationDto) => {
    try {
      await taxService.createTaxConfiguration(data);
      handleCloseDialog();
      loadExemptions();
    } catch (err: any) {
      console.error('Failed to save exemption:', err);
      alert(err.response?.data?.message || 'Failed to save exemption');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exemption?')) return;

    try {
      await taxService.deleteTaxConfiguration(id);
      loadExemptions();
    } catch (err: any) {
      console.error('Failed to delete exemption:', err);
      alert(err.response?.data?.message || 'Failed to delete exemption');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tax Exemptions
            </CardTitle>
            <CardDescription>
              Manage tax exemptions for {entityName || entityType}
            </CardDescription>
          </div>
          <Button onClick={handleOpenDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Exemption
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading exemptions...
          </div>
        ) : exemptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tax exemptions configured</p>
            <p className="text-sm mt-1">
              Click "Add Exemption" to create a new exemption
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exemptions.map((exemption) => (
                <TableRow key={exemption.id}>
                  <TableCell>
                    <div className="font-medium">
                      {exemption.taxRate?.name || 'Tax Rate'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {exemption.taxRate?.taxType} - {exemption.taxRate?.rate}%
                    </div>
                  </TableCell>
                  <TableCell>
                    {exemption.isExempt ? (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Exempt
                      </Badge>
                    ) : (
                      <Badge variant="outline">Custom Rate</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {exemption.exemptionCertificateNumber ? (
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="h-3 w-3" />
                        {exemption.exemptionCertificateNumber}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {exemption.exemptionValidFrom || exemption.exemptionValidTo ? (
                      <div className="text-sm">
                        {exemption.exemptionValidFrom && (
                          <div>From: {new Date(exemption.exemptionValidFrom).toLocaleDateString()}</div>
                        )}
                        {exemption.exemptionValidTo && (
                          <div className="text-muted-foreground">
                            To: {new Date(exemption.exemptionValidTo).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No expiry</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(exemption.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create Exemption Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Tax Exemption</DialogTitle>
              <DialogDescription>
                Configure a tax exemption for this {entityType.toLowerCase()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
              <div>
                <Label htmlFor="taxRateId">Tax Rate *</Label>
                <Select onValueChange={(value) => setValue('taxRateId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax rate to exempt" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} ({rate.taxType} - {rate.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.taxRateId && (
                  <span className="text-sm text-destructive">{errors.taxRateId.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="exemptionReason">Exemption Reason *</Label>
                <Textarea
                  id="exemptionReason"
                  {...register('exemptionReason', { required: 'Reason is required' })}
                  placeholder="e.g., Government entity, Essential food item, etc."
                  rows={3}
                />
                {errors.exemptionReason && (
                  <span className="text-sm text-destructive">
                    {errors.exemptionReason.message}
                  </span>
                )}
              </div>

              <div>
                <Label htmlFor="exemptionCertificateNumber">Certificate Number</Label>
                <Input
                  id="exemptionCertificateNumber"
                  {...register('exemptionCertificateNumber')}
                  placeholder="e.g., FBR-CERT-2025-001"
                />
                <span className="text-xs text-muted-foreground">
                  FBR exemption certificate number (if applicable)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exemptionValidFrom">Valid From</Label>
                  <Input
                    id="exemptionValidFrom"
                    type="date"
                    {...register('exemptionValidFrom')}
                  />
                </div>

                <div>
                  <Label htmlFor="exemptionValidTo">Valid To</Label>
                  <Input
                    id="exemptionValidTo"
                    type="date"
                    {...register('exemptionValidTo')}
                  />
                </div>
              </div>

              {watchIsExempt && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      This {entityType.toLowerCase()} will be exempt from the selected tax.
                      Zero tax will be charged for transactions involving this {entityType.toLowerCase()}.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">Create Exemption</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
