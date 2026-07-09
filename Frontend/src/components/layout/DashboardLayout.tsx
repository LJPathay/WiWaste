import { useState } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LogOut,
  LayoutDashboard,
  BarChart3,
  LineChart,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  Menu,
  X,
  Brain,
  Layers,
  PhilippinePeso,
  FlaskConical,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { clearStoredSession, getStoredSession, type UserRole } from '../../utils/mockAuthAndFeatures';

const BRAND_ICON = '/images/logo.PNG';
const BRAND_WORDMARK = '/images/Logo_full.PNG';

type SidebarItem = { to: string; label: string; icon: any };
type SidebarGroup = { group: string; items: SidebarItem[] };

const sidebarGroupsByRole: Record<UserRole, SidebarGroup[]> = {
  admin: [
    {
      group: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Analytics Modules',
      items: [
        { to: '/dashboard/leakage', label: 'Leakage Detection', icon: AlertTriangle },
        { to: '/dashboard/vendors', label: 'Vendor Credits', icon: PhilippinePeso },
        { to: '/dashboard/prescriptive', label: 'Decision Sandbox', icon: FlaskConical },
      ],
    },
    {
      group: 'Management',
      items: [
        { to: '/admin/users', label: 'Manage Users', icon: Users },
        { to: '/admin/products', label: 'Manage Products', icon: Package },
        { to: '/admin/categories', label: 'Manage Categories', icon: ClipboardList },
        { to: '/admin/suppliers', label: 'Manage Suppliers', icon: TrendingUp },
        { to: '/admin/settings', label: 'System Settings', icon: Settings },
        { to: '/admin/reports', label: 'Generate Reports', icon: FileText },
      ],
    },
  ],
  inventory: [
    {
      group: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Inventory',
      items: [
        { to: '/inventory/stock-in', label: 'Stock In', icon: ArrowUpCircle },
        { to: '/inventory/stock-out', label: 'Stock Out', icon: ArrowDownCircle },
        { to: '/inventory/wastage', label: 'Record Wastage', icon: AlertTriangle },
        { to: '/inventory/manage', label: 'Manage Inventory', icon: Package },
        { to: '/inventory/fefo', label: 'FEFO Tracking', icon: CheckCircle },
        { to: '/inventory/recommendations', label: 'Recommendations', icon: Eye },
      ],
    },
  ],
  manager: [
    {
      group: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Analytics Modules',
      items: [
        { to: '/dashboard/predictive', label: 'Predictive Analytics', icon: TrendingUp },
        { to: '/dashboard/leakage', label: 'Leakage Detection', icon: AlertTriangle },
        { to: '/dashboard/fefo', label: 'FEFO Tracking', icon: Layers },
        { to: '/dashboard/vendors', label: 'Vendor Credits', icon: PhilippinePeso },
        { to: '/dashboard/behavior', label: 'Behavioral Intelligence', icon: Brain },
        { to: '/dashboard/prescriptive', label: 'Decision Sandbox', icon: FlaskConical },
      ],
    },
    {
      group: 'Reports',
      items: [
        { to: '/manager/performance', label: 'Inventory Performance', icon: Package },
        { to: '/manager/forecasts', label: 'Demand Forecasts', icon: LineChart },
        { to: '/manager/overstock', label: 'Overstock Risks', icon: AlertTriangle },
        { to: '/manager/loss-trends', label: 'Loss Trends', icon: BarChart3 },
        { to: '/manager/replenishment', label: 'Replenishment', icon: CheckCircle },
        { to: '/manager/suppliers', label: 'Supplier Performance', icon: Users },
        { to: '/manager/reports', label: 'Executive Reports', icon: FileText },
      ],
    },
  ],
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read session synchronously — no async effect needed since localStorage is sync
  const session = getStoredSession(); // localStorage is synchronous
  
if (!session) {
  return <Navigate to="/login" replace />;
}

  function handleLogout() {
    clearStoredSession();
    navigate('/');
  }

  const sidebarGroups = sidebarGroupsByRole[session.role] ?? [];
  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-[248px]';

  const NavItems = ({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) => (
    <nav className={`flex-1 overflow-y-auto scrollbar-modern ${compact ? 'px-2 py-3' : 'px-3 py-4'}`}>
      {sidebarGroups.map((group) => (
        <div key={group.group} className="mb-2">
          {/* Group label — hidden when collapsed */}
          {!compact && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
              {group.group}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    compact ? 'justify-center px-2' : ''
                  } ${
                    active
                      ? 'bg-[#006a61] text-white'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                  aria-label={item.label}
                  title={compact ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!compact && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const SidebarInner = ({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) => (
    <div className="flex h-full flex-col bg-[#f5f5f5] dark:bg-slate-900">
      {/* Logo + collapse button */}
      <div className="border-b border-gray-200 dark:border-white/10 px-3 py-3 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          {/* Logo — always visible; white bg ensures icon shows in dark mode */}
          <div className={`flex min-w-0 items-center flex-1 ${compact ? 'justify-center' : 'justify-start'}`}>
            <div className={`flex items-center justify-center ${compact ? 'h-10 w-10' : 'h-10 px-2'}`}>
              <img
                src={compact ? BRAND_ICON : BRAND_WORDMARK}
                alt="WiWaste"
                className={`shrink-0 object-contain ${compact ? 'h-7 w-7' : 'h-7 w-auto max-w-[140px]'}`}
              />
            </div>
          </div>
          {/* Desktop collapse toggle */}
          {!onClose && (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Close sidebar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* User info strip */}
      {!compact && (
        <div className="border-b border-gray-200 dark:border-white/10 px-4 py-3 bg-white dark:bg-slate-950">
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{session.name}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{session.role}</p>
        </div>
      )}

      <NavItems compact={compact} onClose={onClose} />
      {/* Sidebar footer: theme toggle + sign out */}
      <div className="border-t border-gray-200 dark:border-white/10 p-3 bg-white dark:bg-slate-900 flex items-center gap-2">
        <div className="flex-shrink-0">
          <ThemeToggle compact />
        </div>
        {!compact && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/10 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        )}
        {compact && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 p-2 text-gray-700 dark:text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen w-full">

        {/* ── Desktop Sidebar ── */}
        <aside
          className={`hidden md:flex flex-none flex-col overflow-hidden border-r border-gray-200 dark:border-white/10 bg-[#f5f5f5] dark:bg-slate-900 text-gray-700 dark:text-slate-300 transition-all duration-300 h-screen sticky top-0 ${sidebarWidth}`}
        >
          <SidebarInner compact={collapsed} />
        </aside>

        {/* ── Mobile Sidebar Drawer ── */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-[248px] flex flex-col overflow-hidden border-r border-gray-200 bg-[#f5f5f5] md:hidden">
              <SidebarInner onClose={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar for mobile */}
          <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src={BRAND_WORDMARK} alt="WiWaste" className="h-8 w-auto object-contain" />
            <ThemeToggle />
          </header>

          {/* Top bar for desktop — clean, no duplicate sign out */}
          <header className="hidden md:flex sticky top-0 z-30 h-14 items-center border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md px-6">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Welcome back, <span className="font-semibold text-gray-800 dark:text-slate-100">{session.name}</span>
            </span>
          </header>

          {/* Page content */}
          <div className="theme-content min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pl-6 lg:pr-8 lg:py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
