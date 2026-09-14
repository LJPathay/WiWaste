import React, { useEffect, useRef } from 'react';
import { Printer, X, Download, CheckCircle } from 'lucide-react';
import { Toast, useToast, Modal } from '../ui/Toast';
import { formatCurrency } from '../../utils/cashierData';
import type { ApiReceiptResponse } from '../../services/api';

interface ReceiptPreviewProps {
  receiptData: ApiReceiptResponse['receipt'] | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function ReceiptPreview({ receiptData, isOpen, onClose, onPrint }: ReceiptPreviewProps) {
  const { toasts, dismiss, success } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && printRef.current) {
      printRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !receiptData) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Receipt Preview" size="lg">
      <div ref={printRef} className="bg-white text-slate-900 p-6 print:max-w-[80mm] print:mx-auto" id="receipt-content">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
          <h1 className="text-lg font-bold uppercase tracking-wider mb-1">{receiptData.business_name}</h1>
          <p className="text-xs text-slate-600 mb-1">{receiptData.business_address}</p>
          <p className="text-xs text-slate-600 mb-2">TIN: {receiptData.business_tin}</p>
          <p className="text-xs text-slate-600">ATP / Serial: {receiptData.receipt?.transaction_id ?? 'N/A'}</p>
        </div>

        {/* Transaction Info */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4 border-b border-slate-300 pb-2">
          <div>
            <span className="font-medium">Date:</span> {formatDate(receiptData.transaction_date)}
          </div>
          <div className="text-right">
            <span className="font-medium">Cashier:</span> {receiptData.cashier}
          </div>
          <div>
            <span className="font-medium">OR #:</span> {receiptData.receipt?.transaction_id}
          </div>
          <div className="text-right">
            <span className="font-medium">Payment:</span> {receiptData.payment_method}
          </div>
        </div>

        {/* Senior/PWD Info */}
        {receiptData.senior_pwd && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-xs">
            <div className="font-medium text-amber-900 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              SENIOR/PWD DISCOUNT APPLIED
            </div>
            <div>Type: {receiptData.senior_pwd.type.toUpperCase()}</div>
            <div>ID: {receiptData.senior_pwd.id}</div>
            <div>Name: {receiptData.senior_pwd.name}</div>
            <div>Discount: {formatCurrency(receiptData.senior_pwd.discount)}</div>
          </div>
        )}

        {/* Items Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="px-2 py-1 text-left">Item</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Unit</th>
                <th className="px-2 py-1 text-right">VAT</th>
                <th className="px-2 py-1 text-right">Disc.</th>
                <th className="px-2 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {receiptData.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1">
                    <div className="font-medium">{item.product_name}</div>
                    {item.is_senior_pwd_exempt && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">SENIOR/PWD</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">{item.quantity}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(item.vat_amount)}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(item.discount_amount)}</td>
                  <td className="px-2 py-1 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(receiptData.totals.subtotal)}</span>
          </div>
          {receiptData.totals.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{formatCurrency(receiptData.totals.discount)}</span>
            </div>
          )}
          {receiptData.totals.senior_pwd_discount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Senior/PWD Discount (20%)</span>
              <span>-{formatCurrency(receiptData.totals.senior_pwd_discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <span>VATable Sales</span>
            <span>{formatCurrency(receiptData.totals.vatable_sales)}</span>
          </div>
          <div className="flex justify-between">
            <span>Non-VAT Sales</span>
            <span>{formatCurrency(receiptData.totals.non_vatable_sales)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (12%)</span>
            <span>{formatCurrency(receiptData.totals.vat_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <span className="font-bold">TOTAL</span>
            <span className="font-bold">{formatCurrency(receiptData.totals.total)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t-2 border-slate-900 pt-4 mt-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="font-medium">Payment Method</span>
            <span>{receiptData.payment.method}</span>
          </div>
          {receiptData.payment.reference && (
            <div className="flex justify-between">
              <span>Reference</span>
              <span>{receiptData.payment.reference}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="font-medium">Amount Tendered</span>
            <span>{formatCurrency(receiptData.payment.amount_tendered ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Change</span>
            <span>{formatCurrency(receiptData.payment.change_due ?? 0)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-4 border-t border-slate-300 pt-2">
          <p>THIS SERVES AS YOUR OFFICIAL RECEIPT</p>
          <p>VAT Reg. TIN: {receiptData.business_tin}</p>
          <p className="mt-2">Thank you for your purchase!</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 p-4 border-t border-slate-200">
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </Modal>
  );
}