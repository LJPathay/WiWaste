import { POSTerminal } from './cashier/POSTerminal';
import { DashboardOverview } from './dashboard/Overview';
import { InventoryDashboard } from './dashboard/InventoryDashboard';
import { useAuth } from '../hooks/useAuth';

export function Dashboard() {
  const { user: session } = useAuth();

  if (session?.role === 'inventory') return <InventoryDashboard />;
  if (session?.role === 'cashier') return <POSTerminal />;

  return <DashboardOverview />;
}
