import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Users, Search } from 'lucide-react';

interface Visitor {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  relationship: string;
  patientId: number;
  patientName: string;
  wardId: number;
  wardName: string;
  checkInTime: string;
  checkOutTime?: string;
  purpose?: string;
  checkedInBy: string;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'ARCHIVED';
}

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  ward: {
    id: number;
    wardName: string;
  };
}

export const VisitorManagement: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    relationship: '',
    patientId: '',
    purpose: '',
    checkedInBy: 'Security Staff',
  });

  useEffect(() => {
    loadVisitors();
    loadPatients();
  }, []);

  const loadVisitors = async () => {
    try {
      const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/visitors`);
      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      }
    } catch (error) {
      console.error('Failed to load visitors:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/visitors/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadVisitors();
        setShowCheckInForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          relationship: '',
          patientId: '',
          purpose: '',
          checkedInBy: 'Security Staff',
        });
      } else {
        console.error('Failed to check in visitor');
      }
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (visitorId: number) => {
    try {
      const backendUrl = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/visitors/${visitorId}/check-out`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadVisitors();
      }
    } catch (error) {
      console.error('Check-out error:', error);
    }
  };

  const filteredVisitors = visitors.filter(visitor =>
    visitor.status === 'ACTIVE' &&
    (visitor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     visitor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     visitor.patientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedPatient = patients.find(p => p.id.toString() === formData.patientId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Visitor Management</h1>
        <p className="text-gray-600">Manage visitor check-ins and check-outs for hospital security</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Visitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <UserPlus className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Checked Out Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v =>
                  v.status === 'CHECKED_OUT' &&
                  new Date(v.checkOutTime!).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <UserMinus className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {visitors.filter(v =>
                  new Date(v.checkInTime).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search visitors by name or patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCheckInForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Check In Visitor
        </button>
      </div>

      {/* Check-in Form Modal */}
      {showCheckInForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Check In Visitor</h2>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                <select
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select relationship</option>
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Legal">Legal</option>
                  <option value="Spiritual">Spiritual</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <select
                  required
                  value={formData.patientId}
                  onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.ward.wardName}
                    </option>
                  ))}
                </select>
                {selectedPatient && (
                  <p className="text-sm text-gray-600 mt-1">
                    Visiting: {selectedPatient.firstName} {selectedPatient.lastName} in {selectedPatient.ward.wardName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  placeholder="Reason for visit..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Checking In...' : 'Check In'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckInForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visitors List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Visitors</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredVisitors.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No active visitors found
            </div>
          ) : (
            filteredVisitors.map(visitor => (
              <div key={visitor.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {visitor.firstName} {visitor.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Visiting: {visitor.patientName} in {visitor.wardName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Relationship: {visitor.relationship} • Checked in: {new Date(visitor.checkInTime).toLocaleString()}
                      </p>
                      {visitor.purpose && (
                        <p className="text-xs text-gray-500">Purpose: {visitor.purpose}</p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCheckOut(visitor.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  <UserMinus className="w-4 h-4" />
                  Check Out
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
