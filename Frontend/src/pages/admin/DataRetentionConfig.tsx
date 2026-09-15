import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Search, Filter, Calendar, Database, Clock, Shield, Trash2, Save, RotateCcw,
  AlertTriangle, CheckCircle, X, Edit, Eye, Download, Settings, History, HardDrive, Plus
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { privacy as privacyApi, type ApiRetentionPolicy, type ApiRetentionSummary } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';

const ENTITY_TYPES = [
  { value: 'audit_logs', label: 'Audit Logs', icon: <History className="w-4 h-4" />, description: 'System audit trail records' },
  { value: 'wastage', label: 'Wastage Records', icon: <Trash2 className="w-4 h-4" />, description: 'Product wastage records' },
  { value: 'returns', label: 'Return Transactions', icon: <RotateCcw className="w-4 h-4" />, description: 'Customer return records' },
  { value: 'sales', label: 'Sales Transactions', icon: <Database className="w-4 h-4" />, description: 'Point of sale transactions' },
  { value: 'movements', label: 'Stock Movements', icon: <RotateCcw className="w-4 h-4" />, description: 'Inventory stock movements' },
  { value: 'breach_incidents', label: 'Breach Incidents', icon: <AlertTriangle className="w-4 h-4" />, description: 'Data breach incident records' },
  { value: 'subject_requests', label: 'Subject Requests', icon: <Database className="w-4 h-4" />, description: 'Data subject access requests' },
] as const;

const DEFAULT_RETENTION_DAYS = 2555; // 7 years

function formatDate(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid';
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('en-PH').format(num);
}

export function DataRetentionConfig() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [policies, setPolicies] = useState<ApiRetentionPolicy[]>([]);
  const [summary, setSummary] = useState<ApiRetentionSummary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    entity_type: 'audit_logs',
    retention_days: DEFAULT_RETENTION_DAYS,
    description: '',
    enabled: true,
  });

  const fetcher = useCallback(
    () => privacyApi.retentionPolicies(),
    []
  );

  const { data: policiesData, refetch: refetchPolicies } = useApi(fetcher);

  const policiesList = useMemo<ApiRetentionPolicy[]>(() =>
    (policiesData?.data ?? []).map((p) => ({
      entity_type: p.entity_type,
      retention_days: p.retention_days,
      description: p.description,
      enabled: p.enabled,
      last_purged: p.last_purged,
      records_purged: p.records_purged,
    })),
    [policiesData]
  );

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await privacyApi.retentionPolicies();
      setPolicies(res.data);
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const entityInfo = useMemo(() => {
    return ENTITY_TYPES.reduce((acc, e) => {
      acc[e.value] = e;
      return acc;
    }, {} as Record<string, typeof ENTITY_TYPES[0]>);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await privacyApi.updateRetentionPolicy(editingId, form);
        success('Retention policy updated.');
      } else {
        await privacyApi.createRetentionPolicy(form);
        success('Retention policy created.');
      }
      setShowCreateModal(false);
      setForm({ entity_type: 'audit_logs', retention_days: DEFAULT_RETENTION_DAYS, description: '', enabled: true });
      setEditingId(null);
      loadPolicies();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save policy');
    }
  };

  const handlePurge = async (entityType: string) => {
    const entity = ENTITY_TYPES.find(e => e.value === entityType);
    if (!entity) return;

    const confirm = window.confirm(
      `This will permanently delete all ${entity.label} records older than the retention period. This action cannot be undone. Continue?`
    );
    if (!confirm) return;

    try {
      await privacyApi.purgeNow(entityType);
      success('Manual purge completed.');
      loadPolicies();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Purge failed');
    }
  };

  const handleTestPurge = async (entityType: string) => {
    const entity = ENTITY_TYPES.find(e => e.value === entityType);
    if (!entity) return;

    try {
      await privacyApi.testPurge(entityType);
      success('Dry run completed. Check logs for details.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Test purge failed');
    }
  };

  const startEdit = (policy: ApiRetentionPolicy) => {
    setEditingId(policy.entity_type);
    setForm({
      entity_type: policy.entity_type,
      retention_days: policy.retention_days,
      description: policy.description,
      enabled: policy.enabled,
    });
    setShowCreateModal(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({
      entity_type: 'audit_logs',
      retention_days: DEFAULT_RETENTION_DAYS,
      description: '',
      enabled: true,
    });
    setShowCreateModal(true);
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid';
    return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  function formatNumber(num: number) {
    return new Intl.NumberFormat('en-PH').format(num);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Retention Configuration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure retention periods and purge schedules for data compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPolicies}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Policies</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total_policies}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Active Policies</div>
            <div className="text-2xl font-bold text-green-600">{summary.active_policies}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Records Purged</div>
            <div className="text-2xl font-bold text-amber-600">{formatNumber(summary.total_records_purged)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Next Scheduled Purge</div>
            <div className="text-2xl font-bold text-blue-600">{summary.next_scheduled_purge ? new Date(summary.next_scheduled_purge).toLocaleDateString('en-PH') : 'Not scheduled'}</div>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {policies.length === 0 ? (
          <div className="p-12 text-center">
            <HardDrive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No retention policies configured</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create policies to automatically purge old data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entity</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Retention</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Purged</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Records Purged</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {policies.map((p) => {
                    const entity = ENTITY_TYPES.find(e => e.value === p.entity_type);
                    const entityLabel = entity?.label ?? p.entity_type;
                    const entityIcon = entity?.icon ?? <Database className="w-4 h-4" />;
                    
                    return (
                      <tr key={p.entity_type} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                              {entity?.icon ?? <Database className="w-4 h-4" />}
                            </span>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{entityLabel}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.entity_type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 dark:text-white">
                              {p.retention_days} days
                            </span>
                            {p.retention_days >= 2555 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                7+ years
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.enabled ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                            {p.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {p.last_purged ? new Date(p.last_purged).toLocaleDateString('en-PH') : 'Never'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white">
                          {formatNumber(p.records_purged ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => privacyApi.testPurge(p.entity_type)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                              title="Test purge (dry run)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Test
                            </button>
                            <button
                              onClick={() => handlePurge(p.entity_type)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                              title="Run purge now"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Purge
                            </button>
                            <button
                              onClick={() => { setEditingId(p.entity_type); setForm({ entity_type: p.entity_type, retention_days: p.retention_days, description: '', enabled: p.enabled }); setShowCreateModal(true); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreateModal || !!editingId} onClose={() => { setShowCreateModal(false); setEditingId(null); setForm({ entity_type: 'audit_logs', retention_days: DEFAULT_RETENTION_DAYS, description: '', enabled: true }); }} title={editingId ? 'Edit Retention Policy' : 'New Retention Policy'}>
        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <FormField label="Entity Type" required>
            <select
              value={form.entity_type}
              onChange={(e) => setForm({ ...form, entity_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              required
              disabled={editingId}
            >
              {ENTITY_TYPES.map(e => (
                <option key={e.value} value={e.value}>
                  {e.label} - {e.description}
                </option>
              ))}
            </select>
          </FormField>
          
          <FormField label="Retention Period (Days)" required>
            <input
              type="number"
              min="1"
              max="10000"
              value={form.retention_days}
              onChange={(e) => setForm({ ...form, retention_days: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Minimum 1 day. 2555 days = 7 years (recommended for compliance)
            </p>
          </FormField>
          
          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              rows={3}
              placeholder="Describe the business/legal basis for this retention period..."
            />
          </FormField>
          
          <FormField label="Status">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Enabled (active for automatic purging)</span>
            </label>
          </FormField>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => { setShowCreateModal(false); setEditingId(null); setForm({ entity_type: 'audit_logs', retention_days: DEFAULT_RETENTION_DAYS, description: '', enabled: true }); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg">
              {editingId ? 'Update Policy' : 'Create Policy'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}