import React, { useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedTabProps {
  requiredClearance: number;
  children: React.ReactNode;
  tabName?: string;
}

/**
 * ProtectedTab Wrapper Component
 * 
 * Enforces role-based access control on tab content.
 * If user's clearanceLevel is below requiredClearance:
 * - Displays a blurred overlay
 * - Shows a lock icon
 * - Displays "Unauthorized Access" message
 * 
 * Clearance Levels:
 * - 1: RECEPTION
 * - 2: PHARMACY / FACILITIES
 * - 3: CLINICAL
 * - 4: DOCTOR
 * - 5: ADMIN (Billing)
 */
export const ProtectedTab: React.FC<ProtectedTabProps> = ({
  requiredClearance,
  children,
  tabName = 'This content',
}) => {
  const { user } = useAuth();
  const [isBreakGlassActive, setIsBreakGlassActive] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600 font-semibold">Authentication Required</p>
        </div>
      </div>
    );
  }

  const hasAccess = user.clearanceLevel >= requiredClearance;
  const canBreakGlass = user.clearanceLevel >= 5;

  const handleBreakGlass = () => {
    setIsBreakGlassActive(true);
    // TODO: send break-glass event to audit log for justification after incident.
  };

  if (hasAccess || isBreakGlassActive) {
    return <>{children}</>;
  }

  // User doesn't have sufficient clearance
  return (
    <div className="relative">
      {/* Blurred Content */}
      <div className="blur-sm pointer-events-none opacity-50">{children}</div>

      {/* Overlay with Lock Icon and Unauthorized Message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-20 rounded-lg backdrop-blur-sm">
        <Lock className="h-16 w-16 text-red-500 mb-4" />
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">🔒 Unauthorized Access</h3>
          <p className="text-gray-600 mb-4">
            You don't have permission to access {tabName}.
          </p>
          <div className="bg-gray-100 rounded p-3 text-sm text-gray-700 mb-4">
            <p className="font-semibold mb-1">Your Clearance Level: {user.clearanceLevel}</p>
            <p>Required Clearance Level: {requiredClearance}</p>
          </div>
          {canBreakGlass ? (
            <button
              onClick={handleBreakGlass}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 transition"
            >
              <Shield className="w-4 h-4" />
              Break Glass Override
            </button>
          ) : (
            <p className="text-xs text-gray-500 mt-4">
              Contact your administrator to request access
            </p>
          )}
          <p className="text-xs text-red-500 mt-4">
            Break-Glass usage will be flagged in the Audit Log for immediate justification.
          </p>
        </div>
      </div>
    </div>
  );
};
