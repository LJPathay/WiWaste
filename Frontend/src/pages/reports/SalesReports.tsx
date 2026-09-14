import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, Calendar, Download, BarChart2, DollarSign, Percent,
  CreditCard, Wallet, Banknote, User, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { FormField, inputCls, Toast, useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { reports as reportsApi, type ApiSalesVatSummary, type ApiDiscountSummary, type ApiSeniorPwdTransaction } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

const PAYMENT_METHODS = ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'] as const;

export function SalesReports() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState<'vat' | 'discount' | 'senior_pwd'>('vat');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [vatData, setVatData] = useState<ApiSalesVatSummary | null>(null);
  const [discountData, setDiscountData] = useState<ApiDiscountSummary | null>(null);
  const [seniorPwdData, setSeniorPwdData] = useState<ApiSeniorPwdTransaction[]>([]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [vatRes, discountRes, seniorRes] = await Promise.all([
        reportsApi.salesVatSummary({ from: fromDate || undefined, to: toDate || undefined }),
        reportsApi.discountSummary({ from: fromDate || undefined, to: toDate || undefined }),
        reportsApi.seniorPwdTransactionLog({ from: fromDate || undefined, to: toDate || undefined }),
      ]);
      setVatData(vatRes);
      setDiscountData(discountRes);
      setSeniorPwdData(seniorRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const dateRangeDisplay = useMemo(() => {
    if (!fromDate && !toDate) return 'All Time';
    if (fromDate && !toDate) return `From ${fromDate}`;
    if (!fromDate && toDate) return `Until ${toDate}`;
    return `${fromDate} to ${toDate}`;
  }, [fromDate, toDate]);

  // VAT Summary Tab
  const VatSummaryTab = () => {
    if (!vatData) return <div className="p-8 text-center text-slate-500">Loading VAT data...</div>;

    const s = vatData.summary;
    const daily = vatData.daily_breakdown;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Sales</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(s.total_sales ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">VAT (12%)</div>
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(s.total_vat ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">VATable Sales</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(s.total_vatable ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Non-VAT Sales</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(s.total_non_vatable ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Senior/PWD Discount</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(s.total_senior_pwd_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Senior/PWD VAT Exempt</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(s.total_senior_pwd_vat_exempt ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Other Discounts</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(s.total_discount ?? 0)}</div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Daily VAT Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Transactions</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Daily Sales</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">VAT</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">VATable</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Non-VAT</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Senior/PWD Disc.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Discounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {daily.slice((page - 1) * pageSize, page * pageSize).map((d, idx) => (
                  <tr key={`${d.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">{d.date}</td>
                    <td className="px-3 py-2 text-right text-sm">{d.transaction_count}</td>
                    <td className="px-3 py-2 text-right text-sm">{formatCurrency(d.daily_sales)}</td>
                    <td className="px-3 py-2 text-right text-sm text-brand-600">{formatCurrency(d.daily_vat)}</td>
                    <td className="px-3 py-2 text-right text-sm">{formatCurrency(d.daily_vatable)}</td>
                    <td className="px-3 py-2 text-right text-sm">{formatCurrency(d.daily_non_vatable)}</td>
                    <td className="px-3 py-2 text-right text-sm text-amber-600">{formatCurrency(d.daily_senior_pwd_discount)}</td>
                    <td className="px-3 py-2 text-right text-sm text-red-600">{formatCurrency(d.daily_discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Discount Summary Tab
  const DiscountSummaryTab = () => {
    if (!discountData) return <div className="p-8 text-center text-slate-500">Loading discount data...</div>;

    const t = discountData.transaction_level;
    const i = discountData.item_level;
    const c = discountData.combined;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Discounts (Txn)</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(t.total_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Senior/PWD (Txn)</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(t.total_senior_pwd_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Senior/PWD VAT Exempt</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(t.total_senior_pwd_vat_exempt ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Item Discounts</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(i.total_item_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Senior/PWD Item Disc.</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(i.senior_pwd_item_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Discounted Items</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{i.discounted_items_count ?? 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 md:col-span-2 lg:col-span-2">
            <div className="text-sm text-slate-500 dark:text-slate-400">Combined Total Discount</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(c.total_discount ?? 0)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 md:col-span-2 lg:col-span-2">
            <div className="text-sm text-slate-500 dark:text-slate-400">Combined Senior/PWD Discount</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(c.total_senior_pwd_discount ?? 0)}</div>
          </div>
        </div>
      </div>
    );
  };

  // Senior/PWD Log Tab
  const SeniorPwdLogTab = () => {
    if (loading && seniorPwdData.length === 0) return <div className="p-8 text-center">Loading...</div>;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Txn ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cashier</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ID Presented</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Discount</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">VAT Exempt</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {seniorPwdData.slice((page - 1) * pageSize, page * pageSize).map((t, idx) => (
                <tr key={`${t.transaction_id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-3 py-2 text-sm font-mono text-slate-900 dark:text-white">{t.transaction_id}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-3 py-2 text-sm">{t.cashier}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.senior_pwd_type === 'senior' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {t.senior_pwd_type === 'senior' ? <User className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                      {t.senior_pwd_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm font-mono">{t.senior_pwd_id ?? 'N/A'}</td>
                  <td className="px-3 py-2 text-sm">{t.senior_pwd_name ?? 'N/A'}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-medium">{formatCurrency(t.senior_pwd_discount)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{formatCurrency(t.senior_pwd_vat_exempt)}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(t.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            VAT breakdown, discount analysis, and Senior/PWD transaction logs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`${inputCls} pl-10 w-40`}
            />
          </div>
          <span className="text-slate-400">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`${inputCls} pl-10 w-40`}
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{dateRangeDisplay}</span>
          <button
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
          {[
            { key: 'vat', label: 'VAT Summary', icon: <DollarSign className="w-4 h-4 mr-2" /> },
            { key: 'discount', label: 'Discounts', icon: <Percent className="w-4 h-4 mr-2" /> },
            { key: 'senior_pwd', label: 'Senior/PWD Log', icon: <User className="w-4 h-4 mr-2" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-b-2 border-brand-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'vat' && <VatSummaryTab />}
        {activeTab === 'discount' && <DiscountSummaryTab />}
        {activeTab === 'senior_pwd' && <SeniorPwdLogTab />}
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}