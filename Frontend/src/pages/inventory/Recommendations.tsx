import React, { useState } from 'react';
import { Info, Search, CheckCircle, TrendingDown, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal } from '../../components/ui/Toast';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getStatusLabel(days: number): { label: string; urgencyClass: string; dotColor: string } {
  if (days <= 5) return { label: 'Critical', urgencyClass: 'bg-red-50 text-red-700 border border-red-200', dotColor: 'bg-red-500' };
  if (days <= 14) return { label: 'Warning', urgencyClass: 'bg-amber-50 text-amber-700 border border-amber-200', dotColor: 'bg-amber-500' };
  return { label: 'Healthy', urgencyClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotColor: 'bg-emerald-500' };
}

function getAIReason(days: number): string {
  if (days <= 5) return 'High remaining stock. Expires critically soon. Immediate action required.';
  if (days <= 14) return 'Moderate stock with upcoming expiry. Discount recommended to accelerate sales.';
  return 'Stock within normal parameters. Monitor for demand changes.';
}

const WORKFLOW_STEPS = [
  { label: 'System Recommendation', active: false },
  { label: 'Inventory Staff Reviews', active: true },
  { label: 'Approve or Reject', active: false },
  { label: 'POS Updates', active: false },
  { label: 'Promo Activated', active: false },
];

export function Recommendations() {
  const { data, loading } = useDashboardData();
  const { toasts, dismiss, success } = useToast();

  const [search, setSearch] = useState('');
  const [confirmBatch, setConfirmBatch] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [selectedBatch, setSelectedBatch] = useState<{ batch: any, mockStock: number, index: number } | null>(null);
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

  const pendingCount = filtered.length - applied.size;
  const approvedCount = applied.size;

  return (
    <div className="space-y-6 w-full bg-[#F8FAFC] min-h-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmBatch && (
        <ConfirmDialog
          message={`Apply a promotional price for batch "${confirmBatch}"? The recommended price will be used to accelerate sales and reduce waste.`}
          confirmLabel="Apply Promo"
          onConfirm={handleConfirmPromo}
          onCancel={() => setConfirmBatch(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A]">System Recommendations</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              System-generated FEFO batch recommendations. Apply promotional pricing to reduce near-expiry waste and recover revenue.
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-sm text-[#64748B]">
          Review and act on system-generated pricing and stock actions to minimise waste and recover revenue
        </p>
      </div>

      {/* Workflow Banner */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-5 py-4">
        <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">Approval Workflow</p>
        <div className="flex items-center flex-wrap gap-1">
          {WORKFLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step.label}>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  step.active
                    ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                    : 'bg-slate-50 text-[#64748B] border-[#E5E7EB]'
                }`}
              >
                {step.active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5 align-middle" />}
                {step.label}
              </span>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-orange-100 flex-shrink-0">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-orange-700 mt-0.5">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-emerald-100 flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{approvedCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-blue-100 flex-shrink-0">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Revenue Protected</p>
            <p className="text-2xl font-black text-blue-700 mt-0.5">&#8369;48,200</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search batch ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all shadow-sm"
        />
      </div>

      {/* Table View */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm h-48 animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="rounded-full bg-emerald-50 p-5">
            <CheckCircle className="h-10 w-10 text-[#0F766E]" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#0F172A]">All recommendations reviewed</p>
            <p className="text-sm text-[#64748B] mt-1">No pending batches match your current search.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-[#64748B] border-b border-[#E5E7EB] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Batch ID</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Expiry</th>
                  <th className="px-5 py-3">Cur. Price</th>
                  <th className="px-5 py-3">Rec. Price</th>
                  <th className="px-5 py-3">Rev. Saved</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((b, index) => {
                  const { label, urgencyClass, dotColor } = getStatusLabel(b.daysToExpiry);
                  const isApplied = applied.has(b.batchId);
                  const mockStock = 50 + index * 15;
                  const revenueSaved = Math.round((b.currentPrice - b.recommendedPrice) * mockStock);

                  return (
                    <tr 
                      key={b.batchId} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBatch({ batch: b, mockStock, index })}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-[#0F172A]">
                          {b.batchId}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${urgencyClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#0F172A]">
                        {b.daysToExpiry} days
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 line-through">
                        {currencyFormatter.format(b.currentPrice)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#0F766E]">
                        {currencyFormatter.format(b.recommendedPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-[#0F766E]">
                        +{currencyFormatter.format(revenueSaved)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5" /> Applied
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBatch({ batch: b, mockStock, index });
                            }}
                            className="text-xs font-semibold text-[#0F766E] hover:text-[#0b5c56] border border-[#0F766E]/20 bg-[#0F766E]/5 hover:bg-[#0F766E]/10 rounded-lg px-3 py-1.5 transition-all"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Batch Details */}
      {selectedBatch && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedBatch(null)}
          title={`Recommendation: Batch ${selectedBatch.batch.batchId}`}
        >
          <div className="space-y-6">
            {/* Urgency Badge */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Batch Details</p>
              {(() => {
                const { label, urgencyClass, dotColor } = getStatusLabel(selectedBatch.batch.daysToExpiry);
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${urgencyClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    {label}
                  </span>
                );
              })()}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Col */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Days Until Expiry</p>
                  <p className={`text-base font-bold mt-0.5 ${selectedBatch.batch.daysToExpiry <= 5 ? 'text-red-600' : selectedBatch.batch.daysToExpiry <= 14 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedBatch.batch.daysToExpiry} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Current Stock</p>
                  <p className="text-base font-semibold text-[#0F172A] mt-0.5">{selectedBatch.mockStock} units</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-[11px] font-bold text-blue-700 mb-1.5 flex items-center gap-1.5">
                    <span className="text-sm">&#128200;</span> System Insight
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    {getAIReason(selectedBatch.batch.daysToExpiry)}
                  </p>
                </div>
              </div>

              {/* Right Col */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Current Price</p>
                    <p className="text-base text-slate-400 mt-0.5 line-through">{currencyFormatter.format(selectedBatch.batch.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Rec. Price</p>
                    <p className="text-xl font-black text-[#0F766E] mt-0.5">{currencyFormatter.format(selectedBatch.batch.recommendedPrice)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Est. Sell-through</p>
                  {(() => {
                    const sellThrough = Math.max(0, Math.round(85 - selectedBatch.batch.daysToExpiry * 2));
                    return (
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 rounded-full bg-slate-100 h-2">
                          <div
                            className="h-2 rounded-full bg-[#0F766E]"
                            style={{ width: `${Math.min(100, sellThrough)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-[#0F766E]">{sellThrough}%</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Revenue Saved</p>
                    <p className="text-sm font-bold text-[#0F766E] mt-0.5">
                      +{currencyFormatter.format((selectedBatch.batch.currentPrice - selectedBatch.batch.recommendedPrice) * selectedBatch.mockStock)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Loss Avoided</p>
                    <p className="text-sm font-bold text-blue-600 mt-0.5">
                      {currencyFormatter.format(selectedBatch.batch.recommendedPrice * selectedBatch.mockStock * 0.3)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#F1F5F9]">
              {applied.has(selectedBatch.batch.batchId) ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm py-3.5">
                  <CheckCircle className="h-5 w-5" />
                  Recommendation Applied
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setConfirmBatch(selectedBatch.batch.batchId);
                      setSelectedBatch(null);
                    }}
                    className="flex-1 text-sm font-bold text-white rounded-xl py-3 transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
                    style={{ background: '#0F766E' }}
                  >
                    Approve Promotion
                  </button>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="flex-1 text-sm font-bold rounded-xl py-3 border-2 border-[#E5E7EB] text-[#64748B] hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
