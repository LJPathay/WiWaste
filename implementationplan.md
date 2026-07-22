# Inventory Staff Role — Implementation Plan

## Current State Overview

The **Inventory Staff** role (`inventory`) has access to 5 sidebar links:

| Sidebar Group | Items |
|---|---|
| Overview | Dashboard (`/dashboard`) |
| Inventory | Manage Inventory (`/inventory/manage`), Record Wastage (`/inventory/wastage`), FEFO Tracking (`/inventory/fefo`), Recommendations (`/inventory/recommendations`) |

**Key observations:**
- Stock In (`/inventory/stock-in`) and Stock Out (`/inventory/stock-out`) routes exist but are not linked in any role's sidebar — they redirect to Manage Inventory.
- Inventory Dashboard (`/dashboard/inventory`) is defined in the router but not in any sidebar.
- **Only Manage Inventory** has real backend API integration. All other inventory pages use mock/fallback data.
- **Dark mode** is incomplete or entirely missing across all inventory pages.
- **No backend FEFO or Recommendations API endpoints** exist — the `InventoryRecommendation` model and migration exist but lack a controller/routes.
- There is **no route-level role guard** — any authenticated user can navigate to any URL regardless of role.

---

## Phase 1: Inventory Staff Navigation & Access

### 1.1 Add missing routes to sidebar

| File | Change |
|---|---|
| `Frontend/src/components/layout/DashboardLayout.tsx` | Add `/inventory/stock-in` and `/inventory/stock-out` to inventory staff sidebar under an "Operations" group |
| `Frontend/src/components/layout/DashboardLayout.tsx` | Add `/dashboard/inventory` to inventory staff sidebar under "Overview" |

### 1.2 Restructure sidebar groups

| Current | Proposed |
|---|---|
| Overview → Dashboard | Overview → Dashboard, Inventory Dashboard |
| Inventory → Manage Inventory, Record Wastage, FEFO Tracking, Recommendations | Operations → Stock In, Stock Out, Manage Inventory, Record Wastage |
| — | Monitoring → FEFO Tracking, Recommendations |

---

## Phase 2: Backend API — Missing Endpoints

### 2.1 FEFO API

**New controller:** `Api\FEFOController.php`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/fefo/batches` | List inventory batches with expiry data, sorted by expiry date ascending. Join with products for name/SKU. |
| `GET` | `/api/fefo/batches/{id}` | Single batch detail with movement history. |
| `POST` | `/api/fefo/apply` | Apply a directive (mark priority, flag for clearance, notify cashier). Logs to audit. |

### 2.2 Recommendations API

**New controller:** `Api\RecommendationController.php`

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/recommendations` | List recommendations with status filter (pending/approved/rejected). |
| `GET` | `/api/recommendations/{id}` | Single recommendation detail. |
| `POST` | `/api/recommendations/{id}/approve` | Approve a recommendation, logs to audit. |
| `POST` | `/api/recommendations/{id}/reject` | Reject with reason, logs to audit. |

### 2.3 Inventory Dashboard Summary API

**New endpoint in existing `InventoryAnalyticsController`**

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard-summary` | Aggregated KPIs: low stock count, expiring soon count, today's movements, pending wastage count, critical FEFO batch count. |

### 2.4 Stock Movement History API

**New endpoint in `InventoryController`**

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/inventory/{id}/movements` | Full movement history for a single inventory item (stock in, stock out, wastage adjustments). |

### Files to create/modify

| File | Action |
|---|---|
| `Backend/routes/api.php` | Add new routes |
| `Backend/app/Http/Controllers/Api/FEFOController.php` | Create |
| `Backend/app/Http/Controllers/Api/RecommendationController.php` | Create |
| `Backend/app/Http/Controllers/Api/InventoryAnalyticsController.php` | Add `dashboardSummary()` |
| `Backend/app/Http/Controllers/Api/InventoryController.php` | Add `movements()` |
| `Backend/database/migrations/…_create_fefo_batches_table.php` | Create FEFO batches migration if needed |

---

## Phase 3: Frontend API Integration

### 3.1 Record Wastage (`RecordWastage.tsx`)

| Issue | Fix |
|---|---|
| Wastage records stored in local state only | Replace `useState<WastageMock[]>(INITIAL_WASTAGE)` with `useApi(wastageApi.list)`. Submit form to `wastageApi.record()` and refetch list on success. |
| Hardcoded summary values (`P3,635`, etc.) | Compute from actual API data or remove. |
| Silent catch on API error | Show error toast and keep form open. |

### 3.2 FEFO Tracking (`FEFOTracking.tsx`)

| Issue | Fix |
|---|---|
| Uses `useDashboardData()` mock | Create `fefoApi` module with `list()` and `applyDirective()` methods. Connect page to real API. |
| "Apply Directive" is local state only | Call `fefoApi.applyDirective()` and refetch. |
| Hardcoded summary values | Compute from API response. |

### 3.3 Recommendations (`Recommendations.tsx`)

| Issue | Fix |
|---|---|
| Uses `useDashboardData()` mock | Create `recommendationApi` module with `list()`, `approve()`, `reject()` methods. |
| No rejection workflow | Add "Reject with reason" modal, wire to API. |

### 3.4 Inventory Dashboard (`InventoryDashboard.tsx`)

| Issue | Fix |
|---|---|
| Entirely mock data via `cashierData.ts` | Create `dashboardApi.summary()` call to new `/api/analytics/dashboard-summary` endpoint. |
| Hardcoded date `2026-07-14` | Use actual `new Date()`. |
| Recent Activity is hardcoded | Fetch from real activity/audit log API. |

### 3.5 Manage Inventory (`ManageInventory.tsx`)

| Issue | Fix |
|---|---|
| Movement history always empty | Replace `mapApiItem` placeholder with call to `/api/inventory/{id}/movements`. |
| `location` always empty | Sync with backend if location data exists, otherwise remove column. |
| Nearest Expiry is heuristic (`+90 days`) | Replace with real expiry data from FEFO API. |

---

## Phase 4: UI/UX Polish

### 4.1 Dark Mode

| Page | Scope |
|---|---|
| `FEFOTracking.tsx` | All hardcoded `bg-*`, `text-*`, `border-*` classes need `dark:` variants. |
| `Recommendations.tsx` | Same as above. |
| `RecordWastage.tsx` | Main page background, summary cards, form section, table section — currently missing. |
| `InventoryDashboard.tsx` | Every component — currently zero dark mode support. |
| `ManageInventory.tsx` | Main table area and filter bar — currently no dark mode (modals already have it). |

### 4.2 Loading States

| Page | Current | Fix |
|---|---|---|
| `FEFOTracking.tsx` | Simple spinner | Skeleton placeholders for summary cards + table rows |
| `Recommendations.tsx` | Simple spinner | Skeleton placeholders |
| `InventoryDashboard.tsx` | Already has skeleton | Improve with per-section skeletons |
| `ManageInventory.tsx` | None | Add skeleton for table body |

### 4.3 Pagination

| Page | Reason |
|---|---|
| `ManageInventory.tsx` | Table can grow unbounded — use `usePagination` hook |
| `FEFOTracking.tsx` | Add pagination if > 20 batches |
| `Recommendations.tsx` | Add pagination if > 20 recs |

### 4.4 Empty States

| Page | Current | Fix |
|---|---|---|
| `FEFOTracking.tsx` | "No batches found." bare text | Add icon + "No batches tracked yet" with CTA |
| `Recommendations.tsx` | Already has illustration | Minor polish (replace emoji checkmark with icon) |

### 4.5 Responsiveness

| Page | Issue | Fix |
|---|---|---|
| `RecordWastage.tsx` | Form column jumps from single-col to fixed `400px` at `lg:` | Add `md:` breakpoint with `1fr` before `lg:grid-cols-[400px_1fr]` |
| `FEFOTracking.tsx` | Uses `p-1` (too cramped) | Change to `p-4 sm:p-6` consistent with other pages |
| `StockIn.tsx` / `StockOut.tsx` | `min-h-[400px]` on small screens | Use `min-h-[50vh]` or remove fixed height |

---

## Phase 5: Process & Feature Gaps

### 5.1 FEFO Tracking

| Feature | Description |
|---|---|
| Batch detail view | Click a row to open a detail panel showing full batch info, movement history, linked products |
| Column sorting | Clickable column headers to sort by expiry date, days left, status |
| Export | Export the batch register as CSV |

### 5.2 Recommendations

| Feature | Description |
|---|---|
| Rejection workflow | "Reject" button with required reason textarea, confirmation dialog |
| Audit trail | Show history of actions taken on each recommendation (approved by X on date, rejected by Y on date) |
| POS integration indicator | Show whether approved promotion has been synced to POS |

### 5.3 Record Wastage

| Feature | Description |
|---|---|
| Edit wastage record | Allow editing quantity/reason for recent records |
| Undo / delete | Soft-delete a wastage record and restore stock |
| Date range filter | Filter the wastage log by date range picker |
| Wastage analytics | Mini chart showing wastage trend (last 7/30 days) |

### 5.4 Manage Inventory

| Feature | Description |
|---|---|
| Edit product | "Edit" action in row dropdown — opens modal with pre-filled form |
| Bulk operations | Multi-select checkboxes + "Stock In" / "Stock Out" / "Delete" batch actions |
| Real expiry tracking | Replace heuristic `+90 days` with actual expiry from FEFO batch data |
| Stock movement history | Load real movements from API (Phase 3.5) |

---

## Dependency Graph

```
Phase 1 (Navigation) ─── no deps, can start immediately
       │
Phase 2 (Backend API) ─── no deps, can start in parallel
       │
       ├──► Phase 3 (Frontend API integration) ─── depends on Phase 2
       │
       └──► Phase 5 (Process features) ─── depends on Phase 2 + 3
       │
Phase 4 (UI/UX Polish) ─── mostly independent, can be done in parallel
```

**Recommended order:** Phase 1 + 2 in parallel → Phase 4 (independent) + Phase 3 → Phase 5

---

## Effort Estimates

| Phase | Files touched | Estimated effort |
|---|---|---|
| Phase 1: Navigation | 1 file | Small (30 min) |
| Phase 2: Backend API | 4-6 files | Large (4-6 hours) |
| Phase 3: Frontend API | 5-7 files | Large (4-6 hours) |
| Phase 4: UI/UX Polish | 5-6 files | Medium (3-4 hours) |
| Phase 5: Features | 4-5 files | Large (4-6 hours) |
| **Total** | **~20 files** | **~16-22 hours** |
