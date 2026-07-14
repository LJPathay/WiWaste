import { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { FormField, inputCls, Toast, useToast } from '../../components/ui/Toast';
import { createReturnId, formatCurrency, initialSalesTransactions, type SalesItem } from '../../utils/cashierData';
import { getStoredSession } from '../../utils/mockAuthAndFeatures';

export function ReturnsRefunds() {
  const { toasts, dismiss, success, error } = useToast();
  const session = getStoredSession();
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SalesItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');

  const matches = useMemo(() => {
    const normalized = query.toLowerCase();
    return initialSalesTransactions.filter(transaction =>
      transaction.transaction_id.toLowerCase().includes(normalized) ||
      transaction.items.some(item => item.product_name.toLowerCase().includes(normalized))
    );
  }, [query]);

  const refundAmount = selectedItem ? Number(overrideAmount || selectedItem.unit_price * Number(quantity || 0)) : 0;

  const processReturn = () => {
    if (!selectedItem || Number(quantity) < 1 || Number(quantity) > selectedItem.quantity || !reason.trim()) {
      error('Select an item, valid quantity, and return reason.');
      return;
    }
    const returnId = createReturnId();
    success(`${returnId} processed by ${session?.name ?? 'Current Cashier'} and stock was added back.`);
    setSelectedItem(null);
    setQuantity('1');
    setReason('');
    setOverrideAmount('');
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
                placeholder="Search by receipt ID, transaction ID, or product"
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
                {matches.flatMap(transaction =>
                  transaction.items.map(item => (
                    <tr key={item.sales_item_id}>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">{transaction.transaction_id}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.product_name}</td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
                      <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.unit_price)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
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
                  className="rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-xs font-semibold transition-colors"
                >
                  Process Return
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-slate-400">Select a sold item to process a return.</div>
          )}
        </div>
      </div>
    </div>
  );
}
