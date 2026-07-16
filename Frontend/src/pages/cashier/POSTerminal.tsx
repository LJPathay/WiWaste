import { useMemo, useRef, useState } from 'react';
import { Barcode, ChevronDown, Minus, Plus, Printer, Search, Trash2, CreditCard, Wallet, Banknote, Filter } from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';
import { useHeaderAction } from '../../components/layout/HeaderLabelProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  cashierProducts,
  createTransactionId,
  formatCurrency,
  type CashierProduct,
  type PaymentMethod,
  type SalesTransaction,
} from '../../utils/cashierData';
import { getStoredSession } from '../../utils/mockAuthAndFeatures';

interface CartLine {
  product: CashierProduct;
  quantity: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All Items', color: 'bg-[#c8f0e8]', icon: '📦' },
  { id: 'CAT-PHARMA', label: 'Pharma', color: 'bg-[#f9c8d8]', icon: '💊' },
  { id: 'CAT-VITAMIN', label: 'Vitamins', color: 'bg-[#c8d8f9]', icon: '🧴' },
  { id: 'CAT-GROCERY', label: 'Grocery', color: 'bg-[#e0c8f9]', icon: '🛒' },
];

export function POSTerminal() {
  const { toasts, dismiss, success, error } = useToast();
  const { setAction } = useHeaderAction();
  const session = getStoredSession();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<SalesTransaction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidMode, setVoidMode] = useState<'selected' | 'all' | null>(null);
  const [voidSelection, setVoidSelection] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const subtotal = cart.reduce((sum, l) => sum + l.product.selling_price * l.quantity, 0);
  const tax = subtotal * 0.1;
  const grandTotal = subtotal + tax;
  const tendered = Number(amountTendered || 0);
  const changeDue = paymentMethod === 'Cash' ? Math.max(0, tendered - grandTotal) : 0;

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return cashierProducts.filter(p => {
      const matchCat = activeCategory === 'all' || p.category_id === activeCategory;
      const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.barcode.includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  const addProduct = (product: CashierProduct) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.product_id === product.product_id);
      const newQty = existing ? Math.min(existing.quantity + 1, product.current_stock) : 1;
      setAction(`Added ${product.product_name} ×${newQty} to the queue`);
      if (existing) {
        return prev.map(l =>
          l.product.product_id === product.product_id
            ? { ...l, quantity: newQty }
            : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) {
      const line = cart.find(l => l.product.product_id === productId);
      if (line) setAction(`Unqueued ${line.product.product_name} from the order`);
      setCart(prev => prev.filter(l => l.product.product_id !== productId));
      return;
    }
    const line = cart.find(l => l.product.product_id === productId);
    if (line) {
      const capped = Math.min(qty, line.product.current_stock);
      if (capped < line.quantity) {
        setAction(`Removed 1 ${line.product.product_name} from the queue`);
      }
    }
    setCart(prev =>
      prev.map(l =>
        l.product.product_id === productId
          ? { ...l, quantity: Math.min(qty, l.product.current_stock) }
          : l
      )
    );
  };

  const completeSale = () => {
    if (cart.length === 0) { error('Add at least one product.'); return; }
    if (paymentMethod === 'Cash' && tendered < grandTotal) { error('Amount tendered must cover the total.'); return; }
    if (paymentMethod !== 'Cash' && !paymentConfirmed) { error('Confirm payment before completing.'); return; }

    const transactionId = createTransactionId();
    const completedReceipt: SalesTransaction = {
      transaction_id: transactionId,
      user_id: 'cashier-001',
      cashier_name: session?.name ?? 'Cashier',
      total_amount: grandTotal,
      transaction_date: new Date().toLocaleString(),
      payment_method: paymentMethod,
      amount_tendered: paymentMethod === 'Cash' ? tendered : null,
      change_due: paymentMethod === 'Cash' ? changeDue : null,
      status: 'Completed',
      items: cart.map((l, i) => ({
        sales_item_id: `SI-${Date.now()}-${i + 1}`,
        transaction_id: transactionId,
        product_id: l.product.product_id,
        product_name: l.product.product_name,
        quantity: l.quantity,
        unit_price: l.product.selling_price,
        subtotal: l.product.selling_price * l.quantity,
      })),
    };
    setReceipt(completedReceipt);
    setCart([]);
    setAmountTendered('');
    setPaymentConfirmed(false);
    setShowConfirmation(false);
    setAction(`Order Placed via ${paymentMethod} — ${formatCurrency(grandTotal)}`);
    success('Sale completed!');
  };

  const openVoidSelected = () => {
    if (cart.length === 0) { error('There are no products to void.'); return; }
    setVoidMode('selected');
    setVoidSelection([]);
    setShowVoidModal(true);
  };

  const openVoidAll = () => {
    if (cart.length === 0) { error('There are no products to void.'); return; }
    setVoidMode('all');
    setVoidSelection(cart.map(line => line.product.product_id));
    setShowVoidModal(true);
  };

  const toggleVoidSelection = (productId: string) => {
    setVoidSelection(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const commitVoidSelection = () => {
    if (voidSelection.length === 0) { error('Select at least one product to void.'); return; }
    const count = voidSelection.length;
    setCart(prev => prev.filter(line => !voidSelection.includes(line.product.product_id)));
    setShowVoidModal(false);
    setVoidMode(null);
    setVoidSelection([]);
    if (voidMode === 'all') {
      setAction('You Voided All Products');
    } else {
      setAction(`You Voided ${count} Item${count !== 1 ? 's' : ''}`);
    }
    success('Selected products voided.');
  };

  const paymentIcons: Record<string, React.ReactNode> = {
    Cash: <Banknote className="h-5 w-5" />,
    'Debit Card': <CreditCard className="h-5 w-5" />,
    'E-wallet': <Wallet className="h-5 w-5" />,
    'Credit Card': <CreditCard className="h-5 w-5" />,
  };

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-ml-6 lg:-mr-8 lg:-my-8 flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors" style={{ height: 'calc(100vh - 56px)' }}>
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">POS Terminal</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Overall Total</p>
            <p className="text-2xl font-bold leading-none text-[#006a61] dark:text-[#7ef0cf]">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-0">
        <main className="flex-[1.05] min-w-0 flex flex-col overflow-hidden border-r border-slate-200 dark:border-white/10">
        {/* Search Bar */}
        <div className="px-6 pt-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 max-w-2xl">
            <div className={`relative min-w-0 transition-all duration-300 ${searchFocused ? 'flex-[1_1_100%]' : 'flex-1'}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                ref={barcodeRef}
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search product or scan barcode"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-transparent transition-all"
              />
            </div>

            <div className={`flex items-center gap-2 transition-all duration-300 shrink-0 ${searchFocused ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 h-[42px] w-[42px] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-colors" title={CATEGORIES.find(cat => cat.id === activeCategory)?.label ?? 'Categories'}>
                  <Filter className="h-4 w-4 text-[#006a61]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-xl">
                {CATEGORIES.map(cat => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setAction(`You Filtered ${cat.label}`);
                    }}
                    className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                      activeCategory === cat.id
                        ? 'bg-[#006a61]/10 text-[#006a61] dark:text-[#7ef0cf]'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-medium">{cat.label}</span>
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                      {cat.id === 'all'
                        ? `${cashierProducts.length}`
                        : `${cashierProducts.filter(p => p.category_id === cat.id).length}`}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => barcodeRef.current?.focus()}
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              aria-label="Focus barcode scan input"
              title="Scan barcode"
            >
              <Barcode className="h-4 w-4" />
            </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Product Grid */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Products</h2>
            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.map(product => {
                const cartLine = cart.find(l => l.product.product_id === product.product_id);
                const qty = cartLine?.quantity ?? 0;
                return (
                  <div
                    key={product.product_id}
                    className={`rounded-lg p-4 flex items-center justify-between gap-4 border transition-colors min-h-20 ${
                      qty > 0
                        ? 'border-[#006a61] bg-[#006a61]/5 dark:bg-[#006a61]/10'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide shrink-0">Stock</p>
                        <div className="overflow-hidden flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight product-marquee">{product.product_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{product.current_stock} available</span>
                        <span className="font-semibold text-[#006a61] dark:text-[#7ef0cf]">{formatCurrency(product.selling_price)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQty(product.product_id, qty - 1)}
                        className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-slate-900 dark:text-slate-100">{qty}</span>
                      <button
                        onClick={() => addProduct(product)}
                        className="h-9 w-9 rounded-md bg-[#006a61] flex items-center justify-center text-white hover:bg-[#005450] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-5 text-center py-12 text-slate-500 dark:text-slate-400 text-sm">No products found.</div>
              )}
            </div>
          </div>
        </div>
        </main>

        {/* Right Panel — Order Summary */}
        <aside className="w-[22rem] xl:w-[44rem] flex-shrink-0 bg-slate-50 dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-white/10 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">Current Order</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                  aria-label="Void transaction options"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-xl">
                <DropdownMenuItem
                  onClick={openVoidSelected}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  Choose product to void
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openVoidAll}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-rose-600 dark:text-rose-400"
                >
                  Void all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 text-xs py-8">No items added yet.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 w-full">
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[8%]" />
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[10%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-semibold text-left">Quantity</th>
                      <th className="px-3 py-3 font-semibold text-left">Unit</th>
                      <th className="px-3 py-3 font-semibold text-left">Product Name</th>
                      <th className="px-3 py-3 font-semibold text-right">Unit Price</th>
                      <th className="px-3 py-3 font-semibold text-right">Disc.</th>
                      <th className="px-3 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {cart.map((line) => (
                      <tr key={line.product.product_id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQty(line.product.product_id, line.quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-7 text-center font-semibold text-slate-900 dark:text-slate-100">{line.quantity}</span>
                            <button
                              onClick={() => updateQty(line.product.product_id, line.quantity + 1)}
                              className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-[#006a61] hover:text-white text-slate-600 dark:text-slate-400 transition-colors"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">pc</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{line.product.product_name}</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(line.product.selling_price)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">—</td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(line.product.selling_price * line.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 bg-gradient-to-b from-[#006a61]/5 dark:from-[#006a61]/10 to-transparent">
            <button
              onClick={() => {
                if (cart.length === 0) return;
                setAction(`Reviewing ${cart.length} item${cart.length !== 1 ? 's' : ''} — ${formatCurrency(grandTotal)}`);
                setShowConfirmation(true);
              }}
              disabled={cart.length === 0}
              className="w-full bg-[#006a61] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white font-bold py-3 rounded-lg text-sm hover:bg-[#005450] transition-colors"
            >
              Review Order
            </button>
          </div>

        {/* Receipt */}
            {receipt && (
              <div className="mx-5 mb-5 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Receipt</span>
                  <button onClick={() => window.print()} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                    <Printer className="h-3 w-3" /> Print
                  </button>
                </div>
                <div className="text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between"><span>ID</span><span className="font-mono text-slate-900 dark:text-slate-100">{receipt.transaction_id}</span></div>
                  <div className="flex justify-between"><span>Cashier</span><span>{receipt.cashier_name}</span></div>
                  <div className="flex justify-between"><span>Method</span><span>{receipt.payment_method}</span></div>
                </div>
                <div className="border-t border-slate-200 dark:border-white/10 pt-2 space-y-1">
                  {receipt.items.map(item => (
                    <div key={item.sales_item_id} className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300">{item.product_name} x{item.quantity}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-2 font-bold text-slate-900 dark:text-slate-100">
                  <span>Total</span>
                  <span className="text-[#006a61] dark:text-[#7ef0cf]">{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>
            )}
        </aside>
      </div>

      {/* Void Modal */}
      {showVoidModal && voidMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {voidMode === 'all' ? 'Void All Products' : 'Choose Product to Void'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {voidMode === 'all'
                    ? 'Confirm voiding all chosen products from the current order.'
                    : 'Select one or more products to void from the current order.'}
                </p>
              </div>
              <button
                onClick={() => { setShowVoidModal(false); setVoidMode(null); setVoidSelection([]); }}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="min-w-[900px] w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Select</th>
                      <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                      <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-950">
                    {cart.map(line => {
                      const checked = voidSelection.includes(line.product.product_id);
                      return (
                        <tr key={line.product.product_id} className="text-slate-700 dark:text-slate-300">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={voidMode === 'all' ? true : checked}
                              onChange={() => toggleVoidSelection(line.product.product_id)}
                              disabled={voidMode === 'all'}
                              className="accent-[#006a61]"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{line.quantity}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{line.product.product_name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(line.product.selling_price)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(line.product.selling_price * line.quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  {voidMode === 'all'
                    ? 'Void all these chosen products from the current order?'
                    : 'Selected items will be removed from the current order.'}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowVoidModal(false); setVoidMode(null); setVoidSelection([]); }}
                    className="rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={commitVoidSelection}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
                  >
                    {voidMode === 'all' ? 'Void All Chosen Products' : 'Void Selected Products'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm Order</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Review all products and payment details before completing the sale.</p>
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="min-w-[900px] w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-left font-semibold">Unit</th>
                      <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                      <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Discount</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-950">
                    {cart.map(line => (
                      <tr key={line.product.product_id} className="text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{line.quantity}</td>
                        <td className="px-4 py-3">pc</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{line.product.product_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(line.product.selling_price)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">—</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(line.product.selling_price * line.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'Debit Card', 'E-wallet'] as PaymentMethod[]).map(method => (
                      <button
                        key={method}
                        onClick={() => { setPaymentMethod(method); setPaymentConfirmed(false); }}
                        className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-[10px] font-semibold transition-colors ${
                          paymentMethod === method
                            ? 'bg-[#006a61] text-white border-[#006a61]'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        {paymentIcons[method]}
                        {method}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'Cash' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount tendered</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountTendered}
                        onChange={e => setAmountTendered(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#006a61] text-right transition-colors"
                      />
                      {tendered > 0 && (
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
                          <span>Change</span>
                          <span className="text-[#006a61] dark:text-[#7ef0cf] font-semibold">{formatCurrency(changeDue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod !== 'Cash' && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentConfirmed}
                        onChange={e => setPaymentConfirmed(e.target.checked)}
                        className="accent-[#006a61]"
                      />
                      Payment confirmed
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Summary</h3>
                  <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Tax 10%</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Total</span>
                    <span className="text-lg font-bold text-[#006a61] dark:text-[#7ef0cf]">{formatCurrency(grandTotal)}</span>
                  </div>
                  <button
                    onClick={completeSale}
                    className="w-full bg-[#006a61] text-white font-bold py-3 rounded-lg text-sm hover:bg-[#005450] transition-colors mt-2"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
