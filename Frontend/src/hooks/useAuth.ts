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
const STORAGE_KEY_TOKEN = 'wiwaste_token';

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.role) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(getStoredToken());
  const mountedRef = useRef(true);

  // Only verify token with /me when token changes, not on every mount
  const verifyToken = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Skip if same token and user already loaded
    if (tokenRef.current === token && user) {
      setLoading(false);
      return;
    }

    tokenRef.current = token;

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
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mapped));
      }
    } catch {
      if (mountedRef.current) {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    verifyToken();
    return () => { mountedRef.current = false; };
  }, [verifyToken]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await auth.login(username, password);
    localStorage.setItem(STORAGE_KEY_TOKEN, result.token);
    const mapped: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: mapRole(result.user.role),
      apiRole: result.user.role,
    };
    setUser(mapped);
    localStorage.setItem('wiwaste_user', JSON.stringify(mapped));
    return mapped;
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    verifyToken();
  }, [verifyToken]);

  return { user, loading, login, logout, refetch };
}