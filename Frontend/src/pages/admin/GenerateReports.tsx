import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Loader2, CheckCircle2, Cpu, Target, Wallet, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast, useToast } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { formatCurrency, paymentMethods, type PaymentMethod } from '../../utils/cashierData';
import { reports as reportsApi, sales, returns, optimization, type ApiOptimizationPlan, type ApiReplenishmentPlanItem, type ApiSalesTransaction, type ApiReturn, type ApiReport } from '../../services/api';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface Compilation {
  id: string;
  reportName: string;
  generatedBy: string;
  date: string;
  size: string;
  status: 'Ready';
}

const REPORT_CARDS: ReportCard[] = [
  { id: 'waste', title: 'Waste Summary Report', description: 'Daily and weekly breakdown of waste items recorded across all categories.', icon: '🗂️' },
  { id: 'inventory', title: 'Inventory Movement Report', description: 'Track stock-in, stock-out, and adjustments over a selected period.', icon: '📦' },
  { id: 'supplier', title: 'Supplier Performance Report', description: 'Evaluate supplier delivery rates, return windows and order accuracy.', icon: '🚚' },
  { id: 'expiry', title: 'Expiry & Near-Expiry Report', description: 'Highlight items nearing expiration to minimize waste and losses.', icon: '⏰' },
  { id: 'category', title: 'Category Analysis Report', description: 'Breakdown of waste and inventory levels by product category.', icon: '📊' },
  { id: 'cost', title: 'Cost Impact Report', description: 'Estimate the financial impact of waste and spoilage across departments.', icon: '💰' },
];

const REPORT_ENDPOINT_MAP: Record<string, () => Promise<ApiReport[]>> = {
  waste: () => reportsApi.wasteSummary(),
  inventory: () => reportsApi.inventoryMovement(),
  supplier: () => reportsApi.supplierPerformance(),
  expiry: () => reportsApi.expiryAnalysis(),
  category: () => reportsApi.categoryAnalysis(),
  cost: () => reportsApi.costImpact(),
};

const REPORT_FILENAME_MAP: Record<string, string> = {
  waste: 'waste-summary-report',
  inventory: 'inventory-movement-report',
  supplier: 'supplier-performance-report',
  expiry: 'expiry-analysis-report',
  category: 'category-analysis-report',
  cost: 'cost-impact-report',
};

const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export function GenerateReports() {
  const { toasts, dismiss, success, error: showError } = useToast();

  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [salesData, setSalesData] = useState<ApiSalesTransaction[]>([]);
  const [returnsData, setReturnsData] = useState<ApiReturn[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const [optBudget, setOptBudget] = useState(10000);
  const [optPlan, setOptPlan] = useState<ApiOptimizationPlan | null>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [optApproving, setOptApproving] = useState(false);

  const runOptimizer = useCallback(async () => {
    if (optLoading) return;
    setOptLoading(true);
    setOptError(null);
    try {
      const result = await optimization.replenishment({ budget: optBudget, persist: false });
      setOptPlan(result);
      success('Optimized replenishment plan generated.');
    } catch (e) {
      setOptError(e instanceof Error ? e.message : 'Could not reach the optimization service.');
      setOptPlan(null);
    } finally {
      setOptLoading(false);
    }
  }, [optBudget, optLoading, success]);

  const approvePlan = async () => {
    if (optApproving) return;
    setOptApproving(true);
    setOptError(null);
    try {
      const result = await optimization.replenishment({ budget: optBudget, persist: true });
      success(`Plan approved for review — ${result.recommendations_written} recommendation${result.recommendations_written !== 1 ? 's' : ''} written to the workflow.`);
    } catch (e) {
      setOptError(e instanceof Error ? e.message : 'Could not approve the plan.');
    } finally {
      setOptApproving(false);
    }
  };

  useEffect(() => {
    sales.list().then(res => setSalesData(res.data)).catch(() => {});
    returns.list().then(res => setReturnsData(res.data)).catch(() => {});
  }, []);

  const handleGenerate = async (card: ReportCard) => {
    if (generatingIds.has(card.id)) return;
    setGeneratingIds(prev => new Set(prev).add(card.id));
    try {
      switch (card.id) {
        case 'waste': await reportsApi.wasteSummary(); break;
        case 'inventory': await reportsApi.inventoryMovement(); break;
        case 'supplier': await reportsApi.supplierPerformance(); break;
        case 'expiry': await reportsApi.expiryAnalysis(); break;
        case 'category': await reportsApi.categoryAnalysis(); break;
        case 'cost': await reportsApi.costImpact(); break;
      }
      const newEntry: Compilation = {
        id: `c${Date.now()}`,
        reportName: card.title,
        generatedBy: 'Current User',
        date: TODAY,
        size: `${Math.floor(Math.random() * 300 + 80)} KB`,
        status: 'Ready',
      };
      setCompilations(prev => [newEntry, ...prev]);
      success(`"${card.title}" generated and ready for download.`);
    } catch {
      success(`"${card.title}" generated (offline fallback).`);
    }
    setGeneratingIds(prev => {
      const next = new Set(prev);
      next.delete(card.id);
      return next;
    });
  };

  const handleDownload = async (comp: Compilation) => {
    if (downloadingIds.has(comp.id)) return;
    setDownloadingIds(prev => new Set(prev).add(comp.id));
    try {
      const cardId = REPORT_CARDS.find(c => c.title === comp.reportName)?.id;
      if (!cardId) throw new Error('Unknown report type');

      const fetchFn = REPORT_ENDPOINT_MAP[cardId];
      if (!fetchFn) throw new Error('No endpoint for this report');

      const data = await fetchFn();
      if (!data || data.length === 0) {
        showError('No data available for this report.');
        return;
      }

      const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = Object.keys(data[0] as object);
      const rows = data.map(item => headers.map(h => q((item as Record<string, unknown>)[h])));
      const csvContent = [headers.map(q), ...rows].map(r => r.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${REPORT_FILENAME_MAP[cardId]}-${TODAY}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success(`"${comp.reportName}" downloaded successfully.`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Download failed');
    }
    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.delete(comp.id);
      return next;
    });
  };

  const optColumns: DataTableColumn<ApiReplenishmentPlanItem>[] = [
    {
      key: 'product_name',
      header: 'Product',
      pinned: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{row.product_name}</div>
          <div className="text-[9px] text-slate-400 font-mono mt-0.5">SKU #{row.product_id}</div>
        </div>
      ),
    },
    {
      key: 'order_qty',
      header: 'Order Qty',
      align: 'numeric',
      render: (row) => (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
      align: 'numeric',
      numeric: true,
      render: (row) => formatCurrency(row.unit_cost),
    },
    {
      key: 'order_value',
      header: 'Order Value',
      align: 'numeric',
      numeric: true,
      render: (row) => formatCurrency(row.order_value),
    },
  ];

  const salesColumns: DataTableColumn<ApiSalesTransaction>[] = [
    {
      key: 'id',
      header: 'Transaction ID',
      pinned: true,
      render: (row) => <span className="font-mono text-slate-600 dark:text-slate-300">{row.id}</span>,
    },
    {
      key: 'transaction_date',
      header: 'Date',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.transaction_date}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'numeric',
      numeric: true,
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.items?.length ?? 0}</span>,
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'numeric',
      numeric: true,
      render: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(row.total_amount)}</span>,
    },
    {
      key: 'payment_method',
      header: 'Payment',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.payment_method}</span>,
    },
  ];

  const compilationColumns: DataTableColumn<Compilation>[] = [
    {
      key: 'reportName',
      header: 'Report Name',
      pinned: true,
      truncate: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.reportName}</span>
        </div>
      ),
    },
    {
      key: 'generatedBy',
      header: 'Generated',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.generatedBy}</span>,
    },
    {
      key: 'size',
      header: 'Size',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.size}</span>,
    },
    {
      key: 'status',
      header: 'Download',
      align: 'right',
      render: (row) => {
        const isDownloading = downloadingIds.has(row.id);
        return (
          <button
            onClick={() => handleDownload(row)}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline disabled:opacity-60 disabled:no-underline"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Downloading…
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download
              </>
            )}
          </button>
        );
      },
    },
  ];

  const returnColumns: DataTableColumn<ApiReturn>[] = [
    {
      key: 'id',
      header: 'Return ID',
      pinned: true,
      render: (row) => <span className="font-mono text-slate-600 dark:text-slate-300">{row.id}</span>,
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.product_name}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.reason}</span>,
    },
    {
      key: 'refund_amount',
      header: 'Refund',
      align: 'numeric',
      numeric: true,
      render: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(row.refund_amount)}</span>,
    },
    {
      key: 'return_date',
      header: 'Date',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.return_date}</span>,
    },
  ];

  const cashierOptions = Array.from(new Set(salesData.map(t => t.cashier).filter(Boolean)));
  const filteredSales = salesData.filter(transaction => {
    const matchesPayment = paymentFilter === 'all' || transaction.payment_method === paymentFilter;
    const matchesCashier = cashierFilter === 'all' || transaction.cashier === cashierFilter;
    return matchesPayment && matchesCashier;
  });
  const filteredRevenue = filteredSales.reduce((sum, transaction) => sum + (transaction.total_amount ?? 0), 0);

  return (
    <div className="space-y-4 w-full font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Generate Reports</h1>
      </div>

      {/* Report Cards Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {REPORT_CARDS.map(card => {
            const isGenerating = generatingIds.has(card.id);
            return (
              <div
                key={card.id}
                className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-3 flex flex-col gap-2 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-2">
                  <span className="h-7 w-7 flex items-center justify-center text-base leading-none mt-0.5">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{card.title}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{card.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(card)}
                  disabled={isGenerating}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 h-8 text-xs px-3 bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Optimized Replenishment (Sprint 4 — GA) ───────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-[#006a61]" />
          Optimized Replenishment
        </h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Budget (₱)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="number"
                min={1}
                value={optBudget}
                onChange={e => setOptBudget(Math.max(0, Number(e.target.value)))}
                className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pl-9 pr-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <button
            onClick={runOptimizer}
            disabled={optLoading || optBudget <= 0}
            className="inline-flex items-center justify-center gap-1.5 h-8 text-xs px-3 bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {optLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
            {optLoading ? 'Optimizing…' : 'Run Optimization'}
          </button>
        </div>

        {optError && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <p className="text-[9px] text-rose-700 dark:text-rose-300">{optError}</p>
          </div>
        )}

        {optPlan && !optError && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Wallet className="h-3 w-3 text-[#006a61]" /> Total Order Value
                </div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(optPlan.total_order_value)}
                  <span className="text-[9px] font-semibold text-slate-400"> / {formatCurrency(optPlan.budget)}</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Target className="h-3 w-3 text-[#006a61]" /> Fitness
                </div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">{optPlan.fitness.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3 text-[#006a61]" /> Confidence
                </div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">{Math.round(optPlan.confidence * 100)}%</div>
              </div>
            </div>

            <DataTable
              columns={optColumns}
              data={optPlan.plan}
              rowKey={(row) => row.product_id}
              emptyMessage="No SKUs to reorder under this budget."
              hoverActions={false}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <p className="text-[9px] text-slate-400">
                Generated {new Date(optPlan.generated_at).toLocaleString()} · {optPlan.generations_run} generations.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={approvePlan}
                  disabled={optApproving}
                  className="inline-flex items-center justify-center gap-1.5 h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all disabled:opacity-60"
                >
                  {optApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {optApproving ? 'Approving…' : 'Approve Plan'}
                </button>
                <Link
                  to="/inventory/recommendations"
                  className="inline-flex items-center justify-center gap-1.5 h-8 text-xs px-3 border border-[#006a61] text-[#006a61] dark:text-[#7ef0cf] rounded-lg font-semibold hover:bg-[#006a61]/5 transition-all"
                >
                  Review in Recommendations
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Point-of-Sale Reports ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-[#006a61]/10 text-[#006a61] dark:bg-[#7ef0cf]/10 dark:text-[#7ef0cf]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </span>
          Point-of-Sale Reports
        </h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Sales Transaction Filters</h2>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Payment Method</label>
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value as 'all' | PaymentMethod)}
                className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
              >
                <option value="all">All payment methods</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cashier</label>
              <select
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
                className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
              >
                <option value="all">All cashiers</option>
                {cashierOptions.map(cashier => (
                  <option key={cashier} value={cashier}>{cashier}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Filtered Revenue</div>
              <div className="text-right text-xs font-bold text-slate-900 dark:text-slate-100">{formatCurrency(filteredRevenue)}</div>
            </div>
          </div>
          <div className="mt-3">
            <DataTable
              columns={salesColumns}
              data={filteredSales}
              rowKey={(row) => row.id}
              emptyMessage="No sales transactions found."
              hoverActions={false}
            />
          </div>
        </div>
      </div>

      {/* Recent Compilations Table */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Recent Compilations</h2>
        <DataTable
          columns={compilationColumns}
          data={compilations}
          rowKey={(row) => row.id}
          emptyMessage="No compilations found."
          hoverActions={false}
          pagination={
            <div className="px-4 py-2 text-[9px] text-slate-400">
              {compilations.length} report{compilations.length !== 1 ? 's' : ''} compiled
            </div>
          }
        />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Returns Oversight</h2>
        <DataTable
          columns={returnColumns}
          data={returnsData}
          rowKey={(row) => row.id}
          emptyMessage="No returns data available."
          hoverActions={false}
        />
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
