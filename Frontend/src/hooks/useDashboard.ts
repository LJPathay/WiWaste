import { useQuery } from '@tanstack/react-query';
import { dashboard, ownerDashboard, type ApiOwnerAnalytics } from '../services/api';

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => dashboard.overview(),
  });
}

export function useOwnerAnalytics(period?: string) {
  return useQuery({
    queryKey: ['dashboard', 'owner-analytics', period],
    queryFn: () => ownerDashboard.analytics({ period }),
  });
}
