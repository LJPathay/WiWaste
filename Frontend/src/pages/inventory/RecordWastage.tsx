import React, { useState } from 'react';
import { AlertTriangle, Trash2, Search, Loader2, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Toast, useToast, ConfirmDialog, FormField, inputCls } from '../../components/ui/Toast';

interface WastageMock {
  id: string;
  name: string;
  qty: number;
  reason: string;
  cost: number;
  recordedAt: string;
}

const INITIAL_WASTAGE: WastageMock[] = [
  { id: '1', name: 'Anchor Salted Butter 225g', qty: 15, reason: 'Expired on Shelf', cost: 1875, recordedAt: '2026-07-08 08:24' },
  { id: '2', name: 'Del Monte Tomato Sauce 250g', qty: 8, reason: 'Expired on Shelf', cost: 260, recordedAt: '2026-07-08 07:10' },
  { id: '3', name: 'Gardenia Classic White Bread', qty: 6, reason: 'Mould/Spoilage', cost: 420, recordedAt: '2026-07-07 16:50' },
  { id: '4', name: 'Selecta Fortified Milk 1L', qty: 12, reason: 'Damaged Pack Leakage', cost: 1080, recordedAt: '2026-07-06 11:15' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export function RecordWastage() {
  const { toasts, dismiss, success, error } = useToast();
  const [records, setRecords] = useState<WastageMock[]>(INITIAL_WASTAGE);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('Expired on Shelf');
  const [submitting, setSubmitting] = useState(false);
  const [confirmData, setConfirmData] = useState<{ name: string; qty: number; cost: number; reason: string } | null>(null);

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !qty || !cost) {
      error('Please fill in all fields.');
      return;
    }
    if (Number(qty) <= 0 || Number(cost) < 0) {
      error('Invalid quantity or cost values.');
      return;
    }
    setConfirmData({
      name: name.trim(),
      qty: Number(qty),
      cost: Number(cost),
      reason,
    });
  };

  const handleConfirmSave = async () => {
    if (!confirmData) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    const newRecord: WastageMock = {
      id: String(Date.now()),
      name: confirmData.name,
      qty: confirmData.qty,
      reason: confirmData.reason,
      cost: confirmData.cost,
      recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setRecords([newRecord, ...records]);
    setName('');
    setQty('');
    setCost('');
    setReason('Expired on Shelf');
    setConfirmData(null);
    setSubmitting(false);
    success(`Loss record committed successfully for "${newRecord.name}".`);
  };

  const filteredRecords = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {confirmData && (
        <ConfirmDialog
          message={`Are you sure you want to log a wastage loss of ${confirmData.qty} units for "${confirmData.name}"? Total cost value is ${currencyFormatter.format(confirmData.cost)}.`}
          confirmLabel="Commit Loss"
          onConfirm={handleConfirmSave}
          onCancel={() => setConfirmData(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Record Wastage</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Log inventory spoilage, shelf expirations, packaging ruptures, or vendor write-offs.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-5 py-3 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider">Total Loss Value</div>
          <div className="text-xl font-black">{currencyFormatter.format(totalCost)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm h-fit">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">
            Log Expired/Spoiled Item
          </h2>
          <form onSubmit={handleRecord} className="space-y-4">
            <FormField label="Item Name">
              <input
                type="text"
                placeholder="e.g. Selecta Fortified Milk 1L"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Quantity">
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className={inputCls}
                  required
                />
              </FormField>
              <FormField label="Loss Cost (₱)">
                <input
                  type="number"
                  placeholder="e.g. 450"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={inputCls}
                  required
                />
              </FormField>
            </div>

            <FormField label="Wastage Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              >
                <option value="Expired on Shelf">Expired on Shelf</option>
                <option value="Mould/Spoilage">Mould/Spoilage</option>
                <option value="Damaged Pack Leakage">Damaged Pack Leakage</option>
                <option value="Theft/Discrepancy">Theft/Discrepancy</option>
              </select>
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors mt-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving...' : 'Commit Loss Record'}
            </button>
          </form>
        </div>

        {/* History list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Wastage Logs</h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 font-semibold">Spoiled Item</th>
                  <th className="px-6 py-3 font-semibold">Quantity</th>
                  <th className="px-6 py-3 font-semibold">Loss Cost</th>
                  <th className="px-6 py-3 font-semibold">Reason</th>
                  <th className="px-6 py-3 font-semibold">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{r.name}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">-{r.qty} units</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-350">{currencyFormatter.format(r.cost)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold">
                        {r.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{r.recordedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
