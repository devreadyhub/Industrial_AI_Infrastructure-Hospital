import React, { useState, useEffect } from 'react';
import { NurseStationTab } from './tabs/NurseStationTab';
import { LabTechTab } from './tabs/LabTechTab';
import { PharmacyTab } from './tabs/PharmacyTab';
import { authFetch } from '../utils/api';

type TabType = 'nurse' | 'lab' | 'pharmacy';

export const OperationalInputDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('nurse');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch staff data for validation
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      } else {
        console.error('Failed to fetch staff data:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'nurse' as TabType, label: 'Nurse Station', icon: '🏥' },
    { id: 'lab' as TabType, label: 'Lab Tech', icon: '🧪' },
    { id: 'pharmacy' as TabType, label: 'Pharmacy', icon: '💊' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white">Operational Input Dashboard</h1>
          <p className="text-slate-300 mt-2">Hospital Management System - Data Entry Portal</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="bg-slate-700 text-white p-4 rounded-lg text-center">
            Loading staff data...
          </div>
        )}

        {activeTab === 'nurse' && <NurseStationTab staffList={staffList} />}
        {activeTab === 'lab' && <LabTechTab />}
        {activeTab === 'pharmacy' && <PharmacyTab />}
      </div>
    </div>
  );
};
