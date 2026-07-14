import React, { useState } from 'react';
import { Users, Search, Plus, Edit2, X, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface UserMock {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'inventory' | 'cashier';
  status: 'Active' | 'Inactive';
}

const INITIAL_USERS: UserMock[] = [
  { id: '1', name: 'Lia Cruz', email: 'owner@wiwaste.com', role: 'owner', status: 'Active' },
  { id: '2', name: 'John Store Ops', email: 'ops@wiwaste.com', role: 'owner', status: 'Active' },
  { id: '3', name: 'Mia Stockwell', email: 'inventory@wiwaste.com', role: 'inventory', status: 'Active' },
  { id: '9', name: 'Carlo Reyes', email: 'cashier@wiwaste.com', role: 'cashier', status: 'Active' },
  { id: '4', name: 'Robert Rivera', email: 'robert.r@wiwaste.com', role: 'inventory', status: 'Active' },
  { id: '5', name: 'Sarah Santos', email: 'sarah.s@wiwaste.com', role: 'owner', status: 'Inactive' },
  { id: '6', name: 'Dave Diaz', email: 'dave.d@wiwaste.com', role: 'inventory', status: 'Active' },
  { id: '7', name: 'Grace Gomez', email: 'grace.g@wiwaste.com', role: 'owner', status: 'Active' },
  { id: '8', name: 'Kevin Kalaw', email: 'kevin.k@wiwaste.com', role: 'inventory', status: 'Inactive' },
];

export function ManageUsers() {
  const [users, setUsers] = useState<UserMock[]>(INITIAL_USERS);
  const [filter, setFilter] = useState<'all' | 'owner' | 'inventory' | 'cashier'>('all');
  const [search, setSearch] = useState('');
  
  // Add/Edit Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserMock | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'inventory' | 'cashier'>('inventory');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    const newUser: UserMock = {
      id: String(users.length + 1),
      name,
      email,
      role,
      status,
    };
    setUsers([...users, newUser]);
    setName('');
    setEmail('');
    setRole('inventory');
    setStatus('Active');
    setIsAddOpen(false);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !name || !email) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name, email, role, status } : u));
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const openEdit = (user: UserMock) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setIsEditOpen(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
          onClick={() => {
            setName('');
            setEmail('');
            setRole('inventory');
            setStatus('Active');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#00574f] transition-all"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            {(['all', 'owner', 'inventory', 'cashier'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  filter === tab
                    ? 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab === 'owner' ? 'Owner/Administrator' : tab}
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
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-55/20 dark:hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{u.name}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                <td className="px-6 py-4 capitalize text-slate-650 dark:text-slate-350">{u.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-450' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
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
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@wiwaste.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">User Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                >
                  <option value="inventory">Inventory Staff</option>
                  <option value="cashier">Cashier</option>
                  <option value="owner">Owner/Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-855 dark:text-slate-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
              >
                Add User
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
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@wiwaste.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">User Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-850 dark:text-slate-100"
                >
                  <option value="inventory">Inventory Staff</option>
                  <option value="cashier">Cashier</option>
                  <option value="owner">Owner/Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-855 dark:text-slate-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-sm font-semibold transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
