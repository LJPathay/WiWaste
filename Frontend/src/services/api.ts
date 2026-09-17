// Central API service — all backend calls go through here
export type {
  PaginatedResponse,
  ApiUser,
  CreateUserPayload,
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
  CreateWastagePayload,
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
  ApiDataSubjectRequest,
  ApiDataBreachIncident,
  ApiBreachStatistics,
  ApiPrivacyComplianceReport,
  ApiRetentionPolicy,
  ApiRetentionSummary,
} from '../types/api';

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
      localStorage.removeItem('wiwaste_user');
      localStorage.removeItem('wiwaste-session');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
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
  list: (page = 1) => request<ApiUser[]>(`/users?page=${page}`),
  create: (data: CreateUserPayload) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateUserPayload>) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),
  quarantine: (id: number) => request(`/users/${id}/quarantine`, { method: 'POST' }),
  reactivate: (id: number) => request(`/users/${id}/reactivate`, { method: 'POST' }),
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
  list: (params?: { search?: string; category_id?: number; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category_id) qs.set('category_id', String(params.category_id));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiProduct>>(`/products${q ? '?' + q : ''}`);
  },
  lookup: (code: string) => request<ApiProduct>(`/products/lookup/${encodeURIComponent(code)}`),
  create: (data: CreateProductPayload) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateProductPayload>) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/products/${id}`, { method: 'DELETE' }),
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
  receive: (id: number, items: { product_id: number; quantity: number; unit_cost: number; batch_number?: string; expiration_date?: string }[]) =>
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
    return request<ApiRecall[]>(`/recalls${q ? '?' + q : ''}`);
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
    return request<ApiSanitationChecklist[]>(`/sanitation${q ? '?' + q : ''}`);
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
    return request<ApiReorderSuggestion[]>(`/reorder/suggestions${q ? '?' + q : ''}`);
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
    return request<ApiDataSubjectRequest[]>(`/privacy/requests${q ? '?' + q : ''}`);
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
    return request<ApiDataBreachIncident[]>(`/privacy/breaches${q ? '?' + q : ''}`);
  },
  breachStatistics: () => request<ApiBreachStatistics>('/privacy/breaches/statistics'),
  escalateBreach: (id: number) => request(`/privacy/breaches/${id}/escalate`, { method: 'POST' }),
  notifyNPC: (id: number) => request(`/privacy/breaches/${id}/notify-npc`, { method: 'POST' }),
  notifySubjects: (id: number) => request(`/privacy/breaches/${id}/notify-subjects`, { method: 'POST' }),
containBreach: (id: number, data: { actions: string[] }) =>
    request(`/privacy/breaches/${id}/contain`, { method: 'POST', body: JSON.stringify(data) }),
  resolveBreach: (id: number, data: { resolution_notes: string }) =>
    request(`/privacy/breaches/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  retentionPolicies: () => request<ApiRetentionPolicy[]>(`/privacy/retention-policies`),
  createRetentionPolicy: (data: { entity_type: string; retention_days: number; description?: string; enabled?: boolean }) =>
    request('/privacy/retention-policies', { method: 'POST', body: JSON.stringify(data) }),
  updateRetentionPolicy: (entityType: string, data: Partial<{ retention_days: number; description: string; enabled: boolean }>) =>
    request(`/privacy/retention-policies/${entityType}`, { method: 'PUT', body: JSON.stringify(data) }),
  purgeNow: (entityType: string) => request(`/privacy/retention-policies/${entityType}/purge`, { method: 'POST' }),
  testPurge: (entityType: string) => request(`/privacy/retention-policies/${entityType}/test-purge`, { method: 'POST' }),
  retentionSummary: () => request<ApiRetentionSummary>('/privacy/retention-policies/summary'),
};
