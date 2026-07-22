import { useState, useEffect, useRef } from 'react';
import { HeaderLabelProvider } from './HeaderLabelProvider';
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
  Package,
  Eye,
  Menu,
  X,
  Brain,
  Layers,
  PhilippinePeso,
  FlaskConical,
  Activity,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Breadcrumb } from '../ui/Breadcrumb';
import { clearStoredSession, getRoleDisplayName, getStoredSession, type UserRole } from '../../utils/mockAuthAndFeatures';

const BRAND_ICON = '/images/logo.PNG';
const BRAND_WORDMARK = '/images/Logo_full.PNG';

type SidebarItem = { to: string; label: string; icon: any };
type SidebarGroup = { group: string; items: SidebarItem[] };

const sidebarGroupsByRole: Record<UserRole, SidebarGroup[]> = {
  owner: [
    {
      group: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Management',
      items: [
        { to: '/owner/users', label: 'Manage Users', icon: Users },
        { to: '/owner/products', label: 'Manage Products', icon: Package },
        { to: '/owner/categories', label: 'Manage Categories', icon: Layers },
        { to: '/owner/suppliers', label: 'Manage Suppliers', icon: TrendingUp },
        { to: '/owner/settings', label: 'System Settings', icon: Settings },
        { to: '/owner/purchase-orders', label: 'Purchase Orders', icon: Package },
        { to: '/owner/audit-logs', label: 'Audit Logs', icon: Activity },
      ],
    },
    {
      group: 'Analytics & Reports',
      items: [
        { to: '/dashboard/predictive', label: 'Predictive Analytics', icon: TrendingUp },
        { to: '/dashboard/leakage', label: 'Leakage Detection', icon: AlertTriangle },
        { to: '/dashboard/fefo', label: 'FEFO Tracking', icon: Layers },
        { to: '/dashboard/vendors', label: 'Vendor Credits', icon: PhilippinePeso },
        { to: '/owner/performance', label: 'Inventory Performance', icon: Package },
        { to: '/owner/overstock', label: 'Overstock Risks', icon: AlertTriangle },
        { to: '/owner/replenishment', label: 'Replenishment', icon: CheckCircle },
        { to: '/owner/supplier-performance', label: 'Supplier Performance', icon: Users },
        { to: '/owner/reports', label: 'Generate Reports', icon: FileText },
        { to: '/owner/executive-reports', label: 'Executive Reports', icon: FileText },
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
        { to: '/inventory/manage', label: 'Manage Inventory', icon: Package },
        { to: '/inventory/wastage', label: 'Record Wastage', icon: AlertTriangle },
        { to: '/inventory/fefo', label: 'FEFO Tracking', icon: CheckCircle },
        { to: '/inventory/recommendations', label: 'Recommendations', icon: Eye },
      ],
    },
  ],
  cashier: [
    {
      group: 'Cashier',
      items: [
        { to: '/cashier/pos', label: 'POS Terminal', icon: Receipt },
        { to: '/cashier/returns', label: 'Returns & Refunds', icon: RotateCcw },
        { to: '/cashier/history', label: 'Transaction History', icon: FileText },
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
          <p className="text-xs text-gray-500 dark:text-slate-400">{getRoleDisplayName(session.role)}</p>
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

  // Mobile sidebar focus trap
  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileOpen || !sidebarRef.current) return;
    const firstFocusable = sidebarRef.current.querySelector<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <ErrorBoundary><div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
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
            <aside ref={sidebarRef} className="fixed inset-y-0 left-0 z-50 w-[248px] flex flex-col overflow-hidden border-r border-gray-200 bg-[#f5f5f5] md:hidden">
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

          {/* Top bar for desktop — animated label */}
          <HeaderLabelProvider
            welcomeName={session.name}
          >
            {(state) => (
              <>
                <header className="hidden md:flex sticky top-0 z-30 h-14 items-center border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md px-6 gap-3 overflow-hidden">
                  {/* Logo — fades in after welcome */}
                  <img
                    src={BRAND_ICON}
                    alt="WiWaste"
                    className="h-7 w-7 object-contain shrink-0"
                    style={{
                      opacity: state.logoVisible ? 1 : 0,
                      transition: 'opacity 400ms ease',
                    }}
                  />
                  {/* Divider */}
                  <span
                    className="h-5 w-px bg-gray-300 dark:bg-white/20 shrink-0"
                    style={{
                      opacity: state.logoVisible && state.textVisible ? 1 : 0,
                      transition: 'opacity 300ms ease',
                    }}
                  />
                  {/* Sliding text */}
                  <span
                    className="text-sm font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap"
                    style={{
                      opacity: state.textVisible ? 1 : 0,
                      transform: state.textVisible ? 'translateX(0)' : 'translateX(-14px)',
                      transition: 'opacity 350ms ease, transform 350ms ease',
                    }}
                  >
                    {state.text}
                  </span>
                </header>

                {/* Page content */}
                <div className="theme-content min-w-0 flex-1 overflow-hidden relative px-4 py-6 sm:px-6 lg:pl-6 lg:pr-8 lg:py-8">
                  <Breadcrumb />
                  <Outlet />
                </div>
              </>
            )}
          </HeaderLabelProvider>
        </div>
      </div>
    </div></ErrorBoundary>
  );
}
