import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer } from 'recharts';
import {
  LazyAreaChart,
  LazyArea,
  LazyBarChart,
  LazyBar,
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyTooltip,
  LazyLegend,
  LazyCartesianGrid,
  LazyXAxis,
  LazyYAxis,
} from '../../components/charts/LazyCharts';
import {
  ArrowUpRight,
  ChevronRight,
  Info,
  Package,
  TrendingUp,
  Users,
  Settings,
  Truck,
  PhilippinePeso,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useDashboardData } from '../../hooks/useDashboardData';
import { ChartGradients, ChartTooltipStyle } from '../../components/charts/ChartGradients';
import { CHART_DEFAULTS, CHART_COLORS, CHART_TOOLTIP_STYLE, formatPesoAxis, useChartAnimation } from '../../components/charts/ChartConfig';
import { inventoryAnalytics, forecast, lossRisk, type ApiLossRiskSummary } from '../../services/api';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const LEAKAGE_COLORS = ['#006a61', '#f97316', '#f59e0b', '#eab308', '#22c55e'];



type ActionItem = {
  id: string;
  product: string;
  riskType: string;
  severity: 'High' | 'Medium' | 'Low';
  detail: string;
  potentialLoss: number | null;
  action: string;
  route: string;
};

function severityStyle(severity: ActionItem['severity']) {
  if (severity === 'High') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400';
  if (severity === 'Medium') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
  return 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400';
}

export function DashboardOverview() {
  const [salesPeriod, setSalesPeriod] = useState('30');
  const [leakageViewMode, setLeakageViewMode] = useState<'value' | 'quantity' | 'percentage'>('value');

  const { data, overview, ownerAnalytics, loading: baseLoading } = useDashboardData(salesPeriod);

  // These datasets are independent of each other, so they are requested as one
  // parallel burst. Chaining them behind `enabled` cost two extra round trips
  // before the page could finish loading.
  const { data: dashboardSummary, isError: summaryFailed } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => inventoryAnalytics.dashboardSummary(),
    staleTime: 30000,
  });

  const { data: overstock, isError: overstockFailed } = useQuery({
    queryKey: ['overstock'],
    queryFn: () => inventoryAnalytics.overstock(),
    staleTime: 30000,
  });

  const { data: forecastOverview } = useQuery({
    queryKey: ['forecastOverview'],
    queryFn: () => forecast.overview(),
    staleTime: 60000,
  });

  // Read the last stored XGBoost scoring run. POST /loss-risk/predict re-runs live
  // inference against the FastAPI service on every page visit, which dominated the
  // dashboard's load time; the cached item list carries the same data.
  const { data: lossRiskItemsResponse, isError: lossRiskFailed } = useQuery({
    queryKey: ['lossRiskItems'],
    queryFn: () => lossRisk.items(),
    staleTime: 120000,
    retry: 1,
  });

  const lossRiskItems = lossRiskItemsResponse?.items ?? [];
  const lossRiskSummary: ApiLossRiskSummary | undefined = lossRiskItemsResponse
    ? {
        total_products: lossRiskItems.length,
        high_risk: lossRiskItems.filter((item) => item.risk_tier === 'High').length,
        medium_risk: lossRiskItems.filter((item) => item.risk_tier === 'Medium').length,
        low_risk: lossRiskItems.filter((item) => item.risk_tier === 'Low').length,
        total_expected_loss: lossRiskItems.reduce((sum, item) => sum + Number(item.expected_loss ?? 0), 0),
      }
    : undefined;

  const { isAnimationActive, animationDuration, animationEasing } = useChartAnimation();

  const loading = baseLoading;

  const salesThisMonth = overview?.sales_this_month ?? 0;
  const salesLastMonth = overview?.sales_last_month ?? 0;
  const salesChange = salesLastMonth > 0 ? ((salesThisMonth - salesLastMonth) / salesLastMonth * 100) : null;
  const salesUp = salesThisMonth >= salesLastMonth;

  const grossProfit = overview?.gross_profit_this_month ?? 0;
  const grossProfitLast = overview?.gross_profit_last_month ?? 0;
  const profitChange = grossProfitLast > 0 ? ((grossProfit - grossProfitLast) / grossProfitLast * 100) : null;
  const profitUp = grossProfit >= grossProfitLast;

  const wastageThisMonth = overview?.wastage_this_month ?? 0;

  const inventoryValue = overview?.inventory_value ?? 0;

  const salesTrendData = ownerAnalytics?.sales_trend ?? [];
  const wastageTrendData = ownerAnalytics?.wastage_trend ?? [];
  const leakageByCategory = ownerAnalytics?.leakage_by_category ?? [];
  const totalLeakage = leakageByCategory.reduce((sum, item) => sum + Number(item.value), 0);
  const inventoryHealth = ownerAnalytics?.inventory_health ?? { healthy: 0, low_stock: 0, overstock: 0, expiring_soon: 0, expired: 0 };
  const forecastConfidence = ownerAnalytics?.forecast_confidence ?? forecastOverview?.avg_confidence ?? null;

  const leakageChartData = leakageByCategory.map((item) => ({
    name: item.category,
    amount: Number(item.value),
    quantity: Number(item.quantity),
    percentage: Number(item.percentage),
  }));

  const paymentBreakdown = (ownerAnalytics?.payment_breakdown ?? []).map((item) => ({
    method: item.payment_method,
    revenue: Number(item.revenue),
  }));
  const paymentRevenue = paymentBreakdown.reduce((sum, item) => sum + item.revenue, 0);

  const expiringItems = dashboardSummary?.expiring_soon_items ?? [];
  const lowStockItems = dashboardSummary?.low_stock_items ?? [];
  const overstockItems = overstock?.items ?? [];

  const productsAtRiskIds = new Set<number>();
  expiringItems.forEach((item) => productsAtRiskIds.add(item.product_id));
  overstockItems.forEach((item) => productsAtRiskIds.add(item.id));
  const productsAtRisk = productsAtRiskIds.size;

  const actionItems: ActionItem[] = [];

  expiringItems.forEach((item) => {
    const riskItem = lossRiskItems.find((r) => r.product_id === item.product_id);
    actionItems.push({
      id: `exp-${item.product_id}`,
      product: item.product_name,
      riskType: 'Expiring soon',
      severity: item.days_until <= 7 ? 'High' : item.days_until <= 15 ? 'Medium' : 'Low',
      detail: `Expires ${item.expiration_date} (${Math.round(item.days_until)} days)`,
      potentialLoss: riskItem?.expected_loss ?? null,
      action: 'Review expiry / FEFO',
      route: '/dashboard/fefo',
    });
  });

  overstockItems.forEach((item) => {
    actionItems.push({
      id: `over-${item.id}`,
      product: item.name,
      riskType: 'Overstock',
      severity: item.exposure >= 2000 ? 'High' : item.exposure >= 1000 ? 'Medium' : 'Low',
      detail: `${item.excess_qty} excess units`,
      potentialLoss: item.exposure,
      action: item.recommended_action,
      route: '/owner/overstock',
    });
  });

  lossRiskItems
    .filter((item) => item.risk_tier === 'High' || item.risk_tier === 'Medium')
    .forEach((item) => {
      actionItems.push({
        id: `risk-${item.product_id}`,
        product: item.product_name,
        riskType: 'Predicted loss risk',
        severity: item.risk_tier,
        detail: `${Math.round(item.loss_probability * 100)}% loss probability`,
        potentialLoss: item.expected_loss,
        action: 'Review forecast',
        route: '/dashboard/predictive',
      });
    });

  lowStockItems.forEach((item) => {
    actionItems.push({
      id: `low-${item.product_id}`,
      product: item.product_name,
      riskType: 'Low stock',
      severity: item.current_stock === 0 ? 'High' : 'Medium',
      detail: `${item.current_stock} of ${item.reorder_level} reorder level`,
      potentialLoss: null,
      action: 'Review replenishment',
      route: '/owner/replenishment',
    });
  });

  const severityRank = { High: 0, Medium: 1, Low: 2 };
  actionItems.sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    return (b.potentialLoss ?? 0) - (a.potentialLoss ?? 0);
  });

  const actionQueueFailed = summaryFailed || overstockFailed;
  const currentInventoryAtRisk = overstock?.total_exposure ?? 0;
  const forecastedPotentialLoss = lossRiskSummary?.total_expected_loss ?? 0;

  const adminStats = [
    { label: 'Active SKUs', value: overview?.active_skus ?? 0, icon: Package, link: '/owner/products' },
    { label: 'Registered Users', value: overview?.total_users ?? 0, icon: Users, link: '/owner/users' },
    { label: 'Active Suppliers', value: overview?.active_suppliers ?? 0, icon: Truck, link: '/owner/suppliers' },
    { label: 'System Settings', value: '—', icon: Settings, link: '/owner/settings' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-96 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!data && !overview) {
    return <div className="p-8 text-slate-700 dark:text-slate-200">No dashboard data available.</div>;
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">Wastage & Loss Visibility</h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-muted-fg">
            Monitor recorded losses, identify inventory risks, and prioritize preventive actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={salesPeriod}
            onChange={(e) => setSalesPeriod(e.target.value)}
            aria-label="Sales trend period"
            className="px-2 py-1 text-xs rounded-md border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">3 months</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Confirmed Wastage Loss', value: currencyFormatter.format(totalLeakage), note: `Recorded in the last ${salesPeriod} days`, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', route: '/dashboard/leakage', accent: true },
            { label: 'Products at Risk', value: String(productsAtRisk), note: 'Expiring or overstocked', icon: Package, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', route: '/owner/overstock', accent: false },
            { label: 'Expiring Soon', value: String(dashboardSummary?.expiring_soon_count ?? inventoryHealth.expiring_soon), note: 'Within 30 days', icon: Clock, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', route: '/dashboard/fefo', accent: false },
            { label: 'Overstock Risk', value: String(overstock?.total_items ?? inventoryHealth.overstock), note: 'Above policy threshold', icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', route: '/owner/overstock', accent: false },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.route}
                className={`group rounded-xl border bg-bg-elevated p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E] ${card.accent ? 'border-rose-200 dark:border-rose-900/40 border-2' : 'border-[#E5E7EB] dark:border-white/10'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#64748B] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-slate-100">{card.value}</div>
                  <div className="mt-0.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100">{card.label}</div>
                  <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-muted-fg">{card.note}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Primary analytics: recorded wastage loss over the selected period */}
      <section aria-label="Wastage loss over time">
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B] dark:text-muted-fg">Wastage Loss Over Time</h2>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-fg hover:text-rose-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Confirmed wastage value recorded per day over the selected period. Predicted risk is not included.</TooltipContent>
              </UITooltip>
            </div>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
              Period total: {currencyFormatter.format(totalLeakage)}
            </span>
          </div>
          {wastageTrendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#64748B] dark:text-muted-fg text-center px-4">
              No recorded wastage in the selected period, so loss over time cannot be charted.
            </div>
          ) : (
            <div className="h-56 w-full" role="img" aria-label="Wastage loss over time chart" style={{ minHeight: '224px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LazyAreaChart data={wastageTrendData}>
                  <ChartGradients />
                  <LazyCartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <LazyXAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} />
                  <LazyYAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} tickFormatter={(v) => formatPesoAxis(Number(v))} />
                  <LazyTooltip formatter={(value) => currencyFormatter.format(Number(value))} contentStyle={ChartTooltipStyle()} />
                  <LazyArea
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.danger}
                    fill="url(#chart-danger-fill)"
                    strokeWidth={2}
                    dot={{ r: 2.5, strokeWidth: 0, fill: CHART_COLORS.danger }}
                    activeDot={{ r: 4 }}
                    name="Confirmed wastage"
                    isAnimationActive={isAnimationActive}
                    animationDuration={animationDuration}
                    animationEasing={animationEasing}
                    animationBegin={CHART_DEFAULTS.animationBegin}
                  />
                </LazyAreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 text-[10px] text-[#64748B] dark:text-muted-fg">
            Historical, confirmed wastage only — aggregated over the last {salesPeriod} days.
          </div>
        </div>
      </section>

      {/* Supporting metrics — compact row, secondary to the risk KPIs above */}
      <section aria-label="Supporting business metrics">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] dark:text-muted-fg whitespace-nowrap">Supporting Metrics</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: 'Inventory Value', value: currencyFormatter.format(inventoryValue), note: 'Current stock at cost', icon: Package, route: '/owner/performance' },
            { label: 'Gross Profit', value: currencyFormatter.format(grossProfit), note: profitChange !== null ? `${profitUp ? '↑' : '↓'} ${Math.abs(profitChange).toFixed(1)}% vs last month` : 'This month', icon: PhilippinePeso, route: '/owner/reports' },
            { label: 'Sales', value: currencyFormatter.format(salesThisMonth), note: salesChange !== null ? `${salesUp ? '↑' : '↓'} ${Math.abs(salesChange).toFixed(1)}% vs last month` : 'This month', icon: TrendingUp, route: '/owner/reports' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.route}
                className="group flex items-center gap-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated px-3 py-2 shadow-sm transition-all hover:border-[#0F766E]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC] dark:bg-slate-800">
                  <Icon className="h-3.5 w-3.5 text-[#64748B] dark:text-muted-fg group-hover:text-[#0F766E]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#0F172A] dark:text-slate-100 truncate">{card.value}</div>
                  <div className="text-[10px] font-semibold text-[#64748B] dark:text-muted-fg truncate">{card.label} · {card.note}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Priority Action Queue */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Priority Action Queue</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
          {actionItems.length === 0 ? (
            actionQueueFailed ? (
              <div className="py-6 text-center text-sm text-rose-600 dark:text-rose-400">
                Priority actions could not be loaded because inventory data is unavailable. Nothing is confirmed healthy.
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-[#64748B] dark:text-muted-fg">
                No priority actions right now. Inventory looks healthy.
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-white/10 text-[#64748B] dark:text-muted-fg">
                    <th className="py-2 pr-3 font-semibold">Product</th>
                    <th className="py-2 pr-3 font-semibold">Risk</th>
                    <th className="py-2 pr-3 font-semibold">Details</th>
                    <th className="py-2 pr-3 font-semibold">Potential loss</th>
                    <th className="py-2 pr-3 font-semibold">Action</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-[#E5E7EB] dark:border-white/5">
                      <td className="py-2 pr-3 font-semibold text-[#0F172A] dark:text-slate-100">{item.product}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${severityStyle(item.severity)}`}>
                          {item.riskType} · {item.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#64748B] dark:text-muted-fg">{item.detail}</td>
                      <td className="py-2 pr-3 font-bold text-rose-600 dark:text-rose-400">
                        {item.potentialLoss !== null ? currencyFormatter.format(item.potentialLoss) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-[#64748B] dark:text-muted-fg">{item.action}</td>
                      <td className="py-2">
                        <Link to={item.route} className="text-[10px] font-semibold text-[#0F766E] hover:underline flex items-center gap-0.5">
                          Open <ChevronRight className="h-2.5 w-2.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Wastage Loss Breakdown + Inventory Health */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Wastage Loss Breakdown</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {/* Leakage by Category */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Wastage Loss by Category</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-fg hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Confirmed wastage value grouped by product category. Cause-level (expiry, damage, spoilage) breakdown is not stored in the current data model.</TooltipContent>
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
            {leakageChartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-[#64748B] dark:text-muted-fg text-center px-4">
                No wastage records in the selected period, so the loss breakdown cannot be populated.
              </div>
            ) : leakageChartData.length === 1 ? (
              <div className="flex h-52 flex-col justify-center gap-4 px-1">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{leakageChartData[0].name}</span>
                    <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{currencyFormatter.format(leakageChartData[0].amount)}</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full w-full rounded-full bg-[#0F766E]" />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[#64748B] dark:text-muted-fg">
                    <span>100% of recorded wastage in this period</span>
                    <span>{leakageChartData[0].quantity} units</span>
                  </div>
                </div>
                <p className="text-[10px] leading-4 text-[#64748B] dark:text-muted-fg">
                  Only one category recorded wastage, so a pie would repeat the same 100%.
                </p>
              </div>
            ) : (
              <div className="relative h-52 w-full" role="img" aria-label={`Wastage loss by category chart: ${leakageViewMode} view`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LazyPieChart>
                    <LazyPie
                      data={leakageChartData}
                      dataKey={leakageViewMode === 'value' ? 'amount' : leakageViewMode === 'quantity' ? 'quantity' : 'percentage'}
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                      label={false}
                      labelLine={false}
                    >
                      {leakageChartData.map((_entry, index) => (
                        <LazyCell key={`cell-${index}`} fill={LEAKAGE_COLORS[index % LEAKAGE_COLORS.length]} />
                      ))}
                    </LazyPie>
                    <LazyTooltip
                      formatter={(value) => leakageViewMode === 'value' ? currencyFormatter.format(Number(value)) : value}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <LazyLegend
                      verticalAlign="bottom"
                      height={34}
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: '10px', lineHeight: '16px' }}
                    />
                  </LazyPieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2 text-center">
                  <div className="text-sm font-bold tabular-nums text-[#0F172A] dark:text-slate-100">
                    {leakageViewMode === 'value' ? currencyFormatter.format(totalLeakage) : leakageViewMode === 'quantity' ? `${leakageChartData.reduce((sum, item) => sum + Number(item.quantity), 0)} units` : '100%'}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-[#64748B] dark:text-muted-fg">
                    {leakageViewMode === 'value' ? 'Total loss' : leakageViewMode === 'quantity' ? 'Total units' : 'Share'}
                  </div>
                </div>
              </div>
            )}

            {/* Top Wasted Products */}
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold text-[#64748B] dark:text-muted-fg uppercase tracking-wider">Top Wasted Products</h4>
                <Link to="/dashboard/leakage" className="text-[9px] font-semibold text-[#0F766E] hover:underline">View All</Link>
              </div>
              <div className="space-y-2">
                {(ownerAnalytics?.top_wasted_products ?? []).slice(0, 5).map((product) => {
                  const maxLoss = ownerAnalytics?.top_wasted_products?.[0]?.loss ?? 1;
                  const pct = maxLoss > 0 ? (Number(product.loss) / Number(maxLoss)) * 100 : 0;
                  return (
                    <div key={product.product_id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-100 truncate">{product.name}</span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{currencyFormatter.format(Number(product.loss))}</span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(ownerAnalytics?.top_wasted_products ?? []).length === 0 && (
                  <div className="text-[11px] text-[#64748B] dark:text-muted-fg">No wasted products in this period.</div>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Inventory Risk Breakdown</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-fg hover:text-sky-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Distinct products per inventory condition. Categories can overlap — a product may be both expiring and overstocked.</TooltipContent>
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
            <p className="mt-2 text-[10px] text-[#64748B] dark:text-muted-fg">
              Categories are not mutually exclusive; a product can count in more than one risk bucket.
            </p>
          </div>
        </div>
      </section>

      {/* Forecasted Inventory Risk */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Forecasted Inventory Risk</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] dark:text-muted-fg">Confirmed wastage (this month)</div>
            <div className="mt-1 text-xl font-bold text-[#0F172A] dark:text-slate-100">{currencyFormatter.format(wastageThisMonth)}</div>
            <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-muted-fg">Historical recorded losses</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] dark:text-muted-fg">Current inventory at risk</div>
            <div className="mt-1 text-xl font-bold text-[#0F172A] dark:text-slate-100">{currencyFormatter.format(currentInventoryAtRisk)}</div>
            <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-muted-fg">Overstock exposure</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] dark:text-muted-fg">Forecasted potential loss</div>
            <div className="mt-1 text-xl font-bold text-[#0F172A] dark:text-slate-100">
              {lossRiskFailed ? 'Unavailable' : currencyFormatter.format(forecastedPotentialLoss)}
            </div>
            <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-muted-fg">
              {lossRiskFailed ? 'Loss-risk service unavailable' : 'Model-based estimate, not a confirmed loss'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Forecast confidence</h3>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
                {forecastConfidence !== null ? `${Number(forecastConfidence).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-muted-fg">
              {forecastOverview?.total_products ? `${forecastOverview.total_products} products analyzed by ARIMA/SARIMAX.` : 'No forecast data available.'}
            </p>
            <div className="mt-3 space-y-1.5">
              {(forecastOverview?.top_risks ?? []).slice(0, 5).map((risk) => (
                <div key={risk.product_id} className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100 truncate">{risk.product_name}</span>
                  <span className={`text-[9px] font-bold ${risk.overstock_risk === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {risk.overstock_risk} risk · {risk.predicted_demand} units
                  </span>
                </div>
              ))}
              {(forecastOverview?.top_risks ?? []).length === 0 && (
                <div className="text-[11px] text-[#64748B] dark:text-muted-fg">No forecast risk items.</div>
              )}
            </div>
            <Link to="/dashboard/predictive" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
              Full Predictive Analytics <ChevronRight className="h-2.5 w-2.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 mb-2">Risk distribution (model)</h3>
            {lossRiskSummary ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{lossRiskSummary.high_risk}</div>
                  <div className="text-[9px] font-semibold uppercase text-[#64748B] dark:text-muted-fg">High</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{lossRiskSummary.medium_risk}</div>
                  <div className="text-[9px] font-semibold uppercase text-[#64748B] dark:text-muted-fg">Medium</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400">{lossRiskSummary.low_risk}</div>
                  <div className="text-[9px] font-semibold uppercase text-[#64748B] dark:text-muted-fg">Low</div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[#64748B] dark:text-muted-fg">
                {lossRiskFailed ? 'Loss-risk scoring unavailable.' : 'No risk distribution available.'}
              </div>
            )}
            <div className="mt-3 text-[10px] text-[#64748B] dark:text-muted-fg">
              {lossRiskItemsResponse?.generated_at ? `Scored ${new Date(lossRiskItemsResponse.generated_at).toLocaleString()}` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Product-level and revenue analysis */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Product & Revenue Analysis</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Sales & Revenue Trend</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-fg hover:text-emerald-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Daily revenue from completed POS transactions</TooltipContent>
                </UITooltip>
              </div>
            </div>
            <div className="h-48 w-full" role="img" aria-label="Sales and revenue trend chart" style={{ minHeight: '192px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LazyAreaChart data={salesTrendData}>
                  <ChartGradients />
                  <LazyCartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <LazyXAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} />
                  <LazyYAxis tick={{ fontSize: 11, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} tickFormatter={(v) => formatPesoAxis(Number(v))} />
                  <LazyTooltip formatter={(value) => currencyFormatter.format(Number(value))} contentStyle={ChartTooltipStyle()} />
                  <LazyArea
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.primary}
                    fill="url(#chart-primary-fill)"
                    strokeWidth={2}
                    name="Revenue"
                    isAnimationActive={isAnimationActive}
                    animationDuration={animationDuration}
                    animationEasing={animationEasing}
                    animationBegin={CHART_DEFAULTS.animationBegin}
                  />
                </LazyAreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Loss by product — confirmed wastage ranked by financial impact */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Loss by Product</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-fg hover:text-rose-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Products with the largest confirmed wastage loss in the selected period</TooltipContent>
                </UITooltip>
              </div>
              <Link to="/dashboard/leakage" className="flex items-center gap-1 text-[10px] font-semibold text-[#0F766E] hover:underline">
                Details <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </div>
            {(ownerAnalytics?.top_wasted_products ?? []).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-[#64748B] dark:text-muted-fg text-center px-4">
                No confirmed wastage recorded for any product in this period.
              </div>
            ) : (
              <div className="h-48 w-full" role="img" aria-label="Loss by product chart" style={{ minHeight: '192px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LazyBarChart
                    data={(ownerAnalytics?.top_wasted_products ?? []).slice(0, 6).map((item) => ({
                      name: item.name,
                      loss: Number(item.loss),
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barSize={24}
                    barCategoryGap="28%"
                  >
                    <LazyCartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
                    <LazyXAxis type="number" tick={{ fontSize: 10, fill: CHART_COLORS.text }} stroke={CHART_COLORS.axis} tickFormatter={(v) => formatPesoAxis(Number(v))} />
                    <LazyYAxis
                      dataKey="name"
                      type="category"
                      width={124}
                      tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                      stroke={CHART_COLORS.axis}
                      tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}…` : value)}
                    />
                    <LazyTooltip formatter={(value) => currencyFormatter.format(Number(value))} contentStyle={ChartTooltipStyle()} />
                    <LazyBar dataKey="loss" name="Confirmed loss" radius={[0, 6, 6, 0]} fill={CHART_COLORS.danger} />
                  </LazyBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sales & Profit Context */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 whitespace-nowrap">Sales & Profit Context</h2>
          <div className="flex-1 h-px bg-[#E5E7EB] dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Revenue by Payment Method</h3>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-fg hover:text-[#0F766E] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>Revenue share from completed POS transactions</TooltipContent>
                </UITooltip>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {currencyFormatter.format(paymentRevenue)} total
              </span>
            </div>
            {paymentBreakdown.length > 0 ? (
              <div className="h-40 w-full" role="img" aria-label="Revenue by payment method chart" style={{ minHeight: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LazyBarChart data={paymentBreakdown} layout="vertical">
                    <LazyCartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <LazyXAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" tickFormatter={(v) => formatPesoAxis(Number(v))} />
                    <LazyYAxis dataKey="method" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" width={84} />
                    <LazyTooltip
                      formatter={(value) => currencyFormatter.format(Number(value))}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <LazyBar dataKey="revenue" barSize={18} radius={[0, 6, 6, 0]} fill="#0F766E" />
                  </LazyBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-[#64748B] dark:text-muted-fg">
                No payment data available
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-4 shadow-sm">
            <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 mb-2">System Administration</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {adminStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Link
                    key={stat.label}
                    to={stat.link}
                    className="group rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-bg-elevated p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8FAFC] dark:bg-slate-800 mb-2 transition-colors group-hover:bg-[#0F766E]/10">
                      <Icon className="h-4 w-4 text-[#64748B] dark:text-muted-fg transition-colors group-hover:text-[#0F766E]" />
                    </div>
                    <div className="text-lg font-bold text-[#0F172A] dark:text-slate-100">{stat.value}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B] dark:text-muted-fg">{stat.label}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
