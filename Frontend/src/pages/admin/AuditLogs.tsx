import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Info, Loader2 } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { auditLogs as auditLogsApi } from '../../services/api';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
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
    }).then((res: any) => {
      const data = res.data ?? res;
      setLogs(Array.isArray(data) ? data : []);
      setTotalPages(res.last_page ?? 1);
    }).catch(() => setLogs([]))
    .finally(() => setLoading(false));
  }, [search, actionFilter, entityTypeFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const uniqueEntityTypes = [...new Set(logs.map((l: any) => l.entity_type))].filter(Boolean);
  const uniqueActions = [...new Set(logs.map((l: any) => l.action))].filter(Boolean);

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

      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10">
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

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-55/20 dark:hover:bg-white/5">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{log.timestamp}</td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{log.action}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{log.user} <span className="text-slate-400">({log.role})</span></td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{log.entity_type}#{log.entity_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No logs found matching your filters.</p>
              </div>
            )}
          </>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
