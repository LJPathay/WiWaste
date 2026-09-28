import { POSTerminal } from './cashier/POSTerminal';
import { DashboardOverview } from './dashboard/Overview';
import { InventoryDashboard } from './dashboard/InventoryDashboard';
import { useAuth } from '../hooks/useAuth';

export function Dashboard() {
  const { user: session, loading } = useAuth();

  console.debug('[Dashboard] role:', session?.role, 'loading:', loading);

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (session?.role === 'inventory') return <InventoryDashboard />;
  if (session?.role === 'cashier') return <POSTerminal />;

  return <DashboardOverview />;
}
