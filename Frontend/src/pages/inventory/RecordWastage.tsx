import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, Trash2, Search, Loader2, Info, TrendingDown, BarChart2, PackageX, CheckCircle, ChevronDown } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { useApi } from '../../hooks/useApi';
import { products as productsApi, wastage as wastageApi, type ApiWastage } from '../../services/api';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function getReasonBadge(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('expired')) return 'bg-red-50 text-red-700 border border-red-100';
  if (r.includes('mould') || r.includes('spoilage') || r.includes('spillage')) return 'bg-orange-50 text-orange-700 border border-orange-100';
  if (r.includes('damaged') || r.includes('broken') || r.includes('seal') || r.includes('defect')) return 'bg-amber-50 text-amber-700 border border-amber-100';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

export function RecordWastage() {
  const { toasts, dismiss, success, error } = useToast();
  const { data: apiProducts } = useApi(productsApi.list);
  const { data: wastageRecords, loading, refetch } = useApi<ApiWastage[]>(wastageApi.list);

  const [search, setSearch] = useState('');
  
  const [itemQuery, setItemQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Expired on Shelf');
  const [submitting, setSubmitting] = useState(false);
  const [confirmData, setConfirmData] = useState<{ productId?: number; name: string; qty: number; unitCost: number; totalCost: number; reason: string } | null>(null);

  const catalogOptions = (apiProducts ?? []).map(p => ({ id: p.id, name: p.name, sku: p.sku, cost: p.cost_price }));

  const records = useMemo(() => (wastageRecords ?? []).map(r => ({
    id: String(r.id),
    name: r.product_name,
    sku: r.sku,
    qty: r.quantity,
    reason: r.wastage_type,
    cost: r.estimated_loss,
    recordedAt: r.date_recorded,
  })), [wastageRecords]);

  const matchingProducts = itemQuery.trim() === '' 
    ? catalogOptions 
    : catalogOptions.filter(p => 
        p.name.toLowerCase().includes(itemQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(itemQuery.toLowerCase()))
      );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProduct = (prod: { id: number; name: string; sku: string; cost: number }) => {
    setItemQuery(prod.name);
    setSelectedProductId(prod.id);
    setUnitCost(prod.cost);
    setShowDropdown(false);
  };

  const calculatedTotalLoss = (Number(qty) || 0) * unitCost;

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemQuery.trim() || !qty) {
      error('Please select an item and enter a quantity.');
      return;
    }
    if (Number(qty) <= 0) {
      error('Quantity must be greater than 0.');
      return;
    }
    setConfirmData({
      productId: selectedProductId ?? undefined,
      name: itemQuery.trim(),
      qty: Number(qty),
      unitCost: unitCost,
      totalCost: calculatedTotalLoss,
      reason,
    });
  };

  const handleConfirmSave = async () => {
    if (!confirmData) return;
    setSubmitting(true);

    try {
      if (confirmData.productId) {
        await wastageApi.record({
          product_id: confirmData.productId,
          wastage_type: confirmData.reason.includes('Expired') ? 'Expired' : confirmData.reason.includes('Damaged') ? 'Damaged' : confirmData.reason.includes('Spoil') ? 'Spoiled' : 'Lost',
          quantity: confirmData.qty,
          estimated_loss: confirmData.totalCost,
          date_recorded: new Date().toISOString().slice(0, 10),
        });
      }
    } catch (err: any) {
      setSubmitting(false);
      setConfirmData(null);
      error(err.message ?? 'Failed to record wastage. Please try again.');
      return;
    }

    await refetch();
    setItemQuery('');
    setSelectedProductId(null);
    setUnitCost(0);
    setQty('');
    setReason('Expired on Shelf');
    setConfirmData(null);
    setSubmitting(false);
    success('Loss record committed successfully.');
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);

  const todayLoss = wastageRecords?.filter(r => r.date_recorded >= todayStr).reduce((s, r) => s + r.estimated_loss, 0) ?? 0;
  const weeklyLoss = wastageRecords?.filter(r => r.date_recorded >= weekAgoStr).reduce((s, r) => s + r.estimated_loss, 0) ?? 0;
  const monthlyLoss = wastageRecords?.filter(r => r.date_recorded >= monthAgoStr).reduce((s, r) => s + r.estimated_loss, 0) ?? 0;

  const filteredRecords = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="space-y-6 w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-full font-sans">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmData && (
        <ConfirmDialog
          message={`Are you sure you want to log a wastage loss of ${confirmData.qty} units for "${confirmData.name}"? Total cost value is ${currencyFormatter.format(confirmData.totalCost)}.`}
          confirmLabel="Commit Loss"
          onConfirm={handleConfirmSave}
          onCancel={() => setConfirmData(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">Record Wastage</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white max-w-xs">
              Log inventory spoilage, shelf expirations, packaging ruptures, or vendor write-offs.
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Log inventory losses for audit, analytics, and cost recovery tracking
        </p>
      </div>

      {/* Loss Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-red-100 dark:bg-red-900/30 flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Today's Loss</p>
            <p className="text-xl font-black text-red-700 dark:text-red-300 mt-0.5">{currencyFormatter.format(todayLoss)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
            <BarChart2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">Weekly Loss</p>
            <p className="text-xl font-black text-orange-700 dark:text-orange-300 mt-0.5">{currencyFormatter.format(weeklyLoss)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center gap-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Monthly Loss</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{currencyFormatter.format(monthlyLoss)}</p>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* LEFT: Form Card with Live Search Autocomplete */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-sm p-6 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <div className="rounded-lg p-1.5 bg-red-50">
              <Trash2 className="h-4 w-4 text-red-600" />
            </div>
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Log Wastage Record</h2>
          </div>

          <form onSubmit={handleRecord} className="space-y-4">
            {/* Interactive Product Search Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">
                Search Registered Product Catalog
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type product name or SKU (e.g. Biogesic)..."
                  value={itemQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setItemQuery(e.target.value);
                    setSelectedProductId(null);
                    setShowDropdown(true);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 text-sm text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
                  required
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Autocomplete Search Dropdown Menu */}
              {showDropdown && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-white/5">
                  {matchingProducts.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No registered products match "{itemQuery}"
                    </div>
                  ) : (
                    matchingProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">{p.sku}</p>
                        </div>
                        <span className="font-bold text-[#0F766E] bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                          {currencyFormatter.format(p.cost)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 text-sm text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">Unit Cost (&#8369;)</label>
                <input
                  type="number"
                  placeholder="Auto-filled"
                  value={unitCost || ''}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 text-sm text-[#0F172A] dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300 mb-1.5">Wastage Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/10 text-sm text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
              >
                <option value="Expired on Shelf">Expired on Shelf</option>
                <option value="Damaged / Broken">Damaged / Broken</option>
                <option value="Spoilage / Mould">Spoilage / Mould</option>
                <option value="Broken Seal">Broken Seal</option>
                <option value="Supplier Defect">Supplier Defect</option>
                <option value="Spillage">Spillage</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {calculatedTotalLoss > 0 && (
              <div className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">Calculated Total Loss</span>
                <span className="text-sm font-black text-red-700 dark:text-red-300">
                  {currencyFormatter.format(calculatedTotalLoss)}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-lg py-3 mt-1 shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ background: submitting ? '#64748B' : '#0F766E' }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving...' : 'Commit Wastage Record'}
            </button>
          </form>
        </div>

        {/* RIGHT: Wastage Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Wastage Logs</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-white/10 text-xs text-[#374151] dark:text-slate-300 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-white/10">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Item</th>
                  <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Qty</th>
                  <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Loss Cost</th>
                  <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Reason</th>
                  <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-slate-100 p-4">
                          <PackageX className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#64748B]">No wastage records found</p>
                          <p className="text-xs mt-1 text-slate-400">Try adjusting your search or log a new record</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-[#0F172A] dark:text-slate-100">{r.name}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-[#DC2626]">-{r.qty}</span>
                        <span className="ml-1 text-[#64748B]">units</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#DC2626]">{currencyFormatter.format(r.cost)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${getReasonBadge(r.reason)}`}>
                          {r.reason}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#64748B] dark:text-slate-400">{r.recordedAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > 0 && (
            <div className="px-5 py-3 border-t border-[#E5E7EB] dark:border-white/10 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                Total Loss ({filteredRecords.length} items)
              </span>
              <span className="text-sm font-black text-[#DC2626]">
                {currencyFormatter.format(totalCost)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
