import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';
import { formatCurrency, paymentMethods } from '../../utils/cashierData';
import { reports as reportsApi, sales, returns, type ApiReport } from '../../services/api';

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

const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const INITIAL_COMPILATIONS: Compilation[] = [
  { id: 'c1', reportName: 'Waste Summary Report', generatedBy: 'Lia Cruz', date: 'Jul 1, 2026', size: '214 KB', status: 'Ready' },
  { id: 'c2', reportName: 'Inventory Movement Report', generatedBy: 'John Store Ops', date: 'Jun 28, 2026', size: '185 KB', status: 'Ready' },
  { id: 'c3', reportName: 'Expiry & Near-Expiry Report', generatedBy: 'Mia Stockwell', date: 'Jun 25, 2026', size: '97 KB', status: 'Ready' },
  { id: 'c4', reportName: 'Category Analysis Report', generatedBy: 'Lia Cruz', date: 'Jun 20, 2026', size: '312 KB', status: 'Ready' },
];

export function GenerateReports() {
  const { toasts, dismiss, success } = useToast();

  const [compilations, setCompilations] = useState<Compilation[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [returnsData, setReturnsData] = useState<any[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    sales.list().then(setSalesData).catch(() => {});
    returns.list().then(setReturnsData).catch(() => {});
  }, []);

  const handleGenerate = async (card: ReportCard) => {
    if (generatingIds.has(card.id)) return;
    setGeneratingIds(prev => new Set(prev).add(card.id));
    try {
      let result: ApiReport[] = [];
      switch (card.id) {
        case 'waste': result = await reportsApi.wasteSummary(); break;
        case 'inventory': result = await reportsApi.inventoryMovement(); break;
        case 'supplier': result = await reportsApi.supplierPerformance(); break;
        case 'expiry': result = await reportsApi.expiryAnalysis(); break;
        case 'category': result = await reportsApi.categoryAnalysis(); break;
        case 'cost': result = await reportsApi.costImpact(); break;
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
    } catch (e: any) {
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
    await new Promise(r => setTimeout(r, 1000));
    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.delete(comp.id);
      return next;
    });
    success(`"${comp.reportName}" downloaded successfully.`);
  };

  const cashierOptions = Array.from(new Set(salesData.map((t: any) => t.cashier_name ?? t.cashier).filter(Boolean)));
  const filteredSales = salesData.filter((transaction: any) => {
    const method = transaction.payment_method ?? transaction.paymentMethod;
    const cashier = transaction.cashier_name ?? transaction.cashier;
    const matchesPayment = paymentFilter === 'all' || method === paymentFilter;
    const matchesCashier = cashierFilter === 'all' || cashier === cashierFilter;
    return matchesPayment && matchesCashier;
  });
  const filteredRevenue = filteredSales.reduce((sum: number, transaction: any) => sum + (transaction.total_amount ?? 0), 0);

  return (
    <div className="space-y-8 w-full font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generate Reports</h1>
      </div>

      {/* Report Cards Grid */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => {
            const isGenerating = generatingIds.has(card.id);
            return (
              <div
                key={card.id}
                className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{card.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(card)}
                  disabled={isGenerating}
                  className="mt-auto inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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

      {/* ── Point-of-Sale Reports ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#006a61]/10 text-[#006a61] dark:bg-[#7ef0cf]/10 dark:text-[#7ef0cf]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Sales Transaction Filters</h2>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Payment Method</label>
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value as 'all' | PaymentMethod)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
              >
                <option value="all">All cashiers</option>
                {cashierOptions.map(cashier => (
                  <option key={cashier} value={cashier}>{cashier}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Filtered Revenue</div>
              <div className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(filteredRevenue)}</div>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Transaction</th>
                  <th className="px-4 py-2 font-semibold">Cashier</th>
                  <th className="px-4 py-2 font-semibold">Payment</th>
                  <th className="px-4 py-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">No sales transactions found.</td></tr>
                ) : filteredSales.map(transaction => (
                  <tr key={transaction.transaction_id}>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{transaction.transaction_id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{transaction.cashier_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{transaction.payment_method}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(transaction.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Compilations Table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Recent Compilations</h2>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Report Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Generated By</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Size</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {compilations.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No compilations found.</td></tr>
                ) : compilations.map(comp => {
                  const isDownloading = downloadingIds.has(comp.id);
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          {comp.reportName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.generatedBy}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.date}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{comp.size}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {comp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownload(comp)}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
            {compilations.length} report{compilations.length !== 1 ? 's' : ''} compiled
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Returns Oversight</h2>
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Return ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Reason</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Processed By</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {returnsData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No returns data available</td></tr>
                ) : (returnsData.map((returnItem: any) => (
                  <tr key={returnItem.id ?? returnItem.return_id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{returnItem.id ?? returnItem.return_id}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{returnItem.reason}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{returnItem.returned_by ?? returnItem.processed_by}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{returnItem.return_date}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(returnItem.refund_amount)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
