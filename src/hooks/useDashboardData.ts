import { useEffect, useState } from 'react';
import {
  initializeDashboard,
  getPredictiveAnalytics,
} from '../utils/mockAuthAndFeatures';
import type { DashboardData } from '../utils/mockAuthAndFeatures';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const d = await initializeDashboard('user@example.com', 'password');
        if (mounted) setData(d);
      } catch {
        const analytics = getPredictiveAnalytics();
        if (mounted) {
          setData({
            user: {
              id: 'guest',
              email: 'guest@example.com',
              name: 'Guest User',
              company: 'Demo Co',
              role: 'analyst',
              loginTime: new Date(),
            },
            predictiveAnalytics: analytics,
            prescriptiveDecisions: [],
            profitLeakage: [],
            batchFEFO: [],
            vendorReturns: [],
            behavioralInsights: [],
          });
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

  return { data, loading };
}
