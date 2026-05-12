import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to monitor JWT expiry and security violations
 * - Checks token expiry time stored in localStorage
 * - Listens for security violations from audit logs
 * - Clears auth state and redirects to login on expiry/violation
 */
export const useJWTExpiryMonitor = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const expiryCheckIntervalRef = useRef<NodeJS.Timeout>();
  const auditCheckIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    /**
     * Check if JWT token has expired
     */
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('authToken');
      const tokenExpiry = localStorage.getItem('tokenExpiry');

      if (!token || !tokenExpiry) {
        return;
      }

      const expiryTime = parseInt(tokenExpiry, 10);
      const currentTime = Date.now();

      // Add 5 second buffer before actual expiry for graceful redirect
      if (currentTime >= expiryTime - 5000) {
        handleTokenExpiry('Token expired. Please log in again.');
      }
    };

    /**
     * Check for security violations in audit logs
     * A security violation is flagged when a DENIED_BY_PRIVACY_FILTER
     * attempt is made by the current user (indicating potential
     * unauthorized access attempt)
     */
    const checkForSecurityViolations = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Fetch recent audit logs to check for current user violations
        const response = await fetch('/api/audit/security-status', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If audit endpoint fails (e.g., 401/403), token is invalid
          if (response.status === 401 || response.status === 403) {
            handleTokenExpiry('Session no longer valid. Please log in again.');
          }
          return;
        }

        const data = await response.json();

        if (data?.securityViolation) {
          handleSecurityViolation(
            'Security violation detected. Session terminated for security purposes.',
          );
        }
      } catch (error) {
        console.error('[JWT Monitor] Error checking security violations:', error);
        // Don't logout on network errors - only on auth failures
      }
    };

    /**
     * Handle token expiry
     */
    const handleTokenExpiry = (message: string) => {
      console.warn('[JWT Monitor]', message);

      // Clear auth state
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiry');
      logout();

      // Show user-friendly message via alert (can be enhanced with toast notification)
      alert(message);

      // Redirect to login
      navigate('/login', { replace: true });
    };

    /**
     * Handle security violation
     */
    const handleSecurityViolation = (message: string) => {
      console.error('[JWT Monitor] Security Violation:', message);

      // Clear all auth data
      localStorage.clear();
      logout();

      // Show security alert
      alert(message);

      // Redirect to login with security flag
      navigate('/login?security=violated', { replace: true });
    };

    // Start expiry check - runs every 30 seconds
    expiryCheckIntervalRef.current = setInterval(checkTokenExpiry, 30000);

    // Start security violation check - runs every 60 seconds (only for authenticated users)
    const token = localStorage.getItem('authToken');
    if (token) {
      auditCheckIntervalRef.current = setInterval(checkForSecurityViolations, 60000);
    }

    // Initial checks
    checkTokenExpiry();
    if (token) {
      checkForSecurityViolations();
    }

    // Cleanup
    return () => {
      if (expiryCheckIntervalRef.current) {
        clearInterval(expiryCheckIntervalRef.current);
      }
      if (auditCheckIntervalRef.current) {
        clearInterval(auditCheckIntervalRef.current);
      }
    };
  }, [navigate, logout]);

  /**
   * Manual logout function that clears all data
   */
  const forceLogout = (reason: string = 'Session ended') => {
    console.warn('[JWT Monitor] Force logout:', reason);
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiry');
    logout();
    navigate('/login', { replace: true });
  };

  return { forceLogout };
};

/**
 * Advanced: Hook to display token expiry countdown timer
 * Useful for warning users before session expires
 */
export const useTokenExpiryCountdown = () => {
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);

  useEffect(() => {
    const checkExpiry = () => {
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (!tokenExpiry) {
        setTimeRemaining(null);
        return;
      }

      const expiryTime = parseInt(tokenExpiry, 10);
      const currentTime = Date.now();
      const remaining = Math.max(0, expiryTime - currentTime);

      // Only show countdown in last 5 minutes
      if (remaining > 0 && remaining < 5 * 60 * 1000) {
        setTimeRemaining(Math.ceil(remaining / 1000)); // Convert to seconds
      } else if (remaining === 0) {
        setTimeRemaining(0);
      } else {
        setTimeRemaining(null);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: timeRemaining !== null ? formatTime(timeRemaining) : null,
    isLowTime: timeRemaining !== null && timeRemaining < 60, // True if less than 1 minute
    isExpired: timeRemaining === 0,
  };
};
