import React, { useState, useEffect, memo } from 'react';
import {
  Users, Search, Plus, Edit2, X, Info, Loader2, Shield, Package,
  Briefcase, AlertTriangle, CheckCircle2, Circle, RotateCcw, Trash2,
  Lock, ShieldOff, ChevronDown, Check, UserX, Eye, EyeOff, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Tutorial } from '../../components/ui/Tutorial';
import { useOptimisticList } from '../../hooks/useOptimisticList';
import { users as usersApi, type ApiUser, type CreateUserPayload } from '../../services/api';

const ITEMS_PER_PAGE = 5;

const ROLE_CONFIG = {
  'Admin': {
    label: 'Admin',
    icon: Shield,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    description: 'Full system control & user management',
  },
  'Inventory': {
    label: 'Inventory Staff',
    icon: Package,
    iconColor: 'text-[#006a61] dark:text-[#7ef0cf]',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50',
    description: 'Manage stock, products & wastage',
  },
  'Business Owner': {
    label: 'Business Owner',
    icon: Briefcase,
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    description: 'Reports, financial insights & POS',
  },
} as const;

const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
};

const UserRow = memo(function UserRow({
  u, isEmailUnmasked, onView, onEdit, onQuarantine, onReactivate, onDelete, onToggleEmailMask
}: {
  u: ApiUser;
  isEmailUnmasked: boolean;
  onView: (u: ApiUser) => void;
  onEdit: (u: ApiUser) => void;
  onQuarantine: (u: ApiUser) => void;
  onReactivate: (u: ApiUser) => void;
  onDelete: (u: ApiUser) => void;
  onToggleEmailMask: (id: number) => void;
}) {
  const RoleIcon = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG]?.icon ?? Users;
  const roleConfig = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG];

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onView(u)}>
      <td className="px-6 py-4">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">{u.name}</div>
      </td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">@{u.username}</td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
        {u.email ? (
          <div className="flex items-center gap-1.5 group">
            <span className="font-mono text-xs">{isEmailUnmasked ? u.email : maskEmail(u.email)}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleEmailMask(u.id); }}
              className="text-slate-400 opacity-60 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 transition-all p-0.5 rounded"
              title={isEmailUnmasked ? "Mask Email" : "Unmask Email"}
            >
              {isEmailUnmasked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <span className="text-slate-400 italic">No email</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
          <RoleIcon className={`h-3.5 w-3.5 ${roleConfig?.iconColor ?? 'text-slate-500'}`} />
          <span>{u.role}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {u.status === 'Active' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        )}
        {u.status === 'Inactive' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
          </span>
        )}
        {u.status === 'Quarantined' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-sm">
            <ShieldOff className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Quarantined
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {u.status !== 'Quarantined' && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(u); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:bg-[#006a61]/10 transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {u.status === 'Inactive' && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuarantine(u); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50 transition-all"
            >
              <Lock className="h-3.5 w-3.5" /> Quarantine
            </button>
          )}
          {u.status === 'Quarantined' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onReactivate(u); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reactivate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(u); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/50 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

export function ManageUsers() {
  const { data: userList, loading, error, addItem, updateItem, removeItem, refetch } = useOptimisticList(usersApi.list);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Quarantined'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'Inventory' | 'Business Owner'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unmaskedEmailIds, setUnmaskedEmailIds] = useState<Set<number>>(new Set());
  const [isAllEmailsUnmasked, setIsAllEmailsUnmasked] = useState(false);
  const [showEmptyNotification, setShowEmptyNotification] = useState(false);
  const [notificationCountdown, setNotificationCountdown] = useState(20);
  const [showTutorial, setShowTutorial] = useState(false);

  const tutorialSteps = [
    {
      id: 'add-user-btn',
      title: 'Add New User',
      description: 'Click here to create a new user account. You can assign roles like Admin, Inventory Staff, or Business Owner.',
      targetSelector: 'button:has(svg.lucide-plus):first-of-type',
      position: 'bottom' as const,
    },
    {
      id: 'status-filter',
      title: 'Filter by Status',
      description: 'Use these tabs to filter users by their account status: All, Active, Inactive, or Quarantined.',
      targetSelector: '.flex.flex-wrap.items-center.gap-1\.5.bg-slate-100',
      position: 'bottom' as const,
    },
    {
      id: 'search-bar',
      title: 'Search Users',
      description: 'Search for users by name, username, or email address to quickly find specific accounts.',
      targetSelector: 'input[placeholder*="Search name"]',
      position: 'bottom' as const,
    },
    {
      id: 'user-table',
      title: 'User List',
      description: 'View all users in the system. Click on any row to see full details, or use the Edit button to modify user information.',
      targetSelector: 'table',
      position: 'top' as const,
    },
    {
      id: 'email-toggle',
      title: 'Email Privacy',
      description: 'Toggle the eye icon to mask or unmask email addresses for privacy. Use the header toggle to mask all at once.',
      targetSelector: 'button[title*="Unmask all emails"]',
      position: 'bottom' as const,
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

  const toggleSingleEmailMask = (id: number) => {
    setUnmaskedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllEmailsMask = () => {
    setIsAllEmailsUnmasked(prev => !prev);
  };
  
  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ApiUser | null>(null);
  
  // Confirmation Modals state
  const [quarantineModalUser, setQuarantineModalUser] = useState<ApiUser | null>(null);
  const [reactivateModalUser, setReactivateModalUser] = useState<ApiUser | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<ApiUser | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const [form, setForm] = useState<CreateUserPayload>({
    Full_name: '', username: '', password: '', email: '',
    role: 'Inventory', status: 'Active',
  });

  const users = userList ?? [];

  // Show empty notification when table is empty and no filters applied
  useEffect(() => {
    const isFiltered = statusFilter !== 'all' || roleFilter !== 'all' || search !== '';
    if (users.length === 0 && !isFiltered && !loading && !error) {
      setShowEmptyNotification(true);
      setNotificationCountdown(20);
      const timer = setTimeout(() => setShowEmptyNotification(false), 20000);
      return () => clearTimeout(timer);
    }
  }, [users.length, statusFilter, roleFilter, search, loading, error]);

  // Countdown timer for notification
  useEffect(() => {
    if (!showEmptyNotification) return;
    const interval = setInterval(() => {
      setNotificationCountdown(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [showEmptyNotification]);

  // Filtered users logic
  const filteredUsers = users.filter(u => {
    let matchesStatus = true;
    if (statusFilter === 'Quarantined') {
      matchesStatus = u.status === 'Quarantined';
    } else if (statusFilter === 'Active') {
      matchesStatus = u.status === 'Active';
    } else if (statusFilter === 'Inactive') {
      matchesStatus = u.status === 'Inactive';
    } else {
      // 'all' status: show non-quarantined accounts (Active & Inactive)
      matchesStatus = u.status !== 'Quarantined';
    }

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.username.toLowerCase().includes(search.toLowerCase()) ||
                          u.email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Duplicate checks
  const isDuplicateName = Boolean(
    form.Full_name.trim() &&
    users.some(u => 
      u.name.trim().toLowerCase() === form.Full_name.trim().toLowerCase() && 
      (!editingUser || u.id !== editingUser.id)
    )
  );

  const isDuplicateUsername = Boolean(
    form.username.trim() &&
    users.some(u => 
      u.username.trim().toLowerCase() === form.username.trim().toLowerCase() && 
      (!editingUser || u.id !== editingUser.id)
    )
  );

  // Password Policy Checks
  const getPasswordRules = (pwd: string) => [
    { id: 'length', label: 'At least 6 characters', met: pwd.length >= 6 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(pwd) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(pwd) },
    { id: 'number', label: 'One number (0-9)', met: /[0-9]/.test(pwd) },
    { id: 'special', label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
  ];

  const passwordRules = getPasswordRules(form.password);
  const isPasswordValid = passwordRules.every(r => r.met);

  const resetForm = () => {
    setForm({ Full_name: '', username: '', password: '', email: '', role: 'Inventory', status: 'Active' });
    setFormError('');
    setRoleDropdownOpen(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateName || isDuplicateUsername) {
      setFormError('Please resolve duplicate user validation errors before submitting.');
      return;
    }
    if (!isPasswordValid) {
      setFormError('Password does not meet all policy requirements.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const created = await usersApi.create(form) as ApiUser;
      resetForm();
      setIsAddOpen(false);
      addItem(created);
      await refetch();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (isDuplicateName) {
      setFormError('A user with this full name already exists.');
      return;
    }
    if (form.password && !isPasswordValid) {
      setFormError('Password does not meet all policy requirements.');
      return;
    }

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
      await refetch();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Quarantine Action
  const handleQuarantineConfirm = async () => {
    if (!quarantineModalUser) return;
    setSubmitting(true);
    try {
      await usersApi.quarantine(quarantineModalUser.id);
      updateItem(quarantineModalUser.id, { ...quarantineModalUser, status: 'Quarantined' });
      setQuarantineModalUser(null);
      await refetch();
    } catch (err: any) {
      alert(err.message ?? 'Failed to quarantine user');
    } finally {
      setSubmitting(false);
    }
  };

  // Reactivate Action
  const handleReactivateConfirm = async () => {
    if (!reactivateModalUser) return;
    setSubmitting(true);
    try {
      await usersApi.reactivate(reactivateModalUser.id);
      updateItem(reactivateModalUser.id, { ...reactivateModalUser, status: 'Active' });
      setReactivateModalUser(null);
      await refetch();
    } catch (err: any) {
      alert(err.message ?? 'Failed to reactivate user');
    } finally {
      setSubmitting(false);
    }
  };

  // Permanent Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteModalUser) return;
    setSubmitting(true);
    try {
      await usersApi.delete(deleteModalUser.id);
      removeItem(deleteModalUser.id);
      setDeleteModalUser(null);
      await refetch();
    } catch (err: any) {
      alert(err.message ?? 'Failed to permanently delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: ApiUser) => {
    setViewingUser(null);
    setEditingUser(user);
    setForm({ Full_name: user.name, username: user.username, password: '', email: user.email ?? '', role: user.role, status: user.status });
    setFormError('');
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006a61] border-r-[#006a61] animate-spin"></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <Users className="h-8 w-8 text-[#006a61] dark:text-[#7ef0cf] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Loading users...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Fetching user accounts</p>
      </div>
    </div>
  );


  if (error) {
    const errorCode = error.match(/\((\d+)\)/)?.[1] || 'Unknown';
    const errorMessage = errorCode === '2002' ? "There's no connection (2002)" : `Connection error (${errorCode})`;
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Failed to load users</p>
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeCount = users.filter(u => u.status === 'Active').length;
  const inactiveCount = users.filter(u => u.status === 'Inactive').length;
  const quarantinedCount = users.filter(u => u.status === 'Quarantined').length;
  const allCount = users.filter(u => u.status !== 'Quarantined').length;

  const isFiltered = statusFilter !== 'all' || roleFilter !== 'all' || search !== '';

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Users</h1>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
                Configure system users, role access levels, and user quarantine policies.
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#006a61] text-white px-4 py-2.5 text-xs font-semibold hover:bg-[#00574f] shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Status:</span>
              {[
                { id: 'all', label: 'All Accounts', count: allCount },
                { id: 'Active', label: 'Active', count: activeCount },
                { id: 'Inactive', label: 'Inactive', count: inactiveCount },
                { id: 'Quarantined', label: 'Quarantined', count: quarantinedCount, icon: ShieldOff },
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      isSelected
                        ? tab.id === 'Quarantined'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-950 text-[#006a61] dark:text-[#7ef0cf] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected && tab.id === 'Quarantined'
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Role Filter & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Role Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
                >
                  <option value="all">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Inventory">Inventory Staff</option>
                  <option value="Business Owner">Business Owner</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative max-w-xs w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, username, email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-200"
                />
              </div>

              {/* Reset Filters */}
              {isFiltered && (
                <button
                  onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearch(''); }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <span>Email</span>
                    <button
                      type="button"
                      onClick={toggleAllEmailsMask}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                      title={isAllEmailsUnmasked ? "Mask all emails" : "Unmask all emails"}
                    >
                      {isAllEmailsUnmasked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No matching users found.
                  </td>
                </tr>
              ) : paginatedUsers.map(u => (
                <UserRow
                  key={u.id}
                  u={u}
                  isEmailUnmasked={isAllEmailsUnmasked || unmaskedEmailIds.has(u.id)}
                  onView={setViewingUser}
                  onEdit={openEdit}
                  onQuarantine={setQuarantineModalUser}
                  onReactivate={setReactivateModalUser}
                  onDelete={setDeleteModalUser}
                  onToggleEmailMask={toggleSingleEmailMask}
                />
              ))}
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

        {/* Empty State Notification */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            {filteredUsers.length === 0 ? (
              <span>Showing 0 of 0 Users</span>
            ) : totalPages === 1 ? (
              <span>Showing {filteredUsers.length} of {filteredUsers.length} Users</span>
            ) : (
              <span>
                Showing <strong className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{filteredUsers.length}</strong> Users
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>

              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-6 relative shadow-2xl my-8">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="p-2 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New User</h2>
                <p className="text-xs text-slate-500">Create a new user account with role permissions.</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={form.Full_name}
                  onChange={e => setForm(prev => ({ ...prev, Full_name: e.target.value }))}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${
                    isDuplicateName
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'
                  }`}
                />
                {isDuplicateName && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Full Name already exists in the system.
                  </p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe"
                  value={form.username}
                  onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${
                    isDuplicateUsername
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'
                  }`}
                />
                {isDuplicateUsername && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Username is already taken.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. jane@wiwaste.com"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Password & Policy */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextId = users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;
                      const defaultPwd = `Winewuser${nextId}!`;
                      setForm(prev => ({ ...prev, password: defaultPwd }));
                      setShowAddPassword(true);
                    }}
                    className="text-[11px] font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="h-3 w-3" /> Use Default Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter strong password..."
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border pr-10 pl-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${
                      form.password && !isPasswordValid
                        ? 'border-amber-400 focus:ring-amber-400'
                        : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                    title={showAddPassword ? "Hide password" : "Show password"}
                  >
                    {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Policy Guidelines */}
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Password Policy Requirements:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {passwordRules.map(rule => (
                      <div key={rule.id} className="flex items-center gap-1.5 text-[11px]">
                        {rule.met ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className={rule.met ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role Selection with Icons */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Assign Role <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen(prev => !prev)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2.5 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {React.createElement(ROLE_CONFIG[form.role].icon, {
                        className: `h-4 w-4 ${ROLE_CONFIG[form.role].iconColor}`
                      })}
                      <span className="font-medium">{ROLE_CONFIG[form.role].label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {roleDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden py-1">
                      {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map(roleKey => {
                        const item = ROLE_CONFIG[roleKey];
                        const ItemIcon = item.icon;
                        const isSelected = form.role === roleKey;

                        return (
                          <button
                            key={roleKey}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, role: roleKey }));
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                              isSelected ? 'bg-[#006a61]/5 dark:bg-[#006a61]/20' : ''
                            }`}
                          >
                            <ItemIcon className={`h-4 w-4 mt-0.5 shrink-0 ${item.iconColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-[#006a61] dark:text-[#7ef0cf]" />}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Initial Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isDuplicateName || isDuplicateUsername || !isPasswordValid}
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? 'Adding User...' : 'Add User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-6 relative shadow-2xl my-8">
            <button onClick={() => { setIsEditOpen(false); setViewingUser(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="p-2 rounded-lg bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit User Details</h2>
                <p className="text-xs text-slate-500">Update account for @{editingUser.username}</p>
              </div>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.Full_name}
                  onChange={e => setForm(prev => ({ ...prev, Full_name: e.target.value }))}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 text-slate-900 dark:text-slate-100 ${
                    isDuplicateName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10 focus:ring-[#006a61]'
                  }`}
                />
                {isDuplicateName && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-1">Full Name already exists.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    New Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                  </label>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultPwd = `Winewuser${editingUser.id}!`;
                        setForm(prev => ({ ...prev, password: defaultPwd }));
                        setShowEditPassword(true);
                      }}
                      className="text-[11px] font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="h-3 w-3" /> Use Default Password
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Optional new password..."
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 pr-10 pl-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                    title={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Policy:</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {passwordRules.map(rule => (
                        <div key={rule.id} className="flex items-center gap-1">
                          {rule.met ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3 text-slate-400" />}
                          <span className={rule.met ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection with Icons */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Role
                </label>
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(prev => !prev)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                >
                  <div className="flex items-center gap-2">
                    {React.createElement(ROLE_CONFIG[form.role].icon, {
                      className: `h-4 w-4 ${ROLE_CONFIG[form.role].iconColor}`
                    })}
                    <span className="font-medium">{ROLE_CONFIG[form.role].label}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden py-1">
                    {(Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>).map(roleKey => {
                      const item = ROLE_CONFIG[roleKey];
                      const ItemIcon = item.icon;
                      const isSelected = form.role === roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => { setForm(prev => ({ ...prev, role: roleKey })); setRoleDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 ${isSelected ? 'bg-[#006a61]/10' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <ItemIcon className={`h-4 w-4 ${item.iconColor}`} />
                            <span className="font-medium text-xs">{item.label}</span>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#006a61]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Quarantined">Quarantined</option>
                </select>
              </div>

              {formError && (
                <p className="text-rose-600 text-xs font-semibold">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || isDuplicateName || (Boolean(form.password) && !isPasswordValid)}
                className="w-full bg-[#006a61] hover:bg-[#00574f] text-white py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── View User Details Modal ── */}
      {viewingUser && !isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 relative shadow-2xl my-8">
            <button
              onClick={() => setViewingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
              <div className="p-3 rounded-full bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{viewingUser.name}</h2>
                <p className="text-xs text-slate-500">User Account Details</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Full Name</label>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">{viewingUser.name}</p>
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Username</label>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-1">@{viewingUser.username}</p>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email Address</label>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 break-all">{viewingUser.email || 'Not provided'}</p>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</label>
                <div className="mt-1">
                  {(() => {
                    const RoleIcon = ROLE_CONFIG[viewingUser.role as keyof typeof ROLE_CONFIG]?.icon ?? Users;
                    const roleConfig = ROLE_CONFIG[viewingUser.role as keyof typeof ROLE_CONFIG];
                    return (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
                        <RoleIcon className={`h-4 w-4 ${roleConfig?.iconColor ?? 'text-slate-500'}`} />
                        <span>{viewingUser.role}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Status</label>
                <div className="mt-1">
                  <select
                    value={viewingUser.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value as 'Active' | 'Inactive' | 'Quarantined';
                      try {
                        await usersApi.update(viewingUser.id, { status: newStatus });
                        updateItem(viewingUser.id, { ...viewingUser, status: newStatus });
                        setViewingUser({ ...viewingUser, status: newStatus });
                      } catch (err: any) {
                        alert(err.message ?? 'Failed to update status');
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Quarantined">Quarantined</option>
                  </select>
                </div>
              </div>

              {/* Created Date */}
              {viewingUser.created_at && (
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Created</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {new Date(viewingUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              {viewingUser.status !== 'Quarantined' && (
                <button
                  onClick={() => {
                    const userToEdit = viewingUser;
                    setViewingUser(null);
                    setTimeout(() => openEdit(userToEdit), 0);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {viewingUser.status === 'Inactive' && (
                <button
                  onClick={() => {
                    setQuarantineModalUser(viewingUser);
                    setViewingUser(null);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1"
                >
                  <Lock className="h-3.5 w-3.5" /> Quarantine
                </button>
              )}
              {viewingUser.status === 'Quarantined' && (
                <>
                  <button
                    onClick={() => {
                      setReactivateModalUser(viewingUser);
                      setViewingUser(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModalUser(viewingUser);
                      setViewingUser(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all inline-flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quarantine Confirmation Modal ── */}
      {quarantineModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/40 w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setQuarantineModalUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Quarantine User Account</h3>
                <p className="text-xs text-slate-500">Confirm suspension of user access</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to quarantine <strong className="text-slate-900 dark:text-slate-100">{quarantineModalUser.name}</strong> (@{quarantineModalUser.username})?
              <br /><br />
              This user will be placed on the <strong className="text-amber-600 dark:text-amber-400">Quarantined Users</strong> list and all account privileges will be suspended until reactivated or permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setQuarantineModalUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleQuarantineConfirm}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Quarantining...' : 'Quarantine User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reactivate Confirmation Modal ── */}
      {reactivateModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/40 w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setReactivateModalUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reactivate Quarantined User</h3>
                <p className="text-xs text-slate-500">Restore user system access</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to reactivate <strong className="text-slate-900 dark:text-slate-100">{reactivateModalUser.name}</strong> (@{reactivateModalUser.username})?
              <br /><br />
              This will restore their account status to <strong className="text-emerald-600 dark:text-emerald-400">Active</strong> and re-enable system authorization.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReactivateModalUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivateConfirm}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Reactivating...' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Component */}
      <Tutorial steps={tutorialSteps} isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* ── Permanent Deletion Modal ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800/40 w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setDeleteModalUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Permanent Deletion</h3>
                <p className="text-xs text-slate-500">Irreversible action warning</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-slate-100">{deleteModalUser.name}</strong> (@{deleteModalUser.username})?
              <br /><br />
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                This action cannot be undone. All user access and records will be permanently removed from the system.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
