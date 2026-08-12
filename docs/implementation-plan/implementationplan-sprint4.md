# Sprint 4 — Decision-Support Reports (Genetic Algorithm)

> **Objective:** Recommend an optimal replenishment plan (how much to order of each SKU) that minimizes
> overstock, stockout, and wastage costs, using a Genetic Algorithm.

---

## 1. Goal

By the end of this sprint:

1. A **Genetic Algorithm** (in the shared Python `ml-service/`) optimizes a replenishment plan under a budget.
2. New API endpoints return the recommended plan with a fitness score and per-SKU confidence.
3. Plan outputs feed the **existing** recommendation approve/reject workflow.
4. The Replenishment and Generate Reports pages show **real optimizer results from the API**.

## 2. Status

- **Complete (100%).** All acceptance criteria below are checked.
- `ml-service/app/genetic_algorithm.py` (numpy) runs a seeded GA: tournament selection, uniform crossover,
  mutation, elitism, and a deterministic budget-repair step so `total_order_value <= budget` always holds.
  `POST /optimize/replenishment` returns the documented plan payload.
- `Backend/app/Services/Ml/OptimizationService.php` builds the per-SKU inputs (forecast demand from
  `Forecast_Result`, stock, unit cost, margin, expiring fraction) and calls the Python service;
  `OptimizationController` exposes `POST /optimization/replenishment` and persists `Reorder` plans into
  `Inventory_Recommendation` so the existing approve/reject workflow is reused.
- `Frontend/src/pages/manager/Replenishment.tsx` and `Frontend/src/pages/admin/GenerateReports.tsx` run the
  optimizer from the API (budget + horizon inputs, plan table, fitness/confidence banner, approve action).

### Deviations from the plan (documented)

- **Extra request fields:** the endpoint also accepts `persist` (default `true`; `false` skips writing
  recommendations) and `seed` (deterministic GA runs) in addition to the planned
  `budget / horizon_days / include_product_ids`.
- **Response adds:** `gen0_fitness` (generation-0 fitness for the convergence banner) and
  `recommendations_written` (count of pending `Reorder` rows persisted).
- **Candidate filter:** `OptimizationService` feeds the GA every active SKU whose forecast demand > 0 or
  whose stock status is `Low Stock` (per plan §5.2); when no forecast row exists yet, demand falls back to
  last-7-day sales velocity × horizon.
- **Budget repair instead of penalty-only:** the GA uses a fitness budget penalty *plus* a final
  deterministic repair pass, guaranteeing the returned plan respects the budget regardless of random
  variation (satisfies Testing item 2).

## 3. Approach (decided)

- **Python implementation of the GA** in the shared `ml-service/` (`app/genetic_algorithm.py`, numpy).
- Laravel gathers the item data (forecast demand, stock, costs) and calls `POST /optimize/replenishment`
  on `ML_SERVICE_URL` via `MlServiceClient::optimizeReplenishment(...)`.
- Optimizer output is written into `Inventory_Recommendation` so the existing approve/reject flow is reused.

## 4. Scope

### In scope
- Python Genetic Algorithm optimizer module (`ml-service/app/genetic_algorithm.py`).
- Optimization controller + route + HTTP client.
- Persist approved plans into the recommendations flow.
- Wire the Replenishment + Generate Reports pages to the API.

### Out of scope
- Replacing the Executive Reports / Overview pages (stay on mock).
- Multi-objective or large-scale production planning beyond SKU-level orders.

## 5. Backend tasks

### 5.1 Optimizer service (Python `ml-service`)

Laravel builds the input; Python runs the GA. New: `ml-service/app/genetic_algorithm.py`.

**Chromosome** = an order-quantity vector, one gene per candidate SKU (0 = do not reorder).

**Fitness** (minimize total cost):
```
fitness = overstock_cost + stockout_cost + wastage_cost + holding_cost
overstock_cost = Σ max(0, stock_after_order - forecast_demand) × unit_cost × w_over
stockout_cost  = Σ max(0, forecast_demand - stock_after_order) × margin × w_out
wastage_cost   = Σ max(0, order_qty × expiring_fraction) × unit_cost
holding_cost   = Σ order_qty × unit_cost × w_hold
```

Inputs come from existing tables / services:
- Forecast demand → reuse Sprint 2 forecast results (`Forecast_Result`) — the ARIMA output from the shared service.
- Expiring fraction → `Product.expiration_date` proximity (or `FEFOBatch`).
- Unit cost / margin → `Product.cost_price`, `selling_price`.
- Budget cap → request parameter.

**Operators** (standard; deterministic for testability when given a seed):
- Tournament selection.
- Uniform crossover.
- Mutation with small probability (adjust one SKU's order qty).
- Elitism (keep the best plan each generation).

**Output:**
```
{
  plan: [ { product_id, product_name, current_stock, forecast_demand, order_qty, unit_cost, order_value } ],
  total_order_value,
  budget,
  fitness: number (lower is better),
  generations_run,
  confidence: 0–1 (based on fitness spread across the final population)
}
```

### 5.2 Controller + route

New: `Backend/app/Http/Controllers/Api/OptimizationController.php`.

Add to `Backend/routes/api.php`:

```php
Route::prefix('/optimization')->group(function () {
    Route::post('/replenishment', [OptimizationController::class, 'replenishment']);
});
```

Request body (POST): `{ budget, horizon_days?, include_product_ids? }`.

- If `include_product_ids` is omitted, the optimizer considers all active SKUs with positive forecast demand
  or low stock.
- On success, optionally write high-confidence SKUs into `Inventory_Recommendation`
  (`recommendation_type = 'Reorder'`, `confidence_score` from the GA) so they appear in
  `/recommendations` and can be approved/rejected with the existing flow.
- The endpoint is **not cached** (each call re-runs the GA in the Python service).

## 6. Frontend tasks

### 6.1 API client

Add to `Frontend/src/services/api.ts`:

```ts
export const optimization = {
  replenishment: (params: { budget: number; horizon_days?: number }) =>
    request<ApiOptimizationPlan>('/optimization/replenishment', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
```

### 6.2 Pages to wire (new features → real API)

- `Frontend/src/pages/manager/Replenishment.tsx`
  - Budget input (₱) + "Run optimization" button.
  - Table of recommended order quantities with `forecast_demand`, `current_stock`, `order_qty`, `order_value`.
  - Fitness + confidence banner, total order value vs. budget.
- `Frontend/src/pages/admin/GenerateReports.tsx`
  - Add an "Optimized Replenishment" section that runs the same endpoint and lets the owner **approve**
    the plan (writes recommendations → shows up in the Recommendations page).

> ExecutiveReports.tsx and Overview stay on mock data (per the agreed mock policy).

## 7. API contract

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/optimization/replenishment` | `{ budget: number, horizon_days?: number, include_product_ids?: number[] }` | `{ plan: [...], total_order_value, budget, fitness, generations_run, confidence, generated_at }` |

## 8. Testing (see Testing & Evaluation for the full list)

1. **Deterministic** — same inputs + seed → same plan (Python pytest).
2. **Budget respected** — `total_order_value <= budget` for all returned plans.
3. **Non-negative** — no `order_qty < 0`; no SKU ordered without positive demand or low stock.
4. **No budget** — request without `budget` → 422 validation error.
5. **Writes recommendations** — after approve action, `/recommendations` contains the SKU with
   `recommendation_type = 'Reorder'`.
6. **Convergence** — fitness of the final plan ≤ fitness of generation 0 on a synthetic fixture (Python).
7. **Service offline** — `POST /optimization/replenishment` returns a clear 503 (no PHP fallback).

## 9. Definition of Done

**Acceptance criteria:** The optimizer returns a replenishment plan that respects the budget constraint.

- [x] `ml-service` `POST /optimize/replenishment` returns a budget-respecting, non-negative plan.
- [x] `POST /optimization/replenishment` returns the documented payload.
- [x] Approved optimizer output appears in the existing Recommendations flow.
- [x] Replenishment page runs the optimizer and shows the plan.
- [x] Generate Reports page can produce + approve an optimized plan.
- [x] Backend feature tests + Python pytest pass.

### Test evidence (2026-08-12)

- `ml-service`: `pytest` → **31 passed** (12 ARIMA + 4 XGBoost + 9 GA + 6 API; 4 new `test_ga.py` +
  2 new optimization tests in `test_api.py`).
- Backend: `php artisan test` → **28 passed** (22 existing + 6 new `OptimizationTest`).
- Frontend: `npm run build` passes and `npx tsc --noEmit` is clean (exit 0); Replenishment +
  Generate Reports wired to `/optimization/replenishment`. ESLint still reports pre-existing
  `no-explicit-any` / unused-var errors across the app (incl. 13 in the Sprint 4 files) — part of the
  documented backlog owned by the Testing sprint (see `implementationplan-testing.md` §2.1).
- Live smoke: `POST /optimize/replenishment` on `127.0.0.1:8001` (budget ₱5,000, seed 7) ordered 45× Tuna
  (₱2,025) and skipped the expiring Bread (expiring_fraction 0.6), `total_order_value` ₱2,025 ≤ budget,
  `fitness` 583 vs `gen0_fitness` 638.2 (converged).
