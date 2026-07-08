import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Info, ShoppingCart, Check, Search } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface ReplenishMock {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min: number;
  suggested: number;
  supplier: string;
  leadTime: number;
  urgency: 'Critical' | 'Soon' | 'Scheduled';
}

const INITIAL_REPLENISH: ReplenishMock[] = [
  { id: '1', name: 'Century Tuna Flakes in Oil 180g', sku: 'CT-FO-180', stock: 3, min: 15, suggested: 48, supplier: 'Universal Robina Corp.', leadTime: 3, urgency: 'Critical' },
  { id: '2', name: 'Coca-Cola 1.5L', sku: 'CC-15L', stock: 8, min: 20, suggested: 36, supplier: 'San Miguel Corp. Beverage', leadTime: 2, urgency: 'Critical' },
  { id: '3', name: 'Gardenia Classic White Bread', sku: 'GD-WB-400', stock: 6, min: 20, suggested: 40, supplier: 'Gardenia Bakeries PH', leadTime: 1, urgency: 'Critical' },
  { id: '4', name: 'Del Monte Tomato Sauce 250g', sku: 'DM-TS-250', stock: 45, min: 50, suggested: 100, supplier: 'Purefoods Wholesale Corp.', leadTime: 4, urgency: 'Soon' },
  { id: '5', name: 'Safeguard White Soap 130g', sku: 'SG-WS-130', stock: 25, min: 30, suggested: 60, supplier: 'Johnson & Johnson PH', leadTime: 5, urgency: 'Soon' },
  { id: '6', name: 'Nestlé Bear Brand 900g', sku: 'NB-BB-900', stock: 14, min: 20, suggested: 36, supplier: 'Nestlé Philippines', leadTime: 4, urgency: 'Soon' },
  { id: '7', name: 'Biogesic Paracetamol 500mg', sku: 'BG-P-500', stock: 120, min: 100, suggested: 300, supplier: 'Unilab Distribution Inc.', leadTime: 3, urgency: 'Scheduled' },
  { id: '8', name: 'Colgate Triple Action 150g', sku: 'CG-TA-150', stock: 18, min: 15, suggested: 60, supplier: 'Colgate-Palmolive PH', leadTime: 5, urgency: 'Scheduled' },
];

export function Replenishment() {
  const [items] = useState<ReplenishMock[]>(INITIAL_REPLENISH);
  const [createdOrders, setCreatedOrders] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | 'Critical' | 'Soon' | 'Scheduled'>('All');

  const handleOrder = (id: string) => {
    setCreatedOrders(prev => [...prev, id]);
  };

  const criticalCount = items.filter(i => i.urgency === 'Critical' && !createdOrders.includes(i.id)).length;

  const filtered = items.filter(item => {
    const matchesUrgency = urgencyFilter === 'All' || item.urgency === urgencyFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    return matchesUrgency && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#006a61]" />
            Replenishment Orders
          </h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              AI-calculated replenishment recommendations based on velocity factors, safety minimums, and lead times.
            </TooltipContent>
          </UITooltip>
        </div>

        </div>
        {criticalCount > 0 && (
          <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 animate-pulse" />
            {criticalCount} critical items need restocking
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['All', 'Critical', 'Soon', 'Scheduled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setUrgencyFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  urgencyFilter === tab
                    ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-3 font-semibold">Product</th>
                <th className="px-6 py-3 font-semibold">Current Stock</th>
                <th className="px-6 py-3 font-semibold">Suggested Qty</th>
                <th className="px-6 py-3 font-semibold">Supplier</th>
                <th className="px-6 py-3 font-semibold">Lead Time</th>
                <th className="px-6 py-3 font-semibold">Urgency</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((item) => {
                const isOrdered = createdOrders.includes(item.id);
                const isCrit = item.urgency === 'Critical';
                const isSoon = item.urgency === 'Soon';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{item.stock} units</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Safety min: {item.min}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">+{item.suggested} units</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.supplier}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.leadTime} days</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCrit
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          : isSoon
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>{item.urgency}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOrder(item.id)}
                        disabled={isOrdered}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          isOrdered
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            : 'bg-[#006a61] hover:bg-[#00574f] text-white'
                        }`}
                      >
                        {isOrdered ? <Check className="h-3.5 w-3.5" /> : null}
                        {isOrdered ? 'PO Committed' : 'Create PO'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
