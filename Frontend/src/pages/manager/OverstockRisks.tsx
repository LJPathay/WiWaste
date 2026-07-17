import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const OVERSTOCK_TREND_DATA = [
  { month: 'Jan', exposure: 125000 },
  { month: 'Feb', exposure: 120000 },
  { month: 'Mar', exposure: 135000 },
  { month: 'Apr', exposure: 142000 },
  { month: 'May', exposure: 130000 },
  { month: 'Jun', exposure: 115000 },
  { month: 'Jul', exposure: 105000 },
  { month: 'Aug', exposure: 95000 },
  { month: 'Sep', exposure: 110000 },
  { month: 'Oct', exposure: 118000 },
  { month: 'Nov', exposure: 105000 },
  { month: 'Dec', exposure: 98000 },
];

const OVERSTOCK_CATEGORY_DATA = [
  { category: 'Beverages', value: 45000, color: '#0ea5e9' },
  { category: 'Personal Care', value: 28000, color: '#f59e0b' },
  { category: 'Canned Goods', value: 15000, color: '#f87171' },
  { category: 'Household', value: 10000, color: '#8b5cf6' },
];

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
    name: 'Del Monte Tomato Sauce 250g',
    category: 'Canned Goods',
    qtyOnHand: 1200,
    reorderPoint: 350,
    excessQty: 850,
    unitCost: 28,
    recommendedAction: 'Markdown & Sell',
    applied: false,
  },
  {
    id: 2,
    name: 'Coca-Cola 1.5L',
    category: 'Beverages',
    qtyOnHand: 980,
    reorderPoint: 200,
    excessQty: 780,
    unitCost: 72,
    recommendedAction: 'Return to Supplier',
    applied: false,
  },
  {
    id: 3,
    name: 'Safeguard Bar Soap 135g',
    category: 'Personal Care',
    qtyOnHand: 3400,
    reorderPoint: 700,
    excessQty: 2700,
    unitCost: 55,
    recommendedAction: 'Markdown & Sell',
    applied: false,
  },
  {
    id: 4,
    name: 'Gardenia Classic White Bread',
    category: 'Bakery',
    qtyOnHand: 420,
    reorderPoint: 120,
    excessQty: 300,
    unitCost: 65,
    recommendedAction: 'Liquidate',
    applied: false,
  },
  {
    id: 5,
    name: 'Nestlé Bear Brand Powdered Milk',
    category: 'Dairy',
    qtyOnHand: 1800,
    reorderPoint: 500,
    excessQty: 1300,
    unitCost: 145,
    recommendedAction: 'Return to Supplier',
    applied: false,
  },
];

const actionColor: Record<string, string> = {
  'Return to Supplier': 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  'Markdown & Sell': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  Liquidate: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  'Donate / Write-off': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
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
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Overstock Risks</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Identify excess inventory above reorder thresholds and apply remediation actions to free up capital.
          </TooltipContent>
        </UITooltip>
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend line */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Total Overstock Exposure Trend (Full Year)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={OVERSTOCK_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                <Line type="linear" dataKey="exposure" name="Exposure" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category donut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5">Overstock by Category</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={OVERSTOCK_CATEGORY_DATA}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {OVERSTOCK_CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => currencyFormatter.format(v)} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
