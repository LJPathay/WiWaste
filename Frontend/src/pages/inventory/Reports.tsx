import React, { useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  PhilippinePeso,
  Package,
  TrendingUp,
  Loader2,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { reports as reportsApi, type ApiReport } from '../../services/api';

interface ReportCardDef {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  dateRange: boolean;
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'stock-movement',
    title: 'Stock Movement Report',
    description: 'View all stock in/out transactions over a period',
    icon: Activity,
    color: 'blue',
    dateRange: true,
  },
  {
    id: 'wastage',
    title: 'Wastage Report',
    description: 'Detailed breakdown of inventory losses and costs',
    icon: AlertTriangle,
    color: 'red',
    dateRange: true,
  },
  {
    id: 'expiration',
    title: 'Expiration Report',
    description: 'Products approaching expiration and risk analysis',
    icon: Clock,
    color: 'orange',
    dateRange: true,
  },
  {
    id: 'valuation',
    title: 'Inventory Valuation',
    description: 'Current inventory value by category and product',
    icon: PhilippinePeso,
    color: 'green',
    dateRange: false,
  },
  {
    id: 'reorder',
    title: 'Reorder Report',
    description: 'Products below reorder level requiring restocking',
    icon: Package,
    color: 'amber',
    dateRange: false,
  },
  {
    id: 'performance',
    title: 'Product Performance',
    description: 'Turnover rates and sales velocity by product',
    icon: TrendingUp,
    color: 'teal',
    dateRange: true,
  },
];

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',  text: 'text-blue-600 dark:text-blue-400',   iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  red:    { bg: 'bg-red-50 dark:bg-red-950/30',    text: 'text-red-600 dark:text-red-400',     iconBg: 'bg-red-100 dark:bg-red-900/40' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
  green:  { bg: 'bg-green-50 dark:bg-green-950/30',  text: 'text-green-600 dark:text-green-400',  iconBg: 'bg-green-100 dark:bg-green-900/40' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',  text: 'text-amber-600 dark:text-amber-400',  iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-950/30',   text: 'text-teal-600 dark:text-teal-400',    iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
};

const REPORT_ENDPOINT_MAP: Record<string, (params?: { from?: string; to?: string }) => Promise<ApiReport[]>> = {
  'stock-movement': (p) => reportsApi.inventoryMovement(p),
  wastage:          (p) => reportsApi.wasteSummary(p),
  expiration:       ()  => reportsApi.expiryAnalysis(),
  valuation:        ()  => reportsApi.costImpact(),
  reorder:          ()  => reportsApi.categoryAnalysis(),
  performance:      ()  => reportsApi.supplierPerformance(),
};

export function Reports() {
  const [dateFrom, setDateFrom] = useState<Record<string, string>>({});
  const [dateTo, setDateTo] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, ApiReport[]>>({});
  const [reportError, setReportError] = useState<Record<string, string>>({});

  const handleGenerate = useCallback(async (card: ReportCardDef) => {
    if (generatingId) return;
    setGeneratingId(card.id);
    setReportError((prev) => ({ ...prev, [card.id]: '' }));

    try {
      const params = card.dateRange
        ? { from: dateFrom[card.id] || undefined, to: dateTo[card.id] || undefined }
        : undefined;
      const data = await REPORT_ENDPOINT_MAP[card.id](params);
      setReportData((prev) => ({ ...prev, [card.id]: Array.isArray(data) ? data : [] }));
      setExpandedId(card.id);
    } catch (e) {
      setReportError((prev) => ({
        ...prev,
        [card.id]: e instanceof Error ? e.message : 'Failed to generate report',
      }));
    } finally {
      setGeneratingId(null);
    }
  }, [generatingId, dateFrom, dateTo]);

  const handleExportCSV = useCallback((cardId: string) => {
    const data = reportData[cardId];
    if (!data?.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cardId}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportData]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
            Inventory Reports
          </h1>
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              Generate reports to analyze inventory performance and trends
            </TooltipContent>
          </UITooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color] || colorMap.blue;
          const isExpanded = expandedId === card.id;
          const isLoading = generatingId === card.id;
          const data = reportData[card.id];
          const error = reportError[card.id];

          return (
            <div
              key={card.id}
              className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="p-3.5">
                <div className="flex items-start gap-2 mb-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      {card.description}
                    </p>
                  </div>
                </div>

                {card.dateRange && (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="date"
                      value={dateFrom[card.id] ?? ''}
                      onChange={(e) => setDateFrom((prev) => ({ ...prev, [card.id]: e.target.value }))}
                      className="flex-1 h-8 px-3 text-xs rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
                    />
                    <span className="text-xs text-[#64748B] dark:text-slate-400">to</span>
                    <input
                      type="date"
                      value={dateTo[card.id] ?? ''}
                      onChange={(e) => setDateTo((prev) => ({ ...prev, [card.id]: e.target.value }))}
                      className="flex-1 h-8 px-3 text-xs rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerate(card)}
                    disabled={isLoading}
                    className="flex-1 h-8 flex items-center justify-center gap-2 px-3 text-xs font-medium text-white bg-[#0F766E] hover:bg-[#0d6560] dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    {isLoading ? 'Generating...' : 'Generate Report'}
                  </button>
                  {data?.length ? (
                    <button
                      onClick={() => handleExportCSV(card.id)}
                      className="h-8 flex items-center justify-center gap-1.5 px-3 text-xs font-medium text-[#0F766E] dark:text-teal-400 border border-[#0F766E]/30 dark:border-teal-400/30 rounded-lg hover:bg-[#0F766E]/5 dark:hover:bg-teal-400/5 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  ) : null}
                  {data?.length ? (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : card.id)}
                      className="h-8 flex items-center justify-center px-2 text-[#64748B] dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  ) : null}
                </div>

                {error && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>
                )}
              </div>

              {isExpanded && data?.length > 0 && (
                <div className="border-t border-[#E5E7EB] dark:border-white/10 px-4 py-2 max-h-72 overflow-auto">
                  <DataTable
                    data={data as (ApiReport & Record<string, unknown>)[]}
                    rowKey={(row, i) => String(row.id ?? i)}
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Reports;
