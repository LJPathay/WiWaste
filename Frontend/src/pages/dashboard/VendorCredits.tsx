import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { AlertTriangle, ArrowLeft, PhilippinePeso, FileCheck, Info, TimerReset, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

const MOCK_VENDOR_RETURNS = [
  { vendorId: 'VENDOR-001', vendorName: 'Nestlé Philippines', returnWindowDays: 30, eligibleCredit: 28500, returnDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: 'urgent' as const, returnItems: ['Nestlé Bear Brand 800g', 'Nestlé Coffee Creamer'] },
  { vendorId: 'VENDOR-002', vendorName: 'Procter & Gamble', returnWindowDays: 45, eligibleCredit: 18200, returnDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), status: 'open' as const, returnItems: ['Safeguard Bar Soap 135g', 'Tide Powder 1kg'] },
  { vendorId: 'VENDOR-003', vendorName: 'Coca-Cola Beverages', returnWindowDays: 20, eligibleCredit: 9500, returnDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), status: 'urgent' as const, returnItems: ['Coca-Cola 1.5L'] },
  { vendorId: 'VENDOR-004', vendorName: 'Del Monte Philippines', returnWindowDays: 30, eligibleCredit: 12400, returnDeadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'missed' as const, returnItems: ['Del Monte Tomato Sauce 250g', 'Del Monte Pineapple Tidbits'] },
  { vendorId: 'VENDOR-005', vendorName: 'Unilever Philippines', returnWindowDays: 60, eligibleCredit: 32100, returnDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), status: 'open' as const, returnItems: ['Knorr Seasoning 1kg', 'Lux Soap Pack', 'Rexona Deodorant'] },
  { vendorId: 'VENDOR-006', vendorName: 'San Miguel Corporation', returnWindowDays: 25, eligibleCredit: 7800, returnDeadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), status: 'open' as const, returnItems: ['San Miguel Pale Pilsen 6-pack'] },
];

function getDaysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getDeadlineRisk(daysUntilDeadline: number) {
  if (daysUntilDeadline < 0) return { label: 'Missed', color: '#ef4444', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300', border: 'border-l-rose-500' };
  if (daysUntilDeadline <= 10) return { label: 'Urgent', color: '#f59e0b', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-l-amber-500' };
  return { label: 'Open', color: '#14b8a6', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', border: 'border-l-teal-400' };
}

const columns: DataTableColumn<typeof MOCK_VENDOR_RETURNS[number]>[] = [
  { key: 'vendorId', header: 'Return ID', pinned: true, truncate: true, minWidth: '100px' },
  { key: 'vendorName', header: 'Reason', truncate: true, minWidth: '150px' },
  { key: 'returnItems', header: 'Processed By', truncate: true, minWidth: '100px', render: (row) => row.returnItems.slice(0, 2).join(', ') + (row.returnItems.length > 2 ? ` +${row.returnItems.length - 2}` : '') },
  { key: 'returnDeadline', header: 'Date', minWidth: '100px', render: (row) => {
    const days = getDaysUntil(row.returnDeadline);
    const cls = days < 0 ? 'text-rose-600 dark:text-rose-400' : days <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400';
    return <span className={`font-semibold ${cls}`}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}</span>;
  }},
  { key: 'eligibleCredit', header: 'Refund', numeric: true, minWidth: '100px', render: (row) => currencyFormatter.format(row.eligibleCredit) },
];

function getActionLabel(daysUntilDeadline: number) {
  if (daysUntilDeadline < 0) return { label: 'Request Exception', color: 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300' };
  if (daysUntilDeadline <= 10) return { label: 'File Claim Now', color: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' };
  return { label: 'Prepare Docs', color: 'text-teal-700 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-300' };
}

export function VendorCreditsPage() {
  const vendorReturns = MOCK_VENDOR_RETURNS;

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/dashboard?highlightKpi=2" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vendor Credit Recovery</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs text-xs">
            Track supplier return opportunities and recoverable credits. Act before return windows close permanently.
          </TooltipContent>
        </UITooltip>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">Total Recoverable</div>
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20"><PhilippinePeso className="h-3.5 w-3.5 text-emerald-500" /></div>
          </div>
          <div className="mt-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{currencyFormatter.format(totalCredits)}</div>
          <div className="mt-0.5 text-[9px] text-emerald-600/70">eligible across {vendorReturns.length} suppliers</div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-rose-500">Missed Windows</div>
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/20"><XCircle className="h-3.5 w-3.5 text-rose-500" /></div>
          </div>
          <div className="mt-1.5 text-sm font-bold text-rose-700 dark:text-rose-300">{missedWindows.length}</div>
          <div className="mt-0.5 text-[9px] text-rose-600/70">return deadlines already passed</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-amber-500">Urgent Windows</div>
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></div>
          </div>
          <div className="mt-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">{urgentWindows.length}</div>
          <div className="mt-0.5 text-[9px] text-amber-600/70">closing within 10 days</div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">Credit by Vendor</h2>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs text-xs">
                Color-coded by deadline risk — red=missed, amber=urgent, teal=open
              </TooltipContent>
            </UITooltip>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400">
            <PhilippinePeso className="h-3 w-3" />
            {currencyFormatter.format(totalCredits)} recoverable
          </span>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorChart} layout="vertical" margin={{ left: 48, right: 80 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8edf5" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="credit" radius={[0, 12, 12, 0]} name="Eligible credit">
                <LabelList dataKey="credit" position="right" formatter={(value: number) => currencyFormatter.format(value)} style={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                {vendorChart.map((item) => (
                  <Cell key={item.name} fill={item.risk.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-800/40">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
            <TimerReset className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">What does a missed window mean?</h4>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
              A missed window means the vendor's return deadline has passed. Credits may be permanently lost unless the supplier grants a special exception. Always prepare return documentation and photos before deadlines close.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-[#0b1c30] dark:text-slate-100">Return-Window Detections</h3>
        </div>
        <DataTable
          columns={columns}
          data={vendorReturns as (typeof MOCK_VENDOR_RETURNS[number] & Record<string, unknown>)[]}
          rowKey={(row) => row.vendorId}
          horizontalScroll
          showHeader
          emptyMessage="No return windows detected."
          actions={(row) => {
            const daysUntilDeadline = getDaysUntil(row.returnDeadline);
            const { label, color } = getActionLabel(daysUntilDeadline);
            return <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${color}`}>{label}</span>;
          }}
        />
      </section>
    </div>
  );
}