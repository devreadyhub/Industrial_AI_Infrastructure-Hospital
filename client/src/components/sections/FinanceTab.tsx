import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { financeSchema, FinanceFormData } from '../../schemas/validation';
import { Input, Select, Button, Alert } from '../common/FormComponents';
import { useUpdateFinance, useFinanceLookup } from '../../hooks/useApi';
import { Loader, Search } from 'lucide-react';

export const FinanceTab: React.FC = () => {
  const [lookupPatientId, setLookupPatientId] = useState('');
  const { mutate: updateFinance, isPending, isSuccess, isError } = useUpdateFinance();
  const {
    data: patientFinanceData,
    isLoading: isLoadingLookup,
    refetch: refetchLookup,
  } = useFinanceLookup(lookupPatientId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FinanceFormData>({
    resolver: zodResolver(financeSchema),
    defaultValues: {
      patientId: '',
      patientName: '',
      insuranceProvider: '',
      policyNumber: '',
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'Outstanding',
      paymentMethod: 'Cash',
    },
  });

  const totalAmount = watch('totalAmount');
  const paidAmount = watch('paidAmount');
  const paymentStatus = watch('paymentStatus');
  const patientIdField = watch('patientId');

  const onSubmit = (data: FinanceFormData) => {
    updateFinance(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  const pendingAmount = totalAmount - paidAmount;
  const paymentPercentage =
    totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const handleLookup = () => {
    if (lookupPatientId) {
      refetchLookup();
    }
  };

  const handleUsePatientData = () => {
    if (patientFinanceData) {
      setValue('patientId', patientFinanceData.patientId || lookupPatientId);
      setValue('patientName', patientFinanceData.patientName || '');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Finance - Billing/HMO</h2>
        <p className="text-gray-600">
          Manage patient billing, insurance claims, and payment tracking
        </p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Financial record updated successfully" />
      )}
      {isError && (
        <Alert type="error" message="Failed to update financial record" />
      )}

      {/* Patient Lookup */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Lookup</h3>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Enter Patient ID"
              value={lookupPatientId}
              onChange={(e) => setLookupPatientId(e.target.value)}
            />
          </div>
          <Button onClick={handleLookup} isLoading={isLoadingLookup}>
            <Search size={18} className="mr-2" />
            Search
          </Button>
        </div>

        {patientFinanceData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">Patient Name</p>
                <p className="font-semibold text-gray-900">
                  {patientFinanceData.patientName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Patient ID</p>
                <p className="font-semibold text-gray-900">
                  {patientFinanceData.patientId}
                </p>
              </div>
            </div>
            <Button onClick={handleUsePatientData} variant="secondary" className="w-full">
              Use This Patient Data
            </Button>
          </div>
        )}
      </div>

      {/* Billing Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bill Management
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="patientId"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Patient ID"
                  placeholder="PAT-001"
                  required
                  error={errors.patientId}
                />
              )}
            />

            <Controller
              name="patientName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Patient Name"
                  placeholder="John Doe"
                  required
                  error={errors.patientName}
                />
              )}
            />

            <Controller
              name="insuranceProvider"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Insurance Provider"
                  placeholder="NHIS, Private HMO, etc."
                  required
                  error={errors.insuranceProvider}
                />
              )}
            />

            <Controller
              name="policyNumber"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Policy Number"
                  placeholder="POL-123456"
                  required
                  error={errors.policyNumber}
                />
              )}
            />

            <Controller
              name="totalAmount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Total Amount ($)"
                  type="number"
                  step="0.01"
                  required
                  error={errors.totalAmount}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              )}
            />

            <Controller
              name="paidAmount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Amount Paid ($)"
                  type="number"
                  step="0.01"
                  required
                  error={errors.paidAmount}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              )}
            />

            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Payment Status"
                  required
                  options={[
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Partial', label: 'Partial' },
                    { value: 'Outstanding', label: 'Outstanding' },
                  ]}
                  error={errors.paymentStatus}
                />
              )}
            />

            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Payment Method"
                  required
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Card', label: 'Card' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Insurance', label: 'Insurance' },
                  ]}
                  error={errors.paymentMethod}
                />
              )}
            />

            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Due Date (optional)"
                  type="datetime-local"
                  error={errors.dueDate}
                />
              )}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              Update Bill
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

      {/* Payment Summary */}
      {totalAmount > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total Amount */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-md">
            <p className="text-sm font-medium opacity-90">Total Amount</p>
            <p className="text-3xl font-bold mt-2">${totalAmount.toFixed(2)}</p>
          </div>

          {/* Amount Paid */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-md">
            <p className="text-sm font-medium opacity-90">Amount Paid</p>
            <p className="text-3xl font-bold mt-2">${paidAmount.toFixed(2)}</p>
            <p className="text-xs mt-2">{paymentPercentage}% of total</p>
          </div>

          {/* Pending Amount */}
          <div
            className={`bg-gradient-to-br rounded-lg p-6 shadow-md text-white ${
              pendingAmount > 0
                ? 'from-red-500 to-red-600'
                : 'from-green-500 to-green-600'
            }`}
          >
            <p className="text-sm font-medium opacity-90">Pending Amount</p>
            <p className="text-3xl font-bold mt-2">${Math.max(0, pendingAmount).toFixed(2)}</p>
            <p className="text-xs mt-2">
              {pendingAmount > 0 ? 'Outstanding' : 'Fully Paid'}
            </p>
          </div>
        </div>
      )}

      {/* Quick Invoice Template */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Invoice Template</h3>
        <div className="bg-white p-4 rounded border border-gray-300 font-mono text-sm overflow-x-auto">
          <p>PATIENT BILL</p>
          <p>─────────────────────────</p>
          <p>Patient ID: {patientIdField || 'PAT-XXX'}</p>
          <p>Insurance: {watch('insuranceProvider') || 'Not set'}</p>
          <p>─────────────────────────</p>
          <p>Total Amount:        ${totalAmount.toFixed(2)}</p>
          <p>Amount Paid:         ${paidAmount.toFixed(2)}</p>
          <p>Pending:             ${Math.max(0, pendingAmount).toFixed(2)}</p>
          <p>─────────────────────────</p>
          <p>Status: {paymentStatus}</p>
          <p>Method: {watch('paymentMethod')}</p>
        </div>
      </div>
    </div>
  );
};
