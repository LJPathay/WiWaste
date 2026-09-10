import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { auditLogs as auditLogsApi } from '../../services/api';

interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  entity_type: string;
  entity_id: string | number;
}

interface AuditLogResponse {
  data?: AuditLogEntry[];
  last_page?: number;
}

const columns: DataTableColumn<AuditLogEntry>[] = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    pinned: true,
    minWidth: '150px',
    render: (row) => (
      <span className="font-mono text-slate-500 dark:text-slate-400">{row.timestamp}</span>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    truncate: true,
    minWidth: '200px',
    render: (row) => (
      <span className="font-medium text-slate-900 dark:text-slate-100">{row.action}</span>
    ),
  },
  {
    key: 'user',
    header: 'User',
    truncate: true,
    minWidth: '120px',
    render: (row) => (
      <span className="text-slate-600 dark:text-slate-400">{row.user} <span className="text-slate-400">({row.role})</span></span>
    ),
  },
  {
    key: 'entity',
    header: 'Entity',
    minWidth: '100px',
    render: (row) => (
      <span className="text-slate-600 dark:text-slate-400">{row.entity_type}#{row.entity_id}</span>
    ),
  },
];

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    auditLogsApi.list({
      search: search || undefined,
      action: actionFilter || undefined,
      entity_type: entityTypeFilter || undefined,
      page,
    }).then((res: AuditLogResponse) => {
      const data = res.data ?? res;
      setLogs(Array.isArray(data) ? data : []);
      setTotalPages(res.last_page ?? 1);
    }).catch(() => setLogs([]))
    .finally(() => setLoading(false));
  }, [search, actionFilter, entityTypeFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const uniqueEntityTypes = [...new Set(logs.map(l => l.entity_type))].filter(Boolean);
  const uniqueActions = [...new Set(logs.map(l => l.action))].filter(Boolean);

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h1>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-xs">
              Track all system activities and user actions
            </TooltipContent>
          </UITooltip>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <Download className="h-4 w-4" />
          Export Logs
        </button>
      </div>

      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={entityTypeFilter}
            onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
          >
            <option value="">All Entity Types</option>
            {uniqueEntityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No logs found matching your filters."
        pagination={
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label="logs"
          />
        }
      />
    </div>
  );
}
