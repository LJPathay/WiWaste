import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { SkipLink } from './SkipLink';
import {
  LogOut,
  LayoutDashboard,
  BarChart3,
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
  Layers,
  PhilippinePeso,
  Activity,
  Receipt,
  Brain,
  PackageCheck,
  Truck,
  ShieldAlert,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Breadcrumb } from '../ui/breadcrumb';
import { getRoleDisplayName } from '../../utils/mockAuthAndFeatures';
import { useAuth, type UserRole } from '../../hooks/useAuth';

const BRAND_ICON = '/images/logo.PNG';
const BRAND_WORDMARK = '/images/Logo_full.PNG';

type SidebarItem = { to: string; label: string; icon: LucideIcon };
type SidebarGroup = { group: string; items: SidebarItem[] };

const sidebarGroupsByRole: Record<UserRole, SidebarGroup[]> = {
  owner: [
    {
      group: 'OVERVIEW',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'MANAGEMENT',
      items: [
        { to: '/owner/users', label: 'Manage Users', icon: Users },
        { to: '/owner/products', label: 'Manage Products', icon: Package },
        { to: '/owner/categories', label: 'Manage Categories', icon: Layers },
        { to: '/owner/suppliers', label: 'Manage Suppliers', icon: Truck },
        { to: '/owner/purchase-orders', label: 'Purchase Orders', icon: Package },
        { to: '/owner/settings', label: 'System Settings', icon: Settings },
        { to: '/owner/audit-logs', label: 'Audit Logs', icon: Activity },
      ],
    },
    {
      group: 'INVENTORY INTELLIGENCE',
      items: [
        { to: '/owner/performance', label: 'Inventory Performance', icon: TrendingUp },
        { to: '/dashboard/fefo', label: 'FEFO Tracking', icon: PackageCheck },
        { to: '/owner/overstock', label: 'Overstock Risks', icon: AlertTriangle },
        { to: '/owner/replenishment', label: 'Replenishment', icon: CheckCircle },
      ],
    },
    {
      group: 'BUSINESS ANALYTICS',
      items: [
        { to: '/dashboard/predictive', label: 'Predictive Analytics', icon: Brain },
        { to: '/dashboard/leakage', label: 'Leakage Detection', icon: ShieldAlert },
        { to: '/owner/supplier-performance', label: 'Supplier Performance', icon: Users },
        { to: '/dashboard/vendors', label: 'Vendor Credits', icon: PhilippinePeso },
      ],
    },
    {
      group: 'REPORTS',
      items: [
        { to: '/owner/reports', label: 'Generate Reports', icon: FileText },
      ],
    },
  ],
  // There is deliberately no `manager` entry. `UserRole` here is `useAuth`'s, which covers
  // only the three roles the API can actually return -- `mapRole()` has no branch that
  // yields 'manager' and the users table has no such role -- so `sidebarGroupsByRole` is
  // indexed at line ~303 by a value that can never be 'manager'. The block that used to
  // sit here was unreachable configuration.
  inventory: [
    {
      group: 'Overview',
      items: [
        { to: '/dashboard/inventory', label: 'Inventory Dashboard', icon: BarChart3 },
      ],
    },
    {
      group: 'Operations',
      items: [
        { to: '/inventory/manage', label: 'Manage Inventory', icon: Package },
        { to: '/inventory/wastage', label: 'Record Wastage', icon: AlertTriangle },
        { to: '/inventory/stock-receiving', label: 'Stock Receiving', icon: Truck },
        { to: '/inventory/movements', label: 'Stock Movements', icon: ArrowUpDown },
      ],
    },
    {
      group: 'Monitoring',
      items: [
        { to: '/inventory/fefo', label: 'FEFO Tracking', icon: CheckCircle },
        { to: '/inventory/recommendations', label: 'Recommendations', icon: Eye },
      ],
    },
    {
      group: 'Management',
      items: [
        { to: '/inventory/suppliers', label: 'Suppliers', icon: Users },
        { to: '/inventory/reports', label: 'Reports', icon: FileText },
      ],
    },
  ],
  cashier: [
    {
      group: 'POS',
      items: [
        { to: '/cashier/pos', label: 'POS Terminal', icon: Receipt },
      ],
    },
  ],
};

const NavItems = memo(function NavItems({
  compact, onClose, sidebarGroups, currentPath
}: {
  compact?: boolean;
  onClose?: () => void;
  sidebarGroups: SidebarGroup[];
  currentPath: string;
}) {
  return (
    <nav className={`flex-1 overflow-y-auto scrollbar-modern ${compact ? 'px-2 py-3' : 'px-3 py-4'}`}>
      {sidebarGroups.map((group) => (
        <div key={group.group} className="mb-2">
          {!compact && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-muted-fg">
              {group.group}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = currentPath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    compact ? 'justify-center px-2' : ''
                  } ${
                    active
                      ? 'bg-brand text-white'
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
});

const SidebarInner = memo(function SidebarInner({
  compact, onClose, session, sidebarGroups, onToggleCollapse, onLogout, currentPath
}: {
  compact?: boolean;
  onClose?: () => void;
  session: { name: string; role: UserRole };
  sidebarGroups: SidebarGroup[];
  onToggleCollapse?: () => void;
  onLogout: () => void;
  currentPath: string;
}) {
  return (
    <div className="flex h-full flex-col bg-[#f5f5f5] dark:bg-slate-950 transition-colors duration-200">
      <div className="px-3 py-3 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <div className={`flex min-w-0 items-center flex-1 ${compact ? 'justify-center' : 'justify-start'}`}>
            <div className={`flex items-center justify-center ${compact ? 'h-10 w-10' : 'h-10 px-2'}`}>
              <img
                src={compact ? BRAND_ICON : BRAND_WORDMARK}
                alt="WiWaste"
                className={`shrink-0 object-contain ${compact ? 'h-7 w-7' : 'h-7 w-auto max-w-[140px]'}`}
              />
            </div>
          </div>
          {!onClose && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="touch-target inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/10 bg-white dark:bg-slate-800 text-muted-fg dark:text-muted-fg transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="touch-target inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/10 bg-white dark:bg-slate-800 text-muted-fg dark:text-muted-fg hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Close sidebar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="px-4 py-3 bg-white dark:bg-slate-950">
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">{session.name}</p>
          <p className="text-xs text-muted-fg dark:text-muted-fg">{getRoleDisplayName(session.role)}</p>
        </div>
      )}

      <NavItems compact={compact} onClose={onClose} sidebarGroups={sidebarGroups} currentPath={currentPath} />

      <div className="border-t border-border dark:border-white/10 p-3 bg-white dark:bg-slate-950 flex items-center gap-2">
        <div className="flex-shrink-0">
          <ThemeToggle compact />
        </div>
        {!compact && (
          <button
            type="button"
            onClick={onLogout}
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
            onClick={onLogout}
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
});

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: session, logout, loading } = useAuth();

  const sidebarGroups = useMemo(() => {
    if (!session) return [];
    const roleGroups = sidebarGroupsByRole[session.role];
    return roleGroups ?? [];
  }, [session?.role]);

  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-[248px]';

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

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === 'cashier') {
    return <Navigate to="/cashier/pos" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <ErrorBoundary><div className="h-screen bg-white text-[#1b1b1d] font-['Inter',sans-serif] transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      <SkipLink targets={[
        { id: 'main-content', label: 'Main Content' },
        { id: 'sidebar', label: 'Sidebar Navigation' },
        { id: 'header', label: 'Header' },
        { id: 'footer', label: 'Footer' }
      ]} />
      <div className="flex h-screen w-full overflow-hidden">

        {/* ── Desktop Sidebar ── */}
        <aside
          className={`hidden md:flex flex-none flex-col overflow-hidden bg-[#f5f5f5] dark:bg-slate-950 text-gray-700 dark:text-slate-300 transition-all duration-300 h-screen sticky top-0 transition-colors duration-200 ${sidebarWidth}`}
        >
          <SidebarInner
            compact={collapsed}
            session={session}
            sidebarGroups={sidebarGroups}
            onToggleCollapse={() => setCollapsed(c => !c)}
            onLogout={handleLogout}
            currentPath={location.pathname}
          />
        </aside>

        {/* ── Mobile Sidebar Drawer ── */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside ref={sidebarRef} className="fixed inset-y-0 left-0 z-50 w-[248px] flex flex-col overflow-hidden border-r border-border bg-[#f5f5f5] md:hidden transition-colors duration-200">
              <SidebarInner
                onClose={() => setMobileOpen(false)}
                session={session}
                sidebarGroups={sidebarGroups}
                onLogout={handleLogout}
                currentPath={location.pathname}
                compact={false}
              />
            </aside>
          </>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar for mobile */}
          <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between bg-white dark:bg-slate-950 px-4 transition-colors duration-200 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-white/10 text-muted-fg dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src={BRAND_WORDMARK} alt="WiWaste" className="h-8 w-auto object-contain" />
            <ThemeToggle />
          </header>

          {/* Top bar for desktop — slim, no duplicated navigation */}
          <header id="header" className="hidden md:flex sticky top-0 z-30 h-12 items-center justify-between bg-white dark:bg-slate-950 px-6 gap-3 border-b border-border dark:border-white/5 transition-colors duration-200 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {sidebarGroups.flatMap((g) => g.items).find((i) => i.to === location.pathname)?.label ?? 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-fg dark:text-muted-fg truncate max-w-[160px]">{session.name}</span>
              <ThemeToggle />
            </div>
          </header>

          {/* Page content */}
          <div className="theme-content min-w-0 flex-1 relative p-6 bg-white dark:bg-slate-950 border-0 outline-none shadow-none transition-colors duration-200 overflow-y-auto" id="main-content">
            <Breadcrumb />
            <div className={location.pathname.startsWith('/owner') || location.pathname.startsWith('/admin') ? 'admin-module' : undefined}>
              <Outlet />
            </div>
          </div>
          {/* Footer */}
          <footer className="bg-white/50 dark:bg-slate-950/50 py-4 px-6 flex-shrink-0" id="footer" role="contentinfo">
            <p className="text-xs text-center text-muted-fg dark:text-muted-fg">
              © 2026 WiWaste. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div></ErrorBoundary>
  );
}
