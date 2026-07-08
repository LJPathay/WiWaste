import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Toast, useToast, FormField, inputCls } from '../../components/ui/Toast';

interface StockInRecord {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  batchId: string;
  receivedDate: string;
  supplier: string;
}

const INITIAL_RECORDS: StockInRecord[] = [
  {
    id: '1',
    itemName: 'Del Monte Tomato Sauce 250g',
    sku: 'DM-TS-250',
    qty: 100,
    batchId: 'BATCH-DM-2026-07',
    receivedDate: '2026-07-08',
    supplier: 'Del Monte Philippines',
  },
  {
    id: '2',
    itemName: 'Biogesic Paracetamol 500mg',
    sku: 'BG-P-500',
    qty: 500,
    batchId: 'BATCH-BG-2026-07',
    receivedDate: '2026-07-08',
    supplier: 'Unilab Distribution',
  },
  {
    id: '3',
    itemName: 'Safeguard White Soap 130g',
    sku: 'SG-WS-130',
    qty: 150,
    batchId: 'BATCH-SG-2026-07',
    receivedDate: '2026-07-07',
    supplier: 'P&G Philippines',
  },
  {
    id: '4',
    itemName: 'C2 Green Tea 500ml',
    sku: 'C2-GT-500',
    qty: 200,
    batchId: 'BATCH-C2-2026-07',
    receivedDate: '2026-07-07',
    supplier: 'Asahi Beverages PH',
  },
];

const emptyForm = {
  itemName: '',
  sku: '',
  qty: '',
  batchId: '',
  receivedDate: '',
  supplier: '',
};

export function StockIn() {
  const { toasts, dismiss, success } = useToast();

  const [records, setRecords] = useState<StockInRecord[]>(INITIAL_RECORDS);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { itemName, sku, qty, batchId, receivedDate, supplier } = form;

    if (!itemName.trim() || !sku.trim() || !qty || !batchId.trim() || !receivedDate || !supplier.trim()) {
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

    const newRecord: StockInRecord = {
      id: String(Date.now()),
      itemName: itemName.trim(),
      sku: sku.trim().toUpperCase(),
      qty: Number(qty),
      batchId: batchId.trim().toUpperCase(),
      receivedDate,
      supplier: supplier.trim(),
    };

    setRecords(prev => [newRecord, ...prev]);
    setForm(emptyForm);
    setSubmitting(false);
    success(`Stock-in recorded for "${newRecord.itemName}" — ${newRecord.qty} units added.`);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      r.itemName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.batchId.toLowerCase().includes(q) ||
      r.supplier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock In Records</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Record incoming deliveries, batch IDs, and supplier details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Form panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Log New Delivery</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label="Item Name">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Del Monte Tomato Sauce 250g"
                value={form.itemName}
                onChange={set('itemName')}
                required
              />
            </FormField>

            <FormField label="SKU">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. DM-TS-250"
                value={form.sku}
                onChange={set('sku')}
                required
              />
            </FormField>

            <FormField label="Quantity">
              <input
                type="number"
                min="1"
                className={inputCls}
                placeholder="e.g. 100"
                value={form.qty}
                onChange={set('qty')}
                required
              />
            </FormField>

            <FormField label="Batch ID">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. BATCH-DM-2026-07"
                value={form.batchId}
                onChange={set('batchId')}
                required
              />
            </FormField>

            <FormField label="Received Date">
              <input
                type="date"
                className={inputCls}
                value={form.receivedDate}
                onChange={set('receivedDate')}
                required
              />
            </FormField>

            <FormField label="Supplier">
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Del Monte Philippines"
                value={form.supplier}
                onChange={set('supplier')}
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
              {submitting ? 'Saving…' : 'Record Stock-In'}
            </button>
          </form>
        </div>

        {/* History table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              History
              <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} records)</span>
            </span>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search records…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3 text-left font-semibold">Item / SKU</th>
                  <th className="px-5 py-3 text-left font-semibold">Qty</th>
                  <th className="px-5 py-3 text-left font-semibold">Batch ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Received Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500">
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
                        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-bold">
                          +{r.qty} units
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{r.batchId}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.receivedDate}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{r.supplier}</td>
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
