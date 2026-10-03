import { useState, useMemo, useCallback } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Calendar,
  Info,
  Trash2,
} from 'lucide-react';
import { Toast, useToast, ConfirmDialog } from '../../components/ui/Toast';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { ActionButton } from '../../components/shared/DataTableActions';
import { stockReceiving as receivingApi } from '../../services/api';
import { useApi } from '../../hooks/useApi';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

/**
 * Statuses come from `StockReceivingController`'s validation:
 * pending, received, verified, rejected, partial. "cancelled" is not one of them, so
 * the tab used to read a status the API can never return and was permanently empty.
 */
const STATUSES = ['all', 'pending', 'received', 'rejected'] as const;

function getStatusBadge(status: string) {
  if (status === 'received' || status === 'verified')
    return { label: status === 'verified' ? 'Verified' : 'Received', cls: 'bg-green-50 text-green-700 border border-green-100' };
  if (status === 'pending')
    return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border border-amber-100' };
  if (status === 'partial')
    return { label: 'Partial', cls: 'bg-sky-50 text-sky-700 border border-sky-100' };
  if (status === 'rejected')
    return { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border border-rose-100' };
  return { label: status, cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
}

/**
 * One line of `stock_receiving`, as the endpoint actually returns it.
 *
 * This used to be shaped like a purchase order (`po_number`, `expected_date`,
 * `total_amount`) and none of those fields exist on the model — the screen rendered
 * an always-empty table because it was reading a deliveries feed as if it were a
 * purchase-order feed.
 */
interface ReceivingRow {
  id: number;
  supplier: string;
  received_at: string | null;
  status: string;
  /** Item ids still awaiting receipt, with the quantity that was expected. */
  pendingItems: Array<{ receiving_item_id: number; expected_quantity: number }>;
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
  } = useApi(fetcher, {
    // Without a key that tracks `statusFilter` the request is issued once and never
    // again, so the All / Pending / Received / Cancelled tabs did nothing.
    dedupeKey: `stock-receiving-${statusFilter}`,
  });

  const orders = useMemo<ReceivingRow[]>(
    () =>
      (receivingData?.data ?? []).map((o) => ({
        id: o.id,
        supplier: o.supplier_name ?? o.supplier?.supplier_name ?? '—',
        received_at: o.received_at ?? null,
        status: o.status,
        pendingItems: (o.items ?? [])
          .filter((i) => i.received_quantity == null || i.received_quantity === 0)
          .map((i) => ({
            receiving_item_id: i.receiving_item_id,
            expected_quantity: i.expected_quantity ?? 0,
          })),
      })),
    [receivingData]
  );

  const statCards = useMemo(() => {
    const all = (receivingData?.data ?? []);
    const pending = all.filter((o) => o.status === 'pending').length;
    const received = all.filter((o) => o.status === 'received' || o.status === 'verified').length;
    const cancelled = all.filter((o) => o.status === 'rejected').length;
    return [
      { label: 'Total', value: all.length, icon: Package, color: 'text-slate-700' },
      { label: 'Pending', value: pending, icon: Truck, color: 'text-amber-700' },
      { label: 'Received', value: received, icon: CheckCircle, color: 'text-green-700' },
      { label: 'Rejected', value: cancelled, icon: XCircle, color: 'text-slate-500' },
    ];
  }, [receivingData]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'receive') {
        // The endpoint requires one entry per outstanding line, keyed by
        // `receiving_item_id`; it used to be called with an empty array, which is a
        // validation failure, so receiving could never succeed.
        const row = orders.find((o) => o.id === confirmAction.id);
        if (!row || row.pendingItems.length === 0) {
          showError('This delivery has no outstanding items to receive.');
          setConfirmAction(null);
          return;
        }
        await receivingApi.receive(
          confirmAction.id,
          row.pendingItems.map((i) => ({
            receiving_item_id: i.receiving_item_id,
            received_quantity: Math.max(i.expected_quantity, 1),
          })),
        );
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
      key: 'id',
      header: 'Reference',
      pinned: true,
      render: (row) => (
        <div className="font-semibold text-[#0F172A]">RCV-{row.id}</div>
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
      key: 'received_at',
      header: 'Received',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs">{row.received_at?.slice(0, 10) ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (row) => {
        const units = row.pendingItems.reduce((sum, i) => sum + i.expected_quantity, 0);
        return (
          <span className="font-semibold text-xs">
            {row.pendingItems.length === 0 ? '—' : `${units} unit${units === 1 ? '' : 's'}`}
          </span>
        );
      },
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
    {
      // Receiving a delivery is this screen's whole purpose, so the row needs its
      // controls. They were absent: `confirmAction` was only ever set to `null`, which
      // left `handleConfirmAction` unreachable and pending deliveries impossible to close.
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const settled = row.status !== 'pending' && row.status !== 'partial';
        const ref = `RCV-${row.id}`;
        const act = (type: 'receive' | 'reject' | 'discard') => () =>
          setConfirmAction({ id: row.id, type, name: ref });

        return (
          <div className="flex items-center justify-end gap-1">
            <ActionButton
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              label={`Receive ${ref}`}
              onClick={act('receive')}
              disabled={settled || row.pendingItems.length === 0}
            />
            <ActionButton
              icon={<XCircle className="h-3.5 w-3.5" />}
              label={`Reject ${ref}`}
              onClick={act('reject')}
              disabled={settled}
              variant="danger"
            />
            <ActionButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label={`Discard ${ref}`}
              onClick={act('discard')}
              disabled={settled}
              variant="danger"
            />
          </div>
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
        {/* `role="group"` + `aria-pressed` so the tabs are distinguishable from the
            stat cards that repeat the same words, and so the selected bucket is
            exposed to assistive tech at all. */}
        <div
          role="group"
          aria-label="Filter deliveries by status"
          className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1"
        >
          {STATUSES.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
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

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
