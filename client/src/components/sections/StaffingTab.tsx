import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffingSchema, StaffingFormData } from '../../schemas/validation';
import { Input, Select, Button, Alert } from '../common/FormComponents';
import { useUpdateStaffStatus, useStaffDirectory } from '../../hooks/useApi';
import { Loader, Search } from 'lucide-react';

export const StaffingTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: updateStatus, isPending, isSuccess, isError } = useUpdateStaffStatus();
  const { data: staffData, isLoading: isLoadingData } = useStaffDirectory();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<StaffingFormData>({
    resolver: zodResolver(staffingSchema),
    defaultValues: {
      staffId: '',
      staffName: '',
      staffStatus: 'On-duty',
      seniority: 'Mid-level',
      shiftAssignment: 'Morning (6AM-2PM)',
      department: '',
    },
  });

  const onSubmit = (data: StaffingFormData) => {
    updateStatus(data, {
      onSuccess: () => {
        reset();
        setEditingId(null);
      },
    });
  };

  const filteredStaff = staffData?.filter(
    (staff: any) =>
      staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusColors = {
    'On-duty': 'bg-green-100 text-green-800',
    'Off-duty': 'bg-gray-100 text-gray-800',
    'On-break': 'bg-yellow-100 text-yellow-800',
  };

  const seniorityColors = {
    Junior: 'text-gray-600',
    'Mid-level': 'text-blue-600',
    Senior: 'text-purple-600',
    Lead: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Staffing - Admin</h2>
        <p className="text-gray-600">Manage staff status, shifts, and assignments</p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Staff status updated successfully" />
      )}
      {isError && <Alert type="error" message="Failed to update staff status" />}

      {/* Update Staff Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Update Staff' : 'Add/Update Staff'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="staffId"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Staff ID"
                  placeholder="STF-0001"
                  required
                  error={errors.staffId}
                />
              )}
            />

            <Controller
              name="staffName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Staff Name"
                  placeholder="Dr. Smith"
                  required
                  error={errors.staffName}
                />
              )}
            />

            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Department"
                  placeholder="Emergency, ICU, etc."
                  required
                  error={errors.department}
                />
              )}
            />

            <Controller
              name="staffStatus"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Status"
                  required
                  options={[
                    { value: 'On-duty', label: 'On-duty' },
                    { value: 'Off-duty', label: 'Off-duty' },
                    { value: 'On-break', label: 'On-break' },
                  ]}
                  error={errors.staffStatus}
                />
              )}
            />

            <Controller
              name="seniority"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Seniority Level"
                  required
                  options={[
                    { value: 'Junior', label: 'Junior' },
                    { value: 'Mid-level', label: 'Mid-level' },
                    { value: 'Senior', label: 'Senior' },
                    { value: 'Lead', label: 'Lead' },
                  ]}
                  error={errors.seniority}
                />
              )}
            />

            <Controller
              name="shiftAssignment"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Shift Assignment"
                  required
                  options={[
                    { value: 'Morning (6AM-2PM)', label: 'Morning (6AM-2PM)' },
                    { value: 'Afternoon (2PM-10PM)', label: 'Afternoon (2PM-10PM)' },
                    { value: 'Night (10PM-6AM)', label: 'Night (10PM-6AM)' },
                  ]}
                  error={errors.shiftAssignment}
                />
              )}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              {editingId ? 'Update Staff' : 'Add Staff'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  setEditingId(null);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Staff Directory */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Staff Directory</h3>
          <div className="relative w-64">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff: any) => (
                <div
                  key={staff.staffId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900">{staff.staffName}</h4>
                    <p className="text-sm text-gray-600">{staff.staffId}</p>
                    <p className="text-xs text-gray-500 mt-1">{staff.department}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusColors[staff.staffStatus as keyof typeof statusColors]
                        }`}
                      >
                        {staff.staffStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Seniority:</span>
                      <span className={`text-xs font-medium ${seniorityColors[staff.seniority as keyof typeof seniorityColors]}`}>
                        {staff.seniority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Shift:</span>
                      <span className="text-xs font-medium text-gray-900">{staff.shiftAssignment}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingId(staff.staffId)}
                    className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No staff members found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
