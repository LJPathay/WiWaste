# WiWaste Inventory Management Redesign — Implementation Plan

## Overview

Redesign and improve the Inventory Management side of the existing WiWaste system. The goal is to make the inventory side feel like a complete, practical inventory management system for a retail store, while keeping it simple enough for actual inventory staff to use.

**Preserve**: existing clean, modern POS/inventory style, typography, spacing, rounded cards, subtle borders, icons, and teal/green accent colors.

**Focus**: Inventory → Expiration → FEFO → Wastage → Recommendations → Waste Reduction.

---

## Current State Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | React 19.2, TypeScript 6.0 |
| Build Tool | Vite | 6.4 |
| Backend | Laravel | 13.8 |
| PHP | PHP | ^8.3 |
| Database | MySQL | 8.0+ |
| ML Service | Python + FastAPI | Python 3.12 |
| UI Library | shadcn/ui + Radix UI | 51 components |
| Charts | Recharts | 2.15.2 |
| Styling | Tailwind CSS | 4.1.12 |

**Existing inventory pages (6)**: `InventoryDashboard`, `ManageInventory`, `RecordWastage`, `FEFOTracking`, `Recommendations`, + 2 redirect stubs (`StockIn`, `StockOut`)

**Existing sidebar** for inventory role: 4 items across 3 groups (Overview, Operations, Monitoring)

**Key gap**: The backend `Stock_Movement.movement_type` ENUM only supports `'Stock In'` and `'Stock Out'` — needs expansion for Sale, Wastage, Return, Adjustment, Damaged, Expired.

---

## Target Sidebar Structure

```
OVERVIEW
└── Inventory Dashboard

INVENTORY
├── Manage Inventory
├── Stock Receiving
└── Stock Movements

WASTE & EXPIRATION
├── Record Wastage
├── FEFO Tracking
└── Recommendations

MANAGEMENT
├── Suppliers
└── Reports
```

---

## Phase 1: Backend Changes

### 1A. Database Migration — Expand Stock_Movement Types

**File**: New migration `database/migrations/xxxx_expand_stock_movement_types.php`

Change `Stock_Movement.movement_type` ENUM from:

```sql
ENUM('Stock In', 'Stock Out')
```

To:

```sql
ENUM('Stock In', 'Stock Out', 'Sale', 'Wastage', 'Return', 'Adjustment', 'Damaged', 'Expired')
```

**Impact**: The `Stock_Movement` table currently only tracks two movement types. Expanding this ENUM allows proper audit trail tracking for all inventory changes.

**Existing code references to update**:
- `InventoryController::stockIn()` — already uses `'Stock In'` (no change needed)
- `InventoryController::stockOut()` — already uses `'Stock Out'` (no change needed)
- `WastageRecordController::store()` — needs to also create Stock_Movement with type `'Wastage'`
- `SalesTransactionController::store()` — needs to create Stock_Movement with type `'Sale'` for each item
- `ReturnTransactionController::store()` — needs to create Stock_Movement with type `'Return'`

---

### 1B. New API Endpoint — All Stock Movements (Audit Trail)

**File**: `app/Http/Controllers/Api/InventoryController.php` — add `allMovements()` method

```
GET /api/inventory/movements?product_id=&type=&user_id=&date_from=&date_to=&page=
```

**Response shape**:
```json
{
  "data": [
    {
      "movement_id": 1,
      "product_id": 5,
      "product_name": "Coffee Creamer",
      "sku": "CC-001",
      "type": "Sale",
      "quantity": -1,
      "remarks": null,
      "reference": "POS-2288",
      "recorded_by": "Carlo",
      "date": "2026-09-09 10:20:00"
    }
  ],
  "current_page": 1,
  "last_page": 5,
  "per_page": 20,
  "total": 95
}
```

**Purpose**: Powers the new Stock Movements page and dashboard recent-movements section.

**Route registration**: Add to `routes/api.php`:
```php
Route::get('/inventory/movements', [InventoryController::class, 'allMovements']);
```

---

### 1C. New API Endpoint — Stock Receiving

**File**: New controller `app/Http/Controllers/Api/StockReceivingController.php`

**Create receiving**:
```
POST /api/stock-receiving
```

**Request body**:
```json
{
  "supplier_id": 3,
  "products": [
    {
      "product_id": 12,
      "quantity": 50,
      "batch_number": "B-2501",
      "expiry_date": "2027-01-15",
      "unit_cost": 45.00
    }
  ],
  "notes": "Regular weekly delivery"
}
```

**Behavior**:
1. Create receiving record
2. For each product:
   - Increase `Inventory.current_stock` by quantity
   - Recalculate `stock_status` via `Inventory::calcStatus()`
   - Create `StockMovement` with type `'Stock In'` and reference to receiving ID
   - Create `FEFOBatch` record if batch_number/expiry_date provided
3. Create audit log entry
4. Return receiving summary

**List receivings**:
```
GET /api/stock-receiving?page=&search=&supplier_id=
```

**Route registration**: Add to `routes/api.php`:
```php
Route::get('/stock-receiving', [StockReceivingController::class, 'index']);
Route::post('/stock-receiving', [StockReceivingController::class, 'store']);
```

---

### 1D. Enhanced Dashboard Summary Endpoint

**File**: `app/Http/Controllers/Api/InventoryAnalyticsController.php` — enhance `dashboardSummary()`

**Current response** (5 fields):
```json
{
  "low_stock_count": 3,
  "expiring_soon_count": 7,
  "today_movements": 12,
  "pending_wastage_count": 2,
  "critical_fefo_count": 4
}
```

**Enhanced response** (add these fields):
```json
{
  "low_stock_count": 3,
  "expiring_soon_count": 7,
  "today_movements": 12,
  "pending_wastage_count": 2,
  "critical_fefo_count": 4,

  "wastage_value_this_month": 8420.00,
  "wastage_value_last_month": 9800.00,
  "wastage_change_pct": -14.1,
  "wastage_units_this_month": 47,

  "inventory_value": 284500.00,
  "inventory_value_last_month": 271200.00,
  "inventory_value_change_pct": 4.9,

  "low_stock_products": [
    {
      "product_id": 12,
      "product_name": "Coffee Creamer",
      "current_stock": 8,
      "reorder_level": 15,
      "category": "Dairy"
    }
  ],

  "expiring_soon_products": [
    {
      "product_id": 5,
      "product_name": "Lucky Me! Pancit Canton",
      "days_left": 3,
      "quantity": 320,
      "batch_number": "B-2401"
    }
  ],

  "stock_movement_chart": [
    { "date": "2026-09-03", "stock_in": 120, "stock_out": 85, "wastage": 12 },
    { "date": "2026-09-04", "stock_in": 0, "stock_out": 92, "wastage": 5 }
  ],

  "wastage_trend": [
    { "date": "2026-09-03", "value": 1200.00 },
    { "date": "2026-09-04", "value": 850.00 }
  ],

  "top_wasted_products": [
    {
      "product_id": 1,
      "product_name": "Lucky Me! Pancit Canton",
      "total_loss": 2720.00,
      "quantity": 68
    }
  ],

  "expiration_risk": {
    "expired": 0,
    "within_3_days": 14,
    "within_7_days": 3,
    "within_30_days": 12,
    "over_31_days": 84
  },

  "recent_movements": [
    {
      "movement_id": 101,
      "product_id": 12,
      "product_name": "Coffee Creamer",
      "type": "Sale",
      "quantity": -1,
      "recorded_by": "Carlo",
      "date": "2026-09-09 10:20:00",
      "reference": "POS-2288"
    }
  ]
}
```

**Implementation notes**:
- Use `Cache::remember()` with 300-second TTL (existing pattern)
- Wastage value: `SUM(estimated_loss)` from `Wastage_Record` for current/last month
- Inventory value: `SUM(current_stock * cost_price)` from `Inventory` joined with `Product`
- Stock movement chart: `GROUP BY DATE(movement_date)` from `Stock_Movement` for last 7/30 days
- Expiration risk: `COUNT` from `Product` grouped by days-to-expiry ranges
- Recent movements: last 10 from `Stock_Movement` with product and user joins

---

### 1E. Auto-Record Movements on Wastage/Sales

**File**: `app/Http/Controllers/Api/WastageRecordController.php` — in `store()` method

After creating the `Wastage_Record`, add:
```php
StockMovement::create([
    'product_id'    => $data['product_id'],
    'user_id'       => $request->user()->User_id,
    'movement_type' => 'Wastage',
    'quantity'      => $data['quantity'],
    'remarks'       => "Wastage: {$data['wastage_type']}",
    'movement_date' => now(),
    'wastage_id'    => $wastage->wastage_id,
]);
```

**File**: `app/Http/Controllers/Api/SalesTransactionController.php` — in `store()` method

After creating sales items, for each item:
```php
StockMovement::create([
    'product_id'    => $item['product_id'],
    'user_id'       => $request->user()->User_id,
    'movement_type' => 'Sale',
    'quantity'      => $item['quantity'],
    'remarks'       => null,
    'movement_date' => now(),
    'sale_item_id'  => $salesItem->sales_item_id,
]);
```

**File**: `app/Http/Controllers/Api/ReturnTransactionController.php` — in `store()` method

After processing return:
```php
StockMovement::create([
    'product_id'    => $return->saleItem->product_id,
    'user_id'       => $request->user()->User_id,
    'movement_type' => 'Return',
    'quantity'      => $data['quantity_returned'],
    'remarks'       => $data['reason'] ?? 'Customer return',
    'movement_date' => now(),
]);
```

---

### 1F. Suppliers Endpoint Enhancement

The existing `SupplierController` already has full CRUD. Add a detail endpoint that includes products supplied:

**File**: `app/Http/Controllers/Api/SupplierController.php` — enhance `show()` method

```php
public function show($id)
{
    $supplier = Supplier::with(['products' => function ($query) {
        $query->select('product_id', 'product_name', 'cost_price', 'reorder_level')
              ->with('inventory');
    }])->findOrFail($id);

    // Get last receiving from Stock_Movement where type = 'Stock In' and product belongs to this supplier
    $lastReceiving = StockMovement::where('movement_type', 'Stock In')
        ->whereHas('product', fn($q) => $q->where('supplier_id', $id))
        ->latest('movement_date')
        ->first();

    return response()->json([
        'supplier' => $supplier,
        'last_delivery' => $lastReceiving?->movement_date,
        'product_count' => $supplier->products->count(),
    ]);
}
```

---

## Phase 2: Frontend — API Layer Updates

### 2A. Expand `api.ts` Types and Endpoints

**File**: `src/services/api.ts`

**New types to add**:

```typescript
// Stock Movement (global audit trail)
export interface ApiStockMovement {
  movement_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  type: string;
  quantity: number;
  remarks: string | null;
  reference: string | null;
  recorded_by: string;
  date: string;
}

// Stock Receiving
export interface ApiStockReceiving {
  id: number;
  receiving_id: string;
  supplier: string;
  supplier_id: number;
  date: string;
  products: ApiReceivingItem[];
  total_cost: number;
  received_by: string;
  notes: string | null;
  status: string;
}

export interface ApiReceivingItem {
  product_id: number;
  product_name: string;
  quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  unit_cost: number;
}

export interface CreateStockReceivingPayload {
  supplier_id: number;
  products: Array<{
    product_id: number;
    quantity: number;
    batch_number?: string;
    expiry_date?: string;
    unit_cost: number;
  }>;
  notes?: string;
}

// Enhanced Dashboard Summary
export interface ApiEnhancedDashboardSummary {
  low_stock_count: number;
  expiring_soon_count: number;
  today_movements: number;
  pending_wastage_count: number;
  critical_fefo_count: number;
  wastage_value_this_month: number;
  wastage_value_last_month: number;
  wastage_change_pct: number;
  wastage_units_this_month: number;
  inventory_value: number;
  inventory_value_last_month: number;
  inventory_value_change_pct: number;
  low_stock_products: Array<{
    product_id: number;
    product_name: string;
    current_stock: number;
    reorder_level: number;
    category: string;
  }>;
  expiring_soon_products: Array<{
    product_id: number;
    product_name: string;
    days_left: number;
    quantity: number;
    batch_number: string | null;
  }>;
  stock_movement_chart: Array<{
    date: string;
    stock_in: number;
    stock_out: number;
    wastage: number;
  }>;
  wastage_trend: Array<{
    date: string;
    value: number;
  }>;
  top_wasted_products: Array<{
    product_id: number;
    product_name: string;
    total_loss: number;
    quantity: number;
  }>;
  expiration_risk: {
    expired: number;
    within_3_days: number;
    within_7_days: number;
    within_30_days: number;
    over_31_days: number;
  };
  recent_movements: ApiStockMovement[];
}
```

**New API methods to add**:

```typescript
// Stock Movements (global)
export const stockMovements = {
  list: (params?: {
    product_id?: number;
    type?: string;
    user_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.product_id) qs.set('product_id', String(params.product_id));
    if (params?.type) qs.set('type', params.type);
    if (params?.user_id) qs.set('user_id', String(params.user_id));
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiStockMovement>>(
      `/inventory/movements${q ? '?' + q : ''}`
    );
  },
};

// Stock Receiving
export const stockReceiving = {
  list: (params?: { search?: string; supplier_id?: number; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.supplier_id) qs.set('supplier_id', String(params.supplier_id));
    if (params?.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return request<PaginatedResponse<ApiStockReceiving>>(
      `/stock-receiving${q ? '?' + q : ''}`
    );
  },
  create: (data: CreateStockReceivingPayload) =>
    request<ApiStockReceiving>('/stock-receiving', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

**Update existing `inventoryAnalytics.dashboardSummary()`** return type:
```typescript
inventoryAnalytics: {
  // ... existing methods
  dashboardSummary: () => request<ApiEnhancedDashboardSummary>('/analytics/dashboard-summary'),
  wastageTrend: (period: string) =>
    request<Array<{ date: string; value: number }>>(`/analytics/wastage-trend?period=${period}`),
  topWastedProducts: (limit = 5) =>
    request<Array<{ product_id: number; product_name: string; total_loss: number; quantity: number }>>(
      `/analytics/top-wasted?limit=${limit}`
    ),
  expirationRisk: () =>
    request<{ expired: number; within_3_days: number; within_7_days: number; within_30_days: number; over_31_days: number }>(
      '/analytics/expiration-risk'
    ),
},
```

---

## Phase 3: Frontend — New Pages

### 3A. Stock Receiving Page

**File**: `src/pages/inventory/StockReceiving.tsx` (NEW, ~450 lines)

**Layout** (follow `RecordWastage.tsx` two-column pattern):

**Page header**: "Stock Receiving" + info tooltip + "New Receiving" button

**Left column (400px) — Receiving Form**:
- Supplier dropdown (from `suppliers.list()` API)
- Add products section:
  - Product search autocomplete (from `inventory.list()`)
  - Quantity input
  - Batch/Lot number input (optional)
  - Expiration date input (optional)
  - Unit cost input (auto-filled from product cost_price)
  - "Add Product" button to add line item
- Line items list with remove button
- Total cost summary
- Notes textarea
- "Confirm Receiving" button

**Right column — Receiving History**:
- Search input
- Table: Date, Supplier, Products Count, Total Cost, Received By
- Status badges

**Behavior on confirm**:
1. POST to `/api/stock-receiving`
2. Show success toast
3. Refresh receiving list
4. Clear form

**State management**:
- `useApi` hook for receiving list
- Local state for form fields
- `useOptimisticList` for instant UI updates

---

### 3B. Stock Movements Page

**File**: `src/pages/inventory/StockMovements.tsx` (NEW, ~350 lines)

**Layout** (follow `ManageInventory.tsx` table pattern):

**Page header**: "Stock Movements" + info tooltip

**Filter bar**:
- Date range (from/to date inputs)
- Product search input
- Movement type dropdown: All, Stock In, Stock Out, Sale, Wastage, Return, Adjustment, Damaged, Expired
- User filter dropdown
- Export CSV button

**Movements table**:
| Date | Product | Type | Qty | Reference | User |
|------|---------|------|-----|-----------|------|

**Type badge color mapping**:
```typescript
const typeBadgeMap: Record<string, string> = {
  'Stock In':   'bg-green-50 text-green-700 border border-green-100',
  'Stock Out':  'bg-red-50 text-red-700 border border-red-100',
  'Sale':       'bg-blue-50 text-blue-700 border border-blue-100',
  'Wastage':    'bg-orange-50 text-orange-700 border border-orange-100',
  'Return':     'bg-purple-50 text-purple-700 border border-purple-100',
  'Adjustment': 'bg-slate-100 text-slate-600 border border-slate-200',
  'Damaged':    'bg-amber-50 text-amber-700 border border-amber-100',
  'Expired':    'bg-red-50 text-red-700 border border-red-100',
};
```

**Quantity display**:
- Positive (Stock In, Return): green `+` prefix
- Negative (Stock Out, Sale, Wastage, Damaged, Expired): red `-` prefix

**Pagination**: Standard pagination at bottom

**Export CSV**: Same pattern as `ManageInventory.tsx`

---

### 3C. Suppliers Page (Inventory Staff)

**File**: `src/pages/inventory/Suppliers.tsx` (NEW, ~300 lines)

**Layout**:

**Page header**: "Suppliers" + info tooltip

**Supplier cards grid** (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop):

Each card:
```
┌─────────────────────────────────────┐
│ Supplier Name                       │
│ Contact Person                      │
│                                     │
│ 📞 +63 917 123 4567               │
│ 📍 Manila, Philippines             │
│                                     │
│ Products Supplied: 12              │
│ Last Delivery: Sep 5, 2026         │
│                                     │
│ [View Products]                     │
└─────────────────────────────────────┘
```

**Click "View Products"**: Expand card or open modal showing:
- Table of products supplied by this supplier
- Each row: Product name, SKU, Current Stock, Reorder Level, Cost Price

**Design**: Follow card-based layout from dashboard KPI cards. Simple — not a complicated procurement system.

**Data source**: `suppliers.list()` API (already exists). Enhance with product count and last delivery if possible, otherwise show placeholder data from the existing API.

---

### 3D. Reports Page (Inventory Staff)

**File**: `src/pages/inventory/Reports.tsx` (NEW, ~400 lines)

**Layout**:

**Page header**: "Inventory Reports" + info tooltip

**Report cards grid** (2 cols desktop, 1 col mobile):

```typescript
const REPORT_CARDS = [
  {
    id: 'stock-movement',
    title: 'Stock Movement Report',
    description: 'View all stock in/out transactions over a period',
    icon: Activity,
    color: 'blue',
    dateRange: true,
  },
  {
    id: 'wastage',
    title: 'Wastage Report',
    description: 'Detailed breakdown of inventory losses and costs',
    icon: AlertTriangle,
    color: 'red',
    dateRange: true,
  },
  {
    id: 'expiration',
    title: 'Expiration Report',
    description: 'Products approaching expiration and risk analysis',
    icon: Clock,
    color: 'orange',
    dateRange: true,
  },
  {
    id: 'valuation',
    title: 'Inventory Valuation',
    description: 'Current inventory value by category and product',
    icon: PhilippinePeso,
    color: 'green',
    dateRange: false,
  },
  {
    id: 'reorder',
    title: 'Reorder Report',
    description: 'Products below reorder level requiring restocking',
    icon: Package,
    color: 'amber',
    dateRange: false,
  },
  {
    id: 'performance',
    title: 'Product Performance',
    description: 'Turnover rates and sales velocity by product',
    icon: TrendingUp,
    color: 'teal',
    dateRange: true,
  },
];
```

**Each card**:
- Icon with colored background
- Title and description
- Date range picker (if applicable)
- "Generate Report" button

**On "Generate Report"**:
- Fetch data from existing `/api/reports/*` endpoints
- Display results in a table below the card
- Show export options (CSV)

**Data sources** (existing endpoints):
- `reports.wasteSummary()` → `/reports/waste-summary`
- `reports.inventoryMovement()` → `/reports/inventory-movement`
- `reports.expiryAnalysis()` → `/reports/expiry-analysis`
- `reports.costImpact()` → `/reports/cost-impact`
- `inventoryAnalytics.turnover()` → `/analytics/turnover`

---

## Phase 4: Inventory Dashboard Redesign

### 4A. Complete Rewrite of `InventoryDashboard.tsx`

**File**: `src/pages/dashboard/InventoryDashboard.tsx` (MAJOR REWRITE, ~800 lines)

**Design hierarchy** (top to bottom):

```
WHAT NEEDS MY ATTENTION?  →  KPI Summary Cards
WHAT IS HAPPENING?        →  Stock Movement Chart + Wastage Analytics
WHY IS IT HAPPENING?      →  Expiration Risk + Top Wasted Products
WHAT SHOULD I DO?         →  Low Stock Alerts + Recent Movements
```

---

#### Section 1: Page Header (keep existing pattern)

```tsx
<div className="flex flex-wrap items-start justify-between gap-4">
  <div className="flex items-center gap-2">
    <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
      Inventory Dashboard
    </h1>
    <Info tooltip="Real-time inventory overview for operational staff" />
  </div>
  <span className="date-badge">{todayLabel}</span>
</div>
```

---

#### Section 2: KPI Summary Cards (4 cards, replacing existing 5)

**Card 1 — Low Stock**
```
┌─────────────────────────────────────┐
│ ⚠️  [amber icon bg]                │
│                                     │
│ 3                                  │
│ Low Stock                           │
│ Product below reorder level         │
│                                     │
│ ⚡ Requires attention    [View Details →] │
└─────────────────────────────────────┘
```

**Card 2 — Expiring Soon**
```
┌─────────────────────────────────────┐
│ 🕐  [red icon bg]                  │
│                                     │
│ 7                                  │
│ Expiring Soon                       │
│ Products within 7 days              │
│                                     │
│ ⚡ Requires attention    [View Details →] │
└─────────────────────────────────────┘
```

**Card 3 — Wastage This Month**
```
┌─────────────────────────────────────┐
│ 📉  [red icon bg]                  │
│                                     │
│ ₱8,420                             │
│ Wastage This Month                  │
│ ↓ 14% vs last month                 │
│                                     │
│                  [View Details →]   │
└─────────────────────────────────────┘
```

**Card 4 — Inventory Value**
```
┌─────────────────────────────────────┐
│ 📦  [teal icon bg]                 │
│                                     │
│ ₱284,500                           │
│ Inventory Value                     │
│ ↑ 4.9% vs last month               │
│                                     │
│                  [View Details →]   │
└─────────────────────────────────────┘
```

**Implementation**:
```tsx
const kpiCards = [
  {
    label: 'Low Stock',
    value: stats.low_stock_count,
    icon: AlertTriangle,
    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Product below reorder level',
    alert: stats.low_stock_count > 0,
    alertText: 'Requires attention',
    to: '/inventory/manage',
  },
  {
    label: 'Expiring Soon',
    value: stats.expiring_soon_count,
    icon: Clock,
    iconBg: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    description: 'Products within 7 days',
    alert: stats.expiring_soon_count > 0,
    alertText: 'Requires attention',
    to: '/inventory/fefo',
  },
  {
    label: 'Wastage This Month',
    value: `₱${stats.wastage_value_this_month.toLocaleString()}`,
    icon: TrendingDown,
    iconBg: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    description: `${stats.wastage_change_pct > 0 ? '↑' : '↓'} ${Math.abs(stats.wastage_change_pct)}% vs last month`,
    alert: false,
    to: '/inventory/wastage',
  },
  {
    label: 'Inventory Value',
    value: `₱${stats.inventory_value.toLocaleString()}`,
    icon: Package,
    iconBg: 'bg-teal-50 dark:bg-teal-950/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description: `${stats.inventory_value_change_pct > 0 ? '↑' : '↓'} ${Math.abs(stats.inventory_value_change_pct)}% vs last month`,
    alert: false,
    to: '/inventory/manage',
  },
];
```

---

#### Section 3: Stock Movement Chart (main chart)

**Replace**: Current "Lowest Stock vs Reorder Level" bar chart

**New**: Stock Movement area/bar chart with date range selector

```tsx
<section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
      Stock Movement
    </h2>
    <div className="flex items-center gap-2">
      {/* Date range selector */}
      <select
        value={movementPeriod}
        onChange={e => setMovementPeriod(e.target.value)}
        className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F8FAFC] dark:bg-slate-800"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 3 months</option>
      </select>
    </div>
  </div>

  {/* Legend */}
  <div className="mb-3 flex items-center gap-4 text-xs text-[#64748B]">
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0F766E]" />
      Stock In
    </span>
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#3B82F6]" />
      Stock Out
    </span>
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
      Wastage
    </span>
  </div>

  {/* Chart */}
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={stats.stock_movement_chart}>
        <defs>
          <linearGradient id="stockInGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="stockOutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="wastageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#E5E7EB" />
        <Tooltip
          contentStyle={{
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
            fontSize: '12px',
          }}
        />
        <Area type="monotone" dataKey="stock_in" name="Stock In" stroke="#0F766E" fill="url(#stockInGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="stock_out" name="Stock Out" stroke="#3B82F6" fill="url(#stockOutGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="wastage" name="Wastage" stroke="#EF4444" fill="url(#wastageGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>
```

---

#### Section 4: Wastage Analytics (2-column layout)

**Left: Wastage Trend Chart**
```tsx
<div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Wastage Trend</h2>
    <select value={wastagePeriod} onChange={...}>
      <option value="7">7 days</option>
      <option value="30">30 days</option>
      <option value="90">3 months</option>
      <option value="180">6 months</option>
      <option value="365">1 year</option>
    </select>
  </div>

  {/* Summary stats */}
  <div className="mb-4 grid grid-cols-3 gap-3">
    <div>
      <p className="text-[10px] font-semibold text-[#64748B] uppercase">Total Wastage</p>
      <p className="text-lg font-bold text-[#0F172A]">₱{totalWastage.toLocaleString()}</p>
    </div>
    <div>
      <p className="text-[10px] font-semibold text-[#64748B] uppercase">Change</p>
      <p className={`text-lg font-bold ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
        {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
      </p>
    </div>
    <div>
      <p className="text-[10px] font-semibold text-[#64748B] uppercase">Units Wasted</p>
      <p className="text-lg font-bold text-[#0F172A]">{stats.wastage_units_this_month}</p>
    </div>
  </div>

  {/* Line chart */}
  <div className="h-48">
    <ResponsiveContainer>
      <LineChart data={stats.wastage_trend}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
        <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
```

**Right: Top Wasted Products**
```tsx
<div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Top Wasted Products</h2>
    <div className="flex gap-1">
      <button onClick={() => setWastageView('value')}
        className={`px-2 py-1 text-[10px] font-semibold rounded ${wastageView === 'value' ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-500'}`}>
        Value
      </button>
      <button onClick={() => setWastageView('quantity')}
        className={`px-2 py-1 text-[10px] font-semibold rounded ${wastageView === 'quantity' ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-500'}`}>
        Quantity
      </button>
    </div>
  </div>

  <div className="space-y-3">
    {stats.top_wasted_products.map((product, idx) => {
      const maxVal = stats.top_wasted_products[0]?.total_loss ?? 1;
      const pct = (product.total_loss / maxVal) * 100;
      return (
        <div key={product.product_id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#0F172A]">{product.product_name}</span>
            <span className="text-xs font-bold text-red-600">
              {wastageView === 'value'
                ? `₱${product.total_loss.toLocaleString()}`
                : `${product.quantity} units`}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    })}
  </div>

  <Link to="/inventory/reports" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline">
    View Report <ArrowUpRight className="h-3 w-3" />
  </Link>
</div>
```

---

#### Section 5: Expiration Risk Distribution

```tsx
<section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <h2 className="mb-4 text-base font-bold text-[#0F172A] dark:text-slate-100">Expiration Risk</h2>

  <div className="space-y-3">
    {[
      { label: 'Expired', count: stats.expiration_risk.expired, color: 'bg-red-500', severity: 'Critical' },
      { label: '≤ 3 days', count: stats.expiration_risk.within_3_days, color: 'bg-red-400', severity: 'Critical' },
      { label: '4–7 days', count: stats.expiration_risk.within_7_days, color: 'bg-amber-500', severity: 'Warning' },
      { label: '8–30 days', count: stats.expiration_risk.within_30_days, color: 'bg-amber-300', severity: 'Warning' },
      { label: '31+ days', count: stats.expiration_risk.over_31_days, color: 'bg-green-500', severity: 'Normal' },
    ].map(item => (
      <Link key={item.label} to="/inventory/fefo"
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors">
        <span className={`inline-block h-3 w-3 rounded-sm ${item.color}`} />
        <span className="flex-1 text-xs font-semibold text-[#0F172A] dark:text-slate-100">{item.label}</span>
        <span className="text-sm font-bold text-[#0F172A] dark:text-slate-100">{item.count}</span>
        <span className={`text-[10px] font-semibold ${
          item.severity === 'Critical' ? 'text-red-600' :
          item.severity === 'Warning' ? 'text-amber-600' : 'text-green-600'
        }`}>{item.severity}</span>
      </Link>
    ))}
  </div>
</section>
```

---

#### Section 6: Low Stock / Reorder Alerts Table

```tsx
<section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Low Stock / Reorder Alerts</h2>
    <span className="text-xs text-[#64748B]">{stats.low_stock_products.length} products</span>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-white/10">
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Product</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Current</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Reorder</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Status</th>
          <th className="px-4 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
        {stats.low_stock_products.map(product => (
          <tr key={product.product_id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50">
            <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-slate-100">{product.product_name}</td>
            <td className="px-4 py-3 font-bold text-red-600">{product.current_stock}</td>
            <td className="px-4 py-3 text-[#64748B]">{product.reorder_level}</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Reorder
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <Link to="/inventory/manage" className="text-[10px] font-semibold text-[#0F766E] hover:underline">View Inventory</Link>
                <Link to="/inventory/stock-receiving" className="text-[10px] font-semibold text-[#0F766E] hover:underline">Create Receiving</Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
```

---

#### Section 7: Recent Stock Movements

```tsx
<section className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">Recent Stock Movements</h2>
    <Link to="/inventory/stock-movements" className="text-xs font-medium text-[#0F766E] hover:underline flex items-center gap-0.5">
      View All <ArrowUpRight className="h-3 w-3" />
    </Link>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-white/10">
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Date</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Product</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Type</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">Qty</th>
          <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-[#64748B]">User</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5">
        {stats.recent_movements.map(movement => (
          <tr key={movement.movement_id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50">
            <td className="px-4 py-3 text-[#64748B]">{formatDate(movement.date)}</td>
            <td className="px-4 py-3 font-semibold text-[#0F172A] dark:text-slate-100">{movement.product_name}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBadgeMap[movement.type]}`}>
                {movement.type}
              </span>
            </td>
            <td className={`px-4 py-3 font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
            </td>
            <td className="px-4 py-3 text-[#64748B]">{movement.recorded_by}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
```

---

#### Complete Dashboard Data Loading

```tsx
export function InventoryDashboard() {
  const [stats, setStats] = useState<ApiEnhancedDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [movementPeriod, setMovementPeriod] = useState('7');
  const [wastagePeriod, setWastagePeriod] = useState('30');
  const [wastageView, setWastageView] = useState<'value' | 'quantity'>('value');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await inventoryAnalytics.dashboardSummary();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Refetch chart data when period changes
  useEffect(() => {
    if (!stats) return;
    // Re-fetch with period parameter if needed
  }, [movementPeriod, wastagePeriod]);

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-1">
      {/* Section 1: Page Header */}
      {/* Section 2: KPI Cards (4 cards) */}
      {/* Section 3: Stock Movement Chart */}
      {/* Section 4: Wastage Analytics (2-col) */}
      {/* Section 5: Expiration Risk */}
      {/* Section 6: Low Stock Alerts */}
      {/* Section 7: Recent Movements */}
    </div>
  );
}
```

---

## Phase 5: Existing Page Improvements

### 5A. Manage Inventory Enhancements

**File**: `src/pages/inventory/ManageInventory.tsx`

**Table columns to add** (currently missing):
- Reorder Level
- Unit Cost (cost_price)
- Selling Price
- Expiration Date

**New filters**:
- Expiration filter (expired, expiring soon, no expiry)
- Sorting capability (click column headers)

**Product detail modal enhancements**:
- Add batch/lot information section
- Add supplier section
- Add reorder level display
- Add stock movement history (already exists, keep as-is)

**Updated table header**:
```tsx
<tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-white/10">
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Item</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Category</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Qty</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Reorder Level</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Unit Cost</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Selling Price</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Stock Status</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Nearest Expiry</th>
  <th className="px-5 py-3 text-left font-semibold tracking-wide">Last Movement</th>
</tr>
```

**Updated table row** (add missing cells):
```tsx
{/* Reorder Level */}
<td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{item.reorderLevel ?? '—'}</td>

{/* Unit Cost */}
<td className="px-5 py-3.5 text-gray-800 dark:text-slate-200">₱{item.costPrice.toFixed(2)}</td>

{/* Selling Price */}
<td className="px-5 py-3.5 text-gray-800 dark:text-slate-200">₱{(item.sellingPrice ?? 0).toFixed(2)}</td>
```

**Update `InventoryItem` interface**:
```typescript
interface InventoryItem {
  id: string;
  itemName: string;
  sku: string;
  qty: number;
  category: string;
  lastUpdated: string;
  stockStatus: 'Normal' | 'Low Stock' | 'Overstock';
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;    // NEW
  supplier: string;
  expirationDate: string | null;
  recentMovements: StockMovement[];
}
```

**Update `mapApiItem()`** to include `reorderLevel`:
```typescript
function mapApiItem(i: ApiInventory): InventoryItem {
  return {
    // ... existing fields
    reorderLevel: i.reorder_level ?? 0,
    // ...
  };
}
```

---

### 5B. Record Wastage Enhancements

**File**: `src/pages/inventory/RecordWastage.tsx`

**New fields to add**:
- **Batch/Lot** — select from available FEFO batches for the selected product
- **Expiration Date** — auto-filled from batch or product
- **Condition** — dropdown: Good, Damaged, Spoiled
- **Notes** — textarea

**Updated wastage reasons**:
```tsx
<option value="Expired">Expired</option>
<option value="Damaged">Damaged</option>
<option value="Spoiled">Spoiled</option>
<option value="Overstock">Overstock</option>
<option value="Returned">Returned</option>
<option value="Other">Other</option>
```

**Updated form layout** (add new fields after Quantity and Unit Cost):
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Batch/Lot (Optional)</label>
    <select value={batchNumber} onChange={...}>
      <option value="">Select batch...</option>
      {availableBatches.map(batch => (
        <option key={batch.batch_id} value={batch.batch_number}>
          {batch.batch_number} — {batch.quantity} units — Expires: {batch.expiry_date}
        </option>
      ))}
    </select>
  </div>
  <div>
    <label>Expiration Date</label>
    <input type="date" value={expiryDate} onChange={...} />
  </div>
</div>

<div>
  <label>Condition</label>
  <select value={condition} onChange={...}>
    <option value="Good">Good (usable condition)</option>
    <option value="Damaged">Damaged</option>
    <option value="Spoiled">Spoiled</option>
  </select>
</div>

<div>
  <label>Notes (Optional)</label>
  <textarea placeholder="Additional details about this wastage..." value={notes} onChange={...} />
</div>
```

**Updated confirm behavior**:
When wastage is confirmed:
1. `wastageApi.record(...)` — creates wastage record
2. `inventoryApi.stockOut(...)` — reduces inventory (new)
3. Stock movement with type `'Wastage'` created automatically by backend (Phase 1E)
4. Dashboard wastage analytics update automatically

**Updated `handleConfirmSave()`**:
```typescript
const handleConfirmSave = async () => {
  // 1. Record wastage
  await wastageApi.record({
    product_id: confirmData.productId,
    wastage_type: confirmData.reason,
    quantity: confirmData.qty,
    estimated_loss: confirmData.totalCost,
    date_recorded: new Date().toISOString().slice(0, 10),
  });

  // 2. Reduce inventory (stock out)
  await inventoryApi.stockOut({
    product_id: confirmData.productId,
    quantity: confirmData.qty,
    remarks: `Wastage: ${confirmData.reason}`,
  });

  // 3. Backend auto-creates Stock_Movement (Phase 1E)

  await refetch();
  // ... reset form
};
```

---

### 5C. FEFO Tracking Improvements

**File**: `src/pages/inventory/FEFOTracking.tsx`

**Connect to real API** (replace mock data):
```typescript
import { fefo } from '../../services/api';

const [batches, setBatches] = useState<ApiFefoBatch[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchBatches = async () => {
    try {
      const data = await fefo.batches();
      setBatches(data.batches);
    } catch (err) {
      console.error('Failed to fetch FEFO batches:', err);
    } finally {
      setLoading(false);
    }
  };
  fetchBatches();
}, []);
```

**Priority display** — sort by days_left ascending (most critical first):
```typescript
const sortedBatches = useMemo(() =>
  [...batches].sort((a, b) => a.days_left - b.days_left),
  [batches]
);
```

**Enhanced batch row** — add prominent "Days Remaining" indicator and recommended action:
```tsx
<td className="px-4 py-3.5">
  <div className="flex items-center gap-2">
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
      b.days_left <= 3 ? 'bg-red-100 text-red-700' :
      b.days_left <= 7 ? 'bg-red-50 text-red-600' :
      b.days_left <= 14 ? 'bg-amber-50 text-amber-700' :
      'bg-green-50 text-green-700'
    }`}>
      {b.days_left < 0 ? 'Expired' : `${b.days_left}d`}
    </span>
    {b.days_left <= 3 && (
      <span className="text-[10px] font-bold text-red-600 animate-pulse">CRITICAL</span>
    )}
  </div>
</td>

<td className="px-4 py-3.5">
  <span className="text-xs font-semibold text-[#0F172A]">{b.quantity} units</span>
</td>

<td className="px-4 py-3.5">
  <span className={`text-[10px] font-semibold ${
    b.days_left <= 3 ? 'text-red-600' :
    b.days_left <= 7 ? 'text-amber-600' :
    'text-green-600'
  }`}>
    {b.days_left <= 3 ? 'Prioritize for immediate sale' :
     b.days_left <= 7 ? 'Flag for clearance/promo' :
     b.days_left <= 14 ? 'Monitor and notify cashier' :
     'Normal stock rotation'}
  </span>
</td>
```

**Critical batch highlight** — add visual indicator for batches expiring within 3 days:
```tsx
<tr key={b.batch_id}
  className={`hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
    b.days_left >= 0 && b.days_left <= 3 ? 'bg-red-50/50 dark:bg-red-950/10 border-l-2 border-l-red-500' : ''
  }`}>
```

**Add "Prioritize" action for critical batches**:
```tsx
{b.days_left >= 0 && b.days_left <= 3 && (
  <button
    onClick={() => handlePrioritize(b)}
    className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
  >
    <AlertTriangle className="h-3 w-3" />
    Prioritize
  </button>
)}
```

---

### 5D. Recommendations Improvements

**File**: `src/pages/inventory/Recommendations.tsx`

**Connect to real API** (replace mock data):
```typescript
import { recommendations as recommendationsApi } from '../../services/api';

const [recs, setRecs] = useState<ApiRecommendation[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchRecs = async () => {
    try {
      const data = await recommendationsApi.list();
      setRecs(data.data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };
  fetchRecs();
}, []);
```

**Categorize recommendations by type**:
```typescript
const reorderRecs = recs.filter(r => r.recommendation_type === 'Restock');
const overstockRecs = recs.filter(r => r.recommendation_type === 'Reduce Stock');
const expirationRiskRecs = recs.filter(r =>
  r.recommendation_type === 'Restock' && r.current_stock < r.recommended_stock * 0.3
);
```

**Enhanced recommendation card** — add actionable context:
```tsx
<div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-slate-900 p-5">
  <div className="flex items-start justify-between mb-3">
    <div>
      <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">{rec.product_name}</h3>
      <p className="text-[10px] font-mono text-[#64748B]">{rec.sku} · {rec.category}</p>
    </div>
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTypeBadge(rec.recommendation_type)}`}>
      {rec.recommendation_type}
    </span>
  </div>

  {/* Actionable context */}
  <div className="space-y-2 mb-4">
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#64748B]">Current Stock</span>
      <span className="font-bold text-[#0F172A]">{rec.current_stock}</span>
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#64748B]">Reorder Level</span>
      <span className="font-bold text-[#0F766E]">{rec.recommended_stock}</span>
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#64748B]">Confidence</span>
      <span className="font-bold text-[#0F172A]">{Math.round(rec.confidence_score * 100)}%</span>
    </div>
  </div>

  {/* Recommendation reason */}
  <p className="text-xs text-[#64748B] dark:text-slate-400 mb-4 p-3 bg-[#F8FAFC] dark:bg-slate-800 rounded-lg">
    {rec.recommendation_type === 'Restock'
      ? `Current stock (${rec.current_stock}) is below reorder level (${rec.recommended_stock}). Recommend replenishing stock to avoid stockouts.`
      : rec.recommendation_type === 'Reduce Stock'
      ? `Current stock (${rec.current_stock}) significantly exceeds demand. Consider markdowns or promotions to reduce excess.`
      : `Stock level (${rec.current_stock}) is appropriate for current demand. No action needed.`
    }
  </p>

  {/* Actions */}
  {rec.status === 'pending' && (
    <div className="flex gap-2">
      <button onClick={() => handleApprove(rec.recommendation_id)}
        className="flex-1 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d6560]">
        Approve
      </button>
      <button onClick={() => handleReject(rec.recommendation_id)}
        className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
        Reject
      </button>
    </div>
  )}
</div>
```

---

## Phase 6: Sidebar & Routing Updates

### 6A. Update Sidebar Navigation

**File**: `src/components/layout/DashboardLayout.tsx`

Replace the `inventory` role sidebar groups (currently lines 73-94):

```typescript
inventory: [
  {
    group: 'OVERVIEW',
    items: [
      { to: '/dashboard/inventory', label: 'Inventory Dashboard', icon: BarChart3 },
    ],
  },
  {
    group: 'INVENTORY',
    items: [
      { to: '/inventory/manage', label: 'Manage Inventory', icon: Package },
      { to: '/inventory/stock-receiving', label: 'Stock Receiving', icon: ArrowDownRight },
      { to: '/inventory/stock-movements', label: 'Stock Movements', icon: Activity },
    ],
  },
  {
    group: 'WASTE & EXPIRATION',
    items: [
      { to: '/inventory/wastage', label: 'Record Wastage', icon: AlertTriangle },
      { to: '/inventory/fefo', label: 'FEFO Tracking', icon: Clock },
      { to: '/inventory/recommendations', label: 'Recommendations', icon: Eye },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { to: '/inventory/suppliers', label: 'Suppliers', icon: Users },
      { to: '/inventory/reports', label: 'Reports', icon: FileText },
    ],
  },
],
```

**New icons needed** (check existing imports at line 1-25):
- `ArrowDownRight` — already imported
- `Users` — already imported
- `FileText` — already imported
- `Clock` — already imported
- `Activity` — already imported

No new icon imports needed.

---

### 6B. Update Routes

**File**: `src/routes.tsx`

**Add new lazy imports** (after line 42):
```typescript
const StockReceiving = lazyPage(() => import("./pages/inventory/StockReceiving"), "StockReceiving");
const StockMovements = lazyPage(() => import("./pages/inventory/StockMovements"), "StockMovements");
const InventorySuppliers = lazyPage(() => import("./pages/inventory/Suppliers"), "InventorySuppliers");
const InventoryReports = lazyPage(() => import("./pages/inventory/Reports"), "InventoryReports");
```

**Add new routes** (in the DashboardLayout children, after line 101):
```typescript
// Inventory routes
{ path: "inventory/wastage", Component: RecordWastage },
{ path: "inventory/manage", Component: ManageInventory },
{ path: "inventory/fefo", Component: FEFOTracking },
{ path: "inventory/recommendations", Component: Recommendations },
{ path: "inventory/stock-receiving", Component: StockReceiving },    // NEW
{ path: "inventory/stock-movements", Component: StockMovements },    // NEW
{ path: "inventory/suppliers", Component: InventorySuppliers },      // NEW
{ path: "inventory/reports", Component: InventoryReports },          // NEW
```

---

## Phase 7: Visual Consistency & Polish

### 7A. Design System Checklist

All new pages must follow these conventions:

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page background | `bg-[#F8FAFC]` | `dark:bg-slate-950` |
| Card background | `bg-white` | `dark:bg-slate-900` |
| Card border | `border border-[#E5E7EB]` | `dark:border-white/10` |
| Card rounding | `rounded-2xl` (outer), `rounded-xl` (inner) | same |
| Card shadow | `shadow-sm` | same |
| Primary text | `text-[#0F172A]` | `dark:text-slate-100` |
| Secondary text | `text-[#64748B]` | `dark:text-slate-400` |
| Primary button | `bg-[#0F766E] hover:bg-[#0d6560]` | same |
| Link/accent color | `text-[#0F766E]` | same |
| Page title | `text-2xl font-bold tracking-tight` | same |
| Table header bg | `bg-gray-50` | `dark:bg-slate-800` |
| Table header text | `text-[10px] font-semibold uppercase tracking-wider text-[#64748B]` | same |
| Table row hover | `hover:bg-[#0F766E]/5` | same |
| Table cell padding | `px-5 py-3.5` | same |
| Tooltip style | `borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.07)'` | same |

### 7B. Chart Styling Standards

```typescript
const chartTooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
  fontSize: '12px',
};

const chartColors = {
  stockIn: '#0F766E',    // teal
  stockOut: '#3B82F6',   // blue
  wastage: '#EF4444',    // red
  reorder: '#E5E7EB',    // gray
  grid: '#F1F5F9',       // light gray
};
```

### 7C. Badge Color Map

```typescript
const movementTypeBadgeMap: Record<string, string> = {
  'Stock In':   'bg-green-50 text-green-700 border border-green-100',
  'Stock Out':  'bg-red-50 text-red-700 border border-red-100',
  'Sale':       'bg-blue-50 text-blue-700 border border-blue-100',
  'Wastage':    'bg-orange-50 text-orange-700 border border-orange-100',
  'Return':     'bg-purple-50 text-purple-700 border border-purple-100',
  'Adjustment': 'bg-slate-100 text-slate-600 border border-slate-200',
  'Damaged':    'bg-amber-50 text-amber-700 border border-amber-100',
  'Expired':    'bg-red-50 text-red-700 border border-red-100',
};
```

---

## Data Flow Consistency

All modules connect logically through the database:

```
STOCK RECEIVING
  → Inventory.current_stock increases
  → Stock_Movement created (type: 'Stock In', reference: receiving ID)
  → FEFO_Batch created (if batch/expiry provided)
  → Dashboard summary updates
  → FEFO Tracking updates

POS SALE
  → Inventory.current_stock decreases
  → Stock_Movement created (type: 'Sale', reference: sale_item_id)
  → FEFO_Batch quantity updated
  → Dashboard summary updates

WASTAGE RECORDED
  → Inventory.current_stock decreases
  → Stock_Movement created (type: 'Wastage', reference: wastage_id)
  → Wastage_Record created
  → Dashboard wastage analytics update

RETURN PROCESSED
  → Inventory.current_stock increases
  → Stock_Movement created (type: 'Return', reference: return_id)
  → Dashboard summary updates
```

**Dashboard data source**: All dashboard numbers, graphs, and tables come from the enhanced `dashboardSummary()` API endpoint, which queries the same `Inventory`, `Stock_Movement`, `Wastage_Record`, `Product`, and `FEFO_Batch` tables. This ensures consistency — the dashboard always reflects the same underlying data as the detail pages.

---

## Execution Order

| Step | What | Files | Est. Lines |
|------|------|-------|------------|
| 1 | Backend migration — expand movement_type ENUM | New migration | ~30 |
| 2 | Backend — enhance dashboardSummary() | `InventoryAnalyticsController.php` | ~150 |
| 3 | Backend — add allMovements() endpoint | `InventoryController.php`, `api.php` | ~60 |
| 4 | Backend — add stock-receiving endpoints | New controller + `api.php` | ~120 |
| 5 | Backend — auto-record movements in wastage/sales/returns | `WastageRecordController.php`, `SalesTransactionController.php`, `ReturnTransactionController.php` | ~50 |
| 6 | Frontend — expand `api.ts` types and methods | `api.ts` | ~150 |
| 7 | Frontend — new Stock Receiving page | `StockReceiving.tsx` | ~450 |
| 8 | Frontend — new Stock Movements page | `StockMovements.tsx` | ~350 |
| 9 | Frontend — new Suppliers page | `Suppliers.tsx` | ~300 |
| 10 | Frontend — new Reports page | `Reports.tsx` | ~400 |
| 11 | Frontend — rewrite Inventory Dashboard | `InventoryDashboard.tsx` | ~800 |
| 12 | Frontend — improve Manage Inventory | `ManageInventory.tsx` | ~100 |
| 13 | Frontend — improve Record Wastage | `RecordWastage.tsx` | ~120 |
| 14 | Frontend — improve FEFO Tracking | `FEFOTracking.tsx` | ~150 |
| 15 | Frontend — improve Recommendations | `Recommendations.tsx` | ~150 |
| 16 | Frontend — update sidebar navigation | `DashboardLayout.tsx` | ~30 |
| 17 | Frontend — update routes | `routes.tsx` | ~15 |
| 18 | Testing & polish | All files | — |
| **Total** | | | **~3,425** |

---

## Summary of Files

### New Files (6)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `Backend/database/migrations/xxxx_expand_stock_movement_types.php` | Expand ENUM | ~30 |
| `Backend/app/Http/Controllers/Api/StockReceivingController.php` | Stock receiving CRUD | ~120 |
| `Frontend/src/pages/inventory/StockReceiving.tsx` | Stock receiving page | ~450 |
| `Frontend/src/pages/inventory/StockMovements.tsx` | Stock movements audit trail | ~350 |
| `Frontend/src/pages/inventory/Suppliers.tsx` | Supplier management | ~300 |
| `Frontend/src/pages/inventory/Reports.tsx` | Inventory reports | ~400 |

### Modified Files (11)

| File | Changes | Est. Lines Changed |
|------|---------|-------------------|
| `Backend/app/Http/Controllers/Api/InventoryAnalyticsController.php` | Enhanced dashboardSummary() | ~150 |
| `Backend/app/Http/Controllers/Api/InventoryController.php` | Add allMovements() | ~60 |
| `Backend/routes/api.php` | New routes | ~10 |
| `Backend/app/Http/Controllers/Api/WastageRecordController.php` | Auto stock movement | ~15 |
| `Backend/app/Http/Controllers/Api/SalesTransactionController.php` | Auto stock movement | ~15 |
| `Backend/app/Http/Controllers/Api/ReturnTransactionController.php` | Auto stock movement | ~15 |
| `Frontend/src/services/api.ts` | New types + endpoints | ~150 |
| `Frontend/src/pages/dashboard/InventoryDashboard.tsx` | Complete rewrite | ~800 |
| `Frontend/src/pages/inventory/ManageInventory.tsx` | Add columns + filters | ~100 |
| `Frontend/src/pages/inventory/RecordWastage.tsx` | Add fields + behavior | ~120 |
| `Frontend/src/pages/inventory/FEFOTracking.tsx` | Connect API + enhance | ~150 |
| `Frontend/src/pages/inventory/Recommendations.tsx` | Connect API + enhance | ~150 |
| `Frontend/src/components/layout/DashboardLayout.tsx` | Update sidebar | ~30 |
| `Frontend/src/routes.tsx` | Add routes | ~15 |

---

## Requirements Checklist

- [x] Sidebar structure matches target: OVERVIEW → INVENTORY → WASTE & EXPIRATION → MANAGEMENT
- [x] Dashboard answers: "What needs attention, what is happening, why, what should I do?"
- [x] 4 KPI summary cards: Low Stock, Expiring Soon, Wastage This Month (₱ value), Inventory Value
- [x] Stock Movement main chart with date range selector
- [x] Wastage Trend chart with configurable periods
- [x] Top Wasted Products with value/quantity toggle
- [x] Expiration Risk distribution visualization
- [x] Low Stock / Reorder Alerts table with actions
- [x] Recent Stock Movements table
- [x] Manage Inventory: reorder level, cost, selling price, expiry columns
- [x] Stock Receiving: full workflow with supplier, batches, expiry dates
- [x] Stock Movements: dedicated audit trail page with filters
- [x] Record Wastage: batch/lot, condition, notes fields
- [x] FEFO Tracking: connected to API, priority display, critical batch highlighting
- [x] Recommendations: categorized, actionable, context-rich
- [x] Suppliers: simple management page
- [x] Reports: inventory analytics reports section
- [x] Data consistency: all modules connected through Stock_Movement table
- [x] Visual design preserved: teal/green accent, rounded cards, modern POS style
- [x] No unnecessary enterprise features added
