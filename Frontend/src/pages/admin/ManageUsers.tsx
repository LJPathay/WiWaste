import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Edit2, Eye, EyeOff, Info, CheckCircle2, Circle, ChevronDown, Check } from 'lucide-react';
import { users as usersApi, type ApiUser, type CreateUserPayload, type UpdateUserPayload } from '../../services/api';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { ActionButton } from '../../components/shared/DataTableActions';
import { Pagination } from '../../components/ui/pagination';
import { Modal, FormField, Toast, useToast, inputCls } from '../../components/ui/Toast';
import { Tutorial } from '../../components/ui/Tutorial';
import { ASSIGNABLE_ROLES, EMPTY_FORM, getRoleConfig, ITEMS_PER_PAGE, maskEmail, getPasswordRules, isPasswordValid, type UserForm } from './UserConstants';

const STATUSES: ApiUser['status'][] = ['Active', 'Inactive', 'Quarantined', 'Archived'];
const buttonCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#006a61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00574f] disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButtonCls = 'rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50';

function getUserForm(user: ApiUser): UserForm {
  const parts = (user.name ?? user.Full_name ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    First_name: user.First_name ?? parts[0] ?? '',
    Middle_name: user.Middle_name ?? (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''),
    Surname: user.Surname ?? (parts.length > 1 ? parts.at(-1)! : ''),
    contact_number: user.contact_number ?? '', address: user.address ?? '',
    username: user.username ?? '', email: user.email ?? '', password: '',
    role: user.role, status: user.status,
  };
}

function profilePayload(form: UserForm): UpdateUserPayload {
  const First_name = form.First_name.trim();
  const Middle_name = form.Middle_name.trim();
  const Surname = form.Surname.trim();
  return {
    First_name, Middle_name, Surname,
    Full_name: [First_name, Middle_name, Surname].filter(Boolean).join(' '),
    email: form.email.trim(), contact_number: form.contact_number.trim(), address: form.address.trim(),
    role: form.role,
  };
}

function RoleSelect({ value, onChange }: { value: ApiUser['role']; onChange: (role: ApiUser['role']) => void }) {
  const [open, setOpen] = useState(false);
  const config = getRoleConfig(value);
  const Icon = config.icon;
  return (
    <div className="relative">
      <button type="button" className={inputCls + ' flex items-center justify-between'} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2"><Icon className={'h-4 w-4 ' + config.iconColor} />{config.label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div role="listbox" aria-label="Assign role" className="absolute top-full z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {ASSIGNABLE_ROLES.map(role => {
            const roleConfig = getRoleConfig(role);
            return (
              <button type="button" role="option" aria-selected={value === role} key={role} onClick={() => { onChange(role); setOpen(false); }} className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                <span><span className="block text-sm font-semibold">{roleConfig.label}</span><span className="text-xs text-slate-500">{roleConfig.description}</span></span>
                {value === role && <Check className="h-4 w-4 text-[#006a61]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ManageUsers() {
  const { data: userList, loading, error, addItem, updateItem, refetch } = useOptimisticList(usersApi.list);
  const [statusFilter, setStatusFilter] = useState<'all' | ApiUser['status']>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | ApiUser['role']>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unmaskedEmailIds, setUnmaskedEmailIds] = useState<Set<number>>(new Set());
  const [isAllEmailsUnmasked, setIsAllEmailsUnmasked] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState<{ user: ApiUser; status: ApiUser['status']; payload?: UpdateUserPayload } | null>(null);
  const toast = useToast();
  const users = userList ?? [];

  useEffect(() => { setCurrentPage(1); }, [statusFilter, roleFilter, search]);

  const filteredUsers = users.filter(user => {
    const text = search.trim().toLowerCase();
    return (statusFilter === 'all' || user.status === statusFilter)
      && (roleFilter === 'all' || user.role === roleFilter)
      && [user.name, user.username, user.email, user.contact_number].some(value => (value ?? '').toLowerCase().includes(text));
  }).sort((a, b) => b.id - a.id);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const fullName = [form.First_name, form.Middle_name, form.Surname].map(value => value.trim()).filter(Boolean).join(' ');
  const isDuplicateName = Boolean(fullName && users.some(user => (user.name ?? '').trim().toLowerCase() === fullName.toLowerCase() && user.id !== editingUser?.id));
  const isDuplicateUsername = Boolean(form.username.trim() && users.some(user => (user.username ?? '').toLowerCase() === form.username.trim().toLowerCase() && user.id !== editingUser?.id));
  const isDuplicateEmail = Boolean(form.email.trim() && users.some(user => (user.email ?? '').toLowerCase() === form.email.trim().toLowerCase() && user.id !== editingUser?.id));
  const passwordRules = getPasswordRules(form.password);

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowAddPassword(false);
  }

  function validateProfile() {
    const original = editingUser ? getUserForm(editingUser) : null;
    const changed = (key: keyof UserForm) => !original || form[key] !== original[key];
    if ((changed('First_name') && !form.First_name.trim()) || (changed('Surname') && !form.Surname.trim())) return 'First name and surname are required.';
    if (changed('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (changed('contact_number') && !/^\d{7,11}$/.test(form.contact_number)) return 'Contact number must contain 7 to 11 digits.';
    if (isDuplicateName || isDuplicateUsername || isDuplicateEmail) return 'Resolve the duplicate name, username, or email before saving.';
    return '';
  }

  async function handleAddUser(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateProfile();
    if (validationError || !form.username.trim() || !isPasswordValid(form.password)) {
      setFormError(validationError || 'Enter a username and a password that meets all policy requirements.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const created = await usersApi.create({ ...profilePayload(form), username: form.username.trim(), password: form.password, status: form.status } as CreateUserPayload);
      addItem(created);
      setStatusFilter('all');
      setRoleFilter('all');
      setSearch('');
      setCurrentPage(1);
      setIsAddOpen(false);
      resetForm();
      toast.success('User added successfully.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveUser(user: ApiUser, payload: UpdateUserPayload) {
    setSubmitting(true);
    setFormError('');
    try {
      const updated = await usersApi.update(user.id, payload);
      updateItem(user.id, updated);
      setEditingUser(null);
      setConfirmation(null);
      setViewingUser(updated);
      toast.success(payload.status ? 'User status changed to ' + payload.status + '.' : 'User details updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditUser(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    const validationError = validateProfile();
    if (validationError) { setFormError(validationError); return; }
    const payload = profilePayload(form);
    const original = profilePayload(getUserForm(editingUser));
    for (const key of Object.keys(payload) as (keyof UpdateUserPayload)[]) {
      if (payload[key] === original[key]) delete payload[key];
    }
    if (form.status !== editingUser.status) {
      setConfirmation({ user: editingUser, status: form.status, payload });
      return;
    }
    void saveUser(editingUser, payload);
  }

  function openEdit(user: ApiUser) {
    setViewingUser(null);
    setEditingUser(user);
    setForm(getUserForm(user));
    setFormError('');
  }

  const columns: DataTableColumn<ApiUser>[] = [
    { key: 'name', header: 'User', pinned: true, minWidth: '150px', render: user => <span className="font-semibold">{user.name}</span> },
    { key: 'username', header: 'Username', minWidth: '120px', render: user => <span className="font-mono text-xs">@{user.username}</span> },
    { key: 'email', header: 'Email', minWidth: '180px', render: user => (
      <div className="flex items-center gap-2">
        <span className="break-all text-xs">{user.email ? (isAllEmailsUnmasked || unmaskedEmailIds.has(user.id) ? user.email : maskEmail(user.email)) : ''}</span>
        {user.email && <button type="button" aria-label={(isAllEmailsUnmasked || unmaskedEmailIds.has(user.id) ? 'Mask' : 'Unmask') + ' email for ' + user.name} onClick={event => {
          event.stopPropagation();
          setUnmaskedEmailIds(previous => { const next = new Set(previous); if (next.has(user.id)) next.delete(user.id); else next.add(user.id); return next; });
        }} className="p-1 text-slate-500 hover:text-[#006a61]">{isAllEmailsUnmasked || unmaskedEmailIds.has(user.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
      </div>
    ) },
    { key: 'role', header: 'Role', minWidth: '110px', render: user => getRoleConfig(user.role).label },
    { key: 'status', header: 'Status', minWidth: '110px', render: user => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">{user.status}</span> },
  ];

  function profileFields() {
    const field = (key: keyof UserForm, value: string) => setForm(previous => ({ ...previous, [key]: value }));
    const required = (key: keyof UserForm) => !editingUser || Boolean(getUserForm(editingUser)[key]);
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={required('First_name') ? 'First Name *' : 'First Name'} htmlFor="user-first-name"><input id="user-first-name" required={required('First_name')} className={inputCls} value={form.First_name} onChange={event => field('First_name', event.target.value)} /></FormField>
          <FormField label="Middle Name" htmlFor="user-middle-name"><input id="user-middle-name" className={inputCls} value={form.Middle_name} onChange={event => field('Middle_name', event.target.value)} /></FormField>
          <FormField label={required('Surname') ? 'Surname *' : 'Surname'} htmlFor="user-surname"><input id="user-surname" required={required('Surname')} className={inputCls} value={form.Surname} onChange={event => field('Surname', event.target.value)} /></FormField>
          <FormField label={required('contact_number') ? 'Contact Number *' : 'Contact Number'} htmlFor="user-contact" hint="7 to 11 digits"><input id="user-contact" type="tel" inputMode="numeric" required={required('contact_number')} pattern="[0-9]{7,11}" maxLength={11} className={inputCls} value={form.contact_number} onChange={event => field('contact_number', event.target.value.replace(/\D/g, '').slice(0, 11))} /></FormField>
        </div>
        {isDuplicateName && <p className="text-xs text-red-600">Full name already exists.</p>}
        <FormField label={required('email') ? 'Email Address *' : 'Email Address'} htmlFor="user-email" error={isDuplicateEmail ? 'Email address already exists.' : undefined}><input id="user-email" type="email" required={required('email')} autoComplete="email" className={inputCls} value={form.email} onChange={event => field('email', event.target.value)} /></FormField>
        <FormField label="Address" htmlFor="user-address"><textarea id="user-address" rows={2} className={inputCls} value={form.address} onChange={event => field('address', event.target.value)} /></FormField>
      </>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100"><Users className="h-5 w-5" />Manage Users</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowTutorial(true)} className={secondaryButtonCls}><Info className="inline h-4 w-4" /> Quick Guide</button>
          <button type="button" data-user-add onClick={() => { setEditingUser(null); resetForm(); setIsAddOpen(true); }} className={buttonCls}><Plus className="h-4 w-4" /> Add User</button>
        </div>
      </div>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span>Failed to load users: {error}</span><button onClick={() => void refetch()} className={secondaryButtonCls}>Try Again</button></div>}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div data-user-status className="flex flex-wrap gap-2" role="group" aria-label="Filter users by status">
          {(['all', ...STATUSES] as const).map(status => (
            <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={'rounded-lg px-3 py-2 text-xs font-semibold ' + (statusFilter === status ? 'bg-[#006a61] text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
              {status === 'all' ? 'All Accounts' : status} ({status === 'all' ? users.length : users.filter(user => user.status === status).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search users" placeholder="Search name, username, email, contact..." className={inputCls + ' pl-9'} value={search} onChange={event => setSearch(event.target.value)} /></div>
          <select aria-label="Filter users by role" className={inputCls + ' w-auto'} value={roleFilter} onChange={event => setRoleFilter(event.target.value as typeof roleFilter)}><option value="all">All Roles</option>{['Admin', ...ASSIGNABLE_ROLES].map(role => <option key={role} value={role}>{getRoleConfig(role).label}</option>)}</select>
          <button type="button" onClick={() => setIsAllEmailsUnmasked(!isAllEmailsUnmasked)} className={secondaryButtonCls}>{isAllEmailsUnmasked ? 'Mask all emails' : 'Unmask all emails'}</button>
        </div>
      </div>
      <DataTable<ApiUser> columns={columns} data={paginatedUsers} rowKey={row => row.id} loading={loading} onRowClick={setViewingUser} hoverActions={false} emptyMessage={users.length ? 'No matching users found.' : 'No user accounts yet. Select Add User to create an account.'} actions={row => <ActionButton icon={<Eye className="h-4 w-4" />} label={'View ' + row.name} onClick={() => setViewingUser(row)} />} pagination={<Pagination page={page} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredUsers.length} perPage={ITEMS_PER_PAGE} label="Users" />} />

      {(isAddOpen || editingUser) && !confirmation && (
        <Modal title={editingUser ? 'Edit User Details' : 'Add New User'} onClose={() => { if (!submitting) { setIsAddOpen(false); setEditingUser(null); } }}>
          <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="max-h-[75dvh] space-y-4 overflow-y-auto pr-1">
            {editingUser && <p className="text-sm text-slate-500">Update account for @{editingUser.username}. Password changes use the sign in password reset process.</p>}
            {profileFields()}
            {!editingUser && <>
              <FormField label="Username *" htmlFor="user-username" error={isDuplicateUsername ? 'Username already exists.' : undefined}><input id="user-username" required autoComplete="off" className={inputCls} value={form.username} onChange={event => setForm(previous => ({ ...previous, username: event.target.value.toLowerCase().replace(/\s+/g, '') }))} /></FormField>
              <FormField label="Password *" htmlFor="user-new-password">
                <div className="relative"><input id="user-new-password" type={showAddPassword ? 'text' : 'password'} minLength={8} required autoComplete="new-password" className={inputCls + ' pr-11'} value={form.password} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} /><button type="button" aria-label={showAddPassword ? 'Hide new password' : 'Show new password'} className="absolute right-3 top-3 text-slate-500" onClick={() => setShowAddPassword(!showAddPassword)}>{showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </FormField>
              <ul className="grid grid-cols-1 gap-1 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800 sm:grid-cols-2" aria-label="Password policy">{passwordRules.map(rule => <li key={rule.id} className={'flex items-center gap-1.5 ' + (rule.met ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500')}>{rule.met ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{rule.label}</li>)}</ul>
            </>}
            <FormField label="Role"><RoleSelect value={form.role} onChange={role => setForm(previous => ({ ...previous, role }))} /></FormField>
            <FormField label={editingUser ? 'Status' : 'Initial Status'} htmlFor="user-status"><select id="user-status" className={inputCls} value={form.status} onChange={event => setForm(previous => ({ ...previous, status: event.target.value as ApiUser['status'] }))}>{(editingUser ? STATUSES : ['Active', 'Inactive']).map(status => <option key={status} value={status}>{status}</option>)}</select></FormField>
            {editingUser && <p className="text-xs text-slate-500">A status change requires confirmation before it is saved. Archived accounts can be reactivated.</p>}
            {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2"><button type="button" disabled={submitting} className={secondaryButtonCls} onClick={() => { setIsAddOpen(false); setEditingUser(null); }}>Cancel</button><button type="submit" className={buttonCls} disabled={submitting || isDuplicateName || isDuplicateUsername || isDuplicateEmail || (!editingUser && !isPasswordValid(form.password))}>{submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Add User'}</button></div>
          </form>
        </Modal>
      )}

      {viewingUser && !editingUser && !confirmation && (
        <Modal title="User Account Details" onClose={() => setViewingUser(null)}>
          <dl className="grid max-h-[65dvh] grid-cols-1 gap-3 overflow-y-auto text-sm sm:grid-cols-2">
            {[
              ['Full Name', viewingUser.name], ['Username', viewingUser.username], ['First Name', getUserForm(viewingUser).First_name], ['Middle Name', getUserForm(viewingUser).Middle_name || 'Not provided'], ['Surname', getUserForm(viewingUser).Surname], ['Contact Number', viewingUser.contact_number || 'Not provided'], ['Email Address', viewingUser.email ?? ''], ['Address', viewingUser.address || 'Not provided'], ['Role', getRoleConfig(viewingUser.role).label], ['Account Status', viewingUser.status],
              ...(viewingUser.created_at ? [['Account Created', new Date(viewingUser.created_at).toLocaleString()]] : []),
              ...(viewingUser.status_changed_at ? [['Status Changed', new Date(viewingUser.status_changed_at).toLocaleString()], ['Changed By', viewingUser.status_changed_by_user?.name || 'Administrator']] : []),
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-900 dark:text-slate-100">{value}</dd></div>)}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button className={buttonCls} onClick={() => openEdit(viewingUser)}><Edit2 className="h-4 w-4" /> Edit</button>
            {viewingUser.status !== 'Active' && <button className={secondaryButtonCls} onClick={() => setConfirmation({ user: viewingUser, status: 'Active' })}>Reactivate</button>}
            {viewingUser.status !== 'Quarantined' && viewingUser.status !== 'Archived' && <button className={secondaryButtonCls} onClick={() => setConfirmation({ user: viewingUser, status: 'Quarantined' })}>Quarantine</button>}
            {viewingUser.status !== 'Archived' && <button className={secondaryButtonCls} onClick={() => setConfirmation({ user: viewingUser, status: 'Archived' })}>Archive</button>}
          </div>
        </Modal>
      )}

      {confirmation && (
        <Modal title="Confirm User Status Change" onClose={() => { if (!submitting) setConfirmation(null); }} size="sm">
          <p className="text-sm text-slate-700 dark:text-slate-300">Change <strong>{confirmation.user.name}</strong> from <strong>{confirmation.user.status}</strong> to <strong>{confirmation.status}</strong>?</p>
          <p className="mt-3 text-sm text-slate-500">{confirmation.status === 'Active' ? 'This restores account access.' : 'This prevents the user from signing in.'} The change will be recorded with your account and the time of the change.{confirmation.status === 'Archived' ? ' The account and its records will be retained and can be reactivated.' : ''}</p>
          <div className="mt-5 flex justify-end gap-2"><button className={secondaryButtonCls} disabled={submitting} onClick={() => setConfirmation(null)}>Cancel</button><button className={buttonCls} disabled={submitting} onClick={() => void saveUser(confirmation.user, { ...confirmation.payload, status: confirmation.status, status_change_confirmed: true })}>{submitting ? 'Saving...' : 'Confirm Status Change'}</button></div>
        </Modal>
      )}
      <Tutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} steps={[
        { id: 'add-user', title: 'Add New User', description: 'Enter the name, email, contact number, username and a strong password. Assign the account role.', targetSelector: '[data-user-add]', position: 'bottom' },
        { id: 'user-status', title: 'Filter by Status', description: 'Use Active, Inactive, Quarantined and Archived tabs to find accounts. Archived accounts can be reactivated.', targetSelector: '[data-user-status]', position: 'bottom' },
        { id: 'user-details', title: 'View and Edit', description: 'Select View to read account details, then Edit to change the profile. Confirm status changes before saving.', targetSelector: 'table', position: 'top' },
      ]} />
      <Toast toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
