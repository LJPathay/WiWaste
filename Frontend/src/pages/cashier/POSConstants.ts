import type { CashierProduct } from '../../utils/cashierData';
import type { ApiProduct } from '../../services/api';

export interface CartLine {
  product: CashierProduct;
  quantity: number;
  discountPct?: number;
  discountAmount?: number;
  originalPrice?: number;
  overrideReason?: string;
}

export const PRODUCT_SLOT_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
export type ProductSlotKey = `product_${0|1|2|3|4|5|6|7|8|9}`;
export type HotkeyAction = 'focusSearch' | 'checkout' | 'discount' | 'closeModal' | 'voidItem' | 'newTransaction' | 'unqueue' | 'selectFirstQueue' | 'selectNextItem' | 'selectPrevItem' | ProductSlotKey;

export const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
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

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
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

export type HotkeyPreset = { label: string; description: string; keys: Record<HotkeyAction, string> };
export const HOTKEY_PRESETS: HotkeyPreset[] = [
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

export const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'CAT-GROCERY', label: 'Grocery' },
  { id: 'CAT-BEVERAGE', label: 'Beverages' },
  { id: 'CAT-SNACK', label: 'Snacks' },
  { id: 'CAT-HOUSEHOLD', label: 'Household' },
  { id: 'CAT-PHARMA', label: 'Pharmacy' },
  { id: 'CAT-PERSONAL', label: 'Personal Care' },
];

// Backend category names → POS category filter slugs.
export const DB_CATEGORY_TO_SLUG: Record<string, string> = {
  'Food & Beverage': 'CAT-GROCERY',
  'Medicine & Health': 'CAT-PHARMA',
  'Personal Care': 'CAT-PERSONAL',
  'Household': 'CAT-HOUSEHOLD',
  'Dairy': 'CAT-GROCERY',
  'Frozen Goods': 'CAT-GROCERY',
  'Beverages': 'CAT-BEVERAGE',
  'Snacks': 'CAT-SNACK',
};

export function apiProductToCashier(api: ApiProduct): CashierProduct {
  return {
    product_id: `P-${String(api.id).padStart(4, '0')}`,
    db_id: api.id,
    plu_code: String(api.id),
    category_id: DB_CATEGORY_TO_SLUG[api.category] ?? 'CAT-GROCERY',
    supplier_id: `SUP-${api.supplier?.toUpperCase() ?? 'GEN'}`,
    barcode: api.sku,
    product_name: api.name,
    cost_price: api.cost_price,
    selling_price: api.selling_price,
    reorder_level: api.reorder_level,
    expiration_date: api.expiration_date ?? '',
    current_stock: api.stock,
  };
}

const POS_CATALOG_CACHE_KEY = 'wiwaste_pos_catalog';
const POS_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

export function resolveCatalogSource(catalog: CashierProduct[], fallback: CashierProduct[], apiFailed: boolean): CashierProduct[] {
  if (catalog.length > 0) return catalog;
  return apiFailed ? fallback : [];
}

export function loadCachedCatalog(): CashierProduct[] | null {
  try {
    const raw = localStorage.getItem(POS_CATALOG_CACHE_KEY);
    if (!raw) return null;
    const { savedAt, products } = JSON.parse(raw);
    if (!Array.isArray(products) || Date.now() - Number(savedAt) > POS_CATALOG_CACHE_TTL_MS) return null;
    return products as CashierProduct[];
  } catch {
    return null;
  }
}

export function saveCachedCatalog(products: CashierProduct[]): void {
  try {
    localStorage.setItem(POS_CATALOG_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), products }));
  } catch {
    // storage unavailable — catalog still loads from the network
  }
}
