import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Barcode, Search, Trash2, CreditCard, Wallet, Banknote, Plus, Minus, 
  User, Receipt, Clock, ArrowRight, Printer, CheckCircle2,
  Archive, RotateCcw, Percent, Search as SearchIcon, MoreHorizontal, X, AlertCircle, Keyboard, Info,
  Monitor, Tablet, Smartphone
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
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
import { sales as salesApi } from '../../services/api';

interface CartLine {
  product: CashierProduct;
  quantity: number;
  discountPct?: number;
}

const PRODUCT_SLOT_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
type ProductSlotKey = `product_${0|1|2|3|4|5|6|7|8|9}`;
type HotkeyAction = 'focusSearch' | 'checkout' | 'discount' | 'closeModal' | 'voidItem' | 'newTransaction' | 'unqueue' | 'selectFirstQueue' | 'selectNextItem' | 'selectPrevItem' | ProductSlotKey;

const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  focusSearch: 'F2',
  checkout: 'F4',
  discount: 'F9',
  closeModal: 'Escape',
  voidItem: 'F8',
  newTransaction: 'F6',
  unqueue: 'Backspace',
  selectFirstQueue: 'Tab',
  selectNextItem: 'ArrowDown',
  selectPrevItem: 'ArrowUp',
  product_0: 'q', product_1: 'w', product_2: 'e', product_3: 'r', product_4: 't',
  product_5: 'y', product_6: 'u', product_7: 'i', product_8: 'o', product_9: 'p',
};

const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  focusSearch: 'Focus Search / Barcode',
  checkout: 'Proceed to Checkout',
  discount: 'Apply Discount',
  closeModal: 'Close Modal / Clear Search',
  voidItem: 'Void Selected Item',
  newTransaction: 'New Transaction',
  unqueue: 'Remove Selected Item (Unqueue)',
  selectFirstQueue: 'Select First Queue Item',
  selectNextItem: 'Select Next Cart Item ↓',
  selectPrevItem: 'Select Previous Cart Item ↑',
  product_0: 'Product Slot 1', product_1: 'Product Slot 2', product_2: 'Product Slot 3',
  product_3: 'Product Slot 4', product_4: 'Product Slot 5', product_5: 'Product Slot 6',
  product_6: 'Product Slot 7', product_7: 'Product Slot 8', product_8: 'Product Slot 9',
  product_9: 'Product Slot 10',
};

type HotkeyPreset = { label: string; description: string; keys: Record<HotkeyAction, string> };
const HOTKEY_PRESETS: HotkeyPreset[] = [
  {
    label: 'Function Keys',
    description: 'F-keys for actions, QWERTY row for slots — best for full keyboards',
    keys: { focusSearch: 'F2', checkout: 'F4', discount: 'F9', voidItem: 'F8', newTransaction: 'F6', closeModal: 'Escape', unqueue: 'Backspace', selectFirstQueue: 'Tab', selectNextItem: 'ArrowDown', selectPrevItem: 'ArrowUp', product_0: 'q', product_1: 'w', product_2: 'e', product_3: 'r', product_4: 't', product_5: 'y', product_6: 'u', product_7: 'i', product_8: 'o', product_9: 'p' },
  },
  {
    label: 'Numpad',
    description: 'Numpad 1–0 for product slots — ideal for POS terminals with numpad',
    keys: { focusSearch: 'F2', checkout: 'F4', discount: 'F9', voidItem: 'F8', newTransaction: 'F6', closeModal: 'Escape', unqueue: 'Delete', selectFirstQueue: 'Home', selectNextItem: 'ArrowDown', selectPrevItem: 'ArrowUp', product_0: '1', product_1: '2', product_2: '3', product_3: '4', product_4: '5', product_5: '6', product_6: '7', product_7: '8', product_8: '9', product_9: '0' },
  },
  {
    label: 'Compact / Laptop',
    description: 'Z–/ row for products, letter keys for actions — good for laptops without numpad',
    keys: { focusSearch: 'F2', checkout: 'Enter', discount: 'd', voidItem: 'v', newTransaction: 'n', closeModal: 'Escape', unqueue: 'Backspace', selectFirstQueue: 'Tab', selectNextItem: 'ArrowDown', selectPrevItem: 'ArrowUp', product_0: 'z', product_1: 'x', product_2: 'c', product_3: 'b', product_4: 'm', product_5: ',', product_6: '.', product_7: '/', product_8: ';', product_9: "'" },
  },
];

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
  const [isVatRegistered, setIsVatRegistered] = useState(false); // Non-VAT registered micro-enterprise by default
  
  const [draggedProduct, setDraggedProduct] = useState<CashierProduct | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pinnedOrder, setPinnedOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_pinned_order');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [currentTxnId, setCurrentTxnId] = useState(createTransactionId());
  const [globalDiscountPct, setGlobalDiscountPct] = useState(0);
  const [hotkeys, setHotkeys] = useState<Record<HotkeyAction, string>>(() => {
    try {
      const saved = localStorage.getItem('pos_hotkeys');
      return saved ? { ...DEFAULT_HOTKEYS, ...JSON.parse(saved) } : DEFAULT_HOTKEYS;
    } catch { return DEFAULT_HOTKEYS; }
  });
  const [showHotkeySettings, setShowHotkeySettings] = useState(false);
  const [recordingAction, setRecordingAction] = useState<HotkeyAction | null>(null);
  const [draftHotkeys, setDraftHotkeys] = useState<Record<HotkeyAction, string>>(hotkeys);

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
    setHotkeysEnabled(prev => {
      const next = !prev;
      localStorage.setItem('pos_hotkeys_enabled', JSON.stringify(next));
      next ? success('Hotkeys enabled') : success('Hotkeys disabled');
      return next;
    });
  };

  const saveHotkeys = () => {
    setHotkeys(draftHotkeys);
    localStorage.setItem('pos_hotkeys', JSON.stringify(draftHotkeys));
    setShowHotkeySettings(false);
    setRecordingAction(null);
    success('Hotkeys saved!');
  };

  const handleHotkeyRecord = useCallback((e: KeyboardEvent) => {
    if (!recordingAction) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { setRecordingAction(null); return; }
    setDraftHotkeys(prev => ({ ...prev, [recordingAction]: e.key }));
    setRecordingAction(null);
  }, [recordingAction]);

  useEffect(() => {
    if (!recordingAction) return;
    document.addEventListener('keydown', handleHotkeyRecord, true);
    return () => document.removeEventListener('keydown', handleHotkeyRecord, true);
  }, [recordingAction, handleHotkeyRecord]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hotkeysEnabled || showHotkeySettings || recordingAction) return;
      const isSearchFocused = document.activeElement === barcodeRef.current;

      if (e.key === hotkeys.focusSearch) {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === hotkeys.selectFirstQueue && !isSearchFocused) {
        if (cartRef.current.length > 0) {
          e.preventDefault();
          setSelectedLineId(prev => prev ? prev : cartRef.current[0].product.product_id);
        }
      } else if (e.key === hotkeys.selectNextItem && selectedLineId && !isSearchFocused) {
        e.preventDefault();
        const idx = cartRef.current.findIndex(l => l.product.product_id === selectedLineId);
        if (idx < cartRef.current.length - 1) setSelectedLineId(cartRef.current[idx + 1].product.product_id);
      } else if (e.key === hotkeys.selectPrevItem && selectedLineId && !isSearchFocused) {
        e.preventDefault();
        const idx = cartRef.current.findIndex(l => l.product.product_id === selectedLineId);
        if (idx > 0) setSelectedLineId(cartRef.current[idx - 1].product.product_id);
      } else if (e.key === hotkeys.checkout) {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout) setShowCheckout(true);
      } else if (e.key === hotkeys.discount) {
        e.preventDefault();
        setShowDiscountModal(true);
      } else if (e.key === hotkeys.voidItem) {
        e.preventDefault();
        if (selectedLineId) setShowVoidModal(true);
      } else if (e.key === hotkeys.unqueue && !isSearchFocused) {
        if (selectedLineId) {
          e.preventDefault();
          const line = cartRef.current.find(l => l.product.product_id === selectedLineId);
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
        setSearch('');
      } else if (document.activeElement !== barcodeRef.current) {
        // Product slot hotkeys — fire based on pinned order, not filtered index
        const slotIndex = PRODUCT_SLOT_KEYS.findIndex(
          (_, i) => hotkeys[`product_${i}` as ProductSlotKey] === e.key
        );
        if (slotIndex !== -1) {
          const pinnedId = pinnedOrderRef.current[slotIndex];
          const product = pinnedId
            ? filteredProductsRef.current.find(p => p.product_id === pinnedId)
            : filteredProductsRef.current[slotIndex];
          if (product) {
            e.preventDefault();
            addProduct(product);
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showCheckout, hotkeys, showHotkeySettings, recordingAction, selectedLineId, hotkeysEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = cart.reduce((sum, l) => sum + l.product.selling_price * l.quantity, 0);
  const discountAmount = cart.reduce((sum, l) => sum + (l.product.selling_price * l.quantity * (l.discountPct || 0)), 0); 
  const tax = isVatRegistered ? (subtotal - discountAmount) * 0.12 : 0; // 12% VAT if VAT registered, else Non-VAT (0%)
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

  // Keep a ref so keydown handler always sees latest cart
  const cartRef = useRef(cart);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  // Keep a ref so the keydown handler always sees the latest filtered list
  const filteredProductsRef = useRef(filteredProducts);
  useEffect(() => { filteredProductsRef.current = filteredProducts; }, [filteredProducts]);

  // Keep a ref so the keydown handler always sees the latest pinned order
  const pinnedOrderRef = useRef(pinnedOrder);
  useEffect(() => { pinnedOrderRef.current = pinnedOrder; }, [pinnedOrder]);

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
    // do not auto-focus search bar after adding — let user keep using hotkeys
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
  };

  const removeProduct = (productId: string) => {
    setCart(prev => prev.filter(l => l.product.product_id !== productId));
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
    setGlobalDiscountPct(0);
    setSelectedLineId(null);
    success('Transaction voided.');
  };

  const completePayment = async () => {
    if (cart.length === 0) { error('Add at least one product.'); return; }
    if (paymentMethod === 'Cash' && tendered < grandTotal) { error('Amount tendered must cover the total.'); return; }

    // Save transaction to backend API
    try {
      await salesApi.create({
        payment_method: paymentMethod as any,
        amount_tendered: paymentMethod === 'Cash' ? tendered : grandTotal,
        change_due: paymentMethod === 'Cash' ? changeDue : 0,
        items: cart.map(l => ({
          product_id: Number(l.product.product_id),
          quantity: l.quantity,
          unit_price: l.product.selling_price * (1 - (l.discountPct || 0)),
        })),
      });
    } catch (err: any) {
      // Fallback for offline mode
    }

    const completedReceipt: SalesTransaction = {
      transaction_id: currentTxnId,
      user_id: session?.id ?? 'cashier-001',
      cashier_name: session?.name ?? 'Carlo Reyes',
      total_amount: grandTotal,
      transaction_date: new Date().toLocaleString(),
      payment_method: paymentMethod as PaymentMethod,
      amount_tendered: paymentMethod === 'Cash' ? tendered : grandTotal,
      change_due: paymentMethod === 'Cash' ? changeDue : 0,
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
    setShowPrintedReceipt(true); // Renders Thermal Receipt layout for print
    setAction(`Sale Complete — ${formatCurrency(grandTotal)}`);

    // Auto-trigger browser print for the thermal receipt
    setTimeout(() => {
      try { window.print(); } catch {}
    }, 400);
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
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search product or scan barcode... (${hotkeys.focusSearch})`}
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
            
            {/* Category Pills + Info Tooltip */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar flex-1">
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
              <Tooltip>
                <TooltipTrigger className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <Info className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-white dark:bg-slate-700 text-[11px] leading-relaxed" align="end">
                  You can drag and drop the tile when you using desktop or supported mouse feature, also can change keys thru hotkey settings.
                </TooltipContent>
              </Tooltip>
            </div>


          </div>

          {/* Product Grid - More compact to fit 8-15 */}
          <div className="flex-1 overflow-y-auto p-4 hide-scrollbar dark:bg-slate-900">
            <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
              {(() => {
                // Build display order: pinned products first (in pinned order), then the rest
                const pinnedProducts = pinnedOrder
                  .map(id => filteredProducts.find(p => p.product_id === id))
                  .filter((p): p is CashierProduct => !!p);
                const unpinned = filteredProducts.filter(p => !pinnedOrder.includes(p.product_id));
                const ordered = [...pinnedProducts, ...unpinned];
                return ordered.map((product, idx) => {
                  const slotIndex = pinnedOrder.indexOf(product.product_id);
                  const slotKey = slotIndex !== -1 && slotIndex < 10 ? hotkeys[`product_${slotIndex}` as ProductSlotKey] : null;
                  const isDragging = draggedProduct?.product_id === product.product_id;
                  const isDragOver = dragOverId === product.product_id;
                  return (
                  <div
                    key={product.product_id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedProduct(product); }}
                    onDragEnd={() => { setDraggedProduct(null); setDragOverId(null); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(product.product_id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedProduct || draggedProduct.product_id === product.product_id) return;
                      setPinnedOrder(prev => {
                        // Build current full ordered list
                        const pinnedProds = prev
                          .map(id => filteredProducts.find(p => p.product_id === id))
                          .filter((p): p is CashierProduct => !!p);
                        const unpinnedProds = filteredProducts.filter(p => !prev.includes(p.product_id));
                        const current = [...pinnedProds, ...unpinnedProds].map(p => p.product_id);
                        // Reorder
                        const from = current.indexOf(draggedProduct.product_id);
                        const to = current.indexOf(product.product_id);
                        const next = [...current];
                        next.splice(from, 1);
                        next.splice(to, 0, draggedProduct.product_id);
                        // Only keep first 10 as pinned
                        const newPinned = next.slice(0, 10);
                        localStorage.setItem('pos_pinned_order', JSON.stringify(newPinned));
                        return newPinned;
                      });
                      setDragOverId(null);
                    }}
                    onClick={() => addProduct(product)}
                    className={`flex flex-col bg-white dark:bg-slate-800 rounded-lg border p-2 shadow-sm hover:shadow-md hover:border-[#0F766E] cursor-pointer transition-all active:scale-[0.97] min-h-[70px] relative ${
                      isDragging ? 'opacity-40 scale-95' : ''
                    } ${
                      isDragOver ? 'border-[#0F766E] ring-2 ring-[#0F766E]/30 scale-[1.02]' : 'border-[#E5E7EB] dark:border-slate-700'
                    }`}
                  >
                    {slotKey && (
                      <span className="absolute top-1 right-1 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-1 rounded leading-tight">{slotKey}</span>
                    )}
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
                  );
                });
              })()}
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
                          {isSelected && (
                            <span className="text-[9px] font-bold text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">{hotkeys.unqueue} to remove</span>
                          )}
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
              <span className="absolute right-4 text-[10px] font-bold bg-white/20 px-2 py-1 rounded text-white/90">{hotkeys.checkout}</span>
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
            <span className="ml-1 text-[9px] text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-600 px-1 rounded">{hotkeys.discount}</span>
          </button>
          <button 
            onClick={() => selectedLineId && setShowVoidModal(true)}
            disabled={!selectedLineId}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg text-xs font-bold transition-all ${selectedLineId ? 'text-slate-600 dark:text-slate-300 hover:border-red-500 hover:text-red-600' : 'text-slate-400 cursor-not-allowed opacity-50'}`}
          >
            <Trash2 className="w-4 h-4" /> Void Item
            <span className="ml-1 text-[9px] text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-600 px-1 rounded">{hotkeys.voidItem}</span>
          </button>
          <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={() => { setDraftHotkeys(hotkeys); setShowHotkeySettings(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#0F766E] transition-all"
            >
              <Keyboard className="w-4 h-4" /> Hotkeys
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600" />
            <button
              onClick={toggleHotkeys}
              title={hasKeyboard ? undefined : 'No keyboard detected — hotkeys may not work'}
              className={`px-2 py-2 text-[10px] font-bold transition-all ${
                hotkeysEnabled
                  ? 'text-[#0F766E]'
                  : 'text-slate-400'
              }`}
            >
              {hotkeysEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
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

        {/* Device indicator — bottom right */}
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            {deviceType === 'desktop' && <Monitor className="w-4 h-4" />}
            {deviceType === 'tablet' && <Tablet className="w-4 h-4" />}
            {deviceType === 'mobile' && <Smartphone className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {deviceType === 'desktop' ? 'Desktop' : deviceType === 'tablet' ? 'Tablet' : 'Mobile'}
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-800 text-white dark:bg-slate-700 text-[11px] leading-relaxed" align="end">
            {deviceType === 'desktop' && 'Running on Desktop — drag & drop and hotkeys are fully supported.'}
            {deviceType === 'tablet' && 'Running on Tablet — drag & drop may work with mouse; hotkeys require a connected keyboard.'}
            {deviceType === 'mobile' && 'Running on Mobile — drag & drop and hotkeys are not supported on this device.'}
          </TooltipContent>
        </Tooltip>
      </footer>

      {/* Hotkey Settings Modal */}
      {showHotkeySettings && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-[#0F766E]" /> Hotkey Settings
            </h3>
            <p className="text-xs text-slate-400 mb-3">Click a key badge then press any key to remap. Press Esc while recording to cancel.</p>

            {/* Quick Presets */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Presets</p>
              <div className="grid grid-cols-3 gap-2">
                {HOTKEY_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setDraftHotkeys(preset.keys); setRecordingAction(null); }}
                    className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:border-[#0F766E] hover:bg-[#E8F7F2] dark:hover:bg-[#0F766E]/20 hover:text-[#0F766E] transition-all text-left"
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{preset.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-700 mb-4" />

            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mb-5">
              {/* Left column: general actions */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">General</p>
                {(['focusSearch','checkout','discount','closeModal','voidItem','newTransaction','unqueue','selectFirstQueue','selectNextItem','selectPrevItem'] as HotkeyAction[]).map(action => (
                  <div key={action} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{HOTKEY_LABELS[action]}</span>
                    <button
                      onClick={() => setRecordingAction(action)}
                      className={`shrink-0 min-w-[90px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        recordingAction === action
                          ? 'bg-[#0F766E] text-white border-[#0F766E] animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-[#0F766E] hover:text-[#0F766E]'
                      }`}
                    >
                      {recordingAction === action ? 'Press a key...' : draftHotkeys[action]}
                    </button>
                  </div>
                ))}
              </div>
              {/* Right column: product slots */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Product Slots</p>
                {(Array.from({length: 10}, (_, i) => `product_${i}` as ProductSlotKey)).map((action, i) => (
                  <div key={action} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">Slot {i + 1}</span>
                    <button
                      onClick={() => setRecordingAction(action)}
                      className={`shrink-0 min-w-[90px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        recordingAction === action
                          ? 'bg-[#0F766E] text-white border-[#0F766E] animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-[#0F766E] hover:text-[#0F766E]'
                      }`}
                    >
                      {recordingAction === action ? 'Press a key...' : draftHotkeys[action]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowHotkeySettings(false); setRecordingAction(null); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
              <button onClick={() => { setDraftHotkeys(DEFAULT_HOTKEYS); setRecordingAction(null); }} className="flex-1 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Reset Defaults</button>
              <button onClick={saveHotkeys} className="flex-1 py-2 bg-[#0F766E] text-white font-bold rounded-lg hover:bg-[#0d615b]">Save</button>
            </div>
          </div>
        </div>
      )}

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
                <span className="absolute right-4 text-[10px] bg-white/20 px-2 py-1 rounded">{hotkeys.checkout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          THERMAL RECEIPT & PAYMENT SUCCESS OVERLAY
          ========================================================= */}
          
      {showPrintedReceipt && receipt && (
        <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 font-sans no-print-bg">
          <div className="bg-white shadow-2xl rounded-2xl w-[380px] overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
            
            {/* Header & Change Due Handoff Hero Banner (Screen Only) */}
            <div className="bg-[#0F766E] text-white p-5 text-center no-print">
              <div className="flex items-center justify-center gap-2 font-bold text-base mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Payment Successful</span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center justify-center gap-1.5 mb-3">
                <Printer className="w-3.5 h-3.5" /> Thermal receipt automatically printed
              </p>

              {/* Prominent Change Due Box */}
              <div className="bg-white text-[#0F766E] rounded-xl p-3 shadow-inner">
                <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-500 mb-0.5">
                  Cash Change Due
                </span>
                <span className="text-3xl font-black tracking-tight block text-[#0F766E]">
                  {formatCurrency(receipt.change_due ?? 0)}
                </span>
              </div>
            </div>

            {/* Printable Thermal Receipt Content */}
            <div className="flex-1 overflow-y-auto p-6 receipt-print-area font-mono text-xs text-black hide-scrollbar bg-white">
              <div className="text-center mb-4">
                <h1 className="text-lg font-bold mb-0.5">WiWaste Store</h1>
                <p className="text-[10px] text-slate-600">123 Retail Avenue, Metro Manila</p>
                <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {isVatRegistered ? 'VAT REG TIN: 000-123-456-000' : 'NON-VAT OFFICIAL RECEIPT'}
                </p>
              </div>

              <div className="mb-3 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Txn:</span>
                  <span className="font-bold">#POS-2026-{receipt.transaction_id.slice(-6)}</span>
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

              <div className="border-t border-b border-dashed border-black py-2 mb-3">
                <div className="flex justify-between font-bold mb-1.5">
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

              <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receipt.total_amount - (isVatRegistered ? receipt.total_amount * 0.12 : 0))}</span>
                </div>
                {isVatRegistered && (
                  <div className="flex justify-between">
                    <span>VAT (12%)</span>
                    <span>{formatCurrency(receipt.total_amount * 0.12)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs mt-2 pt-2 border-t border-black">
                  <span>Grand Total</span>
                  <span>{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-black pt-2 mb-4 space-y-1">
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

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                <p className="font-bold mb-0.5">Thank you for shopping with us!</p>
                <p>Please come again.</p>
                <p className="mt-2 text-[9px]">Powered by WiWaste POS</p>
              </div>
            </div>
            
            {/* Non-printed Action Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex gap-2 no-print">
              <button 
                onClick={() => {
                  try { window.print(); } catch {}
                }}
                className="py-3 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Re-Print
              </button>
              <button 
                onClick={startNewTransaction}
                className="flex-1 py-3 text-xs font-bold text-white bg-[#0F766E] rounded-xl shadow-sm hover:bg-[#0d615b] transition-all flex items-center justify-center gap-2"
              >
                Start New Transaction
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DEDICATED 80MM THERMAL RECEIPT PRINT TARGET (PORTAL DIRECTLY TO BODY)
          ========================================================= */}
      {receipt && createPortal(
        <div id="thermal-receipt-print-target">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>WiWaste Store</div>
            <div style={{ fontSize: '10px' }}>123 Retail Avenue, Metro Manila</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
              {isVatRegistered ? 'VAT REG TIN: 000-123-456-000' : 'NON-VAT OFFICIAL RECEIPT'}
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', marginBottom: '8px' }}>
            <div className="flex-row-item">
              <span>Txn #:</span>
              <span>#POS-2026-{receipt.transaction_id.slice(-6)}</span>
            </div>
            <div className="flex-row-item">
              <span>Date:</span>
              <span>{receipt.transaction_date}</span>
            </div>
            <div className="flex-row-item">
              <span>Cashier:</span>
              <span>{receipt.cashier_name}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
            <div className="flex-row-item" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              <span style={{ width: '30px' }}>Qty</span>
              <span style={{ flex: 1 }}>Item</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {receipt.items.map((item, idx) => (
              <div key={idx} className="flex-row-item" style={{ marginBottom: '2px' }}>
                <span style={{ width: '30px' }}>{item.quantity}</span>
                <span style={{ flex: 1, paddingRight: '4px' }}>{item.product_name}</span>
                <span style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div className="flex-row-item">
              <span>Subtotal:</span>
              <span>{formatCurrency(receipt.total_amount - (isVatRegistered ? receipt.total_amount * 0.12 : 0))}</span>
            </div>
            {isVatRegistered && (
              <div className="flex-row-item">
                <span>VAT (12%):</span>
                <span>{formatCurrency(receipt.total_amount * 0.12)}</span>
              </div>
            )}
            <div className="flex-row-item" style={{ fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(receipt.total_amount)}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', marginBottom: '8px' }}>
            <div className="flex-row-item">
              <span>Payment Method:</span>
              <span>{receipt.payment_method}</span>
            </div>
            <div className="flex-row-item">
              <span>Amount Tendered:</span>
              <span>{receipt.amount_tendered ? formatCurrency(receipt.amount_tendered) : formatCurrency(receipt.total_amount)}</span>
            </div>
            <div className="flex-row-item" style={{ fontWeight: 'bold' }}>
              <span>Change Due:</span>
              <span>{formatCurrency(receipt.change_due ?? 0)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
            <div>Thank you for shopping with us!</div>
            <div>Please come again.</div>
            <div style={{ marginTop: '4px', fontSize: '9px' }}>Powered by WiWaste POS</div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
