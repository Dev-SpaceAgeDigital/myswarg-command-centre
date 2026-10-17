'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  adminLevel?: number;
  region?: string;
}

export type PhoneState = 'PIN' | 'ACTIVATE' | 'NEEDS_CODE';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkPhone: (phone: string) => Promise<PhoneState>;
  loginWithPin: (phone: string, pin: string) => Promise<void>;
  activate: (phone: string, code: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nivasi_admin_token');
    const savedUser = localStorage.getItem('nivasi_admin_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const clean = (phone: string) => phone.trim().replace(/[^0-9]/g, '');

  const deviceId = () => {
    let id = localStorage.getItem('nivasi_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('nivasi_device_id', id);
    }
    return id;
  };

  const finishLogin = (data: { token: string; user: User }) => {
    const { token, user: userData } = data;
    if (!['SUPER_ADMIN', 'WING_ADMIN'].includes(userData.role)) {
      throw new Error('Access denied. Admin credentials required.');
    }
    localStorage.setItem('nivasi_admin_token', token);
    localStorage.setItem('nivasi_admin_user', JSON.stringify(userData));
    document.cookie = `nivasi_admin_token=${token}; path=/; max-age=2592000`;
    setUser(userData);
  };

  const checkPhone = async (phone: string): Promise<PhoneState> => {
    const res = await api.post('/auth/check-phone', { phone: clean(phone) });
    return res.data.data.status;
  };

  const loginWithPin = async (phone: string, pin: string) => {
    const res = await api.post('/auth/login-pin', { phone: clean(phone), pin, device_id: deviceId() });
    finishLogin(res.data.data);
  };

  const activate = async (phone: string, code: string, pin: string) => {
    const res = await api.post('/auth/activate', { phone: clean(phone), code: code.replace(/\s+/g, ''), pin, device_id: deviceId() });
    finishLogin(res.data.data);
  };

  const logout = () => {
    localStorage.removeItem('nivasi_admin_token');
    localStorage.removeItem('nivasi_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkPhone, loginWithPin, activate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
