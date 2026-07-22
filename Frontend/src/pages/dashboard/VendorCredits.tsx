import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { AlertTriangle, ArrowLeft, PhilippinePeso, FileCheck, Info, TimerReset, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useDashboardData } from '../../hooks/useDashboardData';
import { suppliers as suppliersApi, returns as returnsApi } from '../../services/api';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getDaysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getDeadlineRisk(daysUntilDeadline: number) {
  if (daysUntilDeadline < 0) return { label: 'Missed', color: '#ef4444', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', border: 'border-l-rose-500' };
  if (daysUntilDeadline <= 10) return { label: 'Urgent', color: '#f59e0b', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-l-amber-500' };
  return { label: 'Open', color: '#14b8a6', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', border: 'border-l-teal-400' };
}

export function VendorCreditsPage() {
  const { data, loading: dashLoading } = useDashboardData();
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      suppliersApi.list().catch(() => [] as any),
      returnsApi.list().catch(() => [] as any),
    ]).then(([s, r]) => {
      setSuppliersList(s);
      setReturnsList(r);
    }).finally(() => setDataLoading(false));
  }, []);

  const loading = dashLoading || dataLoading;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const vendorReturns = (data?.vendorReturns ?? []).length > 0
    ? data!.vendorReturns
    : suppliersList.map((s: any, i) => ({
        vendorId: `VENDOR-${s.id ?? i}`,
        vendorName: s.name ?? s.supplier_name ?? `Supplier ${i + 1}`,
        returnWindowDays: 30,
        eligibleCredit: 0,
        returnDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending' as const,
      }));

  const vendorChart = vendorReturns.map((item) => {
    const daysUntilDeadline = getDaysUntil(item.returnDeadline);
    return {
      name: item.vendorName,
      credit: item.eligibleCredit,
      risk: getDeadlineRisk(daysUntilDeadline),
      daysUntilDeadline,
    };
  });
  const totalCredits = vendorReturns.reduce((sum, item) => sum + item.eligibleCredit, 0);
  const missedWindows = vendorChart.filter((item) => item.daysUntilDeadline < 0);
  const urgentWindows = vendorChart.filter((item) => item.daysUntilDeadline >= 0 && item.daysUntilDeadline <= 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard?highlightKpi=2" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Vendor Credit Recovery</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Track supplier return opportunities and recoverable credits. Act before return windows close permanently.
          </TooltipContent>
        </UITooltip>
      </div>


      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">Total Recoverable</div>
            <PhilippinePeso className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{currencyFormatter.format(totalCredits)}</div>
          <div className="mt-1 text-xs text-emerald-600/70">eligible across {vendorReturns.length} suppliers</div>
        </div>
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 dark:border-rose-500/20 dark:bg-rose-500/5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-rose-500">Missed Windows</div>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-300">{missedWindows.length}</div>
          <div className="mt-1 text-xs text-rose-600/70">return deadlines already passed</div>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-500">Urgent Windows</div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-300">{urgentWindows.length}</div>
          <div className="mt-1 text-xs text-amber-600/70">closing within 10 days</div>
        </div>
      </div>

      {/* Chart */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Credit by Vendor</h2>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Color-coded by deadline risk — red=missed, amber=urgent, teal=open
              </TooltipContent>
            </UITooltip>
          </div>
          <span className="inline-flex items-center gap-2 text-xs rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400">
            <PhilippinePeso className="h-3.5 w-3.5" />
            {currencyFormatter.format(totalCredits)} recoverable
          </span>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorChart} layout="vertical" margin={{ left: 48, right: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value) => currencyFormatter.format(Number(value))}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="credit" radius={[0, 12, 12, 0]} name="Eligible credit">
                <LabelList dataKey="credit" position="right" formatter={(value: number) => currencyFormatter.format(value)} style={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                {vendorChart.map((item) => (
                  <Cell key={item.name} fill={item.risk.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Note Banner */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-800/40">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
            <TimerReset className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200">What does a missed window mean?</h4>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              A missed window means the vendor's return deadline has passed. Credits may be permanently lost unless the supplier grants a special exception. Always prepare return documentation and photos before deadlines close.
            </p>
          </div>
        </div>
      </section>

      {/* Vendor Table */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Return-Window Detections</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Vendor</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Credit</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Deadline</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Return Items</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendorReturns.map((vendor) => {
                const daysUntilDeadline = getDaysUntil(vendor.returnDeadline);
                const risk = getDeadlineRisk(daysUntilDeadline);
                const actionLabel = daysUntilDeadline < 0
                  ? 'Request Exception'
                  : daysUntilDeadline <= 10
                  ? 'File Claim Now'
                  : 'Prepare Docs';
                const actionColor = daysUntilDeadline < 0
                  ? 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300'
                  : daysUntilDeadline <= 10
                  ? 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'text-teal-700 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-300';
                return (
                  <tr key={vendor.vendorId} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#0b1c30] dark:text-slate-100">{vendor.vendorName}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${risk.tone}`}>{risk.label}</span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 dark:text-emerald-400">{currencyFormatter.format(vendor.eligibleCredit)}</td>
                    <td className="px-5 py-4">
                      <span className={`font-semibold ${
                        daysUntilDeadline < 0 ? 'text-rose-600 dark:text-rose-400' :
                        daysUntilDeadline <= 10 ? 'text-amber-600 dark:text-amber-400' :
                        'text-teal-600 dark:text-teal-400'
                      }`}>
                        {daysUntilDeadline < 0 ? `${Math.abs(daysUntilDeadline)}d overdue` : `${daysUntilDeadline}d left`}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 max-w-[160px] truncate" title={(vendor as { returnItems?: string[] }).returnItems?.join(', ')}>
                      {(vendor as { returnItems?: string[] }).returnItems?.slice(0, 2).join(', ') ?? '—'}{(vendor as { returnItems?: string[] }).returnItems && (vendor as { returnItems?: string[] }).returnItems!.length > 2 ? ` +${(vendor as { returnItems?: string[] }).returnItems!.length - 2}` : ''}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${actionColor}`}>{actionLabel}</span>
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
