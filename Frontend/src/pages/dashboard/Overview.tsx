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
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  GripVertical,
  Info,
  LayoutDashboard,
  Package,
  PackageCheck,
  Plus,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useKpiHighlight } from '../../hooks/useKpiHighlight';
import { retailExamples } from '../../utils/mockAuthAndFeatures';
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
    >₱</span>
  );
}

const AVAILABLE_SHORTCUTS = [
  { id: 'predictive', label: 'Predictive Analytics', description: 'Forecast demand and detect seasonal anomalies.', to: '/dashboard/predictive', icon: TrendingUp },
  { id: 'leakage', label: 'Leakage Detection', description: 'Find categories leaking the most margin.', to: '/dashboard/leakage', icon: BarChart3 },
  { id: 'prescriptive', label: 'Decision Sandbox', description: 'Compare actions by ROI before rollout.', to: '/dashboard/prescriptive', icon: CalendarClock },
  { id: 'fefo', label: 'FEFO Tracking', description: 'Monitor batches by expiry priority order.', to: '/dashboard/fefo', icon: PackageCheck },
  { id: 'vendors', label: 'Vendor Credits', description: 'Track and recover eligible supplier credits.', to: '/dashboard/vendors', icon: PhpIcon },
];

export function DashboardOverview() {
  const { data, loading } = useDashboardData();
  const navigate = useNavigate();
  const [basketOpen, setBasketOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [tempShortcuts, setTempShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [clickedKpi, setClickedKpi] = useState<number | null>(null);
  const kpiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedKpi = useKpiHighlight(5000);

  // Merge: a card is "active" if it was clicked OR returned-to via URL
  const activeKpi = clickedKpi ?? highlightedKpi;

  // Auto-scroll the highlighted KPI card into view when arriving via URL
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
    confidence: Math.round(item.confidence * 100),
  }));
  const leakageChart = data.profitLeakage.map((item) => ({
    name: item.category.replace(' ', '\n'),
    amount: item.leakageAmount,
  }));
  const paymentBreakdown = ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'].map((method) => ({
    method,
    revenue: initialSalesTransactions
      .filter(transaction => transaction.payment_method === method)
      .reduce((sum, transaction) => sum + transaction.total_amount, 0),
  }));
  const paymentRevenue = paymentBreakdown.reduce((sum, item) => sum + item.revenue, 0);
  const totalLeakage = data.profitLeakage.reduce((sum, item) => sum + item.leakageAmount, 0);
  const totalCredits = data.vendorReturns.reduce((sum, item) => sum + item.eligibleCredit, 0);
  const averageConfidence = Math.round(
    (data.predictiveAnalytics.wasteVolumeForecast.reduce((sum, item) => sum + item.confidence, 0) /
      data.predictiveAnalytics.wasteVolumeForecast.length) *
      100
  );
  const criticalBatches = data.batchFEFO.filter((batch) => batch.daysToExpiry <= 7).length;
  const topLeakage = data.profitLeakage.reduce(
    (highest, item) => (item.leakageAmount > highest.leakageAmount ? item : highest),
    data.profitLeakage[0]
  );
  const nextBatch = [...data.batchFEFO].sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
  const expiredVendorWindows = data.vendorReturns.filter(
    (vendor) => vendor.returnDeadline.getTime() < Date.now()
  ).length;

  const kpiCards = [
    {
      label: 'Forecast Confidence',
      value: `${averageConfidence}%`,
      note: `${forecastChart.length} monthly demand points`,
      icon: TrendingUp,
      accent: 'from-sky-500 to-cyan-400',
      iconBg: 'bg-sky-500/10 dark:bg-sky-400/10',
      iconColor: 'text-sky-600 dark:text-sky-400',
      ringColor: 'ring-sky-400',
      alertBg: 'bg-sky-50 dark:bg-sky-500/15',
      alertText: 'text-sky-700 dark:text-sky-300',
      alertDot: 'bg-sky-500',
      change: '+2.3%',
      up: true,
      critical: averageConfidence < 70
        ? `Low confidence — only ${averageConfidence}% avg across forecasts`
        : `${averageConfidence}% avg confidence across ${forecastChart.length} months`,
      isCritical: averageConfidence < 70,
    },
    {
      label: 'Monthly Leakage',
      value: currencyFormatter.format(totalLeakage),
      note: `${topLeakage.category} is the largest driver`,
      icon: ShieldAlert,
      accent: 'from-rose-500 to-orange-400',
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
    },
    {
      label: 'Recoverable Credits',
      value: currencyFormatter.format(totalCredits),
      note: `${expiredVendorWindows} return window needs attention`,
      icon: PhpIcon,
      accent: 'from-emerald-500 to-teal-400',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      ringColor: 'ring-emerald-400',
      alertBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      alertText: 'text-emerald-700 dark:text-emerald-300',
      alertDot: 'bg-emerald-500',
      change: '+5.8%',
      up: true,
      critical: expiredVendorWindows > 0
        ? `${expiredVendorWindows} return window${expiredVendorWindows > 1 ? 's' : ''} expired — act now to recover ${currencyFormatter.format(totalCredits)}`
        : `${currencyFormatter.format(totalCredits)} eligible across all supplier windows`,
      isCritical: expiredVendorWindows > 0,
    },
    {
      label: 'Critical FEFO Batches',
      value: criticalBatches,
      note: `${nextBatch.batchId} expires in ${nextBatch.daysToExpiry} days`,
      icon: PackageCheck,
      accent: 'from-violet-500 to-indigo-400',
      iconBg: 'bg-violet-500/10 dark:bg-violet-400/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      ringColor: 'ring-violet-400',
      alertBg: 'bg-violet-50 dark:bg-violet-500/15',
      alertText: 'text-violet-700 dark:text-violet-300',
      alertDot: 'bg-violet-500',
      change: '+1',
      up: false,
      critical: criticalBatches > 0
        ? `${criticalBatches} batch${criticalBatches > 1 ? 'es' : ''} expire within 7 days — ${nextBatch.batchId} is next (${nextBatch.daysToExpiry}d)`
        : `${nextBatch.batchId} expires in ${nextBatch.daysToExpiry} days`,
      isCritical: criticalBatches > 0,
    },
  ];

  const actionCards = [
    {
      title: 'Predictive Analytics',
      description: 'Review demand movement, confidence, and seasonal anomaly signals.',
      to: '/dashboard/predictive',
      icon: TrendingUp,
      gradientFrom: 'from-sky-500',
      gradientTo: 'to-cyan-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      text: 'text-sky-700 dark:text-sky-300',
    },
    {
      title: 'Leakage Detection',
      description: 'Find the categories leaking the most margin this month.',
      to: '/dashboard/leakage',
      icon: BarChart3,
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-orange-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-300',
    },
    {
      title: 'Decision Sandbox',
      description: 'Compare recommended actions by ROI and risk before rollout.',
      to: '/dashboard/prescriptive',
      icon: CalendarClock,
      gradientFrom: 'from-violet-500',
      gradientTo: 'to-indigo-400',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      text: 'text-violet-700 dark:text-violet-300',
    },
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Overview</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Your operational intelligence at a glance — powered by live inventory data.
          </TooltipContent>
        </UITooltip>
      </div>

      {/* KPI Cards - Clickable */}
      <section ref={kpiSectionRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          const cardRoutes = ['/dashboard/predictive', '/dashboard/leakage', '/dashboard/vendors', '/dashboard/fefo'];
          const isActive = activeKpi === idx;
          return (
            <button
              key={card.label}
              onClick={() => {
                if (kpiTimerRef.current) clearTimeout(kpiTimerRef.current);
                setClickedKpi(idx);
                kpiTimerRef.current = setTimeout(() => {
                  setClickedKpi(null);
                  navigate(cardRoutes[idx] || '#');
                }, 800);
              }}
              className={`group relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 cursor-pointer text-left dark:bg-white/5 dark:backdrop-blur-xl dark:hover:bg-white/8 ${
                isActive
                  ? `ring-2 ${card.ringColor} border-transparent scale-[1.02] shadow-lg`
                  : 'border-white/60 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                  card.up
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {card.up ? '▲' : '▼'}
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30] dark:text-slate-100">{card.value}</div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform ${card.iconBg} ${isActive ? 'scale-110' : ''}`}>
                  <Icon className={`h-5 w-5 text-xl ${card.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">{card.note}</div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{card.change}</span>
              </div>
              {/* Critical signal banner */}
              <div className={`overflow-hidden transition-all duration-300 ${
                isActive ? 'max-h-16 mt-3 opacity-100' : 'max-h-0 mt-0 opacity-0'
              }`}>
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${card.alertBg}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${card.alertDot} ${card.isCritical ? 'animate-pulse' : ''}`} />
                  <span className={`text-[11px] font-medium leading-4 ${card.alertText}`}>{card.critical}</span>
                </div>
              </div>
              {/* Countdown ring */}
              {isActive && (
                <div className="absolute bottom-2 right-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-pulse">
                  navigating…
                </div>
              )}
            </button>
          );
        })}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Forecast Trend</h2>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Projected waste volume with model confidence
            </TooltipContent>
          </UITooltip>
        </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              {averageConfidence}% avg confidence
            </span>
          </div>
          <div className="h-80">
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
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
                <Area type="monotone" dataKey="forecast" stroke="#0ea5e9" fill="url(#dashboardForecastFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage Mix</h2>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Loss amount by category
            </TooltipContent>
          </UITooltip>
        </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {currencyFormatter.format(totalLeakage)}
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={0} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Payment Method Breakdown</h2>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400 hover:text-[#006a61] dark:hover:text-[#7ef0cf] cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                  Revenue share from completed POS transactions
                </TooltipContent>
              </UITooltip>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {currencyFormatter.format(paymentRevenue)}
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="method" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={0} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="revenue" radius={[12, 12, 0, 0]} fill="#006a61" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Payment Share</h2>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {paymentBreakdown.map(item => {
              const share = paymentRevenue > 0 ? Math.round((item.revenue / paymentRevenue) * 100) : 0;
              return (
                <div key={item.method} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.method}</span>
                    <span className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">{currencyFormatter.format(item.revenue)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-[#006a61]" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{share}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Priority Queue + Quick Nav */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Priority Queue */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Priority Action Queue</h2>
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

        {/* Quick Shortcuts */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Quick Shortcuts</h2>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Your favorite modules
              </TooltipContent>
            </UITooltip>
          </div>
            <button
              onClick={() => {
                setTempShortcuts(shortcuts);
                setShortcutsOpen(true);
              }}
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
                  <h3 className="mt-3 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">{shortcut.label}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{shortcut.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Edit Shortcuts Modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Edit Shortcuts</h3>
              <button
                onClick={() => {
                  setShortcutsOpen(false);
                  setTempShortcuts(shortcuts);
                }}
                className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Current Shortcuts ({tempShortcuts.length}/3)</p>
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
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                          draggedItem === shortcut.id
                            ? 'border-slate-400 bg-slate-100 dark:bg-slate-800'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                        } cursor-move`}
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
                onClick={() => {
                  setShortcutsOpen(false);
                  setTempShortcuts(shortcuts);
                }}
                className="flex-1 rounded-lg bg-slate-100 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShortcuts(tempShortcuts);
                  setShortcutsOpen(false);
                }}
                disabled={tempShortcuts.length !== 3}
                className="flex-1 rounded-lg bg-[#006a61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005550] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Baskets */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <button
          onClick={() => setBasketOpen(!basketOpen)}
          className="w-full flex items-center justify-between gap-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <Package className="h-5 w-5 text-slate-600 dark:text-slate-300 shrink-0" />
            <div className="text-left">
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Sample Baskets</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Minimart and pharmacy inventory snapshots</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform shrink-0 ${basketOpen ? 'rotate-180' : ''}`} />
        </button>
        {basketOpen && (
          <div className="border-t border-slate-200 dark:border-white/10 px-6 py-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { label: 'Minimart basket', store: retailExamples.minimart.storeName, items: retailExamples.minimart.sampleItems, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', dot: 'bg-sky-400', icon: Package },
              { label: 'Pharmacy basket', store: retailExamples.pharma.storeName, items: retailExamples.pharma.sampleItems, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-400', icon: Stethoscope },
            ].map((basket) => {
              const BasketIcon = basket.icon;
              return (
                <div key={basket.label} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${basket.tone}`}>
                      <BasketIcon className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${basket.dot}`} />
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{basket.label}</div>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">{basket.store}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {basket.items.map((item) => (
                      <span key={item} className={`rounded-full px-3 py-1 text-xs font-medium ${basket.tone}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
