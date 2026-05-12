import React, { useEffect, useState } from 'react';
import { AIChatWindow } from './AIChatWindow';

const roleOptions = ['visitor', 'staff', 'admin'] as const;

type UserRoleOption = (typeof roleOptions)[number];

export const AIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRoleOption>('visitor');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRoleOption | null;
    const storedId = localStorage.getItem('userId');

    if (storedRole && roleOptions.includes(storedRole)) {
      setUserRole(storedRole);
    }
    if (storedId) {
      setUserId(storedId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userId', userId || '');
  }, [userRole, userId]);

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
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Role</span>
                  <select
                    value={userRole}
                    onChange={(event) => setUserRole(event.target.value as UserRoleOption)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">User ID</span>
                  <input
                    type="text"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    placeholder="Optional user identifier"
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
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
