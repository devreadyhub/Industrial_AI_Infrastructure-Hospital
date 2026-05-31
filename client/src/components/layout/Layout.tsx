import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Users,
  TestTube,
  Pill,
  Package,
  CreditCard,
  UserCheck,
  Lock,
  Shield,
} from 'lucide-react';
import { AIChatDrawer } from '../AIChatDrawer';
import { usePrivacyGuard } from '../../hooks/usePrivacyGuard';
import { useAuth } from '../../contexts/AuthContext';

type Section =
  | 'clinical'
  | 'staffing'
  | 'labtech'
  | 'pharmacy'
  | 'facilities'
  | 'finance'
  | 'visitors'
  | 'admin';

interface LayoutProps {
  currentSection: Section;
  onSectionChange: (section: Section) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentSection,
  onSectionChange,
  children,
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isBlurred, resumeSessionProps, verifySession } = usePrivacyGuard();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sections = [
    {
      id: 'clinical' as Section,
      label: 'Clinical',
      icon: Stethoscope,
      description: 'Nurse Station',
    },
    {
      id: 'staffing' as Section,
      label: 'Staffing',
      icon: Users,
      description: 'Admin',
    },
    {
      id: 'labtech' as Section,
      label: 'Lab Tech',
      icon: TestTube,
      description: 'Diagnostics',
    },
    {
      id: 'pharmacy' as Section,
      label: 'Pharmacy',
      icon: Pill,
      description: 'Inventory',
    },
    {
      id: 'facilities' as Section,
      label: 'Facilities',
      icon: Package,
      description: 'Logistics',
    },
    {
      id: 'finance' as Section,
      label: 'Finance',
      icon: CreditCard,
      description: 'Billing',
    },
    {
      id: 'visitors' as Section,
      label: 'Visitors',
      icon: UserCheck,
      description: 'Management',
    },
    {
      id: 'admin' as Section,
      label: 'Admin',
      icon: Shield,
      description: 'Audit & Security',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile, shown on tablet and up */}
      <div className="hidden md:flex md:w-64 bg-gray-900 text-white flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold">Hospital Ops</h1>
          <p className="text-gray-400 text-sm mt-1">Operational Dashboard</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <div>
                  <div className="font-medium text-sm">{section.label}</div>
                  <div className="text-xs text-gray-400">{section.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
          <p>v1.0.0</p>
          <p>Last sync: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile/Tablet Top Navigation */}
        <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-full overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-min">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = currentSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => onSectionChange(section.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          className={`flex-1 overflow-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ${
            isBlurred ? 'backdrop-blur-[15px] bg-black/10' : ''
          }`}
        >
          <div className="relative max-w-7xl mx-auto">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Secure hospital dashboard with AI, emergency, and operations controls.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
            {children}
            {isBlurred && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[3px] rounded-xl">
                <div className="pointer-events-auto bg-white/95 rounded-2xl border border-gray-200 shadow-xl p-8 text-center max-w-md mx-auto">
                  <Lock className="h-16 w-16 text-red-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Unauthorized Access</h3>
                  <p className="text-gray-600 mb-4">
                    The dashboard has been blurred for privacy after a period of inactivity.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onMouseEnter={resumeSessionProps.onMouseEnter}
                      onMouseLeave={resumeSessionProps.onMouseLeave}
                      className="rounded-full bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition"
                    >
                      Resume Session
                    </button>
                    <button
                      type="button"
                      onClick={verifySession}
                      className="rounded-full border border-gray-300 bg-white text-gray-800 px-5 py-3 font-semibold hover:bg-gray-50 transition"
                    >
                      Re-Verify Role
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AIChatDrawer />
    </div>
  );
};
