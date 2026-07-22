import { useState, useRef, useEffect } from 'react';
import {
  Info,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Package,
  X,
  Eye,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Trash2,
  ChevronDown,
  Download,
  Filter,
} from 'lucide-react';
import { Toast, useToast, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useNavigate } from 'react-router';

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
  location: string;
  category: string;
  lastUpdated: string;
  stockStatus: 'Normal' | 'Low Stock' | 'Overstock';
  costPrice: number;
  sellingPrice: number;
  supplier: string;
  recentMovements: StockMovement[];
}

const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: '1',
    itemName: 'Lucky Me! Pancit Canton',
    sku: 'LM-PC-80',
    qty: 320,
    location: 'Shelf A-3',
    category: 'Instant Noodles',
    lastUpdated: '2026-07-08',
    stockStatus: 'Normal',
    costPrice: 8.50,
    sellingPrice: 12.00,
    supplier: 'Nestle Philippines',
    recentMovements: [
      { id: '1', type: 'Stock In', quantity: 100, date: '2026-07-08 10:30', user: 'John Doe', remarks: 'Regular restock', source: 'Manual Adjustment' },
      { id: '2', type: 'Stock Out', quantity: 25, date: '2026-07-07 14:20', user: 'Jane Smith', remarks: 'Customer purchase', source: 'Sale #SALE-20260707-004' },
    ],
  },
  {
    id: '2',
    itemName: 'Biogesic Paracetamol 500mg',
    sku: 'BG-P-500',
    qty: 7,
    location: 'Cabinet B-1',
    category: 'Pharmaceuticals',
    lastUpdated: '2026-07-07',
    stockStatus: 'Low Stock',
    costPrice: 15.00,
    sellingPrice: 25.00,
    supplier: 'Unilab',
    recentMovements: [
      { id: '3', type: 'Stock Out', quantity: 15, date: '2026-07-07 09:15', user: 'John Doe', remarks: 'Bulk purchase', source: 'Sale #SALE-20260707-002' },
    ],
  },
  {
    id: '3',
    itemName: 'Nescafé 3-in-1 Original',
    sku: 'NC-3O-28',
    qty: 180,
    location: 'Shelf C-2',
    category: 'Beverages',
    lastUpdated: '2026-07-07',
    stockStatus: 'Normal',
    costPrice: 6.50,
    sellingPrice: 10.00,
    supplier: 'Nestle Philippines',
    recentMovements: [
      { id: '4', type: 'Stock In', quantity: 50, date: '2026-07-07 11:00', user: 'Jane Smith', remarks: 'Weekly delivery', source: 'Manual Adjustment' },
      { id: '5', type: 'Stock Out', quantity: 30, date: '2026-07-06 16:45', user: 'John Doe', source: 'Sale #SALE-20260706-008' },
    ],
  },
  {
    id: '4',
    itemName: 'Tide Powder Detergent Sachet',
    sku: 'TD-PD-60',
    qty: 5,
    location: 'Stockroom D-4',
    category: 'Household',
    lastUpdated: '2026-07-06',
    stockStatus: 'Low Stock',
    costPrice: 3.00,
    sellingPrice: 5.50,
    supplier: 'P&G Philippines',
    recentMovements: [
      { id: '6', type: 'Stock Out', quantity: 20, date: '2026-07-06 13:30', user: 'Jane Smith', remarks: 'Promotion sale', source: 'Sale #SALE-20260706-005' },
    ],
  },
  {
    id: '5',
    itemName: 'Purefoods Tender Juicy Hotdog',
    sku: 'PF-TJ-500',
    qty: 42,
    location: 'Chiller E-1',
    category: 'Frozen / Chilled',
    lastUpdated: '2026-07-08',
    stockStatus: 'Normal',
    costPrice: 120.00,
    sellingPrice: 180.00,
    supplier: 'San Miguel Foods',
    recentMovements: [
      { id: '7', type: 'Stock In', quantity: 30, date: '2026-07-08 08:00', user: 'John Doe', remarks: 'Fresh delivery', source: 'Manual Adjustment' },
      { id: '8', type: 'Stock Out', quantity: 8, date: '2026-07-07 18:00', user: 'Jane Smith', source: 'Sale #SALE-20260707-009' },
    ],
  },
];

function getExpiryDate(lastUpdated: string): string {
  const d = new Date(lastUpdated);
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

function StatusBadge({ status, qty }: { status: InventoryItem['stockStatus']; qty: number }) {
  if (qty < 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Critical
      </span>
    );
  }
  if (status === 'Low Stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Low Stock
      </span>
    );
  }
  if (status === 'Overstock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
        Overstock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
      Normal
    </span>
  );
}

interface ActionsDropdownProps {
  item: InventoryItem;
  onView: () => void;
  onAdjust: () => void;
  onHistory: () => void;
}

function ActionsDropdown({ item, onView, onAdjust, onHistory }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all shadow-sm"
      >
        Actions
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-xl border border-gray-100 bg-white shadow-xl py-1.5">
          <button
            onClick={() => { onView(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-[#0F766E]" />
            View Details
          </button>
          <button
            onClick={() => { onAdjust(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
            Adjust Stock
          </button>
          <button
            onClick={() => { navigate('/inventory/wastage'); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Record Wastage
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { onHistory(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <History className="h-3.5 w-3.5 text-gray-500" />
            View History
          </button>
        </div>
      )}
    </div>
  );
}

export function ManageInventory() {
  const { toasts, dismiss, success } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'stockin' | 'stockout' | 'history'>('details');
  const [stockQty, setStockQty] = useState('');
  const [stockRemarks, setStockRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    itemName: '',
    sku: '',
    qty: '',
    location: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    supplier: '',
  });
  const [addError, setAddError] = useState('');

  // New state for category/status filters and adjust stock / history modals
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'Stock In' | 'Stock Out'>('Stock In');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const handleStockMovement = async (type: 'Stock In' | 'Stock Out') => {
    if (!selectedItem || !stockQty || Number(stockQty) <= 0) return;

    setProcessing(true);
    await new Promise(r => setTimeout(r, 500));

    const newQty = type === 'Stock In'
      ? selectedItem.qty + Number(stockQty)
      : selectedItem.qty - Number(stockQty);

    const newMovement: StockMovement = {
      id: Date.now().toString(),
      type,
      quantity: Number(stockQty),
      date: new Date().toLocaleString(),
      user: 'Current User',
      remarks: stockRemarks || undefined,
      source: 'Manual Adjustment',
    };

    setItems(prev =>
      prev.map(item =>
        item.id === selectedItem.id
          ? {
              ...item,
              qty: newQty,
              lastUpdated: new Date().toISOString().slice(0, 10),
              stockStatus: newQty < 10 ? 'Low Stock' : newQty > 300 ? 'Overstock' : 'Normal',
              recentMovements: [newMovement, ...item.recentMovements].slice(0, 10),
            }
          : item
      )
    );

    setProcessing(false);
    setStockQty('');
    setStockRemarks('');
    success(`${type} recorded successfully for "${selectedItem.itemName}"`);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { itemName, sku, qty, location, category, costPrice, sellingPrice, supplier } = addForm;

    if (!itemName.trim() || !qty || !location.trim() || !category.trim() || !costPrice || !sellingPrice || !supplier.trim()) {
      setAddError('All fields are required.');
      return;
    }
    if (Number(qty) < 0) {
      setAddError('Quantity must be 0 or greater.');
      return;
    }
    if (Number(costPrice) < 0 || Number(sellingPrice) < 0) {
      setAddError('Prices must be greater than 0.');
      return;
    }

    setAddError('');
    setProcessing(true);
    await new Promise(r => setTimeout(r, 500));

    const generatedSku = sku.trim() ? sku.trim().toUpperCase() : `SKU-AUTO-${Math.floor(100000 + Math.random() * 900000)}`;

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      itemName: itemName.trim(),
      sku: generatedSku,
      qty: Number(qty),
      location: location.trim(),
      category: category.trim(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      stockStatus: Number(qty) < 10 ? 'Low Stock' : Number(qty) > 300 ? 'Overstock' : 'Normal',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      supplier: supplier.trim(),
      recentMovements: [],
    };

    setItems(prev => [newItem, ...prev]);
    setProcessing(false);
    setShowAddModal(false);
    setAddForm({
      itemName: '',
      sku: '',
      qty: '',
      location: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      supplier: '',
    });
    success(`Product "${newItem.itemName}" added successfully.`);
  };

  const handleConfirmAdjust = async () => {
    if (!adjustItem || !adjustQty || Number(adjustQty) <= 0) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 500));

    const newQty = adjustType === 'Stock In'
      ? adjustItem.qty + Number(adjustQty)
      : adjustItem.qty - Number(adjustQty);

    const newMovement: StockMovement = {
      id: Date.now().toString(),
      type: adjustType,
      quantity: Number(adjustQty),
      date: new Date().toLocaleString(),
      user: 'Current User',
      remarks: adjustRemarks || undefined,
      source: 'Manual Adjustment',
    };

    setItems(prev =>
      prev.map(item =>
        item.id === adjustItem.id
          ? {
              ...item,
              qty: newQty,
              lastUpdated: new Date().toISOString().slice(0, 10),
              stockStatus: newQty < 10 ? 'Low Stock' : newQty > 300 ? 'Overstock' : 'Normal',
              recentMovements: [newMovement, ...item.recentMovements].slice(0, 10),
            }
          : item
      )
    );

    setProcessing(false);
    success(`${adjustType} of ${adjustQty} units recorded for "${adjustItem.itemName}"`);
    setAdjustItem(null);
    setAdjustQty('');
    setAdjustRemarks('');
  };

  const handleExportCSV = () => {
    const headers = ['Item Name', 'SKU', 'Category', 'Location', 'Stock Qty', 'Status', 'Cost Price', 'Selling Price', 'Supplier', 'Last Updated'];
    const rows = filtered.map(item => [
      item.itemName, item.sku, item.category, item.location, item.qty,
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

  const uniqueCategories = Array.from(new Set(INITIAL_ITEMS.map(i => i.category)));

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchSearch =
      it.itemName.toLowerCase().includes(q) ||
      it.sku.toLowerCase().includes(q) ||
      it.location.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || it.category === categoryFilter;
    const matchStatus = !statusFilter || it.stockStatus === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const kpiData = [
    {
      label: 'Total Items',
      value: items.length,
      icon: Package,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      valueCls: 'text-blue-700',
    },
    {
      label: 'Low Stock',
      value: items.filter(i => i.stockStatus === 'Low Stock').length,
      icon: AlertTriangle,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      valueCls: 'text-orange-600',
    },
    {
      label: 'Overstock',
      value: items.filter(i => i.stockStatus === 'Overstock').length,
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      valueCls: 'text-blue-600',
    },
    {
      label: 'Normal',
      value: items.filter(i => i.stockStatus === 'Normal').length,
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
      valueCls: 'text-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* ── Add Product Modal ── */}
      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAddModal(false)} size="lg">
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Item Name">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.itemName}
                  onChange={e => setAddForm({...addForm, itemName: e.target.value})}
                  placeholder="e.g. Lucky Me! Pancit Canton"
                  required
                />
              </FormField>
              <FormField label="SKU (Auto-Generated)">
                <input
                  type="text"
                  className={`${inputCls} bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed`}
                  value={addForm.sku || 'Auto-generated on save'}
                  disabled
                  placeholder="Auto-generated on save"
                />
              </FormField>
              <FormField label="Quantity">
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={addForm.qty}
                  onChange={e => setAddForm({...addForm, qty: e.target.value})}
                  placeholder="e.g. 100"
                  required
                />
              </FormField>
              <FormField label="Location">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.location}
                  onChange={e => setAddForm({...addForm, location: e.target.value})}
                  placeholder="e.g. Shelf A-3"
                  required
                />
              </FormField>
              <FormField label="Category">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.category}
                  onChange={e => setAddForm({...addForm, category: e.target.value})}
                  placeholder="e.g. Instant Noodles"
                  required
                />
              </FormField>
              <FormField label="Supplier">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.supplier}
                  onChange={e => setAddForm({...addForm, supplier: e.target.value})}
                  placeholder="e.g. Nestle Philippines"
                  required
                />
              </FormField>
              <FormField label="Cost Price (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={addForm.costPrice}
                  onChange={e => setAddForm({...addForm, costPrice: e.target.value})}
                  placeholder="e.g. 8.50"
                  required
                />
              </FormField>
              <FormField label="Selling Price (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={addForm.sellingPrice}
                  onChange={e => setAddForm({...addForm, sellingPrice: e.target.value})}
                  placeholder="e.g. 12.00"
                  required
                />
              </FormField>
            </div>

            {addError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{addError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#0d6560] disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
              >
                {processing ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Adjust Stock Modal ── */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Adjust Stock</h3>
                <p className="text-xs text-gray-400 mt-0.5">{adjustItem.itemName}</p>
              </div>
              <button
                onClick={() => { setAdjustItem(null); setAdjustQty(''); setAdjustRemarks(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name</label>
                <input
                  type="text"
                  readOnly
                  value={adjustItem.itemName}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as 'Stock In' | 'Stock Out')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="Stock In">Stock In</option>
                  <option value="Stock Out">Stock Out</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={adjustRemarks}
                  onChange={e => setAdjustRemarks(e.target.value)}
                  placeholder="e.g. Regular restock"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setAdjustItem(null); setAdjustQty(''); setAdjustRemarks(''); }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Stock Movement History</h3>
                <p className="text-xs text-gray-400 mt-0.5">{historyItem.itemName}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {historyItem.recentMovements.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No movement history available</div>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100" />
                  {historyItem.recentMovements.map((mv) => (
                    <div key={mv.id} className="relative flex gap-3 pb-4">
                      <div className={`absolute -left-[13px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0 ${mv.type === 'Stock In' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 ml-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${mv.type === 'Stock In' ? 'text-green-700' : 'text-red-700'}`}>
                            {mv.type === 'Stock In' ? '+' : '-'}{mv.quantity} units
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mv.type === 'Stock In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {mv.type}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs text-gray-500">{mv.date} · {mv.user}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{mv.source}</div>
                        {mv.remarks && <div className="text-xs text-gray-500 italic mt-1">"{mv.remarks}"</div>}
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
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{selectedItem.sku}</span>
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
                    { label: 'Location', value: selectedItem.location },
                    { label: 'Supplier', value: selectedItem.supplier },
                    { label: 'Cost Price', value: `₱${selectedItem.costPrice.toFixed(2)}` },
                    { label: 'Selling Price', value: `₱${selectedItem.sellingPrice.toFixed(2)}` },
                    { label: 'Stock Qty', value: String(selectedItem.qty) },
                    { label: 'Status', value: selectedItem.stockStatus },
                    { label: 'Last Updated', value: selectedItem.lastUpdated },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-xs font-semibold text-gray-400">{row.label}</span>
                      <span className={`text-xs font-semibold ${
                        row.label === 'Status'
                          ? selectedItem.stockStatus === 'Low Stock' ? 'text-orange-600' : selectedItem.stockStatus === 'Overstock' ? 'text-blue-600' : 'text-green-700'
                          : 'text-gray-800'
                      }`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Right column: movement timeline */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Stock Movement Timeline</p>
                  {selectedItem.recentMovements.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">No recent movements</div>
                  ) : (
                    <div className="relative pl-5">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-100" />
                      {selectedItem.recentMovements.map((mv) => (
                        <div key={mv.id} className="relative pb-4">
                          <div className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full border-2 border-white ${mv.type === 'Stock In' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div className="ml-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${mv.type === 'Stock In' ? 'text-green-700' : 'text-red-700'}`}>
                                {mv.type === 'Stock In' ? '+' : '-'}{mv.quantity}
                              </span>
                              <span className="text-xs text-gray-400">{mv.type}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">{mv.date} · {mv.user}</div>
                            {mv.remarks && <div className="text-xs text-gray-400 italic">"{mv.remarks}"</div>}
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
                {selectedItem.recentMovements.length === 0 ? (
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Track, adjust, and audit your full product catalogue</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0d6560] active:scale-95 text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Item
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
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.iconBg}`}>
                <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${kpi.valueCls}`}>{kpi.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          SEARCH & FILTER BAR
      ══════════════════════════════════════════ */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, SKU, location, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition appearance-none cursor-pointer"
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
          className="px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition appearance-none cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="Normal">Normal</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Overstock">Overstock</option>
        </select>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex-shrink-0"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* ══════════════════════════════════════════
          INVENTORY TABLE
      ══════════════════════════════════════════ */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-800">
            Inventory Items
            <span className="ml-2 text-xs font-normal text-gray-400">({filtered.length} of {items.length})</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Item</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Category</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Location</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Qty</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Status</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Nearest Expiry</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Last Movement</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Package className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400">No inventory items match your search</p>
                      <button
                        onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
                        className="mt-1 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setActiveTab('details'); }}
                    className={`group cursor-pointer transition-colors hover:bg-[#0F766E]/5 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                  >
                    {/* Item */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900 group-hover:text-[#0F766E] transition-colors">{item.itemName}</div>
                      <div className="text-gray-400 font-mono mt-0.5">{item.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-gray-600">{item.category}</td>

                    {/* Location */}
                    <td className="px-5 py-3.5 text-gray-600">{item.location}</td>

                    {/* Stock Qty */}
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${item.qty < 10 ? 'text-red-600' : item.qty > 300 ? 'text-blue-600' : 'text-gray-800'}`}>
                        {item.qty}
                      </span>
                    </td>

                    {/* Stock Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.stockStatus} qty={item.qty} />
                    </td>

                    {/* Nearest Expiry */}
                    <td className="px-5 py-3.5 text-gray-500">{getExpiryDate(item.lastUpdated)}</td>

                    {/* Last Movement */}
                    <td className="px-5 py-3.5 text-gray-500">{item.lastUpdated}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <ActionsDropdown
                        item={item}
                        onView={() => { setSelectedItem(item); setActiveTab('details'); }}
                        onAdjust={() => { setAdjustItem(item); setAdjustType('Stock In'); setAdjustQty(''); setAdjustRemarks(''); }}
                        onHistory={() => setHistoryItem(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
