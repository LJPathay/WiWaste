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
} from 'recharts';
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  LayoutDashboard,
  PackageCheck,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { retailExamples } from '../../utils/mockAuthAndFeatures';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function DashboardOverview() {
  const { data, loading } = useDashboardData();

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
      glow: 'shadow-sky-200 dark:shadow-sky-900/40',
      change: '+2.3%',
      up: true,
    },
    {
      label: 'Monthly Leakage',
      value: currencyFormatter.format(totalLeakage),
      note: `${topLeakage.category} is the largest driver`,
      icon: ShieldAlert,
      accent: 'from-rose-500 to-orange-400',
      glow: 'shadow-rose-200 dark:shadow-rose-900/40',
      change: '-1.1%',
      up: false,
    },
    {
      label: 'Recoverable Credits',
      value: currencyFormatter.format(totalCredits),
      note: `${expiredVendorWindows} return window needs attention`,
      icon: CircleDollarSign,
      accent: 'from-emerald-500 to-teal-400',
      glow: 'shadow-emerald-200 dark:shadow-emerald-900/40',
      change: '+5.8%',
      up: true,
    },
    {
      label: 'Critical FEFO Batches',
      value: criticalBatches,
      note: `${nextBatch.batchId} expires in ${nextBatch.daysToExpiry} days`,
      icon: PackageCheck,
      accent: 'from-violet-500 to-indigo-400',
      glow: 'shadow-violet-200 dark:shadow-violet-900/40',
      change: '+1',
      up: false,
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your operational intelligence at a glance — powered by live inventory data.</p>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${card.glow} dark:border-white/10 dark:bg-slate-900`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity group-hover:opacity-5`} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-[#0b1c30] dark:text-slate-100">{card.value}</div>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">{card.note}</div>
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  card.up
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {card.up ? '▲' : '▼'} {card.change}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Forecast Trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Projected waste volume with model confidence</p>
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
            <div>
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage Mix</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loss amount by category</p>
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

      {/* Priority Queue + Quick Nav */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Priority Queue */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Priority Action Queue</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">The next actions worth looking at first</p>
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

        {/* Quick Nav Module Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.to}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradientFrom} ${card.gradientTo} opacity-0 transition-opacity group-hover:opacity-100`} />
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.text}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:text-slate-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-5 text-base font-bold text-[#0b1c30] dark:text-slate-100">{card.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Sample Baskets */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { label: 'Minimart basket', store: retailExamples.minimart.storeName, items: retailExamples.minimart.sampleItems, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', dot: 'bg-sky-400' },
          { label: 'Pharmacy basket', store: retailExamples.pharma.storeName, items: retailExamples.pharma.sampleItems, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-400' },
        ].map((basket) => (
          <div key={basket.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${basket.dot}`} />
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{basket.label}</div>
            </div>
            <h3 className="mt-2 text-base font-bold text-[#0b1c30] dark:text-slate-100">{basket.store}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {basket.items.map((item) => (
                <span key={item} className={`rounded-full px-3 py-1 text-xs font-medium ${basket.tone}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
