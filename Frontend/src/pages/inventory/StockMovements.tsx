import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Calendar,
  Info,
} from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { Pagination } from '../../components/ui/pagination';
import { inventory as inventoryApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';

const MOVEMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'Stock In', label: 'Stock In' },
  { value: 'Stock Out', label: 'Stock Out' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Wastage', label: 'Wastage' },
  { value: 'Return', label: 'Return' },
  { value: 'Adjustment', label: 'Adjustment' },
  { value: 'Damaged', label: 'Damaged' },
  { value: 'Expired', label: 'Expired' },
];

function getMovementIcon(type: string) {
  if (['Stock In', 'Return', 'Adjustment'].includes(type)) {
    return <ArrowUpRight className="h-3 w-3 text-green-600" />;
  }
  return <ArrowDownRight className="h-3 w-3 text-red-500" />;
}

function getMovementBadge(type: string) {
  const badges: Record<string, { cls: string }> = {
    'Stock In': { cls: 'bg-green-50 text-green-700 border border-green-100' },
    'Stock Out': { cls: 'bg-red-50 text-red-700 border border-red-100' },
    Sale: { cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
    Wastage: { cls: 'bg-orange-50 text-orange-700 border border-orange-100' },
    Return: { cls: 'bg-purple-50 text-purple-700 border border-purple-100' },
    Adjustment: { cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    Damaged: { cls: 'bg-rose-50 text-rose-700 border border-rose-100' },
    Expired: { cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  };
  return badges[type] ?? { cls: 'bg-slate-100 text-slate-600' };
}

interface MovementRow {
  movement_id: number;
  product_name: string;
  sku: string;
  movement_type: string;
  quantity: number;
  remarks: string | null;
  recorded_by: string;
  formatted_date: string;
}

export function StockMovements() {
  const { toasts, dismiss } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () =>
      inventoryApi.allMovements({
        search: search || undefined,
        movement_type: typeFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        per_page: 20,
      }),
    [search, typeFilter, fromDate, toDate, page]
  );

  const { data: movementsData } = useApi(fetcher);

  const movements = useMemo<MovementRow[]>(
    () => (movementsData?.data ?? []).map(m => ({
      movement_id: m.movement_id,
      product_name: m.product_name,
      sku: m.sku,
      movement_type: m.movement_type,
      quantity: m.quantity,
      remarks: m.remarks,
      recorded_by: m.recorded_by,
      formatted_date: m.movement_date?.replace('T', ' ').slice(0, 19) ?? '—',
    })),
    [movementsData]
  );

  const stats = useMemo(() => {
    const all = movementsData?.data ?? [];
    return {
      total: movementsData?.total ?? 0,
      ins: all.filter(m => ['Stock In', 'Return'].includes(m.movement_type)).length,
      outs: all.filter(m => ['Stock Out', 'Sale', 'Wastage'].includes(m.movement_type)).length,
    };
  }, [movementsData]);

  const columns: DataTableColumn<MovementRow>[] = [
    {
      key: 'movement_date',
      header: 'Date',
      minWidth: '160px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span className="text-xs font-mono">{row.formatted_date}</span>
        </div>
      ),
    },
    {
      key: 'product_name',
      header: 'Product',
      pinned: true,
      truncate: true,
      minWidth: '200px',
      render: (row) => (
        <div>
          <div className="font-semibold text-[#0F172A] text-xs">{row.product_name}</div>
          <div className="text-[9px] font-mono text-[#64748B]">{row.sku}</div>
        </div>
      ),
    },
    {
      key: 'movement_type',
      header: 'Type',
      align: 'center',
      minWidth: '110px',
      render: (row) => {
        const { cls } = getMovementBadge(row.movement_type);
        return (
          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cls}`}>
            {row.movement_type}
          </span>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'center',
      minWidth: '80px',
      render: (row) => {
        const isIn = ['Stock In', 'Return', 'Adjustment'].includes(row.movement_type);
        return (
          <span className={`inline-flex items-center gap-1 font-bold text-xs ${isIn ? 'text-green-600' : 'text-red-500'}`}>
            {getMovementIcon(row.movement_type)}
            {row.quantity}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (row) => (
        <span className="text-xs text-slate-500 line-clamp-2 max-w-[200px]">
          {row.remarks ?? '—'}
        </span>
      ),
    },
    {
      key: 'recorded_by',
      header: 'By',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.recorded_by}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-5 w-5 text-[#0F766E]" />
        <h1 className="text-xl font-bold text-slate-900">Stock Movements</h1>
        <UITooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white max-w-xs">
            Complete log of all stock movements across the inventory — including sales, wastage, returns, and adjustments.
          </TooltipContent>
        </UITooltip>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Total Movements</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-700">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-green-600">Stock In (All)</div>
          <div className="mt-1.5 text-2xl font-bold text-green-700">{stats.ins}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-red-500">Stock Out (All)</div>
          <div className="mt-1.5 text-2xl font-bold text-red-600">{stats.outs}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 h-8 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] w-56"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
        >
          {MOVEMENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <DataTable
          columns={columns}
          data={movements}
          rowKey={(row) => row.movement_id}
          emptyMessage="No movements found."
        />
        {movementsData && movementsData.last_page > 1 && (
          <div className="border-t border-slate-100 px-4 py-3">
            <Pagination
              page={movementsData.current_page}
              totalPages={movementsData.last_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
