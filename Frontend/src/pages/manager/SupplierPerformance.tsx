import React, { useState } from 'react';
import { Users, Info, Loader2 } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, LabelList } from 'recharts';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface PerformanceMock {
  id: string;
  name: string;
  delivery: number;
  returns: number;
  leadTime: number;
  credits: number;
  creditPending: boolean;
}

const SUPPLIERS: PerformanceMock[] = [
  { id: '1', name: 'Unilab Distribution Inc.', delivery: 98, returns: 1.5, leadTime: 3, credits: 8100, creditPending: false },
  { id: '2', name: 'Purefoods Wholesale Corp.', delivery: 92, returns: 4.2, leadTime: 4, credits: 6200, creditPending: false },
  { id: '3', name: 'Universal Robina Corp.', delivery: 95, returns: 2.1, leadTime: 3, credits: 4800, creditPending: false },
  { id: '4', name: 'Johnson & Johnson PH', delivery: 88, returns: 5.8, leadTime: 5, credits: 0, creditPending: false },
  { id: '5', name: 'Nestlé Philippines', delivery: 94, returns: 3.0, leadTime: 3, credits: 4500, creditPending: false },
  { id: '6', name: 'Gardenia Bakeries PH', delivery: 97, returns: 1.8, leadTime: 2, credits: 0, creditPending: false },
];

const TREND_DATA = [
  { month: 'Jan', unilab: 96, purefoods: 89, urc: 92 },
  { month: 'Feb', unilab: 97, purefoods: 90, urc: 93 },
  { month: 'Mar', unilab: 95, purefoods: 88, urc: 91 },
  { month: 'Apr', unilab: 98, purefoods: 91, urc: 94 },
  { month: 'May', unilab: 97, purefoods: 92, urc: 95 },
  { month: 'Jun', unilab: 98, purefoods: 92, urc: 95 },
  { month: 'Jul', unilab: 99, purefoods: 93, urc: 96 },
  { month: 'Aug', unilab: 98, purefoods: 91, urc: 94 },
  { month: 'Sep', unilab: 97, purefoods: 90, urc: 93 },
  { month: 'Oct', unilab: 98, purefoods: 92, urc: 95 },
  { month: 'Nov', unilab: 99, purefoods: 93, urc: 96 },
  { month: 'Dec', unilab: 98, purefoods: 92, urc: 95 },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export function SupplierPerformance() {
  const { toasts, dismiss, success } = useToast();
  const [suppliers, setSuppliers] = useState<PerformanceMock[]>(SUPPLIERS);
  const [confirm, setConfirm] = useState<{ open: boolean; supplierId: string; name: string } | null>(null);

  const chartData = suppliers.map((s) => ({
    name: s.name.split(' ')[0],
    'On-Time %': s.delivery,
    'Return Rate': Math.round(s.returns * 10),
  }));

  const handleRequestCredit = () => {
    if (!confirm) return;
    setSuppliers(prev => prev.map(s => s.id === confirm.supplierId ? { ...s, creditPending: true } : s));
    success(`Credit request sent to ${confirm.name}.`);
    setConfirm(null);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Supplier Performance Audit</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Delivery fulfillment rates, return statistics, and pending credits by distributor to evaluate supplier reliability.
          </TooltipContent>
        </UITooltip>
      </div>

      {confirm && (
        <ConfirmDialog
          message={`Send a credit recovery request to ${confirm.name}?`}
          confirmLabel="Send Request"
          onConfirm={handleRequestCredit}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg On-Time Delivery', value: `${Math.round(suppliers.reduce((s, x) => s + x.delivery, 0) / suppliers.length)}%` },
          { label: 'Total Recoverable Credits', value: currencyFormatter.format(suppliers.reduce((s, x) => s + x.credits, 0)) },
          { label: 'Avg Lead Time', value: `${(suppliers.reduce((s, x) => s + x.leadTime, 0) / suppliers.length).toFixed(1)} days` },
          { label: 'Active Suppliers', value: `${suppliers.length}` },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Delivery Rate vs Return Exposure</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 40, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="On-Time %" radius={[0, 4, 4, 0]} fill="#006a61">
                  <LabelList dataKey="On-Time %" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="Return Rate" radius={[0, 4, 4, 0]} fill="#f87171">
                  <LabelList dataKey="Return Rate" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Top 3 Supplier Delivery Trend (Full Year)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[85, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="linear" dataKey="unilab" name="Unilab" stroke="#006a61" strokeWidth={2} dot={false} />
                <Line type="linear" dataKey="purefoods" name="Purefoods" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="linear" dataKey="urc" name="URC" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Supplier table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Supplier Details</h3>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">Supplier</th>
              <th className="px-6 py-3 font-semibold">On-Time %</th>
              <th className="px-6 py-3 font-semibold">Return Rate</th>
              <th className="px-6 py-3 font-semibold">Lead Time</th>
              <th className="px-6 py-3 font-semibold">Pending Credits</th>
              <th className="px-6 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{s.name}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{s.delivery}%</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.returns}%</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{s.leadTime} days</td>
                <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{s.credits > 0 ? currencyFormatter.format(s.credits) : '—'}</td>
                <td className="px-6 py-4 text-right">
                  {s.credits > 0 ? (
                    <button
                      onClick={() => !s.creditPending && setConfirm({ open: true, supplierId: s.id, name: s.name })}
                      disabled={s.creditPending}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        s.creditPending
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-[#006a61] hover:bg-[#00574f] text-white'
                      }`}
                    >
                      {s.creditPending ? 'Requested' : 'Request Credits'}
                    </button>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-xs">No credits</span>
                  )}
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
