import React, { useState, useMemo } from 'react';
import { Info, Search, CheckCircle, TrendingDown, DollarSign, Clock, ChevronRight, X } from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
type MockRecommendation = {
  recommendation_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  recommended_stock: number;
  confidence_score: number;
  recommendation_type: string;
  status: string;
  rejection_reason?: string;
  reviewed_by?: string;
};

const MOCK_RECS: MockRecommendation[] = [
  { recommendation_id: 1, product_name: 'Lucky Me! Pancit Canton (Caldereta)', sku: 'LMPC-001', category: 'Instant Noodles', current_stock: 8, recommended_stock: 120, confidence_score: 0.94, recommendation_type: 'Restock', status: 'pending' },
  { recommendation_id: 2, product_name: 'Nestle All Purpose Cream 250ml', sku: 'NAP-250', category: 'Dairy', current_stock: 4, recommended_stock: 80, confidence_score: 0.91, recommendation_type: 'Restock', status: 'pending' },
  { recommendation_id: 3, product_name: 'Mega Sardines Tomato 155g', sku: 'MST-155', category: 'Canned Goods', current_stock: 200, recommended_stock: 50, confidence_score: 0.87, recommendation_type: 'Reduce Stock', status: 'pending' },
  { recommendation_id: 4, product_name: 'Coke 1.5L', sku: 'COKE-15', category: 'Beverages', current_stock: 45, recommended_stock: 45, confidence_score: 0.82, recommendation_type: 'Maintain', status: 'approved', reviewed_by: 'Inventory Staff' },
  { recommendation_id: 5, product_name: 'Gardenia Whole Wheat Bread', sku: 'GWW-400', category: 'Bakery', current_stock: 3, recommended_stock: 60, confidence_score: 0.93, recommendation_type: 'Restock', status: 'pending' },
  { recommendation_id: 6, product_name: 'Del Monte Pineapple Tidbits', sku: 'DMP-432', category: 'Canned Goods', current_stock: 150, recommended_stock: 30, confidence_score: 0.78, recommendation_type: 'Reduce Stock', status: 'rejected', rejection_reason: 'Stock level is sufficient for current demand.', reviewed_by: 'Senior Inventory Staff' },
  { recommendation_id: 7, product_name: 'Bear Brand Powdered Milk 900g', sku: 'BBP-900', category: 'Dairy', current_stock: 18, recommended_stock: 90, confidence_score: 0.88, recommendation_type: 'Restock', status: 'pending' },
  { recommendation_id: 8, product_name: 'Palmolive Shampoo 200ml', sku: 'PLM-200', category: 'Personal Care', current_stock: 12, recommended_stock: 70, confidence_score: 0.85, recommendation_type: 'Restock', status: 'pending' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

function getTypeLabel(type: string): { label: string; cls: string } {
  if (type === 'Restock') return { label: 'Restock', cls: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' };
  if (type === 'Reduce Stock') return { label: 'Reduce', cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' };
  return { label: 'Maintain', cls: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' };
}

function getStatusBadge(status: string): { label: string; cls: string } {
  if (status === 'approved') return { label: 'Approved', cls: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' };
  if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' };
  return { label: 'Pending', cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' };
}

const WORKFLOW_STEPS = [
  { label: 'System Recommendation', active: false },
  { label: 'Inventory Staff Reviews', active: true },
  { label: 'Approve or Reject', active: false },
  { label: 'POS Updates', active: false },
  { label: 'Promo Activated', active: false },
];

export function Recommendations() {
  const { toasts, dismiss, success } = useToast();

  const [mockRecs, setMockRecs] = useState<MockRecommendation[]>(MOCK_RECS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRec, setSelectedRec] = useState<MockRecommendation | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const filtered = useMemo(() => {
    let list = mockRecs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.product_name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    return list;
  }, [mockRecs, search, statusFilter]);

  const pendingCount = mockRecs.filter(r => r.status === 'pending').length;
  const approvedCount = mockRecs.filter(r => r.status === 'approved').length;
  const rejectedCount = mockRecs.filter(r => r.status === 'rejected').length;

  const handleApprove = async () => {
    if (confirmApprove === null) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 600));
    setMockRecs(prev => prev.map(r =>
      r.recommendation_id === confirmApprove
        ? { ...r, status: 'approved', reviewed_by: 'Inventory Staff' }
        : r
    ));
    success('Recommendation approved.');
    setProcessing(false);
    setConfirmApprove(null);
    setSelectedRec(null);
  };

  const handleReject = async () => {
    if (rejectingId === null || !rejectReason.trim()) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 600));
    setMockRecs(prev => prev.map(r =>
      r.recommendation_id === rejectingId
        ? { ...r, status: 'rejected', rejection_reason: rejectReason.trim(), reviewed_by: 'Inventory Staff' }
        : r
    ));
    success('Recommendation rejected.');
    setProcessing(false);
    setRejectingId(null);
    setRejectReason('');
    setSelectedRec(null);
  };

  return (
    <div className="space-y-6 w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmApprove !== null && (
        <ConfirmDialog
          message="Are you sure you want to approve this recommendation? This will apply the suggested stock action."
          confirmLabel="Approve"
          onConfirm={handleApprove}
          onCancel={() => setConfirmApprove(null)}
        />
      )}

      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Reject Recommendation</h3>
              <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this recommendation is being rejected..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white dark:bg-slate-900 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E] resize-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectReason.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">System Recommendations</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              Review and act on system-generated stock recommendations to optimise inventory levels.
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-sm text-[#64748B] dark:text-slate-400 dark:text-slate-500">
          Review and act on system-generated stock actions to optimise inventory levels and reduce waste
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-sm px-5 py-4">
        <p className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Approval Workflow</p>
        <div className="flex items-center flex-wrap gap-1">
          {WORKFLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step.label}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                step.active ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 dark:text-slate-500 border-[#E5E7EB] dark:border-white/10'
              }`}>
                {step.active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900 mr-1.5 align-middle" />}
                {step.label}
              </span>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-500 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-0.5">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{approvedCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-red-100 dark:bg-red-900/40 flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-0.5">{rejectedCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search product or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 text-[#374151] dark:text-slate-300 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 text-[#374151] dark:text-slate-300 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-sm">
          <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-5">
            <CheckCircle className="h-10 w-10 text-[#0F766E]" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#0F172A] dark:text-slate-100">No recommendations found</p>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-[#64748B] dark:text-slate-400 border-b border-[#E5E7EB] dark:border-white/10 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Cur. Stock</th>
                  <th className="px-5 py-3">Rec. Stock</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {filtered.map(r => {
                  const { label: typeLabel, cls: typeCls } = getTypeLabel(r.recommendation_type);
                  const { label: statusLabel, cls: statusCls } = getStatusBadge(r.status);

                  return (
                    <tr
                      key={r.recommendation_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRec(r)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#0F172A] dark:text-slate-100">{r.product_name}</div>
                        <div className="text-[10px] font-mono text-[#64748B] dark:text-slate-400">{r.sku}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${typeCls}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#0F172A] dark:text-slate-100">{r.current_stock}</td>
                      <td className="px-5 py-3.5 font-semibold text-[#0F766E]">{r.recommended_stock}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-[#0F172A] dark:text-slate-100">
                          {Math.round(r.confidence_score * 100)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'pending' ? (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmApprove(r.recommendation_id); }}
                              className="text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0b5c56] rounded-lg px-3 py-1.5 transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRejectingId(r.recommendation_id); }}
                              className="text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 transition-all"
                            >
                              Reject
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-[#64748B] dark:text-slate-400">
                            {r.status === 'approved' ? 'Approved' : 'Rejected'}
                            {r.reviewed_by ? ` by ${r.reviewed_by}` : ''}
                          </span>
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

      {selectedRec && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRec(null)}
          title={`Recommendation: ${selectedRec.product_name}`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-white/10 pb-4">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Recommendation Details</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getTypeLabel(selectedRec.recommendation_type).cls}`}>
                {getTypeLabel(selectedRec.recommendation_type).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">SKU</p>
                  <p className="text-sm font-mono font-semibold text-[#0F172A] dark:text-slate-100 mt-0.5">{selectedRec.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Category</p>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mt-0.5">{selectedRec.category}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Current Stock</p>
                  <p className="text-lg font-bold text-[#0F172A] dark:text-slate-100 mt-0.5">{selectedRec.current_stock}</p>
                </div>
                {selectedRec.rejection_reason && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4">
                    <p className="text-[11px] font-bold text-red-700 dark:text-red-300 mb-1">Rejection Reason</p>
                    <p className="text-xs text-red-800 dark:text-red-200">{selectedRec.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Recommended Stock</p>
                  <p className="text-xl font-black text-[#0F766E] mt-0.5">{selectedRec.recommended_stock}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Confidence Score</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-700 h-2">
                      <div className="h-2 rounded-full bg-[#0F766E]" style={{ width: `${Math.round(selectedRec.confidence_score * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-[#0F766E]">{Math.round(selectedRec.confidence_score * 100)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Status</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold mt-1 ${getStatusBadge(selectedRec.status).cls}`}>
                    {getStatusBadge(selectedRec.status).label}
                  </span>
                </div>
                {selectedRec.reviewed_by && (
                  <div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Reviewed By</p>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mt-0.5">{selectedRec.reviewed_by}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedRec.status === 'pending' && (
              <div className="pt-4 border-t border-[#F1F5F9] dark:border-white/10 flex gap-3">
                <button
                  onClick={() => { setConfirmApprove(selectedRec.recommendation_id); }}
                  className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-[#0F766E] hover:opacity-90 transition-all shadow-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => { setRejectingId(selectedRec.recommendation_id); setSelectedRec(null); }}
                  className="flex-1 text-sm font-bold rounded-xl py-3 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}