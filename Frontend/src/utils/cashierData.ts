export type PaymentMethod = 'Cash' | 'E-wallet' | 'Credit Card' | 'Debit Card';

export interface CashierProduct {
  product_id: string;
  category_id: string;
  supplier_id: string;
  barcode: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  expiration_date: string;
  current_stock: number;
  image_url?: string;
  capstone_badge?: { type: 'overstock' | 'fefo' | 'leakage'; label: string; severity: 'low' | 'medium' | 'high' };
}

export interface SalesItem {
  sales_item_id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SalesTransaction {
  transaction_id: string;
  user_id: string;
  cashier_name: string;
  total_amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
  amount_tendered: number | null;
  change_due: number | null;
  status: 'Completed' | 'Voided' | 'Refunded';
  items: SalesItem[];
}

export interface ReturnTransaction {
  return_id: string;
  sale_item_id: string;
  transaction_id: string;
  product_name: string;
  user_id: string;
  processed_by: string;
  quantity_returned: number;
  reason: string;
  refund_amount: number;
  return_date: string;
}

export interface StockMovementRecord {
  movement_id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  movement_type: 'Stock In' | 'Stock Out';
  quantity: number;
  remarks: string;
  movement_date: string;
  sale_item_id: string | null;
  wastage_id: string | null;
  return_id: string | null;
  source: string;
}

export const paymentMethods: PaymentMethod[] = ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'];

export const cashierProducts: CashierProduct[] = [
  {
    product_id: 'P-1001',
    category_id: 'CAT-PHARMA',
    supplier_id: 'SUP-UNILAB',
    barcode: '4806507830015',
    product_name: 'Biogesic Paracetamol 500mg',
    cost_price: 15,
    selling_price: 25,
    reorder_level: 10,
    expiration_date: '2026-11-15',
    current_stock: 72,
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80',
    capstone_badge: { type: 'fefo', label: 'Expires in 6 days', severity: 'high' }
  },
  {
    product_id: 'P-1002',
    category_id: 'CAT-PHARMA',
    supplier_id: 'SUP-UNILAB',
    barcode: '4806507830022',
    product_name: 'Neozep Forte Tablet',
    cost_price: 11,
    selling_price: 18,
    reorder_level: 12,
    expiration_date: '2026-10-08',
    current_stock: 64,
    image_url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&q=80',
  },
  {
    product_id: 'P-1003',
    category_id: 'CAT-VITAMIN',
    supplier_id: 'SUP-UNILAB',
    barcode: '4806507830039',
    product_name: 'Enervon-C Tablets',
    cost_price: 7,
    selling_price: 12,
    reorder_level: 20,
    expiration_date: '2027-01-20',
    current_stock: 130,
    image_url: 'https://images.unsplash.com/photo-1550572017-edb3df213b28?w=300&q=80',
  },
  {
    product_id: 'P-1004',
    category_id: 'CAT-GROCERY',
    supplier_id: 'SUP-NESTLE',
    barcode: '4800361410018',
    product_name: 'Nescafe 3-in-1 Original',
    cost_price: 6.5,
    selling_price: 10,
    reorder_level: 30,
    expiration_date: '2026-12-01',
    current_stock: 180,
    image_url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=300&q=80',
    capstone_badge: { type: 'leakage', label: 'Leakage Risk: Low', severity: 'low' }
  },
  {
    product_id: 'P-1005',
    category_id: 'CAT-GROCERY',
    supplier_id: 'SUP-MONDE',
    barcode: '4800016010014',
    product_name: 'Lucky Me! Pancit Canton',
    cost_price: 8.5,
    selling_price: 12,
    reorder_level: 25,
    expiration_date: '2026-09-12',
    current_stock: 320,
    image_url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80',
    capstone_badge: { type: 'overstock', label: 'Overstock Risk: Medium', severity: 'medium' }
  },
];

export const initialSalesTransactions: SalesTransaction[] = [
  {
    transaction_id: 'SALE-20260714-001',
    user_id: 'cashier-001',
    cashier_name: 'Carlo Reyes',
    total_amount: 85,
    transaction_date: '2026-07-14 09:12',
    payment_method: 'Cash',
    amount_tendered: 100,
    change_due: 15,
    status: 'Completed',
    items: [
      {
        sales_item_id: 'SI-001',
        transaction_id: 'SALE-20260714-001',
        product_id: 'P-1001',
        product_name: 'Biogesic Paracetamol 500mg',
        quantity: 1,
        unit_price: 25,
        subtotal: 25,
      },
      {
        sales_item_id: 'SI-002',
        transaction_id: 'SALE-20260714-001',
        product_id: 'P-1003',
        product_name: 'Enervon-C Tablets',
        quantity: 5,
        unit_price: 12,
        subtotal: 60,
      },
    ],
  },
  {
    transaction_id: 'SALE-20260714-002',
    user_id: 'cashier-001',
    cashier_name: 'Carlo Reyes',
    total_amount: 46,
    transaction_date: '2026-07-14 10:26',
    payment_method: 'E-wallet',
    amount_tendered: null,
    change_due: null,
    status: 'Completed',
    items: [
      {
        sales_item_id: 'SI-003',
        transaction_id: 'SALE-20260714-002',
        product_id: 'P-1002',
        product_name: 'Neozep Forte Tablet',
        quantity: 2,
        unit_price: 18,
        subtotal: 36,
      },
      {
        sales_item_id: 'SI-004',
        transaction_id: 'SALE-20260714-002',
        product_id: 'P-1004',
        product_name: 'Nescafe 3-in-1 Original',
        quantity: 1,
        unit_price: 10,
        subtotal: 10,
      },
    ],
  },
  {
    transaction_id: 'SALE-20260714-003',
    user_id: 'cashier-002',
    cashier_name: 'Anna Lim',
    total_amount: 240,
    transaction_date: '2026-07-14 11:05',
    payment_method: 'Credit Card',
    amount_tendered: null,
    change_due: null,
    status: 'Completed',
    items: [
      {
        sales_item_id: 'SI-005',
        transaction_id: 'SALE-20260714-003',
        product_id: 'P-1005',
        product_name: 'Lucky Me! Pancit Canton',
        quantity: 20,
        unit_price: 12,
        subtotal: 240,
      },
    ],
  },
];

export const initialReturnTransactions: ReturnTransaction[] = [
  {
    return_id: 'RET-20260714-001',
    sale_item_id: 'SI-003',
    transaction_id: 'SALE-20260714-002',
    product_name: 'Neozep Forte Tablet',
    user_id: 'cashier-001',
    processed_by: 'Carlo Reyes',
    quantity_returned: 1,
    reason: 'Customer returned unopened item with original receipt',
    refund_amount: 18,
    return_date: '2026-07-14 10:58',
  },
];

export const initialStockMovements: StockMovementRecord[] = [
  {
    movement_id: 'MOV-001',
    product_id: 'P-1001',
    product_name: 'Biogesic Paracetamol 500mg',
    user_id: 'cashier-001',
    movement_type: 'Stock Out',
    quantity: 1,
    remarks: 'POS sale completed',
    movement_date: '2026-07-14 09:12',
    sale_item_id: 'SI-001',
    wastage_id: null,
    return_id: null,
    source: 'Sale #SALE-20260714-001',
  },
  {
    movement_id: 'MOV-002',
    product_id: 'P-1002',
    product_name: 'Neozep Forte Tablet',
    user_id: 'cashier-001',
    movement_type: 'Stock In',
    quantity: 1,
    remarks: 'Returned item restocked',
    movement_date: '2026-07-14 10:58',
    sale_item_id: null,
    wastage_id: null,
    return_id: 'RET-20260714-001',
    source: 'Return #RET-20260714-001',
  },
  {
    movement_id: 'MOV-003',
    product_id: 'P-1005',
    product_name: 'Lucky Me! Pancit Canton',
    user_id: 'inventory-001',
    movement_type: 'Stock Out',
    quantity: 4,
    remarks: 'Expired items removed',
    movement_date: '2026-07-13 16:20',
    sale_item_id: null,
    wastage_id: 'WAS-20260713-004',
    return_id: null,
    source: 'Wastage #WAS-20260713-004',
  },
  {
    movement_id: 'MOV-004',
    product_id: 'P-1004',
    product_name: 'Nescafe 3-in-1 Original',
    user_id: 'inventory-001',
    movement_type: 'Stock In',
    quantity: 50,
    remarks: 'Weekly delivery',
    movement_date: '2026-07-13 08:35',
    sale_item_id: null,
    wastage_id: null,
    return_id: null,
    source: 'Manual Adjustment',
  },
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
}

export function createTransactionId() {
  return `SALE-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-4)}`;
}

export function createReturnId() {
  return `RET-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-4)}`;
}
