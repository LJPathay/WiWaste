import React, { useState } from 'react';
import { Info, Search, Pencil, ArrowRightLeft } from 'lucide-react';
import { Toast, useToast, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface InventoryItem {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  location: string;
  category: string;
  lastUpdated: string;
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
  },
  {
    id: '2',
    itemName: 'Biogesic Paracetamol 500mg',
    sku: 'BG-P-500',
    qty: 7,
    location: 'Cabinet B-1',
    category: 'Pharmaceuticals',
    lastUpdated: '2026-07-07',
  },
  {
    id: '3',
    itemName: 'Nescafé 3-in-1 Original',
    sku: 'NC-3O-28',
    qty: 180,
    location: 'Shelf C-2',
    category: 'Beverages',
    lastUpdated: '2026-07-07',
  },
  {
    id: '4',
    itemName: 'Tide Powder Detergent Sachet',
    sku: 'TD-PD-60',
    qty: 5,
    location: 'Stockroom D-4',
    category: 'Household',
    lastUpdated: '2026-07-06',
  },
  {
    id: '5',
    itemName: 'Purefoods Tender Juicy Hotdog',
    sku: 'PF-TJ-500',
    qty: 42,
    location: 'Chiller E-1',
    category: 'Frozen / Chilled',
    lastUpdated: '2026-07-08',
  },
];

export function ManageInventory() {
  const { toasts, dismiss, success, error } = useToast();

  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditQty(String(item.qty));
    setEditLocation(item.location);
    setEditError('');
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditError('');
  };

  const handleSave = async () => {
    if (!editItem) return;
    if (!editLocation.trim()) {
      setEditError('Location is required.');
      return;
    }
    if (!editQty || Number(editQty) < 0) {
      setEditError('Quantity must be 0 or greater.');
      return;
    }

    setEditError('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    setItems(prev =>
      prev.map(it =>
        it.id === editItem.id
          ? {
              ...it,
              qty: Number(editQty),
              location: editLocation.trim(),
              lastUpdated: new Date().toISOString().slice(0, 10),
            }
          : it
      )
    );
    setSaving(false);
    closeEdit();
    success(`"${editItem.itemName}" updated successfully.`);
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

      {/* Edit Modal */}
      {editItem && (
        <Modal title={`Edit — ${editItem.itemName}`} onClose={closeEdit}>
          <div className="space-y-4">
            <FormField label="Location">
              <input
                type="text"
                className={inputCls}
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                placeholder="e.g. Shelf A-3"
              />
            </FormField>

            <FormField label="Quantity">
              <input
                type="number"
                min="0"
                className={inputCls}
                value={editQty}
                onChange={e => setEditQty(e.target.value)}
              />
            </FormField>

            {editError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeEdit}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
              >
                {saving && (
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
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
            View, edit, and move inventory items. Low stock items are flagged automatically for quick action.
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 text-left font-semibold">Item / SKU</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-left font-semibold">Quantity</th>
                <th className="px-5 py-3 text-left font-semibold">Location</th>
                <th className="px-5 py-3 text-left font-semibold">Last Updated</th>
                <th className="px-5 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isLow = item.qty < 10;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
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
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.location}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.lastUpdated}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Move
                          </button>
                        </div>
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
