import React, { useState } from 'react';
import { Search, Plus, Edit2, Archive, Loader2, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
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

export function ManageSuppliers() {
  const { data: supplierList, loading, error: fetchError, addItem, updateItem, removeItem } = useOptimisticList(suppliersApi.list);
  const { toasts, dismiss, success, error } = useToast();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<ApiSupplier | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);

  const [archivingSupplier, setArchivingSupplier] = useState<ApiSupplier | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const suppliers = supplierList ?? [];

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
    s.contact_number.includes(search)
  );

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
    setAddLoading(true);
    try {
      const created = await suppliersApi.create(addForm) as ApiSupplier;
      setIsAddOpen(false);
      addItem(created);
      success(`Supplier "${addForm.supplier_name}" added successfully.`);
    } catch (err: any) {
      error(err.message ?? 'Failed to add supplier');
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
    setEditLoading(true);
    try {
      const updated = await suppliersApi.update(editingSupplier.id, editForm) as ApiSupplier;
      updateItem(editingSupplier.id, updated);
      setEditingSupplier(null);
      success(`Supplier "${editForm.supplier_name}" updated successfully.`);
    } catch (err: any) {
      error(err.message ?? 'Failed to update supplier');
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
      success(`Supplier "${name}" has been deleted.`);
    } catch (err: any) {
      error(err.message ?? 'Failed to delete supplier');
    } finally {
      setArchiveLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[#006a61]" />
      <span className="ml-3 text-slate-600 dark:text-slate-400">Loading suppliers...</span>
    </div>
  );

  if (fetchError) return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
      Failed to load suppliers: {fetchError}
    </div>
  );

  return (
    <div className="space-y-6 w-full font-sans">
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

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <div className="relative max-w-sm w-full">
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Person</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Products</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">No suppliers found.</td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.contact_person ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.contact_number}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.address ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.product_count ?? 0} items</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
          Showing {filtered.length} of {suppliers.length} suppliers
        </div>
      </div>

      {isAddOpen && (
        <Modal title="Add New Supplier" onClose={() => { if (!addLoading) setIsAddOpen(false); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            <FormField label="Supplier Name">
              <input type="text" required placeholder="e.g. FreshPack Co." value={addForm.supplier_name}
                onChange={e => setAddForm(f => ({ ...f, supplier_name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Contact Person">
              <input type="text" placeholder="e.g. Ana Reyes" value={addForm.contact_person}
                onChange={e => setAddForm(f => ({ ...f, contact_person: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Phone Number">
              <input type="tel" required placeholder="09XXXXXXXXX" value={addForm.contact_number}
                onChange={e => setAddForm(f => ({ ...f, contact_number: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Address">
              <input type="text" placeholder="Metro Manila, PH" value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
            </FormField>
            <button type="submit" disabled={addLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {addLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Adding…</> : 'Add Supplier'}
            </button>
          </form>
        </Modal>
      )}

      {editingSupplier && (
        <Modal title="Edit Supplier" onClose={() => { if (!editLoading) setEditingSupplier(null); }}>
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField label="Supplier Name">
              <input type="text" required placeholder="e.g. FreshPack Co." value={editForm.supplier_name}
                onChange={e => setEditForm(f => ({ ...f, supplier_name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Contact Person">
              <input type="text" placeholder="e.g. Ana Reyes" value={editForm.contact_person}
                onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Phone Number">
              <input type="tel" required placeholder="09XXXXXXXXX" value={editForm.contact_number}
                onChange={e => setEditForm(f => ({ ...f, contact_number: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Address">
              <input type="text" placeholder="Metro Manila, PH" value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
            </FormField>
            <button type="submit" disabled={editLoading}
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

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
