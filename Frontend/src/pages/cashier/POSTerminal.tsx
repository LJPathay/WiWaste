import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { 
  Barcode, Search, Trash2, CreditCard, Wallet, Banknote, Plus, Minus, 
  User, Receipt, Clock, ArrowRight, CheckCircle2,
  Percent, AlertCircle, Monitor, Tablet, Smartphone, X, Package
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { Toast, useToast } from '../../components/ui/Toast';
import { useHeaderAction } from '../../components/layout/HeaderLabelProvider';

import { useNavigate } from 'react-router-dom';
import {
  cashierProducts,
  createTransactionId,
  formatCurrency,
  type CashierProduct,
  type PosPaymentMethod,
  type SalesTransaction,
} from '../../utils/cashierData';
import { useAuth } from '../../hooks/useAuth';
import { products as productsApi, sales as salesApi, type CreateSalePayload } from '../../services/api';
import {
  type CartLine,
  type HotkeyAction,
  DEFAULT_HOTKEYS,
  apiProductToCashier,
} from './POSConstants';
import { ReceiptPreview } from './ReceiptPreview';

export function POSTerminal() {
  const { toasts, dismiss, success, error } = useToast();
  const { setAction } = useHeaderAction();
  const { user: session, logout } = useAuth();
  const navigate = useNavigate();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  
  // Card payment fields
  const [cardNumber, setCardNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [chargedAmount, setChargedAmount] = useState('');
  
  // E-Wallet payment fields
  const [accountDetails, setAccountDetails] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  // PLU buffer for manual keyboard entry (secondary to barcode scanning)
  const [pluBuffer, setPluBuffer] = useState('');
  const pluTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // HID barcode scanner buffer. USB/Bluetooth HID scanners act as keyboards and emit
  // barcode digits as rapid keystrokes terminated by Enter. This listener runs on
  // `document` so a scan works without the cashier clicking the barcode field first.
  const scannerBufferRef = useRef('');
  const scannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SCANNER_GAP_MS = 100;

  // Lookup / checkout loading states keep the UI responsive and prevent duplicate submits.
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  
  // Modals & States
  const [showCheckout, setShowCheckout] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [fixedDiscountInput, setFixedDiscountInput] = useState('');
  const [seniorPwdInfo, setSeniorPwdInfo] = useState<{ name: string; id: string } | null>(null);
  const [showSeniorPwdModal, setShowSeniorPwdModal] = useState(false);
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState(false);
  const [overridePriceInput, setOverridePriceInput] = useState('');
  const [overrideReasonInput, setOverrideReasonInput] = useState('');
  
  const [receipt, setReceipt] = useState<SalesTransaction | null>(null);
  const isVatRegistered = false; // Non-VAT registered micro-enterprise by default
  
  // Tracks units sold this session so the table/cart show live stock without a page refresh
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const [currentTxnId, setCurrentTxnId] = useState(createTransactionId());
  const hotkeys: Record<HotkeyAction, string> = (() => {
    try {
      const saved = localStorage.getItem('pos_hotkeys');
      return saved ? { ...DEFAULT_HOTKEYS, ...JSON.parse(saved) } : DEFAULT_HOTKEYS;
    } catch { return DEFAULT_HOTKEYS; }
  })();
  const deviceType = useMemo<'desktop' | 'tablet' | 'mobile'>(() => {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      return window.innerWidth >= 768 ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }, []);

  const hasKeyboard = useMemo(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const [hotkeysEnabled, setHotkeysEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pos_hotkeys_enabled');
      return saved !== null ? JSON.parse(saved) : window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch { return true; }
  });
  const toggleHotkeys = () => {
    const next = !hotkeysEnabled;
    setHotkeysEnabled(next);
    localStorage.setItem('pos_hotkeys_enabled', JSON.stringify(next));
    if (next) {
      success('Hotkeys enabled');
    } else {
      success('Hotkeys disabled');
    }
  };

  const addProduct = useCallback((product: CashierProduct, qtyOverride?: number) => {
    const desiredQty = qtyOverride ?? 1;
    const available = Math.max(0, product.current_stock - (stockAdjustments[product.product_id] ?? 0));
    setCart(prev => {
      const existing = prev.find(l => l.product.product_id === product.product_id);
      const newQty = existing
        ? Math.min(existing.quantity + desiredQty, available)
        : Math.min(desiredQty, available);
      setAction(`Added ${product.product_name} ×${newQty} to cart`);
      if (existing) {
        return prev.map(l =>
          l.product.product_id === product.product_id
            ? { ...l, quantity: newQty }
            : l
        );
      }
      return [...prev, { product, quantity: newQty, discountPct: 0 }];
    });
    setBarcode('');
  }, [stockAdjustments, setAction, setCart, setBarcode]);

  const handlePluLookup = useCallback(async (code: string) => {
    setIsLookingUp(true);
    try {
      const localMatch = cashierProducts.find(
        p => p.plu_code === code || p.barcode === code || p.product_id.replace('P-', '') === code
      );

      if (localMatch) {
        addProduct(localMatch);
      } else {
        try {
          const product: CashierProduct = apiProductToCashier(await productsApi.lookup(code));
          addProduct(product);
        } catch {
          error(`Product not found: ${code}`);
          setPluBuffer('');
          barcodeRef.current?.focus();
          return;
        }
      }

      setBarcode('');
      setPluBuffer('');
      barcodeRef.current?.focus();
    } finally {
      setIsLookingUp(false);
    }
  }, [addProduct, error, setBarcode, setPluBuffer, barcodeRef]);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty < 1) {
      setCart(prev => prev.filter(l => l.product.product_id !== productId));
      return;
    }
    const line = cart.find(l => l.product.product_id === productId);
    if (line) {
      const available = Math.max(0, line.product.current_stock - (stockAdjustments[line.product.product_id] ?? 0));
      const capped = Math.min(qty, available);
      setCart(prev =>
        prev.map(l =>
          l.product.product_id === productId
            ? { ...l, quantity: capped }
            : l
        )
      );
    }
  }, [cart, stockAdjustments, setCart]);

  const removeProduct = useCallback((productId: string) => {
    setCart(prev => prev.filter(l => l.product.product_id !== productId));
  }, [setCart]);

  // Totals are derived straight from the cart on every render.
  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = cart.reduce((sum, l) => sum + l.product.selling_price * l.quantity, 0);
  const discountAmount = cart.reduce((sum, l) => sum + (l.product.selling_price * l.quantity * (l.discountPct || 0)) + (l.discountAmount || 0), 0);
  const tax = isVatRegistered ? (subtotal - discountAmount) * 0.12 : 0;
  const grandTotal = (subtotal - discountAmount) + tax;
  const tendered = Number(amountTendered || 0);
  const changeDue = paymentMethod === 'Cash' ? Math.max(0, tendered - grandTotal) : 0;

  const openCheckout = useCallback(() => {
    setChargedAmount(grandTotal.toFixed(2));
    setAmountPaid(grandTotal.toFixed(2));
    setShowCheckout(true);
  }, [grandTotal]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hotkeysEnabled) return;
      const isBarcodeFocused = document.activeElement === barcodeRef.current;

      if (e.key === hotkeys.focusSearch) {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === hotkeys.selectFirstQueue && !isBarcodeFocused) {
        if (cart.length > 0) {
          e.preventDefault();
          setSelectedLineId(prev => prev ? prev : cart[0].product.product_id);
        }
      } else if (e.key === hotkeys.selectNextItem && selectedLineId && !isBarcodeFocused) {
        e.preventDefault();
        const idx = cart.findIndex(l => l.product.product_id === selectedLineId);
        if (idx < cart.length - 1) setSelectedLineId(cart[idx + 1].product.product_id);
      } else if (e.key === hotkeys.selectPrevItem && selectedLineId && !isBarcodeFocused) {
        e.preventDefault();
        const idx = cart.findIndex(l => l.product.product_id === selectedLineId);
        if (idx > 0) setSelectedLineId(cart[idx - 1].product.product_id);
      } else if (e.key === hotkeys.checkout) {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout) openCheckout();
      } else if (e.key === hotkeys.discount) {
        e.preventDefault();
        setShowDiscountModal(true);
      } else if (e.key === hotkeys.voidItem) {
        e.preventDefault();
        if (selectedLineId) setShowVoidModal(true);
      } else if (e.key === hotkeys.unqueue && !isBarcodeFocused) {
        if (selectedLineId) {
          e.preventDefault();
          const line = cart.find(l => l.product.product_id === selectedLineId);
          if (line) {
            if (line.quantity > 1) {
              updateQty(selectedLineId, line.quantity - 1);
            } else {
              removeProduct(selectedLineId);
              setSelectedLineId(null);
            }
          }
        }
      } else if (e.key === hotkeys.closeModal) {
        e.preventDefault();
        setShowCheckout(false);
        setShowDiscountModal(false);
        setShowReturnModal(false);
        setShowVoidModal(false);
        setShowExitConfirm(false);
        setShowSeniorPwdModal(false);
        setShowPriceOverrideModal(false);
        setBarcode('');
        setPluBuffer('');
      } else if (document.activeElement !== barcodeRef.current) {
        // ── PLU Quick-Code digit entry ──
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setPluBuffer(prev => {
            const next = prev + e.key;
            if (pluTimerRef.current) clearTimeout(pluTimerRef.current);
            pluTimerRef.current = setTimeout(() => {
              handlePluLookup(next);
            }, 300);
            return next;
          });
          return;
        }
        if (e.key === 'Enter' && pluBuffer.length > 0) {
          e.preventDefault();
          if (pluTimerRef.current) clearTimeout(pluTimerRef.current);
          handlePluLookup(pluBuffer);
          return;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cart, showCheckout, hotkeys, selectedLineId, hotkeysEnabled, addProduct, handlePluLookup, pluBuffer, updateQty, removeProduct, openCheckout]);

  /**
   * HID barcode scanner listener.
   *
   * USB / Bluetooth HID scanners present as keyboards and emit barcode digits as
   * rapid keystrokes terminated by Enter. This listener runs on `document` so a
   * scan works without the cashier clicking the barcode field first.
   */
  useEffect(() => {
    const handleScannerKey = (e: KeyboardEvent) => {
      // Don't intercept when the barcode field is focused — its own onChange/Enter
      // handling owns that path.
      if (document.activeElement === barcodeRef.current) return;
      // Don't intercept while a modal is open or hotkey recording is in progress.
      if (showCheckout || showDiscountModal || showReturnModal || showVoidModal || showSeniorPwdModal || showPriceOverrideModal || showExitConfirm) return;
      // Ignore modifier-only and navigation keys.
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (e.key.length !== 1) return;

      scannerBufferRef.current = scannerBufferRef.current + e.key;
      if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
      scannerTimerRef.current = setTimeout(() => {
        const code = scannerBufferRef.current;
        scannerBufferRef.current = '';
        if (code.length > 0) {
          void handlePluLookup(code);
        }
      }, SCANNER_GAP_MS);
    };

    document.addEventListener('keydown', handleScannerKey);
    return () => document.removeEventListener('keydown', handleScannerKey);
  }, [showCheckout, showDiscountModal, showReturnModal, showVoidModal, showSeniorPwdModal, showPriceOverrideModal, showExitConfirm, handlePluLookup]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-focus the barcode input when the POS loads so a USB scanner works immediately
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Payment method configuration
  const paymentMethods = [
    { id: 'Cash' as PosPaymentMethod, icon: Banknote, label: 'CASH', sublabel: '' },
    { id: 'Card' as PosPaymentMethod, icon: CreditCard, label: 'CARD', sublabel: '' },
    { id: 'E-Wallet' as PosPaymentMethod, icon: Wallet, label: 'E-WALLET', sublabel: '' },
  ] as const;

  // Card amount match check
  const isCardAmountMatch = Math.abs(Number(chargedAmount || grandTotal.toFixed(2)) - grandTotal) < 0.01;
  // E-Wallet amount match check
  const isEwalletAmountMatch = Math.abs(Number(amountPaid || grandTotal.toFixed(2)) - grandTotal) < 0.01;

  // Quick amounts for cash: ₱200, ₱500, ₱1,000
  const quickAmounts = [200, 500, 1000];

  // Complete button enabled state
  const isCompleteEnabled = paymentMethod === 'Cash'
    ? Number(amountTendered) >= grandTotal
    : paymentMethod === 'Card'
      ? transactionRef.trim() !== '' && cardNumber.length >= 4 && isCardAmountMatch
      : accountDetails.trim() !== '' && transactionRef.trim() !== '' && isEwalletAmountMatch;

  const applyDiscount = (pct: number, fixedAmount?: number) => {
    if (pct > 0 && !selectedLineId && !fixedAmount) {
      error('Please select an item first.');
      return;
    }
    
    if (selectedLineId) {
      if (fixedAmount !== undefined) {
        setCart(prev => prev.map(l => l.product.product_id === selectedLineId ? { ...l, discountAmount: fixedAmount, discountPct: 0 } : l));
        success(`Applied ₱${fixedAmount} discount to item`);
      } else {
        setCart(prev => prev.map(l => l.product.product_id === selectedLineId ? { ...l, discountPct: pct, discountAmount: 0 } : l));
        success(`Applied ${pct * 100}% discount to item`);
      }
    } else {
      setCart(prev => prev.map(l => ({ ...l, discountPct: 0, discountAmount: 0 })));
      success('Cleared discounts');
    }
    setShowDiscountModal(false);
  };

  const handleSeniorPwdConfirm = () => {
    if (!seniorPwdInfo?.name?.trim() || !seniorPwdInfo?.id?.trim()) {
      error('Please enter both name and ID number.');
      return;
    }
    if (selectedLineId) {
      setCart(prev => prev.map(l => l.product.product_id === selectedLineId ? { ...l, discountPct: 0.20, discountAmount: 0 } : l));
      success('Applied 20% Senior/PWD discount');
    }
    setShowSeniorPwdModal(false);
    setShowDiscountModal(false);
  };

  const handlePriceOverride = () => {
    if (!selectedLineId) { error('Select an item first.'); return; }
    const price = Number(overridePriceInput);
    if (isNaN(price) || price <= 0) { error('Enter a valid price.'); return; }
    setCart(prev => prev.map(l =>
      l.product.product_id === selectedLineId
        ? { ...l, product: { ...l.product, selling_price: price }, originalPrice: l.product.selling_price, overrideReason: overrideReasonInput || undefined, discountPct: 0, discountAmount: 0 }
        : l
    ));
    success(`Price overridden to ${formatCurrency(price)}${overrideReasonInput ? ` — ${overrideReasonInput}` : ''}`);
    setShowPriceOverrideModal(false);
    setOverridePriceInput('');
    setOverrideReasonInput('');
  };

  const voidItem = () => {
    if (!selectedLineId) return;
    setCart(prev => prev.filter(l => l.product.product_id !== selectedLineId));
    setSelectedLineId(null);
    setShowVoidModal(false);
    success('Item voided.');
  };

  const voidTransaction = () => {
    setCart([]);
    setSelectedLineId(null);
    setSeniorPwdInfo(null);
    success('Transaction voided.');
  };

  const completePayment = async () => {
    if (isProcessingCheckout) return; // prevent duplicate submissions from rapid clicks
    if (cart.length === 0) { error('Add at least one product.'); return; }
    
    const isCash = paymentMethod === 'Cash';
    const isCard = paymentMethod === 'Card';
    const isEwallet = paymentMethod === 'E-Wallet';

    if (isCash && tendered < grandTotal) { error('Amount tendered must cover the total.'); return; }
    if (isCard && !transactionRef.trim()) { error('Enter transaction number from card receipt.'); return; }
    if (isCard && !isCardAmountMatch) { error('Charged amount does not match order total.'); return; }
    if (isEwallet && !accountDetails.trim()) { error('Enter account details.'); return; }
    if (isEwallet && !transactionRef.trim()) { error('Enter transaction number.'); return; }
    if (isEwallet && !isEwalletAmountMatch) { error('Amount paid does not match order total.'); return; }

    // Build payment reference
    let paymentRef: string | undefined;
    if (isCard) {
      const last4 = cardNumber.slice(-4);
      paymentRef = `Card ending ${last4} | ${transactionRef}`;
    } else if (isEwallet) {
      paymentRef = `${accountDetails} | ${transactionRef}`;
    }

    const payload: CreateSalePayload = {
      payment_method: (isCash ? 'Cash' 
        : isCard ? 'Credit Card' 
        : 'E-wallet') as CreateSalePayload['payment_method'],
      payment_reference: paymentRef,
      amount_tendered: isCash ? tendered : grandTotal,
      change_due: isCash ? changeDue : 0,
      senior_pwd_name: seniorPwdInfo?.name ?? null,
      senior_pwd_id: seniorPwdInfo?.id ?? null,
      items: cart.map(l => ({
        product_id: l.product.db_id ?? Number(l.product.plu_code ?? l.product.product_id.replace('P-', '')),
        quantity: l.quantity,
        unit_price: l.product.selling_price * (1 - (l.discountPct || 0)) - (l.discountAmount || 0),
        discount_pct: l.discountPct ?? 0,
        discount_amount: l.discountAmount ?? 0,
        override_reason: l.overrideReason ?? null,
      })),
    };

    setIsProcessingCheckout(true);
    try {
      await salesApi.create(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to complete payment.';
      error(message);
      setIsProcessingCheckout(false);
      return;
    }

    setStockAdjustments(prev => {
      const next = { ...prev };
      cart.forEach(l => {
        next[l.product.product_id] = (next[l.product.product_id] ?? 0) + l.quantity;
      });
      return next;
    });

    const completedReceipt: SalesTransaction = {
      transaction_id: currentTxnId,
      user_id: String(session?.id ?? 'cashier-001'),
      cashier_name: session?.name ?? 'Carlo Reyes',
      total_amount: grandTotal,
      transaction_date: new Date().toLocaleString(),
      payment_method: paymentMethod === 'Card' ? 'Credit Card' : paymentMethod === 'E-Wallet' ? 'E-wallet' : 'Cash',
      amount_tendered: isCash ? tendered : grandTotal,
      change_due: isCash ? changeDue : 0,
      status: 'Completed',
      seniorPwdName: seniorPwdInfo?.name ?? null,
      seniorPwdId: seniorPwdInfo?.id ?? null,
      items: cart.map((l, i) => ({
        sales_item_id: `SI-${Date.now()}-${i + 1}`,
        transaction_id: currentTxnId,
        product_id: l.product.product_id,
        product_name: l.product.product_name,
        quantity: l.quantity,
        unit_price: l.product.selling_price,
        subtotal: l.product.selling_price * l.quantity * (1 - (l.discountPct || 0)) - (l.discountAmount || 0),
      })),
    };

    setReceipt(completedReceipt);
    setShowCheckout(false);
    setAction(`Sale Complete — ${formatCurrency(grandTotal)}`);
    setIsProcessingCheckout(false);

    setTimeout(() => {
      try { window.print(); } catch { /* printing is best-effort */ }
      setTimeout(() => {
        startNewTransaction();
      }, 300);
    }, 400);
  };

  const startNewTransaction = () => {
    setCart([]);
    setAmountTendered('');
    setCardNumber('');
    setTransactionRef('');
    setChargedAmount('');
    setAccountDetails('');
    setAmountPaid('');
    setReceipt(null);
    setSelectedLineId(null);
    setCurrentTxnId(createTransactionId());
    setSeniorPwdInfo(null);
    setBarcode('');
    barcodeRef.current?.focus();
  };

  // Accessibility options
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  return (
    <div className={`relative h-screen w-full z-50 flex flex-col font-sans overflow-hidden ${highContrast ? 'bg-[#1A1A1A] text-[#FFFFFF]' : 'bg-[#F8FAFC] dark:bg-slate-900 text-[#475569] dark:text-slate-300'} ${largeText ? 'text-lg' : ''}`}>
      <Toast toasts={toasts} onDismiss={dismiss} />

      <h1 className="sr-only">Point of Sale</h1>

      {/* GLOBAL HEADER */}
      <header className="h-14 bg-white dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-20 relative">
        <div className="flex items-center gap-6">
          <img src="/images/LOGO_POS.png" alt="WiWaste POS" className="h-8 object-contain" />
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 hidden xl:block"></div>
          
          <div className="hidden xl:flex items-center gap-6 text-[10px] text-muted-fg dark:text-muted-fg uppercase tracking-wide">
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

          <div className="flex items-center gap-2 text-xs font-medium text-muted-fg dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-muted-fg dark:text-muted-fg" />
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
                logout();
                navigate('/login');
              }
            }}
            className="text-xs font-bold text-muted-fg bg-white border border-slate-300 hover:bg-bg dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors ml-4 shadow-sm flex items-center gap-1.5"
          >
            Exit POS <span className="bg-slate-100 dark:bg-slate-700 text-[9px] px-1 rounded text-muted-fg">Esc</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* =========================================================
            BARCODE INPUT BAR — barcode-first entry
            ========================================================= */}
        <div className="shrink-0 bg-white dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-700 px-6 py-4 shadow-sm z-10">
          <div className="relative flex items-center gap-4">
            <span className="text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Barcode / SKU</span>
            <input
              ref={barcodeRef}
              value={barcode}
              onChange={e => setBarcode(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter' && barcode.trim()) {
                  e.preventDefault();
                  void handlePluLookup(barcode.trim());
                }
              }}
              placeholder="Scan product or scan barcode..."
              className="flex-1 pl-4 pr-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all"
            />
            {pluBuffer.length > 0 && (
              <span className="absolute top-1/2 -translate-y-1/2 right-3 bg-[#0F766E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in">
                PLU: {pluBuffer}
              </span>
            )}
            {isLookingUp && (
              <span className="absolute top-1/2 -translate-y-1/2 right-3 bg-[#0F766E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in">
                Looking up…
              </span>
            )}
            <button
              onClick={() => { barcodeRef.current?.focus(); }}
              disabled={isLookingUp}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl text-sm font-bold hover:bg-[#F8FAFC] dark:hover:bg-slate-600 hover:border-[#0F766E] hover:text-[#0F766E] transition-all shrink-0 shadow-sm"
            >
              <Barcode className="w-5 h-5" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>
          <p className="text-[10px] text-muted-fg dark:text-muted-fg mt-2 ml-1">
            Scan a product barcode to add it to the transaction. Press Enter after scanning.
          </p>
        </div>

        {/* =========================================================
            TRANSACTION TABLE — large data table across the top
            ========================================================= */}
        <div className="flex-1 overflow-hidden border border-[#E5E7EB] dark:border-slate-700">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Barcode</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider pr-6">Line Total</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-muted-fg dark:text-muted-fg uppercase tracking-wider">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-700">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="h-[300px] flex flex-col items-center justify-center text-center text-muted-fg">
                      <Receipt className="w-16 h-16 opacity-20 mb-3" />
                      <p className="font-medium text-muted-fg text-sm">No items in current transaction.</p>
                      <p className="text-xs text-muted-fg/60 mt-1">Scan a barcode to add the first item.</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((line, idx) => {
                    const isSelected = selectedLineId === line.product.product_id;
                    const lineTotal = line.product.selling_price * line.quantity * (1 - (line.discountPct || 0)) - (line.discountAmount || 0);
                    const remaining = Math.max(0, line.product.current_stock - line.quantity);
                    const isLowStock = remaining > 0 && remaining <= line.product.reorder_level;
                    const isOutOfStock = remaining <= 0;
                    return (
                      <tr
                        key={line.product.product_id}
                        onClick={() => setSelectedLineId(line.product.product_id)}
                        className={`transition-colors ${isSelected
                          ? 'bg-[#E8F7F2] dark:bg-[#0F766E]/20'
                          : idx % 2 === 0
                            ? 'bg-white dark:bg-slate-800'
                            : 'bg-bg dark:bg-slate-750'
                        } hover:bg-slate-100 dark:hover:bg-slate-700`}
                      >
                        {/* Barcode */}
                        <td className="px-6 py-3 text-[10px] font-mono font-semibold text-muted-fg dark:text-muted-fg truncate" title={line.product.barcode || line.product.plu_code}>
                          {line.product.barcode || line.product.plu_code || '—'}
                        </td>

                        {/* Product Name */}
                        <td className="px-6 py-3">
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{line.product.product_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                            {line.discountPct && line.discountPct > 0 ? (
                              <span className="text-[9px] font-bold text-[#0F766E] bg-[#0F766E]/10 px-1 rounded">-{line.discountPct * 100}%</span>
                            ) : null}
                            {isSelected && (
                              <span className="text-[9px] font-bold text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">{hotkeys.unqueue} to remove</span>
                            )}
                            {isOutOfStock && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 rounded">Out of stock</span>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded">Low: {remaining}</span>
                            )}
                            </div>
                          </div>
                        </td>

                        {/* Qty Control */}
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-center w-[90px] bg-white dark:bg-slate-700 rounded-md border border-[#E5E7EB] dark:border-slate-600 overflow-hidden shadow-sm inline-block" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => updateQty(line.product.product_id, line.quantity - 1)}
                              disabled={line.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center text-muted-fg dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shrink-0 ${line.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
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
                              className="w-full text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:bg-bg dark:focus:bg-slate-600"
                            />
                            <button 
                              onClick={() => updateQty(line.product.product_id, line.quantity + 1)}
                              disabled={isOutOfStock}
                              className="w-8 h-8 flex items-center justify-center text-[#0F766E] bg-[#E8F7F2] hover:bg-[#d1f4e8] transition-colors shrink-0 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="px-6 py-3 text-right text-[11px] font-semibold text-muted-fg dark:text-muted-fg">
                          {formatCurrency(line.product.selling_price)}
                        </td>

                        {/* Line Total */}
                        <td className="px-6 py-3 text-right pr-6 font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {formatCurrency(lineTotal)}
                        </td>

                        {/* Remove */}
                        <td className="px-3 py-3 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeProduct(line.product.product_id); }}
                            className="w-7 h-7 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-all"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================
            TRANSACTION SUMMARY — beneath the table
            ========================================================= */}
        <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-[#E5E7EB] dark:border-slate-700 p-5">
          <div className="grid grid-cols-12 gap-4">
            {/* Left: transaction info */}
            <div className="col-span-6 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>Transaction</span>
                <span className="font-mono text-slate-800 dark:text-slate-100">#{currentTxnId.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>Cashier</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{session?.name ?? 'Carlo Reyes'}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">Active</span>
              </div>
            </div>

            {/* Right: totals */}
            <div className="col-span-6 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>Units</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>Sales Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-[#0F766E] font-medium">
                  <span>Item Discount</span>
                  <span className="font-bold text-[#0F766E]">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-fg dark:text-muted-fg font-medium">
                <span>VAT (12%)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB] dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Due</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button 
              onClick={openCheckout}
              disabled={cart.length === 0 || isProcessingCheckout}
              className={`w-full py-4 rounded-xl text-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 relative
                ${isProcessingCheckout
                  ? 'bg-[#0F766E] text-white opacity-80 cursor-not-allowed'
                  : cart.length === 0
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-[#16A34A] hover:bg-[#15803d]'}`}
            >
              {isProcessingCheckout ? 'Processing…' : 'Proceed to Checkout'}
              <span className="absolute right-4 text-[10px] font-bold bg-white/20 px-2 py-1 rounded text-white/90">{hotkeys.checkout}</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================
          BOTTOM ACTION AREA — compact utilities, accessibility, status
          ========================================================= */}
      <footer className="h-16 bg-white dark:bg-slate-800 border-t border-[#E5E7EB] dark:border-slate-700 shrink-0 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowReturnModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold text-muted-fg dark:text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E] transition-all"
            title="Returns"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Returns
          </button>
          <button 
            onClick={() => setShowDiscountModal(true)}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${selectedLineId ? 'text-muted-fg dark:text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]' : 'text-muted-fg cursor-not-allowed opacity-50'}`}
            title="Apply Discount"
          >
            <Percent className="w-3.5 h-3.5" /> Discount
          </button>
          <button 
            onClick={() => selectedLineId && setShowVoidModal(true)}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${selectedLineId ? 'text-muted-fg dark:text-slate-300 hover:border-red-500 hover:text-red-600' : 'text-muted-fg cursor-not-allowed opacity-50'}`}
            title="Void Item"
          >
            <Trash2 className="w-3.5 h-3.5" /> Void Item
          </button>
          <button 
            onClick={() => {
              if (!selectedLineId) { error('Select an item first.'); return; }
              const line = cart.find(l => l.product.product_id === selectedLineId);
              if (line) setOverridePriceInput(String(line.product.selling_price));
              setShowPriceOverrideModal(true);
            }}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all ${selectedLineId ? 'bg-[#F8FAFC] dark:bg-slate-700 border-[#E5E7EB] dark:border-slate-600 text-muted-fg dark:text-slate-300 hover:border-amber-500 hover:text-amber-600' : 'text-muted-fg cursor-not-allowed opacity-50'}`}
            title="Override Price"
          >
            Override Price
          </button>

          {/* Shortcut buttons — primary cashier operations */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={voidTransaction}
              disabled={cart.length === 0}
              className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold transition-all ${cart.length === 0 ? 'text-muted-fg cursor-not-allowed opacity-50' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
              title="Void Transaction"
            >
              <Trash2 className="w-3.5 h-3.5" /> Void Txn
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
            <button
              onClick={openCheckout}
              disabled={cart.length === 0 || isProcessingCheckout}
              className={`flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold transition-all ${cart.length === 0 || isProcessingCheckout ? 'text-muted-fg cursor-not-allowed opacity-50' : 'bg-[#0F766E] text-white'}`}
              title="Checkout"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Checkout
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
            <button
              onClick={() => { barcodeRef.current?.focus(); setBarcode(''); }}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-muted-fg dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
              title="Price Check / Scan (F2)"
            >
              <Search className="w-3.5 h-3.5" /> Price Check
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Accessibility Options */}
          <button
            onClick={() => setShowAccessibility(!showAccessibility)}
            aria-expanded={showAccessibility}
            className={`flex items-center justify-center gap-2 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${showAccessibility ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'text-muted-fg dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
            title="Accessibility options"
          >
            <span aria-hidden="true">♿</span>
            <span className="sr-only">Accessibility options</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />

          <button
            onClick={toggleHotkeys}
            title={hasKeyboard ? undefined : 'No keyboard detected — hotkeys may not work'}
            className={`px-2 py-2 text-[10px] font-bold transition-all ${hotkeysEnabled ? 'text-[#0F766E]' : 'text-muted-fg'}`}
          >
            {hotkeysEnabled ? 'Hotkeys ON' : 'Hotkeys OFF'}
          </button>
        </div>

        {/* Status indicators — right */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1.5 text-muted-fg hover:text-muted-fg dark:hover:text-slate-200 transition-colors">
              {deviceType === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
              {deviceType === 'tablet' && <Tablet className="w-3.5 h-3.5" />}
              {deviceType === 'mobile' && <Smartphone className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {deviceType === 'desktop' ? 'Desktop' : deviceType === 'tablet' ? 'Tablet' : 'Mobile'}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 text-white dark:bg-slate-700 text-[11px] leading-relaxed" align="end">
              {deviceType === 'desktop' && 'Running on Desktop — hotkeys and barcode scanning are fully supported.'}
              {deviceType === 'tablet' && 'Running on Tablet — hotkeys require a connected keyboard.'}
              {deviceType === 'mobile' && 'Running on Mobile — hotkeys and barcode scanning are limited on this device.'}
            </TooltipContent>
          </Tooltip>
        </div>
      </footer>

      {/* Accessibility Options Panel */}
      {showAccessibility && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span aria-hidden="true">♿</span> Accessibility Options
            </h3>
            <p className="text-xs text-muted-fg dark:text-muted-fg mb-6">Adjust the POS for easier use.</p>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg cursor-pointer">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">High contrast</span>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  aria-pressed={highContrast}
                  className="relative w-10 h-5 bg-slate-300 dark:bg-slate-600 rounded-full transition-colors focus:outline-none"
                >
                  <span className={`block w-3 h-3 rounded-full bg-white shadow-md absolute ${highContrast ? 'right-1' : 'left-1'} top-0.5 transition-transform`} aria-hidden="true" />
                </button>
              </label>
              <label className="flex items-center justify-between p-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg cursor-pointer">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Large text</span>
                <button
                  onClick={() => setLargeText(!largeText)}
                  aria-pressed={largeText}
                  className="relative w-10 h-5 bg-slate-300 dark:bg-slate-600 rounded-full transition-colors focus:outline-none"
                >
                  <span className={`block w-3 h-3 rounded-full bg-white shadow-md absolute ${largeText ? 'right-1' : 'left-1'} top-0.5 transition-transform`} aria-hidden="true" />
                </button>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAccessibility(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-muted-fg dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Close (Esc)</button>
              <button onClick={() => setShowAccessibility(false)} className="flex-1 py-3 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS
          ========================================================= */}
      
      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#0F766E]" /> Apply Discount
            </h3>

            <div className="flex rounded-lg border border-[#E5E7EB] dark:border-slate-600 overflow-hidden mb-4">
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${discountType === 'percent' ? 'bg-[#0F766E] text-white' : 'bg-white dark:bg-slate-700 text-muted-fg dark:text-slate-300'}`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2 text-xs font-bold transition-colors ${discountType === 'fixed' ? 'bg-[#0F766E] text-white' : 'bg-white dark:bg-slate-700 text-muted-fg dark:text-slate-300'}`}
              >
                Fixed Amount (₱)
              </button>
            </div>

            {discountType === 'percent' ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => applyDiscount(0.05)} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]">5% OFF</button>
                <button onClick={() => applyDiscount(0.10)} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]">10% OFF</button>
                <button onClick={() => { setShowSeniorPwdModal(true); }} className="py-3 border border-[#E5E7EB] dark:border-slate-600 rounded-lg font-bold col-span-2 text-[#0F766E] bg-[#E8F7F2] dark:bg-[#0F766E]/20 border-[#0F766E]/30">20% Senior/PWD</button>
              </div>
            ) : (
              <div className="mb-6">
                <label htmlFor="discount-amount" className="block text-xs font-bold text-muted-fg dark:text-slate-300 mb-2">Discount Amount (₱)</label>
                <input
                  id="discount-amount"
                  type="number"
                  value={fixedDiscountInput}
                  onChange={e => setFixedDiscountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const amt = Number(fixedDiscountInput);
                    if (isNaN(amt) || amt <= 0) { error('Enter a valid amount.'); return; }
                    applyDiscount(0, amt);
                    setFixedDiscountInput('');
                  }}
                  className="w-full mt-3 py-3 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]"
                >
                  Apply ₱{Number(fixedDiscountInput || 0).toFixed(2)} Discount
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowDiscountModal(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-muted-fg dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel (Esc)</button>
              <button onClick={() => applyDiscount(0)} className="flex-1 py-2 border border-border dark:border-slate-600 text-muted-fg dark:text-slate-300 font-bold rounded-lg hover:bg-bg dark:hover:bg-slate-700">Clear Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#0F766E]" /> Process Return
            </h3>
            <p className="text-sm text-muted-fg mb-4">Scan the receipt barcode or enter transaction ID to process a return.</p>
            <input type="text" placeholder="Transaction ID..." className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg mb-6 focus:outline-none focus:border-[#0F766E]" aria-label="Transaction ID" />
            <div className="flex gap-2">
              <button onClick={() => setShowReturnModal(false)} className="flex-1 py-2 bg-slate-100 text-muted-fg font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button onClick={() => { success('Return processed'); setShowReturnModal(false); }} className="flex-1 py-2 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]">Find Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Senior/PWD ID Modal */}
      {showSeniorPwdModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#0F766E]" /> Senior/PWD Discount
            </h3>
            <p className="text-xs text-muted-fg dark:text-muted-fg mb-4">Enter customer details to apply 20% discount.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="senior-pwd-name" className="block text-xs font-bold text-muted-fg dark:text-slate-300 mb-1">Full Name</label>
                <input
                  id="senior-pwd-name"
                  type="text"
                  value={seniorPwdInfo?.name ?? ''}
                  onChange={e => setSeniorPwdInfo(prev => ({ ...prev, name: e.target.value, id: prev?.id ?? '' }))}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="senior-pwd-id" className="block text-xs font-bold text-muted-fg dark:text-slate-300 mb-1">OSCA / PWD ID Number</label>
                <input
                  id="senior-pwd-id"
                  type="text"
                  value={seniorPwdInfo?.id ?? ''}
                  onChange={e => setSeniorPwdInfo(prev => ({ ...prev, id: e.target.value, name: prev?.name ?? '' }))}
                  placeholder="e.g. OSCA-1234-56"
                  className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowSeniorPwdModal(false); setSeniorPwdInfo(null); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-muted-fg dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel (Esc)</button>
              <button onClick={handleSeniorPwdConfirm} className="flex-1 py-2 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]">Apply 20% Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* Price Override Modal */}
      {showPriceOverrideModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-500" /> Override Price
            </h3>
            <p className="text-xs text-muted-fg dark:text-muted-fg mb-4">Change the selling price for the selected item.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="price-override-price" className="block text-xs font-bold text-muted-fg dark:text-slate-300 mb-1">New Price (₱)</label>
                <input
                  id="price-override-price"
                  type="number"
                  value={overridePriceInput}
                  onChange={e => setOverridePriceInput(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="price-override-reason" className="block text-xs font-bold text-muted-fg dark:text-slate-300 mb-1">Reason (optional)</label>
                <input
                  id="price-override-reason"
                  type="text"
                  value={overrideReasonInput}
                  onChange={e => setOverrideReasonInput(e.target.value)}
                  placeholder="e.g. Shelf tag mismatch"
                  className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowPriceOverrideModal(false); setOverridePriceInput(''); setOverrideReasonInput(''); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-muted-fg dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel (Esc)</button>
              <button onClick={handlePriceOverride} className="flex-1 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600">Apply Override</button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Void Selected Item
            </h3>
            <p className="text-sm text-muted-fg mb-6">Are you sure you want to void this item from the transaction?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowVoidModal(false)} className="flex-1 py-2 bg-slate-100 text-muted-fg font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button onClick={voidItem} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Yes, Void Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Exit POS
            </h3>
            <p className="text-sm text-muted-fg mb-6">You have items in your current transaction. If you exit now, this transaction will be lost.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2 bg-slate-100 text-muted-fg font-bold rounded-lg hover:bg-slate-200">Cancel (Esc)</button>
              <button 
                onClick={() => {
                  logout();
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

      {/* Payment Checkout Modal - Landscape Split Layout */}
      {showCheckout && (
        <div className="absolute inset-0 z-[60] bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center p-5">
          <div className="bg-white rounded-[26px] shadow-[0_28px_80px_rgba(15,23,42,0.25)] w-full max-w-4xl max-h-[88vh] overflow-hidden flex border border-border relative">
            
            {/* LEFT PANEL: Order Summary (45%) */}
            <div className="w-[45%] bg-bg border-r border-border p-6 flex flex-col min-h-[500px] text-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Order Summary</h2>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    barcodeRef.current?.focus();
                  }}
                  className="p-2 text-muted-fg hover:text-muted-fg hover:bg-slate-200 rounded-lg transition-colors"
                  aria-label="Close checkout"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6 max-h-[42vh] min-h-[160px] pr-2">
                {cart.map((line) => (
                  <div key={line.product.product_id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {line.product.image_url ? (
                        <img src={line.product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-fg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{line.product.product_name}</p>
                      <p className="text-xs text-muted-fg">{line.product.barcode}</p>
                      {line.discountPct && line.discountPct > 0 && (
                        <span className="text-[10px] font-bold text-[#0F766E] bg-[#0F766E]/10 px-1.5 py-0.5 rounded">-{line.discountPct * 100}%</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(line.product.selling_price * (1 - (line.discountPct || 0)) - (line.discountAmount || 0))}</p>
                      <p className="text-xs text-muted-fg">× {line.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm text-muted-fg">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Item Discount</span>
                    <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {seniorPwdInfo && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Senior/PWD 20%</span>
                    <span className="font-medium">-{formatCurrency((subtotal - discountAmount) * 0.2)}</span>
                  </div>
                )}
                {isVatRegistered && tax > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-muted-fg">
                      <span>VATable Amount</span>
                      <span className="font-medium">{formatCurrency(subtotal - discountAmount - (seniorPwdInfo ? (subtotal - discountAmount) * 0.2 : 0) - tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-fg">
                      <span>VAT (12%)</span>
                      <span className="font-medium">{formatCurrency(tax)}</span>
                    </div>
                  </>
                )}
                {!isVatRegistered && (
                  <div className="flex justify-between text-sm text-muted-fg">
                    <span>VAT Exempt</span>
                    <span className="font-medium text-green-600">₱0.00</span>
                  </div>
                )}
                <div className="border-t border-border pt-3"></div>
                <div className="flex justify-between text-xl font-black text-slate-900">
                  <span>TOTAL DUE</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Payment (55%) */}
            <div className="w-[55%] p-6 bg-white flex flex-col min-h-[500px] text-slate-800">
              <div className="mb-6">
                <span className="text-xs font-bold text-muted-fg uppercase tracking-wider block mb-4">Payment Method</span>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setPaymentMethod(m.id);
                        setTransactionRef('');
                        setChargedAmount(String(grandTotal));
                        setAmountPaid(String(grandTotal));
                        setCardNumber('');
                        setAccountDetails('');
                      }}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 text-center transition-all ${
                        paymentMethod === m.id
                          ? 'border-[#0F766E] bg-[#E8F7F2] shadow-md'
                          : 'border-border hover:border-[#0F766E] hover:bg-bg'
                      }`}
                    >
                      <m.icon className="w-10 h-10 text-[#0F766E]" />
                      <span className="text-base font-bold text-slate-800">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-5">
                {/* CASH PAYMENT */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-bg border border-border rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-fg uppercase tracking-wider">Amount Due</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>

                    <div>
                      <label htmlFor="amount-tendered" className="block text-xs font-bold text-muted-fg mb-2">Amount Received</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-fg font-bold text-3xl">₱</span>
                        <input
                          id="amount-tendered"
                          type="text"
                          inputMode="numeric"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0.00"
                          className="w-full pl-14 pr-5 py-5 bg-bg border-2 border-border rounded-xl text-4xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all text-center"
                          style={{ appearance: 'textfield' }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-muted-fg mb-2 uppercase tracking-wider">Quick Amounts</span>
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setAmountTendered(amt.toString())}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                              Number(amountTendered) === amt
                                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-border'
                            }`}
                          >
                            ₱{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Change Due</span>
                      <span className="text-2xl font-black text-emerald-700">{formatCurrency(changeDue)}</span>
                    </div>

                    {Number(amountTendered) > 0 && Number(amountTendered) < grandTotal && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Short by {formatCurrency(grandTotal - Number(amountTendered))} — need {formatCurrency(grandTotal)} total
                      </div>
                    )}
                  </div>
                )}

                {/* CARD PAYMENT */}
                {paymentMethod === 'Card' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-bg border border-border rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-fg uppercase tracking-wider">Amount Due</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>

                    <div>
                      <label htmlFor="card-number" className="block text-xs font-bold text-muted-fg mb-2 flex items-center gap-1">
                        Card Number
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNumber(raw);
                        }}
                        placeholder="****-****-****-****"
                        className="w-full px-5 py-4 border-2 border-border rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                      />
                      {cardNumber.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted-fg">
                          Display: ****-****-****-{cardNumber.slice(-4).padStart(4, 'X')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="card-transaction-ref" className="block text-xs font-bold text-muted-fg mb-2 flex items-center gap-1">
                        Transaction Number
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="card-transaction-ref"
                        type="text"
                        value={transactionRef}
                        onChange={e => setTransactionRef(e.target.value)}
                        placeholder="Enter transaction number from card receipt"
                        className="w-full px-5 py-4 border-2 border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="card-amount-charged" className="block text-xs font-bold text-muted-fg mb-2">Amount Charged</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-fg font-bold text-xl">₱</span>
                        <input
                          id="card-amount-charged"
                          type="number"
                          step="0.01"
                          value={chargedAmount}
                          onChange={e => setChargedAmount(e.target.value)}
                          className="w-full pl-12 pr-5 py-4 bg-bg border-2 border-border rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                        />
                      </div>
                    </div>

                    {chargedAmount && (
                      isCardAmountMatch ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">Amount matches</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Payment amount does not match</span>
                            <div className="mt-1 text-xs space-y-0.5">
                              <div>Order Total: {formatCurrency(grandTotal)}</div>
                              <div>Entered Amount: {formatCurrency(Number(chargedAmount))}</div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* E-WALLET PAYMENT */}
                {paymentMethod === 'E-Wallet' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-bg border border-border rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-fg uppercase tracking-wider">Amount Due</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>

                    <div>
                      <label htmlFor="ewallet-account-details" className="block text-xs font-bold text-muted-fg mb-2 flex items-center gap-1">
                        Account Details
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="ewallet-account-details"
                        type="text"
                        value={accountDetails}
                        onChange={e => setAccountDetails(e.target.value)}
                        placeholder="e.g. 09171234567 or GCash/Maya account"
                        className="w-full px-5 py-4 border-2 border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="ewallet-transaction-ref" className="block text-xs font-bold text-muted-fg mb-2 flex items-center gap-1">
                        Transaction Number
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="ewallet-transaction-ref"
                        type="text"
                        value={transactionRef}
                        onChange={e => setTransactionRef(e.target.value)}
                        placeholder="Enter transaction number from e-wallet receipt"
                        className="w-full px-5 py-4 border-2 border-border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="ewallet-amount-paid" className="block text-xs font-bold text-muted-fg mb-2">Amount Paid</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-fg font-bold text-xl">₱</span>
                        <input
                          id="ewallet-amount-paid"
                          type="number"
                          step="0.01"
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value)}
                          className="w-full pl-12 pr-5 py-4 bg-bg border-2 border-border rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] transition-all"
                        />
                      </div>
                    </div>

                    {amountPaid && (
                      isEwalletAmountMatch ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">Amount matches</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Payment amount does not match</span>
                            <div className="mt-1 text-xs space-y-0.5">
                              <div>Order Total: {formatCurrency(grandTotal)}</div>
                              <div>Entered Amount: {formatCurrency(Number(amountPaid))}</div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    barcodeRef.current?.focus();
                  }}
                  className="px-6 py-3 text-sm font-bold text-muted-fg bg-white border border-slate-300 rounded-xl hover:bg-bg hover:border-slate-400 transition-colors"
                >
                  Cancel (Esc)
                </button>
                <button
                  onClick={completePayment}
                  disabled={!isCompleteEnabled || isProcessingCheckout}
                  className={`px-8 py-3 text-lg font-bold rounded-xl shadow-md transition-all relative ${
                    isProcessingCheckout
                      ? 'bg-[#0F766E] text-white opacity-80 cursor-not-allowed'
                      : isCompleteEnabled
                        ? 'bg-[#0F766E] text-white hover:bg-[#0d615b]'
                        : 'bg-slate-300 text-muted-fg cursor-not-allowed'
                  }`}
                >
                  {isProcessingCheckout ? 'Processing…' : 'Complete Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED 80MM THERMAL RECEIPT PRINT TARGET */}
      {receipt && <ReceiptPreview receipt={receipt} isVatRegistered={isVatRegistered} />}

    </div>
  );
}
