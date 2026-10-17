// Central API service — all backend calls go through here
import type {
  ApiWastageFlag,
  ApiStockCount,
  CreateStockCountPayload,
  ApiSalesWastageOverview,
  ApiSalesWastageTimeSeries,
  ApiFlagsSummary,
  ApiReorderSuggestionsResponse,
  PaginatedResponseWithMeta,
  RetentionPoliciesResponse,
  PaginatedResponse,
  ApiUser,
  CreateUserPayload,
  UpdateUserPayload,
  ApiCategory,
  ApiSupplier,
  ApiSupplierDetail,
  ApiSupplierComplianceResponse,
  ApiSupplierAlertResponse,
  CreateSupplierPayload,
  ApiProduct,
  CreateProductPayload,
  ApiInventory,
  ApiInventoryMovements,
  ApiStockMovement,
  ApiWastage,
  CreateWastagePayload,
  ApiSalesTransaction,
  CreateSalePayload,
  ApiReceiptResponse,
  ApiReturn,
  CreateReturnPayload,
  ApiDashboard,
  ApiOwnerAnalytics,
  ApiDashboardSummary,
  ApiFefoList,
  ApiFefoBatchDetail,
  ApiTraceResponse,
  ApiRecommendation,
  ApiRecommendationDetail,
  ApiStockReceiving,
  CreateStockReceivingPayload,
  ApiPurchaseOrder,
  CreatePurchaseOrderPayload,
  ApiAuditLog,
  ApiReport,
  ApiSalesVatSummary,
  ApiDiscountSummary,
  ApiSeniorPwdTransaction,
  ApiProfitLossOverview,
  ApiProfitLossCategory,
  ApiProfitLossTrend,
  ApiTurnoverResponse,
  ApiOverstockResponse,
  ApiDeadStockResponse,
  ApiForecastOverview,
  ApiForecastProduct,
  RiskTier,
  ApiLossRiskSummary,
  ApiLossRiskItemsResponse,
  ApiLossRiskSummaryResponse,
  ApiExpiringResponse,
  ApiAlertSummary,
  ApiOptimizationPlan,
  ApiRecall,
  ApiRecallSummary,
  ApiSanitationChecklist,
  ApiSanitationSummary,
  ApiReorderSuggestion,
  ApiDataSubjectRequest,
  ApiDataBreachIncident,
  ApiBreachStatistics,
  ApiPrivacyComplianceReport,
  ApiRetentionSummary,
} from '../types/api';
export type {
  PaginatedResponse,
  ApiUser,
  CreateUserPayload,
  UpdateUserPayload,
  ApiCategory,
  ApiSupplier,
  ApiSupplierDetail,
  ApiSupplierComplianceResponse,
  ApiSupplierAlertResponse,
  CreateSupplierPayload,
  ProductClassification,
  StorageRequirement,
  ApiProduct,
  CreateProductPayload,
  ApiInventory,
  ApiMovement,
  ApiInventoryMovements,
  ApiStockMovement,
  ApiWastage,
  ApiWastageFlag,
  ApiStockCount,
  CreateWastagePayload,
  CreateStockCountPayload,
  ApiSalesTransaction,
  ApiSalesItem,
  CreateSalePayload,
  ApiReceiptResponse,
  ApiReturn,
  CreateReturnPayload,
  ApiDashboard,
  ApiOwnerAnalytics,
  ApiDashboardSummary,
  ApiBusiness,
  ApiBranch,
  ApiFefoBatch,
  ApiFefoList,
  ApiFefoMovement,
  ApiFefoBatchDetail,
  ApiTraceStep,
  ApiTraceResponse,
  ApiRecommendation,
  ApiRecommendationDetail,
  ApiStockReceiving,
  CreateStockReceivingPayload,
  ApiPurchaseOrderItem,
  ApiPurchaseOrder,
  CreatePurchaseOrderPayload,
  ApiAuditLog,
  ApiReport,
  ApiSalesVatSummary,
  ApiDiscountSummary,
  ApiSeniorPwdTransaction,
  ApiProfitLossOverview,
  ApiProfitLossCategory,
  ApiProfitLossTrend,
  ApiTurnoverProduct,
  ApiTurnoverResponse,
  ApiOverstockItem,
  ApiOverstockResponse,
  ApiDeadStockItem,
  ApiDeadStockResponse,
  ApiForecastPoint,
  ApiForecastRisk,
  ApiForecastOverview,
  ApiForecastProduct,
  RiskTier,
  ApiLossRiskItem,
  ApiLossRiskSummary,
  ApiLossRiskItemsResponse,
  ApiLossRiskSummaryResponse,
  ApiSalesWastageOverview,
  ApiSalesWastageCategoryBreakdown,
  ApiTopWastedProduct,
  ApiSlowMover,
  ApiSalesWastageTimeSeries,
  ApiFlagsSummary,
  ApiAlertBatch,
  ApiAlertSupplier,
  ApiExpiringResponse,
  ApiAlertSummary,
  ApiReplenishmentPlanItem,
  ApiOptimizationPlan,
  ApiRecall,
  ApiRecallSummary,
  ApiSanitationChecklist,
  ApiSanitationSummary,
  ApiReorderSuggestionItem,
  ApiReorderSuggestion,
  ApiReorderSummary,
  ApiReorderSuggestionsResponse,
  ApiDataSubjectRequest,
  ApiDataBreachIncident,
  ApiBreachStatistics,
  ApiPrivacyComplianceReport,
  ApiRetentionPolicy,
  ApiRetentionSummary,
} from '../types/api';

// The SPA and Laravel run on different ports in development (5173 -> 8000), so calling
// the API by absolute URL is cross-origin: every response is subject to CORS, and since
// requests carry credentials the browser rejects the whole batch when the server does not
// echo the exact origin. A relative base goes through the Vite dev proxy instead, which
// makes development same-origin — no preflight, no credentialed-cookie rules. Set
// VITE_API_URL to an absolute URL to talk to a backend on another host.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '');

function getToken(): string | null {
  return localStorage.getItem('wiwaste_token');
}

let freshRequests = 0;
export async function withFreshResponse<T>(run: () => Promise<T>): Promise<T> {
  freshRequests++;
  try { return await run(); } finally { freshRequests--; }
}

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter: number;
  readonly lockedUntil?: string;
  readonly errors: Record<string, string[]>;

  constructor(status: number, body: Record<string, unknown>) {
    const errors = (body.errors ?? {}) as Record<string, string[]>;
    const firstValidationMessage = Object.values(errors).flat()[0];
    // A 5xx usually means the request completed but the server could not answer — often a
    // stopped backend behind a proxy. "HTTP 500" alone gave the operator nothing to act on.
    const fallback = status >= 500
      ? `The API answered HTTP ${status} without a message. The request did not complete, so the backend may be down or failing.`
      : `HTTP ${status}`;
    super(firstValidationMessage ?? (typeof body.message === 'string' ? body.message : fallback));
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = Math.max(0, Number(body.retry_after) || 0);
    this.lockedUntil = typeof body.locked_until === 'string' ? body.locked_until : undefined;
    this.errors = errors;
  }
}

// Endpoints that must never trigger the "session expired" redirect: either they
// are the credential exchange itself or they return 401 for bad input, not for an
// expired session.
const AUTH_FREE_PATHS = [
  '/login',
  '/refresh',
  '/forgot-password',
  '/reset-password',
  '/password/forgot',
  '/password/reset',
  '/password/verify-otp',
];

// Single-flight refresh: a dashboard burst can produce several simultaneous 401s,
// and each must not delete the rotated refresh cookie by racing the others.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = (await res.json().catch(() => null)) as
          | { data?: { access_token?: string }; access_token?: string; token?: string }
          | null;
        const renewed = body?.data?.access_token ?? body?.access_token ?? body?.token ?? null;
        if (renewed) localStorage.setItem('wiwaste_token', renewed);
        return renewed;
      })
      .catch(() => null)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = getToken();
  console.debug('[API] Request:', path, 'Token:', token?.substring(0, 20) + '...');

  // A rejected `fetch` means the request never produced a response: the backend is not
  // running, the URL is wrong, or the browser blocked it. Rethrowing the raw TypeError
  // surfaced as "Connection error (Unknown)" in the UI, which hid all three causes.
  const send = async (bearer: string | null): Promise<Response> => {
    try {
      return await fetch(`${BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
        cache: options.cache ?? (freshRequests > 0 ? 'reload' : 'default'),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...((options.headers as Record<string, string>) ?? {}),
        },
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'no response was returned';
      throw new Error(`Cannot reach the API at ${BASE_URL}${path} (${detail}).`);
    }
  };

  let res = await send(token);

  // Access tokens live for 15 minutes. Renew once with the HttpOnly refresh
  // cookie and replay the request instead of bouncing the user to /login.
  if (res.status === 401 && allowRefresh && !AUTH_FREE_PATHS.includes(path)) {
    const renewed = await refreshAccessToken();
    if (renewed) res = await send(renewed);
  }

  console.debug('[API] Response:', path, 'Status:', res.status);
  if (!res.ok) {
    if (res.status === 401 && !AUTH_FREE_PATHS.includes(path) && token && getToken() === token) {
      localStorage.removeItem('wiwaste_token');
      localStorage.removeItem('wiwaste_user');
      localStorage.removeItem('wiwaste-session');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    // A non-JSON body (an HTML proxy error page, for example) must still produce a
    // useful message rather than "Unknown error".
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ───────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  user: ApiUser;
}

type ResetPasswordInput = { email: string; otp: string; password: string; password_confirmation: string };
export const auth = {
  login: async (username: string, password: string) => {
    const result = await request<{ token?: string; access_token?: string; user?: unknown; data?: LoginResponse }>('/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    });
    const value = result.data ?? result;
    return { token: ('token' in value ? value.token : undefined) ?? value.access_token ?? '', user: normalizeUser(value.user) };
  },
  forgotPassword: (email: string) => request<{ message: string }>('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (input: ResetPasswordInput | string, otp?: string, password?: string, confirmation?: string) => {
    const data = typeof input === 'string' ? { email: input, otp, password, password_confirmation: confirmation } : input;
    return request<{ message: string }>('/reset-password', { method: 'POST', body: JSON.stringify(data) });
  },
  verifyOtp: (email: string, otp: string) => request<{ verified: boolean }>('/password/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request<ApiUser | { data: ApiUser }>('/me'),
  refresh: () => request('/refresh', { method: 'POST' }),
};

export function normalizeUser(value: unknown): ApiUser {
  if (!value || typeof value !== 'object') throw new Error('The server returned an invalid user account.');
  const envelope = value as Record<string, unknown>;
  const raw = (envelope.user && typeof envelope.user === 'object' ? envelope.user : envelope.data && typeof envelope.data === 'object' ? envelope.data : envelope) as Record<string, unknown>;
  const id = Number(raw.id ?? raw.user_id);
  if (!Number.isFinite(id) || id <= 0) throw new Error('The server returned a user account without a valid ID.');
  const field = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : '';
  const fullName = field('name') || field('Full_name') || [field('First_name'), field('Middle_name'), field('Surname')].filter(Boolean).join(' ');
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    ...raw,
    id,
    name: fullName || field('username'),
    Full_name: fullName,
    First_name: field('First_name') || parts[0] || '',
    Middle_name: field('Middle_name') || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''),
    Surname: field('Surname') || (parts.length > 1 ? parts.at(-1) : '') || '',
    username: field('username'),
    email: field('email'),
    contact_number: field('contact_number'),
    address: field('address'),
    role: (field('role') === 'Business Owner' ? 'Cashier' : field('role')) as ApiUser['role'],
    status: field('status') as ApiUser['status'],
  };
}

// ─── Users ──────────────────────────────────────────────
export interface PaginatedUsersResponse {
  data: ApiUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const users = {
  list: async (page = 1) => {
    const result = await request<unknown[] | { data: unknown[] }>(`/users?page=${page}`);
    return (Array.isArray(result) ? result : result.data).map(normalizeUser);
  },
  create: async (data: CreateUserPayload) =>
    normalizeUser(await request('/users', { method: 'POST', body: JSON.stringify(data) })),
  update: async (id: number, data: UpdateUserPayload) =>
    normalizeUser(await request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })),
  archive: async (id: number) =>
    normalizeUser(await request(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Archived', status_change_confirmed: true }) })),
  delete: (id: number) => request(`/users/${id}`, { method: 'DELETE', body: JSON.stringify({ status_change_confirmed: true }) }),
  quarantine: (id: number) => request(`/users/${id}/quarantine`, { method: 'POST', body: JSON.stringify({ status_change_confirmed: true }) }),
  reactivate: (id: number) => request(`/users/${id}/reactivate`, { method: 'POST', body: JSON.stringify({ status_change_confirmed: true }) }),
};

// ─── Categories ─────────────────────────────────────────
export interface PaginatedCategoriesResponse {
  data: ApiCategory[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const categories = {
  list: (params?: { include_archived?: boolean; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.include_archived) qs.set('include_archived', 'true');
    if (params?.status) qs.set('status', params.status);
    return request<ApiCategory[]>(`/categories${qs.size ? '?' + qs : ''}`);
  },
  create: (name: string) =>
    request('/categories', { method: 'POST', body: JSON.stringify({ Category_name: name }) }),
  update: (id: number, name: string) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ Category_name: name }) }),
  delete: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),
  restore: (id: number) => request<ApiCategory>(`/categories/${id}/restore`, { method: 'POST' }),
};

// ─── Suppliers ──────────────────────────────────────────
export interface PaginatedSuppliersResponse {
  data: ApiSupplier[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const suppliers = {
  list: (page = 1, perPage = 15, search = '') => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('per_page', perPage.toString());
    if (search) params.set('search', search);
    return request<PaginatedSuppliersResponse>(`/suppliers?${params.toString()}`);
  },
  show: (id: number) => request<ApiSupplierDetail>(`/suppliers/${id}`),
  create: (data: CreateSupplierPayload) =>
    request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateSupplierPayload>) =>
    request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  compliance: () => request<ApiSupplierComplianceResponse>('/suppliers/compliance'),
  alerts: (days = 30) => request<ApiSupplierAlertResponse>(`/suppliers/alerts?days=${days}`),
};

// ─── Products ───────────────────────────────────────────
export const products = {
  list: (params?: { search?: string; category_id?: number; page?: number; per_page?: number; include_archived?: boolean; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category_id) qs.set('category_id', String(params.category_id));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.include_archived) qs.set('include_archived', 'true');
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<PaginatedResponse<ApiProduct>>(`/products${q ? '?' + q : ''}`);
  },
  lookup: (code: string) => request<ApiProduct>(`/products/lookup/${encodeURIComponent(code)}`),
  create: (data: CreateProductPayload) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateProductPayload>) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),
  restore: (id: number) => request<ApiProduct>(`/products/${id}/restore`, { method: 'POST' }),
};

// ─── Inventory ──────────────────────────────────────────
export const inventory = {
  list: (params?: { search?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiInventory>>(`/inventory${q ? '?' + q : ''}`);
  },
  stockIn: (data: { product_id: number; quantity: number; remarks?: string }) =>
    request('/inventory/stock-in', { method: 'POST', body: JSON.stringify(data) }),
  stockOut: (data: { product_id: number; quantity: number; remarks?: string }) =>
    request('/inventory/stock-out', { method: 'POST', body: JSON.stringify(data) }),
  receive: (data: { product_id: number; quantity: number; batch_number: string; expiry_date: string; remarks?: string }) =>
    request('/inventory/receive', { method: 'POST', body: JSON.stringify(data) }),
  nearExpiry: (days = 90) => request(`/inventory/near-expiry?days=${days}`),
  movements: (id: number) =>
    request<ApiInventoryMovements>(`/inventory/${id}/movements`),
  allMovements: (params?: {
    search?: string;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
    product_id?: number;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.movement_type) qs.set('movement_type', params.movement_type);
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    if (params?.product_id) qs.set('product_id', String(params.product_id));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiStockMovement>>(`/inventory/movements${q ? '?' + q : ''}`);
  },
};

// ─── Wastage ────────────────────────────────────────────
export const wastage = {
  list: (page = 1) => request<PaginatedResponse<ApiWastage>>(`/wastage?page=${page}`),
  record: (data: CreateWastagePayload) =>
    request('/wastage', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Wastage Flags ────────────────────────────────────────
export const wastageFlags = {
  list: (params?: { status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiWastageFlag>>(`/wastage-flags${q ? '?' + q : ''}`);
  },
  flag: (data: { product_id: number; batch_id?: number; quantity: number; reason: string; notes?: string }) =>
    request('/wastage-flags', { method: 'POST', body: JSON.stringify(data) }),
  confirm: (id: number) => request(`/wastage-flags/${id}/confirm`, { method: 'POST' }),
  reject: (id: number, rejection_reason: string) =>
    request(`/wastage-flags/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason }) }),
};

// ─── Stock Counts ──────────────────────────────────────────
export const stockCounts = {
  list: (params?: { status?: string; product_id?: number; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.product_id) qs.set('product_id', String(params.product_id));
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiStockCount>>(`/stock-counts${q ? '?' + q : ''}`);
  },
  create: (data: CreateStockCountPayload) =>
    request('/stock-counts', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: number) => request(`/stock-counts/${id}/approve`, { method: 'POST' }),
  reject: (id: number, rejection_reason: string) =>
    request(`/stock-counts/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason }) }),
};

// ─── Stock Receiving ────────────────────────────────────
export const stockReceiving = {
  list: (params?: { status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiStockReceiving>>(`/stock-receiving${q ? '?' + q : ''}`);
  },
  create: (data: CreateStockReceivingPayload) =>
    request('/stock-receiving', { method: 'POST', body: JSON.stringify(data) }),
  // Matches `StockReceivingController::receive()`, which keys each line by
  // `receiving_item_id` and requires a `received_quantity` of at least 1.
  receive: (id: number, items: { receiving_item_id: number; received_quantity: number; rejected_quantity?: number; notes?: string }[]) =>
    request(`/stock-receiving/${id}/receive`, { method: 'POST', body: JSON.stringify({ items }) }),
  reject: (id: number, reason: string) =>
    request(`/stock-receiving/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  discard: (id: number, reason: string) =>
    request(`/stock-receiving/${id}/discard`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// ─── Sales (POS) ────────────────────────────────────────
export const sales = {
  list: (params?: { search?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiSalesTransaction>>(`/sales${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<ApiSalesTransaction>(`/sales/${id}`),
  create: (data: CreateSalePayload) =>
    request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  receipt: (id: number) => request<ApiReceiptResponse>(`/sales/${id}/receipt`),
};

// ─── Returns ────────────────────────────────────────────
export const returns = {
  list: (params?: { page?: number; approval_status?: string; return_reason_code?: string; from_date?: string; to_date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.approval_status) qs.set('approval_status', params.approval_status);
    if (params?.return_reason_code) qs.set('return_reason_code', params.return_reason_code);
    if (params?.from_date) qs.set('from_date', params.from_date);
    if (params?.to_date) qs.set('to_date', params.to_date);
    const q = qs.toString();
    return request<PaginatedResponse<ApiReturn>>(`/returns${q ? '?' + q : ''}`);
  },
  create: (data: CreateReturnPayload) =>
    request('/returns', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: number) => request(`/returns/${id}/approve`, { method: 'POST' }),
  reject: (id: number, rejection_reason: string) =>
    request(`/returns/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason }) }),
  show: (id: number) => request<ApiReturn>(`/returns/${id}`),
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
  salesVatSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiSalesVatSummary>(`/reports/sales-vat-summary${q ? '?' + q : ''}`);
  },
  discountSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiDiscountSummary>(`/reports/discount-summary${q ? '?' + q : ''}`);
  },
  seniorPwdTransactionLog: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiSeniorPwdTransaction[]>(`/reports/senior-pwd-log${q ? '?' + q : ''}`);
  },
};

// ─── Sales vs Wastage Dashboard ────────────────────────────
export const salesWastage = {
  overview: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiSalesWastageOverview>(`/sales-wastage/overview${q ? '?' + q : ''}`);
  },
  timeSeries: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiSalesWastageTimeSeries[]>(`/sales-wastage/time-series${q ? '?' + q : ''}`);
  },
  exportCsv: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return fetch(`${BASE_URL}/sales-wastage/export${q ? '?' + q : ''}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then((res) => res.blob());
  },
  flagsSummary: () => request<ApiFlagsSummary>('/sales-wastage/flags-summary'),
};

// ─── Settings ───────────────────────────────────────────
export interface EmailDeliveryConfiguration {
  enabled: boolean;
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  username: string;
  from_address: string;
  from_name: string;
  password_configured: boolean;
}

export const emailSettings = {
  get: () => request<EmailDeliveryConfiguration>('/settings/email'),
  update: (data: Omit<EmailDeliveryConfiguration, 'password_configured'> & { password?: string }) =>
    request<EmailDeliveryConfiguration>('/settings/email', { method: 'PUT', body: JSON.stringify(data) }),
};

export const settings = {
  get: () => request<Record<string, string>>('/settings'),
  update: (data: Record<string, string>) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Dashboard ──────────────────────────────────────────
export const dashboard = {
  overview: () => request<ApiDashboard>('/dashboard/overview'),
};

// ─── Owner Dashboard Analytics ──────────────────────────
export const ownerDashboard = {
  overview: () => request<ApiDashboard>('/dashboard/overview'),
  analytics: (params?: { period?: string }) => {
    const qs = params?.period ? `?period=${params.period}` : '';
    return request<ApiOwnerAnalytics>(`/dashboard/owner-analytics${qs}`);
  },
};

// ─── Business & Branch Types ──────────────────────────────

// ─── Types ──────────────────────────────────────────────

export const purchaseOrders = {
  list: (params?: { status?: string; search?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiPurchaseOrder>>(`/purchase-orders${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<ApiPurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: CreatePurchaseOrderPayload) =>
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
    return request<PaginatedResponse<ApiAuditLog>>(`/audit-logs${q ? '?' + q : ''}`);
  },
};

// ─── Profit & Loss ────────────────────────────────────────
export const profitLoss = {
  overview: () => request<ApiProfitLossOverview>('/profit-loss/overview'),
  byCategory: () => request<ApiProfitLossCategory[]>('/profit-loss/by-category'),
  trends: (period?: string) => request<ApiProfitLossTrend[]>(`/profit-loss/trends${period ? '?period=' + period : ''}`),
};

// ─── Inventory Analytics ──────────────────────────────────
export const inventoryAnalytics = {
  turnover: () => request<ApiTurnoverResponse>('/analytics/turnover'),
  overstock: () => request<ApiOverstockResponse>('/analytics/overstock'),
  deadStock: () => request<ApiDeadStockResponse>('/analytics/dead-stock'),
  dashboardSummary: () => request<ApiDashboardSummary>('/analytics/dashboard-summary'),
};

// ─── Forecast (Sprint 2 — ARIMA) ──────────────────────────
export const forecast = {
  overview: () => request<ApiForecastOverview>('/forecast/overview'),
  byProduct: (productId: number) => request<ApiForecastProduct>(`/forecast/${productId}`),
  generate: () => request<{ generated: number; timestamp: string }>('/forecast/generate', { method: 'POST' }),
};

// ─── Loss Risk (Sprint 3 — XGBoost) ───────────────────────
export const lossRisk = {
  predict: () =>
    request<ApiLossRiskItemsResponse & { summary: ApiLossRiskSummary }>('/loss-risk/predict', { method: 'POST' }),
  items: (params?: { tier?: RiskTier }) => {
    const qs = new URLSearchParams();
    if (params?.tier) qs.set('tier', params.tier);
    const q = qs.toString();
    return request<ApiLossRiskItemsResponse>(`/loss-risk/items${q ? '?' + q : ''}`);
  },
  summary: () => request<ApiLossRiskSummaryResponse>('/loss-risk/summary'),
};

// ─── Alerts ────────────────────────────────────────────────
export const alerts = {
  expiring: (params?: { days?: number; type?: 'fefo' | 'supplier' | 'all' }) => {
    const qs = new URLSearchParams();
    if (params?.days) qs.set('days', String(params.days));
    if (params?.type) qs.set('type', params.type);
    const q = qs.toString();
    return request<ApiExpiringResponse>(`/alerts/expiring${q ? '?' + q : ''}`);
  },
  summary: () => request<ApiAlertSummary>('/alerts/summary'),
};

// ─── FEFO Tracking ────────────────────────────────────────
export const fefo = {
  batches: (page = 1) => request<ApiFefoList>(`/fefo/batches?page=${page}`),
  show: (id: number) => request<ApiFefoBatchDetail>(`/fefo/batches/${id}`),
  apply: (data: { batch_id: number; action: 'flag' | 'clear' | 'notify'; directive_notes?: string }) =>
    request('/fefo/apply', { method: 'POST', body: JSON.stringify(data) }),
  trace: (id: number) => request<ApiTraceResponse>(`/fefo/batches/${id}/trace`),
};

// ─── Recommendations ─────────────────────────────────────
export const recommendations = {
  list: (params?: { status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiRecommendation>>(`/recommendations${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<ApiRecommendationDetail>(`/recommendations/${id}`),
  approve: (id: number) =>
    request(`/recommendations/${id}/approve`, { method: 'POST' }),
  reject: (id: number, rejection_reason: string) =>
    request(`/recommendations/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason }) }),
};

// ─── Optimization (Sprint 4 — Genetic Algorithm) ─────────
export const optimization = {
  replenishment: (params: {
    budget: number;
    horizon_days?: number;
    include_product_ids?: number[];
    persist?: boolean;
    seed?: number;
  }) =>
    request<ApiOptimizationPlan>('/optimization/replenishment', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// ─── Recall Management ─────────────────────────────────────
export const recall = {
  list: (params?: { status?: string; severity?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiRecall>>(`/recalls${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<ApiRecall>(`/recalls/${id}`),
  create: (data: { product_id: number; batch_id?: number; supplier_id?: number; reason: string; severity: string; affected_batches: Array<{ batch_id: number; quantity: number }>; target_resolution_date?: string }) =>
    request('/recalls', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ reason: string; severity: string; target_resolution_date: string; affected_batches: Array<{ batch_id: number; quantity: number }> }>) =>
    request(`/recalls/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  activate: (id: number) => request(`/recalls/${id}/activate`, { method: 'POST' }),
  quarantine: (id: number) => request(`/recalls/${id}/quarantine`, { method: 'POST' }),
  notify: (id: number) => request(`/recalls/${id}/notify`, { method: 'POST' }),
  resolve: (id: number, data: { resolution_notes: string; release_quarantine?: boolean }) =>
    request(`/recalls/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  summary: () => request<ApiRecallSummary>('/recalls/summary'),
};

// ─── Sanitation Checklist ──────────────────────────────────
export const sanitation = {
  list: (params?: { frequency?: string; area?: string; status?: string; date?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.frequency) qs.set('frequency', params.frequency);
    if (params?.area) qs.set('area', params.area);
    if (params?.status) qs.set('status', params.status);
    if (params?.date) qs.set('date', params.date);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiSanitationChecklist>>(`/sanitation${q ? '?' + q : ''}`);
  },
  show: (id: number) => request<ApiSanitationChecklist>(`/sanitation/${id}`),
  create: (data: { checklist_date: string; frequency: string; area: string; checks: Array<{ item: string; passed: boolean; notes?: string; photo_url?: string }>; notes?: string }) =>
    request('/sanitation', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ checklist_date: string; frequency: string; area: string; checks: Array<{ item: string; passed: boolean; notes?: string; photo_url?: string }>; notes: string }>) =>
    request(`/sanitation/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  verify: (id: number) => request(`/sanitation/${id}/verify`, { method: 'POST' }),
  summary: (params?: { date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    const q = qs.toString();
    return request<ApiSanitationSummary>(`/sanitation/summary${q ? '?' + q : ''}`);
  },
};

// ─── Reorder ───────────────────────────────────────────────
export const reorder = {
  index: (params?: { safety_stock_multiplier?: number }) => {
    const qs = new URLSearchParams();
    if (params?.safety_stock_multiplier) qs.set('safety_stock_multiplier', String(params.safety_stock_multiplier));
    const q = qs.toString();
    return request<ApiReorderSuggestionsResponse>(`/reorder/suggestions${q ? '?' + q : ''}`);
  },
  approve: (data: { suggestions: ApiReorderSuggestion[] }) =>
    request('/reorder/approve', { method: 'POST', body: JSON.stringify(data) }),
  autoApprove: (data: { criteria?: { max_cost_per_po?: number; min_items_per_po?: number } }) =>
    request('/reorder/auto-approve', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Privacy ────────────────────────────────────────────────
export const privacy = {
  requests: (params?: { type?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponseWithMeta<ApiDataSubjectRequest>>(`/privacy/requests${q ? '?' + q : ''}`);
  },
  createRequest: (data: { request_type: string; subject_identifier: string; notes?: string }) =>
    request('/privacy/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveRequest: (id: number) => request(`/privacy/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id: number, data: { rejection_reason: string }) =>
    request(`/privacy/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRequest: (id: number) => request(`/privacy/requests/${id}`, { method: 'DELETE' }),
  complianceReport: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return request<ApiPrivacyComplianceReport>(`/privacy/compliance-report${q ? '?' + q : ''}`);
  },
  breaches: (params?: { status?: string; risk?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.risk) qs.set('risk', params.risk);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponseWithMeta<ApiDataBreachIncident>>(`/privacy/breaches${q ? '?' + q : ''}`);
  },
  breachStatistics: () => request<ApiBreachStatistics>('/privacy/breaches/statistics'),
  escalateBreach: (id: number) => request(`/privacy/breaches/${id}/escalate`, { method: 'POST' }),
  notifyNPC: (id: number) => request(`/privacy/breaches/${id}/notify-npc`, { method: 'POST' }),
  notifySubjects: (id: number) => request(`/privacy/breaches/${id}/notify-subjects`, { method: 'POST' }),
containBreach: (id: number, data: { actions: string[] }) =>
    request(`/privacy/breaches/${id}/contain`, { method: 'POST', body: JSON.stringify(data) }),
  resolveBreach: (id: number, data: { resolution_notes: string }) =>
    request(`/privacy/breaches/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  retentionPolicies: () => request<RetentionPoliciesResponse>(`/privacy/retention-policies`),
  createRetentionPolicy: (data: { entity_type: string; retention_days: number; description?: string; enabled?: boolean }) =>
    request('/privacy/retention-policies', { method: 'POST', body: JSON.stringify(data) }),
  updateRetentionPolicy: (entityType: string, data: Partial<{ retention_days: number; description: string; enabled: boolean }>) =>
    request(`/privacy/retention-policies/${entityType}`, { method: 'PUT', body: JSON.stringify(data) }),
  purgeNow: (entityType: string) => request(`/privacy/retention-policies/${entityType}/purge`, { method: 'POST' }),
  testPurge: (entityType: string) => request(`/privacy/retention-policies/${entityType}/test-purge`, { method: 'POST' }),
  retentionSummary: () => request<ApiRetentionSummary>('/privacy/retention-policies/summary'),
};
