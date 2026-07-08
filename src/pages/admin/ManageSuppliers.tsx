import React, { useState } from 'react';
import { Search, Plus, Edit2, Archive, Loader2 } from 'lucide-react';
import {
  Toast,
  useToast,
  Modal,
  ConfirmDialog,
  FormField,
  inputCls,
} from '../../components/ui/Toast';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  returnWindow: number;
  status: 'Active' | 'Inactive';
}

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'FreshPack Co.', contact: 'Ana Reyes', phone: '09171234567', email: 'ana@freshpack.ph', returnWindow: 7, status: 'Active' },
  { id: '2', name: 'GreenLeaf Supplies', contact: 'Marco Tan', phone: '09281234567', email: 'marco@greenleaf.ph', returnWindow: 14, status: 'Active' },
  { id: '3', name: 'Metro Wholesale', contact: 'Lena Cruz', phone: '09391234567', email: 'lena@metrowholesale.ph', returnWindow: 10, status: 'Active' },
  { id: '4', name: 'AgriSource PH', contact: 'Tony Bautista', phone: '09191234567', email: 'tony@agrisource.ph', returnWindow: 5, status: 'Inactive' },
  { id: '5', name: 'NaturaBest', contact: 'Carla Santos', phone: '09221234567', email: 'carla@naturabest.ph', returnWindow: 7, status: 'Active' },
  { id: '6', name: 'EcoGoods Trading', contact: 'Dan Flores', phone: '09321234567', email: 'dan@ecogoods.ph', returnWindow: 14, status: 'Active' },
  { id: '7', name: 'SunHarvest Corp', contact: 'Mia Villanueva', phone: '09451234567', email: 'mia@sunharvest.ph', returnWindow: 3, status: 'Active' },
  { id: '8', name: 'PrimeProduce Inc.', contact: 'Rey Gomez', phone: '09561234567', email: 'rey@primeproduce.ph', returnWindow: 7, status: 'Inactive' },
];

const EMPTY_FORM = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  returnWindow: 7,
  status: 'Active' as 'Active' | 'Inactive',
};

export function ManageSuppliers() {
  const { toasts, dismiss, success, error } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);

  const [archivingSupplier, setArchivingSupplier] = useState<Supplier | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.contact.trim() || !addForm.email.trim() || !addForm.phone.trim()) {
      error('Please fill in all required fields.');
      return;
    }
    setAddLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const newSupplier: Supplier = { id: String(Date.now()), ...addForm };
    setSuppliers(prev => [newSupplier, ...prev]);
    setIsAddOpen(false);
    setAddLoading(false);
    success(`Supplier "${newSupplier.name}" added successfully.`);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setEditForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, returnWindow: s.returnWindow, status: s.status });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!editForm.name.trim() || !editForm.contact.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
      error('Please fill in all required fields.');
      return;
    }
    setEditLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...editForm } : s));
    setEditingSupplier(null);
    setEditLoading(false);
    success(`Supplier "${editForm.name}" updated successfully.`);
  };

  const handleArchive = async () => {
    if (!archivingSupplier) return;
    setArchiveLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setSuppliers(prev => prev.filter(s => s.id !== archivingSupplier.id));
    const name = archivingSupplier.name;
    setArchivingSupplier(null);
    setArchiveLoading(false);
    success(`Supplier "${name}" has been archived.`);
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Suppliers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage your product suppliers and return windows.</p>
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
              placeholder="Search by name, contact or email…"
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Return Window</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">No suppliers found.</td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.contact}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.phone}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.returnWindow} days</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
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
                          Archive
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
              <input type="text" required placeholder="e.g. FreshPack Co." value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Contact Person">
              <input type="text" required placeholder="e.g. Ana Reyes" value={addForm.contact}
                onChange={e => setAddForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <input type="tel" required placeholder="09XXXXXXXXX" value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Return Window (days)">
                <input type="number" required min={1} max={365} value={addForm.returnWindow}
                  onChange={e => setAddForm(f => ({ ...f, returnWindow: Number(e.target.value) }))} className={inputCls} />
              </FormField>
            </div>
            <FormField label="Email">
              <input type="email" required placeholder="contact@supplier.com" value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Status">
              <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))} className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
              <input type="text" required placeholder="e.g. FreshPack Co." value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Contact Person">
              <input type="text" required placeholder="e.g. Ana Reyes" value={editForm.contact}
                onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <input type="tel" required placeholder="09XXXXXXXXX" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Return Window (days)">
                <input type="number" required min={1} max={365} value={editForm.returnWindow}
                  onChange={e => setEditForm(f => ({ ...f, returnWindow: Number(e.target.value) }))} className={inputCls} />
              </FormField>
            </div>
            <FormField label="Email">
              <input type="email" required placeholder="contact@supplier.com" value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Status">
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))} className={inputCls}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
          message={`Are you sure you want to archive "${archivingSupplier.name}"? This supplier will no longer appear in active lists.`}
          confirmLabel={archiveLoading ? 'Archiving…' : 'Archive'}
          danger
          onConfirm={handleArchive}
          onCancel={() => { if (!archiveLoading) setArchivingSupplier(null); }}
        />
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
