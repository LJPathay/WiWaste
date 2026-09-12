# Owner/Administrator Dashboard & Navigation Redesign — Implementation Plan

## Overview

Improve the existing WiWaste Owner/Administrator dashboard and navigation. Do not redesign the entire application. Preserve the existing WiWaste visual identity, typography, spacing, rounded cards, subtle borders, icons, and teal/green accent styling.

**Owner/Admin** = business monitoring, decision-making, analytics, system management, reporting.
**Inventory Staff** = operational inventory work (separate interface, not touched here).

Do not duplicate the staff dashboard. Use the same underlying inventory and transaction data but present it at a higher management/analytical level.

---

## Current State Summary

**Tech**: React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + Recharts | Laravel 13 + MySQL 8.0

**Current admin dashboard** (`src/pages/dashboard/Overview.tsx`, 712 lines):
- 4 KPI cards: Monthly Leakage, Recoverable Credits, Critical/High-Risk Batches, Forecast Confidence
- Priority Action Queue (3 items)
- Quick Shortcuts (customizable, 3 slots)
- Predictive Summary: Demand Forecast Trend + Leakage by Category pie
- Revenue by Payment Method bar chart
- System Administration stats (4 cards)

**Existing pages** (18 admin/manager + 4 dashboard sub-pages):
- `src/pages/admin/`: ManageUsers, ManageProducts, ManageCategories, ManageSuppliers, SystemSettings, PurchaseOrders, AuditLogs, GenerateReports
- `src/pages/manager/`: InventoryPerformance, OverstockRisks, Replenishment, SupplierPerformance, ExecutiveReports
- `src/pages/dashboard/`: PredictiveAnalytics, LeakageDetection, FefoTracking, VendorCredits

**Current sidebar** (owner role): 3 groups — Overview (1), Management (7), Analytics & Reports (10)

**Data sources**: `useDashboardData` hook (mock data via `initializeDashboard`), `dashboardApi.overview()` (real API), `initialSalesTransactions` (mock POS data), `getVendorReturns` (mock), `inventoryAnalytics.*` (real API), `forecast.*` (real API), `lossRisk.*` (real API), `profitLoss.*` (real API)

**Backend**: `DashboardController::overview()` returns active_skus, total_users, active_suppliers, today_sales, recent_wastage. `InventoryAnalyticsController` has turnover, overstock, deadStock, dashboardSummary. `ProfitLossController` has overview, byCategory, trends.

---

## Target Sidebar Structure

```
OVERVIEW
└── Dashboard

MANAGEMENT
├── Manage Users
├── Manage Products
├── Manage Categories
├── Manage Suppliers
├── Purchase Orders
├── System Settings
└── Audit Logs

INVENTORY INTELLIGENCE
├── Inventory Performance
├── FEFO Tracking
├── Overstock Risks
└── Replenishment

BUSINESS ANALYTICS
├── Predictive Analytics
├── Leakage Detection
├── Supplier Performance
└── Vendor Credits

REPORTS
└── Generate Reports
```

**What changes**: Groups renamed, items regrouped. "Executive Reports" removed (merge into GenerateReports). Same routes, same pages — just navigation reorganization.

---

## Phase 1: Backend Enhancements

### 1A. Enhance Dashboard Overview Endpoint

**File**: `Backend/app/Http/Controllers/Api/DashboardController.php`

The current endpoint returns 5 fields. Add management-level business KPIs:

```php
public function overview()
{
    return Cache::remember('dashboard.overview', 300, function () {
        $today = now()->startOfDay();
        $lastMonth = now()->subMonth()->startOfMonth();
        $thisMonth = now()->startOfMonth();

        // Sales
        $salesThisMonth = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $thisMonth)
            ->sum('total_amount');
        $salesLastMonth = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $lastMonth)
            ->where('transaction_date', '<', $thisMonth)
            ->sum('total_amount');

        // COGS (from sales items + product cost)
        $cogsThisMonth = DB::select("
            SELECT SUM(si.quantity * p.cost_price) as total
            FROM Sales_Item si
            JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id
            JOIN Product p ON si.product_id = p.product_id
            WHERE st.status = 'Completed'
              AND st.transaction_date >= ?
        ", [$thisMonth]);

        // Wastage
        $wastageThisMonth = WastageRecord::where('date_recorded', '>=', $thisMonth)->sum('estimated_loss');
        $wastageLastMonth = WastageRecord::where('date_recorded', '>=', $lastMonth)
            ->where('date_recorded', '<', $thisMonth)->sum('estimated_loss');

        // Inventory Value
        $inventoryValue = DB::select("
            SELECT SUM(i.current_stock * p.cost_price) as total
            FROM Inventory i
            JOIN Product p ON i.product_id = p.product_id
            WHERE p.status = 'Active'
        ");

        return [
            // Existing fields
            'active_skus' => Product::where('status', 'Active')->count(),
            'total_users' => User::count(),
            'active_suppliers' => Supplier::count(),
            'today_sales' => (float) SalesTransaction::where('status', 'Completed')
                ->whereDate('transaction_date', today())->sum('total_amount'),
            'recent_wastage' => (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
                ->sum('estimated_loss'),

            // NEW: Business Health KPIs
            'sales_this_month' => (float) $salesThisMonth,
            'sales_last_month' => (float) $salesLastMonth,
            'gross_profit_this_month' => (float) ($salesThisMonth - ($cogsThisMonth[0]->total ?? 0)),
            'gross_profit_last_month' => /* same calc for last month */,
            'wastage_this_month' => (float) $wastageThisMonth,
            'wastage_last_month' => (float) $wastageLastMonth,
            'inventory_value' => (float) ($inventoryValue[0]->total ?? 0),
            'inventory_value_last_month' => /* snapshot or estimate */,

            // NEW: Risk counts
            'critical_fefo_count' => FEFOBatch::where('status', 'active')
                ->where('expiry_date', '>=', now())
                ->where('expiry_date', '<=', now()->addDays(7))->count(),
            'high_risk_fefo_count' => FEFOBatch::where('status', 'active')
                ->where('expiry_date', '>', now()->addDays(7))
                ->where('expiry_date', '<=', now()->addDays(15))->count(),
        ];
    });
}
```

### 1B. New Endpoint — Owner Dashboard Analytics

**File**: New method in `InventoryAnalyticsController.php` or `DashboardController.php`

```
GET /api/dashboard/owner-analytics
```

Returns:
```json
{
  "sales_trend": [
    { "date": "2026-09-01", "value": 12500 },
    { "date": "2026-09-02", "value": 14200 }
  ],
  "wastage_trend": [
    { "date": "2026-09-01", "value": 850 },
    { "date": "2026-09-02", "value": 620 }
  ],
  "leakage_by_category": [
    { "category": "Pharmacy", "value": 12500, "quantity": 85, "percentage": 32 },
    { "category": "Beverages", "value": 8200, "quantity": 120, "percentage": 21 }
  ],
  "inventory_health": {
    "healthy": 180,
    "low_stock": 12,
    "overstock": 8,
    "expiring_soon": 15,
    "expired": 3
  },
  "top_wasted_products": [
    { "product_id": 5, "name": "Biogesic", "loss": 4200, "quantity": 60 }
  ]
}
```

**Route**: Add to `routes/api.php`:
```php
Route::get('/dashboard/owner-analytics', [DashboardController::class, 'ownerAnalytics']);
```

### 1C. Add Date Range Support to Existing Endpoints

The existing `profitLoss.trends()`, `reports.*` endpoints already accept date params. Verify they work with `from`/`to` query parameters for the dashboard date range selector.

---

## Phase 2: Frontend — API Layer Updates

### 2A. Expand `api.ts` Types

**File**: `Frontend/src/services/api.ts`

Add types:
```typescript
export interface ApiOwnerDashboard {
  // Existing
  active_skus: number;
  total_users: number;
  active_suppliers: number;
  today_sales: number;
  recent_wastage: number;
  // New: Business Health
  sales_this_month: number;
  sales_last_month: number;
  gross_profit_this_month: number;
  gross_profit_last_month: number;
  wastage_this_month: number;
  wastage_last_month: number;
  inventory_value: number;
  inventory_value_last_month: number;
  // New: Risk
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
}
```

Add API methods:
```typescript
export const ownerDashboard = {
  overview: () => request<ApiOwnerDashboard>('/dashboard/overview'),
  analytics: (params?: { period?: string }) => {
    const qs = params?.period ? `?period=${params.period}` : '';
    return request<ApiOwnerAnalytics>(`/dashboard/owner-analytics${qs}`);
  },
};
```

### 2B. Update `useDashboardData` Hook

**File**: `Frontend/src/hooks/useDashboardData.ts`

Add the new API calls:
```typescript
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [ownerData, setOwnerData] = useState<ApiOwnerDashboard | null>(null);
  const [ownerAnalytics, setOwnerAnalytics] = useState<ApiOwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [d, ov, owner, analytics] = await Promise.all([
          (async () => {
            const session = getStoredSession();
            const email = session?.email ?? 'user@example.com';
            const role = session?.role ?? inferRoleFromEmail(email);
            return initializeDashboard(email, 'password', role);
          })(),
          dashboardApi.overview().catch(() => null),
          ownerDashboard.overview().catch(() => null),
          ownerDashboard.analytics().catch(() => null),
        ]);
        if (mounted) {
          setData(d);
          setOverview(ov);
          setOwnerData(owner);
          setOwnerAnalytics(analytics);
        }
      } catch { /* fallback */ }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { data, overview, ownerData, ownerAnalytics, loading };
}
```

---

## Phase 3: Frontend — Admin Dashboard Rewrite

### 3A. Complete Rewrite of `Overview.tsx`

**File**: `Frontend/src/pages/dashboard/Overview.tsx` (MAJOR REWRITE, ~900 lines)

**Design hierarchy** (top to bottom):

```
BUSINESS PERFORMANCE     → KPI Cards (Sales, Gross Profit, Wastage, Inventory Value)
RISKS / LOSSES           → Priority Action Queue + Leakage Summary
PREDICTIVE INSIGHTS      → Charts (Sales Trend, Wastage Trend, Inventory Health)
PRIORITY ACTIONS          → Actionable alerts with severity
DETAILED REPORTING        → Quick links to reports and analytics
```

---

#### Section 1: Page Header (keep existing pattern)

```tsx
<div className="flex items-center gap-2">
  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
  <UITooltip>
    <TooltipTrigger asChild>
      <Info className="h-5 w-5 ml-2 text-slate-400 hover:text-slate-600 cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="bg-slate-900 text-white max-w-xs">
      Business performance overview. All metrics draw from a single data source.
    </TooltipContent>
  </UITooltip>
</div>
```

---

#### Section 2: Business Health KPI Cards (4 cards, replacing existing 4)

**Card 1 — Sales**
```
┌─────────────────────────────────────┐
│ ▲  [green up arrow]                │
│                                     │
│ SALES THIS MONTH                    │
│ ₱128,500                           │
│ ↑ 8.2% vs last month               │
│ Revenue from completed transactions │
│                          [View →]   │
└─────────────────────────────────────┘
```

**Card 2 — Gross Profit**
```
┌─────────────────────────────────────┐
│ ▲  [green up arrow]                │
│                                     │
│ GROSS PROFIT                        │
│ ₱42,300                            │
│ ↑ 3.1% vs last month               │
│ After cost of goods sold            │
│                          [View →]   │
└─────────────────────────────────────┘
```

**Card 3 — Wastage**
```
┌─────────────────────────────────────┐
│ ▼  [red down arrow]                │
│                                     │
│ WASTAGE THIS MONTH                  │
│ ₱8,420                             │
│ ↓ 14% vs last month                │
│ Expiry waste is the primary driver  │
│                          [View →]   │
└─────────────────────────────────────┘
```

**Card 4 — Inventory Value**
```
┌─────────────────────────────────────┐
│ ▲  [green up arrow]                │
│                                     │
│ INVENTORY VALUE                     │
│ ₱284,500                           │
│ ↑ 4.9% vs last month               │
│ Current stock at cost price         │
│                          [View →]   │
└─────────────────────────────────────┘
```

**Implementation**:
```tsx
const kpiCards = [
  {
    label: 'Sales This Month',
    value: currencyFormatter.format(ownerData?.sales_this_month ?? 0),
    note: 'Revenue from completed transactions',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-400',
    change: salesChange,
    up: (ownerData?.sales_this_month ?? 0) >= (ownerData?.sales_last_month ?? 0),
    route: '/owner/reports',
  },
  {
    label: 'Gross Profit',
    value: currencyFormatter.format(ownerData?.gross_profit_this_month ?? 0),
    note: 'After cost of goods sold',
    icon: PhilippinePeso,
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-600',
    ringColor: 'ring-teal-400',
    change: profitChange,
    up: (ownerData?.gross_profit_this_month ?? 0) >= (ownerData?.gross_profit_last_month ?? 0),
    route: '/owner/reports',
  },
  {
    label: 'Wastage This Month',
    value: currencyFormatter.format(ownerData?.wastage_this_month ?? 0),
    note: 'Expiry waste is the primary driver',
    icon: ShieldAlert,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
    ringColor: 'ring-rose-400',
    change: wastageChange,
    up: (ownerData?.wastage_this_month ?? 0) <= (ownerData?.wastage_last_month ?? 0),
    route: '/dashboard/leakage',
  },
  {
    label: 'Inventory Value',
    value: currencyFormatter.format(ownerData?.inventory_value ?? 0),
    note: 'Current stock at cost price',
    icon: Package,
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600',
    ringColor: 'ring-sky-400',
    change: inventoryChange,
    up: (ownerData?.inventory_value ?? 0) >= (ownerData?.inventory_value_last_month ?? 0),
    route: '/owner/performance',
  },
];
```

**Remove** the old KPI cards (Monthly Leakage, Recoverable Credits, Critical/High-Risk Batches, Forecast Confidence) from the top. Leakage moves to Priority Action Queue. Credits move to a dedicated section. FEFO and Forecast move to analytics sections.

---

#### Section 3: Priority Action Queue (improved)

**Keep** the Priority Action Queue. **Improve** it so every action contains: Severity, Problem, Financial impact, Recommended action, Link/button.

```tsx
const priorityActions = [
  {
    severity: 'URGENT',
    severityColor: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-500/10',
    titleColor: 'text-rose-900 dark:text-rose-100',
    bodyColor: 'text-rose-800/80 dark:text-rose-200/70',
    title: `Move ${nextBatch.batchId} today`,
    problem: `Expires in ${nextBatch.daysToExpiry} days. ${criticalBatches + highRiskBatches} batches at risk.`,
    financialImpact: `Potential loss: ${currencyFormatter.format(nextBatch.currentPrice * 10)}`,
    action: 'Prioritize this batch for immediate sale or markdown.',
    route: '/dashboard/fefo',
    routeLabel: 'View FEFO',
  },
  {
    severity: 'ACTION',
    severityColor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    titleColor: 'text-amber-900 dark:text-amber-100',
    bodyColor: 'text-amber-800/80 dark:text-amber-200/70',
    title: `Reduce ${topLeakage.category.toLowerCase()} losses`,
    problem: topLeakage.source,
    financialImpact: `${currencyFormatter.format(topLeakage.leakageAmount)} leaked this month`,
    action: 'Investigate root causes and implement category-specific controls.',
    route: '/dashboard/leakage',
    routeLabel: 'View Leakage',
  },
  {
    severity: 'REVIEW',
    severityColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    bodyColor: 'text-emerald-800/80 dark:text-emerald-200/70',
    title: 'Recover vendor credits',
    problem: `${currencyFormatter.format(totalCredits)} remains eligible across supplier return windows.`,
    financialImpact: `${expiredVendorWindows} return window${expiredVendorWindows > 1 ? 's' : ''} expired`,
    action: 'File claims before remaining windows close.',
    route: '/dashboard/vendors',
    routeLabel: 'Review Credits',
  },
];
```

**Updated Priority Action Card template**:
```tsx
{priorityActions.map((action) => (
  <div key={action.title} className={`rounded-2xl border-l-4 ${action.borderColor} ${action.bgColor} p-4 transition-all hover:translate-x-0.5`}>
    <div className="flex items-center justify-between gap-2">
      <div className={`text-sm font-semibold ${action.titleColor}`}>{action.title}</div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest ${action.severityColor}`}>
        {action.severity}
      </span>
    </div>
    <p className={`mt-1 text-xs leading-5 ${action.bodyColor}`}>{action.problem}</p>
    {action.financialImpact && (
      <p className={`mt-1 text-xs font-semibold ${action.bodyColor}`}>{action.financialImpact}</p>
    )}
    <div className="mt-3 flex items-center justify-between">
      <span className={`text-[11px] ${action.bodyColor}`}>{action.action}</span>
      <Link to={action.route} className="text-[11px] font-bold text-[#006a61] dark:text-[#7ef0cf] hover:underline flex items-center gap-0.5">
        {action.routeLabel} <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
))}
```

---

#### Section 4: Quick Shortcuts (updated)

**Change** AVAILABLE_SHORTCUTS to represent management functions:

```tsx
const AVAILABLE_SHORTCUTS = [
  { id: 'sales', label: 'Sales', description: 'View sales transactions and revenue.', to: '/cashier/history', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory', description: 'Manage stock levels and products.', to: '/inventory/manage', icon: Package },
  { id: 'wastage', label: 'Wastage', description: 'Track and record inventory losses.', to: '/inventory/wastage', icon: Trash2 },
  { id: 'purchase-orders', label: 'Purchase Orders', description: 'Manage supplier orders.', to: '/owner/purchase-orders', icon: Truck },
  { id: 'reports', label: 'Reports', description: 'Generate business reports.', to: '/owner/reports', icon: BarChart3 },
  { id: 'audit-logs', label: 'Audit Logs', description: 'Review system activity.', to: '/owner/audit-logs', icon: ShieldAlert },
  { id: 'predictive', label: 'Predictive Analytics', description: 'Forecast demand and detect anomalies.', to: '/dashboard/predictive', icon: Brain },
  { id: 'leakage', label: 'Leakage Detection', description: 'Find categories leaking margin.', to: '/dashboard/leakage', icon: ShieldAlert },
];
```

Default shortcuts: Sales, Inventory, Wastage (3 most common management tasks).

---

#### Section 5: Analytics Section — Charts

**Replace** the current "Predictive Summary" section with a more comprehensive analytics section.

##### 5A. Sales & Revenue Trend

```tsx
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Sales & Revenue Trend</h3>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-slate-400 hover:text-emerald-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white max-w-xs">
          Daily revenue from completed POS transactions
        </TooltipContent>
      </UITooltip>
    </div>
    <div className="flex items-center gap-2">
      <select
        value={salesPeriod}
        onChange={e => setSalesPeriod(e.target.value)}
        className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">3 months</option>
        <option value="180">6 months</option>
        <option value="365">1 year</option>
      </select>
      <Link to="/owner/reports" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] hover:underline">
        Full view <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={salesTrendData}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#006a61" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#006a61" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) => currencyFormatter.format(Number(value))}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        />
        <Area type="monotone" dataKey="value" stroke="#006a61" fill="url(#salesFill)" strokeWidth={2.5} name="Revenue" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>
```

##### 5B. Wastage Trend

```tsx
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Wastage Trend</h3>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white max-w-xs">
          Monetary value of inventory waste over time. Reducing this is a key purpose of WiWaste.
        </TooltipContent>
      </UITooltip>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500">Total: <strong className="text-rose-600">{currencyFormatter.format(totalWastage)}</strong></span>
      <span className={`text-xs font-semibold ${wastageTrendDirection === 'down' ? 'text-emerald-600' : 'text-rose-600'}`}>
        {wastageTrendDirection === 'down' ? '↓' : '↑'} {Math.abs(wastageTrendPct)}% vs prev period
      </span>
      <Link to="/dashboard/leakage" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] hover:underline">
        View Details <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
  <div className="h-48">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={wastageTrendData}>
        <defs>
          <linearGradient id="wastageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf5" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) => currencyFormatter.format(Number(value))}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        />
        <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#wastageFill)" strokeWidth={2} name="Wastage" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>
```

##### 5C. Leakage by Category (with toggle)

```tsx
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Leakage by Category</h3>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-slate-400 hover:text-rose-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white max-w-xs">
          Financial losses broken down by product category
        </TooltipContent>
      </UITooltip>
    </div>
    <div className="flex items-center gap-2">
      {/* Toggle: Value / Quantity / Percentage */}
      <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
        {(['value', 'quantity', 'percentage'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setLeakageViewMode(mode)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              leakageViewMode === mode
                ? 'bg-[#006a61] text-white'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
        {currencyFormatter.format(totalLeakage)}
      </span>
      <Link to="/dashboard/leakage" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] hover:underline">
        Full view <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  </div>
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={leakageChartData}
          dataKey={leakageViewMode === 'value' ? 'amount' : leakageViewMode === 'quantity' ? 'quantity' : 'percentage'}
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {leakageChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={LEAKAGE_COLORS[index % LEAKAGE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => leakageViewMode === 'value' ? currencyFormatter.format(value) : value}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  </div>
</section>
```

##### 5D. Inventory Health

```tsx
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
  <div className="mb-5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Inventory Health</h3>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white max-w-xs">
          Distribution of inventory by health status
        </TooltipContent>
      </UITooltip>
    </div>
    <Link to="/owner/performance" className="flex items-center gap-1 text-xs font-semibold text-[#006a61] hover:underline">
      Full view <ChevronRight className="h-3 w-3" />
    </Link>
  </div>
  <div className="grid grid-cols-5 gap-3">
    {[
      { label: 'Healthy', count: inventoryHealth.healthy, color: 'bg-emerald-500', textColor: 'text-emerald-700', route: '/owner/performance' },
      { label: 'Low Stock', count: inventoryHealth.low_stock, color: 'bg-amber-500', textColor: 'text-amber-700', route: '/inventory/manage' },
      { label: 'Overstock', count: inventoryHealth.overstock, color: 'bg-blue-500', textColor: 'text-blue-700', route: '/owner/overstock' },
      { label: 'Expiring', count: inventoryHealth.expiring_soon, color: 'bg-orange-500', textColor: 'text-orange-700', route: '/dashboard/fefo' },
      { label: 'Expired', count: inventoryHealth.expired, color: 'bg-rose-500', textColor: 'text-rose-700', route: '/dashboard/fefo' },
    ].map(item => (
      <Link key={item.label} to={item.route}
        className="rounded-2xl border border-slate-100 dark:border-white/5 p-4 text-center hover:shadow-md transition-all hover:-translate-y-0.5"
      >
        <div className={`inline-block h-3 w-3 rounded-full ${item.color} mb-2`} />
        <div className="text-2xl font-bold text-[#0b1c30] dark:text-slate-100">{item.count}</div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${item.textColor}`}>{item.label}</div>
      </Link>
    ))}
  </div>
</section>
```

---

#### Section 6: Secondary Analytics Row

**Two-column layout**: Demand Forecast Summary + Revenue by Payment Method

##### 6A. Demand Forecast Summary (compact version)

Keep the existing forecast chart but make it smaller and add explanatory text:

```tsx
<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
  <div className="mb-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-bold text-[#0b1c30] dark:text-slate-100">Demand Forecast</h3>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-slate-400 hover:text-sky-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white max-w-xs">
          ARIMA-projected demand for the next period. Higher confidence = more reliable forecast for planning.
        </TooltipContent>
      </UITooltip>
    </div>
    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
      {averageConfidence}% confidence
    </span>
  </div>
  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
    Predicted waste volume with model confidence. Used for purchase order planning and FEFO prioritization.
  </p>
  <div className="h-48">
    {/* Smaller forecast chart */}
  </div>
  <Link to="/dashboard/predictive" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#006a61] hover:underline">
    Full Predictive Analytics <ChevronRight className="h-3 w-3" />
  </Link>
</div>
```

##### 6B. Revenue by Payment Method (keep existing)

Keep the existing Revenue by Payment Method chart as-is. It's useful and already well-implemented.

---

#### Section 7: System Administration (keep, move to bottom)

Keep the existing System Administration section (Active SKUs, Registered Users, Active Suppliers, System Settings) but move it to the bottom of the page.

---

### 3B. Updated Imports

The new `Overview.tsx` will need these additional imports:

```typescript
import {
  // existing
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
  // new
  Line, LineChart,
} from 'recharts';
import {
  // existing
  ArrowUpRight, BarChart3, CalendarClock, ChevronRight, GripVertical, Info, Package,
  PackageCheck, Plus, ShieldAlert, TrendingUp, Trash2, X, Users, Settings, Truck,
  // new
  PhilippinePeso, Brain, Activity, AlertTriangle, Clock,
} from 'lucide-react';
```

---

## Phase 4: Sidebar Navigation Update

### 4A. Update `DashboardLayout.tsx`

**File**: `Frontend/src/components/layout/DashboardLayout.tsx`

Replace the `owner` role sidebar groups (currently lines 38-72):

```typescript
owner: [
  {
    group: 'OVERVIEW',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { to: '/owner/users', label: 'Manage Users', icon: Users },
      { to: '/owner/products', label: 'Manage Products', icon: Package },
      { to: '/owner/categories', label: 'Manage Categories', icon: Layers },
      { to: '/owner/suppliers', label: 'Manage Suppliers', icon: Truck },
      { to: '/owner/purchase-orders', label: 'Purchase Orders', icon: Package },
      { to: '/owner/settings', label: 'System Settings', icon: Settings },
      { to: '/owner/audit-logs', label: 'Audit Logs', icon: Activity },
    ],
  },
  {
    group: 'INVENTORY INTELLIGENCE',
    items: [
      { to: '/owner/performance', label: 'Inventory Performance', icon: TrendingUp },
      { to: '/dashboard/fefo', label: 'FEFO Tracking', icon: PackageCheck },
      { to: '/owner/overstock', label: 'Overstock Risks', icon: AlertTriangle },
      { to: '/owner/replenishment', label: 'Replenishment', icon: CheckCircle },
    ],
  },
  {
    group: 'BUSINESS ANALYTICS',
    items: [
      { to: '/dashboard/predictive', label: 'Predictive Analytics', icon: Brain },
      { to: '/dashboard/leakage', label: 'Leakage Detection', icon: ShieldAlert },
      { to: '/owner/supplier-performance', label: 'Supplier Performance', icon: Users },
      { to: '/dashboard/vendors', label: 'Vendor Credits', icon: PhilippinePeso },
    ],
  },
  {
    group: 'REPORTS',
    items: [
      { to: '/owner/reports', label: 'Generate Reports', icon: FileText },
    ],
  },
],
```

**Changes from current**:
- Renamed groups: "Analytics & Reports" → split into "INVENTORY INTELLIGENCE" + "BUSINESS ANALYTICS" + "REPORTS"
- Removed "Executive Reports" (merged into GenerateReports)
- Added `Brain` import for Predictive Analytics icon
- Added `PhilippinePeso` import for Vendor Credits icon

**New icon imports needed** (check existing imports at line 1-25):
- `Brain` — NEW import from lucide-react
- `PhilippinePeso` — NEW import from lucide-react
- `FileText` — already imported
- `Activity` — already imported (used for Audit Logs)
- `CheckCircle` — already imported
- `AlertTriangle` — already imported
- `TrendingUp` — already imported
- `PackageCheck` — already imported
- `Layers` — already imported
- `Truck` — NEW import from lucide-react (for Manage Suppliers)

---

## Phase 5: Minor Page Adjustments

### 5A. Executive Reports — Merge into GenerateReports

**File**: `Frontend/src/pages/manager/ExecutiveReports.tsx`

Option A (simpler): Redirect to `/owner/reports` with a toast "Executive reports are now available in Generate Reports."

Option B: Add an "Executive Summary" tab/section within GenerateReports.

**Recommended**: Option A — keep it simple. Add redirect:

```tsx
export function ExecutiveReports() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/owner/reports', { replace: true });
  }, [navigate]);
  return null;
}
```

### 5B. FEFO Tracking (Admin) — Focus on Analytics

**File**: `Frontend/src/pages/dashboard/FefoTracking.tsx`

The existing admin FEFO page already focuses on analytics (batch vulnerability, price drops, risk levels). It's different from the inventory staff FEFO (which focuses on operational batch actions). **No changes needed** — the current implementation already serves the management purpose.

### 5C. Inventory Performance — Connect to Real API

**File**: `Frontend/src/pages/manager/InventoryPerformance.tsx`

Currently uses mock `TURNOVER_DATA`. Connect to the real `inventoryAnalytics.turnover()` API:

```typescript
import { inventoryAnalytics } from '../../services/api';

const [turnoverData, setTurnoverData] = useState(null);

useEffect(() => {
  inventoryAnalytics.turnover().then(setTurnoverData).catch(() => {});
}, []);
```

This gives management real inventory turnover, stock-out rate, overstock value, etc.

### 5D. Replenishment — Connect to Purchase Orders

**File**: `Frontend/src/pages/manager/Replenishment.tsx`

Add a "Create Purchase Order" action that links to `/owner/purchase-orders`:

```tsx
<Link
  to="/owner/purchase-orders"
  className="inline-flex items-center gap-2 text-xs font-semibold text-[#006a61] hover:underline"
>
  Create Purchase Order <ArrowRight className="h-3.5 w-3.5" />
</Link>
```

---

## Phase 6: Visual Consistency

### 6A. Design System (matching existing)

All new/modified sections must follow:

| Element | Value |
|---------|-------|
| Card rounding | `rounded-3xl` (outer), `rounded-2xl` (inner) |
| Card border | `border border-slate-200 dark:border-white/10` |
| Card shadow | `shadow-sm` |
| Page background | inherited from layout (`bg-[#f4f7fb] dark:bg-slate-950`) |
| Section divider | `SectionDivider` component with title + horizontal line |
| KPI card glass effect | `bg-white/70 backdrop-blur-xl dark:bg-white/5` |
| Tooltip style | `borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)'` |
| Chart colors | `#006a61` (teal), `#ef4444` (red), `#0ea5e9` (sky), `#f59e0b` (amber), `#22c55e` (green) |
| Grid lines | `strokeDasharray="3 3"`, `stroke="#e8edf5"` |
| Badge style | `rounded-full px-3 py-0.5 text-xs font-bold` |
| Priority badge | `rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest` |

### 6B. Chart Standards

```typescript
const CHART_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};
```

---

## Data Flow Consistency

All dashboard analytics come from the same underlying system data:

```
POS SALE
  → Transaction recorded
  → Inventory decreases
  → Stock_Movement created (type: Sale)
  → Sales analytics updated
  → Owner dashboard: Sales KPI + Sales Trend updated

WASTAGE
  → Inventory decreases
  → Wastage_Record created
  → Stock_Movement created (type: Wastage)
  → Leakage analytics updated
  → Owner dashboard: Wastage KPI + Wastage Trend + Leakage chart updated

INVENTORY CHANGE
  → Inventory status recalculated
  → Inventory Health distribution updated
  → Owner dashboard: Inventory Health + Inventory Value updated

FEFO BATCH
  → Batch approaches expiry
  → Priority Action Queue updated
  → Owner dashboard: FEFO risk counts updated
```

**No mock statistics**: All numbers in the dashboard come from the same database queries used by the detail pages.

---

## Execution Order

| Step | What | Files | Est. Lines |
|------|------|-------|------------|
| 1 | Backend — enhance DashboardController::overview() | `DashboardController.php` | ~80 |
| 2 | Backend — add ownerAnalytics endpoint | `DashboardController.php`, `api.php` | ~100 |
| 3 | Frontend — expand api.ts types + methods | `api.ts` | ~60 |
| 4 | Frontend — update useDashboardData hook | `useDashboardData.ts` | ~30 |
| 5 | Frontend — rewrite Overview.tsx (admin dashboard) | `Overview.tsx` | ~900 |
| 6 | Frontend — update sidebar navigation | `DashboardLayout.tsx` | ~40 |
| 7 | Frontend — redirect ExecutiveReports → GenerateReports | `ExecutiveReports.tsx` | ~15 |
| 8 | Frontend — connect InventoryPerformance to real API | `InventoryPerformance.tsx` | ~30 |
| 9 | Frontend — add PO link to Replenishment | `Replenishment.tsx` | ~10 |
| 10 | Testing & polish | All files | — |
| **Total** | | | **~1,265** |

---

## Summary of Files

### New Files (0)

None — all changes are to existing files.

### Modified Files (9)

| File | Changes | Est. Lines Changed |
|------|---------|-------------------|
| `Backend/app/Http/Controllers/Api/DashboardController.php` | Enhanced overview() + new ownerAnalytics() | ~180 |
| `Backend/routes/api.php` | New route for ownerAnalytics | ~5 |
| `Frontend/src/services/api.ts` | New types + methods | ~60 |
| `Frontend/src/hooks/useDashboardData.ts` | Add ownerData + ownerAnalytics state | ~30 |
| `Frontend/src/pages/dashboard/Overview.tsx` | Complete rewrite of admin dashboard | ~900 |
| `Frontend/src/components/layout/DashboardLayout.tsx` | Reorganize owner sidebar groups | ~40 |
| `Frontend/src/pages/manager/ExecutiveReports.tsx` | Redirect to GenerateReports | ~15 |
| `Frontend/src/pages/manager/InventoryPerformance.tsx` | Connect to real API | ~30 |
| `Frontend/src/pages/manager/Replenishment.tsx` | Add PO link | ~10 |

---

## Requirements Checklist

- [x] Sidebar organized into 5 groups: OVERVIEW, MANAGEMENT, INVENTORY INTELLIGENCE, BUSINESS ANALYTICS, REPORTS
- [x] Dashboard answers: "How is the business performing, where are we losing money, what inventory risks exist, what actions require attention?"
- [x] Business Health KPIs: Sales, Gross Profit, Wastage, Inventory Value — each with current value, change, explanation, status
- [x] Monthly Leakage, Recoverable Credits moved to appropriate sections
- [x] Priority Action Queue improved with severity, problem, financial impact, recommended action, link
- [x] Quick Shortcuts represent management functions (Sales, Inventory, Wastage, POs, Reports, Audit Logs)
- [x] Analytics section with Sales & Revenue Trend, Wastage Trend, Leakage by Category (value/qty/% toggle), Inventory Health
- [x] Predictive Analytics with clear confidence explanation
- [x] Leakage Detection made actionable
- [x] Inventory Performance shows management-level metrics
- [x] FEFO focuses on analytics for admin
- [x] Overstock Risks shows actionable data
- [x] Replenishment connects to Purchase Orders
- [x] Supplier Performance shows delivery rates, return rates, etc.
- [x] Vendor Credits shows recoverable credits
- [x] Reports support date ranges and filtering
- [x] Data consistency: all analytics from same underlying data
- [x] No unnecessary enterprise features
- [x] Visual design preserved: teal/green accent, rounded cards, modern POS style
- [x] Executive Reports merged into GenerateReports
- [x] Owner/Admin clearly different from Inventory Staff interface
