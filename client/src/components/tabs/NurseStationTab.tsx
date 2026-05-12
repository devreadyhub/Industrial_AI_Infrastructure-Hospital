import React, { useState } from 'react';
import { z } from 'zod';
import { NurseStationSchema } from '../../schemas/validation';

interface NurseStationTabProps {
  staffList: any[];
}

export const NurseStationTab: React.FC<NurseStationTabProps> = ({ staffList }) => {
  const [formData, setFormData] = useState({
    ward: 'ICU',
    admittedBy: '',
    patientName: '',
    triageLevel: 'MEDIUM',
    admissionNotes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'admittedBy' ? (value ? parseInt(value) : '') : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    try {
      // Validate using Zod
      const validatedData = NurseStationSchema.parse(formData);

      // Send to API
      const response = await fetch('/api/patients/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) throw new Error('Failed to submit admission');

      setSuccess(true);
      setFormData({
        ward: 'ICU',
        admittedBy: '',
        patientName: '',
        triageLevel: 'MEDIUM',
        admissionNotes: '',
      });

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
        setErrors({ submit: 'Failed to submit form' });
      }
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg shadow-xl p-8 border border-slate-600">
      <h2 className="text-2xl font-bold text-white mb-6">Ward Occupancy & Admission</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded-lg text-green-200">
          ✓ Patient admission recorded successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ward Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Ward</label>
          <select
            name="ward"
            value={formData.ward}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ICU">ICU</option>
            <option value="General">General Ward</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Maternity">Maternity</option>
            <option value="Surgery">Surgery</option>
          </select>
        </div>

        {/* Patient Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Patient Name *</label>
          <input
            type="text"
            name="patientName"
            value={formData.patientName}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter patient name"
          />
          {errors.patientName && <p className="text-red-400 text-sm mt-1">{errors.patientName}</p>}
        </div>

        {/* Admitted By - Validates against Staff ID */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Admitted By (Staff ID) *</label>
          <select
            name="admittedBy"
            value={formData.admittedBy}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Staff Member --</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.id} - {staff.firstName} {staff.lastName}
              </option>
            ))}
          </select>
          {errors.admittedBy && <p className="text-red-400 text-sm mt-1">{errors.admittedBy}</p>}
        </div>

        {/* Triage Level */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Triage Level</label>
          <select
            name="triageLevel"
            value={formData.triageLevel}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="CRITICAL">🔴 CRITICAL</option>
            <option value="HIGH">🟠 HIGH</option>
            <option value="MEDIUM">🟡 MEDIUM</option>
            <option value="LOW">🟢 LOW</option>
            <option value="NON_URGENT">⚪ NON_URGENT</option>
          </select>
        </div>

        {/* Admission Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Admission Notes</label>
          <textarea
            name="admissionNotes"
            value={formData.admissionNotes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter additional admission notes..."
          />
        </div>

        {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Record Admission
        </button>
      </form>
    </div>
  );
};
