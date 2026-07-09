import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  TrendingUp,
  ShieldAlert,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface ManagerStats {
  forecastAccuracy: number;
  monthlyLeakage: number;
  profitMargin: number;
  riskScore: number;
  totalSales: number;
  recommendationsGenerated: number;
}

export function ManagerDashboard() {
  const [stats, setStats] = useState<ManagerStats>({
    forecastAccuracy: 0,
    monthlyLeakage: 0,
    profitMargin: 0,
    riskScore: 0,
    totalSales: 0,
    recommendationsGenerated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch manager stats from backend
    const fetchStats = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/manager/stats');
        // const data = await response.json();
        
        // Mock data for now
        setStats({
          forecastAccuracy: 87,
          monthlyLeakage: 12500,
          profitMargin: 23.5,
          riskScore: 42,
          totalSales: 345000,
          recommendationsGenerated: 28,
        });
      } catch (error) {
        console.error('Failed to fetch manager stats:', error);
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
      label: 'Forecast Accuracy',
      value: `${stats.forecastAccuracy}%`,
      icon: TrendingUp,
      color: 'from-sky-500 to-cyan-400',
      bgColor: 'bg-sky-50 dark:bg-sky-500/10',
      textColor: 'text-sky-600 dark:text-sky-400',
      description: 'ARIMA model performance',
      trend: '+2.3%',
      positive: true,
    },
    {
      label: 'Monthly Leakage',
      value: currencyFormatter.format(stats.monthlyLeakage),
      icon: ShieldAlert,
      color: 'from-rose-500 to-orange-400',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
      textColor: 'text-rose-600 dark:text-rose-400',
      description: 'XGBoost detected losses',
      trend: '-1.1%',
      positive: true,
      alert: stats.monthlyLeakage > 10000,
    },
    {
      label: 'Profit Margin',
      value: `${stats.profitMargin}%`,
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      description: 'After wastage adjustment',
      trend: '+0.8%',
      positive: true,
    },
    {
      label: 'Risk Score',
      value: stats.riskScore,
      icon: BarChart3,
      color: 'from-violet-500 to-indigo-400',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      textColor: 'text-violet-600 dark:text-violet-400',
      description: 'Overall inventory risk',
      trend: '-5%',
      positive: true,
      alert: stats.riskScore > 50,
    },
  ];

  const analyticsModules = [
    {
      title: 'Demand Forecasts',
      description: 'ARIMA-powered demand predictions',
      to: '/manager/forecasts',
      icon: TrendingUp,
    },
    {
      title: 'Loss Trends',
      description: 'XGBoost profit leakage analysis',
      to: '/manager/loss-trends',
      icon: ShieldAlert,
    },
    {
      title: 'Replenishment',
      description: 'Genetic Algorithm optimization',
      to: '/manager/replenishment',
      icon: BarChart3,
    },
    {
      title: 'Executive Reports',
      description: 'High-level business insights',
      to: '/manager/reports',
      icon: DollarSign,
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manager Dashboard</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Strategic analytics and decision support for business owners
          </TooltipContent>
        </UITooltip>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-3xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-white/80 dark:bg-white/5 dark:backdrop-blur-xl dark:hover:bg-white/8 ${
                card.alert ? 'ring-2 ring-rose-400 border-transparent' : 'border-white/60 dark:border-white/10'
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{card.description}</span>
                    <span
                      className={`text-xs font-semibold ${
                        card.positive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {card.trend}
                    </span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 text-xl ${card.textColor}`} />
                </div>
              </div>
              {card.alert && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3 py-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[11px] font-medium leading-4 text-rose-700 dark:text-rose-300">
                    High leakage detected - review Loss Trends
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Sales Summary */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Total Monthly Sales</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Revenue for current period</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#0b1c30] dark:text-slate-100">
              {currencyFormatter.format(stats.totalSales)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">+12.5% vs last month</div>
          </div>
        </div>
      </section>

      {/* Analytics Modules */}
      <section>
        <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100 mb-4">Analytics Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analyticsModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.title}
                to={module.to}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-slate-300 transition-all group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#0b1c30] dark:text-slate-100">{module.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recommendations Summary */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Active Recommendations</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Genetic Algorithm generated this week</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#0b1c30] dark:text-slate-100">
              {stats.recommendationsGenerated}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Optimization suggestions</div>
          </div>
        </div>
      </section>
    </div>
  );
}
