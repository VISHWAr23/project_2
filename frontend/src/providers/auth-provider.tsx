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
      const token = Cookies.get('auth_token');
      const storedUser = Cookies.get('auth_user');

      if (token && storedUser) {
        try {
          // Parse stored user first for instant UI response
          setUser(JSON.parse(storedUser));

          // Then verify with backend /auth/me
          const res = await apiClient.get<User>('/auth/me');
          const currentUser = res.data;
          setUser(currentUser);
          Cookies.set('auth_user', JSON.stringify(currentUser), { expires: 7 });
        } catch {
          // Token is invalid/expired
          Cookies.remove('auth_token');
          Cookies.remove('auth_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const data = res.data;

    // Set cookie with security flags
    const isProduction = process.env.NODE_ENV === 'production';
    Cookies.set('auth_token', data.accessToken, {
      expires: 7,
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      // Note: httpOnly cannot be set from JS, should be set by backend in production
    });
    Cookies.set('auth_user', JSON.stringify(data.user), {
      expires: 7,
      secure: isProduction,
      sameSite: 'strict',
    });

    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    Cookies.remove('auth_token');
    Cookies.remove('auth_user');
    setUser(null);
    router.push('/login');
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
