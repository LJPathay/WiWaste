import React, { useState, useEffect } from 'react';
import { Search, Plus, Info, Loader2, ChevronLeft, ChevronRight, Package, AlertCircle } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Tutorial } from '../../components/ui/Tutorial';
import { Modal, FormField, inputCls, useToast, Toast, ConfirmDialog } from '../../components/ui/Toast';
import { useOptimisticList } from '../../hooks/useOptimisticList';
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

const ITEMS_PER_PAGE = 5;

export function ManageProducts() {
  const { toasts, dismiss, success, error: toastError } = useToast();
  const { data: productList, loading: pLoading, error: pError, addItem, updateItem, removeItem, refetch: refetchProducts } = useOptimisticList(productsApi.list);
  const { data: categoryList } = useOptimisticList(categoriesApi.list);
  const { data: supplierList } = useOptimisticList(suppliersApi.list);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Discontinued'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmptyNotification, setShowEmptyNotification] = useState(false);
  const [notificationCountdown, setNotificationCountdown] = useState(20);
  const [showTutorial, setShowTutorial] = useState(false);

  const tutorialSteps = [
    {
      id: 'add-product-btn',
      title: 'Add New Product',
      description: 'Click here to add a new product to your inventory. You\'ll need to provide product name, category, supplier, and pricing information.',
      targetSelector: 'button:has(svg.lucide-plus):first-of-type',
      position: 'bottom' as const,
    },
    {
      id: 'status-filter',
      title: 'Filter by Status',
      description: 'Use these tabs to view All Products, Active items, or Discontinued products.',
      targetSelector: '.flex.flex-wrap.items-center.gap-1\.5.bg-slate-100',
      position: 'bottom' as const,
    },
    {
      id: 'category-filter',
      title: 'Filter by Category',
      description: 'Select a specific category to view only products in that category.',
      targetSelector: 'select',
      position: 'bottom' as const,
    },
    {
      id: 'search-bar',
      title: 'Search Products',
      description: 'Search for products by name or SKU/Barcode to quickly find items.',
      targetSelector: 'input[placeholder*="Search product"]',
      position: 'bottom' as const,
    },
    {
      id: 'product-table',
      title: 'Product List',
      description: 'View all products with their details including cost price, selling price, and stock levels. Use Edit to modify or Archive to discontinue.',
      targetSelector: 'table',
      position: 'top' as const,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTutorial) {
        setShowTutorial(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTutorial]);

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
  const [archiving, setArchiving] = useState<{ id: number; name: string; status?: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);

  const products = productList ?? [];
  const categories = categoryList ?? [];
  const suppliers = supplierList ?? [];

  // Show empty notification when table is empty and no filters applied
  useEffect(() => {
    const isFiltered = statusFilter !== 'all' || categoryFilter !== 'All' || search !== '';
    if (products.length === 0 && !isFiltered && !pLoading && !pError) {
      setShowEmptyNotification(true);
      setNotificationCountdown(20);
      const timer = setTimeout(() => setShowEmptyNotification(false), 20000);
      return () => clearTimeout(timer);
    }
  }, [products.length, statusFilter, categoryFilter, search, pLoading, pError]);

  // Countdown timer for notification
  useEffect(() => {
    if (!showEmptyNotification) return;
    const interval = setInterval(() => {
      setNotificationCountdown(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [showEmptyNotification]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter]);
  const isDuplicateAddName = Boolean(
    addForm?.product_name?.trim() &&
    products.some(p => p.name.trim().toLowerCase() === addForm.product_name.trim().toLowerCase())
  );

  const isDuplicateAddBarcode = Boolean(
    addForm?.barcode?.trim() &&
    products.some(p => p.sku && p.sku.trim().toLowerCase() === addForm.barcode.trim().toLowerCase())
  );

  const isDuplicateEditName = Boolean(
    selectedProduct && editForm?.product_name?.trim() &&
    products.some(p => p.id !== selectedProduct.id && p.name.trim().toLowerCase() === editForm.product_name.trim().toLowerCase())
  );

  const isDuplicateEditBarcode = Boolean(
    selectedProduct && editForm?.barcode?.trim() &&
    products.some(p => p.id !== selectedProduct.id && p.sku && p.sku.trim().toLowerCase() === editForm.barcode.trim().toLowerCase())
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          (p.category?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
                          (p.sku?.toLowerCase() ?? '').includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || String(p.category_id) === categoryFilter || p.category === categoryFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = p.status !== 'Discontinued';
    } else if (statusFilter === 'Discontinued') {
      matchesStatus = p.status === 'Discontinued';
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length);
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Checkbox Selection Logic
  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedProducts.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedProducts.map(p => p.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkArchiving(true);
    try {
      await Promise.all(selectedIds.map(id => productsApi.delete(id)));
      selectedIds.forEach(id => removeItem(id));
      success(`Successfully archived ${selectedIds.length} products.`);
      setSelectedIds([]);
      setShowBulkArchiveConfirm(false);
      refetchProducts();
    } catch (err: any) {
      toastError(err.message || 'Failed to archive selected products.');
    } finally {
      setIsBulkArchiving(false);
    }
  };

  const activeCount = products.filter(p => p.status !== 'Discontinued').length;
  const discontinuedCount = products.filter(p => p.status === 'Discontinued').length;
  const allCount = products.length;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.product_name.trim() || !addForm.category_id || !addForm.supplier_id || !addForm.cost_price || !addForm.selling_price) {
      setAddError('Product name, category, supplier, cost price, and selling price are required.');
      return;
    }

    if (isDuplicateAddName) {
      setAddError('A product with this name already exists.');
      return;
    }

    if (isDuplicateAddBarcode) {
      setAddError('A product with this SKU / Barcode already exists.');
      return;
    }

    setAddError('');
    setProcessing(true);

    try {
      const payload: CreateProductPayload = {
        product_name: addForm.product_name.trim(),
        barcode: addForm.barcode.trim() || undefined,
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
      addItem(res as ApiProduct);
      await refetchProducts();
      success(`Product "${payload.product_name}" created successfully.`);
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

    if (isDuplicateEditName) {
      setEditError('A product with this name already exists.');
      return;
    }

    if (isDuplicateEditBarcode) {
      setEditError('A product with this SKU / Barcode already exists.');
      return;
    }

    setEditError('');
    setProcessing(true);

    try {
      const updated = await productsApi.update(selectedProduct.id, {
        product_name: editForm.product_name.trim(),
        barcode: editForm.barcode.trim() || undefined,
        category_id: Number(editForm.category_id),
        supplier_id: Number(editForm.supplier_id),
        cost_price: Number(editForm.cost_price),
        selling_price: Number(editForm.selling_price),
        reorder_level: Number(editForm.reorder_level),
        expiration_date: editForm.expiration_date || undefined,
      }) as ApiProduct;
      updateItem(selectedProduct.id, updated);
      setShowEditModal(false);
      setSelectedProduct(null);
      await refetchProducts();
      success(`Product "${editForm.product_name}" updated successfully.`);
    } catch (err: any) {
      setEditError(err.message ?? 'Failed to update product.');
    } finally {
      setProcessing(false);
    }
  };

  const handleArchive = async (id: number, name: string, status?: string) => {
    try {
      await productsApi.delete(id);
      removeItem(id);
      await refetchProducts();
      success(`Product "${name}" status updated.`);
    } catch (err: any) {
      toastError(err.message ?? 'Failed to update product status.');
    }
    setArchiving(null);
  };

  if (pLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <Package className="h-8 w-8 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Loading products...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Fetching product catalogue</p>
      </div>
    </div>
  );


  if (pError) {
    const errorCode = pError.match(/\((\d+)\)/)?.[1] || 'Unknown';
    const errorMessage = errorCode === '2002' ? "There's no connection (2002)" : `Connection error (${errorCode})`;
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load products</p>
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={() => refetchProducts()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          Try Again
        </button>
      </div>
    );
  }

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

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Status:</span>
              {[
                { id: 'all', label: 'All Products', count: allCount },
                { id: 'Active', label: 'Active', count: activeCount },
                { id: 'Discontinued', label: 'Discontinued', count: discontinuedCount },
              ].map(tab => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category Dropdown & Search & Reset */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative max-w-xs w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
                />
              </div>

              {(statusFilter !== 'all' || categoryFilter !== 'All' || search !== '') && (
                <button
                  onClick={() => { setStatusFilter('all'); setCategoryFilter('All'); setSearch(''); }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-[#006a61]/10 border-b border-[#006a61]/20 px-6 py-2.5 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2 text-[#006a61] dark:text-[#7ef0cf] font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-[#006a61] text-white font-bold text-[11px]">
                {selectedIds.length}
              </span>
              <span>{selectedIds.length === 1 ? '1 product selected' : `${selectedIds.length} products selected`}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium hover:underline"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setShowBulkArchiveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all shadow-sm"
              >
                Archive Selected ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                  title="Select / Deselect all on current page"
                />
              </th>
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
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-slate-400">No products found.</td>
              </tr>
            ) : (
              paginatedProducts.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/20 dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''} ${p.status === 'Discontinued' ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/30' : ''}`}>
                    <td className="w-10 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(p.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                      />
                    </td>
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
                        onClick={() => setArchiving({ id: p.id, name: p.name, status: p.status })}
                        className={`text-xs font-bold hover:underline ${
                          p.status === 'Discontinued' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {p.status === 'Discontinued' ? 'Re-activate' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Empty State Notification */}
        {showEmptyNotification && (
          <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg shadow-lg p-4 max-w-sm flex items-start gap-3 overflow-hidden">
              <div className="absolute bottom-0 left-0 h-1 bg-blue-600 dark:bg-blue-400 transition-all" style={{ width: `${(notificationCountdown / 20) * 100}%` }}></div>
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Hmm, the table is empty</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Input some data to get started</p>
              </div>
              <button
                onClick={() => { setShowEmptyNotification(false); setShowTutorial(true); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-all shrink-0"
              >
                Quick Guide
              </button>
            </div>
          </div>
        )}

        {/* Table Footer Showing Entry Count & Pagination Controls */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {filteredProducts.length === 0 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> Products</>
            ) : totalPages === 1 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> Products</>
            ) : (
              <>
                Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> Products
              </>
            )}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <FormField label="Product Name">
              <input type="text" required placeholder="e.g. Biogesic Paracetamol 500mg" value={addForm.product_name}
                onChange={e => setAddForm(f => ({ ...f, product_name: e.target.value }))} className={inputCls} />
              {isDuplicateAddName && <p className="text-red-500 text-[11px] mt-1">Product name already exists.</p>}
            </FormField>
            <FormField label="SKU / Barcode (Leave blank for automatic SKU generation)">
              <input type="text" placeholder="Auto-generated if empty" value={addForm.barcode}
                onChange={e => setAddForm(f => ({ ...f, barcode: e.target.value }))} className={inputCls} />
              {isDuplicateAddBarcode && <p className="text-red-500 text-[11px] mt-1">SKU / Barcode already exists.</p>}
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
              {isDuplicateEditName && <p className="text-red-500 text-[11px] mt-1">Product name already exists.</p>}
            </FormField>
            <FormField label="SKU / Barcode">
              <input type="text" placeholder="Barcode" value={editForm.barcode}
                onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))} className={inputCls} />
              {isDuplicateEditBarcode && <p className="text-red-500 text-[11px] mt-1">SKU / Barcode already exists.</p>}
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

      {archiving && (
        <ConfirmDialog
          message={`Are you sure you want to ${archiving.status === 'Discontinued' ? 're-activate' : 'archive'} "${archiving.name}"? Historical sales, wastage logs, and forecast records for this item will be safely preserved for audit compliance.`}
          confirmLabel={archiving.status === 'Discontinued' ? 'Re-activate' : 'Archive'}
          onConfirm={() => handleArchive(archiving.id, archiving.name, archiving.status)}
          onCancel={() => setArchiving(null)}
        />
      )}

      {showBulkArchiveConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to archive ${selectedIds.length} selected products? Historical sales and records for these items will be preserved.`}
          confirmLabel={isBulkArchiving ? "Archiving..." : `Archive ${selectedIds.length} Products`}
          danger
          onConfirm={handleBulkArchive}
          onCancel={() => setShowBulkArchiveConfirm(false)}
        />
      )}

      {/* Tutorial Component */}
      <Tutorial steps={tutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
