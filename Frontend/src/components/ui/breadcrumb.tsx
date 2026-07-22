import { Link, useLocation } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  'stock-in': 'Stock In',
  'stock-out': 'Stock Out',
  manage: 'Manage Inventory',
  wastage: 'Record Wastage',
  fefo: 'FEFO Tracking',
  recommendations: 'Recommendations',
  owner: 'Owner',
  users: 'Manage Users',
  products: 'Manage Products',
  categories: 'Manage Categories',
  suppliers: 'Manage Suppliers',
  settings: 'System Settings',
  'purchase-orders': 'Purchase Orders',
  'audit-logs': 'Audit Logs',
  reports: 'Generate Reports',
  'executive-reports': 'Executive Reports',
  performance: 'Inventory Performance',
  overstock: 'Overstock Risks',
  replenishment: 'Replenishment',
  'supplier-performance': 'Supplier Performance',
  predictive: 'Predictive Analytics',
  leakage: 'Leakage Detection',
  vendors: 'Vendor Credits',
  cashier: 'Cashier',
  pos: 'POS Terminal',
  returns: 'Returns & Refunds',
  history: 'Transaction History',
  manager: 'Manager',
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (pathname === '/dashboard' || segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <li>
          <Link to="/dashboard" className="hover:text-[#006a61] transition-colors" aria-label="Home">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {segments.map((seg, i) => {
          const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
          const href = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          return (
            <li key={seg} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-slate-800 dark:text-slate-200" aria-current="page">{label}</span>
              ) : (
                <Link to={href} className="hover:text-[#006a61] transition-colors">{label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
