import React, { useState } from 'react';
import { z } from 'zod';
import { LabResultSchema } from '../../schemas/validation';
import RefreshIcon from '../icons/RefreshIcon';
import { authFetch } from '../../utils/api';

export const LabTechTab: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('{}');
  const [formData, setFormData] = useState({
    testId: '',
    testName: '',
    testCategory: 'Blood',
    status: 'COMPLETED',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const generateTestId = () => {
    setFormData((prev) => ({
      ...prev,
      testId: `LAB-${Date.now().toString().slice(-5)}`,
    }));
  };

  const validateJson = (json: string) => {
    try {
      JSON.parse(json);
      setJsonError('');
      return true;
    } catch {
      setJsonError('Invalid JSON format');
      return false;
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
  };

  const handleJsonBlur = () => {
    validateJson(jsonInput);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (!validateJson(jsonInput)) {
      return;
    }

    try {
      const validatedData = LabResultSchema.parse({
        ...formData,
        resultData: JSON.parse(jsonInput),
      });

      const response = await authFetch('/api/lab-tests', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) throw new Error('Failed to submit lab result');

      setSuccess(true);
      setFormData({
        testId: '',
        testName: '',
        testCategory: 'Blood',
        status: 'COMPLETED',
        notes: '',
      });
      setJsonInput('{}');

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else {
        setErrors({ submit: 'Failed to submit lab result' });
      }
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg shadow-xl p-8 border border-slate-600">
      <h2 className="text-2xl font-bold text-white mb-6">Lab Test Results Entry</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded-lg text-green-200">
          ✓ Lab test results recorded successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Test ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Test ID *</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="testId"
              value={formData.testId}
              onChange={handleFormChange}
              className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., LAB-2024-001"
            />
            <button
              type="button"
              onClick={generateTestId}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshIcon className="w-4 h-4" />
              Generate
            </button>
          </div>
          {errors.testId && <p className="text-red-400 text-sm mt-1">{errors.testId}</p>}
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Test Name *</label>
            <input
              type="text"
              name="testName"
              value={formData.testName}
              onChange={handleFormChange}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Complete Blood Count"
            />
            {errors.testName && <p className="text-red-400 text-sm mt-1">{errors.testName}</p>}
          </div>

          {/* Test Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Test Category</label>
            <select
              name="testCategory"
              value={formData.testCategory}
              onChange={handleFormChange}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Blood">Blood</option>
              <option value="Imaging">Imaging</option>
              <option value="Pathology">Pathology</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Biochemistry">Biochemistry</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* JSON Editor for Result Data */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Result Data (JSON) *</label>
          <textarea
            value={jsonInput}
            onChange={handleJsonChange}
            onBlur={handleJsonBlur}
            rows={6}
            className={`w-full px-4 py-2 bg-slate-600 border rounded-lg text-white focus:outline-none focus:ring-2 resize-none font-mono text-sm ${
              jsonError ? 'border-red-500 focus:ring-red-500' : 'border-slate-500 focus:ring-blue-500'
            }`}
            placeholder='{"hemoglobin": 13.5, "whiteBloodCells": 7.2, "platelets": 250}'
          />
          {jsonError && <p className="text-red-400 text-sm mt-1">{jsonError}</p>}
          {errors.resultData && <p className="text-red-400 text-sm mt-1">{errors.resultData}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Additional test notes..."
          />
        </div>

        {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Submit Lab Results
        </button>
      </form>
    </div>
  );
};
