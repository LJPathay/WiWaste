import { useMemo, useRef, useState, useEffect } from 'react';
import { 
  Barcode, Search, Trash2, CreditCard, Wallet, Banknote, Plus, Minus, 
  User, Receipt, Clock, ArrowRight, Printer, CheckCircle2,
  Archive, RotateCcw, Percent, Search as SearchIcon, MoreHorizontal, X, AlertCircle
} from 'lucide-react';
import { Toast, useToast } from '../../components/ui/Toast';
import { useHeaderAction } from '../../components/layout/HeaderLabelProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useNavigate } from 'react-router';
import {
  cashierProducts,
  createTransactionId,
  formatCurrency,
  type CashierProduct,
  type PaymentMethod,
  type SalesTransaction,
} from '../../utils/cashierData';
import { clearStoredSession, getStoredSession } from '../../utils/mockAuthAndFeatures';

interface CartLine {
  product: CashierProduct;
  quantity: number;
  discountPct?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'CAT-GROCERY', label: 'Grocery' },
  { id: 'CAT-BEVERAGE', label: 'Beverages' },
  { id: 'CAT-SNACK', label: 'Snacks' },
  { id: 'CAT-HOUSEHOLD', label: 'Household' },
  { id: 'CAT-PHARMA', label: 'Pharmacy' },
  { id: 'CAT-PERSONAL', label: 'Personal Care' },
];

export function POSTerminal() {
  const { toasts, dismiss, success, error } = useToast();
  const { setAction } = useHeaderAction();
  const session = getStoredSession();
  const navigate = useNavigate();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'GCash' | 'Maya'>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  
  // Modals & States
  const [showCheckout, setShowCheckout] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  
  const [receipt, setReceipt] = useState<SalesTransaction | null>(null);
  const [showPrintedReceipt, setShowPrintedReceipt] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const [currentTxnId, setCurrentTxnId] = useState(createTransactionId());
  const [globalDiscountPct, setGlobalDiscountPct] = useState(0);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout) {
          setShowCheckout(true);
        } else if (showCheckout && tendered >= grandTotal) {
          completePayment();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        setShowDiscountModal(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCheckout(false);
        setShowDiscountModal(false);
        setShowReturnModal(false);
        setShowVoidModal(false);
        setShowExitConfirm(false);
        setSearch('');
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || document.querySelector('[role="dialog"]')) {
        return;
      }
      barcodeRef.current?.focus();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [cart.length, showCheckout, /* grandTotal, tendered - computed later but conceptually needed */]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = cart.reduce((sum, l) => sum + l.product.selling_price * l.quantity, 0);
  const discountAmount = cart.reduce((sum, l) => sum + (l.product.selling_price * l.quantity * (l.discountPct || 0)), 0); 
  const tax = (subtotal - discountAmount) * 0.12; // 12% VAT
  const grandTotal = (subtotal - discountAmount) + tax;
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
      setAction(`Added ${product.product_name} ×${newQty} to cart`);
      if (existing) {
        return prev.map(l =>
          l.product.product_id === product.product_id
            ? { ...l, quantity: newQty }
            : l
        );
      }
      return [...prev, { product, quantity: 1, discountPct: 0 }];
    });
    setSearch('');
    barcodeRef.current?.focus();
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) {
      setCart(prev => prev.filter(l => l.product.product_id !== productId));
      return;
    }
    const line = cart.find(l => l.product.product_id === productId);
    if (line) {
      const capped = Math.min(qty, line.product.current_stock);
      setCart(prev =>
        prev.map(l =>
          l.product.product_id === productId
            ? { ...l, quantity: capped }
            : l
        )
      );
    }
    barcodeRef.current?.focus();
  };

  const removeProduct = (productId: string) => {
    setCart(prev => prev.filter(l => l.product.product_id !== productId));
    barcodeRef.current?.focus();
  };

  const applyDiscount = (pct: number) => {
    if (pct > 0 && !selectedLineId) {
      error('Please select an item first.');
      return;
    }
    
    if (selectedLineId) {
      setCart(prev => prev.map(l => l.product.product_id === selectedLineId ? { ...l, discountPct: pct } : l));
      success(`Applied ${pct * 100}% discount to item`);
    } else {
      // Clear discount (pct == 0) clears all selected or global? 
      // The button says "Clear Discount". Let's clear all.
      setCart(prev => prev.map(l => ({ ...l, discountPct: 0 })));
      success('Cleared discounts');
    }
    setShowDiscountModal(false);
    barcodeRef.current?.focus();
  };

  const voidItem = () => {
    if (!selectedLineId) return;
    setCart(prev => prev.filter(l => l.product.product_id !== selectedLineId));
    setSelectedLineId(null);
    setShowVoidModal(false);
    success('Item voided.');
    barcodeRef.current?.focus();
  };

  const voidTransaction = () => {
    setCart([]);
    setGlobalDiscountPct(0);
    setSelectedLineId(null);
    success('Transaction voided.');
    barcodeRef.current?.focus();
  };

  const completePayment = () => {
    if (cart.length === 0) { error('Add at least one product.'); return; }
    if (paymentMethod === 'Cash' && tendered < grandTotal) { error('Amount tendered must cover the total.'); return; }

    const completedReceipt: SalesTransaction = {
      transaction_id: currentTxnId,
      user_id: session?.id ?? 'cashier-001',
      cashier_name: session?.name ?? 'Carlo Reyes',
      total_amount: grandTotal,
      transaction_date: new Date().toLocaleString(),
      payment_method: paymentMethod as PaymentMethod,
      amount_tendered: paymentMethod === 'Cash' ? tendered : null,
      change_due: paymentMethod === 'Cash' ? changeDue : null,
      status: 'Completed',
      items: cart.map((l, i) => ({
        sales_item_id: `SI-${Date.now()}-${i + 1}`,
        transaction_id: currentTxnId,
        product_id: l.product.product_id,
        product_name: l.product.product_name,
        quantity: l.quantity,
        unit_price: l.product.selling_price,
        subtotal: l.product.selling_price * l.quantity * (1 - (l.discountPct || 0)),
      })),
    };
    setReceipt(completedReceipt);
    setShowCheckout(false);
    setAction(`Sale Complete — ${formatCurrency(grandTotal)}`);
  };

  const startNewTransaction = () => {
    setCart([]);
    setAmountTendered('');
    setReceipt(null);
    setShowPrintedReceipt(false);
    setSelectedLineId(null);
    setCurrentTxnId(createTransactionId());
    barcodeRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] dark:bg-slate-900 text-[#475569] dark:text-slate-300 font-sans">
      <Toast toasts={toasts} onDismiss={dismiss} />

      {/* GLOBAL HEADER */}
      <header className="h-14 bg-white dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-20 relative">
        <div className="flex items-center gap-6">
          <img src="/images/LOGO_POS.png" alt="WiWaste POS" className="h-8 object-contain" />
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 hidden xl:block"></div>
          
          <div className="hidden xl:flex items-center gap-6 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <div className="flex items-center gap-1.5">
              <span>Register:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">01</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Shift:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">Morning</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Walk-in</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-600"></div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 ml-2">
            {session?.name ?? 'Carlo Reyes'}
          </div>
          
          <button 
            onClick={() => {
              if (cart.length > 0) {
                setShowExitConfirm(true);
              } else {
                clearStoredSession();
                navigate('/login');
              }
            }}
            className="text-xs font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors ml-4 shadow-sm flex items-center gap-1.5"
          >
            Exit POS <span className="bg-slate-100 dark:bg-slate-700 text-[9px] px-1 rounded text-slate-400">Esc</span>
          </button>
        </div>
      </header>

      {/* MAIN 2-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* =========================================================
            LEFT PANEL: PRODUCTS (~60%)
            ========================================================= */}
        <section className="flex-[1.5] min-w-[500px] flex flex-col bg-[#F8FAFC] dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-700">
          {/* Search & Categories */}
          <div className="p-4 bg-white dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-700 shrink-0 relative z-10 shadow-sm">
            <div className="flex gap-2 mb-3">
              <div className="relative w-[75%]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  ref={barcodeRef}
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search product or scan barcode... (F2)"
                  className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all shadow-inner"
                />
              </div>
              <button 
                className="w-[25%] flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl text-sm font-bold hover:bg-[#F8FAFC] dark:hover:bg-slate-600 hover:border-[#0F766E] hover:text-[#0F766E] transition-all shrink-0 shadow-sm"
                onClick={() => barcodeRef.current?.focus()}
              >
                <Barcode className="w-5 h-5" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>
            
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#0F766E] text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-600 hover:border-[#0F766E]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>


          </div>

          {/* Product Grid - More compact to fit 8-15 */}
          <div className="flex-1 overflow-y-auto p-4 hide-scrollbar dark:bg-slate-900">
            <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
              {filteredProducts.map(product => (
                <div 
                  key={product.product_id}
                  onClick={() => addProduct(product)}
                  className="flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-[#E5E7EB] dark:border-slate-700 p-2 shadow-sm hover:shadow-md hover:border-[#0F766E] cursor-pointer transition-all active:scale-[0.97] min-h-[70px]"
                >
                  
                  <div className="flex-1 flex flex-col justify-between pt-1">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 mb-1">{product.product_name}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">{formatCurrency(product.selling_price)}</p>
                      <button className="bg-[#16A34A] text-white w-5 h-5 rounded flex items-center justify-center hover:bg-[#15803d]">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No products match your search</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            RIGHT PANEL: CURRENT TRANSACTION (~40%)
            ========================================================= */}
        <section className="flex-1 min-w-[420px] max-w-[550px] flex flex-col bg-white dark:bg-slate-800 z-10">
          
          {/* Transaction Header */}
          <div className="px-6 py-3 border-b border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Transaction</span>
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">#POS-2026-{currentTxnId.slice(-6)}</span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[25%_45%_15%_15%] gap-2 px-6 py-2 border-b border-[#E5E7EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            <div>Qty</div>
            <div>Item</div>
            <div className="text-right">Price</div>
            <div className="text-right pr-6">Total</div>
          </div>

          {/* Cart Table with Zebra Spacing */}
          <div className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-slate-800">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <Receipt className="w-16 h-16 opacity-20" />
                <p className="font-medium text-slate-400 text-sm">No items in current transaction.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {cart.map((line, idx) => {
                  const isSelected = selectedLineId === line.product.product_id;
                  return (
                  <div 
                    key={line.product.product_id} 
                    onClick={() => setSelectedLineId(line.product.product_id)}
                    className={`grid grid-cols-[25%_45%_15%_15%] gap-2 px-6 py-3 items-center group transition-colors border-b cursor-pointer ${
                      isSelected 
                        ? 'bg-[#E8F7F2] dark:bg-[#0F766E]/20 border-l-4 border-l-[#0F766E] border-b-[#0F766E]/20' 
                        : idx % 2 === 0 
                          ? 'bg-white dark:bg-slate-800 border-l-4 border-l-transparent border-b-slate-100 dark:border-b-slate-700' 
                          : 'bg-slate-50 dark:bg-slate-750 border-l-4 border-l-transparent border-b-slate-100 dark:border-b-slate-700'
                    } hover:bg-slate-100 dark:hover:bg-slate-700`}
                  >
                    
                    {/* Qty Control */}
                    <div className="flex items-center justify-center w-[90px] bg-white dark:bg-slate-700 rounded-md border border-[#E5E7EB] dark:border-slate-600 overflow-hidden shadow-sm" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => updateQty(line.product.product_id, line.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) updateQty(line.product.product_id, val);
                          else if (e.target.value === '') updateQty(line.product.product_id, 0);
                        }}
                        className="w-full text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-600"
                      />
                      <button 
                        onClick={() => updateQty(line.product.product_id, line.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#0F766E] bg-[#E8F7F2] hover:bg-[#d1f4e8] transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Product Name & Barcode */}
                    <div className="pr-2 flex items-center gap-3 overflow-hidden">
                      <div className="truncate">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-snug">{line.product.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                            {line.product.barcode}
                          </p>
                          {line.discountPct && line.discountPct > 0 ? (
                            <span className="text-[9px] font-bold text-[#0F766E] bg-[#0F766E]/10 px-1 rounded">-{line.discountPct * 100}%</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatCurrency(line.product.selling_price)}
                    </div>

                    {/* Subtotal & Remove Button */}
                    <div className="text-right flex items-center justify-end gap-2 relative pr-6">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:opacity-0 transition-opacity">
                        {formatCurrency(line.product.selling_price * line.quantity * (1 - (line.discountPct || 0)))}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeProduct(line.product.product_id); }}
                        className="absolute right-4 w-7 h-7 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="bg-white dark:bg-slate-800 border-t border-[#E5E7EB] dark:border-slate-700 p-5 shrink-0">
            <div className="space-y-1.5 mb-3 px-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 font-medium">
                <span>Items</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 font-medium">
                <span>Discount</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 font-medium">
                <span>VAT (12%)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(tax)}</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-[#E5E7EB] dark:bg-slate-700 my-3"></div>
            
            <div className="flex justify-between items-center mb-5 px-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Total Due</span>
              <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(grandTotal)}</span>
            </div>

            <button 
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl text-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 relative
                ${cart.length === 0 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-[#16A34A] hover:bg-[#15803d]'}`}
            >
              Proceed to Checkout
              <span className="absolute right-4 text-[10px] font-bold bg-white/20 px-2 py-1 rounded text-white/90">F4</span>
            </button>
          </div>
        </section>

      </div>

      {/* =========================================================
          SMALL FOOTER (Quick Actions)
          ========================================================= */}
      <footer className="h-14 bg-white dark:bg-slate-800 border-t border-[#E5E7EB] dark:border-slate-700 shrink-0 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowReturnModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E] transition-all"
          >
            <ArrowRight className="w-4 h-4" /> Returns
          </button>
          <button 
            onClick={() => setShowDiscountModal(true)}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all relative ${selectedLineId ? 'text-slate-600 dark:text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]' : 'text-slate-400 cursor-not-allowed opacity-50'}`}
          >
            <Percent className="w-4 h-4" /> Discount
            <span className="ml-1 text-[9px] text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-600 px-1 rounded">F9</span>
          </button>
          <button 
            onClick={() => selectedLineId && setShowVoidModal(true)}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${selectedLineId ? 'text-slate-600 dark:text-slate-300 hover:border-red-500 hover:text-red-600' : 'text-slate-400 cursor-not-allowed opacity-50'}`}
          >
            <Trash2 className="w-4 h-4" /> Void Item
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all">
                <MoreHorizontal className="w-4 h-4" /> More Actions
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 shadow-lg rounded-xl mb-2">
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-red-600 dark:text-red-400 py-3" onClick={voidTransaction} disabled={cart.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" /> Void Transaction
              </DropdownMenuItem>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 w-full" />
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 py-3" onClick={() => success('Drawer opened')}>
                <Archive className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Open Drawer
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 py-3" onClick={() => success('Sale placed on hold')}>
                <Clock className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Hold Sale
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 py-3" onClick={() => success('Sale recalled')}>
                <RotateCcw className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Recall Sale
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 py-3" onClick={() => success('Price check active')}>
                <SearchIcon className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Price Check
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 py-3" onClick={() => success('Receipt reprinted')}>
                <Printer className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Reprint Receipt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </footer>

      {/* =========================================================
          MODALS
          ========================================================= */}
      
      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#0F766E]" /> Apply Discount
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => applyDiscount(0.05)} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]">5% OFF</button>
              <button onClick={() => applyDiscount(0.10)} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]">10% OFF</button>
              <button onClick={() => applyDiscount(0.20)} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold col-span-2 text-[#0F766E] bg-[#E8F7F2] dark:bg-[#0F766E]/20 border-[#0F766E]/30">20% Senior/PWD</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDiscountModal(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel (Esc)</button>
              <button onClick={() => applyDiscount(0)} className="flex-1 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Clear Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#0F766E]" /> Process Return
            </h3>
            <p className="text-sm text-slate-500 mb-4">Scan the receipt barcode or enter transaction ID to process a return.</p>
            <input autoFocus type="text" placeholder="Transaction ID..." className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg mb-6 focus:outline-none focus:border-[#0F766E]" />
            <div className="flex gap-2">
              <button onClick={() => setShowReturnModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button onClick={() => { success('Return processed'); setShowReturnModal(false); }} className="flex-1 py-2 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]">Find Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Void Selected Item
            </h3>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to void this item from the transaction?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowVoidModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button onClick={voidItem} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Yes, Void Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Exit POS
            </h3>
            <p className="text-sm text-slate-600 mb-6">You have items in your current transaction. If you exit now, this transaction will be lost.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button 
                onClick={() => {
                  clearStoredSession();
                  navigate('/login');
                }} 
                className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
              >
                Exit POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex">
            
            {/* Left side: Totals */}
            <div className="w-[40%] bg-[#0F766E] border-r border-[#E5E7EB] p-8 flex flex-col justify-between text-white">
              <div>
                <h2 className="text-xl font-bold mb-6 uppercase tracking-wider text-white/90">Complete Payment</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-white/80 text-sm font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {globalDiscountPct > 0 && (
                    <div className="flex justify-between items-center text-white/80 text-sm font-medium">
                      <span>Discount ({globalDiscountPct * 100}%)</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-white/80 text-sm font-medium">
                    <span>VAT (12%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="w-full h-px bg-white/20 my-4"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Grand Total</span>
                    <span className="text-5xl font-black text-white tracking-tight">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <button 
                  onClick={() => {
                    setShowCheckout(false);
                    barcodeRef.current?.focus();
                  }}
                  className="px-6 py-3 text-sm font-bold text-white bg-white/10 rounded-xl hover:bg-white/20 transition-colors shadow-sm"
                >
                  Cancel Checkout (Esc)
                </button>
              </div>
            </div>

            {/* Right side: Payment Method & Input */}
            <div className="w-[60%] p-8 bg-white flex flex-col">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Payment Method</label>
              
              <div className="grid grid-cols-5 gap-2 mb-6">
                {['Cash', 'GCash', 'Maya', 'Debit Card', 'Credit Card'].map((method) => (
                  <button 
                    key={method}
                    onClick={() => setPaymentMethod(method as PaymentMethod | 'GCash' | 'Maya')}
                    className={`py-3 px-1 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-2 transition-all text-center
                      ${paymentMethod === method 
                        ? 'bg-[#E8F7F2] text-[#0F766E] border-[#0F766E] shadow-sm' 
                        : 'bg-white text-slate-600 border-[#E5E7EB] hover:bg-[#F8FAFC]'}`}
                  >
                    {method === 'Cash' && <Banknote className="w-5 h-5" />}
                    {(method === 'GCash' || method === 'Maya') && <Wallet className="w-5 h-5" />}
                    {(method.includes('Card')) && <CreditCard className="w-5 h-5" />}
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' ? (
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Amount Tendered</label>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₱</span>
                    <input
                      type="number"
                      autoFocus
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-3xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
                    />
                  </div>
                  
                  {/* Preset Buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmountTendered(amt.toString())}
                        className="py-3 bg-white border border-[#E5E7EB] text-slate-700 text-sm font-bold rounded-xl hover:border-[#0F766E] hover:text-[#0F766E] transition-colors shadow-sm"
                      >
                        ₱{amt}
                      </button>
                    ))}
                    <button
                        onClick={() => setAmountTendered(Math.ceil(grandTotal).toString())}
                        className="py-3 bg-[#E8F7F2] border border-[#0F766E]/30 text-[#0F766E] text-sm font-bold rounded-xl hover:bg-[#d1f4e8] transition-colors shadow-sm"
                      >
                        Exact Amount
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-xl p-6 mb-4 bg-[#F8FAFC]">
                  <CreditCard className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600 text-center">
                    Process payment via {paymentMethod} terminal.
                  </p>
                </div>
              )}

              <button 
                onClick={completePayment}
                className="w-full py-4 text-lg font-bold text-white bg-[#0F766E] rounded-xl shadow-md hover:bg-[#0d615b] transition-all relative"
              >
                Complete Payment
                <span className="absolute right-4 text-[10px] bg-white/20 px-2 py-1 rounded">F4</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYMENT SUCCESS SCREEN
          ========================================================= */}
      
      {receipt && !showPrintedReceipt && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center pt-10 pb-8 px-8">
            <div className="w-20 h-20 bg-[#16A34A] text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 mb-2">Payment Successful</h2>
            <div className="flex items-center gap-1.5 text-[#16A34A] font-bold text-sm mb-8 bg-[#E8F7F2] px-3 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Transaction Saved</span>
            </div>
            
            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Transaction Number</span>
                <span className="font-bold text-slate-800">#POS-2026-{receipt.transaction_id.slice(-6)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Amount Paid</span>
                <span className="font-bold text-slate-800">{formatCurrency(receipt.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Change</span>
                <span className="font-bold text-slate-800">{formatCurrency(receipt.change_due ?? 0)}</span>
              </div>
              <div className="flex justify-center items-center text-sm pt-2">
                <span className="font-bold text-[#0F766E]">Inventory Updated Successfully</span>
              </div>
            </div>

            <div className="flex w-full gap-4">
              <button 
                onClick={() => setShowPrintedReceipt(true)}
                className="flex-1 py-4 text-sm font-bold text-[#0F766E] bg-white border-2 border-[#0F766E] rounded-xl hover:bg-[#E8F7F2] transition-colors"
              >
                Print Receipt
              </button>
              <button 
                onClick={startNewTransaction}
                className="flex-1 py-4 text-sm font-bold text-white bg-[#0F766E] rounded-xl shadow-md hover:bg-[#0d615b] transition-all"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          THERMAL RECEIPT OVERLAY
          ========================================================= */}
          
      {showPrintedReceipt && receipt && (
        <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl w-[320px] font-mono text-xs text-black flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto p-6 receipt-print-area hide-scrollbar">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold mb-1">WiWaste Store</h1>
                <p>123 Retail Avenue, Metro Manila</p>
                <p>VAT REG TIN: 000-123-456-000</p>
              </div>

              <div className="mb-4">
                <div className="flex justify-between">
                  <span>Txn:</span>
                  <span>#POS-2026-{receipt.transaction_id.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{receipt.transaction_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{receipt.cashier_name}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-black py-2 mb-4">
                <div className="flex justify-between font-bold mb-2">
                  <span className="w-8">Qty</span>
                  <span className="flex-1">Item</span>
                  <span className="w-16 text-right">Total</span>
                </div>
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between mb-1">
                    <span className="w-8">{item.quantity}</span>
                    <span className="flex-1 truncate pr-2">{item.product_name}</span>
                    <span className="w-16 text-right">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receipt.total_amount - (receipt.total_amount * 0.12))}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (12%)</span>
                  <span>{formatCurrency(receipt.total_amount * 0.12)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-black">
                  <span>Grand Total</span>
                  <span>{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-black pt-2 mb-6 space-y-1">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{receipt.payment_method}</span>
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

              <div className="text-center text-[10px]">
                <p className="font-bold mb-1">Thank you for shopping with us!</p>
                <p>Please come again.</p>
                <p className="mt-4">Powered by WiWaste POS</p>
              </div>
            </div>
            
            {/* Non-printed actions */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex gap-2">
              <button 
                onClick={startNewTransaction}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#0F766E] rounded hover:bg-[#0d615b]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
