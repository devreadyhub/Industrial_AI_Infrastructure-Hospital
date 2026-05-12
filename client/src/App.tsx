import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { VisitorManagement } from './components/VisitorManagement';
import { AdminSupport } from './components/AdminSupport';
import { AIChatContextProvider } from './hooks/useAIChatContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useJWTExpiryMonitor } from './hooks/useJWTExpiryMonitor';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

/**
 * Protected route wrapper component
 * Shows landing page for unauthenticated users, dashboard for authenticated users
 */
const ProtectedDashboard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />;
};

/**
 * Main app component that sets up routing and authentication
 */
const AppContent: React.FC = () => {
  // Monitor JWT expiry and security violations
  useJWTExpiryMonitor();

  const handleVisitorAccess = () => {
    // Navigate to visitor kiosk
    window.location.href = '/visitor';
  };

  return (
    <Routes>
      <Route path="/login" element={<LandingPage onVisitorAccess={handleVisitorAccess} />} />
      <Route path="/admin-support" element={<AdminSupport />} />
      <Route path="/visitor" element={<VisitorManagement />} />
      <Route path="/dashboard/*" element={<ProtectedDashboard />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AIChatContextProvider>
            <AppContent />
          </AIChatContextProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};
