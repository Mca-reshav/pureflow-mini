'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MeResponse, Permissions, NavigationItem } from '../types';
import api from '../lib/api';
import { clearTokens, getAccessToken } from '../lib/auth';

interface AuthContextType {
  me: MeResponse | null;
  permissions: Permissions | null;
  navigation: NavigationItem[];
  unreadCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUnreadCount: (count: number) => void;
  fetchMe: (token?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMe = useCallback(async (token?: string) => {
    try {
      const res = await api.get('/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.data.data) {
        setMe(res.data.data);
        setUnreadCount(res.data.unreadNotificationCount ?? 0);
      }
    } catch {
      setMe(null);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchMe(token);
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      console.log('')
    } finally {
      clearTokens();
      setMe(null);
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        me,
        permissions: me?.permissions ?? null,
        navigation: me?.navigation ?? [],
        unreadCount,
        isLoading,
        isAuthenticated: !!me,
        setUnreadCount,
        fetchMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext belongs to AuthProvider');
  return ctx;
}