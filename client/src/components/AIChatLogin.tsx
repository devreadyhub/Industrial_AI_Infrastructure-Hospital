import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, AlertCircle } from 'lucide-react';
import { getBackendUrl } from '../utils/backend';
import { useAuth } from '../contexts/AuthContext';

interface AIChatLoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const AIChatLogin: React.FC<AIChatLoginProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Store token and user info for both AI chat and shared app auth state
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      localStorage.setItem('aiChatUser', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userId', data.user.staffId || data.user.id);
      login(data.user);

      onLoginSuccess(data.token, data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection error');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">AI Chat Login</h2>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Staff ID / Username
          </label>
          <input
            type="text"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Enter your staff ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !staffId || !password}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition duration-200 flex items-center justify-center"
        >
          <LogIn size={18} className="mr-2" />
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">
        Secure authentication required for AI Chat access
      </p>
    </div>
  );
};
