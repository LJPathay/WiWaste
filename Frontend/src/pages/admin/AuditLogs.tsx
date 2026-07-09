import { useState } from 'react';
import { Search, Download, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: '1',
    action: 'Created product "Lucky Me! Pancit Canton"',
    user: 'John Doe',
    role: 'Manager',
    timestamp: '2026-07-09 14:30:25',
    status: 'success',
  },
  {
    id: '2',
    action: 'Stock-in recorded for SKU: LM-PC-80',
    user: 'Jane Smith',
    role: 'Inventory Staff',
    timestamp: '2026-07-09 14:15:10',
    status: 'success',
  },
  {
    id: '3',
    action: 'Failed login attempt',
    user: 'Unknown',
    role: 'N/A',
    timestamp: '2026-07-09 13:45:00',
    status: 'error',
  },
  {
    id: '4',
    action: 'Updated supplier "Nestle Philippines"',
    user: 'John Doe',
    role: 'Manager',
    timestamp: '2026-07-09 12:30:15',
    status: 'success',
  },
  {
    id: '5',
    action: 'Low stock alert: Coca-Cola 1.5L',
    user: 'System',
    role: 'System',
    timestamp: '2026-07-09 11:20:00',
    status: 'warning',
  },
  {
    id: '6',
    action: 'Deleted user account "Test User"',
    user: 'Admin',
    role: 'Admin',
    timestamp: '2026-07-09 10:15:30',
    status: 'success',
  },
  {
    id: '7',
    action: 'Generated inventory report',
    user: 'Jane Smith',
    role: 'Inventory Staff',
    timestamp: '2026-07-09 09:00:00',
    status: 'success',
  },
  {
    id: '8',
    action: 'Changed system settings',
    user: 'Admin',
    role: 'Admin',
    timestamp: '2026-07-09 08:30:45',
    status: 'success',
  },
];

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'success' | 'warning' | 'error'>('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'Manager' | 'Inventory Staff'>('All');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
                          log.user.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesRole = roleFilter === 'All' || log.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
    };
    return styles[status as keyof typeof styles] || styles.success;
  };

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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
            >
              <option value="All">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#006a61]"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Inventory Staff">Inventory Staff</option>
            </select>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006a61] text-slate-700 dark:text-slate-250"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-b border-slate-200 dark:border-white/10 font-bold">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-55/20 dark:hover:bg-white/5">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{log.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{log.action}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{log.user}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{log.role}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No logs found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
