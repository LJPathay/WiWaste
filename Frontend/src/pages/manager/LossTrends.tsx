import React from 'react';
import { LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const CHART_DATA = [
  { month: 'Jan', loss: 68000, recovered: 22000 },
  { month: 'Feb', loss: 61500, recovered: 19400 },
  { month: 'Mar', loss: 73200, recovered: 28000 },
  { month: 'Apr', loss: 55800, recovered: 31000 },
  { month: 'May', loss: 63400, recovered: 25600 },
  { month: 'Jun', loss: 58700, recovered: 33200 },
  { month: 'Jul', loss: 49200, recovered: 36000 },
  { month: 'Aug', loss: 52100, recovered: 30100 },
  { month: 'Sep', loss: 44800, recovered: 38500 },
  { month: 'Oct', loss: 41300, recovered: 40200 },
  { month: 'Nov', loss: 37900, recovered: 42100 },
  { month: 'Dec', loss: 32000, recovered: 43500 },
];

const LOSS_BREAKDOWN = [
  { category: 'Expired on Shelf', units: 312, value: 128400, pct: '38%' },
  { category: 'Mould / Spoilage', units: 184, value: 73600, pct: '22%' },
  { category: 'Damaged Packaging', units: 142, value: 56800, pct: '17%' },
  { category: 'Overstock Write-off', units: 118, value: 47200, pct: '14%' },
  { category: 'Theft / Discrepancy', units: 64, value: 30600, pct: '9%' },
];

export function LossTrends() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading loss trends...</div>;
  if (!data) return <div className="p-8">No data</div>;

  const totalLoss = CHART_DATA.reduce((s, d) => s + d.loss, 0);
  const totalRecovered = CHART_DATA.reduce((s, d) => s + d.recovered, 0);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#006a61]" />
          Loss Trends Audit
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review statistical leakage trends and audit department exposure logs.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Loss (YTD)</div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">{currencyFormatter.format(totalLoss)}</div>
          <div className="mt-1 text-xs text-slate-400">Across all wastage categories</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recovered via Credits</div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{currencyFormatter.format(totalRecovered)}</div>
          <div className="mt-1 text-xs text-slate-400">Supplier returns & vendor claims</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Loss After Recovery</div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{currencyFormatter.format(totalLoss - totalRecovered)}</div>
          <div className="mt-1 text-xs text-slate-400">Target: reduce by 15% next quarter</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Monthly Loss vs Recovery Trend (Full Year)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
              <Legend />
              <Line type="monotone" dataKey="loss" name="Wastage Loss" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="recovered" name="Recovered" stroke="#006a61" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Loss by Category</h3>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">Wastage Category</th>
              <th className="px-6 py-3 font-semibold">Units Written Off</th>
              <th className="px-6 py-3 font-semibold">Total Value</th>
              <th className="px-6 py-3 font-semibold">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {LOSS_BREAKDOWN.map((row) => (
              <tr key={row.category} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{row.category}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.units} units</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{currencyFormatter.format(row.value)}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.pct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
