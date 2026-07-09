import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { Toast, useToast, FormField, inputCls } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const REASONS = ['Sales Dispatch', 'Spoilage', 'Transfer', 'Return to Supplier'] as const;
type Reason = typeof REASONS[number];

interface StockOutRecord {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  reason: Reason;
  dispatchedDate: string;
}

const INITIAL_RECORDS: StockOutRecord[] = [
  {
    id: '1',
    itemName: 'Lucky Me! Pancit Canton',
    sku: 'LM-PC-80',
    qty: 60,
    reason: 'Sales Dispatch',
    dispatchedDate: '2026-07-08',
  },
  {
    id: '2',
    itemName: 'Neozep Forte Tablet',
    sku: 'NZ-FT-10',
    qty: 20,
    reason: 'Spoilage',
    dispatchedDate: '2026-07-07',
  },
  {
    id: '3',
    itemName: 'Tide Powder Detergent Sachet',
    sku: 'TD-PD-60',
    qty: 50,
    reason: 'Transfer',
    dispatchedDate: '2026-07-07',
  },
  {
    id: '4',
    itemName: 'Purefoods Tender Juicy Hotdog',
    sku: 'PF-TJ-500',
    qty: 15,
    reason: 'Return to Supplier',
    dispatchedDate: '2026-07-06',
  },
];

const emptyForm = {
  itemName: '',
  sku: '',
  qty: '',
  reason: '' as Reason | '',
  dispatchedDate: '',
};

const REASON_COLORS: Record<Reason, string> = {
  'Sales Dispatch': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  Spoilage: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  Transfer: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'Return to Supplier': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
};

export function StockOut() {
  const { toasts, dismiss, success } = useToast();

  const [records, setRecords] = useState<StockOutRecord[]>(INITIAL_RECORDS);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState<Reason | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const setField =
    (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { itemName, sku, qty, reason, dispatchedDate } = form;

    if (!itemName.trim() || !sku.trim() || !qty || !reason || !dispatchedDate) {
      setFormError('All fields are required.');
      return;
    }
    if (Number(qty) <= 0) {
      setFormError('Quantity must be greater than 0.');
      return;
    }

    setFormError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const newRecord: StockOutRecord = {
      id: String(Date.now()),
      itemName: itemName.trim(),
      sku: sku.trim().toUpperCase(),
      qty: Number(qty),
      reason: reason as Reason,
      dispatchedDate,
    };

    setRecords(prev => [newRecord, ...prev]);
    setForm(emptyForm);
    setSubmitting(false);
    success(`Stock-out recorded for "${newRecord.itemName}" — ${newRecord.qty} units dispatched.`);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      r.itemName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q);
    const matchReason = filterReason ? r.reason === filterReason : true;
    return matchSearch && matchReason;
  });

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Out Records</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Log dispatched, spoiled, transferred, or returned inventory items.
          </TooltipContent>
        </UITooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Form panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Log New Stock-Out</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label="Item Name">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Lucky Me! Pancit Canton"
                value={form.itemName}
                onChange={setField('itemName')}
                required
              />
            </FormField>

            <FormField label="SKU">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. LM-PC-80"
                value={form.sku}
                onChange={setField('sku')}
                required
              />
            </FormField>

            <FormField label="Quantity">
              <input
                type="number"
                min="1"
                className={inputCls}
                placeholder="e.g. 50"
                value={form.qty}
                onChange={setField('qty')}
                required
              />
            </FormField>

            <FormField label="Reason">
              <select
                className={inputCls}
                value={form.reason}
                onChange={setField('reason')}
                required
              >
                <option value="">Select a reason…</option>
                {REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Dispatched Date">
              <input
                type="date"
                className={inputCls}
                value={form.dispatchedDate}
                onChange={setField('dispatchedDate')}
                required
              />
            </FormField>

            {formError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {submitting ? 'Saving…' : 'Record Stock-Out'}
            </button>
          </form>
        </div>

        {/* History table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              History
              <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} records)</span>
            </span>
            <div className="flex items-center gap-2">
              {/* Reason filter */}
              <select
                value={filterReason}
                onChange={e => setFilterReason(e.target.value as Reason | '')}
                className="text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
              >
                <option value="">All Reasons</option>
                {REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {/* Search */}
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3 text-left font-semibold">Item / SKU</th>
                  <th className="px-5 py-3 text-left font-semibold">Qty</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Dispatched Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 dark:text-slate-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.itemName}</div>
                        <div className="text-slate-400 font-mono mt-0.5">{r.sku}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2 py-0.5 font-bold">
                          -{r.qty} units
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${REASON_COLORS[r.reason]}`}>
                          {r.reason}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.dispatchedDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
