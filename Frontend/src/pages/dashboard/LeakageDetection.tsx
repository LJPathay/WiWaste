import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowLeft, Info, ShieldAlert, TrendingDown } from 'lucide-react';
import { Link } from 'react-router';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function LeakageDetectionPage() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <div className="p-8">No data</div>;

  const leakageChart = [...data.profitLeakage]
    .sort((firstItem, secondItem) => secondItem.leakageAmount - firstItem.leakageAmount)
    .map((item) => ({
      name: item.category,
      amount: item.leakageAmount,
      percentage: item.percentage,
    }));
  const totalLeakage = data.profitLeakage.reduce((sum, item) => sum + item.leakageAmount, 0);
  const highestLeak = leakageChart[0];
  const leakageDetections = data.profitLeakage.map((item) => ({
    ...item,
    severity: item.leakageAmount >= 10000 ? 'Critical' : item.leakageAmount >= 7000 ? 'High' : 'Medium',
    share: Math.round((item.leakageAmount / totalLeakage) * 100),
  }));

  function getSeverityStyle(severity: string) {
    if (severity === 'Critical') return {
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
      bar: 'bg-rose-500',
      border: 'border-l-rose-500',
    };
    if (severity === 'High') return {
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      bar: 'bg-amber-500',
      border: 'border-l-amber-500',
    };
    return {
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
      bar: 'bg-sky-500',
      border: 'border-l-sky-500',
    };
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard?highlightKpi=1" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profit Leakage Detection</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Ranked financial loss drivers — identify where money is leaking and prioritize containment.
          </TooltipContent>
        </UITooltip>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/5">
          <div className="text-xs font-semibold uppercase tracking-widest text-rose-400 dark:text-rose-500">Total Monthly Leakage</div>
          <div className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-300">{currencyFormatter.format(totalLeakage)}</div>
          <div className="mt-1 text-xs text-rose-600/70 dark:text-rose-400/70">across {data.profitLeakage.length} categories</div>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 dark:text-amber-500">Largest Single Driver</div>
          <div className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{highestLeak.name}</div>
          <div className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/70">{currencyFormatter.format(highestLeak.amount)} — highest share</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Critical Categories</div>
          <div className="mt-2 text-3xl font-bold text-[#0b1c30] dark:text-slate-100">
            {leakageDetections.filter((i) => i.severity === 'Critical').length}
          </div>
          <div className="mt-1 text-xs text-slate-500">require immediate action</div>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage by Category</h2>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Ranked loss drivers — largest at top.
              </TooltipContent>
            </UITooltip>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-rose-50 text-rose-700 px-3 py-1 font-semibold dark:bg-rose-500/10 dark:text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            {currencyFormatter.format(totalLeakage)} total leakage
          </span>
        </div>
        <div style={{ height: leakageChart.length * 56 + 40 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leakageChart} layout="vertical" margin={{ left: 16, right: 32, top: 8, bottom: 8 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value) => currencyFormatter.format(Number(value))}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="amount" radius={[0, 12, 12, 0]} fill="#ef4444" name="Leakage amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Biggest Vulnerability Callout */}
      <section className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-5 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-orange-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/20">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-rose-900 dark:text-rose-200">Biggest Vulnerability: {highestLeak.name}</h3>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">PRIORITY</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-rose-800/80 dark:text-rose-200/70">
              This category alone is leaking <strong>{currencyFormatter.format(highestLeak.amount)}</strong>. Treat it as the first investigation target before optimizing smaller issues.
            </p>
          </div>
        </div>
      </section>

      {/* Per-Category Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {leakageDetections.map((item) => {
          const style = getSeverityStyle(item.severity);
          return (
            <div
              key={item.category}
              className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900 border-l-4 ${style.border} transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">{item.category}</h3>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${style.badge}`}>{item.severity}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.source}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 dark:bg-slate-800 dark:border-white/5">
                  <div className="text-xs font-medium text-slate-400">Leakage Amount</div>
                  <div className="mt-1 text-lg font-bold text-[#0b1c30] dark:text-slate-100">{currencyFormatter.format(item.leakageAmount)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 dark:bg-slate-800 dark:border-white/5">
                  <div className="text-xs font-medium text-slate-400">Share of Total</div>
                  <div className="mt-1 text-lg font-bold text-[#0b1c30] dark:text-slate-100">{item.share}%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Share of total leakage</span>
                  <span>{item.share}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full ${style.bar} transition-all`}
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Detection: </span>
                {item.percentage}% margin exposure needs review by store operations.
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
