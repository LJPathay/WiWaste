import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Package,
  X,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  Filter,
} from 'lucide-react';
import { Toast, useToast, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { inventory as inventoryApi } from '../../services/api';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { useDebounce } from '../../hooks/useDebounce';
import type { ApiInventory } from '../../services/api';

interface StockMovement {
  id: string;
  type: 'Stock In' | 'Stock Out';
  quantity: number;
  date: string;
  user: string;
  remarks?: string;
  source: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  category: string;
  lastUpdated: string;
  stockStatus: 'Normal' | 'Low Stock' | 'Overstock';
  costPrice: number;
  sellingPrice: number;
  supplier: string;
  expirationDate: string | null;
  recentMovements: StockMovement[];
}
function mapApiItem(i: ApiInventory): InventoryItem {
  return {
    id: String(i.id),
    itemName: i.product_name,
    sku: i.sku,
    qty: i.current_stock,
    category: i.category,
    lastUpdated: i.last_updated?.slice(0, 10) ?? '',
    stockStatus: i.stock_status,
    costPrice: i.cost_price,
    sellingPrice: i.selling_price,
    supplier: i.supplier,
    expirationDate: i.expiration_date ?? null,
    recentMovements: [],
  };
}

function getExpiryDate(item: InventoryItem): string {
  return item.expirationDate ?? '—';
}

function StatusBadge({ status, qty }: { status: InventoryItem['stockStatus']; qty: number }) {
  if (qty < 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Critical
      </span>
    );
  }
  if (status === 'Low Stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Low Stock
      </span>
    );
  }
  if (status === 'Overstock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
        Overstock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/30">
      Normal
    </span>
  );
}

export function ManageInventory() {
  const { toasts, dismiss, success, error: showError } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchList = useMemo(
    () => () => inventoryApi.list({ search: debouncedSearch, status: statusFilter || undefined }),
    [debouncedSearch, statusFilter]
  );

  const { data: apiData, loading, error: fetchError, refetch, addItem, updateItem } = useOptimisticList(fetchList);

  const items = useMemo(() => (apiData ?? []).map(mapApiItem), [apiData]);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'stockin' | 'stockout' | 'history'>('details');
  const [stockQty, setStockQty] = useState('');
  const [stockRemarks, setStockRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    productId: '',
    itemName: '',
    sku: '',
    qty: '',
    sellingPrice: '',
  });
  const [addSearch, setAddSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [addError, setAddError] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter]);

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'Stock In' | 'Stock Out'>('Stock In');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadMovements = async (item: InventoryItem) => {
    setHistoryLoading(true);
    try {
      const data = await inventoryApi.movements(Number(item.id));
      item.recentMovements = data.movements.map(m => ({
        id: String(m.movement_id),
        type: m.type as 'Stock In' | 'Stock Out',
        quantity: m.quantity,
        date: m.date,
        user: m.recorded_by,
        source: m.remarks ?? '',
        remarks: m.remarks ?? undefined,
      }));
    } catch {
      item.recentMovements = [];
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (historyItem) loadMovements(historyItem);
  }, [historyItem]);

  useEffect(() => {
    if (selectedItem && activeTab === 'history') loadMovements(selectedItem);
  }, [selectedItem, activeTab]);

  const handleStockMovement = async (type: 'Stock In' | 'Stock Out') => {
    if (!selectedItem || !stockQty || Number(stockQty) <= 0) return;
    setProcessing(true);
    try {
      await inventoryApi[type === 'Stock In' ? 'stockIn' : 'stockOut']({
        product_id: Number(selectedItem.id),
        quantity: Number(stockQty),
        remarks: stockRemarks || undefined,
      });
      const newQty = type === 'Stock In'
        ? selectedItem.qty + Number(stockQty)
        : selectedItem.qty - Number(stockQty);
      updateItem(Number(selectedItem.id), {
        current_stock: newQty,
        stock_status: newQty < 10 ? 'Low Stock' : newQty > 300 ? 'Overstock' : 'Normal',
      } as any);
      success(`${type} recorded successfully for "${selectedItem.itemName}"`);
    } catch (e: any) {
      showError(e.message ?? 'Operation failed');
    }
    setProcessing(false);
    setStockQty('');
    setStockRemarks('');
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const { productId, itemName, qty } = addForm;
    if (!productId || !itemName.trim() || !qty || Number(qty) <= 0) {
      setAddError('Select a product and enter a valid quantity.');
      return;
    }
    setAddError('');
    setProcessing(true);
    try {
      await inventoryApi.stockIn({
        product_id: Number(productId),
        quantity: Number(qty),
        remarks: 'Stock received',
      });
      const pid = Number(productId);
      const existing = apiData?.find(d => d.id === pid);
      if (existing) {
        updateItem(pid, {
          current_stock: (existing.current_stock ?? 0) + Number(qty),
        } as any);
      }
      refetch();
      success(`Received ${qty} units of "${itemName}".`);
    } catch (e: any) {
      showError(e.message ?? 'Failed to receive stock');
    }
    setProcessing(false);
    setShowAddModal(false);
    setAddForm({ productId: '', itemName: '', sku: '', qty: '', sellingPrice: '' });
    setAddSearch('');
  };

  const handleConfirmAdjust = async () => {
    if (!adjustItem || !adjustQty || Number(adjustQty) <= 0) return;
    setProcessing(true);
    try {
      const apiCall = adjustType === 'Stock In' ? inventoryApi.stockIn : inventoryApi.stockOut;
      await apiCall({
        product_id: Number(adjustItem.id),
        quantity: Number(adjustQty),
        remarks: adjustRemarks || undefined,
      });
      const newQty = adjustType === 'Stock In'
        ? adjustItem.qty + Number(adjustQty)
        : adjustItem.qty - Number(adjustQty);
      updateItem(Number(adjustItem.id), {
        current_stock: newQty,
        stock_status: newQty < 10 ? 'Low Stock' : newQty > 300 ? 'Overstock' : 'Normal',
      } as any);
      success(`${adjustType} of ${adjustQty} units recorded for "${adjustItem.itemName}"`);
    } catch (e: any) {
      showError(e.message ?? 'Operation failed');
    }
    setProcessing(false);
    setAdjustItem(null);
    setAdjustQty('');
    setAdjustRemarks('');
  };

  const handleExportCSV = () => {
    const headers = ['Item Name', 'SKU', 'Category', 'Stock Qty', 'Status', 'Cost Price', 'Selling Price', 'Supplier', 'Last Updated'];
    const rows = items.map(item => [
      item.itemName, item.sku, item.category, item.qty,
      item.stockStatus, item.costPrice, item.sellingPrice, item.supplier, item.lastUpdated,
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
    success('Inventory exported as CSV.');
  };

  const uniqueCategories = Array.from(new Set(items.map(i => i.category)));

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchSearch =
      it.itemName.toLowerCase().includes(q) ||
      it.sku.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || it.category === categoryFilter;
    const matchStatus = !statusFilter || it.stockStatus === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const showPagination = totalPages > 1;

  const kpiData = [
    {
      label: 'Total Items',
      value: items.length,
      icon: Package,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-500',
      valueCls: 'text-blue-700',
    },
    {
      label: 'Low Stock',
      value: items.filter(i => i.stockStatus === 'Low Stock').length,
      icon: AlertTriangle,
      iconBg: 'bg-orange-50 dark:bg-orange-950/30',
      iconColor: 'text-orange-500',
      valueCls: 'text-orange-600',
    },
    {
      label: 'Overstock',
      value: items.filter(i => i.stockStatus === 'Overstock').length,
      icon: TrendingUp,
      iconBg: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-500',
      valueCls: 'text-blue-600',
    },
    {
      label: 'Normal',
      value: items.filter(i => i.stockStatus === 'Normal').length,
      icon: CheckCircle,
      iconBg: 'bg-green-50 dark:bg-green-950/30',
      iconColor: 'text-green-500',
      valueCls: 'text-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-6 space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* ── Receive Stock Modal ── */}
      {showAddModal && (
        <Modal title="Receive Stock" onClose={() => setShowAddModal(false)} size="md">
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <FormField label="Search Product">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
                <input
                  type="text"
                  className={`${inputCls} pl-9`}
                  value={addSearch}
                  onChange={e => {
                    setAddSearch(e.target.value);
                    setShowDropdown(true);
                    setAddForm({ ...addForm, productId: '', itemName: '', sku: '', sellingPrice: '' });
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type to search products..."
                />
                {showDropdown && addSearch && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-[#E5E7EB] dark:border-white/10 dark:border-white/10 bg-white dark:bg-slate-900 dark:bg-slate-800 shadow-lg">
                    {items
                      .filter(i =>
                        i.itemName.toLowerCase().includes(addSearch.toLowerCase()) ||
                        i.sku.toLowerCase().includes(addSearch.toLowerCase())
                      )
                      .slice(0, 20)
                      .map(i => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => {
                            setAddForm({
                              productId: i.id,
                              itemName: i.itemName,
                              sku: i.sku,
                              qty: addForm.qty,
                              sellingPrice: String(i.sellingPrice),
                            });
                            setAddSearch(i.itemName);
                            setShowDropdown(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left hover:bg-[#F8FAFC] dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors border-b border-[#F1F5F9] dark:border-white/5 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-[#0F172A] dark:text-slate-100">{i.itemName}</span>
                            <span className="ml-2 font-mono text-[#64748B] dark:text-slate-400">{i.sku}</span>
                          </div>
                          <span className="font-semibold text-[#0F766E]">₱{(i.sellingPrice ?? 0).toFixed(2)}</span>
                        </button>
                      ))}
                    {items.filter(i =>
                      i.itemName.toLowerCase().includes(addSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="px-3 py-3 text-xs text-[#64748B] text-center">No matching products</p>
                    )}
                  </div>
                )}
              </div>
            </FormField>

            {addForm.itemName && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Selected Product">
                  <input
                    type="text"
                    className={`${inputCls} bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed`}
                    value={addForm.itemName}
                    disabled
                  />
                </FormField>
                <FormField label="SKU">
                  <input
                    type="text"
                    className={`${inputCls} bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed`}
                    value={addForm.sku}
                    disabled
                  />
                </FormField>
                <FormField label="Quantity Received">
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={addForm.qty}
                    onChange={e => setAddForm({...addForm, qty: e.target.value})}
                    placeholder="e.g. 50"
                    required
                  />
                </FormField>
                <FormField label="Selling Price (₱)">
                  <input
                    type="text"
                    className={`${inputCls} bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed`}
                    value={addForm.sellingPrice ? `₱${Number(addForm.sellingPrice).toFixed(2)}` : ''}
                    disabled
                  />
                </FormField>
              </div>
            )}

            {addError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{addError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddSearch(''); }}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing || !addForm.productId}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#0d6560] disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
              >
                {processing ? 'Processing...' : 'Receive Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Adjust Stock Modal ── */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Adjust Stock</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{adjustItem.itemName}</p>
              </div>
              <button
                onClick={() => { setAdjustItem(null); setAdjustQty(''); setAdjustRemarks(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Item Name</label>
                <input
                  type="text"
                  readOnly
                  value={adjustItem.itemName}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as 'Stock In' | 'Stock Out')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="Stock In">Stock In</option>
                  <option value="Stock Out">Stock Out</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={adjustRemarks}
                  onChange={e => setAdjustRemarks(e.target.value)}
                  placeholder="e.g. Regular restock"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setAdjustItem(null); setAdjustQty(''); setAdjustRemarks(''); }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAdjust}
                  disabled={processing || !adjustQty || Number(adjustQty) <= 0}
                  className="flex-1 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0d6560] disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  {processing ? 'Processing...' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History Panel Modal ── */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Stock Movement History</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{historyItem.itemName}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:bg-slate-800 transition-colors">
                <X className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
{historyLoading ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">Loading movements...</div>
          ) : historyItem.recentMovements.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">No movement history available</div>
          ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100 dark:bg-slate-800" />
                  {historyItem.recentMovements.map((mv) => (
                    <div key={mv.id} className="relative flex gap-3 pb-4">
                      <div className={`absolute -left-[13px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0 ${mv.type === 'Stock In' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 ml-2 bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${mv.type === 'Stock In' ? 'text-green-700' : 'text-red-700'}`}>
                            {mv.type === 'Stock In' ? '+' : '-'}{mv.quantity} units
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mv.type === 'Stock In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {mv.type}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">{mv.date} · {mv.user}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{mv.source}</div>
                        {mv.remarks && <div className="text-xs text-gray-500 dark:text-slate-400 italic mt-1">"{mv.remarks}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <Modal title={selectedItem.itemName} onClose={() => setSelectedItem(null)} size="lg">
          <div className="space-y-4">
            {/* Modal sub-header */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/10">
              <span className="font-mono text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{selectedItem.sku}</span>
              <span className="text-xs font-semibold text-[#0F766E] bg-[#0F766E]/10 px-2.5 py-1 rounded-full">{selectedItem.category}</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
              {[
                { id: 'details', label: 'Details', icon: Package },
                { id: 'stockin', label: 'Stock In', icon: ArrowDownRight },
                { id: 'stockout', label: 'Stock Out', icon: ArrowUpRight },
                { id: 'history', label: 'History', icon: History },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#0F766E] text-[#0F766E]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-2 gap-5">
                {/* Left column: details */}
                <div className="space-y-1">
                  {[
                    { label: 'Supplier', value: selectedItem.supplier },
                    { label: 'Cost Price', value: `₱${selectedItem.costPrice.toFixed(2)}` },
                    { label: 'Selling Price', value: `₱${(selectedItem.sellingPrice ?? 0).toFixed(2)}` },
                    { label: 'Stock Qty', value: String(selectedItem.qty) },
                    { label: 'Status', value: selectedItem.stockStatus },
                    { label: 'Last Updated', value: selectedItem.lastUpdated },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">{row.label}</span>
                      <span className={`text-xs font-semibold ${
                        row.label === 'Status'
                          ? selectedItem.stockStatus === 'Low Stock' ? 'text-orange-600' : selectedItem.stockStatus === 'Overstock' ? 'text-blue-600' : 'text-green-700'
                          : 'text-gray-800 dark:text-slate-200'
                      }`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Right column: movement timeline */}
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Stock Movement Timeline</p>
                  {historyLoading ? (
                    <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-xs">Loading movements...</div>
                  ) : selectedItem.recentMovements.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-xs">No recent movements</div>
                  ) : (
                    <div className="relative pl-5">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100 dark:bg-slate-800" />
                      {selectedItem.recentMovements.map((mv) => (
                        <div key={mv.id} className="relative pb-4">
                          <div className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full border-2 border-white ${mv.type === 'Stock In' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div className="ml-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${mv.type === 'Stock In' ? 'text-green-700' : 'text-red-700'}`}>
                                {mv.type === 'Stock In' ? '+' : '-'}{mv.quantity}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-slate-500">{mv.type}</span>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{mv.date} · {mv.user}</div>
                            {mv.remarks && <div className="text-xs text-gray-400 dark:text-slate-500 italic">"{mv.remarks}"</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'stockin' && (
              <div className="space-y-4">
                <FormField label="Quantity">
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    placeholder="Enter quantity to add"
                  />
                </FormField>
                <FormField label="Remarks (Optional)">
                  <input
                    type="text"
                    className={inputCls}
                    value={stockRemarks}
                    onChange={e => setStockRemarks(e.target.value)}
                    placeholder="e.g. Regular restock"
                  />
                </FormField>
                <button
                  onClick={() => handleStockMovement('Stock In')}
                  disabled={processing || !stockQty || Number(stockQty) <= 0}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
                >
                  {processing ? 'Processing...' : 'Record Stock In'}
                </button>
              </div>
            )}

            {activeTab === 'stockout' && (
              <div className="space-y-4">
                <FormField label="Quantity">
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.qty}
                    className={inputCls}
                    value={stockQty}
                    onChange={e => setStockQty(e.target.value)}
                    placeholder="Enter quantity to remove"
                  />
                </FormField>
                <FormField label="Remarks (Optional)">
                  <input
                    type="text"
                    className={inputCls}
                    value={stockRemarks}
                    onChange={e => setStockRemarks(e.target.value)}
                    placeholder="e.g. Customer purchase"
                  />
                </FormField>
                <button
                  onClick={() => handleStockMovement('Stock Out')}
                  disabled={processing || !stockQty || Number(stockQty) <= 0 || Number(stockQty) > selectedItem.qty}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
                >
                  {processing ? 'Processing...' : 'Record Stock Out'}
                </button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
{historyLoading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Loading movements...</div>
                  ) : selectedItem.recentMovements.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No recent movements</div>
                  ) : (
                  selectedItem.recentMovements.map(movement => (
                    <div
                      key={movement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        movement.type === 'Stock In'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10'
                          : 'bg-rose-50 dark:bg-rose-500/10'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        movement.type === 'Stock In'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20'
                          : 'bg-rose-100 dark:bg-rose-500/20'
                      }`}>
                        {movement.type === 'Stock In' ? (
                          <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {movement.type}
                        </div>
                        <div className="text-xs text-slate-500">
                          {movement.user} • {movement.date}
                        </div>
                        <span className="mt-1 inline-flex rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {movement.source}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          movement.type === 'Stock In'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {movement.type === 'Stock In' ? '+' : '-'}{movement.quantity}
                        </div>
                        {movement.remarks && (
                          <div className="text-xs text-slate-400">{movement.remarks}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Manage Inventory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Track, adjust, and audit your full product catalogue</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0d6560] active:scale-95 text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Receive Stock
        </button>
      </div>

      {/* ══════════════════════════════════════════
          KPI STRIP
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiData.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-white/10 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg}`}>
                <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${kpi.valueCls}`}>{kpi.value}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          SEARCH & FILTER BAR
      ══════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-white/10 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition appearance-none cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="Normal">Normal</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Overstock">Overstock</option>
        </select>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:border-gray-300 transition-all flex-shrink-0"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* ══════════════════════════════════════════
          INVENTORY TABLE
      ══════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10">
          <span className="text-sm font-bold text-gray-800 dark:text-slate-200">
            Inventory Items
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">({filtered.length} of {items.length})</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-white/10">
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Item</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Category</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Qty</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Status</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Nearest Expiry</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Last Movement</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="h-7 w-7 text-gray-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400 dark:text-slate-500">No inventory items match your search</p>
                      <button
                        onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
                        className="mt-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setActiveTab('details'); }}
                    className={`group cursor-pointer transition-colors hover:bg-[#0F766E]/5 ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}`}
                  >
                    {/* Item */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 dark:text-slate-100 group-hover:text-[#0F766E] transition-colors">{item.itemName}</div>
                      <div className="text-gray-400 dark:text-slate-500 font-mono mt-0.5">{item.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300">{item.category}</td>

                    {/* Stock Qty */}
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${item.qty < 10 ? 'text-red-600' : item.qty > 300 ? 'text-blue-600' : 'text-gray-800 dark:text-slate-200'}`}>
                        {item.qty}
                      </span>
                    </td>

                    {/* Stock Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.stockStatus} qty={item.qty} />
                    </td>

                    {/* Nearest Expiry */}
                    <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{getExpiryDate(item)}</td>

                    {/* Last Movement */}
                    <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{item.lastUpdated}</td>
                  </tr>
                ))
              )}
            </tbody>
</table>
          </div>

          {showPagination && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-800">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#0F766E] hover:bg-[#0F766E]/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-[#0F766E] text-white'
                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#0F766E] hover:bg-[#0F766E]/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
