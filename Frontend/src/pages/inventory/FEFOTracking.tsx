import React, { useState } from 'react';
import { Info, Search, TrendingDown, DollarSign, ShieldCheck } from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

function getStatusLabel(days: number): { label: string; cls: string } {
  if (days <= 5) return { label: 'Critical', cls: 'bg-red-50 text-red-700' };
  if (days <= 14) return { label: 'Warning', cls: 'bg-orange-50 text-orange-700' };
  return { label: 'Healthy', cls: 'bg-green-50 text-green-700' };
}

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getRecommendedAction(days: number): string {
  if (days <= 5) return 'Move to Front Shelf';
  if (days <= 14) return 'Apply 20% Discount';
  return 'Monitor Stock';
}

function getActionColor(days: number): string {
  if (days <= 5) return 'text-red-600 font-semibold';
  if (days <= 14) return 'text-amber-600 font-semibold';
  return 'text-[#64748B]';
}

export function FEFOTracking() {
  const { data, loading } = useDashboardData();
  const { toasts, dismiss, success } = useToast();

  const [search, setSearch] = useState('');
  const [confirmBatch, setConfirmBatch] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const batches = data?.batchFEFO ?? [];

  const filtered = batches.filter(b => {
    const q = search.toLowerCase();
    return b.batchId.toLowerCase().includes(q);
  });

  const handleConfirm = () => {
    if (!confirmBatch) return;
    setApplied(prev => new Set(prev).add(confirmBatch));
    success(`FEFO directive applied for batch "${confirmBatch}".`);
    setConfirmBatch(null);
  };

  const criticalCount = filtered.filter(b => b.daysToExpiry <= 5).length;

  return (
    <div className="space-y-6 w-full min-h-screen bg-[#F8FAFC] p-1">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmBatch && (
        <ConfirmDialog
          message={`Apply FEFO directive for batch "${confirmBatch}"? This will prioritise this batch for immediate shelf rotation.`}
          confirmLabel="Apply Directive"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmBatch(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              FEFO Batch Tracking
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              First-Expired-First-Out monitoring &mdash; prioritise near-expiry stock to minimise write-offs
            </p>
          </div>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="mt-1 h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              First-Expired-First-Out batch tracking with dynamic price decay and urgency status to minimise write-offs.
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Critical Batches */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A]">{criticalCount}</p>
            <p className="text-xs font-semibold text-[#64748B]">Critical Batches</p>
            <p className="text-[10px] text-red-600">Expire in &le;5 days</p>
          </div>
        </div>

        {/* Estimated Revenue Saved */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <DollarSign className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A]">&#8369;48,200</p>
            <p className="text-xs font-semibold text-[#64748B]">Estimated Revenue Saved</p>
            <p className="text-[10px] text-green-700">Through FEFO directives</p>
          </div>
        </div>

        {/* Potential Loss Avoided */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0F172A]">&#8369;23,500</p>
            <p className="text-xs font-semibold text-[#64748B]">Potential Loss Avoided</p>
            <p className="text-[10px] text-blue-600">Write-off prevention</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-[#0F172A]">
            Batch Register
            <span className="ml-2 text-xs font-normal text-[#64748B]">({filtered.length} batches)</span>
          </span>
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] pointer-events-none" />
            <input
              type="text"
              placeholder="Search batch ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#64748B] text-sm gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading batches&hellip;
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Batch ID</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Days Left</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Current Price</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Rec. Price</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Est. Loss</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Recommended Action</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-[#64748B]">
                      No batches found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, index) => {
                    const { label, cls } = getStatusLabel(b.daysToExpiry);
                    const isApplied = applied.has(b.batchId);
                    const quantity = 50 + index * 15;
                    const estimatedLoss = quantity * (b.currentPrice - b.recommendedPrice);
                    const recommendedAction = getRecommendedAction(b.daysToExpiry);
                    const actionColor = getActionColor(b.daysToExpiry);
                    const isDropdownOpen = openDropdown === b.batchId;

                    return (
                      <tr
                        key={b.batchId}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        {/* Batch ID */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                          {b.batchId}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-4 py-3.5 text-[#64748B] whitespace-nowrap">
                          {new Date(b.expiryDate).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Days Left */}
                        <td className="px-4 py-3.5 font-semibold text-[#0F172A] whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                              b.daysToExpiry <= 5
                                ? 'bg-red-50 text-red-700'
                                : b.daysToExpiry <= 14
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {b.daysToExpiry}d
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3.5 text-[#0F172A] whitespace-nowrap">
                          {quantity}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
                            {label}
                          </span>
                        </td>

                        {/* Current Price */}
                        <td className="px-4 py-3.5 text-[#64748B] whitespace-nowrap">
                          {currencyFormatter.format(b.currentPrice)}
                        </td>

                        {/* Rec. Price */}
                        <td className="px-4 py-3.5 font-semibold text-[#0F766E] whitespace-nowrap">
                          {currencyFormatter.format(b.recommendedPrice)}
                        </td>

                        {/* Est. Loss */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={estimatedLoss > 0 ? 'text-red-600 font-semibold' : 'text-[#64748B]'}>
                            {estimatedLoss > 0
                              ? currencyFormatter.format(estimatedLoss)
                              : '—'}
                          </span>
                        </td>

                        {/* Recommended Action */}
                        <td className={`px-4 py-3.5 whitespace-nowrap ${actionColor}`}>
                          {recommendedAction}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 px-2.5 py-1 text-xs font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Applied
                            </span>
                          ) : (
                            <div className="relative inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setConfirmBatch(b.batchId)}
                                className="inline-flex items-center gap-1 rounded-l-lg bg-[#0F766E] hover:bg-[#0d6660] text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
                              >
                                Apply Directive
                              </button>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(isDropdownOpen ? null : b.batchId);
                                  }}
                                  className="inline-flex items-center justify-center rounded-r-lg border-l border-[#0d6660] bg-[#0F766E] hover:bg-[#0d6660] text-white px-1.5 py-1.5 text-xs font-semibold transition-colors h-full"
                                  title="More options"
                                >
                                  &#9660;
                                </button>
                                {isDropdownOpen && (
                                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-[#E5E7EB] bg-white shadow-lg py-1">
                                    {[
                                      'Notify Cashier',
                                      'Mark Priority',
                                      'Transfer to Clearance',
                                    ].map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          success(`${opt} for batch "${b.batchId}".`);
                                          setOpenDropdown(null);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-xs text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
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

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-3 shadow-sm text-xs text-[#64748B]">
        <span className="font-semibold text-[#0F172A]">Status Legend:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-700 font-medium">Critical</span>
          &mdash; &le;5 days
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-amber-700 font-medium">Warning</span>
          &mdash; 6&ndash;14 days
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <span className="text-green-700 font-medium">Healthy</span>
          &mdash; &gt;14 days
        </span>
      </div>
    </div>
  );
}
