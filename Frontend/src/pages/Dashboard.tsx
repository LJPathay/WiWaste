import { POSTerminal } from './cashier/POSTerminal';
import { DashboardOverview } from './dashboard/Overview';
import { InventoryDashboard } from './dashboard/InventoryDashboard';
import { getStoredSession } from '../utils/mockAuthAndFeatures';

export function Dashboard() {
  const session = getStoredSession();

  if (session?.role === 'inventory') return <InventoryDashboard />;
  if (session?.role === 'cashier') return <POSTerminal />;

  return <DashboardOverview />;
}
