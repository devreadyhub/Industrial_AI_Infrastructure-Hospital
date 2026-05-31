import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicalSchema, ClinicalFormData } from '../../schemas/validation';
import {
  Input,
  Select,
  TextArea,
  Button,
  Alert,
} from '../common/FormComponents';
import { useAddClinicalEntry, useClinicalEntries } from '../../hooks/useApi';
import { Loader } from 'lucide-react';
import RefreshIcon from '../icons/RefreshIcon';
import { useAuth } from '../../contexts/AuthContext';

export const ClinicalTab: React.FC<{ emergencyPatientId?: number | null }> = ({ emergencyPatientId }) => {
  const [selectedWard, setSelectedWard] = useState<number>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const { mutate: addEntry, isPending, isError, isSuccess } = useAddClinicalEntry();
  const { data: clinicalData, isLoading: isLoadingData } = useClinicalEntries();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    register,
    watch,
    formState: { errors },
  } = useForm<ClinicalFormData>({
    resolver: zodResolver(clinicalSchema),
    defaultValues: {
      wardNumber: selectedWard,
      triageLevel: 'Urgent',
      patientCode: '',
    },
  });

  React.useEffect(() => {
    setValue('wardNumber', selectedWard);
  }, [selectedWard, setValue]);

  const patientCodeField = watch('patientCode');

  const onSubmit = async (data: ClinicalFormData) => {
    setSubmitError(null);
    addEntry(data, {
      onSuccess: () => {
        reset();
        setSelectedWard(1);
        setSubmitError(null);
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error || error?.message || 'Failed to submit patient admission';
        setSubmitError(message);
      },
    });
  };

  const generatePatientCode = () => {
    const suffix = Math.floor(10000 + Math.random() * 90000);
    setValue('patientCode', `PAT-${suffix}`);
  };

  const wards = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinical - Nurse Station</h2>
        <p className="text-gray-600">
          Manage patient admissions and ward assignments across all wards
        </p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Patient admission recorded successfully" />
      )}
      {submitError && (
        <Alert type="error" message={submitError} />
      )}
      {!submitError && isError && (
        <Alert type="error" message="Failed to record patient admission" />
      )}

      {/* Ward Grid Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ward Selection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {wards.map((ward) => (
            <button
              key={ward}
              onClick={() => setSelectedWard(ward)}
              className={`py-3 rounded-lg font-semibold transition-all ${
                selectedWard === ward
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              W{ward}
            </button>
          ))}
        </div>
      </div>

      {/* Admission Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          New Admission - Ward {selectedWard}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Patient Information */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Patient Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="patientCode"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Input
                      {...field}
                      label="Patient ID"
                      placeholder="PAT-12345"
                      error={errors.patientCode}
                    />
                    <button
                      type="button"
                      onClick={generatePatientCode}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      <RefreshIcon className="w-4 h-4" />
                      Generate patient ID
                    </button>
                  </div>
                )}
              />

              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Date of Birth"
                    type="date"
                    error={errors.dateOfBirth}
                  />
                )}
              />

              <Controller
                name="contactNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Contact Number"
                    placeholder="1234567890"
                    required
                    error={errors.contactNumber}
                  />
                )}
              />
            </div>
          </div>

          {/* Medical Integrity & Safety */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Medical Integrity & Safety
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Gender/Biological Sex"
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
                name="allergies"
                control={control}
                render={({ field }) => (
                  <TextArea
                    {...field}
                    label="Allergies"
                    placeholder="List any known allergies (e.g., Penicillin, Sulfa, Nuts)"
                    rows={2}
                    error={errors.allergies}
                  />
                )}
              />

              <Controller
                name="chronicConditions"
                control={control}
                render={({ field }) => (
                  <TextArea
                    {...field}
                    label="Chronic Conditions"
                    placeholder="e.g., Diabetes, Hypertension, Asthma"
                    rows={2}
                    error={errors.chronicConditions}
                  />
                )}
              />

              <Controller
                name="currentMedications"
                control={control}
                render={({ field }) => (
                  <TextArea
                    {...field}
                    label="Current Medications"
                    placeholder="List current medications with dosages"
                    rows={2}
                    error={errors.currentMedications}
                  />
                )}
              />
            </div>
          </div>

          {/* Operational & Workflow Efficiency */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Admission & Workflow
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="admissionSource"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Admission Source"
                    options={[
                      { value: 'ER', label: 'Emergency Room' },
                      { value: 'Outpatient', label: 'Outpatient' },
                      { value: 'Referral', label: 'Referral' },
                      { value: 'Walk-in', label: 'Walk-in' },
                      { value: 'Ambulance', label: 'Ambulance' },
                    ]}
                    error={errors.admissionSource}
                  />
                )}
              />

              <Controller
                name="admissionTime"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Admission Time"
                    type="datetime-local"
                    error={errors.admissionTime}
                  />
                )}
              />

              <Controller
                name="estimatedLengthOfStay"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Estimated Length of Stay (days)"
                    type="number"
                    min="1"
                    error={errors.estimatedLengthOfStay}
                  />
                )}
              />

              <Controller
                name="triageLevel"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Triage Level"
                    required
                    options={[
                      { value: 'Emergency', label: 'Emergency' },
                      { value: 'Urgent', label: 'Urgent' },
                      { value: 'Non-urgent', label: 'Non-urgent' },
                    ]}
                    error={errors.triageLevel}
                  />
                )}
              />

              <Controller
                name="assignedAttendingPhysician"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Assigned Attending Physician/Doctor"
                    placeholder="Dr. Smith or Staff ID"
                    error={errors.assignedAttendingPhysician}
                  />
                )}
              />
            </div>
          </div>

          {/* Compliance & Logistics */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Emergency Contact & Insurance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="nextOfKinName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Next of Kin / Emergency Contact Name"
                    placeholder="John Smith"
                    error={errors.nextOfKinName}
                  />
                )}
              />

              <Controller
                name="nextOfKinContact"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Next of Kin Contact Number"
                    placeholder="1234567890"
                    error={errors.nextOfKinContact}
                  />
                )}
              />

              <Controller
                name="insuranceType"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Insurance Type / Payment Method"
                    placeholder="e.g., Blue Cross, Medicare"
                    error={errors.insuranceType}
                  />
                )}
              />

              {user?.staffId ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-900">Admitted by</p>
                  <p className="text-lg font-semibold text-blue-800">{user.staffId}</p>
                  <p className="text-sm text-blue-700">Auto-filled from your authenticated account</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Admission Notes
            </h4>
            <Controller
              name="admissionNotes"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  label="Clinical Admission Notes"
                  placeholder="Enter additional clinical notes, presenting complaints, initial assessment, etc."
                  rows={4}
                  error={errors.admissionNotes}
                />
              )}
            />
          </div>

          <input
            type="hidden"
            value={selectedWard}
            {...register('wardNumber', { valueAsNumber: true })}
          />

          {submitError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              Record Admission
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

      {/* Recent Admissions */}
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Admissions - Ward {selectedWard}
          </h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Patient
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      DOB / Gender
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Blood Type
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Allergies
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Triage
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clinicalData && clinicalData.length > 0 ? (
                    clinicalData
                      .filter((item: any) => item.wardNumber === selectedWard)
                      .slice(0, 5)
                      .map((item: any, idx: number) => (
                        <tr
                          key={idx}
                          className={`border-b hover:bg-gray-50 ${
                            emergencyPatientId && item.patientId === emergencyPatientId
                              ? 'bg-red-50 border-l-4 border-red-500 animate-pulse'
                              : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.patientName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.dateOfBirth && new Date(item.dateOfBirth).toLocaleDateString()} {item.gender && `/ ${item.gender}`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.bloodType || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.allergies ? item.allergies.substring(0, 30) + '...' : '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.triageLevel === 'Emergency'
                                  ? 'bg-red-100 text-red-800'
                                  : item.triageLevel === 'Urgent'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {item.triageLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.admissionSource || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.contactNumber || '—'}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No admissions in this ward
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
