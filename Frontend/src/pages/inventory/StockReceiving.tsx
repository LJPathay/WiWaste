import { useState, useMemo, useCallback } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Calendar,
  Info,
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { stockReceiving as receivingApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function getStatusBadge(status: string) {
  if (status === 'received')
    return { label: 'Received', cls: 'bg-green-50 text-green-700 border border-green-100' };
  if (status === 'pending')
    return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
  if (status === 'cancelled')
    return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
  return { label: status, cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
}

interface ReceivingRow {
  id: number;
  po_number: string;
  supplier: string;
  expected_date: string;
  status: string;
  total_amount: number;
}

export function StockReceiving() {
  const { toasts, dismiss, success, error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{
    id: number;
    type: 'receive' | 'reject' | 'discard';
    name: string;
  } | null>(null);

  const fetcher = useCallback(
    () => receivingApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    [statusFilter]
  );

  const {
    data: receivingData,
    refetch,
  } = useApi(fetcher);

  const orders = useMemo<ReceivingRow[]>(
    () =>
      (receivingData?.data ?? []).map((o) => ({
        id: o.id,
        po_number: o.po_number,
        supplier: o.supplier_name,
        expected_date: o.expected_date?.slice(0, 10) ?? '—',
        status: o.status,
        total_amount: o.total_amount,
      })),
    [receivingData]
  );

  const statCards = useMemo(() => {
    const all = (receivingData?.data ?? []);
    const pending = all.filter((o) => o.status === 'pending').length;
    const received = all.filter((o) => o.status === 'received').length;
    const cancelled = all.filter((o) => o.status === 'cancelled').length;
    return [
      { label: 'Total', value: all.length, icon: Package, color: 'text-slate-700' },
      { label: 'Pending', value: pending, icon: Truck, color: 'text-amber-700' },
      { label: 'Received', value: received, icon: CheckCircle, color: 'text-green-700' },
      { label: 'Cancelled', value: cancelled, icon: XCircle, color: 'text-slate-500' },
    ];
  }, [receivingData]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'receive') {
        await receivingApi.receive(confirmAction.id, []);
      } else if (confirmAction.type === 'reject') {
        await receivingApi.reject(confirmAction.id, 'Rejected by user');
      } else {
        await receivingApi.discard(confirmAction.id, 'Discarded by user');
      }
      success(`${confirmAction.type === 'receive' ? 'Received' : confirmAction.type === 'reject' ? 'Rejected' : 'Discarded'} successfully.`);
      setConfirmAction(null);
      refetch();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const columns: DataTableColumn<ReceivingRow>[] = [
    {
      key: 'po_number',
      header: 'PO Number',
      pinned: true,
      render: (row) => (
        <div className="font-semibold text-[#0F172A]">{row.po_number}</div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.supplier}</span>
      ),
    },
    {
      key: 'expected_date',
      header: 'Expected',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs">{row.expected_date}</span>
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-xs">
          {currencyFormatter.format(row.total_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => {
        const { label, cls } = getStatusBadge(row.status);
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-[#0F766E]" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Stock Receiving</h1>
          <p className="text-xs text-slate-500">Manage and track incoming stock deliveries</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                  {card.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
                  <Icon className={`h-3.5 w-3.5 ${card.color} opacity-60`} />
                </div>
              </div>
              <div className={`mt-2 text-sm font-bold ${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {['all', 'pending', 'received', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                statusFilter === f
                  ? 'bg-[#0F766E] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <DataTable
          columns={columns}
          data={orders}
          rowKey={(row) => row.id}
          emptyMessage="No receiving records found."
        />
      </div>

      {confirmAction && (
        <ConfirmDialog
          message={`Are you sure you want to ${confirmAction.type} ${confirmAction.name}?`}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
          confirmLabel={confirmAction.type === 'receive' ? 'Receive' : confirmAction.type === 'reject' ? 'Reject' : 'Discard'}
          danger={confirmAction.type !== 'receive'}
        />
      )}

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
