// All TypeScript types/interfaces for the WiWaste API

// ─── Common ─────────────────────────────────────────────
export type SeniorPwdType = 'senior' | 'pwd' | 'none';
export type ExpirySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

// ─── Auth & Users ───────────────────────────────────────
export interface ApiUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'Admin' | 'Inventory' | 'Business Owner' | 'Owner' | 'Cashier' | 'Pharmacist';
  status: 'Active' | 'Inactive' | 'Quarantined';
  created_at?: string;
  business_id?: number;
  branch_id?: number;
}

export interface CreateUserPayload {
  Full_name: string;
  username: string;
  password: string;
  email?: string;
  role: 'Admin' | 'Inventory' | 'Business Owner' | 'Owner' | 'Cashier' | 'Pharmacist';
  status: 'Active' | 'Inactive' | 'Quarantined';
  business_id?: number;
  branch_id?: number;
}

// ─── Categories ─────────────────────────────────────────
export interface ApiCategory {
  id: number;
  name: string;
  product_count: number;
}

// ─── Suppliers ──────────────────────────────────────────
export interface ApiSupplier {
  id: number;
  name: string;
  contact_person: string | null;
  contact_number: string;
  address: string | null;
  product_count: number;
  business_id?: number;
  fda_lto_number?: string | null;
  fda_lto_expiry?: string | null;
  fda_cpr_number?: string | null;
  fda_cpr_expiry?: string | null;
  lto_status?: 'valid' | 'expiring' | 'expiring_soon' | 'critical' | 'expired' | 'not_provided';
  cpr_status?: 'valid' | 'expiring' | 'expiring_soon' | 'critical' | 'expired' | 'not_provided';
  days_until_lto_expiry?: number | null;
  days_until_cpr_expiry?: number | null;
}

export interface ApiSupplierDetail extends ApiSupplier {
  low_stock_count: number;
  recent_products: Array<{
    product_id: number;
    product_name: string;
    current_stock: number;
    stock_status: string;
  }>;
}

export interface ApiSupplierComplianceResponse {
  suppliers: Array<ApiSupplier & {
    lto_status: string;
    cpr_status: string;
    days_until_lto_expiry: number | null;
    days_until_cpr_expiry: number | null;
  }>;
  summary: {
    total: number;
    lto_expiring_30: number;
    lto_expiring_14: number;
    lto_expiring_7: number;
    lto_expired: number;
    cpr_expiring_30: number;
    cpr_expiring_14: number;
    cpr_expiring_7: number;
    cpr_expired: number;
  };
}

export interface ApiSupplierAlertResponse {
  alerts: Array<ApiSupplier & {
    lto_days_remaining: number | null;
    cpr_days_remaining: number | null;
  }>;
  count: number;
}

export interface CreateSupplierPayload {
  supplier_name: string;
  contact_person?: string;
  contact_number: string;
  address?: string;
  business_id?: number;
  fda_lto_number?: string;
  fda_lto_expiry?: string;
  fda_cpr_number?: string;
  fda_cpr_expiry?: string;
}

// ─── Products ───────────────────────────────────────────
export type ProductClassification = 'food' | 'drug' | 'cosmetic' | 'device' | 'general';
export type StorageRequirement = 'refrigerated' | 'frozen' | 'controlled_room' | 'ambient' | 'custom';

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
  business_id?: number;
  product_classification?: ProductClassification;
  required_temp_min?: number | null;
  required_temp_max?: number | null;
  storage_requirement?: StorageRequirement;
  is_rx_only?: boolean;
  ddb_schedule?: string | null;
}

export interface CreateProductPayload {
  business_id?: number;
  category_id: number;
  supplier_id: number;
  barcode?: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  expiration_date?: string;
  initial_stock?: number;
  product_classification?: ProductClassification;
  required_temp_min?: number;
  required_temp_max?: number;
  storage_requirement?: StorageRequirement;
  is_rx_only?: boolean;
  ddb_schedule?: string;
}

// ─── Inventory ──────────────────────────────────────────
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
  business_id?: number;
  branch_id?: number;
}

export interface ApiMovement {
  movement_id: number;
  type: string;
  quantity: number;
  remarks: string | null;
  recorded_by: string;
  date: string;
}

export interface ApiInventoryMovements {
  product_id: number;
  product_name: string;
  current_stock: number;
  movements: ApiMovement[];
}

export interface ApiStockMovement {
  movement_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  movement_type: 'Stock In' | 'Stock Out' | 'Sale' | 'Wastage' | 'Return' | 'Adjustment' | 'Damaged' | 'Expired';
  quantity: number;
  remarks: string | null;
  recorded_by: string;
  movement_date: string;
  business_id?: number;
  branch_id?: number;
  batch_id?: number | null;
}

// ─── Wastage ────────────────────────────────────────────
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
  business_id?: number;
  branch_id?: number;
  batch_id?: number | null;
}

export interface CreateWastagePayload {
  business_id?: number;
  branch_id?: number;
  product_id: number;
  batch_id?: number;
  wastage_type: 'Expired' | 'Damaged' | 'Spoiled' | 'Lost';
  quantity: number;
  estimated_loss: number;
  date_recorded: string;
}

// ─── Sales (POS) ────────────────────────────────────────
export interface ApiSalesTransaction {
  id: number;
  cashier: string;
  total_amount: number;
  vat_amount?: number;
  vatable_amount?: number;
  non_vatable_amount?: number;
  senior_pwd_discount_amount?: number;
  senior_pwd_vat_exempt_amount?: number;
  discount_amount?: number;
  discount_breakdown?: Array<{
    type: string;
    product_id?: number;
    amount: number;
    rate?: number;
    pct?: number;
  }>;
  transaction_date: string;
  payment_method: string;
  payment_reference?: string | null;
  payment_status?: string | null;
  amount_tendered: number | null;
  change_due: number | null;
  status: string;
  items: ApiSalesItem[];
  business_id?: number;
  branch_id?: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  senior_pwd_id?: string | null;
  senior_pwd_type?: SeniorPwdType;
}

export interface ApiSalesItem {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  vat_amount?: number;
  vatable_amount?: number;
  discount_amount?: number;
  discount_pct?: number;
  is_senior_pwd_exempt?: boolean;
}

export interface CreateSalePayload {
  business_id?: number;
  branch_id?: number;
  payment_method: 'Cash' | 'E-wallet' | 'Credit Card' | 'Debit Card';
  payment_reference?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_notes?: string | null;
  amount_tendered?: number;
  change_due?: number;
  senior_pwd_name?: string | null;
  senior_pwd_id?: string | null;
  senior_pwd_type?: SeniorPwdType;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_pct?: number;
    discount_amount?: number;
  }>;
}

export interface ApiReceiptResponse {
  receipt: {
    transaction_id: number;
    transaction_date: string;
    business_name: string;
    business_address: string;
    business_tin: string;
    cashier: string;
    payment_method: string;
    payment_reference?: string | null;
    senior_pwd: {
      type: 'senior' | 'pwd';
      id: string;
      name: string;
      discount: number;
    } | null;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      vat_amount: number;
      vatable_amount: number;
      discount_amount: number;
      subtotal: number;
      is_senior_pwd_exempt: boolean;
    }>;
    totals: {
      subtotal: number;
      discount: number;
      senior_pwd_discount: number;
      senior_pwd_vat_exempt: number;
      vatable_sales: number;
      non_vatable_sales: number;
      vat_amount: number;
      total: number;
    };
    payment: {
      method: string;
      reference?: string | null;
      amount_tendered: number | null;
      change_due: number | null;
    };
  };
}

// ─── Returns ────────────────────────────────────────────
export interface ApiReturn {
  id: number;
  product_name: string;
  returned_by: string;
  quantity_returned: number;
  reason: string | null;
  refund_amount: number;
  return_date: string;
}

export interface CreateReturnPayload {
  sale_item_id: number;
  quantity_returned: number;
  reason?: string;
  return_reason_code: 'defective' | 'wrong_item' | 'change_mind' | 'damaged' | 'expired' | 'missing_parts' | 'not_as_described' | 'other';
  evidence_notes?: string;
  evidence_photos?: string[];
  refund_amount: number;
  return_date: string;
}

// ─── Dashboard ──────────────────────────────────────────
export interface ApiDashboard {
  active_skus: number;
  total_users: number;
  active_suppliers: number;
  today_sales: number;
  recent_wastage: number;
  sales_this_month: number;
  sales_last_month: number;
  gross_profit_this_month: number;
  gross_profit_last_month: number;
  wastage_this_month: number;
  wastage_last_month: number;
  inventory_value: number;
  critical_fefo_count: number;
  high_risk_fefo_count: number;
}

export interface ApiOwnerAnalytics {
  sales_trend: Array<{ date: string; value: number }>;
  wastage_trend: Array<{ date: string; value: number }>;
  leakage_by_category: Array<{
    category: string;
    value: number;
    quantity: number;
    percentage: number;
  }>;
  inventory_health: {
    healthy: number;
    low_stock: number;
    overstock: number;
    expiring_soon: number;
    expired: number;
  };
  top_wasted_products: Array<{
    product_id: number;
    name: string;
    loss: number;
    quantity: number;
  }>;
  payment_breakdown: Array<{
    payment_method: string;
    revenue: number;
  }>;
  forecast_confidence: number | null;
}

export interface ApiDashboardSummary {
  low_stock_count: number;
  low_stock_items: Array<{
    product_id: number;
    product_name: string;
    category: string;
    current_stock: number;
    reorder_level: number;
    selling_price: number;
  }>;
  expiring_soon_count: number;
  expiring_soon_items: Array<{
    product_id: number;
    product_name: string;
    expiration_date: string;
    days_until: number;
  }>;
  today_movements: number;
  today_sales_count: number;
  today_wastage_count: number;
  today_returns_count: number;
  pending_wastage_count: number;
  critical_fefo_count: number;
  total_stock_value: number;
}

// ─── Business & Branch ──────────────────────────────────
export interface ApiBusiness {
  id: number;
  name: string;
  business_type: 'food_retail' | 'minimart' | 'restaurant' | 'pharmacy' | 'hybrid';
  capabilities: {
    food_safety: boolean;
    pharmacy_rx: boolean;
    controlled_substances: boolean;
    prescription_handling: boolean;
  };
  dpo_name: string | null;
  dpo_email: string | null;
  dpo_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiBranch {
  id: number;
  business_id: number;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ─── FEFO ───────────────────────────────────────────────
export interface ApiFefoBatch {
  batch_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  batch_number: string | null;
  quantity: number;
  expiry_date: string;
  days_left: number;
  status: string;
  directive_notes: string | null;
  business_id?: number;
  branch_id?: number;
  received_date?: string | null;
  received_temperature?: number | null;
  supplier_batch_number?: string | null;
}

export interface ApiFefoList {
  batches: ApiFefoBatch[];
  total_batches: number;
  critical_count: number;
  expiring_soon_count: number;
}

export interface ApiFefoMovement {
  movement_id: number;
  type: string;
  quantity: number;
  remarks: string | null;
  recorded_by: string;
  date: string;
}

export interface ApiFefoBatchDetail extends ApiFefoBatch {
  created_by: string;
  created_at: string;
  movements: ApiFefoMovement[];
}

export interface ApiTraceStep {
  level: string;
  entity_type: string;
  entity_id: number;
  [key: string]: unknown;
}

export interface ApiTraceResponse {
  batch: ApiFefoBatch;
  upstream: ApiTraceStep[];
  downstream: ApiTraceStep[];
}

// ─── Recommendations ────────────────────────────────────
export interface ApiRecommendation {
  recommendation_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  recommended_stock: number;
  recommendation_type: string;
  confidence_score: number;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export type ApiRecommendationDetail = ApiRecommendation;

// ─── Stock Receiving ────────────────────────────────────
export interface ApiStockReceiving {
  id: number;
  business_id: number;
  branch_id: number;
  supplier_id: number;
  supplier_name: string;
  received_by: number;
  verified_by: number | null;
  received_at: string;
  verified_at: string | null;
  temperature_at_receipt: number | null;
  condition_check_passed: boolean;
  sanitation_check_passed: boolean;
  notes: string | null;
  status: 'pending' | 'received' | 'verified' | 'rejected' | 'partial';
  created_at: string;
  updated_at: string;
  supplier?: ApiSupplier;
  receiver?: ApiUser;
  verifier?: ApiUser;
}

export interface CreateStockReceivingPayload {
  business_id: number;
  branch_id: number;
  supplier_id: number;
  received_by: number;
  expected_date: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_cost: number;
    batch_number?: string;
    expiration_date?: string;
  }>;
}

// ─── Purchase Orders ────────────────────────────────────
export interface ApiPurchaseOrderItem {
  id: number;
  product_id: number;
  product: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  received_qty: number;
}

export interface ApiPurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier: string;
  user: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  items: ApiPurchaseOrderItem[];
  created_at: string;
  updated_at: string;
  business_id?: number;
  branch_id?: number;
}

export interface CreatePurchaseOrderPayload {
  business_id?: number;
  branch_id?: number;
  supplier_id: number;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

// ─── Audit Logs ─────────────────────────────────────────
export interface ApiAuditLog {
  id: number;
  action: string;
  user: string;
  role: string;
  entity_type: string;
  entity_id: number | null;
  old_values: string | null;
  new_values: string | null;
  timestamp: string;
  business_id?: number;
  branch_id?: number;
}

// ─── Reports ────────────────────────────────────────────
export interface ApiReport {
  [key: string]: unknown;
}

export interface ApiSalesVatSummary {
  summary: {
    total_sales: number;
    total_vat: number;
    total_vatable: number;
    total_non_vatable: number;
    total_senior_pwd_discount: number;
    total_senior_pwd_vat_exempt: number;
    total_discount: number;
  };
  daily_breakdown: Array<{
    date: string;
    transaction_count: number;
    daily_sales: number;
    daily_vat: number;
    daily_vatable: number;
    daily_non_vatable: number;
    daily_senior_pwd_discount: number;
    daily_discount: number;
  }>;
}

export interface ApiDiscountSummary {
  transaction_level: {
    total_discount: number;
    total_senior_pwd_discount: number;
    total_senior_pwd_vat_exempt: number;
  };
  item_level: {
    total_item_discount: number;
    senior_pwd_item_discount: number;
    discounted_items_count: number;
  };
  combined: {
    total_discount: number;
    total_senior_pwd_discount: number;
  };
}

export interface ApiSeniorPwdTransaction {
  transaction_id: number;
  date: string;
  cashier: string;
  senior_pwd_type: SeniorPwdType;
  senior_pwd_id: string | null;
  senior_pwd_name: string | null;
  senior_pwd_discount: number;
  senior_pwd_vat_exempt: number;
  total_amount: number;
  items: Array<{
    product_name: string;
    quantity: number;
    is_exempt: boolean;
    discount: number;
  }>;
}

// ─── Profit & Loss ──────────────────────────────────────
export interface ApiProfitLossOverview {
  total_sales: number;
  total_cogs: number;
  total_wastage_loss: number;
  total_returns: number;
  net_profit: number;
  gross_margin: number;
}

export interface ApiProfitLossCategory {
  category: string;
  total_sales: number;
  total_wastage_loss: number;
  product_count: number;
}

export interface ApiProfitLossTrend {
  period: string;
  sales: number;
  wastage_loss: number;
}

// ─── Inventory Analytics ────────────────────────────────
export interface ApiTurnoverProduct {
  product_id: number;
  product_name: string;
  category: string;
  total_sold: number;
  avg_stock: number;
  turnover_rate: number;
  days_on_shelf: number;
  status: string;
}

export interface ApiTurnoverResponse {
  products: ApiTurnoverProduct[];
  avg_turnover: number;
  total_dead_stock: number;
}

export interface ApiOverstockItem {
  id: number;
  name: string;
  category: string;
  qty_on_hand: number;
  reorder_point: number;
  excess_qty: number;
  unit_cost: number;
  exposure: number;
  recommended_action: string;
}

export interface ApiOverstockResponse {
  items: ApiOverstockItem[];
  total_exposure: number;
  total_items: number;
}

export interface ApiDeadStockItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  cost_price: number;
  locked_capital: number;
  days_on_shelf: number;
}

export interface ApiDeadStockResponse {
  items: ApiDeadStockItem[];
  total_locked_capital: number;
  total_items: number;
}

// ─── Forecast ───────────────────────────────────────────
export interface ApiForecastPoint {
  period: string;
  predicted_demand: number;
  lower: number;
  upper: number;
  confidence: number;
}

export interface ApiForecastRisk {
  product_id: number;
  product_name: string;
  overstock_risk: 'Low' | 'Medium' | 'High';
  predicted_demand: number;
}

export interface ApiForecastOverview {
  generated_at: string | null;
  total_products: number;
  avg_confidence: number;
  model: string;
  horizon_days: number;
  top_risks: ApiForecastRisk[];
  series: ApiForecastPoint[];
}

export interface ApiForecastProduct {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_level: number;
  overstock_risk: 'Low' | 'Medium' | 'High';
  model: string;
  horizon_days: number;
  series: ApiForecastPoint[];
}

// ─── Loss Risk ──────────────────────────────────────────
export type RiskTier = 'Low' | 'Medium' | 'High';

export interface ApiLossRiskItem {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  unit_cost: number;
  days_to_expiry: number;
  loss_probability: number;
  expected_loss: number;
  risk_tier: RiskTier;
  feature_importance: Record<string, number>;
}

export interface ApiLossRiskSummary {
  total_products: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  total_expected_loss: number;
}

export interface ApiLossRiskItemsResponse {
  generated_at: string | null;
  engine: string;
  total: number;
  items: ApiLossRiskItem[];
}

export interface ApiLossRiskSummaryResponse {
  generated_at: string | null;
  engine: string;
  summary: ApiLossRiskSummary;
}

// ─── Alerts ─────────────────────────────────────────────
export interface ApiAlertBatch {
  type: 'batch_expiry';
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  batch_number: string | null;
  quantity: number;
  expiry_date: string;
  days_left: number;
  severity: ExpirySeverity;
  business_id?: number;
  branch_id?: number;
}

export interface ApiAlertSupplier {
  type: 'supplier_license';
  id: number;
  name: string;
  fda_lto_number?: string | null;
  fda_lto_expiry?: string | null;
  fda_cpr_number?: string | null;
  fda_cpr_expiry?: string | null;
  lto_days_remaining?: number | null;
  cpr_days_remaining?: number | null;
  severity: ExpirySeverity;
}

export interface ApiExpiringResponse {
  fefo_batches?: ApiAlertBatch[];
  fefo_count?: number;
  supplier_licenses?: ApiAlertSupplier[];
  supplier_count?: number;
}

export interface ApiAlertSummary {
  fefo_batches: Record<number, number>;
  supplier_licenses: Record<number, number>;
  total_critical: number;
  total_expiring_14: number;
  total_expiring_30: number;
}

// ─── Optimization ───────────────────────────────────────
export interface ApiReplenishmentPlanItem {
  product_id: number;
  product_name: string;
  current_stock: number;
  forecast_demand: number;
  order_qty: number;
  unit_cost: number;
  order_value: number;
}

export interface ApiOptimizationPlan {
  plan: ApiReplenishmentPlanItem[];
  total_order_value: number;
  budget: number;
  fitness: number;
  gen0_fitness: number;
  generations_run: number;
  confidence: number;
  generated_at: string;
  recommendations_written: number;
}

// ─── Recall ─────────────────────────────────────────────
export interface ApiRecall {
  recall_id: number;
  recall_number: string;
  product_id: number;
  product_name?: string;
  batch_id?: number;
  batch_number?: string;
  supplier_id?: number;
  reason: string;
  severity: ExpirySeverity;
  status: 'draft' | 'active' | 'quarantined' | 'notified' | 'resolved' | 'closed';
  affected_batches: Array<{ batch_id: number; quantity: number }>;
  total_quantity_affected: number;
  initiated_date: string;
  target_resolution_date?: string;
  actual_resolution_date?: string;
  initiated_by: number;
  approved_by?: number;
  approved_at?: string;
  resolution_notes?: string;
}

export interface ApiRecallSummary {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  total_quantity_affected: number;
}

// ─── Sanitation ─────────────────────────────────────────
export interface ApiSanitationChecklist {
  checklist_id: number;
  checklist_date: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  area: 'receiving' | 'storage' | 'preparation' | 'dispensing' | 'waste' | 'general';
  overall_status: 'pass' | 'fail' | 'pending';
  verified_by: string | null;
  verified_at: string | null;
  created_by: string;
  created_at: string;
  checks: Array<{
    item: string;
    passed: boolean;
    notes?: string;
    photo_url?: string;
  }>;
  notes?: string;
}

export interface ApiSanitationSummary {
  total: number;
  passed: number;
  failed: number;
  verified: number;
  pending: number;
  by_frequency: Record<string, number>;
  by_area: Record<string, number>;
  failed_checks: Array<{
    checklist_id: number;
    item: string;
    notes?: string;
  }>;
}

// ─── Reorder ────────────────────────────────────────────
export interface ApiReorderSuggestionItem {
  product_id: number;
  product_name: string;
  sku: string;
  supplier_id: number;
  supplier_name: string;
  current_stock: number;
  reorder_level: number;
  target_stock: number;
  quantity_needed: number;
  adjusted_quantity: number;
  unit_cost: number;
  estimated_cost: number;
  lead_time_days: number;
  expiry_adjustment?: number;
  branch_id?: number;
  business_id?: number;
  status: string;
}

export interface ApiReorderSuggestion {
  supplier_id: number;
  supplier_name: string;
  items: ApiReorderSuggestionItem[];
  total_items: number;
  estimated_total_cost: number;
  lead_time_days: number;
  branch_id?: number;
  business_id?: number;
}

export interface ApiReorderSummary {
  total_products_analyzed: number;
  products_needing_reorder: number;
  suppliers_involved: number;
  estimated_total_cost: number;
}

// ─── Privacy ────────────────────────────────────────────
export interface ApiDataSubjectRequest {
  id: number;
  business_id: number;
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  subject_identifier: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface ApiDataBreachIncident {
  id: number;
  description: string;
  personal_data_affected: string;
  risk_assessment: ExpirySeverity;
  status: 'open' | 'investigating' | 'contained' | 'notified' | 'resolved' | 'closed';
  detected_at: string;
  npc_notified_at: string | null;
  subjects_notified_at: string | null;
  resolved_at: string | null;
  business_id: number;
}

export interface ApiBreachStatistics {
  total: number;
  by_status: Record<string, number>;
  by_risk: Record<string, number>;
  npc_notified: number;
  subjects_notified: number;
  avg_resolution_days: number;
}

export interface ApiPrivacyComplianceReport {
  period: { from: string; to: string };
  processing_records: {
    total: number;
    by_category: Record<string, number>;
    by_legal_basis: Record<string, number>;
  };
  subject_requests: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    avg_resolution_days: number;
  };
  breaches: {
    total: number;
    by_risk: Record<string, number>;
    npc_notified: number;
    subjects_notified: number;
  };
}

export interface ApiRetentionPolicy {
  entity_type: string;
  retention_days: number;
  description: string;
  enabled: boolean;
  last_purged: string | null;
  records_purged: number;
}

export interface ApiRetentionSummary {
  total_policies: number;
  active_policies: number;
  total_records_purged: number;
  next_scheduled_purge: string | null;
}
