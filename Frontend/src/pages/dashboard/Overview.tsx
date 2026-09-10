import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
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
  PhilippinePeso,
  Brain,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useKpiHighlight } from '../../hooks/useKpiHighlight';
import { initialSalesTransactions } from '../../utils/cashierData';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const AVAILABLE_SHORTCUTS = [
  { id: 'sales', label: 'Sales', description: 'View sales transactions and revenue.', to: '/cashier/history', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory', description: 'Manage stock levels and products.', to: '/inventory/manage', icon: Package },
  { id: 'wastage', label: 'Wastage', description: 'Track and record inventory losses.', to: '/inventory/wastage', icon: Trash2 },
  { id: 'purchase-orders', label: 'Purchase Orders', description: 'Manage supplier orders.', to: '/owner/purchase-orders', icon: Truck },
  { id: 'reports', label: 'Reports', description: 'Generate business reports.', to: '/owner/reports', icon: BarChart3 },
  { id: 'audit-logs', label: 'Audit Logs', description: 'Review system activity.', to: '/owner/audit-logs', icon: Activity },
  { id: 'predictive', label: 'Predictive Analytics', description: 'Forecast demand and detect anomalies.', to: '/dashboard/predictive', icon: Brain },
  { id: 'leakage', label: 'Leakage Detection', description: 'Find categories leaking margin.', to: '/dashboard/leakage', icon: ShieldAlert },
];

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{title}</h2>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

const LEAKAGE_COLORS = ['#006a61', '#f97316', '#f59e0b', '#eab308', '#22c55e'];

export function DashboardOverview() {
  const { data, overview, ownerAnalytics, loading } = useDashboardData();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [tempShortcuts, setTempShortcuts] = useState(AVAILABLE_SHORTCUTS.slice(0, 3));
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [clickedKpi, setClickedKpi] = useState<number | null>(null);
  const kpiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedKpi = useKpiHighlight(5000);
  const [salesPeriod, setSalesPeriod] = useState('30');
  const [leakageViewMode, setLeakageViewMode] = useState<'value' | 'quantity' | 'percentage'>('value');

  const activeKpi = clickedKpi ?? highlightedKpi;

  const kpiSectionRef = useRef<HTMLDivElement | null>(null);
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

  // ── Business Health KPI Calculations ─────────────────────────────────────────
  const salesThisMonth = overview?.sales_this_month ?? 0;
  const salesLastMonth = overview?.sales_last_month ?? 0;
  const salesChange = salesLastMonth > 0 ? ((salesThisMonth - salesLastMonth) / salesLastMonth * 100).toFixed(1) : '0';
  const salesUp = salesThisMonth >= salesLastMonth;

  const grossProfit = overview?.gross_profit_this_month ?? 0;
  const grossProfitLast = overview?.gross_profit_last_month ?? 0;
  const profitChange = grossProfitLast > 0 ? ((grossProfit - grossProfitLast) / grossProfitLast * 100).toFixed(1) : '0';
  const profitUp = grossProfit >= grossProfitLast;

  const wastageThisMonth = overview?.wastage_this_month ?? 0;
  const wastageLastMonth = overview?.wastage_last_month ?? 0;
  const wastageChange = wastageLastMonth > 0 ? ((wastageThisMonth - wastageLastMonth) / wastageLastMonth * 100).toFixed(1) : '0';
  const wastageUp = wastageThisMonth <= wastageLastMonth;

  const inventoryValue = overview?.inventory_value ?? 0;

  const kpiCards = [
    {
      label: 'Sales This Month',
      value: currencyFormatter.format(salesThisMonth),
      note: 'Revenue from completed transactions',
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      ringColor: 'ring-emerald-400',
      change: `${salesUp ? '↑' : '↓'} ${Math.abs(Number(salesChange))}% vs last month`,
      up: salesUp,
      route: '/owner/reports',
    },
    {
      label: 'Gross Profit',
      value: currencyFormatter.format(grossProfit),
      note: 'After cost of goods sold',
      icon: PhilippinePeso,
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600',
      ringColor: 'ring-teal-400',
      change: `${profitUp ? '↑' : '↓'} ${Math.abs(Number(profitChange))}% vs last month`,
      up: profitUp,
      route: '/owner/reports',
    },
    {
      label: 'Wastage This Month',
      value: currencyFormatter.format(wastageThisMonth),
      note: 'Expiry waste is the primary driver',
      icon: ShieldAlert,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600',
      ringColor: 'ring-rose-400',
      change: `${wastageUp ? '↓' : '↑'} ${Math.abs(Number(wastageChange))}% vs last month`,
      up: wastageUp,
      route: '/dashboard/leakage',
    },
    {
      label: 'Inventory Value',
      value: currencyFormatter.format(inventoryValue),
      note: 'Current stock at cost price',
      icon: Package,
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-600',
      ringColor: 'ring-sky-400',
      change: 'Current value',
      up: true,
      route: '/owner/performance',
    },
  ];

  // ── Priority Action Queue ─────────────────────────────────────────────────
  const criticalBatches = overview?.critical_fefo_count ?? 0;
  const highRiskBatches = overview?.high_risk_fefo_count ?? 0;
  const totalLeakage = ownerAnalytics?.leakage_by_category?.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const topLeakage = ownerAnalytics?.leakage_by_category?.[0] ?? { category: 'N/A', value: 0, percentage: 0 };
  const vendorReturnsList = data.vendorReturns ?? [];
  const totalCredits = vendorReturnsList.reduce((sum, item) => sum + (item.eligibleCredit ?? 0), 0);
  const expiredVendorWindows = vendorReturnsList.filter((v) => v.returnDeadline?.getTime?.() < Date.now()).length;

  const priorityActions = [
    {
      severity: 'URGENT',
      severityColor: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
      borderColor: 'border-l-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
      titleColor: 'text-rose-900 dark:text-rose-100',
      bodyColor: 'text-rose-800/80 dark:text-rose-200/70',
      title: `Move expiring batches today`,
      problem: `${criticalBatches} critical, ${highRiskBatches} high-risk batches at risk.`,
      financialImpact: `Potential loss: ${currencyFormatter.format(totalLeakage)}`,
      action: 'Prioritize these batches for immediate sale or markdown.',
      route: '/dashboard/fefo',
      routeLabel: 'View FEFO',
    },
    {
      severity: 'ACTION',
      severityColor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      titleColor: 'text-amber-900 dark:text-amber-100',
      bodyColor: 'text-amber-800/80 dark:text-amber-200/70',
      title: `Reduce ${topLeakage.category?.toLowerCase() ?? 'category'} losses`,
      problem: `${topLeakage.category} is the largest leakage source.`,
      financialImpact: `${currencyFormatter.format(topLeakage.value)} leaked this month`,
      action: 'Investigate root causes and implement category-specific controls.',
      route: '/dashboard/leakage',
      routeLabel: 'View Leakage',
    },
    {
      severity: 'REVIEW',
      severityColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      borderColor: 'border-l-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      titleColor: 'text-emerald-900 dark:text-emerald-100',
      bodyColor: 'text-emerald-800/80 dark:text-emerald-200/70',
      title: 'Recover vendor credits',
      problem: `${currencyFormatter.format(totalCredits)} remains eligible across supplier return windows.`,
      financialImpact: `${expiredVendorWindows} return window${expiredVendorWindows > 1 ? 's' : ''} expired`,
      action: 'File claims before remaining windows close.',
      route: '/dashboard/vendors',
      routeLabel: 'Review Credits',
    },
  ];

  // ── Analytics Data ────────────────────────────────────────────────────────
  const salesTrendData = ownerAnalytics?.sales_trend ?? [];
  const wastageTrendData = ownerAnalytics?.wastage_trend ?? [];
  const leakageByCategory = ownerAnalytics?.leakage_by_category ?? [];
  const inventoryHealth = ownerAnalytics?.inventory_health ?? { healthy: 0, low_stock: 0, overstock: 0, expiring_soon: 0, expired: 0 };
  const averageConfidence = 87;

  const leakageChartData = leakageByCategory.map((item) => ({
    name: item.category,
    amount: item.value,
    quantity: item.quantity,
    percentage: item.percentage,
  }));

  // ── Payment Breakdown ─────────────────────────────────────────────────────
  const paymentBreakdown = ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'].map((method) => ({
    method,
    revenue: initialSalesTransactions
      .filter((t) => t.payment_method === method)
      .reduce((sum, t) => sum + t.total_amount, 0),
  }));
  const paymentRevenue = paymentBreakdown.reduce((sum, item) => sum + item.revenue, 0);

  const adminStats = [
    { label: 'Active SKUs', value: overview?.active_skus ?? 248, icon: Package, link: '/owner/products', note: 'Real-time' },
    { label: 'Registered Users', value: overview?.total_users ?? 9, icon: Users, link: '/owner/users', note: 'Real-time' },
    { label: 'Active Suppliers', value: overview?.active_suppliers ?? 6, icon: Truck, link: '/owner/suppliers', note: 'Real-time' },
    { label: 'System Settings', value: '—', icon: Settings, link: '/owner/settings', note: '' },
  ];

  const CHART_TOOLTIP_STYLE = {
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help self-center" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Business performance overview. All metrics draw from a single data source.
          </TooltipContent>
        </UITooltip>
      </div>

      {/* ─── SECTION 1: BUSINESS PERFORMANCE ─────────────────────────────────────── */}
      <section>
        <SectionDivider title="Business Performance" />

        {/* KPI Cards */}
        <div ref={kpiSectionRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            const isActive = activeKpi === idx;
            return (
              <Link
                key={card.label}
                to={card.route}
                className={`group relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 text-left dark:bg-white/5 dark:hover:bg-white/8 ${
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
                  <span className={`text-xs font-semibold ${card.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {card.change}
                  </span>
                </div>
                <div className="absolute bottom-2 right-3 flex items-center gap-1 text-[11px] font-bold text-brand dark:text-[#7ef0cf] opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
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
                  className={`rounded-2xl border-l-4 ${action.borderColor} ${action.bgColor} p-4 transition-all hover:translate-x-0.5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-sm font-semibold ${action.titleColor}`}>{action.title}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest ${action.severityColor}`}>
                      {action.severity}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${action.bodyColor}`}>{action.problem}</p>
                  {action.financialImpact && (
                    <p className={`mt-1 text-xs font-semibold ${action.bodyColor}`}>{action.financialImpact}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[11px] ${action.bodyColor}`}>{action.action}</span>
                    <Link to={action.route} className="text-[11px] font-bold text-brand dark:text-[#7ef0cf] hover:underline flex items-center gap-0.5">
                      {action.routeLabel} <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
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

      {/* ─── SECTION 2: RISKS / LEAKAGE ──────────────────────────────────────────── */}
      <section>
        <SectionDivider title="Leakage & Risks" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Leakage by Category */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage by Category</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Financial losses broken down by product category
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                  {(['value', 'quantity', 'percentage'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLeakageViewMode(mode)}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        leakageViewMode === mode
                          ? 'bg-brand text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  {currencyFormatter.format(totalLeakage)}
                </span>
                <Link to="/dashboard/leakage" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                  Full view <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leakageChartData}
                    dataKey={leakageViewMode === 'value' ? 'amount' : leakageViewMode === 'quantity' ? 'quantity' : 'percentage'}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {leakageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LEAKAGE_COLORS[index % LEAKAGE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => leakageViewMode === 'value' ? currencyFormatter.format(value) : value}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Inventory Health</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Distribution of inventory by health status
                  </TooltipContent>
                </UITooltip>
              </div>
              <Link to="/owner/performance" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                Full view <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Healthy', count: inventoryHealth.healthy, color: 'bg-emerald-500', textColor: 'text-emerald-700', route: '/owner/performance' },
                { label: 'Low Stock', count: inventoryHealth.low_stock, color: 'bg-amber-500', textColor: 'text-amber-700', route: '/inventory/manage' },
                { label: 'Overstock', count: inventoryHealth.overstock, color: 'bg-blue-500', textColor: 'text-blue-700', route: '/owner/overstock' },
                { label: 'Expiring', count: inventoryHealth.expiring_soon, color: 'bg-orange-500', textColor: 'text-orange-700', route: '/dashboard/fefo' },
                { label: 'Expired', count: inventoryHealth.expired, color: 'bg-rose-500', textColor: 'text-rose-700', route: '/dashboard/fefo' },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.route}
                  className="rounded-2xl border border-slate-100 dark:border-white/5 p-4 text-center hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className={`inline-block h-3 w-3 rounded-full ${item.color} mb-2`} />
                  <div className="text-2xl font-bold text-[#0b1c30] dark:text-slate-100">{item.count}</div>
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${item.textColor}`}>{item.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: PREDICTIVE INSIGHTS ──────────────────────────────────────── */}
      <section>
        <SectionDivider title="Predictive Insights" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Sales & Revenue Trend */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Sales & Revenue Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-emerald-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Daily revenue from completed POS transactions
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">3 months</option>
                </select>
                <Link to="/owner/reports" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                  Full view <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006a61" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#006a61" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Area type="monotone" dataKey="value" stroke="#006a61" fill="url(#salesFill)" strokeWidth={2.5} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Wastage Trend */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Wastage Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    Monetary value of inventory waste over time
                  </TooltipContent>
                </UITooltip>
              </div>
              <Link to="/dashboard/leakage" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                View Details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wastageTrendData}>
                  <defs>
                    <linearGradient id="wastageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#wastageFill)" strokeWidth={2} name="Wastage" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: DETAILED REPORTING ────────────────────────────────────────── */}
      <section>
        <SectionDivider title="Detailed Reporting" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Demand Forecast Summary */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Demand Forecast</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                    ARIMA-projected demand for the next period
                  </TooltipContent>
                </UITooltip>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                {averageConfidence}% confidence
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Predicted waste volume with model confidence. Used for purchase order planning and FEFO prioritization.
            </p>
            <Link to="/dashboard/predictive" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              Full Predictive Analytics <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Revenue by Payment Method */}
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
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="method" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="revenue" radius={[0, 12, 12, 0]} fill="#006a61" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: SYSTEM ADMINISTRATION ───────────────────────────────────────── */}
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
