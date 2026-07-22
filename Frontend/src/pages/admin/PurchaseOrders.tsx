import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, X, CheckCircle, Package, Truck, Loader2 } from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { purchaseOrders as poApi, suppliers as supplierApi, products as productApi } from '../../services/api';

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

const statusColor: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'Partially Received': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  Received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  Cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

export function PurchaseOrders() {
  const { toasts, dismiss, success, error } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [showDetail, setShowDetail] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });

  // Form state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({ supplier_id: 0, notes: '', items: [] as { product_id: number; quantity: number; unit_price: number }[] });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    poApi.list({ search, status: statusFilter || undefined, page }).then((res: any) => {
      const data = res.data ?? res;
      setOrders(Array.isArray(data) ? data : []);
      setTotalPages(res.last_page ?? 1);
    }).catch(() => {
      setOrders([]);
    }).finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (showCreate) {
      supplierApi.list().then((r: any) => setSuppliers(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
      productApi.list().then((r: any) => setProducts(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
    }
  }, [showCreate]);

  function addItem() {
    setFormData(f => ({ ...f, items: [...f.items, { product_id: 0, quantity: 1, unit_price: 0 }] }));
  }

  function updateItem(idx: number, field: string, value: any) {
    setFormData(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  }

  function removeItem(idx: number) {
    setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function handleCreate() {
    if (!formData.supplier_id || formData.items.length === 0 || formData.items.some(i => !i.product_id || i.quantity < 1)) {
      error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await poApi.create(formData);
      success('Purchase order created.');
      setShowCreate(false);
      setFormData({ supplier_id: 0, notes: '', items: [] });
      fetchOrders();
    } catch { error('Failed to create purchase order.'); }
    finally { setSubmitting(false); }
  }

  async function handleReceive() {
    if (!showReceive.order) return;
    setSubmitting(true);
    try {
      const items = showReceive.order.items?.filter((i: any) => i.received_qty < i.quantity).map((i: any) => ({
        po_item_id: i.id,
        received_qty: i.received_qty,
      })) ?? [];
      await poApi.receive(showReceive.order.id, items);
      success('Stock received successfully.');
      setShowReceive({ open: false, order: null });
      fetchOrders();
    } catch { error('Failed to receive stock.'); }
    finally { setSubmitting(false); }
  }

  async function handleCancelConfirm() {
    if (!confirmCancel.order) return;
    try {
      await poApi.updateStatus(confirmCancel.order.id, 'Cancelled');
      success('Purchase order cancelled.');
      setConfirmCancel({ open: false, order: null });
      fetchOrders();
    } catch { error('Failed to cancel purchase order.'); }
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Purchase Orders</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Eye className="h-5 w-5 text-slate-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Create and manage purchase orders to suppliers.
            </TooltipContent>
          </UITooltip>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> New PO
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-200 dark:border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search PO number or supplier..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#006a61]">
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Ordered">Ordered</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No purchase orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 font-semibold">PO Number</th>
                  <th className="px-6 py-3 font-semibold">Supplier</th>
                  <th className="px-6 py-3 font-semibold">Created By</th>
                  <th className="px-6 py-3 font-semibold">Total</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {orders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{po.po_number}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{po.supplier}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{po.user}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{currencyFormatter.format(po.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[po.status] ?? ''}`}>{po.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(po.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setShowDetail({ open: true, order: po })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="View"><Eye className="h-4 w-4" /></button>
                        {(po.status === 'Draft' || po.status === 'Ordered') && (
                          <button onClick={() => setConfirmCancel({ open: true, order: po })} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600" title="Cancel"><X className="h-4 w-4" /></button>
                        )}
                        {(po.status === 'Ordered' || po.status === 'Partially Received') && (
                          <button onClick={() => setShowReceive({ open: true, order: po })} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-600" title="Receive Stock"><Package className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New Purchase Order</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Supplier</label>
                <select value={formData.supplier_id} onChange={e => setFormData(f => ({ ...f, supplier_id: Number(e.target.value) }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61]">
                  <option value={0}>Select supplier...</option>
                  {suppliers.map((s: any) => <option key={s.id ?? s.supplier_id} value={s.id ?? s.supplier_id}>{s.name ?? s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Notes (optional)</label>
                <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61]" rows={2} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Items</label>
                  <button onClick={addItem} className="text-xs text-[#006a61] hover:underline font-semibold">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', Number(e.target.value))}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61]">
                        <option value={0}>Select product...</option>
                        {products.map((p: any) => <option key={p.id ?? p.product_id} value={p.id ?? p.product_id}>{p.name ?? p.product_name}</option>)}
                      </select>
                      <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61]" placeholder="Qty" />
                      <input type="number" min={0} step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61]" placeholder="Price" />
                      <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleCreate} disabled={submitting}
                className="inline-flex items-center gap-2 bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail.open && showDetail.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDetail({ open: false, order: null })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{showDetail.order.po_number}</h2>
              <button onClick={() => setShowDetail({ open: false, order: null })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-500">Supplier:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{showDetail.order.supplier}</span></div>
                <div><span className="text-slate-500">Created by:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{showDetail.order.user}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor[showDetail.order.status] ?? ''}`}>{showDetail.order.status}</span></div>
                <div><span className="text-slate-500">Total:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{currencyFormatter.format(showDetail.order.total_amount)}</span></div>
                <div><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(showDetail.order.created_at).toLocaleString()}</span></div>
              </div>
              {showDetail.order.notes && <div><span className="text-slate-500">Notes:</span> <span className="text-slate-700 dark:text-slate-300">{showDetail.order.notes}</span></div>}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Items</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400"><th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Subtotal</th><th className="text-right py-1">Received</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {(showDetail.order.items ?? []).map((i: any) => (
                      <tr key={i.id}><td className="py-1.5 text-slate-700 dark:text-slate-300">{i.product}</td><td className="py-1.5 text-right text-slate-700 dark:text-slate-300">{i.quantity}</td><td className="py-1.5 text-right text-slate-700 dark:text-slate-300">{currencyFormatter.format(i.unit_price)}</td><td className="py-1.5 text-right font-semibold text-slate-800 dark:text-slate-200">{currencyFormatter.format(i.subtotal)}</td><td className="py-1.5 text-right text-emerald-600">{i.received_qty}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button onClick={() => setShowDetail({ open: false, order: null })} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-400">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive.open && showReceive.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReceive({ open: false, order: null })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Receive Stock — {showReceive.order.po_number}</h2>
              <button onClick={() => setShowReceive({ open: false, order: null })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">Enter the quantity received for each item.</p>
              {(showReceive.order.items ?? []).filter((i: any) => i.received_qty < i.quantity).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item.product}</span>
                  <span className="text-xs text-slate-400">Ordered: {item.quantity}</span>
                  <input type="number" min={0} max={item.quantity - item.received_qty}
                    value={item.received_qty}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setShowReceive(prev => {
                        if (!prev.order) return prev;
                        return {
                          open: true,
                          order: {
                            ...prev.order,
                            items: prev.order.items.map((i: any) => i.id === item.id ? { ...i, received_qty: val } : i),
                          },
                        };
                      });
                    }}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61]" />
                </div>
              ))}
              {(showReceive.order.items ?? []).filter((i: any) => i.received_qty >= i.quantity).length > 0 && (
                <p className="text-xs text-emerald-600">All items fully received.</p>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowReceive({ open: false, order: null })} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleReceive} disabled={submitting}
                className="inline-flex items-center gap-2 bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}<CheckCircle className="h-4 w-4" /> Confirm Receive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {confirmCancel.open && confirmCancel.order && (
        <ConfirmDialog
          message={`Are you sure you want to cancel purchase order "${confirmCancel.order.po_number}"?`}
          confirmLabel="Cancel PO"
          onConfirm={handleCancelConfirm}
          onCancel={() => setConfirmCancel({ open: false, order: null })}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
