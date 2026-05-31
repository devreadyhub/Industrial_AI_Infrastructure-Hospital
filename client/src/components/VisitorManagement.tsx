import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Users, Search } from 'lucide-react';
import RefreshIcon from './icons/RefreshIcon';
import { authFetch } from '../utils/api';

interface Visitor {
  id: number;
  visitorCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  relationship: string;
  patientId?: number;
  staffId?: number;
  targetType: 'patient' | 'staff';
  targetName: string;
  targetCode?: string;
  wardId?: number;
  wardName?: string;
  checkInTime: string;
  checkOutTime?: string;
  expiresAt?: string;
  purpose?: string;
  checkedInBy: string;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'ARCHIVED';
}

interface Patient {
  id: number;
  patientCode: string;
  firstName: string;
  lastName: string;
  ward: {
    id: number;
    wardName: string;
  };
  wardNumber?: number;
}

interface StaffMember {
  id: number;
  staffCode: string;
  firstName: string;
  lastName: string;
  department?: string;
  assignedWardId?: number | null;
}

export const VisitorManagement: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitTargetSearch, setVisitTargetSearch] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    visitorCode: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    relationship: '',
    visitType: 'patient' as 'patient' | 'staff',
    targetId: '',
    purpose: '',
    checkedInBy: 'Security Staff',
  });

  const generateVisitorCode = () => {
    const code = `VIS-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData(prev => ({ ...prev, visitorCode: code }));
  };

  useEffect(() => {
    loadVisitors();
    loadPatients();
    loadStaff();
  }, []);

  const loadVisitors = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await authFetch(`${backendUrl}/api/visitors`);
      if (response.ok) {
        const data = await response.json();
        setVisitors(data.map((visitor: any) => ({
          ...visitor,
          wardNumber: parseWardNumber(visitor.wardName),
        })));
      }
    } catch (error) {
      console.error('Failed to load visitors:', error);
    }
  };

  const parseWardNumber = (wardName?: string): number | undefined => {
    if (!wardName) return undefined;
    const match = wardName.match(/\d+/);
    return match ? Number(match[0]) : undefined;
  };

  const loadPatients = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await authFetch(`${backendUrl}/api/patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.map((patient: any) => ({
          ...patient,
          wardNumber: parseWardNumber(patient.ward?.wardName),
        })));
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await authFetch(`${backendUrl}/api/visitors/staff`);
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      }
    } catch (error) {
      console.error('Failed to load staff members:', error);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.targetId) {
      window.alert(`Please select a ${formData.visitType === 'patient' ? 'patient' : 'staff'} from the search results before checking in.`);
      setLoading(false);
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const payload: Record<string, unknown> = {
        visitorCode: formData.visitorCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        relationship: formData.relationship,
        purpose: formData.purpose,
        checkedInBy: formData.checkedInBy,
      };

      if (formData.visitType === 'patient') {
        payload.patientId = formData.targetId;
      } else {
        payload.staffId = formData.targetId;
      }

      const response = await authFetch(`${backendUrl}/api/visitors/check-in`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadVisitors();
        setShowCheckInForm(false);
        setFormData({
          visitorCode: '',
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          relationship: '',
          visitType: 'patient',
          targetId: '',
          purpose: '',
          checkedInBy: 'Security Staff',
        });
        setVisitTargetSearch('');
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
      const backendUrl = getBackendUrl();
      const response = await authFetch(`${backendUrl}/api/visitors/${visitorId}/check-out`, {
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
     visitor.targetName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedPatient = patients.find((p) => p.id.toString() === formData.targetId);
  const selectedStaff = staffList.find((s) => s.id.toString() === formData.targetId);

  const filteredTargets = (formData.visitType === 'patient' ? patients : staffList)
    .filter((entity) => {
      const text = formData.visitType === 'patient'
        ? `${entity.patientCode} ${entity.firstName} ${entity.lastName}`
        : `${entity.staffCode} ${entity.firstName} ${entity.lastName}`;
      return text.toLowerCase().includes(visitTargetSearch.toLowerCase());
    });

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

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visitor ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={formData.visitorCode}
                      placeholder="Generate visitor ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={generateVisitorCode}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    >
                      <RefreshIcon className="w-4 h-4" />
                      Generate ID
                    </button>
                  </div>
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Visiting target *</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Target type</label>
                    <select
                      required
                      value={formData.visitType}
                      onChange={(e) => setFormData({ ...formData, visitType: e.target.value as 'patient' | 'staff', targetId: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="patient">Patient</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search by name or ID</label>
                    <input
                      type="text"
                      value={visitTargetSearch}
                      onChange={(e) => setVisitTargetSearch(e.target.value)}
                      placeholder="Search target..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-md border border-gray-300 bg-white p-3">
                    {filteredTargets.length > 0 ? (
                      filteredTargets.slice(0, 8).map((entity) => (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, targetId: entity.id.toString() });
                            setVisitTargetSearch(formData.visitType === 'patient'
                              ? `${entity.patientCode} — ${entity.firstName} ${entity.lastName}`
                              : `${entity.staffCode} — ${entity.firstName} ${entity.lastName}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {formData.visitType === 'patient'
                            ? `${entity.patientCode} — ${entity.firstName} ${entity.lastName} (${entity.ward.wardName}${entity.wardNumber ? ` • Ward ${entity.wardNumber}` : ''})`
                            : `${entity.staffCode} — ${entity.firstName} ${entity.lastName}${entity.department ? ` (${entity.department})` : ''}`}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Type a name or ID to search available {formData.visitType === 'patient' ? 'patients' : 'staff'}.</p>
                    )}
                  </div>

                  {(formData.visitType === 'patient' && selectedPatient) || (formData.visitType === 'staff' && selectedStaff) ? (
                    <div className="text-sm text-gray-600">
                      <p>
                        Selected {formData.visitType}: {formData.visitType === 'patient' ? `${selectedPatient?.patientCode} — ${selectedPatient?.firstName} ${selectedPatient?.lastName}` : `${selectedStaff?.staffCode} — ${selectedStaff?.firstName} ${selectedStaff?.lastName}${selectedStaff?.department ? ` (${selectedStaff.department})` : ''}`}
                      </p>
                      {formData.visitType === 'patient' && selectedPatient ? (
                        <p>Ward: {selectedPatient.ward.wardName}{selectedPatient.wardNumber ? ` • Ward ${selectedPatient.wardNumber}` : ''}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
                  onClick={() => {
                    setShowCheckInForm(false);
                    setVisitTargetSearch('');
                  }}
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
                      <p className="text-sm text-gray-600">ID: {visitor.visitorCode}</p>
                      <p className="text-sm text-gray-600">
                        Visiting {visitor.targetType === 'patient' ? 'patient' : 'staff'}: {visitor.targetName}{visitor.wardName ? ` in ${visitor.wardName}` : ''}
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
