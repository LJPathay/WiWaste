import { useState } from 'react';
import { Info, Search, ArrowUpRight, ArrowDownRight, History, Package, X, Eye, Plus } from 'lucide-react';
import { Toast, useToast, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

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

export function ManageInventory() {
  const { toasts, dismiss, success } = useToast();

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

    if (!itemName.trim() || !sku.trim() || !qty || !location.trim() || !category.trim() || !costPrice || !sellingPrice || !supplier.trim()) {
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

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      itemName: itemName.trim(),
      sku: sku.trim().toUpperCase(),
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

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return (
      it.itemName.toLowerCase().includes(q) ||
      it.sku.toLowerCase().includes(q) ||
      it.location.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Add Product Modal */}
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
              <FormField label="SKU">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.sku}
                  onChange={e => setAddForm({...addForm, sku: e.target.value})}
                  placeholder="e.g. LM-PC-80"
                  required
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
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
              >
                {processing ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Product Modal */}
      {selectedItem && (
        <Modal title={selectedItem.itemName} onClose={() => setSelectedItem(null)} size="lg">
          <div className="space-y-4">
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
                        ? 'border-[#006a61] text-[#006a61]'
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">SKU</label>
                    <div className="text-sm font-mono">{selectedItem.sku}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Category</label>
                    <div className="text-sm">{selectedItem.category}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Quantity</label>
                    <div className="text-sm font-bold">{selectedItem.qty}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Status</label>
                    <div className={`text-sm font-semibold ${
                      selectedItem.stockStatus === 'Low Stock' ? 'text-rose-600' :
                      selectedItem.stockStatus === 'Overstock' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {selectedItem.stockStatus}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Location</label>
                    <div className="text-sm">{selectedItem.location}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Supplier</label>
                    <div className="text-sm">{selectedItem.supplier}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Cost Price</label>
                    <div className="text-sm">₱{selectedItem.costPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Selling Price</label>
                    <div className="text-sm">₱{selectedItem.sellingPrice.toFixed(2)}</div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Last Updated</label>
                  <div className="text-sm">{selectedItem.lastUpdated}</div>
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

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Inventory</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
            Click on any product to view details, record stock movements, and view history
          </TooltipContent>
        </UITooltip>
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Inventory Items
            <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} items)</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </button>
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search items…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 text-left font-semibold">Item / SKU</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-left font-semibold">Quantity</th>
                <th className="px-5 py-3 text-left font-semibold">Latest Source</th>
                <th className="px-5 py-3 text-left font-semibold">Location</th>
                <th className="px-5 py-3 text-left font-semibold">Last Updated</th>
                <th className="px-5 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isLow = item.qty < 10;
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{item.itemName}</div>
                        <div className="text-slate-400 font-mono mt-0.5">{item.sku}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.category}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isLow
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {item.qty}
                          </span>
                          {isLow && (
                            <span className="inline-flex items-center rounded bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 text-[10px] font-bold">
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {item.recentMovements[0]?.source ?? 'Manual Adjustment'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.location}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.lastUpdated}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
