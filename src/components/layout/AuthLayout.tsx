import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  BarChart3,
  LineChart,
  PieChart,
  PackageSearch,
  Users,
  Sparkles,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../ui/sheet';
import { clearStoredSession, getStoredSession } from '../../utils/mockAuthAndFeatures';

const BRAND_ICON = '/images/logo.PNG';
const BRAND_WORDMARK = '/images/Logo_full.PNG';

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthed = Boolean(getStoredSession());
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  function handleLogout() {
    clearStoredSession();
    navigate('/');
  }

  const sidebarItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/predictive', label: 'Predictive Analytics', icon: LineChart },
    { to: '/dashboard/leakage', label: 'Leakage Detection', icon: BarChart3 },
    { to: '/dashboard/fefo', label: 'FEFO Tracking', icon: PackageSearch },
    { to: '/dashboard/vendors', label: 'Vendor Credits', icon: Users },
    { to: '/dashboard/behavior', label: 'Behavioral Intelligence', icon: PieChart },
    { to: '/dashboard/prescriptive', label: 'Decision Sandbox', icon: Sparkles },
  ];

  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-[248px]';

  const SidebarContent = ({
    compact = false,
    closeDrawer,
    onToggleCollapse,
  }: {
    compact?: boolean;
    closeDrawer?: () => void;
    onToggleCollapse?: () => void;
  }) => (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={compact ? BRAND_ICON : BRAND_WORDMARK}
              alt="WiWaste"
              className={`shrink-0 object-contain ${compact ? 'h-9 w-9' : 'h-9 w-auto max-w-[160px]'}`}
            />
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

      </div>

      <nav className={`flex-1 space-y-1 ${compact ? 'px-2 py-3' : 'px-3 py-4'}`}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => closeDrawer?.()}
              className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                compact ? 'justify-center px-2' : ''
              } ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
              aria-label={item.label}
              title={compact ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full rounded-2xl bg-sidebar-accent px-3 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground ${
            compact ? 'px-2' : ''
          }`}
          aria-label="Sign out"
          title={compact ? 'Sign out' : undefined}
        >
          {compact ? <LogOut className="h-4 w-4 mx-auto" /> : 'Sign out'}
        </button>
      </div>
    </div>
  );

  const shell = (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/dashboard' : '/login'} className="flex items-center gap-3">
            <img src={BRAND_WORDMARK} alt="WiWaste" className="h-10 w-auto object-contain" />
            <span className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">
              <ShieldCheck className="h-4 w-4 text-[#006b5f]" />
              Secure Portal
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthed ? (
              <>
                {isDashboardRoute && (
                  <div className="lg:hidden">
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                      <SheetTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                        >
                          <Menu className="h-4 w-4" />
                          Menu
                        </button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[300px] border-0 bg-[#0b1220] p-0 text-white">
                        <div className="border-b border-white/10 px-4 py-4">
                          <img src={BRAND_WORDMARK} alt="WiWaste" className="h-9 w-auto object-contain" />
                        </div>
                        <div className="flex h-[calc(100%-4rem)] flex-col">
                          <SidebarContent closeDrawer={() => setMobileOpen(false)} />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                )}

              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-[#45464d] hover:text-[#006b5f] dark:text-slate-300 dark:hover:text-[#7ef0cf]">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#131b2e] px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors shadow-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

                {isDashboardRoute && isAuthed ? (
                    <div className="flex min-h-[calc(100vh-4rem)] w-full">
                    <aside
                      className={`hidden flex-none overflow-hidden border border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] ${sidebarWidth}`}
                    >
                      <SidebarContent compact={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
                    </aside>

                    <div className="theme-content min-w-0 flex-1 px-4 py-6 sm:px-6 lg:pl-6 lg:pr-8 lg:py-8">
                      <Outlet />
                    </div>
                  </div>
                ) : (
        <main className="theme-content px-4 sm:px-6 lg:px-8 py-10">
          <Outlet />
        </main>
      )}
    </div>
  );

  return shell;
}
