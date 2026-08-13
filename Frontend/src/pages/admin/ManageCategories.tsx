import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Edit2, Archive, Info, Loader2,
  ChevronLeft, ChevronRight, Check, Grid, Sparkles,
  CupSoda, Coffee, Utensils, Apple, Beef, Cookie,
  Pill, HeartPulse, Home, Recycle,
  Shirt, Tag, Tv, Flame, Wheat, AlertCircle
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Tutorial } from '../../components/ui/Tutorial';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { categories as categoriesApi, type ApiCategory } from '../../services/api';

const ITEMS_PER_PAGE = 5;

const PRESET_CATEGORIES = [
  'Beverages',
  'Coffee & Cafe',
  'Fresh Produce & Fruits',
  'Meat & Seafood',
  'Snacks & Bakery',
  'Grains & Pasta',
  'Prepared Meals & Deli',
  'Health & Pharma',
  'Personal Care',
  'Electronics & Appliances',
  'Household & Cleaning',
  'Recyclables',
  'Apparel & Clothing',
  'Chemicals & Fuel',
  'Others',
];

/**
 * Automated Category Icon Resolver
 * Maps category name keywords to representative icons and colors
 */
const getCategoryIcon = (categoryName: string = '') => {
  const lower = (categoryName || '').toLowerCase().trim();
  
  if (/beverage|drink|soda|juice|water|tea|milk|liquid|alcohol|beer|wine|boba|beverages/.test(lower)) {
    return { icon: CupSoda, label: 'Beverages', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' };
  }
  if (/coffee|espresso|cafe|latte|cappuccino/.test(lower)) {
    return { icon: Coffee, label: 'Coffee', color: 'text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
  }
  if (/fruit|apple|banana|berry|orange|produce|fresh|vegetable/.test(lower)) {
    return { icon: Apple, label: 'Produce', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' };
  }
  if (/meat|beef|pork|chicken|poultry|seafood|fish|steak/.test(lower)) {
    return { icon: Beef, label: 'Meat & Seafood', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' };
  }
  if (/snack|cookie|biscuit|chip|candy|sweets|dessert|bakery|bread|cake|chips/.test(lower)) {
    return { icon: Cookie, label: 'Snacks & Bakery', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' };
  }
  if (/grain|wheat|rice|cereal|flour|pasta|noodle/.test(lower)) {
    return { icon: Wheat, label: 'Grains & Pasta', color: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50' };
  }
  if (/food|meal|grocery|canned|deli|dish|restaurant/.test(lower)) {
    return { icon: Utensils, label: 'Food & Meals', color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800/50' };
  }
  if (/medicine|pharma|drug|pill|health|medical|clinic|vitamin|supplement|pharma/.test(lower)) {
    return { icon: Pill, label: 'Health & Pharma', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50' };
  }
  if (/care|wellness|hygiene|cosmetic|beauty|soap|shampoo|skincare/.test(lower)) {
    return { icon: HeartPulse, label: 'Personal Care', color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800/50' };
  }
  if (/electronic|tech|gadget|appliance|device|phone|computer|tv/.test(lower)) {
    return { icon: Tv, label: 'Electronics', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50' };
  }
  if (/home|house|cleaning|detergent|paper|toilet|kitchen|household/.test(lower)) {
    return { icon: Home, label: 'Household', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' };
  }
  if (/recycle|waste|trash|plastic|compost|organic|green/.test(lower)) {
    return { icon: Recycle, label: 'Recyclables', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
  }
  if (/clothing|apparel|shirt|wear|fashion|textile/.test(lower)) {
    return { icon: Shirt, label: 'Apparel', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' };
  }
  if (/oil|fuel|gas|chemical/.test(lower)) {
    return { icon: Flame, label: 'Chemicals & Fuel', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50' };
  }

  // Default fallback
  return { icon: Tag, label: 'General', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
};

export function ManageCategories() {
  const { toasts, dismiss, success, error } = useToast();
  const { data: categoryList, loading, error: fetchError, addItem, updateItem, removeItem, refetch: refetchCategories } = useOptimisticList(categoriesApi.list);
  
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
      id: 'add-category-btn',
      title: 'Add New Category',
      description: 'Click here to create new product categories. You can add multiple categories at once and choose from preset types or create custom ones.',
      targetSelector: 'button:has(svg.lucide-plus):first-of-type',
      position: 'bottom' as const,
    },
    {
      id: 'sort-dropdown',
      title: 'Sort Categories',
      description: 'Use this dropdown to sort categories alphabetically, by product count, or by newest added.',
      targetSelector: 'select',
      position: 'bottom' as const,
    },
    {
      id: 'search-bar',
      title: 'Search Categories',
      description: 'Search for categories by name to quickly find specific ones.',
      targetSelector: 'input[placeholder*="Search category"]',
      position: 'bottom' as const,
    },
    {
      id: 'category-table',
      title: 'Category List',
      description: 'View all categories with their auto-assigned icons and product counts. Click Edit to rename or Delete to remove.',
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  
  // Multi-category addition state
  const [names, setNames] = useState<string[]>(['']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['']);
  const [editName, setEditName] = useState('');
  
  // Visual Tile Picker Modal state
  const [tilePickerRowIndex, setTilePickerRowIndex] = useState<number | null>(null);
  const [tileSearch, setTileSearch] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const categories = categoryList ?? [];

  // Show empty notification when table is empty and no search applied
  useEffect(() => {
    if (categories.length === 0 && search === '' && !loading && !fetchError) {
      setShowEmptyNotification(true);
      setNotificationCountdown(20);
      const timer = setTimeout(() => setShowEmptyNotification(false), 20000);
      return () => clearTimeout(timer);
    }
  }, [categories.length, search, loading, fetchError]);

  // Countdown timer for notification
  useEffect(() => {
    if (!showEmptyNotification) return;
    const interval = setInterval(() => {
      setNotificationCountdown(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [showEmptyNotification]);

  // Multi-category add duplicate & validation checks
  const existingNamesLower = new Set(categories.map(c => c?.name?.toLowerCase().trim()).filter(Boolean));
  
  const hasEmptyAddNames = names.every(n => !n.trim());
  const duplicateExistingAdd = names.some(n => n.trim() && existingNamesLower.has(n.trim().toLowerCase()));
  
  // Check duplicates within the modal rows themselves
  const filledAddNames = names.map(n => n.trim().toLowerCase()).filter(Boolean);
  const hasInternalDuplicates = new Set(filledAddNames).size !== filledAddNames.length;

  const isDuplicateEditName = Boolean(
    editingCategory && editName.trim() &&
    categories.some(c => c?.id !== editingCategory.id && c?.name && typeof c.name === 'string' && c.name.trim().toLowerCase() === editName.trim().toLowerCase())
  );

  const filteredCategories = [...categories]
    .filter(c => c && c.name && typeof c.name === 'string' && c.name.toLowerCase().includes((search || '').toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'products-desc') return (b.product_count ?? 0) - (a.product_count ?? 0);
      if (sortBy === 'products-asc') return (a.product_count ?? 0) - (b.product_count ?? 0);
      if (sortBy === 'id-desc') return (b.id ?? 0) - (a.id ?? 0);
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredCategories.length);
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Checkbox Selection Logic
  const isAllSelected = paginatedCategories.length > 0 && paginatedCategories.every(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedCategories.map(c => c.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedCategories.map(c => c.id);
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
      await Promise.all(selectedIds.map(id => categoriesApi.delete(id)));
      selectedIds.forEach(id => removeItem(id));
      success(`Successfully deleted ${selectedIds.length} categories.`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      refetchCategories();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete selected categories.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleAddRow = () => {
    setNames(prev => [...prev, '']);
    setSelectedTypes(prev => [...prev, '']);
  };

  const handleRemoveRow = (index: number) => {
    if (names.length <= 1) return;
    setNames(prev => prev.filter((_, i) => i !== index));
    setSelectedTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleDropdownChange = (index: number, val: string) => {
    setSelectedTypes(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
    setNames(prev => {
      const updated = [...prev];
      if (val === 'Others') {
        if (PRESET_CATEGORIES.includes(updated[index])) {
          updated[index] = '';
        }
      } else {
        updated[index] = val;
      }
      return updated;
    });
  };

  const handleCustomNameChange = (index: number, val: string) => {
    setNames(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleSelectTile = (index: number, catName: string) => {
    handleDropdownChange(index, catName);
    setTilePickerRowIndex(null);
    setTileSearch('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const validNames = names.map(n => n.trim()).filter(Boolean);
    if (validNames.length === 0) return;

    if (duplicateExistingAdd) {
      setFormError('One or more category names already exist in the database.');
      return;
    }

    if (hasInternalDuplicates) {
      setFormError('Duplicate category names entered in form.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const addedItems: ApiCategory[] = [];
      for (const catName of validNames) {
        const created = await categoriesApi.create(catName) as ApiCategory;
        const newItem: ApiCategory = {
          id: created.id,
          name: created.name ?? catName,
          product_count: created.product_count ?? 0,
        };
        addedItems.push(newItem);
        addItem(newItem);
      }
      setNames(['']);
      setSelectedTypes(['']);
      setIsAddOpen(false);
      await refetchCategories();
      
      if (addedItems.length === 1) {
        success(`Category "${addedItems[0].name}" created successfully.`);
      } else {
        success(`Successfully created ${addedItems.length} categories.`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (!editingCategory || !cleanName) return;

    if (isDuplicateEditName) {
      setFormError('Category name already exists.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const updated = await categoriesApi.update(editingCategory.id, cleanName) as ApiCategory;
      setEditName('');
      setIsEditOpen(false);
      setEditingCategory(null);
      updateItem(editingCategory.id, updated);
      await refetchCategories();
      success(`Category updated successfully.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.delete(id);
      removeItem(id);
      await refetchCategories();
      success('Category deleted successfully.');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete category');
    }
    setDeletingId(null);
  };

  const openEdit = (cat: ApiCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setFormError('');
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <Tag className="h-8 w-8 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Loading categories...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Fetching category list</p>
      </div>
    </div>
  );


  if (fetchError) {
    const errorCode = fetchError.match(/\((\d+)\)/)?.[1] || 'Unknown';
    const errorMessage = errorCode === '2002' ? "There's no connection (2002)" : `Connection error (${errorCode})`;
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load categories</p>
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={() => refetchCategories()}
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Categories</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Classify product inventory sectors for shelf placement index.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={() => { setNames(['']); setFormError(''); setIsAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg">
              All Categories ({categories.length})
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
              <option value="products-desc">Sort: Most Products</option>
              <option value="products-asc">Sort: Least Products</option>
              <option value="id-desc">Sort: Newest Added</option>
            </select>

            <div className="relative max-w-xs w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search category name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
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
              <span>{selectedIds.length === 1 ? '1 category selected' : `${selectedIds.length} categories selected`}</span>
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
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Product Count</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {paginatedCategories.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No categories found.</td></tr>
              ) : paginatedCategories.map((cat) => {
                const { icon: CatIcon, color: catColor } = getCategoryIcon(cat.name);
                const isSelected = selectedIds.includes(cat.id);
                return (
                  <tr key={cat.id} className={`hover:bg-slate-50/20 dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}`}>
                    <td className="w-10 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(cat.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-[#006a61] focus:ring-[#006a61] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{cat.name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catColor}`}>
                          <CatIcon className="h-3 w-3" />
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{cat.product_count ?? 0} SKUs</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { setDeletingId(cat.id); setDeleteName(cat.name); }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                      >
                        <Archive className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            {filteredCategories.length === 0 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">0</strong> Categories</>
            ) : totalPages === 1 ? (
              <>Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredCategories.length}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredCategories.length}</strong> Categories</>
            ) : (
              <>
                Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredCategories.length}</strong> Categories
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

      {/* Add Modal (Supports 1 or Multi-category Addition) */}
      {isAddOpen && (
        <Modal title="Add New Category" onClose={() => setIsAddOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {names.map((rowName, idx) => {
                const trimmed = rowName.trim();
                const isDupExisting = trimmed && existingNamesLower.has(trimmed.toLowerCase());
                const isDupInternal = trimmed && filledAddNames.filter(n => n === trimmed.toLowerCase()).length > 1;

                const isOthersSelected = selectedTypes[idx] === 'Others';

                return (
                  <FormField key={idx} label={`Category ${names.length > 1 ? `#${idx + 1}` : 'Name'}`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTypes[idx] ?? ''}
                          onChange={e => handleDropdownChange(idx, e.target.value)}
                          className={`${inputCls} flex-1`}
                        >
                          <option value="">-- Select Category Type --</option>
                          {PRESET_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>
                              {cat === 'Others' ? 'Others (Type Custom)' : cat}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setTilePickerRowIndex(idx)}
                          className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 hover:border-[#006a61] text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                          title="Open Visual Category Tiles Grid"
                        >
                          <Grid className="h-4 w-4" />
                          <span className="hidden sm:inline">Tiles</span>
                        </button>

                        {names.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove category row"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Custom Input when "Others" is selected */}
                      {isOthersSelected && (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            required
                            placeholder="Type custom category name..."
                            value={rowName}
                            onChange={e => handleCustomNameChange(idx, e.target.value)}
                            className={`${inputCls} pr-10`}
                          />
                          {trimmed && (() => {
                            const { icon: CatIcon, color: catColor } = getCategoryIcon(rowName);
                            return (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className={`inline-flex items-center p-1 rounded-full border ${catColor}`} title="Auto-assigned Icon">
                                  <CatIcon className="h-4 w-4" />
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Icon preview for preset category */}
                      {!isOthersSelected && trimmed && (() => {
                        const { icon: CatIcon, color: catColor } = getCategoryIcon(rowName);
                        return (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            <span className="text-[11px] text-slate-400">Auto Icon:</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${catColor}`}>
                              <CatIcon className="h-3.5 w-3.5" />
                              <span>{rowName}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    {isDupExisting && <p className="text-red-500 text-[11px] mt-1">Category name already exists.</p>}
                    {isDupInternal && <p className="text-amber-600 text-[11px] mt-1">Duplicate entry in form.</p>}
                  </FormField>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full border border-dashed border-[#006a61] text-[#006a61] dark:text-[#7ef0cf] hover:bg-[#006a61]/5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Category
              </button>
            </div>

            {formError && <p className="text-red-600 text-xs">{formError}</p>}

            <button
              type="submit"
              disabled={submitting || hasEmptyAddNames || duplicateExistingAdd || hasInternalDuplicates}
              className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : (names.length > 1 ? `Add ${names.filter(n=>n.trim()).length || ''} Categories` : 'Add Category')}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {isEditOpen && editingCategory && (
        <Modal title="Edit Category" onClose={() => setIsEditOpen(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Category Name">
              <div className="relative flex items-center">
                <input
                  type="text" required placeholder="e.g. Beverages" value={editName} onChange={e => setEditName(e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                {editName.trim() && (() => {
                  const { icon: CatIcon, color: catColor } = getCategoryIcon(editName);
                  return (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className={`inline-flex items-center p-1 rounded-full border ${catColor}`} title="Auto-assigned Icon">
                        <CatIcon className="h-4 w-4" />
                      </span>
                    </div>
                  );
                })()}
              </div>
              {isDuplicateEditName && <p className="text-red-500 text-[11px] mt-1">Category name already exists.</p>}
            </FormField>
            {formError && <p className="text-red-600 text-xs">{formError}</p>}
            <button type="submit" disabled={submitting || isDuplicateEditName} className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </button>
          </form>
        </Modal>
      )}

      {deletingId && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${deleteName}"? This operation cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {showBulkDeleteConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete ${selectedIds.length} selected categories? This operation cannot be undone.`}
          confirmLabel={isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.length} Categories`}
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}

      {/* ── Visual Category Tile Picker Modal ── */}
      {tilePickerRowIndex !== null && (
        <Modal
          title="Select Category Type"
          onClose={() => {
            setTilePickerRowIndex(null);
            setTileSearch('');
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search category tiles..."
                  value={tileSearch}
                  onChange={e => setTileSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Click any category tile below to select its auto-icon and pre-set category name:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {PRESET_CATEGORIES.filter(cat => cat.toLowerCase().includes(tileSearch.toLowerCase())).map(catName => {
                const { icon: CatIcon, color: catColor } = getCategoryIcon(catName);
                const isSelected = selectedTypes[tilePickerRowIndex] === catName;
                const isOthers = catName === 'Others';

                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => handleSelectTile(tilePickerRowIndex, catName)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#006a61] bg-[#006a61]/10 dark:bg-[#006a61]/20 shadow-md ring-2 ring-[#006a61]/30'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/60 hover:border-[#006a61] hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`inline-flex items-center p-2 rounded-lg border ${catColor}`}>
                        <CatIcon className="h-4 w-4" />
                      </span>
                      {isSelected && (
                        <div className="p-0.5 rounded-full bg-[#006a61] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>{isOthers ? 'Others' : catName}</span>
                        {isOthers && <Sparkles className="h-3 w-3 text-amber-500" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isOthers ? 'Type custom name' : 'Preset icon'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Tutorial Component */}
      <Tutorial steps={tutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}


