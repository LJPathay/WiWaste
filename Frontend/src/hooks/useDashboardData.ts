import { useEffect, useState } from 'react';
import {
  getStoredSession,
  inferRoleFromEmail,
  initializeDashboard,
  getPredictiveAnalytics,
} from '../utils/mockAuthAndFeatures';
import { ownerDashboard } from '../services/api';
import type { ApiDashboard, ApiOwnerAnalytics } from '../services/api';
import type { DashboardData } from '../utils/mockAuthAndFeatures';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [overview, setOverview] = useState<ApiDashboard | null>(null);
  const [ownerAnalytics, setOwnerAnalytics] = useState<ApiOwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [d, ov, analytics] = await Promise.all([
          (async () => {
            const session = getStoredSession();
            const email = session?.email ?? 'user@example.com';
            const role = session?.role ?? inferRoleFromEmail(email);
            return initializeDashboard(email, 'password', role);
          })(),
          ownerDashboard.overview().catch(() => null),
          ownerDashboard.analytics({ period: '30' }).catch(() => null),
        ]);
        if (mounted) {
          setData(d);
          setOverview(ov);
          setOwnerAnalytics(analytics);
        }
      } catch {
        const analyticsData = getPredictiveAnalytics();
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
            predictiveAnalytics: analyticsData,
            prescriptiveDecisions: [],
            profitLeakage: [],
            batchFEFO: [],
            vendorReturns: [],
            behavioralInsights: [],
          });
          setOverview(null);
          setOwnerAnalytics(null);
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

  return { data, overview, ownerAnalytics, loading };
}
