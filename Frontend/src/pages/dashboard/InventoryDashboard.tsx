import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Info,
  Package,
  PackageCheck,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { cashierProducts } from '../../utils/cashierData';
import { inventoryAnalytics } from '../../services/api';

interface InventoryStats {
  lowStockItems: number;
  expiringSoon: number;
  todayStockMovements: number;
  pendingWastage: number;
  criticalFefoBatches: number;
}

const EXPIRY_WINDOW_DAYS = 7;

const operationalProducts = [
  ...cashierProducts,
  {
    product_id: 'P-1006',
    category_id: 'CAT-PHARMA',
    supplier_id: 'SUP-RITEMED',
    barcode: '4806507830046',
    product_name: 'RiteMed Paracetamol',
    cost_price: 9,
    selling_price: 14,
    reorder_level: 25,
    expiration_date: '2026-07-18',
    current_stock: 18,
  },
  {
    product_id: 'P-1007',
    category_id: 'CAT-PHARMA',
    supplier_id: 'SUP-UNILAB',
    barcode: '4806507830053',
    product_name: 'Ascof Lagundi Syrup',
    cost_price: 82,
    selling_price: 120,
    reorder_level: 15,
    expiration_date: '2026-07-20',
    current_stock: 14,
  },
  {
    product_id: 'P-1008',
    category_id: 'CAT-GROCERY',
    supplier_id: 'SUP-MAGNOLIA',
    barcode: '4806507830060',
    product_name: 'Magnolia Fresh Milk',
    cost_price: 58,
    selling_price: 72,
    reorder_level: 18,
    expiration_date: '2026-07-16',
    current_stock: 9,
  },
];

const recentActivity = [
  {
    time: '10:20 AM',
    Icon: Package,
    title: 'Recorded Wastage',
    detail: 'Expired Bread',
    dotColor: 'bg-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    time: '10:35 AM',
    Icon: ArrowUpRight,
    title: 'Stock Updated',
    detail: 'Paracetamol +20',
    dotColor: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    time: '10:45 AM',
    Icon: CheckCircle,
    title: 'Recommendation Applied',
    detail: 'Promo activated',
    dotColor: 'bg-green-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
  },
  {
    time: '11:00 AM',
    Icon: AlertTriangle,
    title: 'Low Stock Alert',
    detail: 'Nescafe dropped below reorder',
    dotColor: 'bg-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    time: '11:15 AM',
    Icon: PackageCheck,
    title: 'FEFO Directive Applied',
    detail: 'Batch BTC-004',
    dotColor: 'bg-green-500',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
  },
];

const TODAY = new Date();

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

export function InventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    lowStockItems: 0,
    expiringSoon: 0,
    todayStockMovements: 0,
    pendingWastage: 0,
    criticalFefoBatches: 0,
  });
  const [loading, setLoading] = useState(true);

  const lowestStockChart = useMemo(
    () =>
      operationalProducts
        .map((product) => ({
          name: product.product_name.replace(' ', '\n'),
          stock: product.current_stock,
          reorder: product.reorder_level,
        }))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5),
    []
  );

  const expiringItems = useMemo(
    () =>
      operationalProducts
        .map((product) => ({
          ...product,
          daysToExpiry: daysUntil(product.expiration_date),
        }))
        .filter((product) => product.daysToExpiry >= 0 && product.daysToExpiry <= 14)
        .sort((a, b) => a.daysToExpiry - b.daysToExpiry),
    []
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryAnalytics.dashboardSummary();
        setStats({
          lowStockItems: data.low_stock_count,
          expiringSoon: data.expiring_soon_count,
          todayStockMovements: data.today_movements,
          pendingWastage: data.pending_wastage_count,
          criticalFefoBatches: data.critical_fefo_count,
        });
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const kpiCards = [
    {
      label: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      description: 'At or below reorder level',
      alert: stats.lowStockItems > 0,
      to: '/inventory/manage',
    },
    {
      label: 'Items Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      iconBg: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-600 dark:text-red-400',
      description: 'Within 7 days',
      alert: stats.expiringSoon > 0,
      to: '/inventory/fefo',
    },
    {
      label: "Today's Stock Movements",
      value: stats.todayStockMovements,
      icon: Activity,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      description: 'Stock-in and stock-out entries',
      alert: false,
      to: '/inventory/manage',
    },
    {
      label: 'Pending Wastage',
      value: stats.pendingWastage,
      icon: Package,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      description: 'Recorded this week',
      alert: stats.pendingWastage > 0,
      to: '/inventory/wastage',
    },
    {
      label: 'FEFO Expiring (7d)',
      value: stats.criticalFefoBatches,
      icon: PackageCheck,
      iconBg: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-600 dark:text-red-400',
      description: 'Expire within 7 days',
      alert: stats.criticalFefoBatches > 0,
      to: '/inventory/fefo',
    },
    ];

  const quickActions = [
    {
      title: 'Stock In',
      description: 'Add new inventory',
      to: '/inventory/stock-in',
      icon: Package,
    },
    {
      title: 'Stock Out',
      description: 'Record withdrawals',
      to: '/inventory/stock-out',
      icon: Activity,
    },
    {
      title: 'Record Wastage',
      description: 'Log damaged/expired items',
      to: '/inventory/wastage',
      icon: AlertTriangle,
    },
    {
      title: 'FEFO Tracking',
      description: 'Monitor expiration dates',
      to: '/inventory/fefo',
      icon: Clock,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-1">
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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

  const todayLabel = TODAY.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-1">

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
              Inventory Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B] dark:text-slate-400 dark:text-slate-500">
              Real-time overview of your stock health and alerts
            </p>
          </div>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="mt-1 h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              Real-time inventory overview for operational staff
            </TooltipContent>
          </UITooltip>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-[#64748B] dark:text-slate-400 dark:text-slate-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E]" />
          {todayLabel}
        </span>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group relative flex flex-col justify-between rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-[#0F766E]"
            >
              {/* Top row: icon + alert badge */}
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                {card.alert && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Requires attention
                  </span>
                )}
              </div>

              {/* Count + Label + Description */}
              <div className="mt-4">
                <div className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-slate-100">
                  {card.value}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#0F172A] dark:text-slate-100">{card.label}</div>
                <div className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">{card.description}</div>
              </div>

              {/* View Details link */}
              <div className="mt-4 flex justify-end">
                <Link
                  to={card.to}
                  className="text-xs font-medium text-[#0F766E] hover:underline flex items-center gap-0.5"
                >
                  View Details
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts + Expiration Watch */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Bar Chart */}
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                Lowest Stock vs Reorder Level
              </h2>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-amber-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white max-w-xs">
                  Products closest to or below reorder level
                </TooltipContent>
              </UITooltip>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {stats.lowStockItems} low stock
            </span>
          </div>
          {/* Legend */}
          <div className="mb-3 flex items-center gap-4 text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#F59E0B]" />
              Current Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E5E7EB]" />
              Reorder Level
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lowestStockChart} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="stock" name="Stock" radius={[6, 6, 0, 0]} fill="#F59E0B" />
                <Bar dataKey="reorder" name="Reorder" radius={[6, 6, 0, 0]} fill="#E5E7EB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiration Watch */}
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Expiration Watch</h2>
            <Clock className="h-5 w-5 text-[#64748B] dark:text-slate-400 dark:text-slate-500" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {expiringItems.length === 0 && (
              <p className="text-sm text-[#64748B] dark:text-slate-400 dark:text-slate-500 text-center py-8">No items expiring soon.</p>
            )}
            {expiringItems.map((item) => {
              const dayBadgeCls =
                item.daysToExpiry <= 7
                  ? 'bg-red-50 text-red-700'
                  : item.daysToExpiry <= 14
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700';
              const estimatedLoss = item.current_stock * item.cost_price;
              const priority =
                item.daysToExpiry <= 7 ? 'Critical' : item.daysToExpiry <= 14 ? 'Warning' : 'Monitor';
              const priorityColor =
                item.daysToExpiry <= 7
                  ? 'text-red-600'
                  : item.daysToExpiry <= 14
                  ? 'text-amber-600'
                  : 'text-green-700';

              return (
                <Link
                  key={item.product_id}
                  to="/inventory/fefo"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-950 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0F172A] dark:text-slate-100">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">
                      Qty: {item.current_stock}&nbsp;&middot;&nbsp;Est. Loss: &#8369;{estimatedLoss.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${dayBadgeCls}`}>
                      {item.daysToExpiry}d
                    </span>
                    <span className={`text-[10px] font-semibold ${priorityColor}`}>{priority}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Recent Activity</h2>
          <span className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">Today</span>
        </div>
        <div className="divide-y divide-[#F1F5F9] dark:divide-white/5">
          {recentActivity.map((entry, i) => {
            const Icon = entry.Icon;
            return (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${entry.iconBg}`}>
                  <Icon className={`h-4 w-4 ${entry.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    {entry.title}&nbsp;
                    <span className="font-normal text-[#64748B] dark:text-slate-400 dark:text-slate-500">
                      &middot;&nbsp;{entry.detail}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${entry.dotColor}`} />
                  {entry.time}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-base font-bold text-[#0F172A] dark:text-slate-100">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#0F766E]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-white/10">
                    <Icon className="h-4 w-4 text-[#0F766E]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{action.title}</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500">{action.description}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#E5E7EB] dark:text-white/20 transition-all group-hover:text-[#0F766E] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
