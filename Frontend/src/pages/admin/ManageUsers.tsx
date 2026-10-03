import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Edit2, X, Info,
  AlertTriangle, CheckCircle2, Circle,
  UserX, Eye, EyeOff, ChevronDown, Check, Lock
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Tutorial } from '../../components/ui/Tutorial';
import { useApi } from '../../hooks/useApi';
import { users as usersApi, type ApiUser, type CreateUserPayload, type PaginatedUsersResponse } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { Toast, useToast } from '../../components/ui/Toast';
import {
  ITEMS_PER_PAGE, ROLE_CONFIG, maskEmail, EMPTY_FORM,
  DEFAULT_PASSWORD, generateUsername, generateEmail,
  getPasswordRules, isPasswordValid,
} from './UserConstants';

export function ManageUsers() {
  const { toasts, dismiss, error: showError, success: showSuccess } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'Archived'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Owner' | 'Inventory' | 'Cashier'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unmaskedEmailIds, setUnmaskedEmailIds] = useState<Set<number>>(new Set());
  const [isAllEmailsUnmasked, setIsAllEmailsUnmasked] = useState(false);

  const { data: userList, loading, error: apiError, refetch } = useApi<PaginatedUsersResponse>(
    () => usersApi.list(
      currentPage,
      ITEMS_PER_PAGE,
      search,
      roleFilter === 'all' ? '' : roleFilter,
      statusFilter === 'all' ? '' : statusFilter,
      // The default tab is "everything that is still in use", which is every status
      // except Archived. Passing no status at all returned archived accounts too, so
      // the tab's count badge disagreed with the rows underneath it.
      statusFilter === 'all' ? 'Archived' : '',
    ),
    { dedupeKey: `users-${currentPage}-${search}-${roleFilter}-${statusFilter}` }
  );

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ApiUser | null>(null);
  const [archiveModalUser, setArchiveModalUser] = useState<ApiUser | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const [form, setForm] = useState<CreateUserPayload>({
    first_name: '', middle_name: '', surname: '', contact_number: '',
    username: '', password: '', email: '',
    role: 'Inventory', status: 'Active',
  });

  const fullName = useMemo(() => [form.first_name, form.middle_name, form.surname].filter(Boolean).join(' '), [form.first_name, form.middle_name, form.surname]);

  const users: ApiUser[] = userList?.data ?? [];

  const autoUsername = useMemo(() => generateUsername(fullName), [fullName]);
  const autoEmail = useMemo(() => generateEmail(fullName), [fullName]);

  // Server-side filtering, so no client-side filtering needed
  const filteredUsers: ApiUser[] = users;
  const paginatedUsers = filteredUsers;

  const totalPages = userList?.meta?.last_page ?? 1;
  const totalItems = userList?.meta?.total ?? 0;
  const startIndex = userList?.meta ? ((userList.meta.current_page - 1) * userList.meta.per_page) + 1 : 0;
  const endIndex = userList?.meta ? Math.min(userList.meta.current_page * userList.meta.per_page, userList.meta.total) : 0;

  const isDuplicateName = Boolean(
    fullName.trim() &&
    users.some(u =>
      (u.name?.trim()?.toLowerCase() ?? '') === fullName.trim().toLowerCase() &&
      (!editingUser || u.id !== editingUser.id)
    )
  );

  const passwordRules = getPasswordRules(DEFAULT_PASSWORD);
  const passwordValid = isPasswordValid(DEFAULT_PASSWORD);

  const resetForm = () => {
    setForm({
      first_name: '',
      middle_name: '',
      surname: '',
      contact_number: '',
      username: '',
      password: '',
      email: '',
      role: 'Inventory',
      status: 'Active',
    });
    setFormError('');
    setRoleDropdownOpen(false);
  };

  function splitName(full: string): { first_name: string; middle_name: string; surname: string } {
    if (!full?.trim()) return { first_name: '', middle_name: '', surname: '' };
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], middle_name: '', surname: '' };
    if (parts.length === 2) return { first_name: parts[0], middle_name: '', surname: parts[1] };
    return { first_name: parts[0], middle_name: parts.slice(1, -1).join(' '), surname: parts[parts.length - 1] };
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateName) { setFormError('A user with this name already exists.'); return; }
    // The form does not ask for a password: it issues the shared default below, so
    // that is what has to satisfy the policy. Validating `form.password` instead —
    // which is never rendered and therefore always empty — made every submission
    // fail with "Password does not meet policy requirements.".
    if (!isPasswordValid(DEFAULT_PASSWORD)) {
      setFormError('The default password does not meet policy requirements.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload: CreateUserPayload = {
        first_name: form.first_name,
        middle_name: form.middle_name,
        surname: form.surname,
        contact_number: form.contact_number,
        username: autoUsername,
        email: autoEmail,
        password: DEFAULT_PASSWORD,
        role: form.role,
        status: 'Active',
      };
      await usersApi.create(payload);
      resetForm();
      setIsAddOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (isDuplicateName) { setFormError('A user with this name already exists.'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const payload: Partial<CreateUserPayload> = {
        first_name: form.first_name,
        middle_name: form.middle_name,
        surname: form.surname,
        contact_number: form.contact_number,
        role: form.role,
      };
      await usersApi.update(editingUser.id, payload);
      setIsEditOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveModalUser) return;
    setSubmitting(true);
    try {
      await usersApi.archive(archiveModalUser.id);
      setArchiveModalUser(null);
      await refetch();
    } catch (err) {
      console.error('Failed to archive user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: ApiUser) => {
    setViewingUser(null);
    setEditingUser(user);
    setForm({
      first_name: user.first_name ?? '', middle_name: user.middle_name ?? '',
      surname: user.surname ?? '', contact_number: user.contact_number ?? '',
      username: user.username, password: '', email: user.email ?? '',
      role: user.role, status: user.status,
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const toggleSingleEmailMask = (id: number) => {
    setUnmaskedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const archivedCount = (users ?? []).filter(u => u.status === 'Archived').length;
  const activeCount = (users ?? []).filter(u => u.status !== 'Archived').length;
  const isFiltered = statusFilter !== 'all' || roleFilter !== 'all' || search !== '';

  const columns: DataTableColumn<ApiUser>[] = [
    {
      key: 'name', header: 'User', pinned: true, truncate: true, minWidth: '150px',
      render: (row) => (
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">{row.name}</div>
      ),
    },
    {
      key: 'username', header: 'Username', truncate: true, minWidth: '100px',
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">@{row.username}</span>
      ),
    },
    {
      key: 'email', header: 'Email', truncate: true, minWidth: '150px',
      render: (row) => (
        row.email ? (
          <div className="flex items-center gap-1.5 group">
            <span className="font-mono text-xs">{isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? row.email : maskEmail(row.email)}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleSingleEmailMask(row.id); }}
              className="text-slate-400 opacity-60 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 transition-all p-0.5 rounded"
              title={isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? "Mask Email" : "Unmask Email"}>
              {isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : <span className="text-slate-400 italic">No email</span>
      ),
    },
    {
      key: 'role', header: 'Role', align: 'center', minWidth: '100px',
      render: (row) => {
        const RoleIcon = ROLE_CONFIG[row.role as keyof typeof ROLE_CONFIG]?.icon ?? Users;
        const roleConfig = ROLE_CONFIG[row.role as keyof typeof ROLE_CONFIG];
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
            <RoleIcon className={`h-3.5 w-3.5 ${roleConfig?.iconColor ?? 'text-slate-500'}`} />
            <span>{row.role}</span>
          </div>
        );
      },
    },
    {
      key: 'status', header: 'Status', align: 'center', minWidth: '100px',
      render: (row) => (
        row.status === 'Archived' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            <UserX className="h-3 w-3" /> Archived
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Active
          </span>
        )
      ),
    },
    {
      key: 'actions', header: '', align: 'center', minWidth: '80px', pinned: true,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {row.status !== 'Archived' && (
            <>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); const u = row; setViewingUser(null); setTimeout(() => openEdit(u), 0); }}
                    aria-label={`Edit ${row.name}`}
                    className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition-all inline-flex items-center justify-center"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">Edit user</TooltipContent>
              </UITooltip>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setArchiveModalUser(row); }}
                    aria-label={`Archive ${row.name}`}
                    className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-600 hover:text-white transition-all inline-flex items-center justify-center"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">Archive user</TooltipContent>
              </UITooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-56 gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-3 border-slate-200 dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-1.5 flex items-center justify-center">
          <Users className="h-6 w-6 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">Loading users...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fetching user accounts</p>
      </div>
    </div>
  );

  if (apiError) {
    const errorCode = apiError.message.match(/\((\d+)\)/)?.[1] || 'Unknown';
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300 text-sm">Failed to load users</p>
            <p className="text-xs text-red-600 dark:text-red-400">Error {errorCode}</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Manage Users</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Configure system users, role access levels, and user accounts.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="h-8 px-4 bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Add User
        </button>
      </div>

      {/* Filter toolbar. This sits outside <DataTable> because DataTable has no
          children slot — passing it children (and a `footer` prop, which does not
          exist either) rendered neither this toolbar nor the pagination. */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-3.5 border-b border-slate-200 dark:border-white/10 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Status:</span>
              {[
                { id: 'all', label: 'All Users', count: activeCount },
                { id: 'Archived', label: 'Archived', count: archivedCount, icon: UserX },
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = statusFilter === tab.id;
                return (
                  <button key={tab.id} onClick={() => { setStatusFilter(tab.id as 'all' | 'Archived'); setCurrentPage(1); }}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${isSelected ? 'bg-slate-100 dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                    {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                    <span>{tab.label}</span>
                    {tab.count > 0 && <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{tab.count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor="user-role-filter" className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role:</label>
                <select id="user-role-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'all' | 'Owner' | 'Inventory' | 'Cashier')}
                  className="h-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium rounded-lg px-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]">
                  <option value="all">All Roles</option>
                  <option value="Owner">Owner</option>
                  <option value="Inventory">Inventory Staff</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              <div className="relative max-w-xs w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input type="text" placeholder="Search name, username, email..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-8 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-8 pr-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200" />
              </div>

              {isFiltered && (
                <button onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearch(''); }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium">Reset Filters</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <DataTable
        data={paginatedUsers}
        columns={columns}
        rowKey={(row) => row.id}
        emptyMessage="No users found"
        pagination={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {filteredUsers.length === 0 ? (
                <span>No users match your filters</span>
              ) : (
                <span>Showing <strong className="font-semibold text-slate-700 dark:text-slate-200">{startIndex}</strong> to <strong className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</strong> of <strong className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</strong> Users</span>
              )}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} perPage={ITEMS_PER_PAGE} label="Users" />
          </div>
        }
        className="border-0"
      />

      {/* ── ADD USER MODAL ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-4 relative shadow-2xl my-6">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="p-1.5 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Plus className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New User</h2>
                <p className="text-xs text-slate-500">Enter full name — username &amp; email are generated automatically.</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input type="text" required placeholder="First" value={form.first_name}
                    onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className={`h-8 w-full bg-slate-50 dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Middle Name</label>
                  <input type="text" placeholder="Middle" value={form.middle_name}
                    onChange={e => setForm(prev => ({ ...prev, middle_name: e.target.value }))}
                    className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input type="text" required placeholder="Last" value={form.surname}
                    onChange={e => setForm(prev => ({ ...prev, surname: e.target.value }))}
                    className={`h-8 w-full bg-slate-50 dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
              </div>
              {isDuplicateName && <p className="text-rose-500 text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> A user with this name already exists.</p>}

              {fullName.trim() && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auto-generated credentials:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Username:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">@{autoUsername}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Email:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{autoEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Password:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{DEFAULT_PASSWORD}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Number</label>
                <input type="text" placeholder="e.g. 09171234567" value={form.contact_number}
                  onChange={e => setForm(prev => ({ ...prev, contact_number: e.target.value }))}
                  className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Assign Role <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <button type="button" onClick={() => setRoleDropdownOpen(prev => !prev)}
                    className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {React.createElement(ROLE_CONFIG[form.role].icon, { className: `h-3.5 w-3.5 ${ROLE_CONFIG[form.role].iconColor}` })}
                      <span className="font-medium">{ROLE_CONFIG[form.role].label}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden py-1">
                      {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map(roleKey => {
                        const item = ROLE_CONFIG[roleKey];
                        const ItemIcon = item.icon;
                        const isSelected = form.role === roleKey;
                        return (
                          <button key={roleKey} type="button" onClick={() => { setForm(prev => ({ ...prev, role: roleKey })); setRoleDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-[#006a61]/5 dark:bg-[#006a61]/20' : ''}`}>
                            <ItemIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.iconColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-[#006a61] dark:text-[#7ef0cf]" />}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.description}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /><span>{formError}</span>
                </div>
              )}

              <button type="submit" disabled={submitting || isDuplicateName || !form.first_name.trim() || !form.surname.trim()}
                className="h-8 w-full bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                {submitting ? 'Adding User...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ── */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-4 relative shadow-2xl my-6">
            <button onClick={() => { setIsEditOpen(false); setViewingUser(null); }} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="p-1.5 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Edit2 className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit User</h2>
                <p className="text-xs text-slate-500">@{editingUser.username}</p>
              </div>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={form.first_name}
                    onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className={`h-8 w-full bg-slate-50 dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Middle Name</label>
                  <input type="text" value={form.middle_name}
                    onChange={e => setForm(prev => ({ ...prev, middle_name: e.target.value }))}
                    className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={form.surname}
                    onChange={e => setForm(prev => ({ ...prev, surname: e.target.value }))}
                    className={`h-8 w-full bg-slate-50 dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
              </div>
              {isDuplicateName && <p className="text-rose-500 text-[10px] font-semibold mt-1">A user with this name already exists.</p>}

              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Number</label>
                <input type="text" value={form.contact_number}
                  onChange={e => setForm(prev => ({ ...prev, contact_number: e.target.value }))}
                  className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Role</label>
                <div className="relative">
                  <button type="button" onClick={() => setRoleDropdownOpen(prev => !prev)}
                    className="h-8 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {React.createElement(ROLE_CONFIG[form.role].icon, { className: `h-3.5 w-3.5 ${ROLE_CONFIG[form.role].iconColor}` })}
                      <span className="font-medium">{ROLE_CONFIG[form.role].label}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden py-1">
                      {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map(roleKey => {
                        const item = ROLE_CONFIG[roleKey];
                        const ItemIcon = item.icon;
                        const isSelected = form.role === roleKey;
                        return (
                          <button key={roleKey} type="button" onClick={() => { setForm(prev => ({ ...prev, role: roleKey })); setRoleDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 ${isSelected ? 'bg-[#006a61]/10' : ''}`}>
                            <div className="flex items-center gap-2">
                              <ItemIcon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                              <span className="font-medium text-xs">{item.label}</span>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-[#006a61]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {formError && <p className="text-rose-600 text-xs font-semibold">{formError}</p>}

              <button type="submit" disabled={submitting || isDuplicateName || !form.first_name.trim() || !form.surname.trim()}
                className="h-8 w-full bg-[#006a61] hover:bg-[#00574f] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm">
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW USER MODAL ── */}
      {viewingUser && !isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-4 relative shadow-2xl my-6">
            <button onClick={() => setViewingUser(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="p-2 rounded-full bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Users className="h-5 w-5" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{viewingUser.name}</h2>
                <p className="text-xs text-slate-500">User Account Details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{viewingUser.name}</p>
              </div>

              {viewingUser.contact_number && (
                <div>
                  <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Number</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{viewingUser.contact_number}</p>
                </div>
              )}

              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</label>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-0.5">@{viewingUser.username}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-all">{viewingUser.email || 'Not provided'}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</label>
                <div className="mt-0.5">
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[viewingUser.role as keyof typeof ROLE_CONFIG]?.icon ?? Users;
                    const roleConfig = ROLE_CONFIG[viewingUser.role as keyof typeof ROLE_CONFIG];
                    return (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
                        <RoleIcon className={`h-3.5 w-3.5 ${roleConfig?.iconColor ?? 'text-slate-500'}`} />
                        <span>{viewingUser.role}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Status</label>
                <div className="mt-0.5">
                  {viewingUser.status === 'Archived' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                      <UserX className="h-3 w-3" /> Archived
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Active
                    </span>
                  )}
                </div>
              </div>

              {viewingUser.created_at && (
                <div>
                  <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Created</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(viewingUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              {viewingUser.status !== 'Archived' && (
                <button onClick={() => { const u = viewingUser; setViewingUser(null); setTimeout(() => openEdit(u), 0); }}
                  className="h-8 flex-1 px-3 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {viewingUser.status !== 'Archived' && (
                <button onClick={() => { setArchiveModalUser(viewingUser); setViewingUser(null); }}
                  className="h-8 flex-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1">
                  <UserX className="h-3.5 w-3.5" /> Archive
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ARCHIVE CONFIRM MODAL ── */}
      {archiveModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800/40 w-full max-w-md p-4 relative shadow-2xl">
            <button onClick={() => setArchiveModalUser(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"><UserX className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Archive User Account</h3>
                <p className="text-xs text-slate-500">Remove from active user list</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Are you sure you want to archive <strong className="text-slate-900 dark:text-slate-100">{archiveModalUser.name}</strong> (@{archiveModalUser.username})?
              <br /><br />
              This user will be blocked from logging in and moved to the <strong className="text-rose-600 dark:text-rose-400">Archived</strong> list. This can be reversed by an administrator.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setArchiveModalUser(null)} className="h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Cancel</button>
              <button onClick={handleArchiveConfirm} disabled={submitting}
                className="h-8 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5" />{submitting ? 'Archiving...' : 'Archive User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
