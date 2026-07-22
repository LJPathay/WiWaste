import React, { useState } from 'react';
import { Search, Plus, Info, Loader2 } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Modal, FormField, inputCls, useToast, Toast } from '../../components/ui/Toast';
import { useApi } from '../../hooks/useApi';
import {
  products as productsApi,
  categories as categoriesApi,
  suppliers as suppliersApi,
  type ApiProduct,
  type ApiCategory,
  type ApiSupplier,
  type CreateProductPayload,
} from '../../services/api';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

export function ManageProducts() {
  const { toasts, dismiss, success, error: toastError } = useToast();
  const { data: productList, loading: pLoading, error: pError, refetch: refetchProducts } = useApi<ApiProduct[]>(productsApi.list);
  const { data: categoryList } = useApi<ApiCategory[]>(categoriesApi.list);
  const { data: supplierList } = useApi<ApiSupplier[]>(suppliersApi.list);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [addForm, setAddForm] = useState({
    product_name: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    cost_price: '',
    selling_price: '',
    reorder_level: '10',
    expiration_date: '',
    initial_stock: '0',
  });

  const [editForm, setEditForm] = useState({
    product_name: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    cost_price: '',
    selling_price: '',
    reorder_level: '10',
    expiration_date: '',
  });

  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [processing, setProcessing] = useState(false);

  const products = productList ?? [];
  const categories = categoryList ?? [];
  const suppliers = supplierList ?? [];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          (p.sku?.toLowerCase() ?? '').includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || String(p.category_id) === categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.product_name.trim() || !addForm.category_id || !addForm.supplier_id || !addForm.cost_price || !addForm.selling_price) {
      setAddError('Product name, category, supplier, cost price, and selling price are required.');
      return;
    }

    setAddError('');
    setProcessing(true);

    try {
      const payload: CreateProductPayload = {
        product_name: addForm.product_name.trim(),
        barcode: addForm.barcode.trim() || undefined, // If empty, backend auto-generates SKU!
        category_id: Number(addForm.category_id),
        supplier_id: Number(addForm.supplier_id),
        cost_price: Number(addForm.cost_price),
        selling_price: Number(addForm.selling_price),
        reorder_level: Number(addForm.reorder_level || 10),
        expiration_date: addForm.expiration_date || undefined,
        initial_stock: Number(addForm.initial_stock || 0),
      };

      const res: any = await productsApi.create(payload);
      setShowAddModal(false);
      setAddForm({
        product_name: '', barcode: '', category_id: '', supplier_id: '',
        cost_price: '', selling_price: '', reorder_level: '10', expiration_date: '', initial_stock: '0',
      });
      success(`Product "${payload.product_name}" created successfully (SKU: ${res.sku ?? 'Auto-generated'}).`);
      refetchProducts();
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to create product.');
    } finally {
      setProcessing(false);
    }
  };

  const openEdit = (p: ApiProduct) => {
    setSelectedProduct(p);
    setEditForm({
      product_name: p.name,
      barcode: p.sku ?? '',
      category_id: String(p.category_id),
      supplier_id: String(p.supplier_id),
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      reorder_level: String(p.reorder_level),
      expiration_date: p.expiration_date ?? '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!editForm.product_name.trim() || !editForm.category_id || !editForm.supplier_id || !editForm.cost_price || !editForm.selling_price) {
      setEditError('All required fields must be filled.');
      return;
    }

    setEditError('');
    setProcessing(true);

    try {
      await productsApi.update(selectedProduct.id, {
        product_name: editForm.product_name.trim(),
        barcode: editForm.barcode.trim() || undefined,
        category_id: Number(editForm.category_id),
        supplier_id: Number(editForm.supplier_id),
        cost_price: Number(editForm.cost_price),
        selling_price: Number(editForm.selling_price),
        reorder_level: Number(editForm.reorder_level),
        expiration_date: editForm.expiration_date || undefined,
      });
      setShowEditModal(false);
      setSelectedProduct(null);
      success(`Product "${editForm.product_name}" updated successfully.`);
      refetchProducts();
    } catch (err: any) {
      setEditError(err.message ?? 'Failed to update product.');
    } finally {
      setProcessing(false);
    }
  };

  const handleArchive = async (id: number, name: string, status?: string) => {
    const action = status === 'Discontinued' ? 're-activate' : 'discontinue/archive';
    if (!confirm(`Are you sure you want to ${action} "${name}"? Historical sales, wastage logs, and forecast records for this item will be safely preserved for audit compliance.`)) return;
    try {
      await productsApi.delete(id);
      success(`Product "${name}" status updated.`);
      refetchProducts();
    } catch (err: any) {
      toastError(err.message ?? 'Failed to update product status.');
    }
  };

  if (pLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[#006a61]" />
      <span className="ml-3 text-slate-600 dark:text-slate-400">Loading product catalogue...</span>
    </div>
  );

  if (pError) return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
      Failed to load products: {pError}
    </div>
  );

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
                Maintain product specifications, cost structures, and SKUs.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={() => { setAddError(''); setShowAddModal(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCategoryFilter('All')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                categoryFilter === 'All'
                  ? 'bg-[#006a61] text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(String(c.id))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                  categoryFilter === String(c.id)
                    ? 'bg-[#006a61] text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
            />
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
            <tr>
              <th className="px-6 py-3">Product Name</th>
              <th className="px-6 py-3">SKU / Barcode</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Supplier</th>
              <th className="px-6 py-3">Cost Price</th>
              <th className="px-6 py-3">Selling Price</th>
              <th className="px-6 py-3">Stock Level</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-slate-400">No products found.</td>
              </tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50/20 dark:hover:bg-white/5 ${p.status === 'Discontinued' ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/30' : ''}`}>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{p.sku ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.category}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.supplier ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{currencyFormatter.format(p.cost_price)}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-700 dark:text-emerald-400">{currencyFormatter.format(p.selling_price)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.stock <= 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        : p.stock <= p.reorder_level
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}>
                      {p.stock} units ({p.stock_status})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Discontinued'
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {p.status ?? 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleArchive(p.id, p.name, p.status)}
                      className={`text-xs font-bold hover:underline ${
                        p.status === 'Discontinued' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {p.status === 'Discontinued' ? 'Re-activate' : 'Archive'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <FormField label="Product Name">
              <input type="text" required placeholder="e.g. Biogesic Paracetamol 500mg" value={addForm.product_name}
                onChange={e => setAddForm(f => ({ ...f, product_name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="SKU / Barcode (Leave blank for automatic SKU generation)">
              <input type="text" placeholder="Auto-generated if empty" value={addForm.barcode}
                onChange={e => setAddForm(f => ({ ...f, barcode: e.target.value }))} className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category">
                <select required value={addForm.category_id} onChange={e => setAddForm(f => ({ ...f, category_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Supplier">
                <select required value={addForm.supplier_id} onChange={e => setAddForm(f => ({ ...f, supplier_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cost Price (₱)">
                <input type="number" step="0.01" required min="0" placeholder="0.00" value={addForm.cost_price}
                  onChange={e => setAddForm(f => ({ ...f, cost_price: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Selling Price (₱)">
                <input type="number" step="0.01" required min="0" placeholder="0.00" value={addForm.selling_price}
                  onChange={e => setAddForm(f => ({ ...f, selling_price: e.target.value }))} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Reorder Level">
                <input type="number" required min="0" value={addForm.reorder_level}
                  onChange={e => setAddForm(f => ({ ...f, reorder_level: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Initial Stock">
                <input type="number" min="0" value={addForm.initial_stock}
                  onChange={e => setAddForm(f => ({ ...f, initial_stock: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Expiration Date">
                <input type="date" value={addForm.expiration_date}
                  onChange={e => setAddForm(f => ({ ...f, expiration_date: e.target.value }))} className={inputCls} />
              </FormField>
            </div>
            {addError && <p className="text-red-600 text-xs">{addError}</p>}
            <button type="submit" disabled={processing}
              className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Creating Product…</> : 'Create Product'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <Modal title="Edit Product" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditProduct} className="space-y-4">
            <FormField label="Product Name">
              <input type="text" required placeholder="Product Name" value={editForm.product_name}
                onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="SKU / Barcode">
              <input type="text" placeholder="Barcode" value={editForm.barcode}
                onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))} className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category">
                <select required value={editForm.category_id} onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Supplier">
                <select required value={editForm.supplier_id} onChange={e => setEditForm(f => ({ ...f, supplier_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cost Price (₱)">
                <input type="number" step="0.01" required min="0" value={editForm.cost_price}
                  onChange={e => setEditForm(f => ({ ...f, cost_price: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Selling Price (₱)">
                <input type="number" step="0.01" required min="0" value={editForm.selling_price}
                  onChange={e => setEditForm(f => ({ ...f, selling_price: e.target.value }))} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Reorder Level">
                <input type="number" required min="0" value={editForm.reorder_level}
                  onChange={e => setEditForm(f => ({ ...f, reorder_level: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Expiration Date">
                <input type="date" value={editForm.expiration_date}
                  onChange={e => setEditForm(f => ({ ...f, expiration_date: e.target.value }))} className={inputCls} />
              </FormField>
            </div>
            {editError && <p className="text-red-600 text-xs">{editError}</p>}
            <button type="submit" disabled={processing}
              className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Saving Changes…</> : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
