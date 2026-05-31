import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffingSchema, StaffingFormData } from '../../schemas/validation';
import { Input, Select, Button, Alert } from '../common/FormComponents';
import { useUpdateStaffStatus, useStaffDirectory, useCreateStaff } from '../../hooks/useApi';
import { Loader, Search } from 'lucide-react';
import RefreshIcon from '../icons/RefreshIcon';

export const StaffingTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateStaffStatus();
  const { mutate: createStaff, isPending: isCreating } = useCreateStaff();
  const { data: staffData, isLoading: isLoadingData } = useStaffDirectory();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StaffingFormData>({
    resolver: zodResolver(staffingSchema),
    defaultValues: {
      staffId: '',
      staffName: '',
      staffStatus: 'On-duty',
      seniority: 'Mid-level',
      shiftAssignment: 'Morning (6AM-2PM)',
      department: 'Emergency',
      role: 'Doctor',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'Other',
      bloodType: 'O+',
      specialization: '',
      yearsOfExperience: 0,
      assignedWardId: '',
      onCallStatus: 'Available',
      nextScheduledShift: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      backgroundCheckDate: '',
      trainingExpiryDate: '',
      licenseNumber: '',
      certifications: '',
      currentLocation: '',
    },
  });

  const onSubmit = (data: StaffingFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (editingId) {
      // Update existing staff - include original ID in case it was changed in the form
      updateStatus({ ...data, originalId: editingId }, {
        onSuccess: () => {
          setSuccessMessage('Staff updated successfully');
          reset({
            staffId: generateStaffCode(),
            staffName: '',
            staffStatus: 'On-duty',
            seniority: 'Mid-level',
            shiftAssignment: 'Morning (6AM-2PM)',
            department: 'Emergency',
            role: 'Doctor',
            email: '',
            phone: '',
            dateOfBirth: '',
            gender: 'Other',
            bloodType: 'O+',
            specialization: '',
            yearsOfExperience: 0,
            assignedWardId: '',
            onCallStatus: 'Available',
            nextScheduledShift: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            backgroundCheckDate: '',
            trainingExpiryDate: '',
            licenseNumber: '',
            certifications: '',
            currentLocation: '',
          });
          setEditingId(null);
          setSearchTerm('');
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: (error: any) => {
          const message = error.response?.data?.message || error.response?.data?.error || 'Failed to update staff';
          setErrorMessage(message);
          console.error('Update failed:', message);
        },
      });
    } else {
      // Create new staff
      createStaff(data, {
        onSuccess: () => {
          setSuccessMessage('Staff added successfully');
          reset({
            staffId: generateStaffCode(),
            staffName: '',
            staffStatus: 'On-duty',
            seniority: 'Mid-level',
            shiftAssignment: 'Morning (6AM-2PM)',
            department: 'Emergency',
            role: 'Doctor',
            email: '',
            phone: '',
            dateOfBirth: '',
            gender: 'Other',
            bloodType: 'O+',
            specialization: '',
            yearsOfExperience: 0,
            assignedWardId: '',
            onCallStatus: 'Available',
            nextScheduledShift: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            backgroundCheckDate: '',
            trainingExpiryDate: '',
            licenseNumber: '',
            certifications: '',
            currentLocation: '',
          });
          setSearchTerm('');
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: (error: any) => {
          let message = 'Failed to add staff';
          
          // Try to extract error message from various sources
          if (error.response?.data?.message) {
            message = error.response.data.message;
          } else if (error.response?.data?.error) {
            message = error.response.data.error;
          } else if (error.response?.status === 400) {
            message = `Bad Request: Check that all fields are properly filled (${error.response?.data?.message || 'invalid data'})`;
          } else if (error.response?.status === 409) {
            message = 'A staff member with that ID already exists';
          } else if (error.message) {
            message = `Error: ${error.message}`;
          }
          
          setErrorMessage(message);
          console.error('Create failed:', message, 'Full error:', error);
        },
      });
    }
  };

  const departments = [
    'Emergency',
    'ICU',
    'Outpatient',
    'Pharmacy',
    'Radiology',
    'Laboratory',
    'Administration',
    'Support Services',
  ];

  const generateStaffCode = () => `STF-${Math.floor(1000 + Math.random() * 9000)}`;

  const watchedDepartment = watch('department');
  const watchedStaffId = watch('staffId');

  useEffect(() => {
    if (watchedDepartment && !watchedStaffId) {
      setValue('staffId', generateStaffCode());
    }
  }, [watchedDepartment, watchedStaffId, setValue]);

  // Populate form when entering edit mode
  useEffect(() => {
    if (editingId && staffData) {
      const s = staffData.find((st: any) => st.staffId === editingId);
      if (s) {
        setValue('staffId', s.staffId);
        setValue('staffName', s.staffName);
        setValue('department', s.department);
        setValue('staffStatus', s.staffStatus);
        setValue('seniority', s.seniority);
        setValue('shiftAssignment', s.shiftAssignment);
        setValue('role', s.role || 'Doctor');
        setValue('email', s.email || '');
        setValue('phone', s.phone || '');
        setValue('dateOfBirth', s.dateOfBirth || '');
        setValue('gender', s.gender || 'Other');
        setValue('bloodType', s.bloodType || 'O+');
        setValue('specialization', s.specialization || '');
        setValue('yearsOfExperience', s.yearsOfExperience ?? 0);
        setValue('assignedWardId', s.assignedWardId || '');
        setValue('onCallStatus', s.onCallStatus || 'Available');
        setValue('nextScheduledShift', s.nextScheduledShift || '');
        setValue('emergencyContactName', s.emergencyContactName || '');
        setValue('emergencyContactPhone', s.emergencyContactPhone || '');
        setValue('backgroundCheckDate', s.backgroundCheckDate || '');
        setValue('trainingExpiryDate', s.trainingExpiryDate || '');
        setValue('licenseNumber', s.licenseNumber || '');
        setValue('certifications', s.certifications || '');
        setValue('currentLocation', s.currentLocation || '');
      }
    } else if (!editingId) {
      // Reset form when exiting edit mode
      reset({
        staffId: generateStaffCode(),
        staffName: '',
        staffStatus: 'On-duty',
        seniority: 'Mid-level',
        shiftAssignment: 'Morning (6AM-2PM)',
        department: 'Emergency',
        role: 'Doctor',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: 'Other',
        bloodType: 'O+',
        specialization: '',
        yearsOfExperience: 0,
        assignedWardId: '',
        onCallStatus: 'Available',
        nextScheduledShift: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        backgroundCheckDate: '',
        trainingExpiryDate: '',
        licenseNumber: '',
        certifications: '',
        currentLocation: '',
      });
    }
  }, [editingId, staffData, setValue, reset]);

  const filteredStaff = staffData?.filter(
    (staff: any) =>
      staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.assignedWardId?.toLowerCase().includes(searchTerm.toLowerCase())
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

      {successMessage && (
        <Alert type="success" message={successMessage} />
      )}
      {errorMessage && <Alert type="error" message={errorMessage} />}

      {/* Update Staff Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Update Staff' : 'Add/Update Staff'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Staff Information</h4>
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  name="staffId"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Input
                        {...field}
                        label="Staff ID"
                        placeholder="STF-0001"
                        required
                        error={errors.staffId}
                      />
                      <button
                        type="button"
                        onClick={() => setValue('staffId', generateStaffCode())}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        <RefreshIcon className="w-4 h-4" />
                        Generate staff ID
                      </button>
                    </div>
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
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Role"
                      placeholder="Doctor, Nurse, Technician"
                      error={errors.role}
                    />
                  )}
                />

                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Department"
                      required
                      options={departments.map((department) => ({
                        value: department,
                        label: department,
                      }))}
                      error={errors.department}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="email"
                      label="Email"
                      placeholder="staff@example.com"
                      error={errors.email}
                    />
                  )}
                />

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Phone"
                      placeholder="1234567890"
                      error={errors.phone}
                    />
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Clinical & Credentials</h4>
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Date of Birth"
                      error={errors.dateOfBirth}
                    />
                  )}
                />

                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Gender"
                      options={[
                        { value: 'Male', label: 'Male' },
                        { value: 'Female', label: 'Female' },
                        { value: 'Other', label: 'Other' },
                      ]}
                      error={errors.gender}
                    />
                  )}
                />

                <Controller
                  name="bloodType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Blood Type"
                      options={[
                        { value: 'O+', label: 'O+' },
                        { value: 'O-', label: 'O-' },
                        { value: 'A+', label: 'A+' },
                        { value: 'A-', label: 'A-' },
                        { value: 'B+', label: 'B+' },
                        { value: 'B-', label: 'B-' },
                        { value: 'AB+', label: 'AB+' },
                        { value: 'AB-', label: 'AB-' },
                      ]}
                      error={errors.bloodType}
                    />
                  )}
                />

                <Controller
                  name="specialization"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Specialization"
                      placeholder="Emergency Medicine, ICU, Radiology"
                      error={errors.specialization}
                    />
                  )}
                />

                <Controller
                  name="yearsOfExperience"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Years of Experience"
                      placeholder="10"
                      min={0}
                      error={errors.yearsOfExperience}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Assignment & Availability</h4>
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  name="assignedWardId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Assigned Ward"
                      placeholder="Ward 3"
                      error={errors.assignedWardId}
                    />
                  )}
                />

                <Controller
                  name="onCallStatus"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="On-call Status"
                      options={[
                        { value: 'Available', label: 'Available' },
                        { value: 'On-call', label: 'On-call' },
                        { value: 'Standby', label: 'Standby' },
                        { value: 'Off-call', label: 'Off-call' },
                      ]}
                      error={errors.onCallStatus}
                    />
                  )}
                />

                <Controller
                  name="nextScheduledShift"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="datetime-local"
                      label="Next Scheduled Shift"
                      error={errors.nextScheduledShift}
                    />
                  )}
                />

                <Controller
                  name="currentLocation"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Current Location"
                      placeholder="Ward 3 / ICU"
                      error={errors.currentLocation}
                    />
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency & Compliance</h4>
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  name="emergencyContactName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Emergency Contact Name"
                      placeholder="Jane Doe"
                      error={errors.emergencyContactName}
                    />
                  )}
                />

                <Controller
                  name="emergencyContactPhone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Emergency Contact Phone"
                      placeholder="1234567890"
                      error={errors.emergencyContactPhone}
                    />
                  )}
                />

                <Controller
                  name="backgroundCheckDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Background Check Date"
                      error={errors.backgroundCheckDate}
                    />
                  )}
                />

                <Controller
                  name="trainingExpiryDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="Training Expiry Date"
                      error={errors.trainingExpiryDate}
                    />
                  )}
                />

                <Controller
                  name="licenseNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="License Number"
                      placeholder="LIC-123456"
                      error={errors.licenseNumber}
                    />
                  )}
                />

                <Controller
                  name="certifications"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Certifications"
                      placeholder="ACLS, BLS, PALS"
                      error={errors.certifications}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isUpdating || isCreating}>
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
                disabled={isUpdating || isCreating}
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

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Specialization:</span>
                      <span className="text-xs font-medium text-gray-900">{staff.specialization || 'General'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Ward:</span>
                      <span className="text-xs font-medium text-gray-900">{staff.assignedWardId || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">On-call:</span>
                      <span className="text-xs font-medium text-gray-900">{staff.onCallStatus || 'Available'}</span>
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
