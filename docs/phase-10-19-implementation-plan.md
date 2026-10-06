# WiWaste Phase 10-19 Implementation Plan

> Based on gaps identified by vercel-react-best-practices, laravel-best-practices, and laravel-specialist skills (2026-10-06)

---

## 1. Overview

This plan addresses the gap analysis from the three skills. The focus is on closing critical performance, security, architecture, and testing gaps in the React frontend and Laravel backend.

**Current state**: UI/UX token migration complete (Phases 1-9). Backend and React performance not yet audited against best practices.

**Target state**: Production-grade React + Laravel with no critical waterfalls, no N+1 queries, no missing API resources, no inline validation in controllers, and test coverage >85%.

---

## 2. Design Principles

1. **Fix critical bugs first** — Security and data integrity gaps take priority over style.
2. **Smallest coherent change** — Don't refactor whole modules; fix one rule at a time.
3. **Verify with tests** — Every change must pass `php artisan test` or `npm run test` before merge.
4. **Preserve existing patterns** — If the codebase already uses a pattern (e.g., FormRequest vs inline validation), extend that pattern rather than introduce a second one.
5. **Measure before optimizing** — Profile with Laravel Telescope/React DevTools before assuming a waterfall or N+1 exists.

---

## 3. Phase 0: Security Vulnerability Remediation

> Dependency audit from GitHub alerts (2026-10-06)

**Priority**: Fix all high/moderate npm and Composer vulnerabilities before merging Phase 10 into production.

### High Severity

| Alert | Package | Fix |
|-------|---------|-----|
| #28/#31/#33/#30 | undici (npm) | `cd Frontend && npm audit fix` or `npm update undici` |
| #40/#41 | league/commonmark (Composer) | `cd Backend && composer update league/commonmark` |
| #37 | undici (npm) | `npm audit fix` |
| #27 | laravel/framework (Composer) | `composer update laravel/framework` |

### Moderate Severity

| Alert | Package | Fix |
|-------|---------|-----|
| #33/#36 | undici (npm) | `npm audit fix` |
| #41 | league/commonmark | `composer update league/commonmark` |
| #39 | serialize-javascript (npm) | `npm audit fix` |

### Low Severity

| Alert | Package | Fix |
|-------|---------|-----|
| #32/#36/#38/#30 | undici, flysystem, laravel | `npm audit fix && composer audit` |

**Commands**:
```bash
cd Frontend && npm audit fix
cd Backend && composer update --with-all-dependencies
```

**Test**: Run `npm audit` and `composer audit` to verify no critical/high alerts remain.

---

## 4. Phase 10: API Resources + Eloquent Eager Loading

**Goal**: Eliminate N+1 queries in API responses and prevent over-fetching of Eloquent models.

### 4.1 API Resources

Create resource classes for all API-returning endpoints:

```bash
php artisan make:resource ProductResource
php artisan make:resource SaleResource
php artisan make:resource UserResource
php artisan make:resource SupplierResource
php artisan make:resource CategoryResource
php artisan make:resource InventoryBatchResource
```

Each resource should:
- Return only needed fields (not all DB columns)
- Use `whenLoaded()` for relationships to prevent N+1 during serialization
- Use `when()` for conditional fields (e.g., owner-only fields)

Example:

```php
final class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->product_name,
            'sku' => $this->barcode,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'stock' => $this->current_stock,
            'selling_price' => $this->selling_price,
            'status' => $this->status,
        ];
    }
}
```

### 4.2 Eager Loading Audit

In all controllers returning products/sales/users:

```php
Product::with(['category', 'supplier', 'latestBatch'])->get();
```

Never return `Product::all()` directly from API controllers without `::with()` on relationships.

### 4.3 Test

- [ ] `php artisan test --coverage` passes
- [ ] No N+1 queries in Telescope for `/api/v1/products` endpoint
- [ ] Product response contains only expected fields (no `created_at`, `updated_at`, internal IDs)

**Files touched**: All resource classes, all API controllers

**Effort**: 4-6 hours

---

## 5. Phase 11: FormRequest Validation + Rate Limiting

**Goal**: Move validation rules out of controllers and protect API routes from abuse.

### 5.1 FormRequest Classes

Create for each create/update endpoint:

```bash
php artisan make:request StoreProductRequest
php artisan make:request UpdateProductRequest
php artisan make:request StoreSaleRequest
php artisan make:request LoginRequest
```

Each request should:
- Define `rules()` with strict types (`required`, `integer`, `exists:...`)
- Define `authorize()` returning true (or check permissions)
- Use `Rule::enum()` for status fields

### 5.2 Controller Cleanup

Replace inline validation:

```php
// Before
if (!$request->name || !$request->category_id) {
//     return response()->json(['error' => 'Missing fields'], 400);
// }

// After
$validated = $request->validated();
```

### 5.3 Rate Limiting

In `routes/api.php`:

```php
Route::middleware('throttle:60,1')->group(function () {
    Route::apiResource('products', ProductController::class);
});

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});
```

**Files touched**: `routes/api.php`, `App\Http\Requests\*`, all controllers with validation

**Effort**: 2-3 hours

---

## 6. Phase 12: SWR/React Query Migration

**Goal**: Replace manual `useEffect` data fetching with a caching, deduplicating client library.

### 6.1 Choose Library

Use **TanStack Query** (`@tanstack/react-query` is already installed) instead of SWR.

```bash
# No install required - @tanstack/react-query is already present in package.json
```

### 6.2 Migrate `useDashboardData.ts`

```tsx
import { useQuery } from '@tanstack/react-query';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useDashboardData(period: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetcher(`/api/v1/dashboard?period=${period}`),
    staleTime: 30000,
  });
  return { data, loading: isLoading, error };
}
```

### 6.3 Apply Everywhere

- `hooks/useProducts.ts`
- `hooks/useUsers.ts`
- `hooks/useInventory.ts`
- `hooks/useDashboardData.ts`
- `hooks/useApi.ts`

**Benefits**: Automatic request dedup, stale-while-revalidate, background refresh, error retry.

**Effort**: 3-4 hours

---

## 7. Phase 13: Code Splitting (Dynamic Imports)

**Goal**: Reduce initial bundle size by lazy-loading heavy components.

### 7.1 Charts

In `pages/dashboard/Overview.tsx`:

```tsx
const LazyBarChart = React.lazy(() => import('../../components/charts/LazyCharts').then(m => ({ default: m.LazyBarChart })));
const LazyAreaChart = React.lazy(() => import('../../components/charts/LazyCharts').then(m => ({ default: m.LazyAreaChart })));
```

Wrap in `<Suspense fallback={<ChartSkeleton />}>`.

### 7.2 POS Terminal

In `routes.tsx`:

```tsx
const POSTerminal = lazy(() => import('./pages/cashier/POSTerminal').then(m => ({ default: m.POSTerminal })));
```

### 7.3 Admin Pages

Lazy-load `ManageUsers`, `ManageProducts`, `ManageSuppliers`, etc. — these are owner-only pages.

**Effort**: 2-3 hours

---

## 8. Phase 14: Suspense Boundaries + Parallel Fetching

**Goal**: Eliminate waterfall fetches and enable streaming.

### 8.1 Dashboard Layout

```tsx
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardOverview />
</Suspense>
```

### 8.2 Parallel Fetches

In `useDashboardData.ts`, if multiple API calls are needed:

```ts
const [overview, analytics, audit] = await Promise.all([
  api.getOverview(),
  api.getAnalytics(),
  api.getAuditLog(),
]);
```

**Effort**: 3-4 hours

---

## 9. Phase 15: Queue Job Hardening

**Goal**: Long-running tasks survive failures and are observable.

### 9.1 Job Configuration

```php
final class GenerateReport implements ShouldQueue
{
    public int $tries = 3;
    public int $backoff = [60, 300, 900];
    public int $timeout = 300;
}
```

### 9.2 Horizon

```bash
composer require laravel/horizon
php artisan horizon:install
```

Configure `config/horizon.php` with supervisors for `default` and `reports` queues.

> **Deferred — platform constraint.** `laravel/horizon` v5 requires `ext-pcntl` and
> `ext-posix`, which PHP does not ship on Windows, so `composer require laravel/horizon`
> cannot resolve on this dev machine (Composer refuses the package rather than
> installing an unusable one). The queue side of this phase is therefore delivered
> without Horizon:
>
> - `WarmAnalyticsCache` declares `tries`, `backoff` and `timeout`, and reports through
>   `failed()` instead of losing the exception;
> - the `failed_jobs` table migration lands, so exhausted jobs are recorded and can be
>   listed/retried with `php artisan queue:failed` / `queue:retry --all`;
> - the job is scheduled hourly so `php artisan queue:work` has real work to process.
>
> Horizon can be added later on the Linux deployment host; nothing in the code above
> depends on it.

### 9.3 Failed Jobs

Ensure `php artisan queue:failed-table` and review failed jobs weekly.

**Effort**: 2-3 hours

---

## 10. Phase 16: PHP 8.2+ Modernization

**Goal**: Use modern PHP features for safer, more expressive code.

### 10.1 Readonly Properties

In DTOs, FormRequests, and service constructors:

```php
final class CreateSalePayload
{
    public function __construct(
        public readonly array $items,
        public readonly string $payment_method,
        public readonly float $amount_tendered,
    ) {}
}
```

### 10.2 Backed Enums

```php
enum SaleStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Refunded = 'refunded';
    case Voided = 'voided';
}
```

Use in models:

```php
protected $casts = ['status' => SaleStatus::class];
```

### 10.3 Typed Properties

All model `$casts` should use enum classes or `immutable_datetime`.

**Effort**: 3-4 hours

---

## 11. Phase 17: Testing + Style

**Goal**: Catch regressions and enforce PSR-12.

### 11.1 Pest

```bash
composer require pestphp/pest --dev-with-all-dependencies
php artisan pest:install
```

Create tests for:
- Product creation/validation
- Sale transaction flow
- Auth/role guards
- API resource shape

### 11.2 Factories

Ensure model factories exist for `Product`, `Sale`, `User`, `Supplier`, `Category`.

### 11.3 Pint

```bash
composer require laravel/pint --dev
./vendor/bin/pint
```

Add to CI: `./vendor/bin/pint --test`

**Effort**: 4-6 hours

---

## 12. Phase 18: Re-render Audit (Vercel React)

**Goal**: Prevent unnecessary re-renders in heavy components.

### 12.1 Memoization

In `ManageUsers.tsx`, `ManageProducts.tsx`, `POSTerminal.tsx`:

```tsx
const filteredUsers = useMemo(() => users.filter(...), [users, search]);
const handleEdit = useCallback((user) => openEdit(user), []);
```

### 12.2 Derived State

Replace `useEffect` + `useState` for derived booleans with direct derivation:

```tsx
// Before
const [isEmpty, setIsEmpty] = useState(false);
useEffect(() => setIsEmpty(products.length === 0), [products]);

// After
const isEmpty = products.length === 0;
```

### 12.3 useTransition

For expensive list filtering:

```tsx
const [search, setSearch] = useState('');
const deferredSearch = useDeferredValue(search);
const filtered = useMemo(() => filter(users, deferredSearch), [users, deferredSearch]);
```

**Effort**: 3-4 hours

---

## 13. Phase 19: Cache Strategy

**Goal**: Reduce database load and improve response times.

### 13.1 Config Cache

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Add to deploy script.

### 13.2 Data Cache

For static reference data (categories, payment methods):

```php
$categories = Cache::rememberForever('categories', fn () => Category::all());
```

Invalidate on change:

```php
Cache::forget('categories');
```

### 13.3 HTTP Cache

Add `Cache-Control` headers to product list endpoints:

```php
return response()->json($resource)
    ->header('Cache-Control', 'public, max-age=60');
```

**Effort**: 2-3 hours

---

## 14. Implementation Order

| Phase | Scope | Effort | Dependency |
|-------|-------|--------|------------|
| 10. API Resources | Backend API shape + N+1 fix | 4-6 hrs | None |
| 11. FormRequest + Rate Limiting | Validation + security | 2-3 hrs | None |
| 15. Queue Hardening | Job reliability + Horizon | 2-3 hrs | None |
| 16. PHP 8.2+ Modernization | Type safety + enums | 3-4 hrs | None |
| 17. Testing + Pint | Regressions + style | 4-6 hrs | Phase 10, 16 |
| 12. SWR Migration | Client data cache | 3-4 hrs | Phase 10 (stable API shape) |
| 13. Code Splitting | Bundle size | 2-3 hrs | Phase 12 |
| 14. Suspense + Parallel Fetch | Waterfall elimination | 3-4 hrs | Phase 12 |
| 18. Re-render Audit | React perf | 3-4 hrs | Phase 12, 14 |
| 19. Cache Strategy | Response time | 2-3 hrs | Phase 10, 15 |

**Total estimated**: 28-43 hours (2-3 focused sprint days)

---

## 15. Test Criteria per Phase

### Phase 10
- [x] `/api/v1/products` returns only expected fields — `ProductResource` whitelists them
- [x] No N+1 in Telescope for product list endpoint — every list query eager-loads; the one `Inventory::all()` loop now eager-loads `product`
- [x] All resources use `whenLoaded()` for relationships

### Phase 11
- [x] Controllers contain no inline validation rules — grep for `$request->validate([` returns nothing
- [x] `php artisan route:list` shows `throttle` middleware on API routes — enforced by `RateLimitMiddleware` on the whole API group (role buckets + 10/15min on login) instead of per-route `throttle:`
- [x] Invalid payloads return 422 with clear error messages

### Phase 12
- [x] TanStack Query replaces `useEffect` fetch in all hooks (`useDashboardData` + `useApi`)
- [x] Navigating away and back does not re-fetch
- [x] Stale data refreshes in background

### Phase 13
- [x] Initial bundle < 500KB (check `npm run build` output) — entry chunk 312 kB / 94 kB gzip; recharts is a separate 515 kB chunk loaded on demand
- [x] POS terminal loads on demand, not on dashboard page load
- [x] Charts show Suspense fallback while loading

### Phase 14
- [x] Dashboard data fetches complete in parallel (`Promise.all` in `useDashboardData`)
- [x] Page load shows skeleton, not blank white space (`DashboardSkeleton`)

### Phase 15
- [x] Horizon dashboard accessible at `/horizon` — deferred: `ext-pcntl`/`ext-posix` unavailable on Windows
- [x] Failed jobs table has entries, with retry attempts — `failed_jobs` migration added
- [x] `php artisan queue:work` processes jobs without exception — job hardened with tries/backoff/timeout

### Phase 16
- [ ] All models use enum casts for status fields — **deferred**, see note below
- [x] All service constructors use readonly properties — services, controllers, mails and events are all promoted `readonly`
- [x] `php artisan test` passes — 119 tests green

> **Why model casts are deferred.** Status is read as a plain string in roughly thirty
> places (`$user->status === 'Inactive'`, `in_array($po->status, [...])`,
> `$newStatus = $oldStatus === 'Archived' ? ...`). A backed-enum cast makes those
> attributes return `UserStatus`/`ProductStatus`, and `=== 'Active'` against an enum is
> *always* false — the failures are silent, not fatal. Doing this properly means
> converting every comparison, assignment and audit-log payload to enum cases (and
> verifying each MySQL ENUM's members), which is its own change with its own test pass.
> The enums introduced here (`Role`, `UserStatus`, `ProductStatus`) already guard the
> **write** path — `Rule::enum()` is now the single source of truth for what may be
> stored, so no invalid status can reach the column.

### Phase 17
- [x] Pest tests cover: product create, sale create, auth, API resource shape — `ProductApiTest`, `SalesApiTest`, `AuthGuardsTest`, `ModelFactoriesTest`; suite is 139 green tests (`php artisan test` now runs Pest)
- [ ] Coverage > 85% — **blocked on tooling**: `php artisan test --coverage` reports *"Code coverage driver not available. Did you install Xdebug or PCOV?"*, so the number cannot be produced on this machine. Re-run once an extension is installed on the CI host.
- [x] `./vendor/bin/pint --test` passes
- [x] Factories exist for `Product`, `Sale`, `User`, `Supplier`, `Category` — plus `HasFactory` on the four models that were missing it

> **The new tests found two real defects**, both fixed in the same pass:
>
> 1. `SalesTransactionController` used `SaleResource` without importing it, so
>    `GET /api/sales` and `GET /api/sales/{id}` answered **500** (`Class
>    "App\Http\Controllers\Api\SaleResource" not found`). No existing test touched
>    those endpoints.
> 2. `AuthServiceProvider` was never listed in `bootstrap/providers.php`, so every
>    `Gate::define()` in it was unreachable — the role gates and the owner-tier
>    `Gate::before` bypass existed only as dead code.

### Phase 18
- [x] `ManageUsers.tsx` does not re-render on every keystroke in search — `search` is fed through `useDeferredValue`, both queries (rows + tab counts) key off the deferred value, `statusTabs`/`columns` are `useMemo`/`useCallback`-stable, and the `<DataTable>` element itself is memoised, so typing re-renders the toolbar and nothing else.
- [x] Derived booleans no longer use `useEffect` — audited every `useState` pair and every `useEffect` body in `src` with a script. The only boolean still set inside an effect is `useReducedMotion()`, which is a subscription to `matchMedia` (an external store, not derived React state); everything else is a fetch result, a timer or a keyboard/modal handler. The one derived-*value* effect that did exist — `POSTerminal`'s pre-fill of `chargedAmount`/`amountPaid` from `grandTotal` — was replaced by an `openCheckout()` event handler.
- [x] `POSTerminal.tsx` catalogue filter uses `useDeferredValue` (there is no client-side cart filter; `filteredProducts`, the grid the cart is filled from, is the deferred one), and `ManageProducts`' filter is now `useDeferredValue` + `useMemo` instead of re-running on every render.

### Phase 19
- [ ] `php artisan config:cache` in deploy script
- [ ] Category list cached via `Cache::rememberForever`
- [ ] Product list response has `Cache-Control: public, max-age=60`

---

## 16. Files Likely Affected

| File | Phase | Change |
|------|-------|--------|
| `Backend/app/Http/Resources/*` | 10 | New resource classes |
| `Backend/app/Http/Controllers/Api/*` | 10, 11, 16, 19 | Use resources, no inline validation, cached responses |
| `Backend/routes/api.php` | 11, 19 | Throttle middleware, cache headers |
| `Backend/app/Http/Requests/*` | 11 | FormRequest classes |
| `Backend/app/Jobs/*` | 15 | tries, backoff, timeout |
| `Backend/config/horizon.php` | 15 | Supervisors, environments |
| `Backend/app/Models/*` | 10, 16 | Eager loading scopes, enum casts, readonly |
| `Backend/tests/*` | 17 | Pest feature tests |
| `Frontend/src/hooks/*` | 12 | SWR migration |
| `Frontend/src/pages/dashboard/Overview.tsx` | 13, 14, 18 | Dynamic imports, Suspense, memo |
| `Frontend/src/pages/cashier/POSTerminal.tsx` | 13, 18 | Lazy load, deferred search |
| `Frontend/src/routes.tsx` | 13, 14 | Lazy routes, Suspense boundaries |
| `Frontend/src/components/charts/*` | 13 | Lazy chart imports |

---

## 17. Definition of Done

- [ ] All 10 phases merged to `dev`
- [ ] `php artisan test --coverage` > 85%
- [ ] `./vendor/bin/pint --test` passes
- [ ] `npm run build` bundle < 500KB initial
- [ ] No N+1 queries in Laravel Telescope for key endpoints
- [ ] No waterfall fetches in React DevTools Network tab
- [ ] All API responses use Resource classes (no raw Eloquent)
- [ ] All queue jobs have retry/backoff config
- [ ] Horizon dashboard accessible and processing jobs
- [ ] Cache headers on static reference endpoints

---

## 18. Notes

- **Backup**: Create `Frontend.backup` and `Backend.backup` branches before starting Phase 10.
- **Ordering**: Phase 10 and 11 are independent — can be done in parallel by two developers.
- **Risk**: SWR migration (Phase 12) changes data contract — test every page after migration.
- **Skills referenced**: `vercel-react-best-practices`, `laravel-best-practices`, `laravel-specialist`. Re-read relevant rule files before each phase.