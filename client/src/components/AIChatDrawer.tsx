import React, { useEffect, useState } from 'react';
import { AIChatWindow } from './AIChatWindow';
import { useAuth } from '../contexts/AuthContext';

const normalizeRoleOption = (role: string | null): 'visitor' | 'staff' | 'admin' => {
  const normalized = (role || 'visitor').trim().toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (
    normalized === 'staff' ||
    normalized.includes('doctor') ||
    normalized.includes('nurse') ||
    normalized.includes('clinical') ||
    normalized.includes('pharmacy') ||
    normalized.includes('technician') ||
    normalized.includes('system admin')
  ) {
    return 'staff';
  }
  return 'visitor';
};

export const AIChatDrawer: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const userRole = user ? normalizeRoleOption(user.role) : 'visitor';
  const userId = user?.staffId || user?.id || '';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <span>{isOpen ? 'Close AI Chat' : 'Open AI Chat'}</span>
      </button>

      <div
        className={`fixed top-0 right-0 z-30 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out md:w-96 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-hidden border-l border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
              <p className="text-xs text-gray-500">Ask the AI for operational insights and safe answers.</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">Role</p>
                  <p className="mt-1 text-sm text-gray-800">{userRole}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-600">User ID</p>
                  <p className="mt-1 text-sm text-gray-800">{userId || 'Not set'}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-gray-100 px-2 py-2 text-gray-600 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="h-[calc(100%-152px)]">
            <AIChatWindow />
          </div>
        </div>
      </div>
    </>
  );
};
