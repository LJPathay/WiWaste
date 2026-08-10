# Testing & Evaluation

> **Objective:** Prove the system works with automated tests and measurable evaluation metrics before
> deployment. Run this after Sprint 5 and before deployment.

---

## 1. Goal

1. Every core invariant and new feature has an **automated test**.
2. The frontend build and lint pass cleanly.
3. The ML components have **evaluation metrics** (forecast accuracy) and a **demo script** for the
   capstone defense.

## 2. Status

- **Not started.** `Backend/tests/` contains only `ExampleTest` stubs.
- **Frontend:** no test runner configured. We add a minimal Vitest setup only for the API client and the
  mock-fallback behavior.

## 3. Backend tests (PHPUnit)

Location: `Backend/tests/Feature/` and `Backend/tests/Unit/`.
Run with: `php artisan test`.

### 3.1 Auth & users
1. Login succeeds with valid credentials and returns a Sanctum token.
2. Login fails with bad credentials (401).
3. `GET /me` returns the authenticated user.
4. User create / update / quarantine / reactivate work.

### 3.2 Core CRUD
5. Category, supplier, product create/update/delete.
6. Product lookup by SKU **and** by barcode.

### 3.3 Inventory invariants (the most important group — Sprint 1)
7. Sale decreases stock, creates `Sales_Item`, writes `Stock_Movement`.
8. Stock-out cannot make quantity negative (422, stock unchanged).
9. Stock-in increases stock and writes a movement.
10. Wastage decreases stock and writes a movement.
11. `stock_status` recalculates (`Low Stock` / `Overstock`) after changes.

### 3.4 Sprint 2 — Forecast
12. Engine is deterministic on a fixed sales fixture.
13. Product with no sales returns the reorder-level fallback (no crash).
14. `POST /forecast/generate` persists rows to `Forecast_Result`.
15. `GET /forecast/overview` returns well-formed series; `avg_confidence` in [0,100].
16. MAPE on a synthetic trend+season series below the agreed threshold (e.g., < 25%).

### 3.5 Sprint 3 — Loss risk
17. With `ML_SERVICE_URL` empty → fallback engine still scores products (PHP path).
18. With a fake service URL (Laravel `Http::fake`) → results parsed, cached, `engine = "xgboost"`.
19. Cache TTL respected (second call within TTL does not re-hit the service).
20. `loss_probability` ∈ [0,1]; `expected_loss ≥ 0`.

### 3.6 Sprint 4 — Optimization
21. Same inputs + seed → same plan (deterministic).
22. `total_order_value <= budget` always.
23. No negative `order_qty`.
24. Missing `budget` → 422.
25. Approved plan writes into `Inventory_Recommendation` (`recommendation_type = 'Reorder'`).
26. Final fitness ≤ generation-0 fitness on a synthetic fixture (convergence).

### 3.7 Sprint 5 — Regression suite
27. The full set above still passes together (run `php artisan test` end-to-end).

## 4. Frontend tests (Vitest)

Add the minimum setup: `vitest`, `@testing-library/react`, `jsdom`.

```
Frontend/
├── vitest.config.ts
└── src/services/api.test.ts        # request() attaches token, throws on non-OK
└── src/hooks/useDashboardData.test.ts  # falls back to mock data when API fails
```

- `npm test` runs Vitest.
- Keep the suite small: the UI is already covered by the manual demo walkthrough (Sprint 5) and the
  backend integration tests.

## 5. Python service tests (ml-service)

- `ml-service/tests/test_api.py` (pytest):
  - `GET /health` → `{ status: "ok" }`.
  - `POST /predict/loss` returns one result per input product with the documented fields.
  - Batch of 0 products → 422.

## 6. Evaluation metrics

| Component | Metric | Target |
|-----------|--------|--------|
| Forecast (Sprint 2) | MAPE / MAD on hold-out window | MAPE < 25% on demo data |
| Forecast confidence | Avg confidence from the model | documented, shown in UI |
| Loss risk (Sprint 3) | Precision@K of `High`-risk items vs. actual wastage on demo data | report the number honestly |
| Optimizer (Sprint 4) | % of plans within budget; fitness improvement over generations | 100% within budget; monotone decrease |
| Inventory sync | Stock = Σ movements reconciliation on demo data | 0 drift |

## 7. Demo script (capstone defense)

1. Log in as Cashier → scan barcode → checkout with Cash.
2. Show stock decreased + movement in Manage Inventory.
3. Open Predictive Analytics → real forecast chart + "Generate forecasts" button.
4. Open Leakage Detection → risk-ranked table + engine indicator.
5. Open Replenishment → run optimizer with budget → plan within budget.
6. Approve a recommendation as Owner → appears in Recommendations.
7. Show audit logs from the activity.

## 8. Definition of Done

- [ ] `php artisan test` passes (groups 3.1–3.7).
- [ ] `npm test` passes (frontend Vitest).
- [ ] `ml-service` pytest passes.
- [ ] `npm run build` and `npx eslint src` clean.
- [ ] Evaluation metrics recorded in this file (fill the target column with actuals).
- [ ] Demo script runs end-to-end without errors.
