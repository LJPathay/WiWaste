import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, Calendar, ClipboardCheck, Plus, X, Check, AlertCircle,
  Download, Eye, RotateCcw, Trash2, Edit, Camera, ShieldCheck, Clock
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { sanitation as sanitationApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';

interface SanitationChecklistRow {
  checklist_id: number;
  checklist_date: string;
  frequency: string;
  area: string;
  overall_status: string;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  checks: Array<{
    item: string;
    passed: boolean;
    notes?: string;
    photo_url?: string;
  }>;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const AREA_LABELS: Record<string, string> = {
  receiving: 'Receiving',
  storage: 'Storage',
  preparation: 'Preparation',
  dispensing: 'Dispensing',
  waste: 'Waste',
  general: 'General',
};

const STATUS_BADGES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pass: { label: 'Pass', cls: 'bg-green-50 text-green-700 border border-green-100', icon: <Check className="w-3 h-3" /> },
  fail: { label: 'Fail', cls: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertCircle className="w-3 h-3" /> },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <Clock className="w-3 h-3" /> },
};

export function SanitationChecklist() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'verify' | 'delete' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    checklist_date: new Date().toISOString().slice(0, 10),
    frequency: 'daily',
    area: 'general',
    checks: [{ item: '', passed: false, notes: '', photo_url: '' }],
    notes: '',
  });

  const fetcher = useCallback(
    () => sanitationApi.list({
      frequency: frequencyFilter === 'all' ? undefined : frequencyFilter,
      area: areaFilter === 'all' ? undefined : areaFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      date: dateFilter || undefined,
    }),
    [frequencyFilter, areaFilter, statusFilter, dateFilter]
  );

  const { data: checklistData, refetch: refetchChecklists } = useApi(fetcher);
  const { data: summaryData } = useApi(useCallback(() => sanitationApi.summary({ date: dateFilter || undefined }), [dateFilter]));

  const checklists = useMemo<SanitationChecklistRow[]>(() =>
    (checklistData?.data ?? []).map((c) => ({
      checklist_id: c.checklist_id,
      checklist_date: c.checklist_date?.slice(0, 10) ?? '—',
      frequency: c.frequency,
      area: c.area,
      overall_status: c.overall_status,
      verified_by: c.verified_by ? 'Verified' : 'Not Verified',
      verified_at: c.verified_at?.slice(0, 16) ?? null,
      created_by: c.created_by ? 'User' : 'System',
      created_at: c.created_at?.slice(0, 16) ?? '—',
      checks: c.checks ?? [],
    })),
    [checklistData]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return checklists.filter(c =>
      c.area.toLowerCase().includes(q) ||
      c.frequency.toLowerCase().includes(q) ||
      c.created_by.toLowerCase().includes(q)
    );
  }, [checklists, debouncedSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.checks.some(c => !c.item.trim())) {
        showError('All check items must have a description');
        return;
      }

      await sanitationApi.create({
        checklist_date: form.checklist_date,
        frequency: form.frequency,
        area: form.area,
        checks: form.checks.map(c => ({
          item: c.item,
          passed: c.passed,
          notes: c.notes,
          photo_url: c.photo_url,
        })),
        notes: form.notes,
      });
      
      success('Sanitation checklist created.');
      setShowCreateModal(false);
      setForm({
        checklist_date: new Date().toISOString().slice(0, 10),
        frequency: 'daily',
        area: 'general',
        checks: [{ item: '', passed: false, notes: '', photo_url: '' }],
        notes: '',
      });
      refetchChecklists();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create checklist');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.checks.some(c => !c.item.trim())) {
        showError('All check items must have a description');
        return;
      }

      await sanitationApi.update(editingId!, {
        checklist_date: form.checklist_date,
        frequency: form.frequency,
        area: form.area,
        checks: form.checks.map(c => ({
          item: c.item,
          passed: c.passed,
          notes: c.notes,
          photo_url: c.photo_url,
        })),
        notes: form.notes,
      });
      
      success('Checklist updated.');
      setEditingId(null);
      setForm({
        checklist_date: new Date().toISOString().slice(0, 10),
        frequency: 'daily',
        area: 'general',
        checks: [{ item: '', passed: false, notes: '', photo_url: '' }],
        notes: '',
      });
      refetchChecklists();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update checklist');
    }
  };

  const handleVerify = async (id: number) => {
    try {
      await sanitationApi.verify(id);
      success('Checklist verified.');
      refetchChecklists();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await sanitationApi.update(id, { checks: [] }); // Using update to mark as deleted via empty checks
      success('Checklist removed.');
      refetchChecklists();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const startEdit = (checklist: SanitationChecklistRow) => {
    setEditingId(checklist.checklist_id);
    setForm({
      checklist_date: checklist.checklist_date,
      frequency: checklist.frequency,
      area: checklist.area,
      checks: checklist.checks.map(c => ({
        item: c.item,
        passed: c.passed,
        notes: c.notes ?? '',
        photo_url: c.photo_url ?? '',
      })),
      notes: '',
    });
    setShowCreateModal(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({
      checklist_date: new Date().toISOString().slice(0, 10),
      frequency: 'daily',
      area: 'general',
      checks: [{ item: '', passed: false, notes: '', photo_url: '' }],
      notes: '',
    });
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sanitation Checklist</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Digital sanitation checklists with photo evidence and sign-off
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          New Checklist
        </button>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summaryData.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Passed</div>
            <div className="text-2xl font-bold text-green-600">{summaryData.passed}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Failed</div>
            <div className="text-2xl font-bold text-red-600">{summaryData.failed}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Verified</div>
            <div className="text-2xl font-bold text-blue-600">{summaryData.verified}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Pending</div>
            <div className="text-2xl font-bold text-amber-600">{summaryData.pending}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search area, frequency, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Areas</option>
            <option value="receiving">Receiving</option>
            <option value="storage">Storage</option>
            <option value="preparation">Preparation</option>
            <option value="dispensing">Dispensing</option>
            <option value="waste">Waste</option>
            <option value="general">General</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="pending">Pending</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={inputCls}
            title="Filter by date"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No checklists found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Area</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Checks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verified</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((c) => {
                    const status = STATUS_BADGES[c.overall_status] ?? { label: c.overall_status, cls: '', icon: null };
                    const passedCount = c.checks.filter(ch => ch.passed).length;
                    const totalChecks = c.checks.length;
                    
                    return (
                      <tr key={c.checklist_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{c.checklist_date}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            {FREQUENCY_LABELS[c.frequency] ?? c.frequency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            {AREA_LABELS[c.area] ?? c.area}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {passedCount} / {totalChecks} passed
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {c.verified_at ? (
                            <>
                              <div>{c.verified_at}</div>
                              <div className="text-xs text-slate-400">by {c.verified_by}</div>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Not verified</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {c.created_at}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleVerify(c.checklist_id)}
                              disabled={c.overall_status === 'verified' || c.verified_at}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                {c.verified_at ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify
                            </button>
                            <button
                              onClick={() => setEditingId(c.checklist_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmAction({ id: c.checklist_id, action: 'delete' })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreateModal || !!editingId} onClose={() => { setShowCreateModal(false); setEditingId(null); setForm({ checklist_date: new Date().toISOString().slice(0, 10), frequency: 'daily', area: 'general', checks: [{ item: '', passed: false, notes: '', photo_url: '' }], notes: '' }); }} title={editingId ? 'Edit Checklist' : 'New Sanitation Checklist'}>
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input type="date" value={form.checklist_date} onChange={(e) => setForm({ ...form, checklist_date: e.target.value })} className={inputCls} required />
            </FormField>
            <FormField label="Frequency" required>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </FormField>
            <FormField label="Area" required>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" required>
                <option value="receiving">Receiving</option>
                <option value="storage">Storage</option>
                <option value="preparation">Preparation</option>
                <option value="dispensing">Dispensing</option>
                <option value="waste">Waste</option>
                <option value="general">General</option>
              </select>
            </FormField>
          </div>
          
          <FormField label="Checklist Items" required>
            <div className="space-y-2">
              {form.checks.map((check, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Check item description"
                      value={check.item}
                      onChange={(e) => {
                        const newChecks = [...form.checks];
                        newChecks[idx] = { ...check, item: e.target.value };
                        setForm({ ...form, checks: newChecks });
                      }}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={check.passed}
                        onChange={(e) => {
                          const newChecks = [...form.checks];
                          newChecks[idx] = { ...check, passed: e.target.checked };
                          setForm({ ...form, checks: newChecks });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Passed</span>
                    </label>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={check.notes ?? ''}
                      onChange={(e) => {
                        const newChecks = [...form.checks];
                        newChecks[idx] = { ...check, notes: e.target.value };
                        setForm({ ...form, checks: newChecks });
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (form.checks.length > 1) {
                          setForm({ ...form, checks: form.checks.filter((_, i) => i !== idx) });
                        }
                      }}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, checks: [...form.checks, { item: '', passed: false, notes: '', photo_url: '' }] })}
                className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Check Item
              </button>
            </div>
          </FormField>
          
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              rows={2}
              placeholder="Additional notes..."
            />
          </FormField>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => { setShowCreateModal(false); setEditingId(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg">
              {editingId ? 'Update' : 'Create'} Checklist
            </button>
          </div>
        </form>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            if (confirmAction.action === 'verify') handleVerify(confirmAction.id);
            else if (confirmAction.action === 'delete') handleDelete(confirmAction.id);
          }
          setConfirmAction(null);
        }}
        title={confirmAction?.action === 'verify' ? 'Verify Checklist' : 'Delete Checklist'}
        message={confirmAction?.action === 'verify' ? 'Mark this checklist as verified?' : 'Delete this checklist? This cannot be undone.'}
      />
    </div>
  );
}