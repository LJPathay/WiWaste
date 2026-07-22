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
  list: () => request<ApiInventory[]>('/inventory'),
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
  current_stock: number;
  stock_status: 'Normal' | 'Low Stock' | 'Overstock';
  reorder_level: number;
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
