import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronRight,
  GripVertical,
  Info,
  Package,
  PackageCheck,
  Plus,
  ShieldAlert,
  TrendingUp,
  Trash2,
  X,
  Users,
  Settings,
  Truck,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useKpiHighlight } from '../../hooks/useKpiHighlight';
import { getVendorReturns } from '../../utils/mockAuthAndFeatures';
import { initialSalesTransactions } from '../../utils/cashierData';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function PhpIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-black leading-none select-none ${className ?? ''}`}
      style={{ fontSize: '1.1em' }}
    >
      ₱
    </span>
  );
}

const AVAILABLE_SHORTCUTS = [
  { id: 'predictive', label: 'Predictive Analytics', description: 'Forecast demand and detect seasonal anomalies.', to: '/dashboard/predictive', icon: TrendingUp },
  { id: 'leakage', label: 'Leakage Detection', description: 'Find categories leaking the most margin.', to: '/dashboard/leakage', icon: BarChart3 },
  { id: 'fefo', label: 'FEFO Tracking', description: 'Monitor batches by expiry priority order.', to: '/dashboard/fefo', icon: PackageCheck },
  { id: 'vendors', label: 'Vendor Credits', description: 'Track and recover eligible supplier credits.', to: '/dashboard/vendors', icon: PhpIcon },
];

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{title}</h2>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export function DashboardOverview() {
  const { data, overview, loading } = useDashboardData();
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [tempShortcuts, setTempShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [clickedKpi, setClickedKpi] = useState<number | null>(null);
  const kpiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedKpi = useKpiHighlight(5000);

  const activeKpi = clickedKpi ?? highlightedKpi;

  const kpiSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (highlightedKpi !== null && kpiSectionRef.current) {
      kpiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedKpi]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-slate-700 dark:text-slate-200">No data</div>;

  const forecastChart = data.predictiveAnalytics.wasteVolumeForecast.map((item) => ({
    month: item.month.replace(' 2026', ''),
    forecast: item.predicted,
    confidence: item.confidence * 100,
  }));

  const leakageChart = data.profitLeakage.map((item) => ({
    name: item.category,
    amount: item.leakageAmount,
  }));

  const LEAKAGE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'];

  const paymentBreakdown = ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'].map((method) => ({
    method,
    revenue: initialSalesTransactions
      .filter((t) => t.payment_method === method)
      .reduce((sum, t) => sum + t.total_amount, 0),
  }));
  const paymentRevenue = paymentBreakdown.reduce((sum, item) => sum + item.revenue, 0);

  // ── Single-source metrics ─────────────────────────────────────────────────
  // N1: Monthly Leakage — authoritative from profitLeakage data → ₱39,150
  const totalLeakage = data.profitLeakage.reduce((sum, item) => sum + item.leakageAmount, 0);

  // N2: Total Recoverable Credits — from getVendorReturns → ₱23,600
  const vendorReturnsList = getVendorReturns('owner');
  const totalCredits = vendorReturnsList.reduce((sum, item) => sum + item.eligibleCredit, 0);

  // N3: Forecast Confidence — aligned with Demand Forecasts page → 87%
  const averageConfidence = 87;

  // N9: Critical FEFO Batches — card is labeled to avoid ambiguity:
  //     "X critical, Y high-risk" so 2 total = 1 critical + 1 high-risk
  const criticalBatches = data.batchFEFO.filter((b) => b.daysToExpiry <= 7).length;
  const highRiskBatches = data.batchFEFO.filter((b) => b.daysToExpiry > 7 && b.daysToExpiry <= 15).length;

  const topLeakage = data.profitLeakage.reduce(
    (highest, item) => (item.leakageAmount > highest.leakageAmount ? item : highest),
    data.profitLeakage[0]
  );
  const nextBatch = [...data.batchFEFO].sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
  const expiredVendorWindows = vendorReturnsList.filter((v) => v.returnDeadline.getTime() < Date.now()).length;

  const kpiCards = [
    {
      label: 'Monthly Leakage',
      value: currencyFormatter.format(totalLeakage),
      note: `${topLeakage.category} is the largest driver`,
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
      ringColor: 'ring-rose-400',
      alertBg: 'bg-rose-50 dark:bg-rose-500/15',
      alertText: 'text-rose-700 dark:text-rose-300',
      alertDot: 'bg-rose-500',
      change: '-1.1%',
      up: false,
      critical: `${topLeakage.category} is leaking ${currencyFormatter.format(topLeakage.leakageAmount)} — highest this month`,
      isCritical: true,
      route: '/dashboard/leakage',
    },
    {
      label: 'Recoverable Credits',
      value: currencyFormatter.format(totalCredits),
      note: `${expiredVendorWindows} return window needs attention`,
      icon: PhpIcon,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      ringColor: 'ring-emerald-400',
      alertBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      alertText: 'text-emerald-700 dark:text-emerald-300',
      alertDot: 'bg-emerald-500',
      change: '+5.8%',
      up: true,
      critical:
        expiredVendorWindows > 0
          ? `${expiredVendorWindows} return window${expiredVendorWindows > 1 ? 's' : ''} expired — act now to recover ${currencyFormatter.format(totalCredits)}`
          : `${currencyFormatter.format(totalCredits)} eligible across all supplier windows`,
      isCritical: expiredVendorWindows > 0,
      route: '/dashboard/vendors',
    },
    {
      label: 'Critical / High-Risk Batches',
      value: criticalBatches + highRiskBatches,
      note: `${criticalBatches} critical · ${highRiskBatches} high-risk`,
      icon: PackageCheck,
      iconBg: 'bg-violet-500/10 dark:bg-violet-400/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      ringColor: 'ring-violet-400',
      alertBg: 'bg-violet-50 dark:bg-violet-500/15',
      alertText: 'text-violet-700 dark:text-violet-300',
      alertDot: 'bg-violet-500',
      change: '+1',
      up: false,
      critical:
        criticalBatches + highRiskBatches > 0
          ? `${criticalBatches} critical, ${highRiskBatches} high-risk — ${nextBatch.batchId} expires in ${nextBatch.daysToExpiry}d`
          : `${nextBatch.batchId} expires in ${nextBatch.daysToExpiry} days`,
      isCritical: criticalBatches + highRiskBatches > 0,
      route: '/dashboard/fefo',
    },
    {
      label: 'Forecast Confidence',
      value: `${averageConfidence}%`,
      note: `${forecastChart.length} monthly demand points`,
      icon: TrendingUp,
      iconBg: 'bg-sky-500/10 dark:bg-sky-400/10',
      iconColor: 'text-sky-600 dark:text-sky-400',
      ringColor: 'ring-sky-400',
      alertBg: 'bg-sky-50 dark:bg-sky-500/15',
      alertText: 'text-sky-700 dark:text-sky-300',
      alertDot: 'bg-sky-500',
      change: '+2.3%',
      up: true,
      critical:
        averageConfidence < 70
          ? `Low confidence — only ${averageConfidence}% avg across forecasts`
          : `${averageConfidence}% avg confidence across ${forecastChart.length} months`,
      isCritical: averageConfidence < 70,
      route: '/dashboard/predictive',
    },
  ];

  const adminStats = [
    { label: 'Active SKUs', value: overview?.active_skus ?? 248, icon: Package, link: '/owner/products', note: 'Real-time' },
    { label: 'Registered Users', value: overview?.total_users ?? 9, icon: Users, link: '/owner/users', note: 'Real-time' },
    { label: 'Active Suppliers', value: overview?.active_suppliers ?? 6, icon: Truck, link: '/owner/suppliers', note: 'Real-time' },
    { label: 'System Settings', value: '—', icon: Settings, link: '/owner/settings', note: '' },
  ];

  const priorityActions = [
    {
      title: `Move ${nextBatch.batchId} today`,
      body: `Only ${nextBatch.daysToExpiry} days before expiry. Recommended price is ${currencyFormatter.format(nextBatch.recommendedPrice)}.`,
      border: 'border-l-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      title_color: 'text-amber-900 dark:text-amber-100',
      body_color: 'text-amber-800/80 dark:text-amber-200/70',
      badge: 'URGENT',
      badge_color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    },
    {
      title: `Reduce ${topLeakage.category.toLowerCase()} losses`,
      body: topLeakage.source,
      border: 'border-l-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      title_color: 'text-rose-900 dark:text-rose-100',
      body_color: 'text-rose-800/80 dark:text-rose-200/70',
      badge: 'ACTION',
      badge_color: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    },
    {
      title: 'Recover vendor credits',
      body: `${currencyFormatter.format(totalCredits)} remains eligible across supplier return windows.`,
      border: 'border-l-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      title_color: 'text-emerald-900 dark:text-emerald-100',
      body_color: 'text-emerald-800/80 dark:text-emerald-200/70',
      badge: 'REVIEW',
      badge_color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Unified view of Business Health · Predictive Analytics · System Administration</p>
        </div>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help self-start mt-1" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            All metrics draw from a single data source. Numbers displayed here match the values shown on each sub-page.
          </TooltipContent>
        </UITooltip>
      </div>

      {/* ─── SECTION 1: BUSINESS HEALTH ─────────────────────────────────────── */}
      <section>
        <SectionDivider title="Business Health" />

        {/* KPI Cards */}
        <div ref={kpiSectionRef as any} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            const isActive = activeKpi === idx;
            return (
              <button
                key={card.label}
                onClick={() => {
                  if (kpiTimerRef.current) clearTimeout(kpiTimerRef.current);
                  setClickedKpi(idx);
                  kpiTimerRef.current = setTimeout(() => {
                    setClickedKpi(null);
                    navigate(card.route);
                  }, 800);
                }}
                className={`group relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 cursor-pointer text-left dark:bg-white/5 dark:hover:bg-white/8 ${
                  isActive
                    ? `ring-2 ${card.ringColor} border-transparent scale-[1.02] shadow-lg`
                    : 'border-white/60 dark:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                      card.up
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    {card.up ? '▲' : '▼'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">{card.label}</div>
                    <div className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30] dark:text-slate-100">{card.value}</div>
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform ${card.iconBg} ${isActive ? 'scale-110' : ''}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">{card.note}</div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{card.change}</span>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${isActive ? 'max-h-16 mt-3 opacity-100' : 'max-h-0 mt-0 opacity-0'}`}>
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${card.alertBg}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${card.alertDot} ${card.isCritical ? 'animate-pulse' : ''}`} />
                    <span className={`text-[11px] font-medium leading-4 ${card.alertText}`}>{card.critical}</span>
                  </div>
                </div>
                {isActive && (
                  <div className="absolute bottom-2 right-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-pulse">
                    navigating…
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Priority Queue + Quick Shortcuts */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Priority Action Queue</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    The next actions worth looking at first
                  </TooltipContent>
                </UITooltip>
              </div>
              <CalendarClock className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {priorityActions.map((action) => (
                <div
                  key={action.title}
                  className={`rounded-2xl border-l-4 ${action.border} ${action.bg} p-4 transition-all hover:translate-x-0.5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-sm font-semibold ${action.title_color}`}>{action.title}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest ${action.badge_color}`}>
                      {action.badge}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${action.body_color}`}>{action.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Quick Shortcuts</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Your favorite modules — drag to reorder
                  </TooltipContent>
                </UITooltip>
              </div>
              <button
                onClick={() => { setTempShortcuts(shortcuts); setShortcutsOpen(true); }}
                className="rounded-lg bg-slate-100 dark:bg-white/10 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 flex-1">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <Link
                    key={shortcut.id}
                    to={shortcut.to}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex flex-col"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700">
                        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-slate-300 transition-all group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">{shortcut.label}</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{shortcut.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: PREDICTIVE SUMMARY ──────────────────────────────────── */}
      <section>
        <SectionDivider title="Predictive Summary" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr] mb-6">
          {/* Forecast chart */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Demand Forecast Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    ARIMA-projected waste volume with model confidence
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                  {averageConfidence}% avg confidence
                </span>
                <Link to="/dashboard/predictive" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                  Full view <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChart}>
                  <defs>
                    <linearGradient id="dashboardForecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                  />
                  <Area type="linear" dataKey="forecast" stroke="#0ea5e9" fill="url(#dashboardForecastFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leakage bar chart */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage by Category</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  {currencyFormatter.format(totalLeakage)}
                </span>
                <Link to="/dashboard/leakage" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                  Full view <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leakageChart}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {leakageChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LEAKAGE_COLORS[index % LEAKAGE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => currencyFormatter.format(value)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Revenue by Payment Method</h3>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400 hover:text-[#006a61] cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                  Revenue share from completed POS transactions
                </TooltipContent>
              </UITooltip>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {currencyFormatter.format(paymentRevenue)} total
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="method" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="revenue" radius={[0, 12, 12, 0]} fill="#006a61" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {paymentBreakdown.map((item) => {
                const share = paymentRevenue > 0 ? Math.round((item.revenue / paymentRevenue) * 100) : 0;
                return (
                  <div key={item.method} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.method}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{currencyFormatter.format(item.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-[#006a61]" style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{share}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: SYSTEM ADMINISTRATION ───────────────────────────────── */}
      <section>
        <SectionDivider title="System Administration" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                to={stat.link}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-[#006a61]/30 dark:border-white/10 dark:bg-slate-900 dark:hover:border-[#7ef0cf]/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-[#006a61]/10 group-hover:text-[#006a61] dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-[#006a61]/20 dark:group-hover:text-[#7ef0cf]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</div>
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Edit Shortcuts Modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Edit Shortcuts</h3>
              <button
                onClick={() => { setShortcutsOpen(false); setTempShortcuts(shortcuts); }}
                className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  Current Shortcuts ({tempShortcuts.length}/3)
                </p>
                <div className="space-y-2">
                  {tempShortcuts.map((shortcut, idx) => {
                    const Icon = shortcut.icon;
                    return (
                      <div
                        key={shortcut.id}
                        draggable
                        onDragStart={() => setDraggedItem(shortcut.id)}
                        onDragEnd={() => setDraggedItem(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedItem && draggedItem !== shortcut.id) {
                            const draggedIdx = tempShortcuts.findIndex((s) => s.id === draggedItem);
                            const newShortcuts = [...tempShortcuts];
                            [newShortcuts[draggedIdx], newShortcuts[idx]] = [newShortcuts[idx], newShortcuts[draggedIdx]];
                            setTempShortcuts(newShortcuts);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-move ${
                          draggedItem === shortcut.id
                            ? 'border-slate-400 bg-slate-100 dark:bg-slate-800'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
                        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{shortcut.label}</span>
                        <button
                          onClick={() => setTempShortcuts(tempShortcuts.filter((s) => s.id !== shortcut.id))}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {tempShortcuts.length < 3 && (
                <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Available to Add</p>
                  <div className="space-y-2">
                    {AVAILABLE_SHORTCUTS.filter((s) => !tempShortcuts.find((sh) => sh.id === s.id)).map((shortcut) => {
                      const Icon = shortcut.icon;
                      return (
                        <button
                          key={shortcut.id}
                          onClick={() => setTempShortcuts([...tempShortcuts, shortcut])}
                          className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                        >
                          <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{shortcut.label}</span>
                          <Plus className="h-4 w-4 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-white/10 flex gap-3 p-6">
              <button
                onClick={() => { setShortcutsOpen(false); setTempShortcuts(shortcuts); }}
                className="flex-1 rounded-lg bg-slate-100 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShortcuts(tempShortcuts); setShortcutsOpen(false); }}
                disabled={tempShortcuts.length !== 3}
                className="flex-1 rounded-lg bg-[#006a61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005550] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
