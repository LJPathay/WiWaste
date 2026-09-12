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
  ChevronRight,
  Info,
  Package,
  ShieldAlert,
  TrendingUp,
  Users,
  Settings,
  Truck,
  PhilippinePeso,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useKpiHighlight } from '../../hooks/useKpiHighlight';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const LEAKAGE_COLORS = ['#006a61', '#f97316', '#f59e0b', '#eab308', '#22c55e'];

const CHART_TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
  fontSize: '12px',
};

export function DashboardOverview() {
  const { data, overview, ownerAnalytics, loading } = useDashboardData();
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
        <div className="h-10 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-slate-700 dark:text-slate-200">No data</div>;

  // ── KPI Calculations ────────────────────────────────────────────────────
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
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      change: `${salesUp ? '↑' : '↓'} ${Math.abs(Number(salesChange))}% vs last month`,
      up: salesUp,
      route: '/owner/reports',
    },
    {
      label: 'Gross Profit',
      value: currencyFormatter.format(grossProfit),
      note: 'After cost of goods sold',
      icon: PhilippinePeso,
      iconBg: 'bg-teal-50 dark:bg-teal-950/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      change: `${profitUp ? '↑' : '↓'} ${Math.abs(Number(profitChange))}% vs last month`,
      up: profitUp,
      route: '/owner/reports',
    },
    {
      label: 'Wastage This Month',
      value: currencyFormatter.format(wastageThisMonth),
      note: 'Expiry waste is the primary driver',
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 dark:bg-rose-950/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      change: `${wastageUp ? '↓' : '↑'} ${Math.abs(Number(wastageChange))}% vs last month`,
      up: wastageUp,
      route: '/dashboard/leakage',
    },
    {
      label: 'Inventory Value',
      value: currencyFormatter.format(inventoryValue),
      note: 'Current stock at cost price',
      icon: Package,
      iconBg: 'bg-sky-50 dark:bg-sky-950/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      change: 'Current value',
      up: true,
      route: '/owner/performance',
    },
  ];

  // ── Analytics Data ──────────────────────────────────────────────────────
  const salesTrendData = ownerAnalytics?.sales_trend ?? [];
  const wastageTrendData = ownerAnalytics?.wastage_trend ?? [];
  const leakageByCategory = ownerAnalytics?.leakage_by_category ?? [];
  const totalLeakage = leakageByCategory.reduce((sum, item) => sum + item.value, 0);
  const inventoryHealth = ownerAnalytics?.inventory_health ?? { healthy: 0, low_stock: 0, overstock: 0, expiring_soon: 0, expired: 0 };
  const forecastConfidence = ownerAnalytics?.forecast_confidence;

  const leakageChartData = leakageByCategory.map((item) => ({
    name: item.category,
    amount: item.value,
    quantity: item.quantity,
    percentage: item.percentage,
  }));

  // ── Payment Breakdown (real data from API) ──────────────────────────────
  const paymentBreakdown = (ownerAnalytics?.payment_breakdown ?? []).map((item) => ({
    method: item.payment_method,
    revenue: item.revenue,
  }));
  const paymentRevenue = paymentBreakdown.reduce((sum, item) => sum + item.revenue, 0);

  const adminStats = [
    { label: 'Active SKUs', value: overview?.active_skus ?? 0, icon: Package, link: '/owner/products' },
    { label: 'Registered Users', value: overview?.total_users ?? 0, icon: Users, link: '/owner/users' },
    { label: 'Active Suppliers', value: overview?.active_suppliers ?? 0, icon: Truck, link: '/owner/suppliers' },
    { label: 'System Settings', value: '—', icon: Settings, link: '/owner/settings' },
  ];

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">Dashboard</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              Business performance overview. All metrics draw from a single data source.
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      {/* ─── SECTION 1: KPI CARDS ─────────────────────────────────────────────── */}
      <section>
        <div ref={kpiSectionRef} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            const isActive = activeKpi === idx;
            return (
              <Link
                key={card.label}
                to={card.route}
                className={`group relative flex flex-col justify-between rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E] ${
                  isActive ? 'ring-2 ring-[#0F766E] border-transparent scale-[1.01] shadow-lg' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      card.up
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                    }`}
                  >
                    {card.up ? '▲' : '▼'} {card.change}
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-slate-100">{card.value}</div>
                  <div className="mt-0.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100">{card.label}</div>
                  <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-slate-400">{card.note}</div>
                </div>
                <div className="mt-2 flex justify-end">
                  <span className="text-[10px] font-medium text-[#0F766E] group-hover:underline flex items-center gap-0.5">
                    View Details <ArrowUpRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── SECTION 2: LEAKAGE & INVENTORY HEALTH ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Leakage & Risks</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* Leakage by Category */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Leakage by Category</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Financial losses broken down by product category</TooltipContent>
                </UITooltip>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-md border border-[#E5E7EB] dark:border-white/10 overflow-hidden">
                  {(['value', 'quantity', 'percentage'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLeakageViewMode(mode)}
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                        leakageViewMode === mode
                          ? 'bg-[#0F766E] text-white'
                          : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                  {currencyFormatter.format(totalLeakage)}
                </span>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leakageChartData}
                    dataKey={leakageViewMode === 'value' ? 'amount' : leakageViewMode === 'quantity' ? 'quantity' : 'percentage'}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
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
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Inventory Health</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-sky-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Distribution of inventory by health status</TooltipContent>
                </UITooltip>
              </div>
              <Link to="/owner/performance" className="flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
                Full view <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'Healthy', count: inventoryHealth.healthy, color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400', route: '/owner/performance' },
                { label: 'Low Stock', count: inventoryHealth.low_stock, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400', route: '/inventory/manage' },
                { label: 'Overstock', count: inventoryHealth.overstock, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', route: '/owner/overstock' },
                { label: 'Expiring', count: inventoryHealth.expiring_soon, color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-400', route: '/dashboard/fefo' },
                { label: 'Expired', count: inventoryHealth.expired, color: 'bg-rose-500', textColor: 'text-rose-700 dark:text-rose-400', route: '/dashboard/fefo' },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.route}
                  className="rounded-lg border border-[#E5E7EB] dark:border-white/5 p-2 text-center hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className={`inline-block h-2 w-2 rounded-full ${item.color} mb-1.5`} />
                  <div className="text-base font-bold text-[#0F172A] dark:text-slate-100">{item.count}</div>
                  <div className={`text-[8px] font-semibold uppercase tracking-wider ${item.textColor}`}>{item.label}</div>
                </Link>
              ))}
            </div>

            {/* Top Wasted Products */}
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Top Wasted Products</h4>
                <Link to="/dashboard/leakage" className="text-[9px] font-semibold text-[#0F766E] hover:underline">View All</Link>
              </div>
              <div className="space-y-2">
                {(ownerAnalytics?.top_wasted_products ?? []).slice(0, 3).map((product) => {
                  const maxLoss = ownerAnalytics?.top_wasted_products?.[0]?.loss ?? 1;
                  const pct = (product.loss / maxLoss) * 100;
                  return (
                    <div key={product.product_id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-100 truncate">{product.name}</span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{currencyFormatter.format(product.loss)}</span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: TRENDS ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Trends</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* Sales & Revenue Trend */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Sales & Revenue Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Daily revenue from completed POS transactions</TooltipContent>
                </UITooltip>
              </div>
              <select
                value={salesPeriod}
                onChange={(e) => setSalesPeriod(e.target.value)}
                className="px-2 py-1 text-[10px] rounded-md border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">3 months</option>
              </select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0F766E" fill="url(#salesFill)" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Wastage Trend */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Wastage Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Monetary value of inventory waste over time</TooltipContent>
                </UITooltip>
              </div>
              <Link to="/dashboard/leakage" className="flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
                View Details <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wastageTrendData}>
                  <defs>
                    <linearGradient id="wastageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => currencyFormatter.format(Number(value))}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Area type="monotone" dataKey="value" stroke="#EF4444" fill="url(#wastageFill)" strokeWidth={2} name="Wastage" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: REPORTING ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Reporting</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* Demand Forecast */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Demand Forecast</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-sky-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>ARIMA-projected demand for the next period</TooltipContent>
                </UITooltip>
              </div>
              {forecastConfidence !== null && forecastConfidence !== undefined && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
                  {forecastConfidence}% confidence
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-3">
              Predicted waste volume with model confidence. Used for purchase order planning and FEFO prioritization.
            </p>
            <Link to="/dashboard/predictive" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
              Full Predictive Analytics <ChevronRight className="h-2.5 w-2.5" />
            </Link>
          </div>

          {/* Revenue by Payment Method */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Revenue by Payment Method</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 hover:text-[#0F766E] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Revenue share from completed POS transactions</TooltipContent>
                </UITooltip>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {currencyFormatter.format(paymentRevenue)} total
              </span>
            </div>
            {paymentBreakdown.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="method" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" width={70} />
                    <Tooltip
                      formatter={(value) => currencyFormatter.format(Number(value))}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <Bar dataKey="revenue" radius={[0, 10, 10, 0]} fill="#0F766E" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-[#64748B] dark:text-slate-400">
                No payment data available
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: SYSTEM ADMINISTRATION ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">System Administration</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                to={stat.link}
                className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] dark:bg-slate-800 mb-2 transition-colors group-hover:bg-[#0F766E]/10">
                  <Icon className="h-4 w-4 text-[#64748B] dark:text-slate-400 transition-colors group-hover:text-[#0F766E]" />
                </div>
                <div className="text-lg font-bold text-[#0F172A] dark:text-slate-100">{stat.value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B] dark:text-slate-400">{stat.label}</div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] opacity-0 group-hover:opacity-100 transition-opacity">
                  Manage <ChevronRight className="h-2.5 w-2.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
