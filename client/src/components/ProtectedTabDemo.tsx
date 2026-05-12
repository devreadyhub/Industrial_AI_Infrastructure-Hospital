import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedTab Demo Component
 * Shows how to test and interact with the clearance level system
 */
export const ProtectedTabDemo: React.FC = () => {
  const { user, updateClearanceLevel } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState<number>(user?.clearanceLevel ?? 1);

  const clearanceLevels = [
    { value: 1, label: 'RECEPTION (Level 1)', description: 'Visitor management, basic access' },
    { value: 2, label: 'PHARMACY (Level 2)', description: 'Medication management, Facilities access' },
    { value: 3, label: 'CLINICAL (Level 3)', description: 'Clinical data, nursing notes, lab results' },
    { value: 4, label: 'DOCTOR (Level 4)', description: 'Full clinical access, diagnostics' },
    { value: 5, label: 'ADMIN (Level 5)', description: 'All access including billing & system management' },
  ];

  const handleClearanceLevelChange = (level: number) => {
    setSelectedLevel(level);
    updateClearanceLevel(level);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 Clearance Level Settings</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-3">
          Current User: <span className="font-semibold">{user?.name}</span>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Current Clearance Level: <span className="font-semibold text-blue-600">{selectedLevel}</span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 mb-3 block">
          Select Clearance Level to Test Protection:
        </label>
        {clearanceLevels.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => handleClearanceLevelChange(value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              selectedLevel === value
                ? 'bg-blue-50 border-blue-500'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                checked={selectedLevel === value}
                onChange={() => handleClearanceLevelChange(value)}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-900">
          💡 <strong>Try this:</strong> Select different clearance levels and navigate to the Billing (Level 5), 
          Facilities (Level 2), and Clinical (Level 3) tabs to see the protection in action!
        </p>
      </div>
    </div>
  );
};
