import React, { useState } from 'react';
import { z } from 'zod';
import { PharmacySalesSchema } from '../../schemas/validation';
import RefreshIcon from '../icons/RefreshIcon';
import { authFetch } from '../../utils/api';

export const PharmacyTab: React.FC = () => {
  const [formData, setFormData] = useState({
    drugName: '',
    drugCode: '',
    quantity: '',
    salePrice: '',
    saleDate: new Date().toISOString().slice(0, 16),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'quantity' ? (value ? parseInt(value) : '') :
        name === 'salePrice' ? (value ? parseFloat(value) : '') :
        value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const generateDrugCode = () => {
    setFormData((prev) => ({
      ...prev,
      drugCode: prev.drugName ? prev.drugName.toUpperCase().replace(/\s+/g, '-') : `DRUG-${Date.now().toString().slice(-4)}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    try {
      const validatedData = PharmacySalesSchema.parse({
        ...formData,
        saleDate: new Date(formData.saleDate).toISOString(),
      });

      const response = await authFetch('/api/pharmacy/sales', {
        method: 'POST',
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) throw new Error('Failed to record sale');

      setSuccess(true);
      setFormData({
        drugName: '',
        drugCode: '',
        quantity: '',
        salePrice: '',
        saleDate: new Date().toISOString().slice(0, 16),
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
        setErrors({ submit: 'Failed to submit pharmacy sale' });
      }
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg shadow-xl p-8 border border-slate-600">
      <h2 className="text-2xl font-bold text-white mb-6">Pharmacy Sales Input</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded-lg text-green-200">
          ✓ Pharmacy sale recorded successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Drug Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Drug Name *</label>
          <input
            type="text"
            name="drugName"
            value={formData.drugName}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Aspirin 500mg"
          />
          {errors.drugName && <p className="text-red-400 text-sm mt-1">{errors.drugName}</p>}
        </div>

        {/* Drug Code */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Drug Code *</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="drugCode"
              value={formData.drugCode}
              onChange={handleChange}
              className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ASP-500"
            />
            <button
              type="button"
              onClick={generateDrugCode}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              <RefreshIcon className="w-4 h-4" />
              Generate
            </button>
          </div>
          {errors.drugCode && <p className="text-red-400 text-sm mt-1">{errors.drugCode}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Quantity *</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 100"
            min="1"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>}
        </div>

        {/* Sale Price */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Sale Price ($) *</label>
          <input
            type="number"
            name="salePrice"
            value={formData.salePrice}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2.50"
            step="0.01"
            min="0"
          />
          {errors.salePrice && <p className="text-red-400 text-sm mt-1">{errors.salePrice}</p>}
        </div>

        {/* Sale Date */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Sale Date & Time</label>
          <input
            type="datetime-local"
            name="saleDate"
            value={formData.saleDate}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.saleDate && <p className="text-red-400 text-sm mt-1">{errors.saleDate}</p>}
        </div>

        {/* Summary */}
        {formData.quantity && formData.salePrice && (
          <div className="bg-slate-600 rounded-lg p-4 border border-slate-500">
            <div className="text-slate-300 text-sm">
              <div className="flex justify-between mb-2">
                <span>Total Amount:</span>
                <span className="font-semibold text-blue-400">
                  ${(parseFloat(formData.salePrice as any) * parseInt(formData.quantity as any)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Record Sale
        </button>
      </form>
    </div>
  );
};
