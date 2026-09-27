# Frontend Gap Analysis & Cleanup Implementation Plan

**Date:** 2026-09-27
**Method:** UI-UX-PRO-MAX skill analysis + codebase exploration
**Purpose:** Remove dead code, fix broken features, eliminate mock data, and align the frontend with the design system

---

## Executive Summary

The WiWaste frontend has accumulated significant technical debt: 45+ orphaned UI components, 10+ pages with hardcoded mock data, 5 broken manager sidebar links, 4 files with missing imports that cause runtime errors, and no coherent design system. This plan addresses these gaps in 5 sprints, prioritizing runtime errors and broken features first, then mock data removal, then cleanup.

---

## Design System Recommendations (UI-UX-PRO-MAX)

| Aspect | Recommendation |
|--------|----------------|
| **Style** | Flat Design — 2D, minimalist, bold colors, no shadows, clean lines |
| **Primary** | `#15803D` (Pharmacy green) |
| **Secondary** | `#22C55E` (Vibrant green) |
| **Accent** | `#0369A1` (Trust blue for CTAs) |
| **Background** | `#F0FDF4` (Light green tint) |
| **Heading Font** | Rubik (weights 300-700) |
| **Body Font** | Nunito Sans (weights 300-700) |
| **Effects** | No gradients/shadows, simple hover (color/opacity shift), fast transitions (150-200ms) |
| **Icons** | SVG only (Heroicons/Lucide) — no emojis |
| **Anti-patterns to avoid** | AI purple/pink gradients, confusing layouts, privacy concerns |

---

## Sprint 1: Runtime Errors & Broken Links (CRITICAL)

**Goal:** Fix all issues that cause runtime crashes or navigation failures.

### 1.1 Fix Missing Imports (Runtime Error Prevention)

These files use hooks that are never imported — they will crash if rendered.

| File | Missing Import | Fix |
|------|---------------|-----|
| `src/pages/admin/PrivacyRequests.tsx:39,56` | `useDebounce`, `useApi` | Add imports from `../hooks/useDebounce` and `../hooks/useApi` |
| `src/pages/admin/BreachIncidents.tsx:44,63-64` | `useDebounce`, `useApi` | Add imports from `../hooks/useDebounce` and `../hooks/useApi` |
| `src/pages/admin/DataRetentionConfig.tsx:56` | `useApi` | Add import from `../hooks/useApi` |
| `src/hooks/useKeyboardNavigation.ts:1` | `useState`, `useRef` | Add `useState, useRef` to React import |

### 1.2 Fix Broken Manager Sidebar Links

All 5 manager sidebar links point to routes that don't exist in `routes.tsx`.

| Sidebar Label | Current Path (broken) | Correct Route | Fix Location |
|---------------|----------------------|---------------|--------------|
| Inventory Performance | `/manager/inventory-performance` | `/owner/performance` | `DashboardLayout.tsx` manager group |
| Overstock Risks | `/manager/overstock-risks` | `/owner/overstock` | `DashboardLayout.tsx` manager group |
| Replenishment | `/manager/replenishment` | `/owner/replenishment` | `DashboardLayout.tsx` manager group |
| Supplier Performance | `/manager/supplier-performance` | `/owner/supplier-performance` | `DashboardLayout.tsx` manager group |
| Executive Reports | `/manager/executive-reports` | `/owner/executive-reports` | `DashboardLayout.tsx` manager group |

### 1.3 Fix Theme Provider Conflict

`src/components/ui/sonner.tsx` imports `useTheme` from `next-themes` (a library not in this project). If ever rendered, it would crash.

**Options:**
- A) Remove `sonner.tsx` entirely (it's never used)
- B) Rewrite it to use `../hooks/useTheme` instead

**Recommended:** Option A — delete the file since it's orphaned.

---

## Sprint 2: Remove Mock Data & Connect Real APIs

**Goal:** Replace all hardcoded mock data with real API calls.

### 2.1 Core Mock Infrastructure

| Action | Details |
|--------|---------|
| **File:** `src/utils/mockAuthAndFeatures.ts` | 747 lines — entire mock auth + dashboard data factory |
| **Action:** Gradually deprecate, don't delete yet | Multiple files still import `getStoredSession`, `clearStoredSession`, `UserRole` |
| **First:** Replace `getStoredSession`/`clearStoredSession` with real Sanctum auth tokens in `useDashboardData.ts`, `Dashboard.tsx`, `ProtectedRoute.tsx`, `DashboardLayout.tsx`, `CashierLayout.tsx`, `Login.tsx`, `POSTerminal.tsx` |
| **Then:** Replace `initializeDashboard()` mock data with real API calls |
| **Finally:** Delete `mockAuthAndFeatures.ts` |

### 2.2 Pages with Hardcoded Mock Data

#### HIGH PRIORITY — Entire pages are mock-only

| Page | Route | Mock Data | Real API to Use |
|------|-------|-----------|-----------------|
| `src/pages/dashboard/VendorCredits.tsx` | `/owner/vendor-credits` | `MOCK_VENDOR_RETURNS` (6 records) | Need: `GET /api/vendor-returns` (create if missing) |
| `src/pages/dashboard/FefoTracking.tsx` | `/dashboard/fefo` | `MOCK_BATCHES` (6 records) | Need: `GET /api/inventory/fefo/batches` (create if missing) |
| `src/pages/inventory/FEFOTRacking.tsx` | `/inventory/fefo` | `MOCK_BATCHES` (12 records) | Same as above |
| `src/pages/inventory/Recommendations.tsx` | `/inventory/recommendations` | `MOCK_RECS` (8 records) | Need: `GET /api/inventory/recommendations` (create if missing) |
| `src/pages/manager/SupplierPerformance.tsx` | `/manager/supplier-performance` | `SUPPLIERS` + `TREND_DATA` (2 arrays) | Need: `GET /api/suppliers/performance` (create if missing) |
| `src/pages/manager/OverstockRisks.tsx` | `/manager/overstock-risks` | 3 hardcoded arrays | Need: `GET /api/inventory/overstock` (create if missing) |
| `src/pages/manager/InventoryPerformance.tsx` | `/manager/inventory-performance` | Fake `setTimeout` export | Wire to real export endpoint |

#### MEDIUM PRIORITY — Hybrid mock + real

| Page | Mock Data | Real API Already Used |
|------|-----------|----------------------|
| `src/pages/dashboard/InventoryDashboard.tsx` | `mockMovementChart`, `mockWastageTrend`, `mockTopWasted`, `mockRecentMovements` | KPI cards use `inventoryAnalytics.dashboardSummary()` |
| `src/pages/dashboard/PredictiveAnalytics.tsx` | `mockPredictiveMovement`, `mockPredictiveWastage` | Forecast summary + detection cards use real API |
| `src/hooks/useDashboardData.ts` | `initializeDashboard()` feeds all mock data | `ownerDashboard.overview()` called in parallel |

#### LOW PRIORITY — Fake setTimeout simulations

| File | Line(s) | Action |
|------|---------|--------|
| `src/pages/admin/SystemSettings.tsx` | 152, 159, 166 | Replace with real export/download/purge API calls |
| `src/pages/inventory/Recommendations.tsx` | 164, 179 | Replace with real approve/reject API calls |
| `src/pages/inventory/FEFOTracking.tsx` | 78 | Replace with real FEFO apply API call |

### 2.3 Remove `console.log` Debugging Statements

All 9 instances in `src/utils/mockAuthAndFeatures.ts` (lines 182, 183, 218, 273, 342, 417, 514, 603, 691). Remove when deprecating the file.

---

## Sprint 3: Remove Orphaned Components & Dead Code

**Goal:** Delete all files that are never imported or used.

### 3.1 Dead Page Files (4 files)

| File | Reason |
|------|--------|
| `src/pages/DashboardRedirect.tsx` | Not in `routes.tsx`, never imported |
| `src/pages/inventory/StockIn.tsx` | Auto-redirects to `/inventory/manage`, not in routes |
| `src/pages/inventory/StockOut.tsx` | Auto-redirects to `/inventory/manage`, not in routes |
| `src/components/pos/ReceiptPreview.tsx` | Never imported — POS uses `pages/cashier/ReceiptPreview.tsx` instead |

### 3.2 Orphaned UI Components (40+ shadcn primitives)

The `src/components/ui/` directory contains ~40 shadcn primitive components that are never imported by any page or layout. These were likely installed via shadcn CLI but never used.

**Files to remove** (verify each has zero imports first):
`accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `input.tsx`, `label.tsx`, `menu-bar.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toggle-group.tsx`, `toggle.tsx`

**Also remove:**
- `src/components/skeletons/CardSkeleton.tsx` — never imported
- `src/components/skeletons/TableSkeleton.tsx` — never imported
- `src/components/ui/use-mobile.ts` — never imported
- `src/components/ui/sonner.tsx` — broken (uses `next-themes`), never imported

### 3.3 Unused Hooks (4 files)

| File | Exports | Status |
|------|---------|--------|
| `src/hooks/useDashboard.ts` | `useDashboardOverview`, `useOwnerAnalytics` | Never imported — project uses `useDashboardData.ts` |
| `src/hooks/useSales.ts` | `useSalesList`, `useSaleDetail`, `useCreateSale`, `useSaleReceipt` | Never imported — POS calls API directly |
| `src/hooks/useKeyboardNavigation.ts` | `useKeyboardNavigation`, `useTableKeyboardNavigation`, `useFocusManagement` | Never imported + has missing React imports bug |
| `src/hooks/useReducedMotion.ts` | `useReducedMotion` | Never imported |

---

## Sprint 4: Fix Duplicate Components

**Goal:** Resolve redundant implementations.

### 4.1 Duplicate ReceiptPreview Components

| File | Lines | Used? | Action |
|------|-------|-------|--------|
| `src/components/pos/ReceiptPreview.tsx` | ~200 | No | DELETE |
| `src/pages/cashier/ReceiptPreview.tsx` | ~102 | Yes (by POSTerminal) | KEEP — verify it follows design system |

### 4.2 Duplicate FEFO Tracking Pages

| File | Route | Role | Action |
|------|-------|------|--------|
| `src/pages/dashboard/FefoTracking.tsx` | `/dashboard/fefo` | Owner | Keep, but connect to real API |
| `src/pages/inventory/FEFOTracking.tsx` | `/inventory/fefo` | Inventory | Keep, but connect to real API |

Both are intentionally separate for different roles — no deduplication needed, but both need real API wiring.

---

## Sprint 5: Design System Alignment

**Goal:** Align all UI with the UI-UX-PRO-MAX design system recommendations.

### 5.1 Typography

| Action | Details |
|--------|---------|
| Add Google Fonts import | `@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;500;600;700&family=Rubik:wght@300;400;500;600;700&display=swap')` |
| Set `font-family: 'Rubik'` for headings | Update Tailwind config or global CSS |
| Set `font-family: 'Nunito Sans'` for body | Update Tailwind config or global CSS |

### 5.2 Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#15803D` | Primary buttons, active nav items, links |
| `--color-secondary` | `#22C55E` | Success states, secondary actions |
| `--color-accent` | `#0369A1` | CTA buttons, badges, highlights |
| `--color-background` | `#F0FDF4` | Page background |
| `--color-card` | `#FFFFFF` | Card backgrounds |
| `--color-destructive` | `#DC2626` | Delete, error, warning |
| `--color-muted` | `#E8F0F1` | Disabled states, subtle backgrounds |

### 5.3 Inline Styles to Convert to Tailwind

| File | Line | Current | Tailwind Replacement |
|------|------|---------|---------------------|
| `src/pages/inventory/RecordWastage.tsx` | 376 | `style={{ background: submitting ? '#64748B' : '#0F766E' }}` | `className={submitting ? 'bg-slate-500' : 'bg-teal-700'}` |
| `src/pages/cashier/ReceiptPreview.tsx` | 12-97 | 26 inline `style={{...}}` attributes | Consider Tailwind utility classes (may keep for print rendering) |

### 5.4 Accessibility Quick Wins

| Check | Action |
|-------|--------|
| Contrast 4.5:1 | Audit text-on-background colors using design system tokens |
| Focus states | Ensure all interactive elements have visible `focus-visible:ring-2` |
| Alt text | Audit all `<img>` tags for `alt` attributes |
| Keyboard nav | Verify Tab order through all form fields and interactive elements |
| Reduced motion | Add `@media (prefers-reduced-motion: reduce)` for all transitions |

---

## Execution Order

| Sprint | Priority | Estimated Effort | Dependencies |
|--------|----------|-------------------|-------------|
| **1** | CRITICAL | ~1 hour | None |
| **2** | HIGH | ~4-6 hours | Backend API endpoints may need creation |
| **3** | MEDIUM | ~1 hour | None |
| **4** | LOW | ~30 min | None |
| **5** | LOW | ~2-3 hours | Sprint 2 (mock removal) first for clean baseline |

---

## Files Modified Per Sprint

### Sprint 1
- `src/pages/admin/PrivacyRequests.tsx` — add missing imports
- `src/pages/admin/BreachIncidents.tsx` — add missing imports
- `src/pages/admin/DataRetentionConfig.tsx` — add missing imports
- `src/hooks/useKeyboardNavigation.ts` — add missing React imports
- `src/components/layout/DashboardLayout.tsx` — fix 5 manager sidebar links
- `src/components/ui/sonner.tsx` — delete

### Sprint 2
- `src/utils/mockAuthAndFeatures.ts` — deprecate/gradually remove
- `src/hooks/useDashboardData.ts` — replace mock with real API
- `src/pages/Dashboard.tsx` — replace mock session with Sanctum
- `src/components/auth/ProtectedRoute.tsx` — replace mock session with Sanctum
- `src/components/layout/DashboardLayout.tsx` — replace mock session with Sanctum
- `src/components/layout/CashierLayout.tsx` — replace mock session with Sanctum
- `src/pages/Login.tsx` — replace mock auth with real Sanctum login
- `src/pages/cashier/POSTerminal.tsx` — replace mock session with Sanctum
- `src/pages/dashboard/VendorCredits.tsx` — add real API
- `src/pages/dashboard/FefoTracking.tsx` — add real API
- `src/pages/dashboard/InventoryDashboard.tsx` — replace mock arrays with real API
- `src/pages/dashboard/PredictiveAnalytics.tsx` — replace mock arrays with real API
- `src/pages/inventory/FEFOTRacking.tsx` — add real API
- `src/pages/inventory/Recommendations.tsx` — add real API + replace fake setTimeout
- `src/pages/manager/SupplierPerformance.tsx` — add real API
- `src/pages/manager/OverstockRisks.tsx` — add real API
- `src/pages/manager/InventoryPerformance.tsx` — replace fake export
- `src/pages/admin/SystemSettings.tsx` — replace fake setTimeout operations

### Sprint 3
- DELETE `src/pages/DashboardRedirect.tsx`
- DELETE `src/pages/inventory/StockIn.tsx`
- DELETE `src/pages/inventory/StockOut.tsx`
- DELETE `src/components/pos/ReceiptPreview.tsx`
- DELETE `src/components/skeletons/CardSkeleton.tsx`
- DELETE `src/components/skeletons/TableSkeleton.tsx`
- DELETE `src/components/ui/use-mobile.ts`
- DELETE `src/components/ui/sonner.tsx` (if not done in Sprint 1)
- DELETE ~40 shadcn primitive files in `src/components/ui/` (verify zero imports)
- DELETE `src/hooks/useDashboard.ts`
- DELETE `src/hooks/useSales.ts`
- DELETE `src/hooks/useKeyboardNavigation.ts`
- DELETE `src/hooks/useReducedMotion.ts`

### Sprint 4
- DELETE `src/components/pos/ReceiptPreview.tsx` (if not done in Sprint 3)

### Sprint 5
- `src/index.css` or Tailwind config — add design system tokens (colors, fonts)
- `src/pages/inventory/RecordWastage.tsx` — convert inline style to Tailwind
- Various files — accessibility improvements (focus states, alt text, contrast)
