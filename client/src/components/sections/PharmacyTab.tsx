import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pharmacySchema, PharmacyFormData } from '../../schemas/validation';
import { Input, Button, Alert } from '../common/FormComponents';
import { useUpdatePharmacy, usePharmacyInventory } from '../../hooks/useApi';
import { Loader, AlertTriangle } from 'lucide-react';

export const PharmacyTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'stock' | 'expiry'>('sales');
  const { mutate: updatePharmacy, isPending, isSuccess, isError } = useUpdatePharmacy();
  const { data: inventory, isLoading: isLoadingData } = usePharmacyInventory();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PharmacyFormData>({
    resolver: zodResolver(pharmacySchema),
    defaultValues: {
      drugName: '',
      drugCode: '',
      unitsSold: 0,
      unitPrice: 0,
      stockAdded: 0,
      expiryDate: new Date().toISOString().slice(0, 16),
      batchNumber: '',
    },
  });

  const onSubmit = (data: PharmacyFormData) => {
    updatePharmacy(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  // Calculate expiring soon (within 30 days)
  const expiringItems = inventory?.filter((item: any) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }) || [];

  const expiredItems = inventory?.filter((item: any) => {
    return new Date(item.expiryDate) < new Date();
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pharmacy - Inventory/Sales</h2>
        <p className="text-gray-600">
          Manage daily sales, stock updates, and track drug expiry dates
        </p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Pharmacy data updated successfully" />
      )}
      {isError && <Alert type="error" message="Failed to update pharmacy data" />}

      {/* Alerts for expiring/expired items */}
      {expiredItems.length > 0 && (
        <Alert
          type="error"
          message={`⚠️ ${expiredItems.length} expired item(s) found. Please remove immediately.`}
        />
      )}
      {expiringItems.length > 0 && (
        <Alert
          type="warning"
          message={`⏰ ${expiringItems.length} item(s) expiring within 30 days.`}
        />
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200">
        {(['sales', 'stock', 'expiry'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'sales'
              ? 'Daily Sales'
              : tab === 'stock'
              ? 'Stock Updates'
              : 'Expiry Tracking'}
          </button>
        ))}
      </div>

      {/* Entry Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {activeTab === 'sales'
            ? 'Record Drug Sale'
            : activeTab === 'stock'
            ? 'Add Stock'
            : 'Track Expiry'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="drugName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Drug Name"
                  placeholder="Aspirin, Amoxicillin, etc."
                  required
                  error={errors.drugName}
                />
              )}
            />

            <Controller
              name="drugCode"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Drug Code"
                  placeholder="DRG-001"
                  required
                  error={errors.drugCode}
                />
              )}
            />

            <Controller
              name="batchNumber"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Batch Number"
                  placeholder="BATCH-001"
                  required
                  error={errors.batchNumber}
                />
              )}
            />

            <Controller
              name="expiryDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Expiry Date"
                  type="datetime-local"
                  required
                  error={errors.expiryDate}
                />
              )}
            />

            {(activeTab === 'sales' || activeTab === 'stock') && (
              <>
                <Controller
                  name="unitPrice"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label={activeTab === 'sales' ? 'Unit Price ($)' : 'Cost Price ($)'}
                      type="number"
                      step="0.01"
                      required
                      error={errors.unitPrice}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />

                {activeTab === 'sales' && (
                  <Controller
                    name="unitsSold"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Units Sold"
                        type="number"
                        required
                        error={errors.unitsSold}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                )}

                {activeTab === 'stock' && (
                  <Controller
                    name="stockAdded"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Units Added"
                        type="number"
                        required
                        error={errors.stockAdded}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                )}
              </>
            )}

            <Controller
              name="supplier"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Supplier (optional)"
                  placeholder="Supplier name"
                  error={errors.supplier}
                />
              )}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              {activeTab === 'sales'
                ? 'Record Sale'
                : activeTab === 'stock'
                ? 'Add Stock'
                : 'Update Expiry'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={isPending}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {/* Inventory Overview */}
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Drug Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Batch
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Expiry Date
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory && inventory.length > 0 ? (
                    inventory.slice(0, 10).map((item: any, idx: number) => {
                      const daysUntilExpiry = Math.ceil(
                        (new Date(item.expiryDate).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      );

                      let statusColor = 'bg-green-100 text-green-800';
                      let statusText = 'Good';

                      if (new Date(item.expiryDate) < new Date()) {
                        statusColor = 'bg-red-100 text-red-800';
                        statusText = 'Expired';
                      } else if (daysUntilExpiry <= 30) {
                        statusColor = 'bg-yellow-100 text-yellow-800';
                        statusText = `Expiring in ${daysUntilExpiry}d`;
                      }

                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.drugName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.drugCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.batchNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No inventory items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
