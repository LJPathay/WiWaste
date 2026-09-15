import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Info,
  Package,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { inventoryAnalytics, type ApiDashboardSummary } from '../../services/api';

const TODAY = new Date();

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

const movementTypeBadgeMap: Record<string, string> = {
  'Stock In':   'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/30 dark:text-green-400',
  'Stock Out':  'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400',
  'Sale':       'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400',
  'Wastage':    'bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400',
  'Return':     'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400',
  'Adjustment': 'bg-gray-50 text-gray-700 border border-gray-100 dark:bg-gray-950/30 dark:text-gray-400',
  'Damaged':    'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-400',
  'Expired':    'bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-950/30 dark:text-slate-400',
};

const chartTooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
  fontSize: '12px',
};

// Mock chart data — replace with real API when backend provides stock_movement_chart
const mockMovementChart = [
  { date: 'Mon', stock_in: 12, stock_out: 8, wastage: 2 },
  { date: 'Tue', stock_in: 18, stock_out: 14, wastage: 1 },
  { date: 'Wed', stock_in: 8, stock_out: 11, wastage: 3 },
  { date: 'Thu', stock_in: 22, stock_out: 9, wastage: 0 },
  { date: 'Fri', stock_in: 15, stock_out: 13, wastage: 2 },
  { date: 'Sat', stock_in: 20, stock_out: 16, wastage: 1 },
  { date: 'Sun', stock_in: 5, stock_out: 3, wastage: 0 },
];

const mockWastageTrend = [
  { date: 'Week 1', value: 1200 },
  { date: 'Week 2', value: 890 },
  { date: 'Week 3', value: 1450 },
  { date: 'Week 4', value: 620 },
];

const mockTopWasted = [
  { product_name: 'Fresh Milk', total_loss: 2400, quantity: 40 },
  { product_name: 'Bread Loaf', total_loss: 1800, quantity: 60 },
  { product_name: 'Yogurt Drink', total_loss: 950, quantity: 19 },
];

const mockRecentMovements = [
  { movement_id: 1, product_name: 'Paracetamol', type: 'Stock In', quantity: 50, recorded_by: 'Admin', date: '2026-09-10' },
  { movement_id: 2, product_name: 'Fresh Milk', type: 'Sale', quantity: -3, recorded_by: 'Cashier', date: '2026-09-10' },
  { movement_id: 3, product_name: 'Bread Loaf', type: 'Wastage', quantity: -2, recorded_by: 'Staff', date: '2026-09-10' },
  { movement_id: 4, product_name: 'Ibuprofen', type: 'Stock Out', quantity: -10, recorded_by: 'Admin', date: '2026-09-09' },
  { movement_id: 5, product_name: 'Yogurt Drink', type: 'Return', quantity: 1, recorded_by: 'Cashier', date: '2026-09-09' },
];

export function InventoryDashboard() {
  const [stats, setStats] = useState<ApiDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [movementPeriod, setMovementPeriod] = useState('7');
  const [wastagePeriod, setWastagePeriod] = useState('30');
  const [wastageView, setWastageView] = useState<'value' | 'quantity'>('value');

  useEffect(() => {
    let cancelled = false;
    inventoryAnalytics.dashboardSummary()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        console.error('Failed to fetch inventory stats:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const todayLabel = TODAY.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const kpiCards = useMemo(() => [
    {
      label: 'Low Stock',
      value: stats?.low_stock_count ?? 0,
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      description: 'Products below reorder level',
      alert: (stats?.low_stock_count ?? 0) > 0,
      to: '/inventory/manage',
    },
    {
      label: 'Expiring Soon',
      value: stats?.expiring_soon_count ?? 0,
      icon: Clock,
      iconBg: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-600 dark:text-red-400',
      description: 'Products within 30 days',
      alert: (stats?.expiring_soon_count ?? 0) > 0,
      to: '/inventory/fefo',
    },
    {
      label: "Today's Movements",
      value: stats?.today_movements ?? 0,
      icon: Activity,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      description: `${stats?.today_sales_count ?? 0} sales · ${stats?.today_wastage_count ?? 0} wastage · ${stats?.today_returns_count ?? 0} returns`,
      alert: false,
      to: '/inventory/stock-movements',
    },
    {
      label: 'Inventory Value',
      value: `₱${(stats?.total_stock_value ?? 0).toLocaleString()}`,
      icon: Package,
      iconBg: 'bg-teal-50 dark:bg-teal-950/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      description: 'Total stock value at cost',
      alert: false,
      to: '/inventory/manage',
    },
  ], [stats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-700 xl:col-span-2" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Section 1: Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
            Inventory Dashboard
          </h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              Real-time inventory overview for operational staff
            </TooltipContent>
          </UITooltip>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-[#64748B] dark:text-slate-400 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E]" />
          {todayLabel}
        </span>
      </div>

      {/* ── Section 2: KPI Summary Cards ── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group relative flex flex-col justify-between rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                {card.alert && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                    Attention
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-slate-100">
                  {card.value}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100">{card.label}</div>
                <div className="mt-0.5 text-[10px] text-[#64748B] dark:text-slate-400">{card.description}</div>
              </div>
              <div className="mt-2 flex justify-end">
                <Link
                  to={card.to}
                  className="text-[10px] font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                >
                  View Details
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Section 3: Stock Movement Chart + Expiration Risk ── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* Stock Movement Chart */}
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
              Stock Movement
            </h2>
            <select
              value={movementPeriod}
              onChange={(e) => setMovementPeriod(e.target.value)}
              className="px-2 py-1 text-[10px] rounded-md border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
          <div className="mb-2 flex items-center gap-3 text-[10px] text-[#64748B] dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[#0F766E]" />
              Stock In
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[#3B82F6]" />
              Stock Out
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[#EF4444]" />
              Wastage
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockMovementChart}>
                <defs>
                  <linearGradient id="stockInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stockOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wastageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#0F766E" fill="url(#stockInGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#3B82F6" fill="url(#stockOutGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="wastage" name="Wastage" stroke="#EF4444" fill="url(#wastageGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiration Risk */}
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-bold text-[#0F172A] dark:text-slate-100">Expiration Risk</h2>
          <div className="space-y-1.5">
            {[
              { label: 'Expiring Soon', count: stats?.expiring_soon_count ?? 0, color: 'bg-red-400', severity: 'Critical' },
              { label: 'Low Stock', count: stats?.low_stock_count ?? 0, color: 'bg-amber-500', severity: 'Warning' },
              { label: 'FEFO Critical', count: stats?.critical_fefo_count ?? 0, color: 'bg-amber-400', severity: 'Warning' },
            ].map((item) => (
              <Link
                key={item.label}
                to="/inventory/fefo"
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors"
              >
                <span className={`inline-block h-2 w-2 rounded-sm ${item.color}`} />
                <span className="flex-1 text-[11px] font-semibold text-[#0F172A] dark:text-slate-100">{item.label}</span>
                <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">{item.count}</span>
                <span className={`text-[9px] font-semibold ${
                  item.severity === 'Critical' ? 'text-red-600' : 'text-amber-600'
                }`}>{item.severity}</span>
              </Link>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-white/10">
            <h3 className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2">
              Today's Activity
            </h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-slate-400">Sales</span>
                <span className="font-bold text-[#0F172A] dark:text-slate-100">{stats?.today_sales_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-slate-400">Wastage</span>
                <span className="font-bold text-[#0F172A] dark:text-slate-100">{stats?.today_wastage_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-slate-400">Returns</span>
                <span className="font-bold text-[#0F172A] dark:text-slate-100">{stats?.today_returns_count ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Wastage Analytics (2-col) ── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Wastage Trend */}
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Wastage Trend</h2>
            <select
              value={wastagePeriod}
              onChange={(e) => setWastagePeriod(e.target.value)}
              className="px-2 py-1 text-[10px] rounded-md border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">3 months</option>
            </select>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockWastageTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#E5E7EB" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="value" name="Wastage" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Wasted Products */}
        <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Top Wasted Products</h2>
            <div className="flex gap-0.5">
              <button
                onClick={() => setWastageView('value')}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                  wastageView === 'value'
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => setWastageView('quantity')}
                className={`px-2 py-1 text-[10px] font-semibold rounded ${
                  wastageView === 'quantity'
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Quantity
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {mockTopWasted.map((product) => {
              const maxVal = mockTopWasted[0]?.total_loss ?? 1;
              const pct = (product.total_loss / maxVal) * 100;
              return (
                <div key={product.product_name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-100">{product.product_name}</span>
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      {wastageView === 'value'
                        ? `₱${product.total_loss.toLocaleString()}`
                        : `${product.quantity} units`}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            to="/inventory/reports"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
          >
            View Report <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── Section 5: Low Stock Alerts ── */}
      {(stats?.low_stock_items?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Low Stock / Reorder Alerts</h2>
            <span className="text-xs text-[#64748B] dark:text-slate-400">{stats?.low_stock_items?.length} products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-white/10">
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Product</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Category</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Current</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Reorder</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wider text-[#64748B] dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {stats?.low_stock_items?.map((product) => (
                  <tr key={product.product_id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-slate-100">{product.product_name}</td>
                    <td className="px-4 py-3 text-[#64748B] dark:text-slate-400">{product.category}</td>
                    <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400">{product.current_stock}</td>
                    <td className="px-4 py-3 text-[#64748B] dark:text-slate-400">{product.reorder_level}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Reorder
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to="/inventory/manage" className="text-[10px] font-semibold text-[#0F766E] hover:underline">View Inventory</Link>
                        <Link to="/inventory/stock-receiving" className="text-[10px] font-semibold text-[#0F766E] hover:underline">Create Receiving</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
