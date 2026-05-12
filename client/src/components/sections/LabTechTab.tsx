import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { labTechSchema, LabTechFormData } from '../../schemas/validation';
import { Input, TextArea, Button, Alert } from '../common/FormComponents';
import { useSubmitLabTest, useLabTests } from '../../hooks/useApi';
import { Loader } from 'lucide-react';

export const LabTechTab: React.FC = () => {
  const [jsonError, setJsonError] = useState<string>('');
  const { mutate: submitTest, isPending, isSuccess, isError } = useSubmitLabTest();
  const { data: labTests, isLoading: isLoadingData } = useLabTests();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LabTechFormData>({
    resolver: zodResolver(labTechSchema),
    defaultValues: {
      patientId: '',
      testName: '',
      testResults: '{}',
      testDate: new Date().toISOString().slice(0, 16),
      performedBy: 'STF-0001',
    },
  });

  const testResults = watch('testResults');

  const onSubmit = (data: LabTechFormData) => {
    try {
      JSON.parse(data.testResults);
      setJsonError('');
      submitTest(data, {
        onSuccess: () => {
          reset({
            ...data,
            testResults: '{}',
            testDate: new Date().toISOString().slice(0, 16),
          });
        },
      });
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  const validateJson = (value: string) => {
    try {
      JSON.parse(value);
      setJsonError('');
      return true;
    } catch (e) {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const testStatusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    REVIEWED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lab Tech - Diagnostics</h2>
        <p className="text-gray-600">
          Upload and manage diagnostic test results with JSON structured data
        </p>
      </div>

      {isSuccess && (
        <Alert type="success" message="Lab test submitted successfully" />
      )}
      {isError && <Alert type="error" message="Failed to submit lab test" />}

      {/* Lab Test Entry Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Lab Test Result</h3>

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
              name="testName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Test Name"
                  placeholder="Blood Work, X-Ray, etc."
                  required
                  error={errors.testName}
                />
              )}
            />

            <Controller
              name="testDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Test Date & Time"
                  type="datetime-local"
                  required
                  error={errors.testDate}
                />
              )}
            />

            <Controller
              name="performedBy"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Performed By (Staff ID)"
                  placeholder="STF-0001"
                  required
                  error={errors.performedBy}
                />
              )}
            />
          </div>

          <Controller
            name="normalRange"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Normal Range (optional)"
                placeholder="e.g., 70-100 mg/dL"
                error={errors.normalRange}
              />
            )}
          />

          {/* JSON Editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Test Results (JSON Format) <span className="text-red-500">*</span>
            </label>
            <Controller
              name="testResults"
              control={control}
              render={({ field }) => (
                <>
                  <textarea
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      validateJson(e.target.value);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none ${
                      jsonError || errors.testResults
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    rows={6}
                    placeholder={JSON.stringify(
                      {
                        glucose: 95,
                        hemoglobin: 14.5,
                        platelets: 250,
                      },
                      null,
                      2
                    )}
                  />
                  {jsonError && (
                    <p className="text-red-500 text-sm">{jsonError}</p>
                  )}
                  {errors.testResults && (
                    <p className="text-red-500 text-sm">{errors.testResults.message}</p>
                  )}
                </>
              )}
            />
            <p className="text-xs text-gray-500">
              Enter test data as JSON. Example: {'{'}
              &quot;glucose&quot;: 95, &quot;hemoglobin&quot;: 14.5{'}'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isPending}>
              Submit Test Result
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                setJsonError('');
              }}
              disabled={isPending}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {/* Lab Tests History */}
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Lab Tests</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Patient ID
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Test Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Performed By
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">
                      Results Preview
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {labTests && labTests.length > 0 ? (
                    labTests.slice(0, 10).map((test: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{test.patientId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{test.testName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(test.testDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{test.performedBy}</td>
                        <td className="px-4 py-3 text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {typeof test.testResults === 'string'
                              ? test.testResults.substring(0, 30) + '...'
                              : JSON.stringify(test.testResults).substring(0, 30) + '...'}
                          </code>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No lab tests found
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
