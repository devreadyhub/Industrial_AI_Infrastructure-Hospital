import React, { useState } from 'react';
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

export const ClinicalTab: React.FC<{ emergencyPatientId?: number | null }> = ({ emergencyPatientId }) => {
  const [selectedWard, setSelectedWard] = useState<number>(1);
  const { mutate: addEntry, isPending, isError, isSuccess } = useAddClinicalEntry();
  const { data: clinicalData, isLoading: isLoadingData } = useClinicalEntries();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClinicalFormData>({
    resolver: zodResolver(clinicalSchema),
    defaultValues: {
      wardNumber: selectedWard,
      triageLevel: 'Urgent',
      admittedBy: 'STF-0001',
    },
  });

  const onSubmit = async (data: ClinicalFormData) => {
    addEntry(data, {
      onSuccess: () => {
        reset();
        setSelectedWard(1);
      },
    });
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
      {isError && (
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              name="admittedBy"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Admitted By (Staff ID)"
                  placeholder="STF-0001"
                  required
                  error={errors.admittedBy}
                />
              )}
            />
          </div>

          <Controller
            name="admissionNotes"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                label="Admission Notes"
                placeholder="Enter clinical notes, allergies, medications, etc."
                rows={4}
                error={errors.admissionNotes}
              />
            )}
          />

          <input type="hidden" value={selectedWard} {...{ name: 'wardNumber' }} />

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
                      Triage
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Admitted By
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
                          <td className="px-4 py-3 text-sm text-gray-900">{item.patientName}</td>
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
                          <td className="px-4 py-3 text-sm text-gray-900">{item.admittedBy}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.contactNumber}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
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
