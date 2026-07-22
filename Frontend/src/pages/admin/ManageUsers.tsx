import React, { useState } from 'react';
import { Users, Search, Plus, Edit2, X, Info, Loader2 } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { users as usersApi, type ApiUser, type CreateUserPayload } from '../../services/api';

export function ManageUsers() {
  const { data: userList, loading, error, addItem, updateItem, refetch } = useOptimisticList(usersApi.list);
  const [filter, setFilter] = useState<'all' | 'Admin' | 'Inventory' | 'Business Owner'>('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState<CreateUserPayload>({
    Full_name: '', username: '', password: '', email: '',
    role: 'Inventory', status: 'Active',
  });

  const users = userList ?? [];

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const resetForm = () => setForm({ Full_name: '', username: '', password: '', email: '', role: 'Inventory', status: 'Active' });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const created = await usersApi.create(form) as ApiUser;
      resetForm();
      setIsAddOpen(false);
      addItem(created);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setFormError('');
    try {
      const payload: Partial<CreateUserPayload> = {
        Full_name: form.Full_name,
        email: form.email,
        role: form.role,
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      const updated = await usersApi.update(editingUser.id, payload) as ApiUser;
      updateItem(editingUser.id, updated);
      setIsEditOpen(false);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: ApiUser) => {
    setEditingUser(user);
    setForm({ Full_name: user.name, username: user.username, password: '', email: user.email ?? '', role: user.role, status: user.status });
    setFormError('');
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-[#006a61]" />
      <span className="ml-3 text-slate-600 dark:text-slate-400">Loading users...</span>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
      Failed to load users: {error}
    </div>
  );

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Users</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Configure system users and access levels.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setFormError(''); setIsAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {(['all', 'Admin', 'Inventory', 'Business Owner'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  filter === tab
                    ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
            />
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
           <tbody className="divide-y divide-slate-200 dark:divide-white/5">
             {filteredUsers.length === 0 ? (
               <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No users found.</td></tr>
             ) : filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/20 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{u.name}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{u.username}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                <td className="px-6 py-4 text-slate-650 dark:text-slate-350">{u.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>{u.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-lg">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-650">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              {[
                ['Full Name', 'Full_name', 'text', 'John Doe'],
                ['Username', 'username', 'text', 'jdoe'],
                ['Email', 'email', 'email', 'john@ipharmamart.com'],
                ['Password', 'password', 'password', 'Min. 6 characters']
              ].map(([label, field, type, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                  <input type={type} required={field !== 'email'} placeholder={placeholder}
                    value={(form as any)[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100">
                  <option value="Inventory">Inventory Staff</option>
                  <option value="Business Owner">Cashier / Business Owner</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              {formError && <p className="text-red-600 text-xs">{formError}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-lg">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-650">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Edit User Details</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              {[
                ['Full Name', 'Full_name', 'text', 'John Doe'],
                ['Email', 'email', 'email', 'john@ipharmamart.com'],
                ['New Password', 'password', 'password', 'Leave blank to keep current']
              ].map(([label, field, type, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    required={field === 'Full_name'}
                    value={(form as any)[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100">
                  <option value="Inventory">Inventory Staff</option>
                  <option value="Business Owner">Cashier / Business Owner</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              {formError && <p className="text-red-600 text-xs">{formError}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
