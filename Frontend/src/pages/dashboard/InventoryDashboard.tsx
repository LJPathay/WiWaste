import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface InventoryStats {
  totalProducts: number;
  lowStockItems: number;
  overstockItems: number;
  expiringSoon: number;
  totalStockValue: number;
}

export function InventoryDashboard() {
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    lowStockItems: 0,
    overstockItems: 0,
    expiringSoon: 0,
    totalStockValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch inventory stats from backend
    const fetchStats = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/inventory/stats');
        // const data = await response.json();
        
        // Mock data for now
        setStats({
          totalProducts: 156,
          lowStockItems: 12,
          overstockItems: 8,
          expiringSoon: 5,
          totalStockValue: 245000,
        });
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  });

  const kpiCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Active inventory items',
    },
    {
      label: 'Low Stock Alerts',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'from-orange-500 to-amber-400',
      bgColor: 'bg-orange-50 dark:bg-orange-500/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      description: 'Items below reorder level',
      alert: stats.lowStockItems > 0,
    },
    {
      label: 'Overstock Items',
      value: stats.overstockItems,
      icon: TrendingDown,
      color: 'from-purple-500 to-violet-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      description: 'Excess inventory',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: Clock,
      color: 'from-red-500 to-rose-400',
      bgColor: 'bg-red-50 dark:bg-red-500/10',
      textColor: 'text-red-600 dark:text-red-400',
      description: 'Within 7 days',
      alert: stats.expiringSoon > 0,
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
      description: 'Record sales/usage',
      to: '/inventory/stock-out',
      icon: TrendingDown,
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
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
            </div>
          );
        })}
      </section>

      {/* Stock Value Summary */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Total Stock Value</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current inventory valuation</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#0b1c30] dark:text-slate-100">
              {currencyFormatter.format(stats.totalStockValue)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">As of today</div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
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
