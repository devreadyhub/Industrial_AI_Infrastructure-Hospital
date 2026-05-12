import React from 'react';
import { Shield } from 'lucide-react';
import AuditHistoryTable from './AuditHistoryTable';

const AdminTab: React.FC = () => {
  return (
    <div className="w-full space-y-6 p-6">
      {/* Admin Panel Header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-700 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <Shield className="h-8 w-8 flex-shrink-0 mt-1" />
          <div>
            <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            <p className="text-amber-100 mt-2">
              Access comprehensive audit logs and system monitoring. All activity is recorded for compliance and security purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Audit History Section */}
      <div>
        <AuditHistoryTable />
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-900">Audit Log Information</h3>
        <ul className="text-blue-700 text-sm mt-2 space-y-1">
          <li>• All audit logs are read-only and immutable for compliance integrity</li>
          <li>• RED highlighted entries indicate privacy-filtered or denied access attempts</li>
          <li>• Filter logs by user role, access status, and date range for targeted monitoring</li>
          <li>• Logs include prompts, responses, and access control decisions for regulatory review</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminTab;
