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

const AUTH_KEY = 'wiwaste-auth';

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
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

  const SidebarContent = ({ compact = false, closeDrawer }: { compact?: boolean; closeDrawer?: () => void }) => (
    <>
      <div className="p-6 border-b border-white/10 bg-gradient-to-br from-[#0f1b34] to-[#0b1220]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-[#7ef0cf]" />
          </div>
          {!compact && (
            <div>
              <div className="text-sm text-white/70">WiWaste</div>
              <div className="text-lg font-semibold">Command Center</div>
            </div>
          )}
        </div>

        {!compact && (
          <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/55">Active Workspace</div>
            <div className="mt-1 text-sm font-medium">Retail Optimization</div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#66f0c2] to-[#4db8ff]" />
            </div>
          </div>
        )}
      </div>

      <nav className={`p-4 space-y-1 ${compact ? 'px-2' : ''}`}>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => closeDrawer?.()}
              className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                compact ? 'justify-center' : ''
              } ${active ? 'bg-white text-[#0b1220] shadow-sm' : 'text-white/75 hover:bg-white/8 hover:text-white'}`}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compact && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors ${
            compact ? 'px-2' : ''
          }`}
          aria-label="Sign out"
        >
          {compact ? <LogOut className="h-4 w-4 mx-auto" /> : 'Sign out'}
        </button>
      </div>
    </>
  );

  const shell = (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1b1b1d] font-['Inter',sans-serif] transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-white/70 bg-white/85 backdrop-blur-md sticky top-0 z-40 transition-colors dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/dashboard' : '/login'} className="flex items-center gap-3">
            <img src="/images/Logo_fullwobg.png" alt="WiWaste" className="h-10 w-auto object-contain" />
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
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCollapsed((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                    >
                      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      {collapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                )}

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
                      <SheetContent side="left" className="w-[320px] border-0 bg-[#0b1220] p-0 text-white">
                        <SheetHeader className="border-b border-white/10 p-6 text-left">
                          <SheetTitle className="text-white">WiWaste Command Center</SheetTitle>
                          <SheetDescription className="text-white/70">
                            Navigate dashboard sections and views.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="flex h-[calc(100%-5rem)] flex-col">
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
                  <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
                    <div
                      className="grid grid-cols-1 gap-6 transition-[grid-template-columns] duration-300 ease-in-out lg:items-start"
                      style={{
                        gridTemplateColumns: collapsed ? '92px minmax(0, 1fr)' : '280px minmax(0, 1fr)',
                      }}
                    >
            <aside
                        className={`hidden lg:flex flex-col rounded-3xl bg-[#0b1220] text-white shadow-2xl shadow-slate-900/10 border border-white/10 overflow-hidden lg:sticky lg:top-24 h-fit transition-all duration-300`}
            >
              <SidebarContent compact={collapsed} />
            </aside>

            <div className="theme-content min-w-0">
              <Outlet />
            </div>
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
