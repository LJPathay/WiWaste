import React, { useState } from 'react';
import { Search, Plus, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Modal, FormField, inputCls, useToast, Toast } from '../../components/ui/Toast';

interface ProductMock {
  id: string;
  name: string;
  sku: string;
  category: 'Food' | 'Medicine' | 'Beverages' | 'Personal Care';
  price: number;
  stock: number;
  expiry: string;
}

const INITIAL_PRODUCTS: ProductMock[] = [
  { id: '1', name: 'Del Monte Tomato Sauce 250g', sku: 'DM-TS-250', category: 'Food', price: 32.50, stock: 45, expiry: '2026-11-20' },
  { id: '2', name: 'Biogesic Paracetamol 500mg', sku: 'BG-P-500', category: 'Medicine', price: 7.50, stock: 120, expiry: '2027-03-15' },
  { id: '3', name: 'Coca-Cola 1.5L', sku: 'CC-15L', category: 'Beverages', price: 68.00, stock: 8, expiry: '2026-09-05' },
  { id: '4', name: 'Safeguard White Soap 130g', sku: 'SG-WS-130', category: 'Personal Care', price: 54.00, stock: 25, expiry: '2028-05-10' },
  { id: '5', name: 'Century Tuna Flakes in Oil 180g', sku: 'CT-FO-180', category: 'Food', price: 42.00, stock: 3, expiry: '2026-08-12' },
  { id: '6', name: 'Neozep Forte (Tablet)', sku: 'NZ-F-TAB', category: 'Medicine', price: 8.50, stock: 95, expiry: '2026-12-01' },
  { id: '7', name: 'C2 Green Tea 500ml', sku: 'C2-GT-500', category: 'Beverages', price: 22.00, stock: 32, expiry: '2026-10-18' },
  { id: '8', name: 'Colgate Triple Action 150g', sku: 'CG-TA-150', category: 'Personal Care', price: 115.00, stock: 15, expiry: '2027-08-22' },
  { id: '9', name: 'San Miguel Pale Pilsen Can', sku: 'SM-PP-CAN', category: 'Beverages', price: 72.00, stock: 50, expiry: '2026-12-31' },
  { id: '10', name: 'Gatorade Blue Bolt 500ml', sku: 'GT-BB-500', category: 'Beverages', price: 45.00, stock: 12, expiry: '2026-10-10' },
];

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export function ManageProducts() {
  const { toasts, dismiss, success } = useToast();
  const [products, setProducts] = useState<ProductMock[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Food' | 'Medicine' | 'Beverages' | 'Personal Care'>('All');
  const [selectedProduct, setSelectedProduct] = useState<ProductMock | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    category: 'Food' as 'Food' | 'Medicine' | 'Beverages' | 'Personal Care',
    price: '',
    stock: '',
    expiry: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    category: 'Food' as 'Food' | 'Medicine' | 'Beverages' | 'Personal Care',
    price: '',
    stock: '',
    expiry: '',
  });
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, sku, category, price, stock, expiry } = addForm;

    if (!name.trim() || !sku.trim() || !price || !stock || !expiry) {
      setAddError('All fields are required.');
      return;
    }
    if (Number(price) <= 0 || Number(stock) < 0) {
      setAddError('Price must be greater than 0 and stock must be 0 or greater.');
      return;
    }

    setAddError('');
    setProcessing(true);
    await new Promise(r => setTimeout(r, 500));

    const newProduct: ProductMock = {
      id: Date.now().toString(),
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      price: Number(price),
      stock: Number(stock),
      expiry,
    };

    setProducts(prev => [newProduct, ...prev]);
    setProcessing(false);
    setShowAddModal(false);
    setAddForm({
      name: '',
      sku: '',
      category: 'Food',
      price: '',
      stock: '',
      expiry: '',
    });
    success(`Product "${newProduct.name}" added successfully.`);
  };

  const handleEditClick = () => {
    if (!selectedProduct) return;
    setEditForm({
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      category: selectedProduct.category,
      price: selectedProduct.price.toString(),
      stock: selectedProduct.stock.toString(),
      expiry: selectedProduct.expiry,
    });
    setShowEditModal(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const { name, sku, category, price, stock, expiry } = editForm;

    if (!name.trim() || !sku.trim() || !price || !stock || !expiry) {
      setEditError('All fields are required.');
      return;
    }
    if (Number(price) <= 0 || Number(stock) < 0) {
      setEditError('Price must be greater than 0 and stock must be 0 or greater.');
      return;
    }

    setEditError('');
    setProcessing(true);
    await new Promise(r => setTimeout(r, 500));

    const updatedProduct: ProductMock = {
      ...selectedProduct,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      price: Number(price),
      stock: Number(stock),
      expiry,
    };

    setProducts(prev =>
      prev.map(p => (p.id === selectedProduct.id ? updatedProduct : p))
    );
    setSelectedProduct(updatedProduct);
    setProcessing(false);
    setShowEditModal(false);
    success(`Product "${updatedProduct.name}" updated successfully.`);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditError('');
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Products</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Manage product details and baseline tracking limits.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {(['All', 'Food', 'Medicine', 'Beverages', 'Personal Care'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3">Stock Level</th>
                <th className="px-6 py-3">Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredProducts.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-55/20 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelectedProduct(p)}
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{p.sku}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{currencyFormatter.format(p.price)}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{p.stock} units</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAddModal(false)} size="lg">
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Product Name">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.name}
                  onChange={e => setAddForm({...addForm, name: e.target.value})}
                  placeholder="e.g. Del Monte Tomato Sauce 250g"
                  required
                />
              </FormField>
              <FormField label="SKU">
                <input
                  type="text"
                  className={inputCls}
                  value={addForm.sku}
                  onChange={e => setAddForm({...addForm, sku: e.target.value})}
                  placeholder="e.g. DM-TS-250"
                  required
                />
              </FormField>
              <FormField label="Category">
                <select
                  className={inputCls}
                  value={addForm.category}
                  onChange={e => setAddForm({...addForm, category: e.target.value as any})}
                  required
                >
                  <option value="Food">Food</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Personal Care">Personal Care</option>
                </select>
              </FormField>
              <FormField label="Unit Price (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={addForm.price}
                  onChange={e => setAddForm({...addForm, price: e.target.value})}
                  placeholder="e.g. 32.50"
                  required
                />
              </FormField>
              <FormField label="Initial Stock">
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={addForm.stock}
                  onChange={e => setAddForm({...addForm, stock: e.target.value})}
                  placeholder="e.g. 100"
                  required
                />
              </FormField>
              <FormField label="Expiry Date">
                <input
                  type="date"
                  className={inputCls}
                  value={addForm.expiry}
                  onChange={e => setAddForm({...addForm, expiry: e.target.value})}
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

      {/* Product Details Modal */}
      {selectedProduct && (
        <Modal title={selectedProduct.name} onClose={() => setSelectedProduct(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">SKU</label>
                <div className="text-sm font-mono">{selectedProduct.sku}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Category</label>
                <div className="text-sm">{selectedProduct.category}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Unit Price</label>
                <div className="text-sm font-bold">{currencyFormatter.format(selectedProduct.price)}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Stock Level</label>
                <div className="text-sm font-bold">{selectedProduct.stock} units</div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500">Expiry Date</label>
                <div className="text-sm">{selectedProduct.expiry}</div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleEditClick}
                className="flex-1 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white text-xs font-semibold py-2 transition-colors"
              >
                Edit Product
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <Modal title="Edit Product" onClose={handleEditCancel} size="lg">
          <form onSubmit={handleEditProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Product Name">
                <input
                  type="text"
                  className={inputCls}
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  placeholder="e.g. Del Monte Tomato Sauce 250g"
                  required
                />
              </FormField>
              <FormField label="SKU">
                <input
                  type="text"
                  className={inputCls}
                  value={editForm.sku}
                  onChange={e => setEditForm({...editForm, sku: e.target.value})}
                  placeholder="e.g. DM-TS-250"
                  required
                />
              </FormField>
              <FormField label="Category">
                <select
                  className={inputCls}
                  value={editForm.category}
                  onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                  required
                >
                  <option value="Food">Food</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Personal Care">Personal Care</option>
                </select>
              </FormField>
              <FormField label="Unit Price (₱)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={editForm.price}
                  onChange={e => setEditForm({...editForm, price: e.target.value})}
                  placeholder="e.g. 32.50"
                  required
                />
              </FormField>
              <FormField label="Stock Level">
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={editForm.stock}
                  onChange={e => setEditForm({...editForm, stock: e.target.value})}
                  placeholder="e.g. 100"
                  required
                />
              </FormField>
              <FormField label="Expiry Date">
                <input
                  type="date"
                  className={inputCls}
                  value={editForm.expiry}
                  onChange={e => setEditForm({...editForm, expiry: e.target.value})}
                  required
                />
              </FormField>
            </div>

            {editError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{editError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleEditCancel}
                className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] disabled:opacity-60 text-white text-xs font-semibold py-2 transition-colors"
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
