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
import { cashierProducts, initialStockMovements } from '../../utils/cashierData';

interface InventoryStats {
  lowStockItems: number;
  expiringSoon: number;
  todayStockMovements: number;
  pendingWastage: number;
  newRecommendations: number;
  criticalFefoBatches: number;
}

const TODAY = new Date('2026-07-14T00:00:00');
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

const pendingWastageRecords = [
  { id: 'WAS-20260714-001', product_id: 'P-1008', date_recorded: '2026-07-14', status: 'pending' },
  { id: 'WAS-20260713-004', product_id: 'P-1005', date_recorded: '2026-07-13', status: 'pending' },
];

const unviewedRecommendations = [
  { id: 'REC-001', product_id: 'P-1008', status: 'new' },
  { id: 'REC-002', product_id: 'P-1006', status: 'new' },
  { id: 'REC-003', product_id: 'P-1007', status: 'new' },
];

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
    newRecommendations: 0,
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
        const lowStockItems = operationalProducts.filter(
          product => product.current_stock <= product.reorder_level
        ).length;
        const expiringSoon = operationalProducts.filter((product) => {
          const days = daysUntil(product.expiration_date);
          return days >= 0 && days <= EXPIRY_WINDOW_DAYS;
        }).length;
        const todayStockMovements = initialStockMovements.filter(
          movement => movement.movement_date.startsWith('2026-07-14')
        ).length;

        setStats({
          lowStockItems,
          expiringSoon,
          todayStockMovements,
          pendingWastage: pendingWastageRecords.length,
          newRecommendations: unviewedRecommendations.length,
          criticalFefoBatches: expiringSoon,
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
      bgColor: 'bg-orange-50 dark:bg-orange-500/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      description: 'At or below reorder level',
      alert: stats.lowStockItems > 0,
      to: '/inventory/manage',
    },
    {
      label: 'Items Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      bgColor: 'bg-red-50 dark:bg-red-500/10',
      textColor: 'text-red-600 dark:text-red-400',
      description: 'Within 7 days',
      alert: stats.expiringSoon > 0,
      to: '/inventory/fefo',
    },
    {
      label: "Today's Stock Movements",
      value: stats.todayStockMovements,
      icon: Activity,
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Stock-in and stock-out entries',
      to: '/inventory/manage',
    },
    {
      label: 'Pending Wastage',
      value: stats.pendingWastage,
      icon: Package,
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      description: 'Recorded this week',
      alert: stats.pendingWastage > 0,
      to: '/inventory/wastage',
    },
    {
      label: 'New Recommendations',
      value: stats.newRecommendations,
      icon: CheckCircle,
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      description: 'Not yet viewed',
      to: '/inventory/recommendations',
    },
    {
      label: 'Critical FEFO Batches',
      value: stats.criticalFefoBatches,
      icon: PackageCheck,
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      textColor: 'text-violet-600 dark:text-violet-400',
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
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory Dashboard</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Real-time inventory overview for operational staff
          </TooltipContent>
        </UITooltip>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className={`relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 dark:bg-white/5 dark:backdrop-blur-xl dark:hover:bg-white/8 ${
                card.alert ? 'ring-2 ring-orange-400 border-transparent' : 'border-white/60 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30] dark:text-slate-100">
                    {card.value}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.description}</div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 text-xl ${card.textColor}`} />
                </div>
              </div>
              {card.alert && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 px-3 py-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[11px] font-medium leading-4 text-orange-700 dark:text-orange-300">
                    Requires immediate attention
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Lowest Stock vs Reorder Level</h2>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                  Products closest to or below reorder level
                </TooltipContent>
              </UITooltip>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
              {stats.lowStockItems} low stock
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lowestStockChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={0} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="stock" radius={[12, 12, 0, 0]} fill="#f97316" />
                <Bar dataKey="reorder" radius={[12, 12, 0, 0]} fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Expiration Watch</h2>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {expiringItems.map(item => (
              <Link
                key={item.product_id}
                to="/inventory/fefo"
                className="block rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.product_name}</span>
                  <span className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">{item.daysToExpiry}d</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.expiration_date}</span>
                  <span className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{item.current_stock} units</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-slate-300 transition-all group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">{action.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
