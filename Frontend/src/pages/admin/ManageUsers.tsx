import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import {
  Users, Search, Plus, Edit2, X, Info,
  AlertTriangle, Eye, EyeOff, ChevronDown, Check,
  UserX, RotateCcw,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { useApi } from '../../hooks/useApi';
import { users as usersApi, type ApiUser, type CreateUserPayload, type PaginatedUsersResponse, type UserStatusCounts } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { Toast, useToast } from '../../components/ui/Toast';
import {
  ITEMS_PER_PAGE, ROLE_CONFIG, STATUS_CONFIG, ASSIGNABLE_STATUSES, roleConfigFor,
  maskEmail, DEFAULT_PASSWORD, generateUsername, generateEmail,
  getPasswordRules, isPasswordValid,
  type RoleKey, type UserStatus,
} from './UserConstants';

/** Tab values for the status filter: 'all' means "every account not archived". */
type StatusFilter = 'all' | UserStatus;

/**
 * Renders one account status. Every non-archived status used to be drawn with the same
 * grey "Active" pill, so Inactive and Quarantined accounts were indistinguishable from
 * healthy ones in both the table and the detail view.
 */
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as UserStatus] ?? STATUS_CONFIG.Active;
  const StatusIcon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${config.badgeClass}`}>
      <StatusIcon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function ManageUsers() {
  const { toasts, dismiss, error: showError, success: showSuccess } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleKey>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unmaskedEmailIds, setUnmaskedEmailIds] = useState<Set<number>>(new Set());
  // "Unmask every email at once" has no control yet, so this is a constant rather
  // than state: it never changed, and keeping it in useState made every read of it
  // look like something that could be stale.
  const isAllEmailsUnmasked = false;

  // Typing in the search box re-renders this component (the input is controlled),
  // but nothing expensive follows it: both queries below key off the deferred value,
  // so React drops the intermediate keystrokes and only fetches — and only re-renders
  // the rows — once the browser is idle.
  const deferredSearch = useDeferredValue(search);

  const { data: userList, loading, error: apiError, refetch } = useApi<PaginatedUsersResponse>(
    () => usersApi.list(
      currentPage,
      ITEMS_PER_PAGE,
      deferredSearch,
      roleFilter === 'all' ? '' : roleFilter,
      statusFilter === 'all' ? '' : statusFilter,
      // The default tab is "everything that is still in use", which is every status
      // except Archived. Passing no status at all returned archived accounts too, so
      // the tab's count badge disagreed with the rows underneath it.
      statusFilter === 'all' ? 'Archived' : '',
    ),
    { dedupeKey: `users-${currentPage}-${deferredSearch}-${roleFilter}-${statusFilter}` }
  );

  // Tab totals come from the server. Deriving them from `userList.data` only ever saw
  // the current page of five rows, so the Archived tab showed "0" while archived
  // accounts existed on a later page.
  const { data: statusCounts, refetch: refetchCounts } = useApi<UserStatusCounts>(
    () => usersApi.statusCounts(deferredSearch, roleFilter === 'all' ? '' : roleFilter),
    { dedupeKey: `user-status-counts-${deferredSearch}-${roleFilter}` }
  );

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ApiUser | null>(null);
  const [archiveModalUser, setArchiveModalUser] = useState<ApiUser | null>(null);
  const [reactivateModalUser, setReactivateModalUser] = useState<ApiUser | null>(null);
  // True once the administrator has typed their own email address, which stops the
  // name-derived default from overwriting it.
  const [emailEdited, setEmailEdited] = useState(false);
  // Non-null once the edit form has picked a different status but the administrator
  // has not yet confirmed it. While set, saving is blocked: QA requires a status
  // change to be confirmed, and it must be reached through Edit rather than a direct
  // control on the row.
  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null);

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
  const generatedEmail = useMemo(() => generateEmail(fullName), [fullName]);

  // QA requires the form to capture the user's email address. It used to be derived
  // from the name and shown read-only (`<name>@wiwaste.com`), so an administrator
  // could never enter the address the person actually uses — which also made the
  // account unreachable via "Forgot password", since that looks the address up in
  // `User.email`. The generated value is still offered as the default, but the field
  // is editable and whatever the administrator types is what gets stored.
  const effectiveEmail = emailEdited ? form.email : generatedEmail;

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

  const resetForm = () => {
    setEmailEdited(false);
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
        email: effectiveEmail,
        password: DEFAULT_PASSWORD,
        role: form.role,
        status: 'Active',
      };
      if (!payload.email.trim()) {
        setSubmitting(false);
        setFormError('Email address is required.');
        return;
      }
      await usersApi.create(payload);
      resetForm();
      setIsAddOpen(false);

      // The table holds 5 rows, so a newly added account would otherwise land on a
      // later page and the administrator would get a success toast with nothing to
      // show for it. Filtering to the new account puts it on screen. An archived
      // account has to come back first, since the default list excludes that status.
      setStatusFilter('all');
      setSearch(fullName.trim());
      setCurrentPage(1);

      await refetch();
      await refetchCounts();
      showSuccess(`Created ${fullName.trim()} with role ${payload.role}.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user');
      showError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (isDuplicateName) { setFormError('A user with this name already exists.'); return; }
    // A status change only reaches the API after the administrator has confirmed it.
    if (pendingStatus) { setFormError('Confirm the status change before saving.'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const payload: Partial<CreateUserPayload> = {
        first_name: form.first_name,
        middle_name: form.middle_name,
        surname: form.surname,
        contact_number: form.contact_number,
        email: form.email,
        role: form.role,
        status: form.status,
      };
      await usersApi.update(editingUser.id, payload);
      setIsEditOpen(false);
      setPendingStatus(null);

      // An edit can rename the account or change its status, and the active filter was
      // chosen against the old values. Left in place, the row you just saved stops
      // matching it and disappears from under you. Clearing the filter keeps the edited
      // account on screen, which is the point of the screen.
      setSearch('');
      setStatusFilter('all');
      setCurrentPage(1);

      await refetch();
      // The archived tab totals change with every status write.
      await refetchCounts();
      showSuccess(`${editingUser.name} updated.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user');
      showError(err instanceof Error ? err.message : 'Failed to update user');
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
      await refetchCounts();
      showSuccess(`${archiveModalUser.name} archived.`);
    } catch (err) {
      console.error('Failed to archive user:', err);
      showError(err instanceof Error ? err.message : 'Failed to archive user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateConfirm = async () => {
    if (!reactivateModalUser) return;
    setSubmitting(true);
    try {
      await usersApi.reactivate(reactivateModalUser.id);
      setReactivateModalUser(null);
      await refetch();
      await refetchCounts();
      showSuccess(`${reactivateModalUser.name} reactivated.`);
    } catch (err) {
      console.error('Failed to reactivate user:', err);
      showError(err instanceof Error ? err.message : 'Failed to reactivate user');
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
    setPendingStatus(null);
    setEmailEdited(false);
    setRoleDropdownOpen(false);
    setIsEditOpen(true);
  };

  /**
   * Records an unconfirmed status change so the modal can ask before it is applied.
   * Picking the original status again withdraws the request.
   */
  const requestStatusChange = (next: UserStatus) => {
    setForm(prev => ({ ...prev, status: next }));
    setPendingStatus(editingUser && next !== editingUser.status ? next : null);
  };

  const cancelStatusChange = () => {
    if (editingUser) setForm(prev => ({ ...prev, status: editingUser.status }));
    setPendingStatus(null);
  };

  // `useCallback` so the memoised column definitions below keep the same reference
  // across keystrokes; the setter it calls is already stable.
  const toggleSingleEmailMask = useCallback((id: number) => {
    setUnmaskedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFiltered = statusFilter !== 'all' || roleFilter !== 'all' || search !== '';

  // QA requires dedicated sections for Inactive and Quarantined accounts; previously
  // both were folded into "All Users" with no way to isolate them.
  //
  // `request()` hands back the whole API envelope, so the payload is under `data`. The
  // counts read `statusCounts?.by_status.X`, and because `?.` only guards
  // `statusCounts` that threw "Cannot read properties of undefined (reading 'Active')"
  // the moment the endpoint started returning data. Every hop is optional-chained now.
  const counts = statusCounts?.data;
  const byStatus = counts?.by_status;
  const statusTabs = useMemo<Array<{ id: StatusFilter; label: string; count: number; Icon?: typeof Users }>>(() => [
    { id: 'all', label: 'All Users', count: counts?.not_archived ?? 0 },
    { id: 'Active', label: 'Active', count: byStatus?.Active ?? 0, Icon: STATUS_CONFIG.Active.icon },
    { id: 'Inactive', label: 'Inactive', count: byStatus?.Inactive ?? 0, Icon: STATUS_CONFIG.Inactive.icon },
    { id: 'Quarantined', label: 'Quarantined', count: byStatus?.Quarantined ?? 0, Icon: STATUS_CONFIG.Quarantined.icon },
    { id: 'Archived', label: 'Archived', count: byStatus?.Archived ?? 0, Icon: STATUS_CONFIG.Archived.icon },
  ], [counts, byStatus]);

  const columns = useMemo<DataTableColumn<ApiUser>[]>(() => [
    {
      key: 'name', header: 'User', pinned: true, truncate: true, minWidth: '150px',
      render: (row) => (
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">{row.name}</div>
      ),
    },
    {
      key: 'username', header: 'Username', truncate: true, minWidth: '100px',
      render: (row) => (
        <span className="text-muted-fg dark:text-muted-fg font-mono text-xs">@{row.username}</span>
      ),
    },
    {
      key: 'email', header: 'Email', truncate: true, minWidth: '150px',
      render: (row) => (
        row.email ? (
          <div className="flex items-center gap-1.5 group">
            <span className="font-mono text-xs">{isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? row.email : maskEmail(row.email)}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleSingleEmailMask(row.id); }}
              className="text-muted-fg opacity-60 group-hover:opacity-100 hover:text-muted-fg dark:hover:text-slate-200 transition-all p-0.5 rounded"
              title={isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? "Mask Email" : "Unmask Email"}>
              {isAllEmailsUnmasked || unmaskedEmailIds.has(row.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : <span className="text-muted-fg italic">No email</span>
      ),
    },
    {
      key: 'role', header: 'Role', align: 'center', minWidth: '100px',
      render: (row) => {
        const roleConfig = roleConfigFor(row.role);
        const RoleIcon = roleConfig.icon;
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
            <RoleIcon className={`h-3.5 w-3.5 ${roleConfig.iconColor}`} />
            <span>{roleConfig.label}</span>
          </div>
        );
      },
    },
    {
      key: 'status', header: 'Status', align: 'center', minWidth: '110px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      // QA asks for the Edit control to be removed from the row: a user record is
      // edited by selecting it and using Edit in the detail view, which is also the
      // only route to a status change. There is deliberately no per-row status
      // control, so status cannot be changed without going through Edit.
      key: 'actions', header: '', align: 'center', minWidth: '80px', pin: 'end',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {row.status !== 'Archived' && (
            <>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setArchiveModalUser(row); }}
                    aria-label={`Archive ${row.name}`}
                    className="touch-target h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-fg dark:text-slate-300 hover:bg-rose-600 hover:text-white transition-all inline-flex items-center justify-center"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">Archive user</TooltipContent>
              </UITooltip>
            </>
          )}
          {row.status !== 'Active' && (
            <UITooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setReactivateModalUser(row); }}
                  aria-label={`Reactivate ${row.name}`}
                  className="touch-target h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-fg dark:text-slate-300 hover:bg-emerald-600 hover:text-white transition-all inline-flex items-center justify-center"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">Reactivate user</TooltipContent>
            </UITooltip>
          )}
        </div>
      ),
    },
  ], [isAllEmailsUnmasked, unmaskedEmailIds, toggleSingleEmailMask]);

  // The rows are rendered once and reused: while the administrator types, the only
  // things that change are `search` and the toolbar above, so keeping this element
  // behind a memo (same reference in, same element out) stops React from re-running
  // DataTable — headers, cells, row actions and all — on every keystroke.
  const usersTable = useMemo(() => (
    <DataTable
      data={paginatedUsers}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No users found"
      // The row is the way into an account. The per-row Edit button was removed (the
      // QA report asked for it), which left editing reachable only from a modal that
      // nothing opened — so the row click opens the view dialog, whose footer carries
      // Edit / Archive / Reactivate. The checkbox cell and the action buttons inside
      // the row stop propagation, so they do not trip it.
      onRowClick={(row) => setViewingUser(row)}
      pagination={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5">
          <div className="text-xs text-muted-fg dark:text-muted-fg">
            {paginatedUsers.length === 0 ? (
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
  // `paginatedUsers` is `users`, which is `userList?.data ?? []` — the reference only
  // moves when a deferred fetch lands, which is exactly when a re-render is wanted.
  ), [paginatedUsers, columns, startIndex, endIndex, totalItems, totalPages, currentPage]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-56 gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-3 border-border dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-1.5 flex items-center justify-center">
          <Users className="h-6 w-6 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-muted-fg dark:text-muted-fg font-semibold text-sm">Loading users...</p>
        <p className="text-xs text-muted-fg dark:text-muted-fg mt-0.5">Fetching user accounts</p>
      </div>
    </div>
  );

  if (apiError) {
// `useApi` stores `err.message` already unwrapped, so `apiError` is the message string
    // itself. Reaching through `.message` again yielded `undefined`, and calling `.match`
    // on that threw a TypeError -- so the "Failed to load users" panel crashed the page
    // instead of rendering whenever the request failed.
    const errorCode = apiError.match(/\((\d+)\)/)?.[1] || 'Unknown';
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
                <Info className="h-5 w-5 text-muted-fg hover:text-muted-fg dark:hover:text-slate-300 cursor-help" />
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
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-border dark:border-white/10 shadow-sm">
        <div className="p-3.5 border-b border-border dark:border-white/10 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
              <span className="text-[9px] font-bold text-muted-fg dark:text-muted-fg px-2 uppercase tracking-wider">Status:</span>
              {statusTabs.map(tab => {
                const TabIcon = tab.Icon;
                const isSelected = statusFilter === tab.id;
                return (
                  <button key={tab.id} onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${isSelected ? 'bg-slate-100 dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm' : 'text-muted-fg dark:text-muted-fg hover:text-slate-900 dark:hover:text-slate-200'}`}>
                    {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                    <span>{tab.label}</span>
                    {tab.count > 0 && <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{tab.count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor="user-role-filter" className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Role:</label>
                <select id="user-role-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'all' | RoleKey)}
                  className="h-8 bg-bg dark:bg-slate-900 border border-border dark:border-white/10 text-xs font-medium rounded-lg px-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]">
                  <option value="all">All Roles</option>
                  {(Object.keys(ROLE_CONFIG) as RoleKey[]).map(key => (
                    <option key={key} value={key}>{ROLE_CONFIG[key].label}</option>
                  ))}
                </select>
              </div>

              <div className="relative max-w-xs w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-fg" />
                <input type="text" placeholder="Search name, username, email..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-8 w-full bg-bg dark:bg-slate-900/50 border border-border dark:border-white/10 pl-8 pr-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200" />
              </div>

              {isFiltered && (
                <button onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearch(''); }}
                  className="text-xs text-muted-fg hover:text-slate-700 dark:hover:text-slate-300 underline font-medium">Reset Filters</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The rows live in a memoised element (see `usersTable`) so keystrokes in the
          toolbar above do not re-render the table. */}
      {usersTable}

      {/* ── ADD USER MODAL ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-bg-elevated rounded-xl border border-border dark:border-white/10 w-full max-w-lg p-4 relative shadow-2xl my-6">
            <button type="button" aria-label="Close" onClick={() => setIsAddOpen(false)} className="absolute top-3 right-3 text-muted-fg hover:text-muted-fg dark:hover:text-slate-200 p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="p-1.5 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Plus className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New User</h2>
                <p className="text-xs text-muted-fg">Enter the name, email address and role. The username and password are generated for you.</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="add-user-first-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input id="add-user-first-name" type="text" required placeholder="First" value={form.first_name}
                    onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className={`h-8 w-full bg-bg dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-border dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
                <div>
                  <label htmlFor="add-user-middle-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Middle Name</label>
                  <input id="add-user-middle-name" type="text" placeholder="Middle" value={form.middle_name}
                    onChange={e => setForm(prev => ({ ...prev, middle_name: e.target.value }))}
                    className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label htmlFor="add-user-last-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input id="add-user-last-name" type="text" required placeholder="Last" value={form.surname}
                    onChange={e => setForm(prev => ({ ...prev, surname: e.target.value }))}
                    className={`h-8 w-full bg-bg dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-border dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
              </div>
              {isDuplicateName && <p className="text-rose-500 text-[10px] font-semibold mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> A user with this name already exists.</p>}

              {fullName.trim() && (
                <div className="p-2.5 rounded-lg bg-bg dark:bg-slate-800/70 border border-border dark:border-white/5 space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Auto-generated credentials:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-fg dark:text-muted-fg">Username:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">@{autoUsername}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-fg dark:text-muted-fg">Password:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{DEFAULT_PASSWORD}</span>
                  </div>
                  {/* The policy was computed but never displayed, so the form gave no
                      indication of what the shared password has to satisfy. */}
                  <ul className="pt-1 mt-0.5 border-t border-border dark:border-white/5 space-y-0.5">
                    {passwordRules.map(rule => (
                      <li key={rule.id} className={`flex items-center gap-1.5 text-[10px] ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-fg dark:text-muted-fg'}`}>
                        {rule.met
                          ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                          : <span className="w-3 shrink-0 text-center" aria-hidden="true">&bull;</span>}
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label htmlFor="add-user-contact-number" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Contact Number</label>
                <input id="add-user-contact-number" type="text" placeholder="e.g. 09171234567" value={form.contact_number}
                  onChange={e => setForm(prev => ({ ...prev, contact_number: e.target.value }))}
                  className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
              </div>

              <div>
                <label htmlFor="add-user-email" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="add-user-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={effectiveEmail}
                  onChange={e => { setForm(prev => ({ ...prev, email: e.target.value })); setEmailEdited(true); }}
                  className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                />
                <p className="text-[10px] text-muted-fg dark:text-muted-fg mt-1">
                  Pre-filled from the name. Change it to the address this person actually
                  uses — "Forgot password" sends the reset code here.
                </p>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Assign Role <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <button type="button" onClick={() => setRoleDropdownOpen(prev => !prev)}
                    className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {React.createElement(roleConfigFor(form.role).icon, { className: `h-3.5 w-3.5 ${roleConfigFor(form.role).iconColor}` })}
                      <span className="font-medium">{roleConfigFor(form.role).label}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-fg" />
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-border dark:border-white/10 shadow-xl overflow-hidden py-1">
                      {(Object.keys(ROLE_CONFIG) as RoleKey[]).map(roleKey => {
                        const item = ROLE_CONFIG[roleKey];
                        const ItemIcon = item.icon;
                        const isSelected = form.role === roleKey;
                        return (
                          <button key={roleKey} type="button" onClick={() => { setForm(prev => ({ ...prev, role: roleKey })); setRoleDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-bg dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-[#006a61]/5 dark:bg-[#006a61]/20' : ''}`}>
                            <ItemIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.iconColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-[#006a61] dark:text-[#7ef0cf]" />}
                              </div>
                              <span className="text-[10px] text-muted-fg dark:text-muted-fg">{item.description}</span>
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
          <div className="bg-bg-elevated rounded-xl border border-border dark:border-white/10 w-full max-w-lg p-4 relative shadow-2xl my-6">
            <button type="button" aria-label="Close" onClick={() => { setIsEditOpen(false); setViewingUser(null); }} className="absolute top-3 right-3 text-muted-fg hover:text-muted-fg p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="p-1.5 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Edit2 className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit User</h2>
                <p className="text-xs text-muted-fg">@{editingUser.username}</p>
              </div>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="edit-user-first-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input id="edit-user-first-name" type="text" required value={form.first_name}
                    onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className={`h-8 w-full bg-bg dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-border dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
                <div>
                  <label htmlFor="edit-user-middle-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Middle Name</label>
                  <input id="edit-user-middle-name" type="text" value={form.middle_name}
                    onChange={e => setForm(prev => ({ ...prev, middle_name: e.target.value }))}
                    className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label htmlFor="edit-user-last-name" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input id="edit-user-last-name" type="text" required value={form.surname}
                    onChange={e => setForm(prev => ({ ...prev, surname: e.target.value }))}
                    className={`h-8 w-full bg-bg dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-border dark:border-white/10 focus:ring-[#006a61]'}`} />
                </div>
              </div>
              {isDuplicateName && <p className="text-rose-500 text-[10px] font-semibold mt-1">A user with this name already exists.</p>}

              <div>
                <label htmlFor="edit-user-email" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input id="edit-user-email" type="email" required value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
              </div>

              <div>
                <label htmlFor="edit-user-contact-number" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Contact Number</label>
                <input id="edit-user-contact-number" type="text" value={form.contact_number}
                  onChange={e => setForm(prev => ({ ...prev, contact_number: e.target.value }))}
                  className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100" />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Role</label>
                <div className="relative">
                  <button type="button" onClick={() => setRoleDropdownOpen(prev => !prev)}
                    className="h-8 w-full bg-bg dark:bg-slate-800 border border-border dark:border-white/10 px-3 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {React.createElement(roleConfigFor(form.role).icon, { className: `h-3.5 w-3.5 ${roleConfigFor(form.role).iconColor}` })}
                      <span className="font-medium">{roleConfigFor(form.role).label}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-fg" />
                  </button>
                  {roleDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-border dark:border-white/10 shadow-xl overflow-hidden py-1">
                      {(Object.keys(ROLE_CONFIG) as RoleKey[]).map(roleKey => {
                        const item = ROLE_CONFIG[roleKey];
                        const ItemIcon = item.icon;
                        const isSelected = form.role === roleKey;
                        return (
                          <button key={roleKey} type="button" onClick={() => { setForm(prev => ({ ...prev, role: roleKey })); setRoleDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-bg dark:hover:bg-white/5 ${isSelected ? 'bg-[#006a61]/10' : ''}`}>
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

              {/* Status is editable only from inside Edit, and only once the change has
                  been explicitly confirmed. Archived is absent on purpose: it is
                  reached through Archive, which has its own confirmation. */}
              <div>
                <label htmlFor="edit-user-status" className="block text-sm font-bold text-muted-fg dark:text-muted-fg mb-1">Account Status</label>
                <select
                  id="edit-user-status"
                  value={form.status}
                  onChange={e => requestStatusChange(e.target.value as UserStatus)}
                  aria-describedby="edit-user-status-help"
                  className={`h-8 w-full bg-bg dark:bg-slate-800 border px-3 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${pendingStatus ? 'border-amber-400 focus:ring-amber-400' : 'border-border dark:border-white/10 focus:ring-[#006a61]'}`}
                >
                  {ASSIGNABLE_STATUSES.map(status => (
                    <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                  ))}
                  {form.status === 'Archived' && <option value="Archived">Archived</option>}
                </select>
                <p id="edit-user-status-help" className="text-[10px] text-muted-fg dark:text-muted-fg mt-1">
                  {STATUS_CONFIG[(form.status as UserStatus) ?? 'Active']?.description ?? ''}
                </p>
              </div>

              {pendingStatus && (
                <div role="alert" className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 space-y-2">
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden="true" />
                    <span>
                      Change status of <strong>{editingUser?.name}</strong> from{' '}
                      <strong>{editingUser?.status}</strong> to <strong>{pendingStatus}</strong>?
                      {pendingStatus !== 'Active' && <> This immediately blocks the account from signing in.</>}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={cancelStatusChange}
                      className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg hover:bg-bg dark:hover:bg-slate-700 transition-all">
                      Cancel
                    </button>
                    <button type="button" onClick={() => setPendingStatus(null)}
                      className="h-7 px-2.5 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all">
                      Confirm status change
                    </button>
                  </div>
                </div>
              )}

              {formError && <p className="text-rose-600 text-xs font-semibold">{formError}</p>}

              <button type="submit" disabled={submitting || isDuplicateName || pendingStatus !== null || !form.first_name.trim() || !form.surname.trim()}
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
          <div className="bg-bg-elevated rounded-xl border border-border dark:border-white/10 w-full max-w-md p-4 relative shadow-2xl my-6">
            <button type="button" aria-label="Close" onClick={() => setViewingUser(null)} className="absolute top-3 right-3 text-muted-fg hover:text-muted-fg dark:hover:text-slate-200 p-0.5">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="p-2 rounded-full bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]"><Users className="h-5 w-5" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{viewingUser.name}</h2>
                <p className="text-xs text-muted-fg">User Account Details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Full Name</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{viewingUser.name}</p>
              </div>

              {viewingUser.contact_number && (
                <div>
                  <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Contact Number</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{viewingUser.contact_number}</p>
                </div>
              )}

              <div>
                <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Username</label>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-0.5">@{viewingUser.username}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Email Address</label>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-all">{viewingUser.email || 'Not provided'}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Role</label>
                <div className="mt-0.5">
                  {(() => {
                    const roleConfig = roleConfigFor(viewingUser.role);
                    const RoleIcon = roleConfig.icon;
                    return (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
                        <RoleIcon className={`h-3.5 w-3.5 ${roleConfig.iconColor}`} />
                        <span>{roleConfig.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Account Status</label>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={viewingUser.status} />
                  {viewingUser.status !== 'Active' && (
                    <span className="text-[10px] text-muted-fg dark:text-muted-fg">
                      {STATUS_CONFIG[viewingUser.status as UserStatus]?.description}
                    </span>
                  )}
                </div>
              </div>

              {viewingUser.created_at && (
                <div>
                  <label className="text-[9px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Account Created</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(viewingUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              {/* Edit is the only route to a status change, so it stays available for
                  every status — an archived account can still be inspected and brought
                  back. */}
              <button onClick={() => { const u = viewingUser; setViewingUser(null); setTimeout(() => openEdit(u), 0); }}
                className="h-8 flex-1 px-3 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              {viewingUser.status !== 'Archived' && (
                <button onClick={() => { setArchiveModalUser(viewingUser); setViewingUser(null); }}
                  className="h-8 flex-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1">
                  <UserX className="h-3.5 w-3.5" /> Archive
                </button>
              )}
              {viewingUser.status !== 'Active' && (
                <button onClick={() => { setReactivateModalUser(viewingUser); setViewingUser(null); }}
                  className="h-8 flex-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ARCHIVE CONFIRM MODAL ── */}
      {archiveModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3" role="dialog" aria-modal="true">
          <div className="bg-bg-elevated rounded-xl border border-rose-200 dark:border-rose-800/40 w-full max-w-md p-4 relative shadow-2xl">
            <button type="button" aria-label="Close" onClick={() => setArchiveModalUser(null)} className="absolute top-3 right-3 text-muted-fg hover:text-muted-fg"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"><UserX className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Archive User Account</h3>
                <p className="text-xs text-muted-fg">Remove from active user list</p>
              </div>
            </div>
            <p className="text-xs text-muted-fg dark:text-slate-300 mb-3 leading-relaxed">
              Are you sure you want to archive <strong className="text-slate-900 dark:text-slate-100">{archiveModalUser.name}</strong> (@{archiveModalUser.username})?
              <br /><br />
              This user will be blocked from logging in and moved to the <strong className="text-rose-600 dark:text-rose-400">Archived</strong> list. This can be reversed by an administrator.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setArchiveModalUser(null)} className="h-8 px-3 text-xs font-semibold text-muted-fg dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Cancel</button>
              <button onClick={handleArchiveConfirm} disabled={submitting}
                className="h-8 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5" />{submitting ? 'Archiving...' : 'Archive User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REACTIVATE CONFIRM MODAL ── */}
      {reactivateModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3" role="dialog" aria-modal="true">
          <div className="bg-bg-elevated rounded-xl border border-emerald-200 dark:border-emerald-800/40 w-full max-w-md p-4 relative shadow-2xl">
            <button type="button" aria-label="Close" onClick={() => setReactivateModalUser(null)} className="absolute top-3 right-3 text-muted-fg hover:text-muted-fg"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"><RotateCcw className="h-5 w-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reactivate User Account</h3>
                <p className="text-xs text-muted-fg">Restore sign-in access</p>
              </div>
            </div>
            <p className="text-xs text-muted-fg dark:text-slate-300 mb-3 leading-relaxed">
              Reactivate <strong className="text-slate-900 dark:text-slate-100">{reactivateModalUser.name}</strong> (@{reactivateModalUser.username})?
              <br /><br />
              The account will move from{' '}
              <StatusBadge status={reactivateModalUser.status} /> back to{' '}
              <StatusBadge status="Active" /> and be able to sign in again. The account itself was never deleted.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setReactivateModalUser(null)} className="h-8 px-3 text-xs font-semibold text-muted-fg dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">Cancel</button>
              <button onClick={handleReactivateConfirm} disabled={submitting}
                className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />{submitting ? 'Reactivating...' : 'Reactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
