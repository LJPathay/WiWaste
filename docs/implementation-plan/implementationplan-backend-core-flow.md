# Backend Core Flow Fixes Implementation Plan

## Overview
Remove PayMongo coupling from sales transaction flow, fix inventory status logic, remove auth fallbacks, and establish clean infrastructure for core POS operations.

---

## Phase 0: Infrastructure Setup (Prerequisites)

| # | Task | Command | Verification |
|---|------|---------|--------------|
| 0.1 | Create MySQL database | `mysql -u root -p -e "CREATE DATABASE wiwaste_db;"` | `mysql -u root -p -e "SHOW DATABASES;"` |
| 0.2 | Run migrations | `cd Backend && php artisan migrate` | `php artisan migrate:status` |
| 0.3 | Create queue tables | `php artisan queue:table && php artisan migrate` | `jobs`, `failed_jobs`, `job_batches` exist |
| 0.4 | Create seeders | Create `DatabaseSeeder` with admin user, categories, suppliers, sample products | `php artisan db:seed` works |

---

## Phase 1: Remove PayMongo from Sales Flow (7 Files)

| File | Changes |
|------|---------|
| `Backend/app/Http/Controllers/Api/SalesTransactionController.php` | • Line 60: Remove `'PayMongo'` from enum<br>• Line 61: Remove `required_if:payment_method,PayMongo`<br>• Remove `$isPayMongo` flag & all conditional branches (lines 76-224)<br>• Single flow: create transaction → deduct inventory → stock movements → audit log → return |
| `Backend/app/Http/Controllers/Api/PayMongoController.php` | **Delete entire file** |
| `Backend/app/Jobs/ProcessPayMongoWebhook.php` | **Delete entire file** |
| `Backend/app/Services/PayMongoService.php` | **Delete entire file** |
| `Backend/routes/api.php` | Remove lines 66-68 (PayMongo routes) |
| `Backend/config/services.php` | Remove `paymongo` array (lines 43-52) |
| `Backend/.env` / `.env.example` | Remove all `PAYMONGO_*` variables |

**Result:** Cash / E-wallet / Credit Card / Debit Card only. Clean single code path.

---

## Phase 2: Fix Inventory Status for Zero Stock

| File | Change |
|------|--------|
| `Backend/app/Models/Inventory.php:22` | `if ($stock <= 0) return 'Out of Stock';` (was `'Low Stock'`) |

---

## Phase 3: Remove Auth Fallbacks (`?? 1`)

| File | Lines | Fix |
|------|-------|-----|
| `Backend/app/Http/Controllers/Api/SalesTransactionController.php` | 75 | Add `auth:sanctum` middleware to route; return 401 if no user |
| `Backend/app/Http/Controllers/Api/InventoryController.php` | 70, 115 | Same |
| `Backend/app/Http/Controllers/Api/RecommendationController.php` | 69, 95 | Same |
| `Backend/app/Http/Controllers/Api/PurchaseOrderController.php` | Check all | Same |
| `Backend/routes/api.php` | All protected routes | Wrap in `Route::middleware('auth:sanctum')` except `/login`, `/health` |

---

## Phase 4: Queue Configuration

**Decision needed:** Choose one:
- **A. `sync` driver** (recommended for local dev): `.env` → `QUEUE_CONNECTION=sync` — no worker needed
- **B. `database` driver**: Keep current, document `php artisan queue:work` requirement

---

## Phase 5: Frontend Config

| File | Content |
|------|---------|
| `Frontend/.env` (create) | `VITE_API_URL=http://localhost:8000/api` |

---

## Phase 6: Health Check Endpoint

| File | Addition |
|------|----------|
| `Backend/routes/api.php` | `Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'laravel']));` |

---

## Execution Order

```
P0: Infrastructure (DB, migrations, queue tables, seeders)
    ↓
P1: PayMongo removal (7 files)
    ↓
P2: Inventory status fix (1 file)
    ↓
P3: Auth fallbacks + middleware (5+ files)
    ↓
P4: Queue config (.env)
    ↓
P5: Frontend .env
    ↓
P6: Health endpoint
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Frontend breaks if it calls PayMongo endpoints | Verified: `api.ts` only calls `/sales` (POST), `/sales` (GET), `/sales/{id}` — no PayMongo routes |
| Auth 401 on existing frontend | Frontend already sends `Authorization: Bearer <token>`; middleware will validate |
| Queue sync hides async bugs | Acceptable for dev; use `database` in staging/prod |

---

## Open Questions (Decisions Needed Before Execution)

1. **Queue driver**: `sync` (no worker) or `database` (needs worker)?
2. **Seeders**: Create new `DatabaseSeeder` with sample data, or use existing?
3. **Auth scope**: Apply `auth:sanctum` to ALL `/api/*` except `/login`, `/health`, or only specific routes?

---

## Related Files

- `docs/implementation-plan/implementationplan-sprint6.md` — PayMongo integration (to be deprecated)
- `docs/implementation-plan/implementationplan-deployment.md` — Deployment checklist