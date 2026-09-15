import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, Calendar, AlertTriangle, ShieldCheck, Eye, Edit, Trash2, Clock,
  Download, AlertCircle, Bell, WifiOff, Shield, X, RotateCcw, CheckCircle, Flag,
  Trash, ShieldAlert, BellRing, User, Database, Lock, Unlock
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog, Modal, FormField, inputCls } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import { privacy as privacyApi, type ApiDataBreachIncident, type ApiBreachStatistics } from '../../services/api';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';

const STATUS_BADGES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  open: { label: 'Open', cls: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertTriangle className="w-3 h-3" /> },
  investigating: { label: 'Investigating', cls: 'bg-blue-50 text-blue-700 border border-blue-100', icon: <ShieldCheck className="w-3 h-3" /> },
  contained: { label: 'Contained', cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <ShieldCheck className="w-3 h-3" /> },
  resolved: { label: 'Resolved', cls: 'bg-green-50 text-green-700 border border-green-100', icon: <CheckCircle className="w-3 h-3" /> },
};

const RISK_BADGES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  low: { label: 'Low', cls: 'bg-green-50 text-green-700 border border-green-100', icon: <Shield className="w-3 h-3" /> },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <AlertTriangle className="w-3 h-3" /> },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700 border border-orange-100', icon: <AlertTriangle className="w-3 h-3" /> },
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 border border-red-100', icon: <ShieldAlert className="w-3 h-3" /> },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function BreachIncidents() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'escalate' | 'notify_npc' | 'notify_subjects' | 'contain' | 'resolve' | 'delete' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    description: '',
    personal_data_affected: '',
    risk_assessment: 'medium',
    npc_notification_required: false,
  });

  const fetcher = useCallback(
    () => privacyApi.breaches({ status: statusFilter === 'all' ? undefined : statusFilter, risk: riskFilter === 'all' ? undefined : riskFilter }),
    [statusFilter, riskFilter]
  );

  const { data: breachesData, refetch: refetchBreaches } = useApi(fetcher);
  const { data: statsData } = useApi(useCallback(() => privacyApi.breachStatistics(), []));

  const breaches = useMemo<ApiDataBreachIncident[]>(() =>
    (breachesData?.data ?? []).map((b) => ({
      id: b.id,
      description: b.description,
      personal_data_affected: b.personal_data_affected,
      risk_assessment: b.risk_assessment,
      status: b.status,
      detected_at: b.detected_at,
      npc_notified_at: b.npc_notified_at,
      subjects_notified_at: b.subjects_notified_at,
      resolved_at: b.resolved_at,
      business_id: b.business_id,
    })),
    [breachesData]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return breaches.filter(b =>
      b.description.toLowerCase().includes(q) ||
      b.personal_data_affected.toLowerCase().includes(q)
    );
  }, [breaches, debouncedSearch]);

  const handleAction = async (id: number, action: 'escalate' | 'notify_npc' | 'notify_subjects' | 'contain' | 'resolve' | 'delete') => {
    try {
      if (action === 'escalate') {
        await privacyApi.escalateBreach(id);
        success('Breach escalated to DPO.');
      } else if (action === 'notify_npc') {
        await privacyApi.notifyNPC(id);
        success('NPC notified.');
      } else if (action === 'notify_subjects') {
        await privacyApi.notifySubjects(id);
        success('Affected subjects notified.');
      } else if (action === 'contain') {
        const actions = prompt('Enter containment actions (one per line):');
        if (!actions) return;
        await privacyApi.containBreach(id, actions.split('\n').filter(Boolean));
        success('Breach contained.');
      } else if (action === 'resolve') {
        const notes = prompt('Enter resolution notes:');
        if (!notes) return;
        await privacyApi.resolveBreach(id, { notes });
        success('Breach resolved.');
      } else if (action === 'delete') {
        // Not implemented in API yet
        showError('Delete not implemented yet');
        return;
      }
      refetchBreaches();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const getAvailableActions = (status: string, risk: string) => {
    switch (status) {
      case 'open': return ['escalate'];
      case 'investigating': return ['notify_npc', 'notify_subjects', 'contain'];
      case 'contained': return ['resolve'];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Breach Incident Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track data breach incidents through detection, assessment, notification, and resolution
          </p>
        </div>
        <button
          onClick={() => { setForm({ description: '', personal_data_affected: '', risk_assessment: 'medium', npc_notification_required: false }); setShowCreateModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <AlertTriangle className="w-4 h-4" />
          Report New Breach
        </button>
      </div>

      {/* Summary Cards */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Incidents</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{statsData.total}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Open / Investigating</div>
            <div className="text-2xl font-bold text-red-600">
              {(statsData.by_status?.open ?? 0) + (statsData.by_status?.investigating ?? 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Contained / Resolved</div>
            <div className="text-2xl font-bold text-green-600">
              {(statsData.by_status?.contained ?? 0) + (statsData.by_status?.resolved ?? 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">NPC Notified</div>
            <div className="text-2xl font-bold text-blue-600">{statsData.npc_notified}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">Subjects Notified</div>
            <div className="text-2xl font-bold text-purple-600">{statsData.subjects_notified}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search description, affected data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
            <option value="all">All Risk Levels</option>
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
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No breach incidents found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Affected</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">NPC Notified</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subjects Notified</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((b) => {
                    const status = STATUS_BADGES[b.status] ?? { label: b.status, cls: '', icon: null };
                    const risk = RISK_BADGES[b.risk_assessment] ?? { label: b.risk_assessment, cls: '', icon: null };
                    const actions = getAvailableActions(b.status, b.risk_assessment);
                    
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{formatShortDate(b.detected_at)}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900 dark:text-white line-clamp-1 max-w-xs">{b.description}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{b.personal_data_affected}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{b.personal_data_affected}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${risk.cls}`}>
                            {risk.icon}
                            {risk.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {b.npc_notified_at ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {formatShortDate(b.npc_notified_at)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <X className="w-3.5 h-3.5" />
                              Not notified
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {b.subjects_notified_at ? (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <User className="w-3.5 h-3.5" />
                              {formatShortDate(b.subjects_notified_at)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Bell className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getAvailableActions(b.status, b.risk_assessment).map(action => (
                              <button
                                key={action}
                                onClick={() => setConfirmAction({ id: b.id, action })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                  {action === 'escalate' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                   action === 'notify_npc' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                   action === 'notify_subjects' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                   action === 'contain' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                   'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}"
                              >
                                {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
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

      <Toast toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) handleAction(confirmAction.id, confirmAction.action); setConfirmAction(null); }}
        title={confirmAction?.action?.charAt(0).toUpperCase() + confirmAction?.action?.slice(1).replace('_', ' ')}
        message={confirmAction?.action === 'escalate' ? 'Escalate this breach to DPO?' :
                 confirmAction?.action === 'notify_npc' ? 'Notify National Privacy Commission?' :
                 confirmAction?.action === 'notify_subjects' ? 'Notify affected data subjects?' :
                 confirmAction?.action === 'contain' ? 'Mark breach as contained? You will enter containment actions.' :
                 confirmAction?.action === 'resolve' ? 'Resolve this breach? You will enter resolution notes.' :
                 'Delete this incident?'}
      />
    </div>
  );
}