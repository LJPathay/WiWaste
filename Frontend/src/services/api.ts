// Central API service — all backend calls go through here
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

function getToken(): string | null {
  return localStorage.getItem('wiwaste_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('wiwaste_token');
    }
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ───────────────────────────────────────────────
export const auth = {
  login: (username: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request<ApiUser>('/me'),
};

// ─── Users ──────────────────────────────────────────────
export const users = {
  list: () => request<ApiUser[]>('/users'),
  create: (data: CreateUserPayload) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateUserPayload>) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Categories ─────────────────────────────────────────
export const categories = {
  list: () => request<ApiCategory[]>('/categories'),
  create: (name: string) =>
    request('/categories', { method: 'POST', body: JSON.stringify({ Category_name: name }) }),
  update: (id: number, name: string) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ Category_name: name }) }),
  delete: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),
};

// ─── Suppliers ──────────────────────────────────────────
export const suppliers = {
  list: () => request<ApiSupplier[]>('/suppliers'),
  create: (data: CreateSupplierPayload) =>
    request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateSupplierPayload>) =>
    request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/suppliers/${id}`, { method: 'DELETE' }),
};

// ─── Products ───────────────────────────────────────────
export const products = {
  list: () => request<ApiProduct[]>('/products'),
  lookup: (code: string) => request<ApiProduct>(`/products/lookup/${encodeURIComponent(code)}`),
  create: (data: CreateProductPayload) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateProductPayload>) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),
};

// ─── Inventory ──────────────────────────────────────────
export const inventory = {
  list: (params?: { search?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<ApiInventory[]>(`/inventory${q ? '?' + q : ''}`);
  },
  stockIn: (data: { product_id: number; quantity: number; remarks?: string }) =>
    request('/inventory/stock-in', { method: 'POST', body: JSON.stringify(data) }),
  stockOut: (data: { product_id: number; quantity: number; remarks?: string }) =>
    request('/inventory/stock-out', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Wastage ────────────────────────────────────────────
export const wastage = {
  list: () => request<ApiWastage[]>('/wastage'),
  record: (data: CreateWastagePayload) =>
    request('/wastage', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Sales (POS) ────────────────────────────────────────
export const sales = {
  list: () => request<ApiSalesTransaction[]>('/sales'),
  create: (data: CreateSalePayload) =>
    request('/sales', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Returns ────────────────────────────────────────────
export const returns = {
  list: () => request<ApiReturn[]>('/returns'),
  create: (data: CreateReturnPayload) =>
    request('/returns', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Reports ────────────────────────────────────────────
export const reports = {
  wasteSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiReport[]>('/reports/waste-summary' + (q ? '?' + q : ''));
  },
  inventoryMovement: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiReport[]>('/reports/inventory-movement' + (q ? '?' + q : ''));
  },
  supplierPerformance: () => request<ApiReport[]>('/reports/supplier-performance'),
  expiryAnalysis: (days?: number) => request<ApiReport[]>(`/reports/expiry-analysis${days ? '?days=' + days : ''}`),
  categoryAnalysis: () => request<ApiReport[]>('/reports/category-analysis'),
  costImpact: () => request<ApiReport[]>('/reports/cost-impact'),
};

// ─── Settings ───────────────────────────────────────────
export const settings = {
  get: () => request<Record<string, string>>('/settings'),
  update: (data: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Dashboard ──────────────────────────────────────────
export const dashboard = {
  overview: () => request<ApiDashboard>('/dashboard/overview'),
};

// ─── Types ──────────────────────────────────────────────
export interface ApiUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'Admin' | 'Inventory' | 'Business Owner';
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface ApiCategory {
  id: number;
  name: string;
  product_count: number;
}

export interface ApiSupplier {
  id: number;
  name: string;
  contact_person: string | null;
  contact_number: string;
  address: string | null;
  product_count: number;
}

export interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  plu_code?: string;
  category_id: number;
  category: string;
  supplier_id: number;
  supplier: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  expiration_date: string | null;
  status: 'Active' | 'Discontinued';
  stock: number;
  stock_status: 'Normal' | 'Low Stock' | 'Overstock';
}

export interface ApiInventory {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  supplier: string;
  supplier_id?: number;
  current_stock: number;
  stock_status: 'Normal' | 'Low Stock' | 'Overstock';
  reorder_level: number;
  expiration_date: string | null;
  last_updated: string;
}

export interface ApiWastage {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  recorded_by: string;
  wastage_type: 'Expired' | 'Damaged' | 'Spoiled' | 'Lost';
  quantity: number;
  estimated_loss: number;
  date_recorded: string;
}

export interface ApiSalesTransaction {
  id: number;
  cashier: string;
  total_amount: number;
  transaction_date: string;
  payment_method: string;
  amount_tendered: number | null;
  change_due: number | null;
  status: string;
  items: ApiSalesItem[];
}

export interface ApiSalesItem {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ApiReturn {
  id: number;
  product_name: string;
  returned_by: string;
  quantity_returned: number;
  reason: string | null;
  refund_amount: number;
  return_date: string;
}

export interface CreateUserPayload {
  Full_name: string;
  username: string;
  password: string;
  email?: string;
  role: 'Admin' | 'Inventory' | 'Business Owner';
  status: 'Active' | 'Inactive';
}

export interface CreateSupplierPayload {
  supplier_name: string;
  contact_person?: string;
  contact_number: string;
  address?: string;
}

export interface CreateProductPayload {
  category_id: number;
  supplier_id: number;
  barcode?: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  expiration_date?: string;
  initial_stock?: number;
}

export interface CreateWastagePayload {
  product_id: number;
  wastage_type: 'Expired' | 'Damaged' | 'Spoiled' | 'Lost';
  quantity: number;
  estimated_loss: number;
  date_recorded: string;
}

export interface CreateSalePayload {
  payment_method: 'Cash' | 'E-wallet' | 'Credit Card' | 'Debit Card';
  amount_tendered?: number;
  change_due?: number;
  senior_pwd_name?: string | null;
  senior_pwd_id?: string | null;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_pct?: number;
    discount_amount?: number;
  }>;
}

export interface CreateReturnPayload {
  sale_item_id: number;
  quantity_returned: number;
  reason?: string;
  refund_amount: number;
  return_date: string;
}

export interface ApiReport {
  [key: string]: unknown;
}

export interface ApiDashboard {
  active_skus: number;
  total_users: number;
  active_suppliers: number;
  today_sales: number;
  recent_wastage: number;
}

// ─── Purchase Orders ──────────────────────────────────────
export const purchaseOrders = {
  list: (params?: { status?: string; search?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<any>(`/purchase-orders${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<any>(`/purchase-orders/${id}`),
  create: (data: any) =>
    request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  receive: (id: number, items: { po_item_id: number; received_qty: number }[]) =>
    request(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify({ items }) }),
};

// ─── Audit Logs ───────────────────────────────────────────
export const auditLogs = {
  list: (params?: { search?: string; action?: string; entity_type?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.action) qs.set('action', params.action);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<any>(`/audit-logs${q ? '?' + q : ''}`);
  },
};

// ─── Profit & Loss ────────────────────────────────────────
export const profitLoss = {
  overview: () => request<any>('/profit-loss/overview'),
  byCategory: () => request<any[]>('/profit-loss/by-category'),
  trends: (period?: string) => request<any[]>(`/profit-loss/trends${period ? '?period=' + period : ''}`),
};

// ─── Inventory Analytics ──────────────────────────────────
export const inventoryAnalytics = {
  turnover: () => request<any>('/analytics/turnover'),
  overstock: () => request<any>('/analytics/overstock'),
  deadStock: () => request<any>('/analytics/dead-stock'),
};
