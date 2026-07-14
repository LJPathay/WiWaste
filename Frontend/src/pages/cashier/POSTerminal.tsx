import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Printer, Receipt, Search, Trash2 } from 'lucide-react';
import { FormField, inputCls, Toast, useToast } from '../../components/ui/Toast';
import {
  cashierProducts,
  createTransactionId,
  formatCurrency,
  paymentMethods,
  type CashierProduct,
  type PaymentMethod,
  type SalesTransaction,
} from '../../utils/cashierData';
import { getStoredSession } from '../../utils/mockAuthAndFeatures';

interface CartLine {
  product: CashierProduct;
  quantity: number;
}

export function POSTerminal() {
  const { toasts, dismiss, success, error } = useToast();
  const session = getStoredSession();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<SalesTransaction | null>(null);

  const subtotal = cart.reduce((sum, line) => sum + line.product.selling_price * line.quantity, 0);
  const grandTotal = subtotal;
  const tendered = Number(amountTendered || 0);
  const changeDue = paymentMethod === 'Cash' ? Math.max(0, tendered - grandTotal) : 0;

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase();
    return cashierProducts.filter(
      product =>
        product.product_name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.product_id.toLowerCase().includes(query)
    );
  }, [search]);

  const addProduct = (product: CashierProduct) => {
    setCart(prev => {
      const existing = prev.find(line => line.product.product_id === product.product_id);
      if (existing) {
        return prev.map(line =>
          line.product.product_id === product.product_id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.current_stock) }
            : line
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setBarcode('');
    setSearch('');
    barcodeRef.current?.focus();
  };

  const scanBarcode = () => {
    const product = cashierProducts.find(item => item.barcode === barcode.trim() || item.product_id.toLowerCase() === barcode.trim().toLowerCase());
    if (!product) {
      error('No product found for that barcode or SKU.');
      return;
    }
    addProduct(product);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev =>
      prev.map(line =>
        line.product.product_id === productId
          ? { ...line, quantity: Math.max(1, Math.min(quantity, line.product.current_stock)) }
          : line
      )
    );
  };

  const completeSale = () => {
    if (cart.length === 0) {
      error('Add at least one product before completing a sale.');
      return;
    }
    if (paymentMethod === 'Cash' && tendered < grandTotal) {
      error('Amount tendered must cover the grand total.');
      return;
    }
    if (paymentMethod !== 'Cash' && !paymentConfirmed) {
      error('Confirm the selected payment method before completing the sale.');
      return;
    }

    const transactionId = createTransactionId();
    const completedReceipt: SalesTransaction = {
      transaction_id: transactionId,
      user_id: 'cashier-001',
      cashier_name: session?.name ?? 'Current Cashier',
      total_amount: grandTotal,
      transaction_date: new Date().toLocaleString(),
      payment_method: paymentMethod,
      amount_tendered: paymentMethod === 'Cash' ? tendered : null,
      change_due: paymentMethod === 'Cash' ? changeDue : null,
      status: 'Completed',
      items: cart.map((line, index) => ({
        sales_item_id: `SI-${Date.now()}-${index + 1}`,
        transaction_id: transactionId,
        product_id: line.product.product_id,
        product_name: line.product.product_name,
        quantity: line.quantity,
        unit_price: line.product.selling_price,
        subtotal: line.product.selling_price * line.quantity,
      })),
    };

    setReceipt(completedReceipt);
    setCart([]);
    setAmountTendered('');
    setPaymentConfirmed(false);
    success('Sale completed, stock synchronized, and receipt generated.');
  };

  const voidTransaction = () => {
    setCart([]);
    setAmountTendered('');
    setPaymentConfirmed(false);
    setReceipt(null);
    success('Current transaction voided.');
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <Toast toasts={toasts} onDismiss={dismiss} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">POS Terminal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ipharma Mart checkout</p>
        </div>
        <button
          onClick={voidTransaction}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Void Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Barcode Scan">
                <div className="flex gap-2">
                  <input
                    ref={barcodeRef}
                    autoFocus
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') scanBarcode();
                    }}
                    className={inputCls}
                    placeholder="Scan barcode or enter SKU"
                  />
                  <button
                    onClick={scanBarcode}
                    className="inline-flex items-center justify-center rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </FormField>
              <FormField label="SKU / Name Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="Search product name, SKU, or barcode"
                  />
                </div>
              </FormField>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProducts.slice(0, 6).map(product => (
                <button
                  key={product.product_id}
                  onClick={() => addProduct(product)}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{product.product_name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{product.product_id} / {product.barcode}</p>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(product.selling_price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Current Transaction</span>
              <span className="text-xs text-slate-400">{cart.length} line item{cart.length === 1 ? '' : 's'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold text-right">Qty</th>
                    <th className="px-5 py-3 font-semibold text-right">Unit Price</th>
                    <th className="px-5 py-3 font-semibold text-right">Subtotal</th>
                    <th className="px-5 py-3 font-semibold text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">No items in cart.</td>
                    </tr>
                  ) : (
                    cart.map(line => (
                      <tr key={line.product.product_id}>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{line.product.product_name}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button onClick={() => updateQuantity(line.product.product_id, line.quantity - 1)} className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-slate-600 dark:text-slate-300">
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={line.product.current_stock}
                              value={line.quantity}
                              onChange={e => updateQuantity(line.product.product_id, Number(e.target.value))}
                              className="w-16 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-right"
                            />
                            <button onClick={() => updateQuantity(line.product.product_id, line.quantity + 1)} className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-slate-600 dark:text-slate-300">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(line.product.selling_price)}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrency(line.product.selling_price * line.quantity)}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setCart(prev => prev.filter(item => item.product.product_id !== line.product.product_id))} className="inline-flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Payment</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-3 text-base">
                <span className="font-bold text-slate-900 dark:text-slate-100">Grand Total</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              {paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    setPaymentConfirmed(false);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    paymentMethod === method
                      ? 'border-[#006a61] bg-[#006a61]/5 text-[#006a61] dark:text-[#7ef0cf]'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {paymentMethod === 'Cash' ? (
                <div className="space-y-3">
                  <FormField label="Amount Tendered">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountTendered}
                      onChange={e => setAmountTendered(e.target.value)}
                      className={`${inputCls} text-right`}
                      placeholder="0.00"
                    />
                  </FormField>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Change Due</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(changeDue)}</span>
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Payment confirmed</span>
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={e => setPaymentConfirmed(e.target.checked)}
                    className="h-4 w-4 accent-[#006a61]"
                  />
                </label>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={voidTransaction}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Void
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => barcodeRef.current?.focus()}
                  className="rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={completeSale}
                  className="rounded-lg bg-[#006a61] hover:bg-[#00574f] text-white px-4 py-2 text-xs font-semibold transition-colors"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>

          {receipt && (
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Receipt</h2>
                </div>
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006a61] dark:text-[#7ef0cf] hover:underline">
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Transaction</span><span className="text-right font-mono">{receipt.transaction_id}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Cashier</span><span className="text-right">{receipt.cashier_name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Payment</span><span className="text-right">{receipt.payment_method}</span></div>
                <div className="border-t border-slate-200 dark:border-white/10 pt-2 space-y-1">
                  {receipt.items.map(item => (
                    <div key={item.sales_item_id} className="flex justify-between gap-4">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span className="text-right font-semibold">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 dark:border-white/10 pt-2 text-sm font-bold">
                  <span>Total</span>
                  <span className="text-right">{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
