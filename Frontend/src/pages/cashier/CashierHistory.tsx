import { useState } from 'react';
import { Printer, Receipt } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../components/shared/DataTable';
import { ActionButton } from '../../components/shared/DataTableActions';
import { formatCurrency, initialSalesTransactions, type SalesTransaction } from '../../utils/cashierData';

export function CashierHistory() {
  const [selectedReceipt, setSelectedReceipt] = useState<SalesTransaction | null>(null);
  const cashierTransactions = initialSalesTransactions.filter(t => t.user_id === 'cashier-001');

  const columns: DataTableColumn<SalesTransaction>[] = [
    {
      key: 'transaction_id',
      header: 'Transaction ID',
      pinned: true,
      truncate: true,
      minWidth: '120px',
    },
    {
      key: 'transaction_date',
      header: 'Time',
      minWidth: '100px',
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      minWidth: '100px',
    },
    {
      key: 'total_amount',
      header: 'Total',
      numeric: true,
      minWidth: '100px',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(row.total_amount)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transaction History</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current shift completed transactions.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <DataTable
          columns={columns}
          data={cashierTransactions}
          rowKey={(row) => row.transaction_id}
          hoverActions
          actions={(row) => (
            <ActionButton
              icon={<Printer className="h-3.5 w-3.5" />}
              label="View Receipt"
              onClick={() => setSelectedReceipt(row)}
            />
          )}
        />

        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Receipt Preview</h2>
            </div>
            {selectedReceipt && (
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            )}
          </div>
          {selectedReceipt ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Transaction</span><span className="text-right font-mono">{selectedReceipt.transaction_id}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Cashier</span><span className="text-right">{selectedReceipt.cashier_name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Payment</span><span className="text-right">{selectedReceipt.payment_method}</span></div>
              <div className="border-t border-slate-200 dark:border-white/10 pt-2 space-y-1">
                {selectedReceipt.items.map(item => (
                  <div key={item.sales_item_id} className="flex justify-between gap-4">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span className="text-right font-semibold">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 dark:border-white/10 pt-2 text-sm font-bold">
                <span>Total</span>
                <span className="text-right">{formatCurrency(selectedReceipt.total_amount)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-slate-400">Choose a transaction to preview a receipt.</div>
          )}
        </div>
      </div>
    </div>
  );
}
