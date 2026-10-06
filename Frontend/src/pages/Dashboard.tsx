import { lazy, Suspense } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/ui/PageLoader';
import { DashboardSkeleton } from '../components/ui/DashboardSkeleton';

// All three dashboards are route-level heavyweights: the POS terminal alone pulls in
// the whole cashier bundle. Loading them on demand keeps the initial dashboard chunk
// free of code the signed-in role never renders.
const DashboardOverview = lazy(() =>
  import('./dashboard/Overview').then((m) => ({ default: m.DashboardOverview }))
);
const InventoryDashboard = lazy(() =>
  import('./dashboard/InventoryDashboard').then((m) => ({ default: m.InventoryDashboard }))
);
const POSTerminal = lazy(() =>
  import('./cashier/POSTerminal').then((m) => ({ default: m.POSTerminal }))
);

export function Dashboard() {
  const { user: session, loading } = useAuth();

  if (loading) return <PageLoader />;

  const view =
    session?.role === 'inventory' ? (
      <InventoryDashboard />
    ) : session?.role === 'cashier' ? (
      <POSTerminal />
    ) : (
      <DashboardOverview />
    );

  return <Suspense fallback={<DashboardSkeleton />}>{view}</Suspense>;
}
