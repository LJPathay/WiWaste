# Frontend & Backend Improvement Plan — WiWaste

## Overview

Comprehensive plan to improve the WiWaste full-stack application (React 19 + Vite + TypeScript frontend, Laravel 12 + MySQL backend) across security, architecture, code quality, performance, and infrastructure. Organized into 10 phases ordered by priority and dependency.

---

## Current State Summary

| Area | Status |
|------|--------|
| **Frontend** | |
| Framework | React 19 + Vite 6 + TypeScript 6 |
| Styling | Tailwind CSS v4 (dominant), MUI installed but unused |
| State | Local state + Context, no server state library |
| Auth | Mock auth bypass with hardcoded credentials |
| Route protection | Session-only check, no role-based guards |
| Server state | Raw `fetch()` via `useApi` hook, no caching |
| Loading states | Spinners only, no skeleton UI |
| Input handling | No debouncing on search/filter inputs |
| Code splitting | Route-level lazy loading exists, no component-level |
| Large files | `POSTerminal.tsx` (~1,820), `api.ts` (~1,450), `ManageUsers.tsx` (~1,250) |
| Dead code | Backup files, empty `fonts.css`, unused MUI packages |
| **Backend** | |
| Database | MySQL (no connection pooling configured) |
| Cache store | Database-backed (not Redis) |
| Gzip | Enabled via `CompressResponse` middleware |
| Brotli | Not supported |
| N+1 queries | Found in InventoryController, WastageRecordController |
| Missing indexes | Composite indexes missing for common query patterns |
| Query caching | Partial (dashboard overview cached, ownerAnalytics not cached) |
| Image handling | External URLs only, no upload/optimization pipeline |
| **Infrastructure** | |
| CDN | None |
| Load balancer | None |
| Server-side cache | Database-backed (slow), Redis defined but unused |

---

## Phase 1: Security Fixes (P0)

**Goal:** Eliminate authentication bypasses and add proper route authorization.

### 1.1 Remove Mock Auth Bypass

**File:** `Frontend/src/pages/Login.tsx`

**Problem:** Lines 36-71 contain hardcoded demo credentials (`admin`/`admin123`, `staff_inventory`/`staff123`, `cashier_01`/`pos123`) that bypass the real API entirely using `mockLogin()` and a hardcoded `'demo-token'`.

**Changes:**
- Remove the `demoUsers` object (lines 36-40)
- Remove the `if (demoUser && password === demoUser.password)` block (lines 44-72)
- Remove the `mockLogin` import from `../utils/mockAuthAndFeatures`
- Keep only the real `auth.login()` call (lines 74+)
- Remove default username/password values from `useState` (lines 8-9): change to `useState('')`

**Verification:** Login with any demo credentials should fail and show an error.

### 1.2 Add Route-Level Authorization

**File:** New — `Frontend/src/components/auth/ProtectedRoute.tsx`

**Problem:** `DashboardLayout` (line 21-27) checks `getStoredSession()` but does not enforce which routes each role can access. Any authenticated user can navigate to `/owner/*`, `/admin/*`, `/inventory/*` by URL.

**Changes:**
- Create `ProtectedRoute` component that accepts `allowedRoles: UserRole[]`
- Read session from `getStoredSession()`
- If user role not in `allowedRoles`, redirect to `/dashboard` or show 403
- Wrap route groups in `routes.tsx`:

```tsx
// In routes.tsx — wrap owner routes
{
  path: "owner",
  element: <ProtectedRoute allowedRoles={['owner']} />,
  children: [
    { path: "users", Component: ManageUsers },
    // ...
  ],
}
// Wrap inventory routes
{
  path: "inventory",
  element: <ProtectedRoute allowedRoles={['owner', 'inventory']} />,
  children: [ /* ... */ ],
}
// Wrap cashier routes
{
  path: "cashier",
  element: <ProtectedRoute allowedRoles={['cashier']} />,
  children: [ /* ... */ ],
}
```

**Files to modify:**
- New: `Frontend/src/components/auth/ProtectedRoute.tsx`
- Modify: `Frontend/src/routes.tsx`

### 1.3 Fix 401 Auto-Redirect

**File:** `Frontend/src/services/api.ts` (line 20-22)

**Problem:** When a 401 is received, the token is removed from localStorage but the user is not redirected to `/login`. The user sees error messages instead.

**Changes:**
- After `localStorage.removeItem('wiwaste_token')`, add:
```typescript
if (res.status === 401) {
  localStorage.removeItem('wiwaste_token');
  localStorage.removeItem('wiwaste_user');
  localStorage.removeItem('wiwaste-session');
  window.location.href = '/login';
  throw new Error('Session expired. Please log in again.');
}
```

**Note:** Using `window.location.href` instead of React Router's `navigate` because `api.ts` is outside the React component tree.

---

## Phase 2: Server State Management + API Caching (P1)

**Goal:** Replace raw `fetch()` with TanStack Query for client-side caching, deduplication, and background refetching. Add server-side Redis caching for expensive queries.

### 2.1 Install TanStack Query

```bash
cd Frontend && npm install @tanstack/react-query
```

### 2.2 Set Up Query Provider with Cache Configuration

**File:** `Frontend/src/App.tsx`

- Wrap `<RouterProvider>` with `<QueryClientProvider>`
- Configure default options with aggressive caching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — data is fresh for 5 min
      gcTime: 30 * 60 * 1000,         // 30 min — keep unused data in cache
      retry: 1,
      refetchOnWindowFocus: false,     // don't refetch on tab switch
      refetchOnReconnect: 'always',
    },
  },
});
```

### 2.3 Create Query Hooks

**File:** New — `Frontend/src/hooks/useProducts.ts`, `useUsers.ts`, `useInventory.ts`, etc.

**Pattern:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products } from '../services/api';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => products.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => products.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
```

### 2.4 Migrate Pages Incrementally

Start with the highest-traffic pages:

| Priority | Page | File |
|----------|------|------|
| 1 | ManageProducts | `pages/admin/ManageProducts.tsx` |
| 2 | ManageUsers | `pages/admin/ManageUsers.tsx` |
| 3 | ManageInventory | `pages/inventory/ManageInventory.tsx` |
| 4 | ManageSuppliers | `pages/admin/ManageSuppliers.tsx` |
| 5 | POSTerminal | `pages/cashier/POSTerminal.tsx` |
| 6 | All remaining pages | — |

**Migration pattern per page:**
- Replace `useApi<T>()` calls with `useProducts()`, `useUsers()`, etc.
- Remove local `loading`/`error` state (React Query handles this)
- Replace `refetch()` calls with `queryClient.invalidateQueries()`

### 2.5 Server-Side: Switch to Redis Cache Store

**Problem:** Cache is database-backed (`CACHE_STORE=database` in `.env`). Database-backed cache is slow for high-traffic scenarios.

**File:** `Backend/.env`

**Changes:**
```env
CACHE_STORE=redis
```

**File:** `Backend/config/cache.php`

Ensure Redis is the default:
```php
'default' => env('CACHE_STORE', 'redis'),
```

**Impact:** All `Cache::remember()` calls (dashboard overview, analytics, reports, forecasts) will now use Redis — 10-100x faster than database cache.

### 2.6 Server-Side: Cache Expensive Uncached Queries

**Problem:** `DashboardController::ownerAnalytics()` (lines 110-208) runs 8+ uncached queries on every request.

**File:** `Backend/app/Http/Controllers/Api/DashboardController.php`

**Changes:**
```php
public function ownerAnalytics(Request $request)
{
    $businessId = $request->user()->business_id;

    $data = Cache::remember("dashboard.ownerAnalytics.{$businessId}", 300, function () use ($businessId) {
        // ... existing query logic
    });

    return response()->json($data);
}
```

**Apply same pattern to:**
- `FEFOController::batches()` summary queries (lines 54-70) — 3 separate COUNTs → single GROUP BY
- `VendorReturnController::summary()` (lines 410-433) — 10 separate count/sum queries → single GROUP BY
- `RecallController::summary()` (lines 290-308) — 11 separate count queries → single GROUP BY
- `AlertController::summary()` — 6 separate count queries → single GROUP BY

### 2.7 Server-Side: Fix WarmAnalyticsCache Job

**Problem:** `WarmAnalyticsCache` job (lines 20-32) caches a simplified 5-field version that **overwrites** the full 16-field `dashboard.overview` cache.

**File:** `Backend/app/Jobs/WarmAnalyticsCache.php`

**Changes:**
- Update the job to cache the full `DashboardController::overview()` result, not a simplified version
- Or remove the job and let `Cache::remember` handle lazy caching

---

## Phase 3: Split Large Files (P1)

**Goal:** Break monolithic files into manageable, testable modules.

### 3.1 Split `api.ts` (~1,450 lines)

**Current:** Single file with all API functions, all TypeScript interfaces, and business logic types.

**New structure:**
```
Frontend/src/
  types/
    index.ts              # Re-exports all types
    auth.ts               # LoginRequest, LoginResponse, ApiUser
    products.ts           # ApiProduct, ProductFormData
    inventory.ts          # InventoryItem, StockMovement
    pos.ts                # PosProduct, CreateSalePayload, SaleResponse
    suppliers.ts          # ApiSupplier, SupplierFormData
    purchase-orders.ts    # PurchaseOrder, PurchaseOrderItem
    reports.ts            # SalesReport, ReportFilters
    dashboard.ts          # DashboardStats, KPI data types
    common.ts             # PaginatedResponse, ApiError
  services/
    api.ts                # Base request() function, auth service
    products.ts           # Product API functions
    users.ts              # User API functions
    inventory.ts          # Inventory API functions
    pos.ts                # POS/Sales API functions
    suppliers.ts          # Supplier API functions
    purchase-orders.ts    # Purchase order API functions
    reports.ts            # Report API functions
```

**Estimated:** ~1,450 lines split into ~15 files averaging ~100 lines each.

### 3.2 Split `POSTerminal.tsx` (~1,820 lines)

**New structure:**
```
Frontend/src/pages/cashier/
  POSTerminal.tsx              # Main container, state orchestration (~300 lines)
  components/
    ProductGrid.tsx            # Product search + grid (~200 lines)
    CartView.tsx               # Cart items + quantity controls (~250 lines)
    PaymentModal.tsx           # Payment method selection + forms (~300 lines)
    ReceiptPreview.tsx         # (Already exists — keep as-is)
    CashPayment.tsx            # Cash payment form (~100 lines)
    CardPayment.tsx            # Card payment form (~120 lines)
    EWalletPayment.tsx         # E-wallet payment form (~120 lines)
    POSSidebar.tsx             # Cart summary + totals (~150 lines)
    usePOSTerminal.ts          # Custom hook for terminal state (~200 lines)
    useCart.ts                 # Cart logic hook (~150 lines)
```

### 3.3 Split `ManageUsers.tsx` (~1,250 lines)

**New structure:**
```
Frontend/src/pages/admin/
  ManageUsers.tsx              # Main container (~200 lines)
  components/
    UserTable.tsx              # Table with columns definition (~150 lines)
    UserFormDialog.tsx         # Create/Edit form dialog (~300 lines)
    UserActions.tsx            # Edit/Archive/Reset buttons (~100 lines)
    useUsers.ts                # Data fetching hook (~80 lines)
```

---

## Phase 4: Code Cleanup (P2)

**Goal:** Remove dead code, fix inconsistencies, reduce bundle size.

### 4.1 Remove MUI Packages

**Problem:** `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` are installed but zero imports found in `src/`. They add significant bundle size (~200KB+ gzipped).

**File:** `Frontend/package.json`

**Changes:**
```bash
cd Frontend && npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### 4.2 Delete Backup/Debug Files

**Files to delete:**
- `Frontend/src/App.tsx.backup`
- `Frontend/src/App.tsx.debug`
- `Frontend/src/main.tsx.bak`
- `Frontend/src/styles/theme.css.bak`

### 4.3 Fix Filename Bug

**File:** `Frontend/src/components/ui/navigation-menu,.tsx` (trailing comma)

**Change:** Rename to `navigation-menu.tsx`. Check for any imports referencing the old name.

### 4.4 Fix `package.json`

**File:** `Frontend/package.json`

**Changes:**
- Line 2: Change `"name": "@figma/my-make-file"` → `"name": "wiwaste-frontend"`
- Lines 94-98: Remove entire `"pnpm"` block (project uses npm, this has no effect)

### 4.5 Fix Footer Links

**File:** `Frontend/src/components/layout/MainLayout.tsx` (lines 74-98)

**Current:** All footer links point to `/`.

**Changes:**
| Link Text | Current | Target |
|-----------|---------|--------|
| Security | `/` | `/privacy` (or new `/security` page) |
| Privacy Policy | `/` | `/privacy` |
| Terms of Service | `/` | `/terms` |
| About Us | `/` | `/solutions` (or remove if no page exists) |
| Careers | `/` | Remove (no page exists) |
| Contact | `/` | Remove or add `mailto:` link |

### 4.6 Fix Copyright Year

**File:** `Frontend/src/pages/Home.tsx` (line 342)

**Change:** `© 2025 WiWaste` → `© 2026 WiWaste`

### 4.7 Remove Empty `fonts.css`

**File:** `Frontend/src/styles/fonts.css`

**Change:** Delete the file. Remove any import referencing it in `index.css`.

### 4.8 Fix Dark Mode Override on Login

**File:** `Frontend/src/pages/Login.tsx` (line 104)

**Problem:** `document.documentElement.classList.remove('dark')` forcibly removes dark mode on the login page.

**Change:** Remove this line. Let the user's theme preference persist across pages.

---

## Phase 5: Remove Unused Dependencies (P2)

**Goal:** Reduce bundle size by removing packages that are installed but unused.

### 5.1 Audit Installed Packages

Based on import analysis:

| Package | Used? | Action |
|---------|-------|--------|
| `@mui/material` + `@emotion/*` | No imports found | **Remove** |
| `@popperjs/core` | Check imports | Remove if unused |
| `react-slick` | Check imports | Remove if unused |
| `canvas-confetti` | Check imports | Remove if unused |
| `qrcode` | Check imports | Remove if unused |
| `next-themes` | Check if used alongside custom ThemeProvider | Consolidate |
| `input-otp` | Check imports | Remove if unused |
| `react-dnd` + `react-dnd-html5-backend` | Check if actually used | Remove if unused |

### 5.2 Verify with Import Search

Run against each package:
```bash
cd Frontend && grep -r "from 'react-slick'" src/
grep -r "from 'canvas-confetti'" src/
grep -r "from 'qrcode'" src/
# ... etc
```

---

## Phase 6: Frontend Performance (P2)

**Goal:** Optimize rendering, loading UX, input handling, and bundle performance.

### 6.1 Loading Skeletons

**Problem:** All pages show a centered spinner (`<PageLoader />`) during lazy-load and data fetch. Skeletons provide perceived performance by showing the layout shape while data loads.

**New files:**
```
Frontend/src/components/ui/skeleton.tsx        # Base skeleton component
Frontend/src/components/skeletons/
  TableSkeleton.tsx       # Rows of pulsing bars matching DataTable layout
  CardSkeleton.tsx        # KPI card skeleton
  FormSkeleton.tsx        # Form field skeleton
  PageSkeleton.tsx        # Full page layout skeleton
```

**Base skeleton pattern:**
```tsx
import { cn } from "../ui/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
}
```

**Apply to pages:**
- Replace `<PageLoader />` in `lazyPage()` with `<PageSkeleton />`
- Replace `loading ? <Spinner> : <Content>` patterns with skeleton placeholders in:
  - `ManageProducts.tsx` — table skeleton
  - `ManageUsers.tsx` — table skeleton
  - `ManageInventory.tsx` — table skeleton
  - Dashboard pages — card + chart skeletons
  - `POSTerminal.tsx` — product grid skeleton

### 6.2 Debounce Input Handlers

**Problem:** Search and filter inputs fire API calls on every keystroke.

**File:** `Frontend/src/hooks/useDebounce.ts` (already exists)

**Usage pattern:**
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

// Pass debounced value to query
const { data } = useProducts({ search: debouncedSearch });
```

**Apply to:**
- `ManageProducts.tsx` — product search
- `ManageUsers.tsx` — user search
- `ManageInventory.tsx` — inventory search
- `ManageSuppliers.tsx` — supplier search
- `POSTerminal.tsx` — product search (already has some debouncing)
- `AuditLogs.tsx` — log search
- All pages with `<Input>` search fields

### 6.3 Code Splitting (Split Code into Chunks)

**Problem:** Route-level lazy loading exists via `lazyPage()`, but large page bundles are not further split.

**Changes:**

**A. Dynamic imports for heavy sub-components:**
```tsx
// In POSTerminal.tsx — lazy load PaymentModal (only needed at checkout)
const PaymentModal = lazy(() => import('./components/PaymentModal'));
const ReceiptPreview = lazy(() => import('./components/ReceiptPreview'));

// In ManageProducts.tsx — lazy load form dialog
const ProductFormDialog = lazy(() => import('./components/ProductFormDialog'));
```

**B. Vite chunk splitting config:**
**File:** `Frontend/vite.config.ts`
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
        'vendor-charts': ['recharts'],
        'vendor-motion': ['framer-motion', 'motion'],
      },
    },
  },
}
```

### 6.4 Lazy Loading (Route + Component Level)

**Current:** Route-level lazy loading exists via `lazyPage()` helper.

**Enhancements:**
- Add `loading="lazy"` to all `<img>` elements across the app
- Add Intersection Observer-based lazy loading for below-the-fold sections:
```tsx
// New hook: Frontend/src/hooks/useIntersectionObserver.ts
export function useIntersectionObserver(ref, options) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, options);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);
  return isVisible;
}
```

**Apply to:**
- Dashboard charts (load when scrolled into view)
- `PredictiveAnalytics.tsx` — heavy chart components
- `GenerateReports.tsx` — report tables below the fold
- Marketing home page sections (`Home.tsx`)

### 6.5 Defer Non-Critical Scripts

**File:** `Frontend/index.html`

**Changes:**
```html
<!-- Defer analytics/tracking scripts -->
<script defer src="/analytics.js"></script>

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />

<!-- Preconnect to API domain -->
<link rel="preconnect" href="http://localhost:8000" />
```

**In components:**
- Use `requestIdleCallback` for non-urgent computations:
```typescript
// New utility: Frontend/src/utils/defer.ts
export function defer(callback: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 1000 });
  } else {
    setTimeout(callback, 0);
  }
}
```

- Apply to: analytics events, non-critical localStorage writes, heavy computations after initial render

### 6.6 Remove Unnecessary Re-renders

**Problem:** Components re-render on every parent state change, causing jank in data-heavy pages.

**Changes:**

**A. Memoize expensive components:**
```tsx
// DataTable row — avoid re-rendering all rows when one row changes
const DataRow = React.memo(({ row, columns, isHovered, onMouseEnter, onMouseLeave }) => {
  // ...
});

// Chart components
const SalesChart = React.memo(({ data }) => {
  const chartData = useMemo(() => transformData(data), [data]);
  return <RechartsLineChart data={chartData} />;
});
```

**B. Memoize column definitions:**
```tsx
// In ManageProducts.tsx
const columns = useMemo<DataTableColumn<ApiProduct>[]>(() => [
  { key: 'name', header: 'Product Name', pinned: true, truncate: true },
  // ...
], []); // Empty deps — columns never change
```

**C. Memoize callbacks:**
```tsx
const handleEdit = useCallback((product: ApiProduct) => {
  setEditingProduct(product);
  setShowFormDialog(true);
}, []);
```

**D. Avoid inline object/array/function in JSX:**
```tsx
// Bad — creates new reference every render
<DataTable columns={[...]} data={data} />

// Good — stable reference
const columns = useMemo(() => [...], []);
<DataTable columns={columns} data={data} />
```

**Apply to:**
- `DataTable.tsx` — memoize row component
- All dashboard chart components
- `Sidebar` in `DashboardLayout.tsx`
- `HeaderLabel` in `DashboardLayout.tsx`

### 6.7 Paginate Large Lists

**Problem:** Some endpoints return all records without pagination. Frontend `DataTable` supports pagination but many pages don't use it.

**Backend changes:**
- Ensure all list endpoints return paginated responses (most already do with `->paginate()`)
- Cap `per_page` at reasonable defaults (already done: 100 max)

**Frontend changes:**
- Add client-side pagination to `DataTable` component (already has `pagination` prop)
- Apply to pages that currently show unbounded lists:
  - `AuditLogs.tsx` — ensure server pagination is used
  - `CashierHistory.tsx` — paginated transaction list
  - `StockMovements.tsx` — paginated movement log
- Add page size selector (25, 50, 100) to `DataTable` pagination

### 6.8 Minify JS and CSS

**Problem:** Vite handles minification in production builds, but verify it's configured.

**File:** `Frontend/vite.config.ts`

Vite uses esbuild for minification by default. Ensure:
```typescript
build: {
  minify: 'esbuild',  // default — fast + effective
  // For even smaller output (optional, slower build):
  // minify: 'terser',
  // terserOptions: { compress: { drop_console: true } },
}
```

**Verify:**
```bash
cd Frontend && npm run build
# Check dist/ output — all JS/CSS should be minified
```

### 6.9 Bundle Analysis

```bash
cd Frontend && npm install -D vite-bundle-visualizer
npx vite-bundle-visualizer
```

Identify largest chunks and optimize.

### 6.10 Virtualize Long Lists

For pages with 100+ rows (product catalogs, inventory, audit logs):

```bash
npm install @tanstack/react-virtual
```

Apply to:
- `ManageProducts.tsx` (product list)
- `ManageInventory.tsx` (inventory items)
- `AuditLogs.tsx` (log entries)
- `POSTerminal.tsx` (product grid)

---

## Phase 7: Backend Performance (P1)

**Goal:** Fix N+1 queries, add missing indexes, compress API payloads, enable connection pooling.

### 7.1 Remove N+1 Database Queries

**Identified N+1 issues:**

| File | Line | Problem | Fix |
|------|------|---------|-----|
| `InventoryController.php` | 29, 54 | `Inventory::with('product.category')` but accesses `product.supplier` | Add `'product.supplier'` to `with()` |
| `WastageRecordController.php` | 84 | `$inventory->product` accessed without eager loading in `store()` | Add `->with('product')` to the Inventory query |

**Changes:**

**File:** `Backend/app/Http/Controllers/Api/InventoryController.php` (line 29)
```php
// Before:
$inventory = Inventory::with('product.category')
// After:
$inventory = Inventory::with(['product.category', 'product.supplier'])
```

**File:** `Backend/app/Http/Controllers/Api/WastageRecordController.php` (line ~80)
```php
// Before:
$inventory = Inventory::where('id', $request->inventory_id)->first();
// After:
$inventory = Inventory::with('product')->where('id', $request->inventory_id)->first();
```

**Audit all controllers for similar patterns:**
- Search for `->product?->` access without prior `with('product')`
- Search for `->user?->` access without prior `with('user')`
- Use Laravel Debugbar or `DB::listen()` to log queries in development

### 7.2 Add Missing Database Indexes

**Problem:** Several common query patterns lack composite indexes.

**New migration:** `Backend/database/migrations/2026_09_17_000001_add_composite_indexes.php`

```php
Schema::connection('mysql')->table('Stock_Movement', function (Blueprint $table) {
    $table->index(['product_id', 'movement_date'], 'idx_movement_product_date');
});

Schema::connection('mysql')->table('Sales_Transaction', function (Blueprint $table) {
    $table->index(['business_id', 'branch_id', 'transaction_date'], 'idx_sales_biz_branch_date');
});

Schema::connection('mysql')->table('Inventory', function (Blueprint $table) {
    $table->index(['business_id', 'branch_id', 'product_id'], 'idx_inventory_biz_branch_product');
});

Schema::connection('mysql')->table('FEFO_Batch', function (Blueprint $table) {
    $table->index(['product_id', 'status', 'expiry_date'], 'idx_fefo_product_status_expiry');
});

Schema::connection('mysql')->table('Audit_Log', function (Blueprint $table) {
    $table->index('created_at', 'idx_auditlog_created');
});

Schema::connection('mysql')->table('User', function (Blueprint $table) {
    $table->index('username', 'idx_user_username');
});

Schema::connection('mysql')->table('Stock_Receiving', function (Blueprint $table) {
    $table->index(['business_id', 'branch_id'], 'idx_stock_receiving_biz_branch');
});
```

### 7.3 Compress API Payloads

**Current state:** `CompressResponse` middleware applies gzip level 6 to responses > 256 bytes.

**Enhancements:**

**A. Add Brotli support:**
**File:** `Backend/app/Http/Middleware/CompressResponse.php`

```php
// Check Accept-Encoding for brotli support
$acceptEncoding = $request->header('Accept-Encoding', '');

if (str_contains($acceptEncoding, 'br') && function_exists('brotli_compress')) {
    $content = brotli_compress($content, 6);
    $response->headers->set('Content-Encoding', 'br');
} elseif (str_contains($acceptEncoding, 'gzip')) {
    $content = gzencode($content, 6);
    $response->headers->set('Content-Encoding', 'gzip');
}
```

**B. Enable compression in Vite build:**
**File:** `Frontend/vite.config.ts`

```typescript
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({ algorithm: 'gzip' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
});
```

```bash
cd Frontend && npm install -D vite-plugin-compression
```

**C. Standardize JSON response envelope:**
Most endpoints return raw data. Standardize to:
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 25,
    "total": 120
  }
}
```

### 7.4 Database Connection Pooling

**Problem:** MySQL has no connection pooling configured. Each request opens a new connection.

**Option A: Laravel Persistent Connections (quick fix)**
**File:** `Backend/config/database.php` (MySQL section)
```php
'mysql' => [
    // ... existing config
    'options' => [
        PDO::ATTR_PERSISTENT => true,
    ],
],
```

**Option B: ProxySQL or external connection pooler (production)**
For production deployment, use ProxySQL in front of MySQL:
- Install ProxySQL on the same server or a separate server
- Configure Laravel to connect to ProxySQL (port 6033) instead of MySQL (port 3306)
- ProxySQL handles connection pooling, query routing, and failover

**Option C: Use Laravel Octane (Swoole/RoadRunner)**
```bash
composer require laravel/octane
php artisan octane:install --server=swoole
```
Octane keeps the application in memory between requests, eliminating connection setup overhead.

### 7.5 Optimize Expensive Summary Queries

**Problem:** Multiple controllers run 6-11 separate COUNT queries that could be a single GROUP BY.

**File:** `Backend/app/Http/Controllers/Api/VendorReturnController.php` (lines 410-433)

**Before (10 queries):**
```php
$pending = VendorReturn::where('status', 'pending')->count();
$approved = VendorReturn::where('status', 'approved')->count();
$rejected = VendorReturn::where('status', 'rejected')->count();
// ... 7 more separate queries
```

**After (1 query):**
```php
$statusCounts = VendorReturn::select('status', DB::raw('count(*) as count'))
    ->where('business_id', $businessId)
    ->groupBy('status')
    ->pluck('count', 'status');

$reasonCounts = VendorReturn::select('reason', DB::raw('count(*) as count'))
    ->where('business_id', $businessId)
    ->groupBy('reason')
    ->pluck('count', 'reason');
```

**Apply same optimization to:**
- `RecallController::summary()` (lines 290-308)
- `AlertController::summary()`
- `FEFOController::batches()` summary (lines 54-70)

---

## Phase 8: Image Optimization (P2)

**Goal:** Compress images, add database indexes for image columns, implement image upload pipeline.

### 8.1 Image Compression Pipeline

**Problem:** Images are stored as external URLs. No upload or optimization pipeline exists.

**Backend changes:**

**A. Add image upload endpoint:**
**File:** New — `Backend/app/Http/Controllers/Api/ImageController.php`
```php
public function store(Request $request)
{
    $request->validate([
        'image' => 'required|image|max:5120|mimes:jpg,jpeg,png,webp',
    ]);

    $image = $request->file('image');

    // Generate optimized versions
    $original = $image->store('images/originals', 'public');
    $thumbnail = Image::make($image)->resize(300, 300, function ($constraint) {
        $constraint->aspectRatio();
        $constraint->upsize();
    })->encode('webp', 85)->store('images/thumbnails', 'public');

    $optimized = Image::make($image)->encode('webp', 80)->store('images/optimized', 'public');

    return response()->json([
        'url' => Storage::url($optimized),
        'thumbnail_url' => Storage::url($thumbnail),
    ]);
}
```

**B. Install Intervention Image:**
```bash
composer require intervention/image
```

**C. Configure image sizes:**
| Version | Max Size | Format | Quality | Use Case |
|---------|----------|--------|---------|----------|
| Original | 2048px | WebP | 85% | Full view |
| Optimized | 1200px | WebP | 80% | Detail pages |
| Thumbnail | 300px | WebP | 85% | Table rows, cards |

### 8.2 Database Indexes for Image Columns

**Problem:** Image URL columns are not indexed. Queries filtering by image presence are slow.

**Add to migration in Phase 7.2:**
```php
Schema::connection('mysql')->table('Return_Transaction', function (Blueprint $table) {
    $table->index('evidence_photos', 'idx_return_evidence_photos');
});
```

### 8.3 CDN for Image Delivery

**See Phase 9.2** — images served through CDN with cache headers.

---

## Phase 9: Infrastructure (P2)

**Goal:** Add CDN, load balancer, and production-ready infrastructure.

### 9.1 Load Balancer (nginx)

**New file:** `Infrastructure/nginx.conf`

```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:9000;
    server 127.0.0.1:9001;
    server 127.0.0.1:9002;
    keepalive 32;
}

upstream frontend {
    server 127.0.0.1:5173;
}

server {
    listen 80;
    server_name wiwaste.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wiwaste.com;

    # SSL
    ssl_certificate /etc/ssl/certs/wiwaste.pem;
    ssl_certificate_key /etc/ssl/private/wiwaste.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Gzip/Brotli at reverse proxy level
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Frontend (static files)
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limit zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### 9.2 CDN

**Option A: Cloudflare (free tier)**
1. Create Cloudflare account
2. Add domain, update nameservers
3. Enable:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - Rocket Loader (defers JS)
   - Cache Rules: cache static assets for 1 year, API responses for 5 min
   - Page Rules: cache `/images/*` aggressively

**Option B: CloudFront (AWS)**
```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name wiwaste.com \
  --default-root-object index.html
```

**CDN caching strategy:**
| Asset Type | Cache TTL | Headers |
|------------|-----------|---------|
| HTML | 0 (always fresh) | `Cache-Control: no-cache` |
| JS/CSS (hashed) | 1 year | `Cache-Control: public, immutable` |
| Images | 30 days | `Cache-Control: public, max-age=2592000` |
| API responses | 5 min | Via `Cache-Control` header from Laravel |
| Fonts | 1 year | `Cache-Control: public, immutable` |

### 9.3 Server-Side Caching (Redis)

Already covered in Phase 2.5. Summary of all caching layers:

| Layer | Technology | What's Cached | TTL |
|-------|-----------|---------------|-----|
| Client-side | TanStack Query | API responses | 5 min stale, 30 min GC |
| CDN | Cloudflare/CloudFront | Static assets + API responses | 5 min - 1 year |
| Reverse proxy | nginx | Gzip/Brotli compression | Real-time |
| Application | Redis | Expensive queries, analytics | 5-60 min |
| Database | MySQL query cache | (InnoDB buffer pool) | Automatic |

---

## Phase 10: Final Optimization + Verification (P3)

**Goal:** Verify all optimizations, measure impact, document results.

### 10.1 Performance Benchmarks

**Before/after measurements:**

| Metric | Tool | Target |
|--------|------|--------|
| First Contentful Paint | Lighthouse | < 1.5s |
| Largest Contentful Paint | Lighthouse | < 2.5s |
| Time to Interactive | Lighthouse | < 3.5s |
| Total Blocking Time | Lighthouse | < 200ms |
| Cumulative Layout Shift | Lighthouse | < 0.1 |
| Bundle size (gzipped) | `npx vite-bundle-visualizer` | < 200KB total |
| API response time (p95) | Laravel Telescope/Debugbar | < 200ms |
| Database queries per page | Debugbar | < 15 queries |
| TTFB | WebPageTest | < 600ms |

### 10.2 Final Cleanup

- Remove any remaining dead code
- Verify all TypeScript compiles (`npx tsc --noEmit`)
- Verify `npm run build` succeeds
- Verify `npm run test` passes
- Verify `php artisan test` passes
- Run Lighthouse audit on key pages

---

## Execution Order

| Step | Phase | Task | Est. Time | Files |
|------|-------|------|-----------|-------|
| 1 | 1.1 | Remove mock auth bypass | 30 min | `Login.tsx` |
| 2 | 1.2 | Create `ProtectedRoute` + wrap routes | 1.5h | New file, `routes.tsx` |
| 3 | 1.3 | Fix 401 auto-redirect | 15 min | `api.ts` |
| 4 | 2.1 | Install TanStack Query + set up provider | 30 min | `package.json`, `App.tsx` |
| 5 | 2.2 | Create query hooks for products/users/inventory | 1h | New hook files |
| 6 | 2.3 | Migrate top 3 pages to React Query | 2h | `ManageProducts`, `ManageUsers`, `ManageInventory` |
| 7 | 2.4 | Migrate remaining pages | 3h | All page files |
| 8 | 2.5 | Switch to Redis cache store | 30 min | `Backend/.env`, `config/cache.php` |
| 9 | 2.6 | Cache ownerAnalytics + summary queries | 1h | Multiple controllers |
| 10 | 2.7 | Fix WarmAnalyticsCache job | 30 min | `WarmAnalyticsCache.php` |
| 11 | 3.1 | Split `api.ts` into types + services | 2h | ~15 new files |
| 12 | 3.2 | Split `POSTerminal.tsx` | 2h | ~10 new files |
| 13 | 3.3 | Split `ManageUsers.tsx` | 1h | ~4 new files |
| 14 | 4.1 | Remove MUI packages | 5 min | `package.json` |
| 15 | 4.2 | Delete backup files | 5 min | 4 files |
| 16 | 4.3 | Fix `navigation-menu,.tsx` filename | 5 min | Rename |
| 17 | 4.4 | Fix `package.json` name + remove pnpm block | 5 min | `package.json` |
| 18 | 4.5 | Fix footer links | 15 min | `MainLayout.tsx` |
| 19 | 4.6 | Fix copyright year | 5 min | `Home.tsx` |
| 20 | 4.7 | Remove empty `fonts.css` | 5 min | `fonts.css`, `index.css` |
| 21 | 4.8 | Fix dark mode override on login | 5 min | `Login.tsx` |
| 22 | 5 | Audit + remove unused dependencies | 1h | `package.json` |
| 23 | 6.1 | Create skeleton components | 1.5h | New skeleton files |
| 24 | 6.2 | Add debounce to all search inputs | 1h | Multiple pages |
| 25 | 6.3 | Code splitting (dynamic imports + Vite config) | 1h | `vite.config.ts`, pages |
| 26 | 6.4 | Lazy loading (images + intersection observer) | 1h | Multiple files |
| 27 | 6.5 | Defer non-critical scripts | 30 min | `index.html`, utils |
| 28 | 6.6 | Remove unnecessary re-renders | 1.5h | Multiple components |
| 29 | 6.7 | Paginate large lists | 1h | Multiple pages |
| 30 | 6.8 | Verify minification | 15 min | Config |
| 31 | 6.9 | Bundle analysis + optimization | 1h | Config files |
| 32 | 6.10 | Virtualize long lists | 2h | Multiple pages |
| 33 | 7.1 | Fix N+1 queries | 1h | Controllers |
| 34 | 7.2 | Add composite indexes | 1h | New migration |
| 35 | 7.3 | Add Brotli + Vite compression | 1h | Middleware, vite config |
| 36 | 7.4 | Database connection pooling | 30 min | `config/database.php` |
| 37 | 7.5 | Optimize summary queries (GROUP BY) | 1.5h | Controllers |
| 38 | 8.1 | Image compression pipeline | 2h | New controller, composer |
| 39 | 8.2 | Index image columns | 15 min | Migration |
| 40 | 9.1 | nginx load balancer config | 1h | New nginx.conf |
| 41 | 9.2 | CDN setup (Cloudflare) | 1h | DNS config |
| 42 | 10.1 | Performance benchmarks | 1h | Lighthouse reports |
| 43 | 10.2 | Final cleanup + verification | 1h | All files |
| **Total** | | | **~45h** | |

---

## Validation Checklist

After each phase, verify:

### Phase 1 (Security)
- [ ] Demo credentials no longer work on login page
- [ ] Real API login works for all roles
- [ ] Inventory user cannot access `/owner/*` routes (redirected)
- [ ] Cashier user cannot access `/owner/*` or `/inventory/*` routes
- [ ] Expired token redirects to `/login`
- [ ] 401 from API clears session and redirects

### Phase 2 (React Query + Server Caching)
- [ ] Data loads correctly on all migrated pages
- [ ] Stale data refetches in background
- [ ] Loading/error states display correctly
- [ ] Mutations invalidate related queries
- [ ] No duplicate API calls on page navigation
- [ ] Redis is active cache store (`php artisan tinker` → `Cache::getStore()`)
- [ ] `ownerAnalytics` responds from cache on second call
- [ ] Summary endpoints return single-query results

### Phase 3 (File Splitting)
- [ ] All imports resolve correctly
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] All pages function identically to before
- [ ] No circular dependencies

### Phase 4 (Cleanup)
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] No console errors about missing modules
- [ ] Footer links navigate to correct pages
- [ ] Copyright shows 2026 everywhere
- [ ] Dark mode persists on login page

### Phase 5 (Dependencies)
- [ ] `npm run build` succeeds after removing packages
- [ ] No import errors
- [ ] Bundle size reduced (compare before/after)

### Phase 6 (Frontend Performance)
- [ ] Skeleton loading states appear on all major pages
- [ ] Search inputs debounce correctly (no API call per keystroke)
- [ ] Bundle is split into logical chunks (check Network tab)
- [ ] Images load lazily (check `loading="lazy"` attribute)
- [ ] Non-critical scripts deferred
- [ ] React DevTools Profiler shows no unnecessary re-renders
- [ ] All large lists are paginated
- [ ] Bundle size < 200KB gzipped

### Phase 7 (Backend Performance)
- [ ] No N+1 queries (check Debugbar query log)
- [ ] Composite indexes created (`SHOW INDEX FROM table_name`)
- [ ] Brotli compression working (`Content-Encoding: br` header)
- [ ] Connection pooling active (check `SHOW PROCESSLIST`)
- [ ] Summary endpoints use single GROUP BY queries

### Phase 8 (Image Optimization)
- [ ] Image upload endpoint works
- [ ] Uploaded images compressed to WebP
- [ ] Thumbnails generated
- [ ] Image URL columns indexed

### Phase 9 (Infrastructure)
- [ ] nginx load balancer distributes traffic
- [ ] CDN serves static assets
- [ ] SSL/TLS configured correctly
- [ ] Cache headers set properly

### Phase 10 (Final)
- [ ] Lighthouse score > 90 on all key pages
- [ ] All tests pass (frontend + backend)
- [ ] No regressions from original functionality

---

## Key Files Reference

### Files to Create
| File | Purpose |
|------|---------|
| `Frontend/src/components/auth/ProtectedRoute.tsx` | Role-based route guard |
| `Frontend/src/components/ui/skeleton.tsx` | Base skeleton component |
| `Frontend/src/components/skeletons/TableSkeleton.tsx` | Table loading skeleton |
| `Frontend/src/components/skeletons/CardSkeleton.tsx` | Card loading skeleton |
| `Frontend/src/components/skeletons/PageSkeleton.tsx` | Full page skeleton |
| `Frontend/src/hooks/useIntersectionObserver.ts` | Lazy loading observer |
| `Frontend/src/utils/defer.ts` | Defer non-critical work |
| `Frontend/src/types/index.ts` | Central type exports |
| `Frontend/src/types/auth.ts` | Auth-related types |
| `Frontend/src/types/products.ts` | Product types |
| `Frontend/src/types/inventory.ts` | Inventory types |
| `Frontend/src/types/pos.ts` | POS/Sales types |
| `Frontend/src/types/suppliers.ts` | Supplier types |
| `Frontend/src/types/purchase-orders.ts` | PO types |
| `Frontend/src/types/reports.ts` | Report types |
| `Frontend/src/types/dashboard.ts` | Dashboard types |
| `Frontend/src/types/common.ts` | Shared types (PaginatedResponse, etc.) |
| `Frontend/src/services/products.ts` | Product API functions |
| `Frontend/src/services/users.ts` | User API functions |
| `Frontend/src/services/inventory.ts` | Inventory API functions |
| `Frontend/src/services/pos.ts` | POS API functions |
| `Frontend/src/services/suppliers.ts` | Supplier API functions |
| `Frontend/src/hooks/useProducts.ts` | React Query hooks for products |
| `Frontend/src/hooks/useUsers.ts` | React Query hooks for users |
| `Frontend/src/hooks/useInventory.ts` | React Query hooks for inventory |
| `Backend/app/Http/Controllers/Api/ImageController.php` | Image upload endpoint |
| `Backend/database/migrations/2026_09_17_000001_add_composite_indexes.php` | Performance indexes |
| `Infrastructure/nginx.conf` | Load balancer config |

### Files to Modify
| File | Phase | Changes |
|------|-------|---------|
| `Frontend/src/pages/Login.tsx` | 1.1, 4.8 | Remove mock auth, fix dark mode |
| `Frontend/src/routes.tsx` | 1.2 | Add ProtectedRoute wrappers |
| `Frontend/src/services/api.ts` | 1.3, 3.1 | Fix 401 redirect, split into services |
| `Frontend/src/App.tsx` | 2.1 | Add QueryClientProvider |
| `Frontend/vite.config.ts` | 6.3, 7.3 | Chunk splitting, Brotli compression |
| `Frontend/index.html` | 6.5 | Preload, preconnect, defer scripts |
| `Frontend/src/pages/admin/ManageProducts.tsx` | 2.3, 6.1, 6.2 | React Query, skeletons, debounce |
| `Frontend/src/pages/admin/ManageUsers.tsx` | 2.3, 3.3, 6.2 | Migrate, split, debounce |
| `Frontend/src/pages/inventory/ManageInventory.tsx` | 2.3, 6.1, 6.2 | React Query, skeletons, debounce |
| `Frontend/src/pages/cashier/POSTerminal.tsx` | 3.2, 6.3 | Split, code splitting |
| `Frontend/src/components/shared/DataTable.tsx` | 6.6 | Memoize rows |
| `Frontend/src/components/layout/MainLayout.tsx` | 4.5 | Fix footer links |
| `Frontend/src/pages/Home.tsx` | 4.6 | Fix copyright year |
| `Frontend/package.json` | 4.1, 4.4, 5 | Remove MUI, fix name, remove unused |
| `Backend/.env` | 2.5 | Switch CACHE_STORE to redis |
| `Backend/config/database.php` | 7.4 | Enable persistent connections |
| `Backend/app/Http/Controllers/Api/InventoryController.php` | 7.1 | Fix N+1 on product.supplier |
| `Backend/app/Http/Controllers/Api/WastageRecordController.php` | 7.1 | Fix N+1 on product |
| `Backend/app/Http/Controllers/Api/DashboardController.php` | 2.6 | Cache ownerAnalytics |
| `Backend/app/Http/Controllers/Api/VendorReturnController.php` | 7.5 | Optimize summary queries |
| `Backend/app/Http/Controllers/Api/RecallController.php` | 7.5 | Optimize summary queries |
| `Backend/app/Http/Middleware/CompressResponse.php` | 7.3 | Add Brotli support |
| `Backend/app/Jobs/WarmAnalyticsCache.php` | 2.7 | Fix cache overwrite |

### Files to Delete
| File | Reason |
|------|--------|
| `Frontend/src/App.tsx.backup` | Backup file |
| `Frontend/src/App.tsx.debug` | Debug file |
| `Frontend/src/main.tsx.bak` | Backup file |
| `Frontend/src/styles/theme.css.bak` | Backup file |
| `Frontend/src/styles/fonts.css` | Empty unused file |
| `Frontend/src/components/ui/navigation-menu,.tsx` | Rename (remove comma) |
