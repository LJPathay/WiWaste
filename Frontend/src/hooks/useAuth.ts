import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, type ApiUser } from '../services/api';

export type UserRole = 'owner' | 'inventory' | 'cashier';

function mapRole(apiRole: string): UserRole {
  const normalized = apiRole?.trim();
  console.debug('[Auth] Raw role from API:', apiRole, '→ normalized:', normalized);

  // Canonical role mapping (DB values: Owner, Inventory, Cashier)
  switch (normalized) {
    case 'Owner':
      return 'owner';
    case 'Inventory':
      return 'inventory';
    case 'Cashier':
      return 'cashier';
    // Legacy support
    case 'Business Owner':
    case 'Admin':
    case 'Administrator':
      return 'owner';
    case 'Stock':
    case 'Pharmacist':
      return 'inventory';
    case 'Sales':
    case 'POS':
      return 'cashier';
    default:
      console.warn('[Auth] Unknown role, defaulting to cashier:', apiRole);
      return 'cashier';
  }
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
  const initializedRef = useRef(false);
  const cleanupRef = useRef(false);

  // Verify token with /me on mount and when refetch is called
  const verifyToken = useCallback(async () => {
    try {
      console.debug('[Auth] verifyToken: checking token...', localStorage.getItem('wiwaste_token')?.substring(0, 20) + '...');
      const apiUser = await auth.me();
      console.debug('[Auth] verifyToken /me response:', apiUser);
      // Handle different possible response structures
      const userData = apiUser?.data || apiUser;
      if (!userData?.role) {
        console.warn('[Auth] verifyToken: no role in response:', apiUser);
        throw new Error('Invalid /me response: no role');
      }
      const mapped: AuthUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: mapRole(userData.role),
        apiRole: userData.role,
      };
      console.debug('[Auth] verifyToken success, mapped role:', mapped.role, 'from apiRole:', mapped.apiRole);
      if (!cleanupRef.current) {
        setUser(mapped);
        localStorage.setItem('wiwaste_user', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('[Auth] verifyToken failed:', err);
      // Don't clear user if we have a valid session from login (persisted in localStorage)
      const storedUser = getStoredUser();
      if (storedUser && storedUser.role) {
        console.debug('[Auth] verifyToken failed but using stored user:', storedUser.role);
        if (!cleanupRef.current) {
          setUser(storedUser);
        }
      } else if (!cleanupRef.current) {
        setUser(null);
        localStorage.removeItem('wiwaste_user');
      }
    } finally {
      console.debug('[Auth] verifyToken finally, cleanupRef:', cleanupRef.current, 'setting loading to false');
      if (!cleanupRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.debug('[Auth] useEffect running, initialized:', initializedRef.current);
    if (initializedRef.current) return;
    initializedRef.current = true;
    mountedRef.current = true;
    cleanupRef.current = false;
    verifyToken();
    return () => { 
      console.debug('[Auth] useEffect cleanup');
      cleanupRef.current = true;
      mountedRef.current = false; 
    };
  }, [verifyToken]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await auth.login(username, password);
    console.debug('[Auth] Login raw response:', JSON.stringify(result, null, 2));
    // Backend now returns { access_token, user } in data
    // Handle different possible response structures
    const accessToken = result?.data?.access_token || result?.access_token || result?.token;
    if (!accessToken) {
      console.error('[Auth] No access_token in response:', result);
      throw new Error('Invalid login response');
    }
    localStorage.setItem('wiwaste_token', accessToken);
    console.debug('[Auth] Token stored:', accessToken.substring(0, 20) + '...');
    
    const userData = result?.data?.user || result?.user;
    if (!userData) {
      console.error('[Auth] No user in response:', result);
      throw new Error('Invalid login response: no user data');
    }
    const mapped: AuthUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: mapRole(userData.role),
      apiRole: userData.role,
    };
    console.debug('[Auth] Login successful, mapped role:', mapped.role, 'from apiRole:', mapped.apiRole);
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