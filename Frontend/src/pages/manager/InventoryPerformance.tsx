import { useState } from 'react';
import { TrendingUp, Award, Download, Info, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, ReferenceLine } from 'recharts';
import { Toast, useToast } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const TURNOVER_DATA = [
  { month: 'Jan', turnover: 3.5, deadStock: 18, daysOnShelf: 26 },
  { month: 'Feb', turnover: 3.8, deadStock: 16, daysOnShelf: 24 },
  { month: 'Mar', turnover: 4.0, deadStock: 15, daysOnShelf: 22 },
  { month: 'Apr', turnover: 4.2, deadStock: 14, daysOnShelf: 21 },
  { month: 'May', turnover: 4.1, deadStock: 13, daysOnShelf: 20 },
  { month: 'Jun', turnover: 4.5, deadStock: 12, daysOnShelf: 19 },
  { month: 'Jul', turnover: 4.3, deadStock: 14, daysOnShelf: 19 },
  { month: 'Aug', turnover: 4.7, deadStock: 11, daysOnShelf: 18 },
  { month: 'Sep', turnover: 4.4, deadStock: 12, daysOnShelf: 18 },
  { month: 'Oct', turnover: 5.0, deadStock: 9, daysOnShelf: 17 },
  { month: 'Nov', turnover: 5.3, deadStock: 8, daysOnShelf: 16 },
  { month: 'Dec', turnover: 5.6, deadStock: 7, daysOnShelf: 15 },
];

const TOP_PRODUCTS = [
  { name: 'Biogesic Paracetamol 500mg', category: 'Medicine', sold: 450, revenue: 3375, rate: '5.2x' },
  { name: 'Coca-Cola 1.5L', category: 'Beverages', sold: 280, revenue: 19040, rate: '4.8x' },
  { name: 'Safeguard White Soap 130g', category: 'Personal Care', sold: 190, revenue: 10260, rate: '4.1x' },
  { name: 'Del Monte Tomato Sauce 250g', category: 'Food', sold: 150, revenue: 4875, rate: '3.6x' },
  { name: 'C2 Green Tea 500ml', category: 'Beverages', sold: 130, revenue: 2860, rate: '3.2x' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export function InventoryPerformance() {
  const { toasts, dismiss, success } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      success('Performance report exported successfully.');
    }, 1500);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory Performance Audit</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Stock turnover metrics, high-velocity assets, and shelf placement diagnostics to optimize inventory flow.
            </TooltipContent>
          </UITooltip>
        </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Catalog SKUs', value: '248', note: '98% stock accuracy rating' },
          { label: 'Inventory Turnover Rate', value: '4.2x', note: '+12% increase from Q1' },
          { label: 'Dead Stock Items', value: '12', note: 'Est. ₱8.5k capital locked' },
          { label: 'Avg Days on Shelf', value: '18 days', note: 'Target: 20 days' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{card.value}</div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Monthly Turnover Index & Dead Stock (Full Year)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={TURNOVER_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="turnover" name="Turnover Rate (x)" radius={[6, 6, 0, 0]} fill="#006a61" />
                <Bar yAxisId="left" dataKey="deadStock" name="Dead Stock Items" radius={[6, 6, 0, 0]} fill="#cbd5e1" />
                <ReferenceLine yAxisId="right" y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target (20 days)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11 }} />
                <Line yAxisId="right" type="linear" dataKey="daysOnShelf" name="Days on Shelf" stroke="#f59e0b" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Top Velocity SKUs
          </h3>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-white/5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-100">{p.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.category} · {p.sold} sold</div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{currencyFormatter.format(p.revenue)}</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{p.rate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Monthly Performance Breakdown</h3>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">Month</th>
              <th className="px-6 py-3 font-semibold">Turnover Rate</th>
              <th className="px-6 py-3 font-semibold">Dead Stock Items</th>
              <th className="px-6 py-3 font-semibold">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {TURNOVER_DATA.map((row) => (
              <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{row.month}</td>
                <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{row.turnover}x</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{row.deadStock} items</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    row.turnover >= 5
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : row.turnover >= 4
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  }`}>
                    {row.turnover >= 5 ? 'Excellent' : row.turnover >= 4 ? 'On Target' : 'Below Target'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
