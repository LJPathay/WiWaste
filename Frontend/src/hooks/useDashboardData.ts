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
        console.debug('[Dashboard] Loading data...');
        const [d, ov, analytics] = await Promise.all([
          (async () => {
            const session = getStoredSession();
            const email = session?.email ?? 'user@example.com';
            const role = session?.role ?? inferRoleFromEmail(email);
            return initializeDashboard(email, 'password', role);
          })(),
          ownerDashboard.overview().then(r => { console.debug('[Dashboard] overview:', r); return r; }).catch(e => { console.error('[Dashboard] overview failed:', e); return null; }),
          ownerDashboard.analytics({ period: '30' }).then(r => { console.debug('[Dashboard] analytics:', r); return r; }).catch(e => { console.error('[Dashboard] analytics failed:', e); return null; }),
        ]);
        if (mounted) {
          setData(d);
          setOverview(ov);
          setOwnerAnalytics(analytics);
        }
      } catch (e) {
        console.error('[Dashboard] load failed:', e);
        const analyticsData = getPredictiveAnalytics();
        if (mounted) {
          setData({
            user: { id: 'guest', email: 'guest@example.com', name: 'Guest User', company: 'Demo Co', role: 'inventory', loginTime: new Date() },
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
    return () => { mounted = false; };
  }, []);

  return { data, overview, ownerAnalytics, loading };
}
