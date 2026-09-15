import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Search, AlertCircle, Info, X, AlertTriangle, Clock, ShieldCheck, FileText } from 'lucide-react';
import { FormField, inputCls, Toast, useToast, ConfirmDialog, Modal } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { returns as returnsApi, sales as salesApi, type ApiReturn, type ApiSalesTransaction } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { ActionButton } from '../../components/shared/DataTableActions';
import { Pagination } from '../../components/ui/pagination';

interface ReturnableItem {
  sale_item_id: number;
  transaction_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ReturnHistoryRow extends Record<string, unknown> {
  id: number;
  product_name: string;
  sku: string;
  quantity_returned: number;
  refund_amount: number;
  reason: string;
  return_reason_code: string;
  returned_by: string;
  return_date: string;
  approval_status: string;
  is_within_7_days: boolean;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

const REASON_CODES = [
  { value: 'defective', label: 'Defective Product', requiresEvidence: true, within7DaysOnly: false },
  { value: 'wrong_item', label: 'Wrong Item Delivered', requiresEvidence: true, within7DaysOnly: true },
  { value: 'change_mind', label: 'Change of Mind (7-day cooling off)', requiresEvidence: false, within7DaysOnly: true },
  { value: 'damaged', label: 'Damaged', requiresEvidence: true, within7DaysOnly: false },
  { value: 'expired', label: 'Expired/Near Expiry', requiresEvidence: true, within7DaysOnly: false },
  { value: 'missing_parts', label: 'Missing Parts/Accessories', requiresEvidence: true, within7DaysOnly: true },
  { value: 'not_as_described', label: 'Not as Described', requiresEvidence: true, within7DaysOnly: true },
  { value: 'other', label: 'Other', requiresEvidence: false, within7DaysOnly: true },
] as const;

const returnHistoryColumns: DataTableColumn<ReturnHistoryRow>[] = [
  { key: 'product_name', header: 'Product', pinned: true, truncate: true, minWidth: '150px' },
  { key: 'sku', header: 'SKU', truncate: true, minWidth: '100px' },
  { key: 'quantity_returned', header: 'Qty', numeric: true, minWidth: '80px' },
  {
    key: 'refund_amount',
    header: 'Refund',
    numeric: true,
    minWidth: '100px',
    render: (_row, value) => formatCurrency(Number(value)),
  },
  { key: 'return_reason_code', header: 'Reason Code', truncate: true, minWidth: '120px',
    render: (_row, value) => {
      const code = REASON_CODES.find(c => c.value === value);
      return code ? code.label : value;
    }
  },
  { key: 'returned_by', header: 'Returned By', truncate: true, minWidth: '100px' },
  { key: 'return_date', header: 'Date', minWidth: '100px', render: (_row, value) => formatDate(String(value)) },
  { key: 'approval_status', header: 'Status', minWidth: '100px',
    render: (_row, value) => {
      const badges: Record<string, { label: string; cls: string }> = {
        approved: { label: 'Approved', cls: 'bg-green-50 text-green-700 border border-green-100' },
        pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
        rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border border-red-100' },
      };
      const b = badges[value] ?? { label: value, cls: '' };
      return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>;
    }
  },
  { key: 'is_within_7_days', header: 'Within 7 Days', minWidth: '100px',
    render: (_row, value) => (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    )
  },
];

export function ReturnsRefunds() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [query, setQuery] = useState('');
  const [salesData, setSalesData] = useState<ApiSalesTransaction[]>([]);
  const [returnsHistory, setReturnsHistory] = useState<ApiReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReturnableItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [returnReasonCode, setReturnReasonCode] = useState('change_mind');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
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
      const res = await returnsApi.list({ page: 1 });
      setReturnsHistory(res.data);
    } catch {
      setReturnsHistory([]);
    }
  }, []);

  useEffect(() => {
    loadSales();
    loadReturns();
  }, [loadSales, loadReturns]);

  const filteredSales = useMemo(() => {
    if (!query.trim()) return salesData;
    const q = query.toLowerCase();
    return salesData.filter(s =>
      s.transaction_id.toString().includes(q) ||
      s.items.some(item =>
        item.product_name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      )
    );
  }, [salesData, query]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = Number(quantity);
    if (qty <= 0 || qty > selectedItem.quantity) {
      showError(`Quantity must be between 1 and ${selectedItem.quantity}`);
      return;
    }

    const selectedReason = REASON_CODES.find(c => c.value === returnReasonCode);
    if (!selectedReason) {
      showError('Please select a reason code');
      return;
    }

    setSubmitting(true);
    try {
      await returnsApi.create({
        sale_item_id: selectedItem.sale_item_id,
        quantity_returned: qty,
        reason,
        return_reason_code: returnReasonCode,
        evidence_notes: evidenceNotes || undefined,
        evidence_photos: evidencePhotos.length > 0 ? evidencePhotos : undefined,
        return_date: new Date().toISOString().split('T')[0],
      });
      success('Return recorded successfully.');
      setSelectedItem(null);
      setQuantity('1');
      setReason('');
      setReturnReasonCode('change_mind');
      setEvidenceNotes('');
      setEvidencePhotos([]);
      loadReturns();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to record return');
    } finally {
      setSubmitting(false);
    }
  };

  const returnableColumns = useMemo(() => [
    { key: 'transaction_id', header: 'Transaction', pinned: true, truncate: true, minWidth: '120px' },
    { key: 'product_name', header: 'Item', pinned: true, truncate: true, minWidth: '180px' },
    { key: 'sku', header: 'SKU', minWidth: '100px' },
    { key: 'quantity', header: 'Sold Qty', numeric: true, minWidth: '80px' },
    {
      key: 'unit_price',
      header: 'Unit Price',
      numeric: true,
      minWidth: '100px',
      render: (_row, value) => formatCurrency(Number(value)),
    },
    { key: 'subtotal', header: 'Line Total', numeric: true, minWidth: '100px', render: (_row, value) => formatCurrency(Number(value)) },
  ] as const, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Returns & Refunds</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Process returns with 7-day cooling-off period (RA 7394). Auto-approved within 7 days for standard reasons.
          </p>
        </div>
      </div>

      {/* 7-Day Policy Notice */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-2">7-Day Cooling-Off Period (RA 7394)</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Returns within 7 days: Auto-approved for change of mind, wrong item, missing parts</li>
              <li>Beyond 7 days: Only allowed for defective, damaged, or expired items</li>
              <li>Senior/PWD: Additional 20% discount + VAT exemption on eligible items</li>
              <li>Evidence required for: defective, damaged, expired, wrong item, missing parts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Return Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Return</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search Transaction <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Transaction #, Product, or SKU..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-4 text-slate-500">Loading transactions...</div>}
        {salesError && <div className="text-red-600 text-sm">{salesError}</div>}

        {!loading && filteredSales.length === 0 && query && (
          <div className="text-center py-4 text-slate-500">No transactions found matching "{query}"</div>
        )}

        {!loading && filteredSales.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transaction</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">SKU</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sold Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unit Price</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Line Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredSales.flatMap(sale =>
                  sale.items.map((item, idx) => (
                    <tr key={`${sale.transaction_id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => {
                        setSelectedItem({
                          sale_item_id: item.id,
                          transaction_id: sale.transaction_id,
                          product_name: item.product_name,
                          sku: item.sku,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          subtotal: item.subtotal,
                        });
                      }}
                    >
                      <td className="px-3 py-2 text-sm font-mono text-slate-900 dark:text-white">{sale.transaction_id}</td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-500 font-mono">{item.sku}</td>
                      <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">{item.quantity}</td>
                      <td className="px-3 py-2 text-sm text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-slate-900 dark:text-white">{formatCurrency(item.subtotal)}</td>
                      <td className="px-3 py-2 text-right">
                        <ActionButton
                          label="Select"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedItem({
                              sale_item_id: item.id,
                              transaction_id: sale.transaction_id,
                              product_name: item.product_name,
                              sku: item.sku,
                              quantity: item.quantity,
                              unit_price: item.unit_price,
                              subtotal: item.subtotal,
                            });
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedItem && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Return Details: {selectedItem.product_name}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Transaction ID</label>
                <input type="text" value={String(selectedItem.transaction_id)} readOnly className={`${inputCls} bg-slate-100 dark:bg-slate-800`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU</label>
                <input type="text" value={selectedItem.sku} readOnly className={`${inputCls} bg-slate-100 dark:bg-slate-800`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Available Qty</label>
                <input type="text" value={String(selectedItem.quantity)} readOnly className={`${inputCls} bg-slate-100 dark:bg-slate-800`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Unit Price</label>
                <input type="text" value={formatCurrency(selectedItem.unit_price)} readOnly className={`${inputCls} bg-slate-100 dark:bg-slate-800`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Return Qty <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason Code <span className="text-red-500">*</span></label>
                <select
                  value={returnReasonCode}
                  onChange={(e) => setReturnReasonCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                >
                  {REASON_CODES.map(code => (
                    <option key={code.value} value={code.value}>
                      {code.label} {code.within7DaysOnly ? '(within 7 days only)' : '(anytime)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason Details</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Evidence Notes</label>
                <textarea
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  rows={2}
                  placeholder="Describe damage, defects, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Photo URLs (one per line)</label>
                <textarea
                  value={evidencePhotos.join('\n')}
                  onChange={(e) => setEvidencePhotos(e.target.value.split('\n').filter(Boolean))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  rows={2}
                  placeholder="https://example.com/photo1.jpg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-amber-200 dark:border-amber-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Record Return'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitReturn}>
        </form>
      </div>

      {/* Returns History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Returns History</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{returnsHistory.length} returns</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {returnsHistory.length === 0 ? (
            <div className="p-12 text-center">
              <RotateCcw className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No returns recorded yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {returnHistoryColumns.map(col => (
                        <th key={col.key} className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${col.pinned ? 'sticky left-0 bg-white dark:bg-slate-800 z-10' : ''}`}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {returnsHistory.slice(0, 20).map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        {returnHistoryColumns.map(col => (
                          <td key={`${row.id}-${col.key}`} className="px-3 py-2 text-sm">
                            {col.render ? col.render(row, (row as Record<string, unknown>)[col.key]) : (row as Record<string, unknown>)[col.key]?.toString() ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {returnsHistory.length > 20 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
                  <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                    Load more returns ({returnsHistory.length} total)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}