import React, { useState, useMemo } from 'react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

interface OverstockItem {
  id: number;
  name: string;
  category: string;
  qtyOnHand: number;
  reorderPoint: number;
  excessQty: number;
  unitCost: number;
  recommendedAction: string;
  applied: boolean;
}

const initialItems: OverstockItem[] = [
  {
    id: 1,
    name: 'Biodegradable Bags (L)',
    category: 'Packaging',
    qtyOnHand: 1200,
    reorderPoint: 400,
    excessQty: 800,
    unitCost: 12,
    recommendedAction: 'Return to Supplier',
    applied: false,
  },
  {
    id: 2,
    name: 'Recycled Paper Rolls',
    category: 'Office Supply',
    qtyOnHand: 950,
    reorderPoint: 200,
    excessQty: 750,
    unitCost: 45,
    recommendedAction: 'Markdown & Sell',
    applied: false,
  },
  {
    id: 3,
    name: 'Compost Liners (M)',
    category: 'Packaging',
    qtyOnHand: 3400,
    reorderPoint: 800,
    excessQty: 2600,
    unitCost: 8,
    recommendedAction: 'Inter-Branch Transfer',
    applied: false,
  },
  {
    id: 4,
    name: 'Eco Detergent Refill',
    category: 'Cleaning',
    qtyOnHand: 560,
    reorderPoint: 150,
    excessQty: 410,
    unitCost: 210,
    recommendedAction: 'Liquidate',
    applied: false,
  },
  {
    id: 5,
    name: 'Reusable Tote Bags',
    category: 'Retail',
    qtyOnHand: 2100,
    reorderPoint: 600,
    excessQty: 1500,
    unitCost: 55,
    recommendedAction: 'Donate / Write-off',
    applied: false,
  },
];

const actionColor: Record<string, string> = {
  'Return to Supplier': 'bg-blue-100 text-blue-700',
  'Markdown & Sell': 'bg-yellow-100 text-yellow-700',
  'Inter-Branch Transfer': 'bg-purple-100 text-purple-700',
  Liquidate: 'bg-red-100 text-red-700',
  'Donate / Write-off': 'bg-green-100 text-green-700',
};

export function OverstockRisks() {
  const { toasts, dismiss, success } = useToast();
  const [items, setItems] = useState<OverstockItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ open: boolean; item: OverstockItem | null }>({
    open: false,
    item: null,
  });

  const totalExposure = useMemo(
    () => items.reduce((sum, i) => sum + i.excessQty * i.unitCost, 0),
    [items]
  );

  const appliedCount = items.filter((i) => i.applied).length;

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase()) ||
          i.recommendedAction.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  function openConfirm(item: OverstockItem) {
    setConfirm({ open: true, item });
  }

  function handleApply() {
    if (!confirm.item) return;
    setItems((prev) =>
      prev.map((i) => (i.id === confirm.item!.id ? { ...i, applied: true } : i))
    );
    success(`Action "${confirm.item.recommendedAction}" applied for ${confirm.item.name}.`);
    setConfirm({ open: false, item: null });
  }

  return (
    <div className="w-full space-y-6">



      {confirm.open && confirm.item && (
        <ConfirmDialog
          message={`Apply "${confirm.item.recommendedAction}" for ${confirm.item.name}? This will mark the action as completed.`}
          confirmLabel="Apply"
          onConfirm={handleApply}
          onCancel={() => setConfirm({ open: false, item: null })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Overstock Risks</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Identify excess inventory and apply remediation actions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Total Overstock Exposure
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {currencyFormatter.format(totalExposure)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Across all flagged items</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Items Flagged
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">
            {items.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Requiring action</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Actions Applied
          </p>
          <p className="mt-1 text-2xl font-bold text-[#006a61]">
            {appliedCount} / {items.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Resolved this period</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Flagged Overstock Items
          </h2>
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006a61]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Qty On Hand</th>
                <th className="px-4 py-3 text-right font-medium">Reorder Pt.</th>
                <th className="px-4 py-3 text-right font-medium">Excess Qty</th>
                <th className="px-4 py-3 text-right font-medium">Exposure</th>
                <th className="px-4 py-3 text-center font-medium">Recommended Action</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No items match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                      item.applied ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {item.qtyOnHand.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {item.reorderPoint.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">
                      +{item.excessQty.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                      {currencyFormatter.format(item.excessQty * item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          actionColor[item.recommendedAction] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.recommendedAction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.applied ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => openConfirm(item)}
                          className="rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-3 py-1.5 text-[11px] font-semibold transition-colors"
                        >
                          Apply Action
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 text-xs text-slate-400">
          Showing {filtered.length} of {items.length} items
        </div>
      </div>
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
