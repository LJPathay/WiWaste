import React, { useState } from 'react';
import { ClipboardList, Plus, Edit2, Archive, Info, Loader2, X } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { categories as categoriesApi, type ApiCategory } from '../../services/api';

export function ManageCategories() {
  const { toasts, dismiss, success, error } = useToast();
  const { data: categoryList, loading, error: fetchError, addItem, updateItem, removeItem } = useOptimisticList(categoriesApi.list);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const categories = categoryList ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError('');
    try {
      const created = await categoriesApi.create(name) as ApiCategory;
      setName('');
      setIsAddOpen(false);
      addItem(created);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !name) return;
    setSubmitting(true);
    setFormError('');
    try {
      const updated = await categoriesApi.update(editingCategory.id, name) as ApiCategory;
      setName('');
      setIsEditOpen(false);
      setEditingCategory(null);
      updateItem(editingCategory.id, updated);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.delete(id);
      removeItem(id);
      success('Category deleted successfully.');
    } catch (err: any) {
      error(err.message ?? 'Failed to delete category');
    }
    setDeletingId(null);
  };

  const openEdit = (cat: ApiCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setFormError('');
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[#006a61]" />
      <span className="ml-3 text-slate-600 dark:text-slate-400">Loading categories...</span>
    </div>
  );

  if (fetchError) return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
      Failed to load categories: {fetchError}
    </div>
  );

  return (
    <div className="space-y-6 w-full font-sans">
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
          onClick={() => { setName(''); setFormError(''); setIsAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
              <tr>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Product Count</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/20 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{cat.name}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-lg">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Add New Category</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Category Name</label>
                <input
                  type="text" required placeholder="e.g. Food & Beverage" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              {formError && <p className="text-red-600 text-xs">{formError}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                {submitting ? 'Creating...' : 'Add Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-lg">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Edit Category</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Category Name</label>
                <input
                  type="text" required placeholder="e.g. Food & Beverage" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              {formError && <p className="text-red-600 text-xs">{formError}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
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

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
