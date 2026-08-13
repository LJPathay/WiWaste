import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { FormField, inputCls, Toast, useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { returns as returnsApi, sales as salesApi, type ApiReturn, type ApiSalesTransaction } from '../../services/api';

interface ReturnableItem {
  sale_item_id: number;
  transaction_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ReturnsRefunds() {
  const { toasts, dismiss, success, error } = useToast();
  const [query, setQuery] = useState('');
  const [salesData, setSalesData] = useState<ApiSalesTransaction[]>([]);
  const [returnsHistory, setReturnsHistory] = useState<ApiReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReturnableItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');

  const loadSales = useCallback(async () => {
    setLoading(true);
    setSalesError(null);
    try {
      const res = await salesApi.list({ search: query.trim() || undefined, per_page: 50 });
      setSalesData(res.data);
    } catch (e) {
      setSalesError(e instanceof Error ? e.message : 'Unable to load sales.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadReturns = useCallback(async () => {
    try {
      const res = await returnsApi.list(1);
      setReturnsHistory(res.data);
    } catch {
      setReturnsHistory([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadSales, 400);
    return () => clearTimeout(timer);
  }, [loadSales]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const refundAmount = selectedItem ? Number(overrideAmount || selectedItem.unit_price * Number(quantity || 0)) : 0;

  const processReturn = async () => {
    if (!selectedItem || Number(quantity) < 1 || Number(quantity) > selectedItem.quantity || !reason.trim()) {
      error('Select an item, valid quantity, and return reason.');
      return;
    }
    const refund = Number(overrideAmount);
    if (Number.isNaN(refund) || refund < 0) {
      error('Enter a valid refund amount.');
      return;
    }
    setSubmitting(true);
    try {
      await returnsApi.create({
        sale_item_id: selectedItem.sale_item_id,
        quantity_returned: Number(quantity),
        reason: reason.trim(),
        refund_amount: refund,
        return_date: new Date().toISOString(),
      });
      success('Return processed and stock was added back.');
      setSelectedItem(null);
      setQuantity('1');
      setReason('');
      setOverrideAmount('');
      loadSales();
      loadReturns();
    } catch (e) {
      error(e instanceof Error ? e.message : 'Return failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <Toast toasts={toasts} onDismiss={dismiss} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Returns & Refunds</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Search original transactions and restock returned items.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={`${inputCls} pl-9`}
                placeholder="Search by transaction ID or product"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Transaction</th>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold text-right">Sold Qty</th>
                  <th className="px-5 py-3 font-semibold text-right">Unit Price</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">Loading sales...</td>
                  </tr>
                )}
                {!loading && salesError && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-red-500">{salesError}</td>
                  </tr>
                )}
                {!loading && !salesError && salesData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">No matching transactions found.</td>
                  </tr>
                )}
                {!loading && !salesError && salesData.flatMap(transaction =>
                  transaction.items.map(item => (
                    <tr key={`${transaction.id}-${item.id}`}>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">{transaction.id}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.product_name}</td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.unit_price)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem({
                              sale_item_id: item.id,
                              transaction_id: transaction.id,
                              product_name: item.product_name,
                              quantity: item.quantity,
                              unit_price: item.unit_price,
                            });
                            setQuantity('1');
                            setOverrideAmount(String(item.unit_price));
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-3 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Return Details</h2>
          {selectedItem ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                <div className="flex justify-between gap-4">
                  <span className="text-xs text-slate-500">Product</span>
                  <span className="text-right text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedItem.product_name}</span>
                </div>
                <div className="flex justify-between gap-4 mt-1">
                  <span className="text-xs text-slate-500">Transaction</span>
                  <span className="text-right font-mono text-xs text-slate-600 dark:text-slate-300">#{selectedItem.transaction_id}</span>
                </div>
              </div>
              <FormField label="Quantity Returned">
                <input
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className={`${inputCls} text-right`}
                />
              </FormField>
              <FormField label="Reason">
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className={`${inputCls} min-h-24`}
                  placeholder="Enter return reason"
                />
              </FormField>
              <FormField label="Refund Amount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrideAmount}
                  onChange={e => setOverrideAmount(e.target.value)}
                  className={`${inputCls} text-right`}
                />
              </FormField>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculated Refund</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(refundAmount)}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processReturn}
                  disabled={submitting}
                  className="rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Process Return'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-slate-400">Select a sold item to process a return.</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Returns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold text-right">Qty</th>
                <th className="px-5 py-3 font-semibold text-right">Refund</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 font-semibold">Returned By</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {returnsHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">No returns recorded yet.</td>
                </tr>
              )}
              {returnsHistory.map(r => (
                <tr key={r.id}>
                  <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{r.product_name}</td>
                  <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{r.quantity_returned}</td>
                  <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(r.refund_amount)}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{r.reason}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{r.returned_by}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(r.return_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
