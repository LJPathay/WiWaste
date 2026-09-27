import { useState, useEffect, useCallback } from 'react';
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
    const raw = localStorage.getItem(STORAGE_KEY_USER);
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

  useEffect(() => {
    const token = localStorage.getItem('wiwaste_token');
    if (!token) {
      setLoading(false);
      return;
    }
    auth.me()
      .then((apiUser) => {
        const mapped: AuthUser = {
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name,
          role: mapRole(apiUser.role),
          apiRole: apiUser.role,
        };
        setUser(mapped);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mapped));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('wiwaste_token');
        localStorage.removeItem(STORAGE_KEY_USER);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await auth.login(username, password);
    localStorage.setItem('wiwaste_token', result.token);
    const mapped: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: mapRole(result.user.role),
      apiRole: result.user.role,
    };
    setUser(mapped);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mapped));
    return mapped;
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem('wiwaste_token');
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
