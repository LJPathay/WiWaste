import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getStoredSession,
  inferRoleFromEmail,
  initializeDashboard,
  getPredictiveAnalytics,
} from '../utils/mockAuthAndFeatures';
import { ownerDashboard } from '../services/api';
import type { ApiDashboard, ApiOwnerAnalytics } from '../services/api';
import type { DashboardData } from '../utils/mockAuthAndFeatures';

export function useDashboardData(period = '30') {
  const { data: result, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      try {
        const [d, ov, analytics] = await Promise.all([
          (async () => {
            const session = getStoredSession();
            const email = session?.email ?? 'user@example.com';
            const role = session?.role ?? inferRoleFromEmail(email);
            return initializeDashboard(email, 'password', role);
          })(),
          ownerDashboard.overview().catch(() => null),
          ownerDashboard.analytics({ period }).catch(() => null),
        ]);
        return { data: d, overview: ov, ownerAnalytics: analytics };
      } catch (e) {
        const analyticsData = getPredictiveAnalytics();
        return {
          data: {
            user: { id: 'guest', email: 'guest@example.com', name: 'Guest User', company: 'Demo Co', role: 'inventory', loginTime: new Date() },
            predictiveAnalytics: analyticsData,
            prescriptiveDecisions: [],
            profitLeakage: [],
            batchFEFO: [],
            vendorReturns: [],
            behavioralInsights: [],
          },
          overview: null,
          ownerAnalytics: null,
        };
      }
    },
    staleTime: 30000,
  });

  const loading = isLoading;

  return { data: result?.data ?? null, overview: result?.overview ?? null, ownerAnalytics: result?.ownerAnalytics ?? null, loading };
}
