import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getStatusLabel(days: number): { label: string; cls: string } {
  if (days <= 5) return { label: 'Urgent', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' };
  if (days <= 14) return { label: 'Soon', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' };
  return { label: 'Stable', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' };
}

export function Recommendations() {
  const { data, loading } = useDashboardData();
  const { toasts, dismiss, success } = useToast();

  const [search, setSearch] = useState('');
  const [confirmBatch, setConfirmBatch] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const batches = data?.batchFEFO ?? [];

  const filtered = batches.filter(b => {
    const q = search.toLowerCase();
    return b.batchId.toLowerCase().includes(q);
  });

  const handleConfirmPromo = () => {
    if (!confirmBatch) return;
    setApplied(prev => new Set(prev).add(confirmBatch));
    success(`Promo applied for batch "${confirmBatch}". Price updated to recommended level.`);
    setConfirmBatch(null);
  };

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmBatch && (
        <ConfirmDialog
          message={`Apply a promotional price for batch "${confirmBatch}"? The recommended price will be used to accelerate sales and reduce waste.`}
          confirmLabel="Apply Promo"
          onConfirm={handleConfirmPromo}
          onCancel={() => setConfirmBatch(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recommendations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          AI-driven FEFO batch recommendations. Apply promotional pricing to reduce near-expiry waste.
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-[#006a61]/20 bg-[#006a61]/5 dark:bg-[#006a61]/10 px-5 py-4">
        <p className="text-xs text-[#006a61] dark:text-emerald-400 font-medium leading-relaxed">
          <span className="font-bold">How it works:</span> WiWaste analyses batch expiry dates and decay rates to recommend optimised promotional prices. Applying a promo reduces write-off risk and recovers revenue before stock expires.
        </p>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Batch Recommendations
            <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} batches)</span>
          </span>
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search batch ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading recommendations…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3 text-left font-semibold">Batch ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Expiry Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Days Left</th>
                  <th className="px-5 py-3 text-left font-semibold">Urgency</th>
                  <th className="px-5 py-3 text-left font-semibold">Current Price</th>
                  <th className="px-5 py-3 text-left font-semibold">Promo Price</th>
                  <th className="px-5 py-3 text-left font-semibold">Savings Risk</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500">
                      No recommendations found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(b => {
                    const { label, cls } = getStatusLabel(b.daysToExpiry);
                    const isApplied = applied.has(b.batchId);
                    const savingsRisk = b.currentPrice - b.recommendedPrice;
                    return (
                      <tr key={b.batchId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {b.batchId}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {new Date(b.expiryDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                          {b.daysToExpiry}d
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${cls}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {currencyFormatter.format(b.currentPrice)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#006a61] dark:text-emerald-400">
                          {currencyFormatter.format(b.recommendedPrice)}
                        </td>
                        <td className="px-5 py-3.5 text-rose-600 dark:text-rose-400 font-medium">
                          -{currencyFormatter.format(savingsRisk)}
                        </td>
                        <td className="px-5 py-3.5">
                          {isApplied ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-semibold">
                              Applied
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmBatch(b.batchId)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
                            >
                              Apply Promo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
