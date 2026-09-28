import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, type ApiUser } from '../services/api';

export type UserRole = 'owner' | 'inventory' | 'cashier';

function mapRole(apiRole: string): UserRole {
  if (apiRole === 'Admin' || apiRole === 'Owner') return 'owner';
  if (apiRole === 'Inventory') return 'inventory';
  return 'cashier';
}

export interface AuthUser {
  id: number | string;
  email: string;
  name: string;
  role: UserRole;
  apiRole: string;
}

const STORAGE_KEY_USER = 'wiwaste_user';

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('wiwaste_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.role) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Verify token with /me on mount and when refetch is called
  const verifyToken = useCallback(async () => {
    try {
      const apiUser = await auth.me();
      const mapped: AuthUser = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name,
        role: mapRole(apiUser.role),
        apiRole: apiUser.role,
      };
      if (mountedRef.current) {
        setUser(mapped);
        localStorage.setItem('wiwaste_user', JSON.stringify(mapped));
      }
    } catch {
      if (mountedRef.current) {
        setUser(null);
        localStorage.removeItem('wiwaste_user');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    verifyToken();
    return () => { mountedRef.current = false; };
  }, [verifyToken]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await auth.login(username, password);
    // Backend now returns { access_token, user } in data
    const accessToken = result.data.access_token;
    const mapped: AuthUser = {
      id: result.data.user.id,
      email: result.data.user.email,
      name: result.data.user.name,
      role: mapRole(result.data.user.role),
      apiRole: result.data.user.role,
    };
    setUser(mapped);
    localStorage.setItem('wiwaste_user', JSON.stringify(mapped));
    return mapped;
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem('wiwaste_user');
    setUser(null);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    verifyToken();
  }, [verifyToken]);

  return { user, loading, login, logout, refetch };
}