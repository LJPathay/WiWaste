import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Cpu, Info, Loader2, RefreshCw, Search, ShoppingCart, Target, Wallet } from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { optimization, type ApiOptimizationPlan } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const columns: DataTableColumn<ApiOptimizationPlan['plan'][number]>[] = [
  {
    key: 'product_name',
    header: 'Product',
    pinned: true,
    truncate: true,
    minWidth: '180px',
    render: (row) => (
      <div>
        <div className="font-semibold text-slate-900 dark:text-slate-100">{row.product_name}</div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU #{row.product_id}</div>
      </div>
    ),
  },
  {
    key: 'current_stock',
    header: 'Current Stock',
    numeric: true,
    minWidth: '100px',
    render: (row) => (
      <div>
        <div className="font-bold text-slate-700 dark:text-slate-300">{row.current_stock} units</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Forecast {Math.round(row.forecast_demand)}</div>
      </div>
    ),
  },
  {
    key: 'forecast_demand',
    header: 'Forecast Demand',
    numeric: true,
    minWidth: '100px',
    render: (row) => (
      <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.round(row.forecast_demand)} units</span>
    ),
  },
  {
    key: 'order_qty',
    header: 'Order Qty',
    numeric: true,
    minWidth: '80px',
    render: (row) => (
      <span className={`px-2.5 py-1 rounded-lg font-bold ${
        row.order_qty > 0
          ? 'bg-[#006a61]/10 text-[#006a61] dark:bg-[#7ef0cf]/10 dark:text-[#7ef0cf]'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
      }`}>
        {row.order_qty > 0 ? `+${row.order_qty}` : '—'}
      </span>
    ),
  },
  {
    key: 'unit_cost',
    header: 'Unit Cost',
    numeric: true,
    minWidth: '100px',
    render: (row) => (
      <span className="text-slate-600 dark:text-slate-400">{currencyFormatter.format(row.unit_cost)}</span>
    ),
  },
  {
    key: 'order_value',
    header: 'Order Value',
    numeric: true,
    minWidth: '100px',
    render: (row) => (
      <span className="font-bold text-slate-900 dark:text-slate-100">{currencyFormatter.format(row.order_value)}</span>
    ),
  },
];

export function Replenishment() {
  const { toasts, dismiss, success } = useToast();

  const [budget, setBudget] = useState(10000);
  const [horizon, setHorizon] = useState(30);
  const [plan, setPlan] = useState<ApiOptimizationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const runOptimizer = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimization.replenishment({ budget, horizon_days: horizon });
      setPlan(result);
      success('Replenishment plan generated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the optimization service.');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const list = plan?.plan ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(i =>
      i.product_name.toLowerCase().includes(q) ||
      String(i.product_id).includes(q)
    );
  }, [plan, search]);

  const budgetPct = plan && plan.budget > 0
    ? Math.min(100, Math.round((plan.total_order_value / plan.budget) * 100))
    : 0;
  const orderableItems = (plan?.plan ?? []).filter(i => i.order_qty > 0).length;

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              Genetic-algorithm replenishment plan that minimizes stockout, overstock, and wastage cost under your budget.
            </TooltipContent>
          </UITooltip>
        </div>
        {plan && orderableItems > 0 && (
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              {orderableItems} SKU{orderableItems !== 1 ? 's' : ''} to reorder
            </div>
            <Link
              to="/owner/purchase-orders"
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline"
            >
              Create Purchase Order <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Optimizer Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Budget (₱)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="number"
                min={1}
                value={budget}
                onChange={e => setBudget(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Horizon (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={horizon}
              onChange={e => setHorizon(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
            />
          </div>
          <button
            onClick={runOptimizer}
            disabled={loading || budget <= 0}
            className="inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
            {loading ? 'Optimizing…' : 'Run Optimization'}
          </button>
        </div>
      </div>

      {error && !plan && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/5">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <h2 className="mt-3 text-base font-bold text-rose-900 dark:text-rose-200">Optimization service unavailable</h2>
          <p className="mt-2 text-sm text-rose-700/80 dark:text-rose-300/70">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={runOptimizer}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </section>
      )}

      {/* Plan Summary */}
      {plan && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Wallet className="h-4 w-4 text-[#006a61]" /> Total Order Value
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">{currencyFormatter.format(plan.total_order_value)}</span>
              <span className="text-xs font-semibold text-slate-400">/ {currencyFormatter.format(plan.budget)}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${budgetPct >= 100 ? 'bg-rose-500' : 'bg-[#006a61]'}`} style={{ width: `${budgetPct}%` }} />
            </div>
            <p className={`mt-2 text-[10px] font-bold ${budgetPct > 100 ? 'text-rose-600' : budgetPct > 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {budgetPct}% of budget used
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Target className="h-4 w-4 text-[#006a61]" /> Fitness Score
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{plan.fitness.toLocaleString()}</div>
            <p className="mt-2 text-[10px] font-bold text-slate-400">Lower is better · initial {plan.gen0_fitness.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-[#006a61]" /> Confidence
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{Math.round(plan.confidence * 100)}%</div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#006a61]" style={{ width: `${Math.min(100, Math.round(plan.confidence * 100))}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Cpu className="h-4 w-4 text-[#006a61]" /> Generations
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{plan.generations_run}</div>
            <p className="mt-2 text-[10px] font-bold text-slate-400">
              {plan.recommendations_written} recommendation{plan.recommendations_written !== 1 ? 's' : ''} written to workflow
            </p>
          </div>
        </div>
      )}

      {/* Plan Table */}
      {plan && !error && (
        <>
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recommended Order Quantities</h3>
            <div className="relative max-w-xs w-full sm:ml-auto">
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
          <DataTable
            columns={columns}
            data={filtered as Record<string, unknown>[]}
            rowKey={(row) => row.product_id as string | number}
            emptyMessage={plan.plan.length === 0
              ? 'No SKUs to reorder under this budget. Try a larger budget or a longer horizon.'
              : 'No items match your search.'}
          />
        </>
      )}

      {!plan && !error && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm py-16 text-center">
          <Cpu className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">No plan yet</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Set a budget and click &quot;Run Optimization&quot;. The genetic algorithm builds an order plan that minimizes stockout, overstock, and wastage costs.
          </p>
        </div>
      )}
    </div>
  );
}
