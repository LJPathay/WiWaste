import { useEffect, useState } from 'react';
import {
  getStoredSession,
  inferRoleFromEmail,
  initializeDashboard,
  getPredictiveAnalytics,
} from '../utils/mockAuthAndFeatures';
import { dashboard as dashboardApi } from '../services/api';
import type { DashboardData } from '../utils/mockAuthAndFeatures';

export interface DashboardOverview {
  active_skus: number;
  total_users: number;
  active_suppliers: number;
  today_sales: number;
  recent_wastage: number;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [d, ov] = await Promise.all([
          (async () => {
            const session = getStoredSession();
            const email = session?.email ?? 'user@example.com';
            const role = session?.role ?? inferRoleFromEmail(email);
            return initializeDashboard(email, 'password', role);
          })(),
          dashboardApi.overview().catch(() => null),
        ]);
        if (mounted) {
          setData(d);
          setOverview(ov);
        }
      } catch {
        const analytics = getPredictiveAnalytics();
        if (mounted) {
          setData({
            user: {
              id: 'guest',
              email: 'guest@example.com',
              name: 'Guest User',
              company: 'Demo Co',
              role: 'inventory',
              loginTime: new Date(),
            },
            predictiveAnalytics: analytics,
            prescriptiveDecisions: [],
            profitLeakage: [],
            batchFEFO: [],
            vendorReturns: [],
            behavioralInsights: [],
          });
          setOverview(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, overview, loading };
}
