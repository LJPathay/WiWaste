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
  PackageCheck,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { retailExamples } from '../../utils/mockAuthAndFeatures';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function DashboardOverview() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-slate-900" />
        ))}
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
    },
    {
      label: 'Monthly Leakage',
      value: currencyFormatter.format(totalLeakage),
      note: `${topLeakage.category} is the largest driver`,
      icon: ShieldAlert,
      accent: 'from-rose-500 to-orange-400',
    },
    {
      label: 'Recoverable Credits',
      value: currencyFormatter.format(totalCredits),
      note: `${expiredVendorWindows} return window needs attention`,
      icon: CircleDollarSign,
      accent: 'from-emerald-500 to-teal-400',
    },
    {
      label: 'Critical FEFO Batches',
      value: criticalBatches,
      note: `${nextBatch.batchId} expires in ${nextBatch.daysToExpiry} days`,
      icon: PackageCheck,
      accent: 'from-violet-500 to-indigo-400',
    },
  ];

  const actionCards = [
    {
      title: 'Predictive Analytics',
      description: 'Review demand movement, confidence, and seasonal anomaly signals.',
      to: '/dashboard/predictive',
      icon: TrendingUp,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      title: 'Leakage Detection',
      description: 'Find the categories leaking the most margin this month.',
      to: '/dashboard/leakage',
      icon: BarChart3,
      tone: 'bg-rose-50 text-rose-700',
    },
    {
      title: 'Decision Sandbox',
      description: 'Compare recommended actions by ROI and risk before rollout.',
      to: '/dashboard/prescriptive',
      icon: CalendarClock,
      tone: 'bg-violet-50 text-violet-700',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-[#0b1c30] dark:text-slate-100">{card.value}</div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 text-sm leading-5 text-slate-500 dark:text-slate-400">{card.note}</div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#0b1c30] dark:text-slate-100">Forecast trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Projected waste volume with model confidence</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
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
                <Tooltip />
                <Area type="monotone" dataKey="forecast" stroke="#0ea5e9" fill="url(#dashboardForecastFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#0b1c30] dark:text-slate-100">Leakage mix</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loss amount by category</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              {currencyFormatter.format(totalLeakage)}
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={0} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="amount" radius={[12, 12, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#0b1c30] dark:text-slate-100">Priority queue</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">The next actions worth looking at first</p>
            </div>
            <CalendarClock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="font-semibold">Move {nextBatch.batchId} today</div>
              <p className="mt-1 text-amber-800/80 dark:text-amber-100/70">Only {nextBatch.daysToExpiry} days before expiry. Recommended price is ${nextBatch.recommendedPrice.toFixed(2)}.</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">
              <div className="font-semibold">Reduce {topLeakage.category.toLowerCase()}</div>
              <p className="mt-1 text-rose-800/80 dark:text-rose-100/70">{topLeakage.source}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
              <div className="font-semibold">Recover vendor credits</div>
              <p className="mt-1 text-emerald-800/80 dark:text-emerald-100/70">{currencyFormatter.format(totalCredits)} remains eligible across supplier return windows.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.to}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#0b1c30] dark:text-slate-100">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { label: 'Minimart basket', store: retailExamples.minimart.storeName, items: retailExamples.minimart.sampleItems, tone: 'bg-sky-50 text-sky-700' },
          { label: 'Pharmacy basket', store: retailExamples.pharma.storeName, items: retailExamples.pharma.sampleItems, tone: 'bg-emerald-50 text-emerald-700' },
        ].map((basket) => (
          <div key={basket.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{basket.label}</div>
            <h3 className="mt-2 text-lg font-semibold text-[#0b1c30] dark:text-slate-100">{basket.store}</h3>
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
