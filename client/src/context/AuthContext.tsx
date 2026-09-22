import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../services/api';
import { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      console.log('[restoreSession] calling /api/auth/refresh…');
      const { data } = await api.post('/api/auth/refresh');
      console.log('[restoreSession] refresh succeeded, got accessToken:', !!data.accessToken);
      setAccessToken(data.accessToken);

      const { data: userData } = await api.get('/api/auth/me');
      console.log('[restoreSession] /me succeeded, user:', userData?.email);
      setUser(userData);
    } catch (err: any) {
      console.warn('[restoreSession] failed:', err?.response?.status, err?.response?.data || err?.message);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
