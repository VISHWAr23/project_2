'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import apiClient from '@/lib/api-client';
import { User, LoginCredentials, AuthResponse } from '@/types/auth.types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user session exists on initial mount
    const checkAuth = async () => {
      let token = Cookies.get('auth_token');
      let storedUser = Cookies.get('auth_user');

      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('auth_token') || undefined;
      }
      if (!storedUser && typeof window !== 'undefined') {
        storedUser = localStorage.getItem('auth_user') || undefined;
      }

      if (token) {
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // Ignore parse error
          }
        }

        try {
          // Verify with backend /auth/me
          const res = await apiClient.get<User>('/auth/me');
          const currentUser = res.data;
          setUser(currentUser);
          const isProduction = process.env.NODE_ENV === 'production';
          const cookieOptions = {
            expires: 7,
            path: '/',
            secure: isProduction,
            sameSite: 'lax' as const,
          };
          Cookies.set('auth_token', token, cookieOptions);
          Cookies.set('auth_user', JSON.stringify(currentUser), cookieOptions);
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(currentUser));
          }
        } catch (err: any) {
          // Only clear session if explicitly unauthorized (401)
          if (err?.response?.status === 401) {
            Cookies.remove('auth_token', { path: '/' });
            Cookies.remove('auth_user', { path: '/' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
            }
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const data = res.data;

    // Set cookie with root path and lax sameSite
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      expires: 7,
      path: '/',
      secure: isProduction,
      sameSite: 'lax' as const,
    };

    Cookies.set('auth_token', data.accessToken, cookieOptions);
    Cookies.set('auth_user', JSON.stringify(data.user), cookieOptions);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } catch {
        // Ignore localStorage quota errors
      }
    }

    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    Cookies.remove('auth_token', { path: '/' });
    Cookies.remove('auth_user', { path: '/' });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch {
        // Ignore errors
      }
    }
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
