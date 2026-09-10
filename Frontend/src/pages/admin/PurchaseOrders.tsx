import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, X, CheckCircle, Package, Loader2 } from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { purchaseOrders as poApi, suppliers as supplierApi, products as productApi, type PaginatedResponse, type ApiProduct, type ApiSupplier } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { ActionButton } from '../../components/shared/DataTableActions';
import { Pagination } from '../../components/ui/pagination';

const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

const statusColor: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'Partially Received': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  Received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  Cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

interface PurchaseOrderItem {
  id: number;
  product: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  received_qty: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: string;
  user: string;
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string;
  items?: PurchaseOrderItem[];
}

interface PurchaseOrdersResponse {
  data?: PurchaseOrder[];
  last_page?: number;
}

interface SupplierOption {
  id?: number;
  supplier_id?: number;
  name?: string;
  supplier_name?: string;
}

interface ProductOption {
  id?: number;
  product_id?: number;
  name?: string;
  product_name?: string;
}

interface PurchaseOrderLineItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export function PurchaseOrders() {
  const { toasts, dismiss, success, error } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState<{ open: boolean; order: PurchaseOrder | null }>({ open: false, order: null });
  const [showDetail, setShowDetail] = useState<{ open: boolean; order: PurchaseOrder | null }>({ open: false, order: null });
  const [confirmCancel, setConfirmCancel] = useState<{ open: boolean; order: PurchaseOrder | null }>({ open: false, order: null });

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [formData, setFormData] = useState({ supplier_id: 0, notes: '', items: [] as PurchaseOrderLineItem[] });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    poApi.list({ search, status: statusFilter || undefined, page }).then((res: PurchaseOrdersResponse) => {
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
      supplierApi.list().then((r: ApiSupplier[] | { data?: SupplierOption[] }) => setSuppliers(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
      productApi.list().then((r: PaginatedResponse<ApiProduct> | ApiProduct[]) => setProducts(Array.isArray(r) ? r : r.data ?? [])).catch(() => {});
    }
  }, [showCreate]);

  function addItem() {
    setFormData(f => ({ ...f, items: [...f.items, { product_id: 0, quantity: 1, unit_price: 0 }] }));
  }

  function updateItem(idx: number, field: string, value: number) {
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
      const items = showReceive.order.items?.filter(i => i.received_qty < i.quantity).map(i => ({
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

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'po_number',
      header: 'PO Number',
      pinned: true,
      truncate: true,
      minWidth: '120px',
    },
    {
      key: 'supplier',
      header: 'Supplier',
      truncate: true,
      minWidth: '120px',
    },
    {
      key: 'user',
      header: 'Created By',
      truncate: true,
      minWidth: '100px',
    },
    {
      key: 'total_amount',
      header: 'Total',
      numeric: true,
      minWidth: '100px',
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{currencyFormatter.format(row.total_amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      minWidth: '100px',
      render: (row) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor[row.status] ?? ''}`}>{row.status}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      minWidth: '100px',
      render: (row) => (
        <span className="text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

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

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
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

        <DataTable
          columns={columns}
          data={orders as unknown as Record<string, unknown>[]}
          rowKey={(row) => row.id as unknown as number}
          loading={loading}
          emptyMessage="No purchase orders found."
          className="border-0"
          actions={(row) => (
            <>
              <ActionButton
                icon={<Eye className="h-4 w-4" />}
                label="View"
                onClick={() => setShowDetail({ open: true, order: row as unknown as PurchaseOrder })}
              />
              {(row.status === 'Draft' || row.status === 'Ordered') && (
                <ActionButton
                  icon={<X className="h-4 w-4" />}
                  label="Cancel"
                  variant="danger"
                  onClick={() => setConfirmCancel({ open: true, order: row as unknown as PurchaseOrder })}
                />
              )}
              {(row.status === 'Ordered' || row.status === 'Partially Received') && (
                <ActionButton
                  icon={<Package className="h-4 w-4" />}
                  label="Receive Stock"
                  onClick={() => setShowReceive({ open: true, order: row as unknown as PurchaseOrder })}
                />
              )}
            </>
          )}
          pagination={
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              label="orders"
            />
          }
        />
      </div>

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
                  {suppliers.map(s => <option key={s.id ?? s.supplier_id} value={s.id ?? s.supplier_id}>{s.name ?? s.supplier_name}</option>)}
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
                        {products.map(p => <option key={p.id ?? p.product_id} value={p.id ?? p.product_id}>{p.name ?? p.product_name}</option>)}
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
                    {(showDetail.order.items ?? []).map(i => (
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

      {showReceive.open && showReceive.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReceive({ open: false, order: null })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Receive Stock — {showReceive.order.po_number}</h2>
              <button onClick={() => setShowReceive({ open: false, order: null })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">Enter the quantity received for each item.</p>
              {(showReceive.order.items ?? []).filter(i => i.received_qty < i.quantity).map(item => (
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
                            items: (prev.order.items ?? []).map(i => i.id === item.id ? { ...i, received_qty: val } : i),
                          },
                        };
                      });
                    }}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61]" />
                </div>
              ))}
              {(showReceive.order.items ?? []).filter(i => i.received_qty >= i.quantity).length > 0 && (
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
