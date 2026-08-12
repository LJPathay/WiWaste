import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Loader2, CheckCircle2, XCircle, Printer, AlertTriangle, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { paymongo as paymongoApi, sales as salesApi, type ApiSalesTransaction } from '../../services/api';
import { formatCurrency } from '../../utils/cashierData';

const PAYMONGO_PENDING_KEY = 'wiwaste_paymongo_pending';
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30;

type Phase = 'checking' | 'paid' | 'failed' | 'timeout' | 'error';

export function POSPaymentStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = Number(searchParams.get('transaction_id'));
  const [phase, setPhase] = useState<Phase>('checking');
  const [receipt, setReceipt] = useState<ApiSalesTransaction | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setPhase('error');
      setErrorMsg('Missing transaction reference. Please return to the POS and try again.');
      return;
    }

    const check = async () => {
      attemptsRef.current += 1;
      try {
        const status = await paymongoApi.getStatus(transactionId);
        if (status.payment_status === 'paid' || status.status === 'Completed') {
          if (timerRef.current) clearInterval(timerRef.current);
          sessionStorage.removeItem(PAYMONGO_PENDING_KEY);
          const full = await salesApi.show(transactionId);
          setReceipt(full);
          setPhase('paid');
          return;
        }
        if (status.payment_status === 'failed') {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('failed');
          return;
        }
      } catch (err: unknown) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : 'Unable to reach the payment server.');
        return;
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('timeout');
      }
    };

    check();
    timerRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [transactionId]);

  const paymentLabel = receipt?.payment_reference || receipt?.payment_method || 'PayMongo';

  const backToPos = () => navigate('/cashier/pos');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] dark:bg-slate-900 text-[#475569] dark:text-slate-300 font-sans overflow-y-auto">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/images/LOGO_POS.png" alt="WiWaste POS" className="h-8 object-contain" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Payment Confirmation
          </span>
        </div>
        {phase !== 'checking' && phase !== 'paid' && (
          <button
            onClick={backToPos}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-300 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to POS
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {/* ── Checking ── */}
        {phase === 'checking' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center text-center animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#0F766E] animate-spin mb-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Waiting for payment confirmation…</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Reference: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{transactionId}</span>
            </p>
            <p className="text-xs text-slate-400 mt-3">This page refreshes automatically every few seconds.</p>
          </div>
        )}

        {/* ── Paid ── */}
        {phase === 'paid' && receipt && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-[#0F766E] text-white p-5 text-center">
              <div className="flex items-center justify-center gap-2 font-bold text-base mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Payment Successful</span>
              </div>
              <p className="text-xs text-emerald-100">
                Paid via {paymentLabel} · Reference #{receipt.id}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-black bg-white">
              <div className="text-center mb-4">
                <h1 className="text-lg font-bold mb-0.5">WiWaste Store</h1>
                <p className="text-[10px] text-slate-600">123 Retail Avenue, Metro Manila</p>
              </div>

              <div className="mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span>Txn:</span>
                  <span className="font-bold">#{receipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(receipt.transaction_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{receipt.cashier}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-black py-2 mb-3">
                <div className="flex justify-between font-bold mb-1.5">
                  <span className="w-8">Qty</span>
                  <span className="flex-1">Item</span>
                  <span className="w-16 text-right">Total</span>
                </div>
                {receipt.items.map((item) => (
                  <div key={item.id} className="flex justify-between mb-1">
                    <span className="w-8">{item.quantity}</span>
                    <span className="flex-1 truncate pr-2">{item.product_name}</span>
                    <span className="w-16 text-right">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-xs mt-2 pt-2 border-t border-black">
                <span>Grand Total</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>

              <div className="border-t border-dashed border-black pt-2 mt-3 space-y-1">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>PayMongo ({paymentLabel})</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Tendered:</span>
                  <span>{receipt.amount_tendered ? formatCurrency(receipt.amount_tendered) : formatCurrency(receipt.total_amount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Change:</span>
                  <span>{formatCurrency(receipt.change_due ?? 0)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 mt-3 border-t border-slate-200">
                <p className="font-bold mb-0.5">Thank you for shopping with us!</p>
                <p>Please come again.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => { window.print(); }}
                className="py-3 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => navigate('/cashier/pos')}
                className="flex-1 py-3 text-xs font-bold text-white bg-[#0F766E] rounded-xl hover:bg-[#0d615b] transition-all flex items-center justify-center gap-2"
              >
                Start New Transaction <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Failed ── */}
        {phase === 'failed' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center text-center animate-in fade-in">
            <XCircle className="w-12 h-12 text-red-500 mb-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Payment was not completed</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              No charge was made and your cart is still intact. You can try again or use a different method.
            </p>
            <button
              onClick={backToPos}
              className="w-full py-3 text-sm font-bold text-white bg-[#0F766E] rounded-xl hover:bg-[#0d615b] transition-all"
            >
              Return to POS
            </button>
          </div>
        )}

        {/* ── Timeout ── */}
        {phase === 'timeout' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center text-center animate-in fade-in">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Still waiting for payment…</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Payment confirmation is taking longer than expected. Check your payment, then return to the POS to re-check.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={backToPos}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Return to POS
              </button>
              <button
                onClick={() => navigate(0)}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#0F766E] rounded-xl hover:bg-[#0d615b] transition-all"
              >
                Check Again
              </button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-10 flex flex-col items-center text-center animate-in fade-in">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{errorMsg}</p>
            <button
              onClick={backToPos}
              className="w-full py-3 text-sm font-bold text-white bg-[#0F766E] rounded-xl hover:bg-[#0d615b] transition-all"
            >
              Return to POS
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
