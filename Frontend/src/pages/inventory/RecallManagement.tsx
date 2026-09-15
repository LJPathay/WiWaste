import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, AlertTriangle, RotateCcw, ShieldCheck, Bell, X, Plus,
  Package, Truck, Calendar, Eye, Flag, Archive, Download, FileText
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { recall as recallApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import type { ApiRecall, ApiRecallSummary } from '../../services/api';

interface RecallRow {
  id: number;
  recall_number: string;
  product_name: string;
  batch_number: string | null;
  status: string;
  severity: string;
  initiated_date: string;
  total_quantity_affected: number;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border border-slate-200' },
  active: { label: 'Active', cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  quarantined: { label: 'Quarantined', cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  notified: { label: 'Notified', cls: 'bg-purple-50 text-purple-700 border border-purple-100' },
  resolved: { label: 'Resolved', cls: 'bg-green-50 text-green-700 border border-green-100' },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

const SEVERITY_BADGES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertTriangle className="w-3 h-3" /> },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700 border border-orange-100', icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <AlertTriangle className="w-3 h-3" /> },
  low: { label: 'Low', cls: 'bg-green-50 text-green-700 border border-green-100', icon: <ShieldCheck className="w-3 h-3" /> },
};

export function RecallManagement() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmRecall, setConfirmRecall] = useState<{ id: number; action: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    product_id: '',
    batch_id: '',
    supplier_id: '',
    reason: '',
    severity: 'medium',
    affected_batches: [{ batch_id: '', quantity: 1 }],
    target_resolution_date: '',
  });

  const fetcher = useCallback(
    () => recallApi.list({ status: statusFilter === 'all' ? undefined : statusFilter, severity: severityFilter === 'all' ? undefined : severityFilter }),
    [statusFilter, severityFilter]
  );

  const { data: recallsData, refetch: refetchRecalls } = useApi(fetcher);
  const { data: summaryData } = useApi(useCallback(() => recallApi.summary(), []));

  const recalls = useMemo<RecallRow[]>(() =>
    (recallsData?.data ?? []).map((r) => ({
      id: r.recall_id,
      recall_number: r.recall_number,
      product_name: r.product?.product_name ?? 'Unknown',
      batch_number: r.batch?.batch_number ?? null,
      status: r.status,
      severity: r.severity,
      initiated_date: r.initiated_date?.slice(0, 10) ?? '—',
      total_quantity_affected: r.total_quantity_affected,
    })),
    [recallsData]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return recalls.filter(r =>
      r.recall_number.toLowerCase().includes(q) ||
      r.product_name.toLowerCase().includes(q) ||
      r.batch_number?.toLowerCase().includes(q)
    );
  }, [recalls, debouncedSearch]);

  const handleAction = async (id: number, action: string) => {
    try {
      if (action === 'activate') await recallApi.activate(id);
      else if (action === 'quarantine') await recallApi.quarantine(id);
      else if (action === 'notify') await recallApi.notify(id);
      else if (action === 'resolve') {
        const notes = prompt('Enter resolution notes:');
        if (notes) await recallApi.resolve(id, { resolution_notes: notes, release_quarantine: true });
      }
      success(`Recall ${action}d successfully.`);
      refetchRecalls();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batches = createForm.affected_batches
        .filter(b => b.batch_id && b.quantity > 0)
        .map(b => ({ batch_id: Number(b.batch_id), quantity: Number(b.quantity) }));
      
      if (batches.length === 0) {
        showError('At least one affected batch is required');
        return;
      }

      await recallApi.create({
        product_id: Number(createForm.product_id),
        batch_id: createForm.batch_id ? Number(createForm.batch_id) : undefined,
        supplier_id: createForm.supplier_id ? Number(createForm.supplier_id) : undefined,
        reason: createForm.reason,
        severity: createForm.severity,
        affected_batches: batches,
        target_resolution_date: createForm.target_resolution_date || undefined,
      });
      
      success('Recall created successfully.');
      setShowCreateModal(false);
      setCreateForm({
        product_id: '',
        batch_id: '',
        supplier_id: '',
        reason: '',
        severity: 'medium',
        affected_batches: [{ batch_id: '', quantity: 1 }],
        target_resolution_date: '',
      });
      refetchRecalls();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create recall');
    }
  };

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'draft': return ['activate'];
      case 'active': return ['quarantine', 'notify'];
      case 'quarantined': return ['notify', 'resolve'];
      case 'notified': return ['resolve'];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recall Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage product recalls, quarantine batches, and track resolution
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Create Recall
        </button>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Recalls</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Active / Quarantined</div>
            <div className="text-2xl font-bold text-amber-600">
              {(summaryData.by_status?.active ?? 0) + (summaryData.by_status?.quarantined ?? 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Critical / High</div>
            <div className="text-2xl font-bold text-red-600">
              {(summaryData.by_severity?.critical ?? 0) + (summaryData.by_severity?.high ?? 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Qty Affected</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total_quantity_affected?.toLocaleString() ?? '0'}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search recall #, product, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="quarantined">Quarantined</option>
            <option value="notified">Notified</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No recalls found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recall #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product / Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Initiated</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Qty Affected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((r) => {
                    const status = STATUS_BADGES[r.status] ?? { label: r.status, cls: '' };
                    const severity = SEVERITY_BADGES[r.severity] ?? { label: r.severity, cls: '', icon: null };
                    const actions = getAvailableActions(r.status);
                    
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-brand-600 dark:text-brand-400">{r.recall_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{r.product_name}</div>
                          {r.batch_number && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">Batch: {r.batch_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${severity.cls}`}>
                            {severity.icon}
                            {severity.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{r.initiated_date}</td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">{r.total_quantity_affected.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {actions.map(action => (
                              <button
                                key={action}
                                onClick={() => handleAction(r.id, action)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                  {action === 'activate' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                   action === 'quarantine' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                   action === 'notify' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                   'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}"
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

      {/* Create Recall Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Recall">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Product ID" required>
              <input
                type="number"
                value={createForm.product_id}
                onChange={(e) => setCreateForm({ ...createForm, product_id: e.target.value })}
                className={inputCls}
                placeholder="Enter product ID"
              />
            </FormField>
            <FormField label="Batch ID (optional)">
              <input
                type="number"
                value={createForm.batch_id}
                onChange={(e) => setCreateForm({ ...createForm, batch_id: e.target.value })}
                className={inputCls}
                placeholder="Enter batch ID"
              />
            </FormField>
            <FormField label="Supplier ID (optional)">
              <input
                type="number"
                value={createForm.supplier_id}
                onChange={(e) => setCreateForm({ ...createForm, supplier_id: e.target.value })}
                className={inputCls}
                placeholder="Enter supplier ID"
              />
            </FormField>
            <FormField label="Severity" required>
              <select value={createForm.severity} onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })} className={selectCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
          </div>
          <FormField label="Reason" required>
            <textarea
              value={createForm.reason}
              onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
              className={`${inputCls} min-h-[80px] resize-y`}
              placeholder="Describe the reason for recall..."
              required
            />
          </FormField>
          <FormField label="Target Resolution Date">
            <input
              type="date"
              value={createForm.target_resolution_date}
              onChange={(e) => setCreateForm({ ...createForm, target_resolution_date: e.target.value })}
              className={inputCls}
            />
          </FormField>
          <FormField label="Affected Batches" required>
            <div className="space-y-2">
              {createForm.affected_batches.map((batch, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Batch ID"
                    value={batch.batch_id}
                    onChange={(e) => {
                      const newBatches = [...createForm.affected_batches];
                      newBatches[idx] = { ...batch, batch_id: e.target.value };
                      setCreateForm({ ...createForm, affected_batches: newBatches });
                    }}
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={batch.quantity}
                    onChange={(e) => {
                      const newBatches = [...createForm.affected_batches];
                      newBatches[idx] = { ...batch, quantity: Number(e.target.value) };
                      setCreateForm({ ...createForm, affected_batches: newBatches });
                    }}
                    className={`${inputCls} w-24`}
                    min="1"
                  />
                  {createForm.affected_batches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, affected_batches: createForm.affected_batches.filter((_, i) => i !== idx) })}
                      className="px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCreateForm({ ...createForm, affected_batches: [...createForm.affected_batches, { batch_id: '', quantity: 1 }] })}
                className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Batch
              </button>
            </div>
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg">
              Create Recall
            </button>
          </div>
        </form>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        isOpen={!!confirmRecall}
        onClose={() => setConfirmRecall(null)}
        onConfirm={() => {
          if (confirmRecall) handleAction(confirmRecall.id, confirmRecall.action);
          setConfirmRecall(null);
        }}
        title={`Confirm ${confirmRecall?.action}`}
        message={`Are you sure you want to ${confirmRecall?.action} this recall?`}
      />
    </div>
  );
}