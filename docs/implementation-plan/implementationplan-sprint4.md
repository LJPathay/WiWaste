# Sprint 4 — Decision-Support Reports (Genetic Algorithm)

> **Objective:** Recommend an optimal replenishment plan (how much to order of each SKU) that minimizes
> overstock, stockout, and wastage costs, using a Genetic Algorithm.

---

## 1. Goal

By the end of this sprint:

1. A **pure-PHP Genetic Algorithm** optimizes a replenishment plan under a budget.
2. New API endpoints return the recommended plan with a fitness score and per-SKU confidence.
3. Plan outputs feed the **existing** recommendation approve/reject workflow.
4. The Replenishment and Generate Reports pages show **real optimizer results from the API**.

## 2. Status

- **Not started.**
- Report pages exist (`Frontend/src/pages/manager/Replenishment.tsx`, `Frontend/src/pages/admin/GenerateReports.tsx`)
  but are not connected to any optimizer.
- The recommendation workflow (`RecommendationController` approve/reject) already exists and is ready to
  receive optimizer output.

## 3. Approach (decided)

- **Pure PHP implementation** of the GA. No Python service for this sprint.
- Optimizer output is written into `Inventory_Recommendation` so the existing approve/reject flow is reused.

## 4. Scope

### In scope
- PHP Genetic Algorithm optimizer service.
- Optimization controller + route.
- Persist approved plans into the recommendations flow.
- Wire the Replenishment + Generate Reports pages to the API.

### Out of scope
- Replacing the Executive Reports / Overview pages (stay on mock).
- Multi-objective or large-scale production planning beyond SKU-level orders.

## 5. Backend tasks

### 5.1 Optimizer service

New: `Backend/app/Services/Optimization/GeneticOptimizer.php`.

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
- Forecast demand → reuse Sprint 2 `ForecastEngine` output.
- Expiring fraction → `Product.expiration_date` proximity (or `FEFOBatch`).
- Unit cost / margin → `Product.cost_price`, `selling_price`.
- Budget cap → request parameter.

**Operators** (standard, deterministic for testability when given a seed):
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
- The endpoint is **not cached** (each call re-runs the GA).

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

1. **Deterministic** — same inputs + seed → same plan.
2. **Budget respected** — `total_order_value <= budget` for all returned plans.
3. **Non-negative** — no `order_qty < 0`; no SKU ordered without positive demand or low stock.
4. **No budget** — request without `budget` → 422 validation error.
5. **Writes recommendations** — after approve action, `/recommendations` contains the SKU with
   `recommendation_type = 'Reorder'`.
6. **Convergence** — fitness of the final plan ≤ fitness of generation 0 on a synthetic fixture.

## 9. Definition of Done

**Acceptance criteria:** The optimizer returns a replenishment plan that respects the budget constraint.

- [ ] `GeneticOptimizer` returns a budget-respecting, non-negative plan.
- [ ] `POST /optimization/replenishment` returns the documented payload.
- [ ] Approved optimizer output appears in the existing Recommendations flow.
- [ ] Replenishment page runs the optimizer and shows the plan.
- [ ] Generate Reports page can produce + approve an optimized plan.
- [ ] Backend feature tests pass.
