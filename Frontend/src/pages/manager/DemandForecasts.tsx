import React from 'react';
import { AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { Info, TrendingUp } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const FORECAST_DATA = [
  { month: 'Jan', actual: 4200, forecast: 4100, lower: 3800, upper: 4400 },
  { month: 'Feb', actual: 3900, forecast: 4000, lower: 3700, upper: 4300 },
  { month: 'Mar', actual: 5100, forecast: 4800, lower: 4500, upper: 5100 },
  { month: 'Apr', actual: 4600, forecast: 4700, lower: 4400, upper: 5000 },
  { month: 'May', actual: 4300, forecast: 4500, lower: 4200, upper: 4800 },
  { month: 'Jun', actual: 4800, forecast: 4600, lower: 4300, upper: 4900 },
  { month: 'Jul', actual: null, forecast: 5000, lower: 4700, upper: 5300 },
  { month: 'Aug', actual: null, forecast: 5200, lower: 4900, upper: 5500 },
  { month: 'Sep', actual: null, forecast: 4700, lower: 4400, upper: 5000 },
  { month: 'Oct', actual: null, forecast: 5500, lower: 5200, upper: 5800 },
  { month: 'Nov', actual: null, forecast: 6100, lower: 5800, upper: 6400 },
  { month: 'Dec', actual: null, forecast: 6800, lower: 6500, upper: 7100 },
];

const SEASONAL_RISKS = [
  { period: 'Jul – Aug', trigger: 'Rainy Season', items: 'Dairy, Bread, Produce', risk: 'High', action: 'Reduce PO by 15%' },
  { period: 'Oct – Nov', trigger: 'Long Holidays', items: 'Beverages, Snacks', risk: 'Medium', action: 'Increase PO by 20%' },
  { period: 'Dec', trigger: 'Christmas Peak', items: 'All Categories', risk: 'High', action: 'Pre-stock 30% buffer' },
  { period: 'Jan – Feb', trigger: 'Post-holiday Dip', items: 'Luxury & Seasonal', risk: 'Medium', action: 'Markdown promos' },
];

export function DemandForecasts() {
  const { data, loading } = useDashboardData();

  if (loading) return <div className="p-8">Loading demand forecasts...</div>;
  if (!data) return <div className="p-8">No data</div>;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#006a61]" />
          Demand Forecast Analytics
        </h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Statistical demand models, confidence indexes, and seasonal warning triggers to guide purchase order decisions.
          </TooltipContent>
        </UITooltip>
      </div>


      {/* KPI highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Accuracy</div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">87.3%</div>
          <div className="mt-1 text-xs text-slate-400">Based on historical back-test cycles</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Forecast Horizon</div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">6 Months</div>
          <div className="mt-1 text-xs text-slate-400">Forward-looking confidence band</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Anomaly Threshold</div>
          <div className="mt-2 text-2xl font-black text-amber-500 font-mono">1.5 σ</div>
          <div className="mt-1 text-xs text-slate-400">Normal boundary for shelf variances</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">AI Projected Waste Volume vs Actual (Full Year)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={FORECAST_DATA}>
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006a61" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#006a61" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="forecast" name="AI Forecast" stroke="#006a61" fill="url(#forecastFill)" strokeWidth={2.5} connectNulls />
              <Area type="monotone" dataKey="actual" name="Actual Waste (units)" stroke="#f59e0b" fill="url(#actualFill)" strokeWidth={2.5} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal risk table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Seasonal Risk Triggers</h3>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">Period</th>
              <th className="px-6 py-3 font-semibold">Trigger</th>
              <th className="px-6 py-3 font-semibold">Affected Items</th>
              <th className="px-6 py-3 font-semibold">Risk Level</th>
              <th className="px-6 py-3 font-semibold">Recommended Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {SEASONAL_RISKS.map((row) => (
              <tr key={row.period} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{row.period}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.trigger}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.items}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    row.risk === 'High'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  }`}>{row.risk}</span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
