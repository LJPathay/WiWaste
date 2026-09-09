# WiWaste Implementation Plan

## Overview
Comprehensive plan addressing frontend color/asset cleanup, backend RBAC with policies, and ML pipeline automation.

---

## Phase 1: Frontend - Color System Consolidation & Cleanup

### 1.1 Consolidate into `theme.css` (Single Source of Truth)
- **Remove** all `colors` block from `tailwind.config.js` (lines 9-57)
- **Extend** `theme.css` CSS variables with semantic tokens:

```css
/* Status colors */
--color-status-critical: oklch(0.55 0.22 25);
--color-status-warning: oklch(0.65 0.18 65);
--color-status-ok: oklch(0.55 0.15 145);
--color-status-info: oklch(0.55 0.15 220);

/* KPI colors */
--color-kpi-leakage: oklch(0.55 0.22 25);
--color-kpi-credits: oklch(0.55 0.15 145);
--color-kpi-batches: oklch(0.55 0.20 270);
--color-kpi-forecast: oklch(0.55 0.18 200);

/* Table/semantic */
--color-row-alt: var(--muted);
--color-border-subtle: var(--border);
--color-text-muted: var(--muted-foreground);
```

- **Update** `tailwind.config.js` to reference CSS variables via `theme.extend.colors` using `rgb(var(--color-xxx))` pattern

### 1.2 Refactor Components to Use Semantic Tokens

| File | Hardcoded Colors → Semantic Tokens |
|------|-----------------------------------|
| `ManageInventory.tsx` | `bg-red-500`→`bg-status-critical`, `bg-orange-500`→`bg-status-warning`, `bg-blue-500`→`bg-status-info`, `bg-green-500`→`bg-status-ok`, `text-red-600`→`text-status-critical`, `text-blue-600`→`text-status-info` |
| `Overview.tsx` | `bg-rose-500/10`→`bg-kpi-leakage/10`, `text-rose-600`→`text-kpi-leakage`, `LEAKAGE_COLORS` array → CSS variable palette |
| `DashboardLayout.tsx` | `bg-[#006a61]`→`bg-primary`, `text-[#006a61]`→`text-primary` |

### 1.3 Asset Cleanup
- **Remove**: `src/assets/vite.svg`, `src/assets/react.svg`, `src/assets/hero.png` (unused)
- **Consolidate logos**: Keep only `logo.PNG` and `Logo_full.PNG` (used in DashboardLayout)

### 1.4 Route Cleanup
- **Remove** legacy `/admin/*` redirects (routes.tsx:97-104)
- **Remove** manager→owner redirects (routes.tsx:110-114) — keep only `/owner/*` and `/inventory/*`, `/cashier/*`
- **Simplify** `DashboardLayout.tsx` sidebarGroupsByRole to 3 roles only

---

## Phase 2: Backend - Policy-Based RBAC & Missing Flows

### 2.1 Laravel Policies (Gates) Implementation

```
app/Policies/
├── InventoryPolicy.php      # viewAny, view, stockIn, stockOut, adjust, export
├── ProductPolicy.php        # viewAny, view, create, update, delete, manageCategories
├── PurchaseOrderPolicy.php  # viewAny, view, create, update, receive, cancel
├── SalesPolicy.php          # viewAny, view, create, refund, void
├── WastagePolicy.php        # viewAny, view, create, approve
├── UserPolicy.php           # viewAny, view, create, update, delete, quarantine
├── ReportPolicy.php         # viewAny, generate, export
├── SettingsPolicy.php       # view, update
└── FEFOPolicy.php           # viewAny, view, flag, clear, notify
```

### 2.2 Role Mapping & Gate Registration

```php
// AuthServiceProvider.php
Gate::define('inventory.viewAny', [InventoryPolicy::class, 'viewAny']);
// ... register all gates

// Role-to-permission mapping:
Admin (Owner)        → all gates
Inventory (Staff)    → inventory.*, wastage.*, fefo.*, product.view*, report.view*
Business Owner (Cashier) → sales.*, return.*, report.viewOwn
```

### 2.3 Missing Process Flows - New Controllers/Endpoints

| Flow | New Endpoint | Controller | Policy |
|------|-------------|------------|--------|
| **Cycle Count** | `POST /inventory/cycle-count` | `CycleCountController` | `inventory.adjust` |
| **Vendor Return Receive** | `POST /vendor-returns/{id}/receive` | `VendorReturnController` | `inventory.stockIn` |
| **Vendor Return Credit** | `POST /vendor-returns/{id}/credit` | `VendorReturnController` | `purchase-order.receive` |
| **Shift Open/Close** | `POST /shifts/open`, `POST /shifts/close` | `ShiftController` | `sales.create` |
| **Refund Approval** | `POST /returns/{id}/approve` | `ReturnTransactionController` | `sales.refund` |
| **Expiry Alerts** | `GET /alerts/expiring` | `AlertController` | `inventory.viewAny` |
| **Auto Reorder Check** | `POST /inventory/auto-reorder` | `InventoryController` | `purchase-order.create` |

### 2.4 Notification/Event System
- `App\Events\StockThresholdReached` (low stock, overstock, expiring)
- `App\Events\VendorCreditExpiring`
- `App\Events\AnomalyDetected` (from ML)
- `App\Listeners\SendNotification` → database notifications + optional email/push
- `NotificationController` with `GET /notifications`, `POST /notifications/{id}/read`

---

## Phase 3: ML Pipeline Integration (Auto-Execute with Thresholds)

### 3.1 Scheduled Job Chain

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // 1. Daily at 2 AM: Generate forecasts for all active products
    $schedule->command('forecast:generate')->dailyAt('02:00');
    
    // 2. Daily at 3 AM: Score loss-risk, auto-flag FEFO batches > threshold
    $schedule->command('loss-risk:score')->dailyAt('03:00');
    
    // 3. Daily at 4 AM: Run optimization, create draft POs if budget allows
    $schedule->command('optimization:replenish')->dailyAt('04:00');
    
    // 4. Hourly: Check prediction accuracy vs actuals
    $schedule->command('ml:accuracy:track')->hourly();
}
```

### 3.2 Auto-Execution Logic

| ML Output | Threshold | Auto-Action |
|-----------|-----------|-------------|
| **Forecast** (ARIMA) | `overstock_risk == "High"` AND `current_stock > forecast_demand * 1.5` | Create `InventoryRecommendation` type `reduce_stock` |
| **Loss-Risk** (XGBoost) | `loss_probability >= 0.8` AND `days_to_expiry <= 7` | Auto-call `FEFOController@apply` with `action=flag` |
| **Loss-Risk** (XGBoost) | `expected_loss > 5000` AND `stock_status != "Low Stock"` | Create `WastageRecord` draft for review |
| **Optimization** (GA) | `total_order_value <= budget * 0.9` AND `confidence >= 0.7` | Create `PurchaseOrder` with status `Draft` |

### 3.3 Feedback Loop - Prediction Accuracy Tracking

```php
// New model: ForecastAccuracy
// Tracks: product_id, forecast_date, predicted, actual, mape, model_version
// Command `ml:accuracy:track` compares yesterday's forecasts vs actual sales
// Updates model metadata with rolling MAPE per product
// If MAPE > 30% for 7 days → alert owner to retrain
```

### 3.4 New API Endpoints for ML Integration
```
POST /ml/forecast/batch          # Trigger batch forecast for all products
POST /ml/loss-risk/batch         # Batch score all products
POST /ml/optimization/replenish  # Run GA with current budget
GET  /ml/accuracy/summary        # Rolling accuracy per product/model
POST /ml/retrain/trigger         # Manual retrain trigger (owner only)
```

---

## Implementation Order

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Phase 1.1-1.4 | Frontend colors + cleanup — visual consistency, no logic changes |
| 2 | Phase 2.1-2.2 | Policies + role mapping — security foundation |
| 3 | Phase 2.3-2.4 | Missing flows + notifications — core features |
| 4 | Phase 3.1-3.4 | ML pipeline + auto-execute — intelligence automation |

---

## Key Files to Modify

### Frontend
- `theme.css` — extend with semantic tokens
- `tailwind.config.js` — remove color tokens, reference CSS vars
- `ManageInventory.tsx`, `Overview.tsx`, `DashboardLayout.tsx` — refactor colors
- `routes.tsx` — remove redirects
- `src/assets/` — delete unused

### Backend
- `app/Policies/*.php` — 9 new policy classes
- `app/Providers/AuthServiceProvider.php` — register gates
- `app/Http/Controllers/Api/*.php` — add `authorize()` calls
- `app/Console/Commands/*.php` — 4 new scheduled commands
- `app/Jobs/*.php` — async ML job dispatchers
- `app/Models/ForecastAccuracy.php` — new model
- `routes/api.php` — add ML integration endpoints

---

## Current State Analysis

### Frontend Issues Identified
1. **Dual Color Systems Conflict**
   - `theme.css`: CSS variables with OKLCH colors (`--primary: #030213`, `--background: #ffffff`)
   - `tailwind.config.js`: Material Design-like tokens (`primary: "#000000"`, `secondary: "#006a61"`, `background: "#fcf8fa"`)
   - Components use **both** systems inconsistently

2. **Hardcoded Colors in Tables/Components**
   - `ManageInventory.tsx`: Hardcoded status badge colors, stock qty colors, alternating row backgrounds
   - `Overview.tsx`: Hardcoded KPI card colors, chart colors (`LEAKAGE_COLORS` array)
   - No semantic color tokens used

3. **Redundant/Duplicate Routes & Navigation**
   - Legacy `/admin/*` routes redirect to `/owner/*`
   - Manager routes redirect to owner routes
   - `DashboardLayout` has massive sidebar config duplication per role

4. **Asset Redundancy**
   - Multiple logo files: `logo.PNG`, `Logo_full.PNG`
   - Default Vite/React assets (`vite.svg`, `react.svg`, `hero.png`) likely unused

### Backend Issues Identified
1. **No Role-Based Access Control (RBAC)**
   - Zero middleware/policies for authorization
   - All API routes open to any authenticated user
   - Frontend roles (`owner`, `inventory`, `cashier`) don't match backend (`Admin`, `Inventory`, `Business Owner`)

2. **Missing Process Flows Per Role**

| Role | Missing Flows |
|------|---------------|
| **Owner/Admin** | Multi-store management, audit log review workflow, settings validation/approval, user permission matrix, system health monitoring |
| **Inventory Staff** | Cycle counting/reconciliation, vendor return processing (receive/credit), expiry alert notifications, automated reorder point triggering, batch-level FEFO enforcement during stock-out, stock transfer between locations |
| **Cashier** | Shift open/close with cash reconciliation, refund approval workflow (manager override), customer loyalty/discounts, end-of-day Z-report, payment exception handling |

3. **Disconnected ML Pipeline**
   - ML service (ARIMA/XGBoost/GA) returns predictions but **no automated integration** with inventory actions
   - No scheduled jobs to: generate forecasts → create recommendations → trigger purchase orders
   - Forecast/Loss-risk/Optimization are isolated API endpoints, not workflow steps

4. **Incomplete Purchase Order Flow**
   - Status transitions exist but no: approval workflow, budget validation, supplier acknowledgment, partial receipt quality inspection, 3-way matching (PO/Receipt/Invoice)

5. **No Notification/Alert System**
   - No webhook/event system for: low stock, expiring batches, vendor credit expiry, anomaly detection

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color System | `theme.css` (CSS variables/OKLCH) | Modern, supports dark mode natively, used by shadcn/ui components |
| RBAC Approach | Policy-based (Gates) | Laravel Policies for granular permissions per action |
| ML Integration | Auto-execute with thresholds | Predictions trigger automatic actions when confidence thresholds met |

---

## Success Metrics

- **Frontend**: Zero hardcoded Tailwind colors in components; single color system; 30% reduction in CSS bundle size
- **Backend**: 100% API routes covered by policies; zero unauthorized access in penetration test
- **ML**: 80% of high-risk predictions auto-actioned; MAPE < 20% for top 50 products; PO creation time < 5 min from optimization