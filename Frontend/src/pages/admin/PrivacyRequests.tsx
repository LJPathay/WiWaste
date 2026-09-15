import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, Calendar, Download, User, ShieldCheck, AlertCircle,
  Eye, Edit, Trash2, Clock, FileText, Shield, Key, Unlock, Mail, AlertTriangle
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { privacy as privacyApi, type ApiDataSubjectRequest, type ApiPrivacyComplianceReport } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';

const REQUEST_TYPES = [
  { value: 'access', label: 'Access', icon: <Eye className="w-3 h-3" />, description: 'Request copy of personal data' },
  { value: 'rectification', label: 'Rectification', icon: <Edit className="w-3 h-3" />, description: 'Correct inaccurate data' },
  { value: 'erasure', label: 'Erasure', icon: <Trash2 className="w-3 h-3" />, description: 'Right to be forgotten' },
  { value: 'portability', label: 'Portability', icon: <Download className="w-3 h-3" />, description: 'Structured data export' },
  { value: 'restriction', label: 'Restriction', icon: <Shield className="w-3 h-3" />, description: 'Limit data processing' },
  { value: 'objection', label: 'Objection', icon: <AlertTriangle className="w-3 h-3" />, description: 'Object to processing' },
] as const;

const STATUS_BADGES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border border-blue-100', icon: <ShieldCheck className="w-3 h-3" /> },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 border border-green-100', icon: <ShieldCheck className="w-3 h-3" /> },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertTriangle className="w-3 h-3" /> },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function PrivacyRequests() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'approve' | 'reject' | 'delete' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    request_type: 'access',
    subject_identifier: '',
    notes: '',
  });

  const fetcher = useCallback(
    () => privacyApi.requests({ type: typeFilter === 'all' ? undefined : typeFilter, status: statusFilter === 'all' ? undefined : statusFilter }),
    [typeFilter, statusFilter]
  );

  const { data: requestsData, refetch: refetchRequests } = useApi(fetcher);

  const requests = useMemo<ApiDataSubjectRequest[]>(() =>
    (requestsData?.data ?? []).map((r) => ({
      id: r.id,
      request_type: r.request_type,
      subject_identifier: r.subject_identifier,
      status: r.status,
      requested_at: r.requested_at,
      completed_at: r.completed_at,
      notes: r.notes,
    })),
    [requestsData]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return requests.filter(r =>
      r.subject_identifier.toLowerCase().includes(q) ||
      r.request_type.toLowerCase().includes(q) ||
      r.id.toString().includes(q)
    );
  }, [requests, debouncedSearch]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'approve') {
        await privacyApi.approveRequest(id);
        success('Request approved.');
      } else if (action === 'reject') {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        await privacyApi.rejectRequest(id, { rejection_reason: reason });
        success('Request rejected.');
      } else if (action === 'delete') {
        await privacyApi.deleteRequest(id);
        success('Request deleted.');
      }
      refetchRequests();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await privacyApi.createRequest(form);
      success('Request created.');
      setShowCreateModal(false);
      setForm({ request_type: 'access', subject_identifier: '', notes: '' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create request');
    }
  };

  const getTypeInfo = (type: string) => REQUEST_TYPES.find(t => t.value === type) || { label: type, icon: <FileText className="w-3 h-3" /> };

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'pending': return ['approve', 'reject'];
      case 'in_progress': return ['approve', 'reject'];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Subject Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage DPA data subject requests (Access, Rectification, Erasure, Portability, Restriction, Objection)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <User className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject ID, request type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Types</option>
            {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No data subject requests found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requested</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((r) => {
                    const status = STATUS_BADGES[r.status] ?? { label: r.status, cls: '', icon: null };
                    const typeInfo = getTypeInfo(r.request_type);
                    const actions = getAvailableActions(r.status);
                    
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-3 text-sm font-mono text-slate-900 dark:text-white">#{r.id}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            {typeInfo.icon}
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-900 dark:text-white">{r.subject_identifier}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{formatDate(r.requested_at)}</td>
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{r.completed_at ? formatDate(r.completed_at) : '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {actions.map(action => (
                              <button
                                key={action}
                                onClick={() => setConfirmAction({ id: r.id, action })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                  {action === 'approve' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                   action === 'reject' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                   'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
                              >
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(filtered.length / pageSize)}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setForm({ request_type: 'access', subject_identifier: '', notes: '' }); }} title="New Data Subject Request">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Request Type" required>
            <select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" required>
              {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} - {t.description}</option>)}
            </select>
          </FormField>
          <FormField label="Subject Identifier (Email/User ID)" required>
            <input
              type="text"
              value={form.subject_identifier}
              onChange={(e) => setForm({ ...form, subject_identifier: e.target.value })}
              className={inputCls}
              placeholder="Enter email or user ID"
              required
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              rows={3}
              placeholder="Additional context..."
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => { setShowCreateModal(false); setForm({ request_type: 'access', subject_identifier: '', notes: '' }); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg">
              Create Request
            </button>
          </div>
        </form>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) handleAction(confirmAction.id, confirmAction.action); setConfirmAction(null); }}
        title={confirmAction?.action === 'approve' ? 'Approve Request' : confirmAction?.action === 'reject' ? 'Reject Request' : 'Delete Request'}
        message={confirmAction?.action === 'approve' ? 'Approve this data subject request?' : confirmAction?.action === 'reject' ? 'Reject this request? You will be prompted for a reason.' : 'Delete this request? This cannot be undone.'}
      />
    </div>
  );
}