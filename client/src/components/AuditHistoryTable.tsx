import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuditLog {
  id: string;
  createdAt: string;
  userId?: number;
  userRole?: string;
  actionType?: string;
  userPrompt?: string;
  systemResponse?: string;
  accessStatus?: string;
  interactionType?: string;
  status?: string;
}

interface FilterState {
  userRole: string;
  accessStatus: string;
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}

const AuditHistoryTable: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    userRole: '',
    accessStatus: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });

  // Fetch audit logs whenever filters change
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the token from localStorage (assuming it's stored after login)
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.accessStatus) params.append('accessStatus', filters.accessStatus);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/audit/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin clearance level required.');
        } else if (response.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(`Failed to fetch audit logs (${response.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch logs when component mounts or filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter changes
  const handleFilterChange = (field: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      offset: 0, // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePreviousPage = () => {
    setFilters((prev) => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  };

  const handleNextPage = () => {
    if (filters.offset + filters.limit < totalCount) {
      setFilters((prev) => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  // Truncate long text
  const truncateText = (text: string | undefined, maxLength: number = 50): string => {
    if (!text) return '—';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Check if user has admin clearance
  if (!user || user.clearanceLevel < 5) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 border-l-4 border-red-500 rounded">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-900">Access Denied</h3>
          <p className="text-red-700 mt-2">Admin clearance level (5) required to view audit logs.</p>
        </div>
      </div>
    );
  }

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(totalCount / filters.limit);
  const hasNextPage = filters.offset + filters.limit < totalCount;

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Audit History</h2>
        <p className="text-slate-300 text-sm mt-1">View and monitor AI interaction logs for compliance</p>
      </div>

      {/* Filters Section */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* User Role Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">User Role</label>
            <select
              value={filters.userRole}
              onChange={(e) => handleFilterChange('userRole', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="nurse">Nurse</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_technician">Lab Technician</option>
            </select>
          </div>

          {/* Access Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Access Status</label>
            <select
              value={filters.accessStatus}
              onChange={(e) => handleFilterChange('accessStatus', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="DENIED_BY_PRIVACY_FILTER">Denied (Privacy Filter)</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Records Per Page */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="ml-3 text-slate-600">Loading audit logs...</p>
        </div>
      )}

      {/* Table Section */}
      {!loading && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">User ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Action Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Prompt</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isDenied = log.accessStatus === 'DENIED_BY_PRIVACY_FILTER';
                return (
                  <tr
                    key={log.id}
                    className={`border-b border-slate-200 transition-colors ${
                      isDenied ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap text-xs font-mono ${isDenied ? 'text-red-700' : 'text-slate-600'}`}>
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-medium ${isDenied ? 'text-red-700' : 'text-slate-900'}`}>
                      {log.userId || '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isDenied ? 'text-red-700' : 'text-slate-600'}`}>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800">
                        {log.userRole || '—'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isDenied ? 'text-red-700' : 'text-slate-600'}`}>
                      {log.actionType || log.interactionType || '—'}
                    </td>
                    <td className={`px-4 py-3 max-w-xs truncate ${isDenied ? 'text-red-700' : 'text-slate-600'}`} title={log.userPrompt}>
                      {truncateText(log.userPrompt, 50)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isDenied ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                          DENIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                          SUCCESS
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && !error && (
        <div className="flex items-center justify-center py-12 bg-slate-50">
          <div className="text-center">
            <p className="text-slate-500 text-lg">No audit logs found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && logs.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalCount)} of {totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={filters.offset === 0}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <span className="px-4 py-2 text-sm font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!hasNextPage}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditHistoryTable;
