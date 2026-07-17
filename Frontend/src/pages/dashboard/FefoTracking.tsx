import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowLeft, Clock3, Info, Package, PackageSearch, RotateCcw, Tag } from 'lucide-react';
import { Link } from 'react-router';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getRisk(daysToExpiry: number) {
  if (daysToExpiry <= 3) return { label: 'Critical', color: '#ef4444', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', border: 'border-l-rose-500' };
  if (daysToExpiry <= 7) return { label: 'High', color: '#f59e0b', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-l-amber-500' };
  return { label: 'Stable', color: '#14b8a6', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', border: 'border-l-teal-400' };
}

export function FefoTrackingPage() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }
  if (!data) return <div className="p-8">No data</div>;

  const fefoChart = data.batchFEFO.map((item) => ({
    name: item.batchId.replace('-2026-', ' '),
    daysToExpiry: item.daysToExpiry,
    priceDrop: Number(((item.currentPrice - item.recommendedPrice) / item.currentPrice * 100).toFixed(1)),
    risk: getRisk(item.daysToExpiry),
  }));
  const criticalBatches = data.batchFEFO.filter((item) => item.daysToExpiry <= 3);
  const highRiskBatches = data.batchFEFO.filter((item) => item.daysToExpiry > 3 && item.daysToExpiry <= 7);
  const stableBatches = data.batchFEFO.filter((item) => item.daysToExpiry > 7);
  const nearestBatch = [...data.batchFEFO].sort(
    (firstBatch, secondBatch) => firstBatch.daysToExpiry - secondBatch.daysToExpiry
  )[0];

  const statCards = [
    { label: 'Total Batches', value: data.batchFEFO.length, icon: Package, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-white/10' },
    { label: 'Critical', value: criticalBatches.length, icon: AlertTriangle, color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20' },
    { label: 'High Risk', value: highRiskBatches.length, icon: Clock3, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
    { label: 'Stable', value: stableBatches.length, icon: Package, color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-500/10', border: 'border-teal-100 dark:border-teal-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard?highlightKpi=3" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">FEFO Batch Tracking</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Monitor batches by expiration date. Trigger rotation or promotional pricing before stock becomes unsellable.
          </TooltipContent>
        </UITooltip>
      </div>

      {/* Stat Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-3xl border ${card.border} ${card.bg} p-5`}>
              <div className="flex items-center justify-between">
                <div className={`text-xs font-semibold uppercase tracking-widest ${card.color} opacity-70`}>{card.label}</div>
                <Icon className={`h-4 w-4 ${card.color} opacity-60`} />
              </div>
              <div className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Days to Expiry by Batch</h2>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Color-coded risk with recommended price drop %
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="flex gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-rose-600"><span className="inline-block h-3 w-3 rounded-sm bg-rose-500" /> Critical</span>
            <span className="flex items-center gap-1.5 text-amber-600"><span className="inline-block h-3 w-3 rounded-sm bg-amber-500" /> High</span>
            <span className="flex items-center gap-1.5 text-teal-600"><span className="inline-block h-3 w-3 rounded-sm bg-teal-500" /> Stable</span>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fefoChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="days" tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: 'Days to Expiry', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }} />
              <YAxis yAxisId="drop" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: 'Price Drop %', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 12 } }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
              />
              <ReferenceLine yAxisId="days" y={7} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '7-day risk', fontSize: 11, fill: '#f59e0b' }} />
              <Bar yAxisId="days" dataKey="daysToExpiry" name="Days to expiry" radius={[12, 12, 0, 0]}>
                {fefoChart.map((item) => (
                  <Cell key={item.name} fill={item.risk.color} />
                ))}
              </Bar>
              <Line yAxisId="drop" type="linear" dataKey="priceDrop" name="Recommended price drop %" stroke="#0ea5e9" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Alert Banner */}
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
            <PackageSearch className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-amber-900 dark:text-amber-200">Nearest Expiry: {nearestBatch.batchId}</h3>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/30 dark:text-amber-200">{nearestBatch.daysToExpiry} DAYS LEFT</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-200/70">
              Move it to front shelves and apply the recommended price of{' '}
              <strong>{currencyFormatter.format(nearestBatch.recommendedPrice)}</strong>{' '}
              (currently priced at {currencyFormatter.format(nearestBatch.currentPrice)}).
            </p>
          </div>
        </div>
      </section>

      {/* Batch Table */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Batch Vulnerability Table</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Full batch list with risk, pricing, and recommended action.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Batch ID</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Risk</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Days Left</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Current Price</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Recommended</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.batchFEFO.map((batch) => {
                const risk = getRisk(batch.daysToExpiry);
                const action = batch.daysToExpiry <= 3
                  ? { label: 'Rotate Now', icon: RotateCcw, color: 'text-rose-700 bg-rose-100 dark:bg-rose-500/20 dark:text-rose-300' }
                  : batch.daysToExpiry <= 7
                  ? { label: 'Mark Down', icon: Tag, color: 'text-amber-700 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300' }
                  : { label: 'Monitor', icon: Package, color: 'text-teal-700 bg-teal-100 dark:bg-teal-500/20 dark:text-teal-300' };
                const ActionIcon = action.icon;
                return (
                  <tr key={batch.batchId} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#0b1c30] dark:text-slate-100">{batch.batchId}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${risk.tone}`}>{risk.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-bold ${
                        batch.daysToExpiry <= 3 ? 'text-rose-600 dark:text-rose-400' :
                        batch.daysToExpiry <= 7 ? 'text-amber-600 dark:text-amber-400' :
                        'text-teal-600 dark:text-teal-400'
                      }`}>{batch.daysToExpiry}d</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 line-through">{currencyFormatter.format(batch.currentPrice)}</td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 dark:text-emerald-400">{currencyFormatter.format(batch.recommendedPrice)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold ${action.color}`}>
                        <ActionIcon className="h-3 w-3" />
                        {action.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
