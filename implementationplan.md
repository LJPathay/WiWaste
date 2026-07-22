# WiWaste Implementation Plan

> **Phase 1 (Complete):** Performance Foundation — optimistic mutations, backend pagination caps, N+1 fix, database indexes, debounce hook.

---

## Phase 2: Connect Real Data (Estimated: 5 days)

### 2.1 Integrate ManageInventory with Real API
**Files:** `Frontend/src/pages/inventory/ManageInventory.tsx`
- Replace mock `INITIAL_ITEMS` with `useOptimisticList(inventoryApi.list)`
- Wire stock-in modal to `POST /api/inventory/stock-in` → `addItem`/`updateItem`
- Wire stock-out modal to `POST /api/inventory/stock-out` → `updateItem`
- Keep CSV export working from real data
- Add search and status filter params to `GET /api/inventory`

### 2.2 Connect GenerateReports to Real API
**New:** `Backend/app/Http/Controllers/Api/ReportController.php`
| Endpoint | Purpose |
|---|---|
| `GET /api/reports/waste-summary` | Aggregate wastage by type/date range |
| `GET /api/reports/inventory-movement` | Stock movement timeline |
| `GET /api/reports/supplier-performance` | Delivery/return metrics |
| `GET /api/reports/expiry-analysis` | Products expiring within N days |
| `GET /api/reports/category-analysis` | Sales/waste per category |
| `GET /api/reports/cost-impact` | Total cost of wastage |

**Update:** `Backend/routes/api.php` — add report routes
**Update:** `Frontend/src/pages/admin/GenerateReports.tsx`
- Replace all mock data with real API calls
- Add date range filters
- Wire Export/Download to generate real CSV from data

### 2.3 Connect Dashboard to Real Data
**Files:**
- `Frontend/src/pages/dashboard/Overview.tsx`
- `Frontend/src/hooks/useDashboardData.ts`
- Replace `initializeDashboard()` mock with real API calls:
  - `GET /api/products?per_page=1` for active SKU count
  - `GET /api/users?per_page=1` for user count
  - `GET /api/suppliers?per_page=1` for supplier count
  - `GET /api/sales?per_page=100` for today's sales
  - `GET /api/wastage?per_page=100` for recent wastage

### 2.4 SystemSettings Persistence
**New:** `Backend/app/Http/Controllers/Api/SettingsController.php`
- `GET /api/settings` — return current settings
- `PUT /api/settings` — update settings

**New:** Migration for `Settings` table (`key VARCHAR(100)`, `value TEXT`)
**Update:** `Backend/routes/api.php`
**Update:** `Frontend/src/pages/admin/SystemSettings.tsx` — call real API on save

### 2.5 Connect FEFO Tracking to Real Data
**Update:** `Frontend/src/pages/dashboard/FefoTracking.tsx`
- Fetch `GET /api/products?expiring_soon=true` with products sorted by `expiration_date`
- Compute batch vulnerability, days-to-expiry chart from real product data

### 2.6 Connect Dashboard Sub-pages
- **LeakageDetection.tsx** — derive from sales vs wastage data
- **PredictiveAnalytics.tsx** — use sales history for basic trend (placeholder until ML models)
- **VendorCredits.tsx** — use supplier/return data

---

## Phase 3: Owner Toolset Completion (Estimated: 7 days)

### 3.1 Purchase Orders Module
**New Backend:**
| File | Purpose |
|---|---|
| `app/Models/PurchaseOrder.php` | PO model |
| `app/Models/PurchaseOrderItem.php` | PO line items |
| `app/Http/Controllers/Api/PurchaseOrderController.php` | Full CRUD + status transitions |
| `database/migrations/xxxx_create_purchase_order_tables.php` | Schema |

**Endpoints:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/purchase-orders` | List with status filter & pagination |
| POST | `/api/purchase-orders` | Create PO from replenishment suggestions |
| PUT | `/api/purchase-orders/{id}` | Update status (ordered, received, cancelled) |
| POST | `/api/purchase-orders/{id}/receive` | Receive items → update inventory |

**New Frontend:** `Frontend/src/pages/admin/PurchaseOrders.tsx`
- Table with status badges (Draft → Ordered → Partially Received → Received → Cancelled)
- Create PO from replenishment suggestions
- Receive PO items (auto-updates inventory)
- Search & pagination

**Update:** `DashboardLayout.tsx` — add "Purchase Orders" to sidebar

### 3.2 Audit Logs Backend
**New Backend:**
| File | Purpose |
|---|---|
| `app/Models/AuditLog.php` | Audit log model |
| `app/Http/Controllers/Api/AuditLogController.php` | List with filters |
| `database/migrations/xxxx_create_audit_log_table.php` | Schema (`user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `created_at`) |

**Update:** Add Eloquent model event listeners to log changes on User, Product, Category, Supplier, Inventory models.

**Update:** `Frontend/src/pages/admin/AuditLogs.tsx` — fetch from real API with pagination, status/role filters, search

### 3.3 Profit/Loss & Leakage API
**New:** `Backend/app/Http/Controllers/Api/ProfitLossController.php`
| Endpoint | Purpose |
|---|---|
| `GET /api/profit-loss/overview` | Total sales, total wastage loss, net profit |
| `GET /api/profit-loss/by-category` | Breakdown per category |
| `GET /api/profit-loss/trends?period=monthly` | Monthly trends |

**Update:** `Frontend/src/pages/dashboard/LeakageDetection.tsx` — connect to real API

### 3.4 Inventory Performance & Overstock
**New:** `Backend/app/Http/Controllers/Api/InventoryAnalyticsController.php`
| Endpoint | Purpose |
|---|---|
| `GET /api/analytics/turnover` | Stock turnover rates |
| `GET /api/analytics/overstock` | Overstock risk analysis |
| `GET /api/analytics/dead-stock` | Slow-moving / dead stock |

**Update:**
- `Frontend/src/pages/manager/InventoryPerformance.tsx`
- `Frontend/src/pages/manager/OverstockRisks.tsx`

---

## Phase 4: UI/UX Polish & Accessibility (Estimated: 5 days)

### 4.1 Error Boundary
**New:** `Frontend/src/components/ui/ErrorBoundary.tsx`
- Class component catching `componentDidCatch`
- Shows "Something went wrong" with "Reload" button
- Wrap DashboardLayout, AuthLayout, MainLayout

### 4.2 Modal Accessibility Overhaul
**File:** `Frontend/src/components/ui/Toast.tsx` (Modal + ConfirmDialog)
| Fix | Details |
|---|---|
| `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | Add to modal containers |
| Focus trapping | Tab cycles within modal only |
| Escape key handler | Close on Escape |
| Auto-focus | Focus first input on open |

### 4.3 Toast aria-live
**File:** `Frontend/src/components/ui/Toast.tsx`
- Add `role="status"` and `aria-live="polite"` to toast container

### 4.4 Empty & Loading States
**Pattern (apply to all list pages):**
```tsx
{data.length === 0 && !loading && (
  <div className="flex flex-col items-center py-16 text-slate-400">
    <SearchIcon className="w-12 h-12 mb-3 opacity-20" />
    <p className="font-medium">No results found</p>
    <p className="text-sm">Try adjusting your search or filters</p>
  </div>
)}
```

**Apply to:** ManageUsers, ManageProducts, ManageCategories, ManageSuppliers, ManageInventory, AuditLogs, GenerateReports, all dashboard sub-pages

### 4.5 Pagination Component
**New:** `Frontend/src/components/ui/Pagination.tsx`
- Page numbers, prev/next, per-page selector (10/25/50/100)
- Shows "Showing X–Y of Z items"

**Apply when server-side pagination is implemented**

### 4.6 Breadcrumb Navigation
**New:** `Frontend/src/components/ui/Breadcrumb.tsx`
**Update:** DashboardLayout — render breadcrumb below header based on route

### 4.7 Mobile Responsive Sidebar
**File:** `Frontend/src/components/layout/DashboardLayout.tsx`
- Hamburger menu button below `md` breakpoint
- Sidebar slides in as overlay on mobile
- Focus trap when sidebar is open on mobile

### 4.8 Header Animation Fix
**File:** `Frontend/src/components/layout/HeaderLabelProvider.tsx`
- Reduce welcome text from 15s → 5s
- Support `prefers-reduced-motion`
- Add dismiss button

### 4.9 Dead Code Removal
- Delete `Frontend/src/components/ui/sidebar.tsx` (726 lines, unused)

---

## Phase 5: ML & Advanced Analytics (Deferred — Separately Planned)
- ARIMA demand forecasting
- XGBoost waste prediction
- Genetic Algorithm optimization
- Real-time notification system (email/SMS)
- Advanced dashboard visualizations

---

## Effort Summary

| Phase | Focus | Days |
|---|---|---|
| **1** | Performance Foundation | ✅ Done |
| **2** | Connect Real Data | ~5 |
| **3** | Owner Toolset Completion | ~7 |
| **4** | UI/UX Polish & Accessibility | ~5 |
| **5** | ML & Advanced Analytics | TBD |
| **Total** | | **~17 + TBD** |
