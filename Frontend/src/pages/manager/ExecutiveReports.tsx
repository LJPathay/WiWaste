import React, { useState } from 'react';
import { FileText, Download, Info, Loader2 } from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Toast, useToast } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const MONTHLY_DATA = [
  { month: 'Jan', revenue: 2200000, waste: 54000, recovery: 22000 },
  { month: 'Feb', revenue: 2400000, waste: 48200, recovery: 19400 },
  { month: 'Mar', revenue: 2300000, waste: 51200, recovery: 28000 },
  { month: 'Apr', revenue: 2500000, waste: 42000, recovery: 31000 },
  { month: 'May', revenue: 2600000, waste: 38000, recovery: 25600 },
  { month: 'Jun', revenue: 2800000, waste: 32000, recovery: 33200 },
  { month: 'Jul', revenue: 2750000, waste: 35000, recovery: 30000 },
  { month: 'Aug', revenue: 2900000, waste: 29500, recovery: 36000 },
  { month: 'Sep', revenue: 3100000, waste: 27000, recovery: 38500 },
  { month: 'Oct', revenue: 3000000, waste: 25000, recovery: 40200 },
  { month: 'Nov', revenue: 3200000, waste: 22000, recovery: 42100 },
  { month: 'Dec', revenue: 3500000, waste: 18000, recovery: 43500 },
];

const EFFICIENCY_DATA = [
  { month: 'Jan', score: 72 },
  { month: 'Feb', score: 74 },
  { month: 'Mar', score: 73 },
  { month: 'Apr', score: 76 },
  { month: 'May', score: 78 },
  { month: 'Jun', score: 79 },
  { month: 'Jul', score: 78 },
  { month: 'Aug', score: 80 },
  { month: 'Sep', score: 81 },
  { month: 'Oct', score: 82 },
  { month: 'Nov', score: 83 },
  { month: 'Dec', score: 85 },
];

const CATEGORY_DATA = [
  { category: 'Food & Bev', wastage: 128400 },
  { category: 'Medicine', wastage: 43600 },
  { category: 'Personal Care', wastage: 31200 },
  { category: 'Household', wastage: 22800 },
  { category: 'Dairy', wastage: 58700 },
];

interface GeneratedFile {
  id: string;
  name: string;
  date: string;
  size: string;
}

const INITIAL_FILES: GeneratedFile[] = [
  { id: '1', name: 'executive_report_june_2026.pdf', date: '2026-07-01 18:30', size: '2.4 MB' },
  { id: '2', name: 'quarterly_overview_q2_2026.pdf', date: '2026-06-30 21:15', size: '3.1 MB' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export function ExecutiveReports() {
  const { toasts, dismiss, success } = useToast();
  const [exporting, setExporting] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>(INITIAL_FILES);

  const totalRevenue = MONTHLY_DATA.reduce((s, d) => s + d.revenue, 0);
  const totalWaste = MONTHLY_DATA.reduce((s, d) => s + d.waste, 0);
  const totalRecovery = MONTHLY_DATA.reduce((s, d) => s + d.recovery, 0);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
      const newFile: GeneratedFile = {
        id: String(Date.now()),
        name: `executive_report_${now.toLocaleString('en-PH', { month: 'short' }).toLowerCase()}_${now.getFullYear()}.pdf`,
        date: dateStr,
        size: `${(Math.random() * 2 + 1.5).toFixed(1)} MB`,
      };
      setFiles(prev => [newFile, ...prev]);
      success('Executive report exported and added to file list.');
    }, 2000);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Executive Reports Dashboard</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Aggregated margin summaries, net wastage ratios, and store health ratings for executive review.
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
          {exporting ? 'Exporting...' : 'Export Audit'}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue (YTD)', value: currencyFormatter.format(totalRevenue), note: '+8% vs last year' },
          { label: 'Total Wastage Cost', value: currencyFormatter.format(totalWaste), note: '-15% decrease from Jan' },
          { label: 'Credits Recovered', value: currencyFormatter.format(totalRecovery), note: '67% recovery rate' },
          { label: 'Net Efficiency Score', value: '85/100', note: 'Grade A — Optimal' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{card.value}</div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.note}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: Revenue vs Wastage area chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Revenue vs Wastage Cost (Full Year)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MONTHLY_DATA}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006a61" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#006a61" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `₱${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#006a61" fill="url(#revGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="waste" name="Wastage Cost" stroke="#f87171" fill="url(#wasteGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 + 3 in a grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficiency score trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Monthly Efficiency Score</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EFFICIENCY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[65, 90]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="score" name="Score" stroke="#006a61" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wastage by category */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Wastage by Category</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CATEGORY_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={90} />
                <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                <Bar dataKey="wastage" name="Wastage" fill="#f87171" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Generated reports table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Generated Reports</h3>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">File Name</th>
              <th className="px-6 py-3 font-semibold">Generated</th>
              <th className="px-6 py-3 font-semibold">Size</th>
              <th className="px-6 py-3 font-semibold text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {files.map(f => (
              <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">{f.name}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{f.date}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{f.size}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => success(`Downloading ${f.name}...`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006a61] dark:text-emerald-400 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
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
