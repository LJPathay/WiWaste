import React, { useState, useMemo } from 'react';
import { Info, Search, TrendingDown, DollarSign, ShieldCheck, PackageX } from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
type MockBatch = {
  batch_id: number;
  product_name: string;
  sku: string;
  batch_number: string;
  expiry_date: string;
  days_left: number;
  quantity: number;
  status: string;
};

const MOCK_BATCHES: MockBatch[] = (() => {
  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().slice(0, 10);
  };
  return [
    { batch_id: 1, product_name: 'Lucky Me! Pancit Canton (Caldereta)', sku: 'LMPC-001', batch_number: 'B-2401', expiry_date: d(2), days_left: 2, quantity: 48, status: 'Active' },
    { batch_id: 2, product_name: 'Nestle All Purpose Cream 250ml', sku: 'NAP-250', batch_number: 'B-2402', expiry_date: d(4), days_left: 4, quantity: 12, status: 'Active' },
    { batch_id: 3, product_name: 'Gardenia Whole Wheat Bread', sku: 'GWW-400', batch_number: 'B-2403', expiry_date: d(8), days_left: 8, quantity: 5, status: 'Active' },
    { batch_id: 4, product_name: 'Coke 1.5L', sku: 'COKE-15', batch_number: 'B-2404', expiry_date: d(15), days_left: 15, quantity: 30, status: 'Active' },
    { batch_id: 5, product_name: 'Bear Brand Powdered Milk 900g', sku: 'BBP-900', batch_number: 'B-2405', expiry_date: d(-1), days_left: -1, quantity: 8, status: 'Expired' },
    { batch_id: 6, product_name: 'Mega Sardines Tomato 155g', sku: 'MST-155', batch_number: 'B-2406', expiry_date: d(3), days_left: 3, quantity: 60, status: 'Active' },
    { batch_id: 7, product_name: 'Palmolive Shampoo 200ml', sku: 'PLM-200', batch_number: 'B-2407', expiry_date: d(20), days_left: 20, quantity: 24, status: 'Active' },
    { batch_id: 8, product_name: 'Del Monte Pineapple Tidbits', sku: 'DMP-432', batch_number: 'B-2408', expiry_date: d(1), days_left: 1, quantity: 36, status: 'Active' },
    { batch_id: 9, product_name: 'Lucky Me! Pancit Canton (Caldereta)', sku: 'LMPC-001', batch_number: 'B-2409', expiry_date: d(40), days_left: 40, quantity: 120, status: 'Active' },
    { batch_id: 10, product_name: 'Nestle All Purpose Cream 250ml', sku: 'NAP-250', batch_number: 'B-2410', expiry_date: d(60), days_left: 60, quantity: 72, status: 'Active' },
    { batch_id: 11, product_name: 'Coke 1.5L', sku: 'COKE-15', batch_number: 'B-2411', expiry_date: d(10), days_left: 10, quantity: 48, status: 'Active' },
    { batch_id: 12, product_name: 'Bear Brand Powdered Milk 900g', sku: 'BBP-900', batch_number: 'B-2412', expiry_date: d(7), days_left: 7, quantity: 15, status: 'Active' },
  ];
})();

function getStatusLabel(days: number): { label: string; cls: string } {
  if (days <= 5 && days >= 0) return { label: 'Critical', cls: 'bg-red-50 text-red-700' };
  if (days <= 14 && days >= 0) return { label: 'Warning', cls: 'bg-orange-50 text-orange-700' };
  if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700 line-through' };
  return { label: 'Healthy', cls: 'bg-green-50 text-green-700' };
}

function getActionLabel(days: number): string {
  if (days <= 5 && days >= 0) return 'Flag for Clearance';
  if (days <= 14 && days >= 0) return 'Notify Cashier';
  if (days < 0) return 'Dispose';
  return 'Monitor';
}

export function FEFOTracking() {
  const { toasts, dismiss, success } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [mockBatches, setMockBatches] = useState<MockBatch[]>(MOCK_BATCHES);
  const [confirmBatch, setConfirmBatch] = useState<{ batchId: number; action: string } | null>(null);

  const filteredAll = useMemo(() => {
    const q = search.toLowerCase();
    return mockBatches.filter(b =>
      b.product_name.toLowerCase().includes(q) ||
      b.sku.toLowerCase().includes(q) ||
      b.batch_number?.toLowerCase().includes(q) ||
      String(b.batch_id).includes(q)
    );
  }, [mockBatches, search]);

  const handleApply = async () => {
    if (!confirmBatch) return;
    await new Promise(r => setTimeout(r, 400));
    setMockBatches(prev => prev.filter(b => b.batch_id !== confirmBatch.batchId));
    success(`FEFO directive applied for batch #${confirmBatch.batchId}.`);
    setConfirmBatch(null);
  };

  const criticalCount = filteredAll.filter(b => b.days_left >= 0 && b.days_left <= 5).length;
  const totalPages = Math.ceil(filteredAll.length / pageSize);
  const filtered = filteredAll.slice((page - 1) * pageSize, page * pageSize);
  const showPagination = totalPages > 1;
  const totalEstimatedLoss = useMemo(() =>
    filteredAll.reduce((s, b) => b.days_left >= 0 && b.days_left <= 14 ? s + (b.quantity * 0.5) : s, 0),
  [filteredAll]);

  return (
    <div className="space-y-6 w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmBatch && (
        <ConfirmDialog
          message={`Apply "${confirmBatch.action === 'flag' ? 'Flag for Clearance' : confirmBatch.action === 'notify' ? 'Notify Cashier' : 'Clear'}" directive for batch #${confirmBatch.batchId}?`}
          confirmLabel="Apply Directive"
          onConfirm={handleApply}
          onCancel={() => setConfirmBatch(null)}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
              FEFO Batch Tracking
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B] dark:text-slate-400">
              First-Expired-First-Out monitoring &mdash; prioritise near-expiry stock to minimise write-offs
            </p>
          </div>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="mt-1 h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              First-Expired-First-Out batch tracking with dynamic urgency status to minimise write-offs.
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{criticalCount}</p>
            <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400">Critical Batches</p>
            <p className="text-[10px] text-red-600 dark:text-red-400">Expire in &le;5 days</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30">
            <DollarSign className="h-5 w-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{mockBatches.length}</p>
            <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400">Total Batches</p>
            <p className="text-[10px] text-green-700 dark:text-green-400">Across all products</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">{mockBatches.filter(b => b.days_left >= 0 && b.days_left <= 7).length}</p>
            <p className="text-xs font-semibold text-[#64748B] dark:text-slate-400">Expiring in 7 Days</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">Requires immediate action</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-white/10 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
            Batch Register
            <span className="ml-2 text-xs font-normal text-[#64748B] dark:text-slate-400">({filteredAll.length} batches)</span>
          </span>
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              placeholder="Search product, SKU, or batch..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border-b border-[#E5E7EB] dark:border-white/10">
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Batch #</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Days Left</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <PackageX className="h-8 w-8 text-[#64748B] dark:text-slate-500" />
                        <span className="text-sm font-medium text-[#64748B] dark:text-slate-400">No batches found</span>
                        <span className="text-xs text-[#94A3B8] dark:text-slate-500">Try adjusting your search</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const { label, cls } = getStatusLabel(b.days_left);
                    const daysLeft = b.days_left;

                    return (
                      <tr key={b.batch_id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[#0F172A] dark:text-slate-100">{b.product_name}</div>
                          <div className="text-[10px] font-mono text-[#64748B] dark:text-slate-400">{b.sku}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#64748B] dark:text-slate-400">
                          {b.batch_number ?? `BATCH-${b.batch_id}`}
                        </td>
                        <td className="px-4 py-3.5 text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          {new Date(b.expiry_date).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A] whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                            daysLeft <= 5 ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                            daysLeft <= 14 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' :
                            'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                          }`}>
                            {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[#0F172A] dark:text-slate-100">{b.quantity}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="relative inline-flex items-center gap-0.5">
                            {b.days_left < 0 ? (
                              <span className="text-xs text-[#64748B] dark:text-slate-400 italic">Expired</span>
                            ) : (
                                <button
                                  onClick={() => {
                                    const action = daysLeft <= 5 ? 'flag' : 'notify';
                                    setConfirmBatch({ batchId: b.batch_id, action });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#0F766E] hover:bg-[#0d6660] text-white px-3 py-1.5 text-xs font-semibold transition-colors"
                                >
                                  {getActionLabel(daysLeft)}
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 px-5 py-3 shadow-sm text-xs text-[#64748B] dark:text-slate-400">
        <span className="font-semibold text-[#0F172A] dark:text-slate-100">Status Legend:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-700 dark:text-red-400 font-medium">Critical</span> &mdash; &le;5 days
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-amber-700 dark:text-amber-400 font-medium">Warning</span> &mdash; 6&ndash;14 days
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <span className="text-green-700 dark:text-green-400 font-medium">Healthy</span> &mdash; &gt;14 days
        </span>
      </div>
    </div>
  );
}