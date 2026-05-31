import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type AuthRole = 'visitor' | 'staff' | 'admin';

const normalizeRole = (role: string | undefined): AuthRole => {
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

export interface User {
  id: string;
  name: string;
  role: string;
  clearanceLevel: number;
  staffId?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateClearanceLevel: (level: number) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const normalizedUser = {
            ...parsedUser,
            role: normalizeRole(parsedUser.role),
          };
          setUser(normalizedUser);
          localStorage.setItem('authUser', JSON.stringify(normalizedUser));
          localStorage.setItem('userRole', normalizedUser.role);
          localStorage.setItem('userId', normalizedUser.staffId || normalizedUser.id);
        } catch (error) {
          console.error('[AuthContext] Failed to parse stored user:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userId');
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (newUser: User) => {
    const normalizedUser = {
      ...newUser,
      role: normalizeRole(newUser.role),
    };
    setUser(normalizedUser);
    // Store user in localStorage for persistence
    localStorage.setItem('authUser', JSON.stringify(normalizedUser));
    localStorage.setItem('userRole', normalizedUser.role);
    localStorage.setItem('userId', normalizedUser.staffId || normalizedUser.id);
  };

  const logout = () => {
    setUser(null);
    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  };

  const updateClearanceLevel = (level: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        clearanceLevel: level,
      };
      setUser(updatedUser);
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    updateClearanceLevel,
    isAuthenticated: user !== null,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
