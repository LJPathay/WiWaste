import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, Loader2, Info, ChevronLeft, ChevronRight, Briefcase, AlertCircle } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Tutorial } from '../../components/ui/Tutorial';
import {
  Toast,
  useToast,
  Modal,
  ConfirmDialog,
  FormField,
  inputCls,
} from '../../components/ui/Toast';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { suppliers as suppliersApi, type ApiSupplier } from '../../services/api';

const EMPTY_FORM = {
  supplier_name: '',
  contact_person: '',
  contact_number: '',
  address: '',
};

const ITEMS_PER_PAGE = 5;

export function ManageSuppliers() {
  const { data: supplierList, loading, error: fetchError, addItem, updateItem, removeItem, refetch: refetchSuppliers } = useOptimisticList(suppliersApi.list);
  const { toasts, dismiss, success, error } = useToast();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'products-desc' | 'products-asc' | 'id-desc'>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showEmptyNotification, setShowEmptyNotification] = useState(false);
  const [notificationCountdown, setNotificationCountdown] = useState(20);
  const [showTutorial, setShowTutorial] = useState(false);

  const tutorialSteps = [
    {
      id: 'add-supplier-btn',
      title: 'Add New Supplier',
      description: 'Click here to add a new supplier to your system. You\'ll need to provide supplier name, contact person, phone number, and address.',
      targetSelector: 'button:has(svg.lucide-plus):first-of-type',
      position: 'bottom' as const,
    },
    {
      id: 'sort-dropdown',
      title: 'Sort Suppliers',
      description: 'Use this dropdown to sort suppliers alphabetically or by number of products supplied.',
      targetSelector: 'select',
      position: 'bottom' as const,
    },
    {
      id: 'search-bar',
      title: 'Search Suppliers',
      description: 'Search for suppliers by name, contact person, or phone number.',
      targetSelector: 'input[placeholder*="Search by name"]',
      position: 'bottom' as const,
    },
    {
      id: 'supplier-table',
      title: 'Supplier List',
      description: 'View all suppliers with their contact information and product counts. Use Edit to modify or Delete to remove.',
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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<ApiSupplier | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);

  const [archivingSupplier, setArchivingSupplier] = useState<ApiSupplier | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const suppliers = supplierList ?? [];

  // Show empty notification when table is empty and no search applied
  useEffect(() => {
    if (suppliers.length === 0 && search === '' && !loading && !fetchError) {
      setShowEmptyNotification(true);
      setNotificationCountdown(20);
      const timer = setTimeout(() => setShowEmptyNotification(false), 20000);
      return () => clearTimeout(timer);
    }
  }, [suppliers.length, search, loading, fetchError]);

  // Countdown timer for notification
  useEffect(() => {
    if (!showEmptyNotification) return;
    const interval = setInterval(() => {
      setNotificationCountdown(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [showEmptyNotification]);

  // Duplicate supplier checks
  const isDuplicateAddName = Boolean(
    addForm.supplier_name.trim() &&
    suppliers.some(s => s?.name && typeof s.name === 'string' && s.name.trim().toLowerCase() === addForm.supplier_name.trim().toLowerCase())
  );

  const isDuplicateAddPhone = Boolean(
    addForm.contact_number.trim() &&
    suppliers.some(s => s?.contact_number && typeof s.contact_number === 'string' && s.contact_number.trim() === addForm.contact_number.trim())
  );

  const isDuplicateEditName = Boolean(
    editingSupplier && editForm.supplier_name.trim() &&
    suppliers.some(s => s?.id !== editingSupplier.id && s?.name && typeof s.name === 'string' && s.name.trim().toLowerCase() === editForm.supplier_name.trim().toLowerCase())
  );

  const isDuplicateEditPhone = Boolean(
    editingSupplier && editForm.contact_number.trim() &&
    suppliers.some(s => s?.id !== editingSupplier.id && s?.contact_number && typeof s.contact_number === 'string' && s.contact_number.trim() === editForm.contact_number.trim())
  );

  const filtered = [...suppliers]
    .filter(s =>
      s && s.name && typeof s.name === 'string' && (
        s.name.toLowerCase().includes((search || '').toLowerCase()) ||
        (s.contact_person?.toLowerCase() ?? '').includes((search || '').toLowerCase()) ||
        (s.contact_number ?? '').includes(search)
      )
    )
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'products-desc') return (b.product_count ?? 0) - (a.product_count ?? 0);
      if (sortBy === 'products-asc') return (a.product_count ?? 0) - (b.product_count ?? 0);
      if (sortBy === 'id-desc') return (b.id ?? 0) - (a.id ?? 0);
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const paginatedSuppliers = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Checkbox Selection Logic
  const isAllSelected = paginatedSuppliers.length > 0 && paginatedSuppliers.every(s => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedSuppliers.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedSuppliers.map(s => s.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => suppliersApi.delete(id)));
      selectedIds.forEach(id => removeItem(id));
      success(`Successfully deleted ${selectedIds.length} suppliers.`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      refetchSuppliers();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete selected suppliers.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.supplier_name.trim() || !addForm.contact_number.trim()) {
      error('Please fill in all required fields.');
      return;
    }

    if (isDuplicateAddName) {
      error('A supplier with this name already exists.');
      return;
    }

    if (isDuplicateAddPhone) {
      error('A supplier with this phone number already exists.');
      return;
    }

    setAddLoading(true);
    try {
      const created = (await suppliersApi.create(addForm)) as ApiSupplier;
      setIsAddOpen(false);
      const newItem: ApiSupplier = {
        id: created.id,
        name: created.name ?? addForm.supplier_name.trim(),
        contact_person: created.contact_person ?? (addForm.contact_person.trim() || null),
        contact_number: created.contact_number ?? addForm.contact_number.trim(),
        address: created.address ?? (addForm.address.trim() || null),
        product_count: created.product_count ?? 0,
      };
      addItem(newItem);
      await refetchSuppliers();
      success(`Supplier "${newItem.name}" added successfully.`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to add supplier');
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (s: ApiSupplier) => {
    setEditingSupplier(s);
    setEditForm({
      supplier_name: s.name,
      contact_person: s.contact_person ?? '',
      contact_number: s.contact_number,
      address: s.address ?? '',
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!editForm.supplier_name.trim() || !editForm.contact_number.trim()) {
      error('Please fill in all required fields.');
      return;
    }

    if (isDuplicateEditName) {
      error('A supplier with this name already exists.');
      return;
    }

    if (isDuplicateEditPhone) {
      error('A supplier with this phone number already exists.');
      return;
    }

    setEditLoading(true);
    try {
      const updated = await suppliersApi.update(editingSupplier.id, editForm) as ApiSupplier;
      updateItem(editingSupplier.id, updated);
      setEditingSupplier(null);
      await refetchSuppliers();
      success(`Supplier "${editForm.supplier_name}" updated successfully.`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to update supplier');
    } finally {
      setEditLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archivingSupplier) return;
    setArchiveLoading(true);
    try {
      await suppliersApi.delete(archivingSupplier.id);
      const name = archivingSupplier.name;
      removeItem(archivingSupplier.id);
      setArchivingSupplier(null);
      await refetchSuppliers();
      success(`Supplier "${name}" has been deleted.`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete supplier');
    } finally {
      setArchiveLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <Briefcase className="h-8 w-8 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Loading suppliers...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Fetching supplier list</p>
      </div>
    </div>
  );


  if (fetchError) {
    const errorCode = fetchError.match(/\((\d+)\)/)?.[1] || 'Unknown';
    const errorMessage = errorCode === '2002' ? "There's no connection (2002)" : `Connection error (${errorCode})`;
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load suppliers</p>
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={() => refetchSuppliers()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Suppliers</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                View and manage your product suppliers.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg">
              All Suppliers ({suppliers.length})
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'name-asc' | 'name-desc' | 'products-desc' | 'products-asc' | 'id-desc')}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
            >
              <option value="name-asc">Sort: A - Z</option>
              <option value="name-desc">Sort: Z - A</option>
              <option value="products-desc">Sort: Most Products Supplied</option>
              <option value="products-asc">Sort: Least Products Supplied</option>
              <option value="id-desc">Sort: Newest Added</option>
            </select>

            <div className="relative max-w-sm w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, contact or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-300"
              />
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
              <span>{selectedIds.length === 1 ? '1 supplier selected' : `${selectedIds.length} suppliers selected`}</span>
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
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-all shadow-sm"
              >
                <Archive className="h-3.5 w-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 font-bold">
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Person</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Products</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">No suppliers found.</td>
                </tr>
              ) : (
                paginatedSuppliers.map(s => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}`}>
                      <td className="w-10 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(s.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.contact_person ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{s.contact_number}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.address ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{s.product_count ?? 0} items</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-4">
                          <button
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setArchivingSupplier(s)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Delete
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
            {filtered.length === 0 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> Suppliers</>
            ) : totalPages === 1 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</strong> Suppliers</>
            ) : (
              <>
                Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</strong> Suppliers
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

      {/* Add Modal */}
      {isAddOpen && (
        <Modal title="Add New Supplier" onClose={() => { if (!addLoading) setIsAddOpen(false); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            <FormField label="Supplier Name">
              <input type="text" required placeholder="e.g. FreshPack Co." value={addForm.supplier_name}
                onChange={e => setAddForm(f => ({ ...f, supplier_name: e.target.value }))} className={inputCls} />
              {isDuplicateAddName && <p className="text-red-500 text-[11px] mt-1">Supplier name already exists.</p>}
            </FormField>
            <FormField label="Contact Person">
              <input type="text" placeholder="e.g. Ana Reyes" value={addForm.contact_person}
                onChange={e => setAddForm(f => ({ ...f, contact_person: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Phone Number">
              <input type="tel" required placeholder="09XXXXXXXXX" value={addForm.contact_number}
                onChange={e => setAddForm(f => ({ ...f, contact_number: e.target.value }))} className={inputCls} />
              {isDuplicateAddPhone && <p className="text-red-500 text-[11px] mt-1">Phone number already exists.</p>}
            </FormField>
            <FormField label="Address">
              <input type="text" placeholder="Metro Manila, PH" value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
            </FormField>
            <button type="submit" disabled={addLoading || isDuplicateAddName || isDuplicateAddPhone}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {addLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : 'Add Supplier'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingSupplier && (
        <Modal title="Edit Supplier" onClose={() => { if (!editLoading) setEditingSupplier(null); }}>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Supplier Name">
              <input type="text" required placeholder="e.g. FreshPack Co." value={editForm.supplier_name}
                onChange={e => setEditForm(f => ({ ...f, supplier_name: e.target.value }))} className={inputCls} />
              {isDuplicateEditName && <p className="text-red-500 text-[11px] mt-1">Supplier name already exists.</p>}
            </FormField>
            <FormField label="Contact Person">
              <input type="text" placeholder="e.g. Ana Reyes" value={editForm.contact_person}
                onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Phone Number">
              <input type="tel" required placeholder="09XXXXXXXXX" value={editForm.contact_number}
                onChange={e => setEditForm(f => ({ ...f, contact_number: e.target.value }))} className={inputCls} />
              {isDuplicateEditPhone && <p className="text-red-500 text-[11px] mt-1">Phone number already exists.</p>}
            </FormField>
            <FormField label="Address">
              <input type="text" placeholder="Metro Manila, PH" value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
            </FormField>
            <button type="submit" disabled={editLoading || isDuplicateEditName || isDuplicateEditPhone}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {editLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {archivingSupplier && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${archivingSupplier.name}"? This operation cannot be undone.`}
          confirmLabel={archiveLoading ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleArchive}
          onCancel={() => { if (!archiveLoading) setArchivingSupplier(null); }}
        />
      )}

      {showBulkDeleteConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete ${selectedIds.length} selected suppliers? This operation cannot be undone.`}
          confirmLabel={isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.length} Suppliers`}
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}

      {/* Tutorial Component */}
      <Tutorial steps={tutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
