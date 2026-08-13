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

- **Complete.** `Backend/tests/Feature/` covers Sprints 1–6 (inventory sync, forecast, loss risk,
  optimization, PayMongo) — `php artisan test` → **37 tests**. `ml-service` pytest → **31 tests**.
  Frontend Vitest (see §4) → **7 tests**. Evaluation metrics recorded in §6.
- **Frontend:** Vitest is configured for the API client and the mock-data fallback behavior (§4);
  `npx eslint src` → **0 problems**, `npx tsc --noEmit` → clean, `npm run build` passes.

## 2.1 Known issues / backlog

- **Frontend lint & typecheck (resolved).** The pre-existing `no-explicit-any`/unused-var backlog
  (~157 ESLint problems, plus type errors) was fixed during the Testing/Integration phase. `npx eslint src`
  reports **0 problems**, `npx tsc --noEmit` passes, and `npm run build` succeeds.

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
12. Sale cannot exceed available stock (422, nothing written) — added alongside Sprint 1 hardening.

### 3.4 Sprint 2 — Forecast
13. [x] `POST /forecast` (ml-service) is deterministic on a fixed sales fixture.
14. [x] Product with no sales returns a flat-series forecast from the service (no crash).
15. [x] `POST /forecast/generate` persists rows to `Forecast_Result`.
16. [x] `GET /forecast/overview` returns well-formed series; `avg_confidence` in [0,100].
17. [x] MAPE on a synthetic trend+season series below the agreed threshold (e.g., < 25%).
18. [x] Service offline → `/forecast/*` returns a clear 503 (no PHP fallback).

### 3.5 Sprint 3 — Loss risk
19. [x] With a fake service URL (Laravel `Http::fake`) → results parsed, cached, `engine = "xgboost"`.
20. [x] Cache TTL respected (second call within TTL does not re-hit the service).
21. [x] `loss_probability` ∈ [0,1]; `expected_loss ≥ 0`.
22. [x] Service offline → `POST /loss-risk/predict` returns a clear 503 (no PHP fallback; `items`/`summary`
    read the cache and degrade to empty when offline).
23. [x] Feature vector sent to the service is correct (category, supplier, days_to_expiry, stock, velocity, wastage, turnover, unit cost).
24. [x] `GET /loss-risk/items?tier=High` filters; default sort is expected-loss desc; empty before any predict.

### 3.6 Sprint 4 — Optimization
23. [x] `POST /optimize/replenishment` (ml-service) deterministic with a fixed seed.
24. [x] `total_order_value <= budget` always.
25. [x] No negative `order_qty`.
26. [x] Missing `budget` → 422.
27. [x] Approved plan writes into `Inventory_Recommendation` (`recommendation_type = 'Reorder'`).
28. [x] Final fitness ≤ generation-0 fitness on a synthetic fixture (convergence).
29. [x] Service offline → `POST /optimization/replenishment` returns a clear 503 (no PHP fallback).

### 3.7 Sprint 5 — Regression suite
30. [x] The full set above still passes together (run `php artisan test` end-to-end). — **37 tests pass.**

## 4. Frontend tests (Vitest)

Setup added: `vitest`, `@testing-library/react`, `jsdom` (+ `@testing-library/jest-dom`). Run with
`npm test` (→ `vitest run`).

```
Frontend/
├── vitest.config.ts                  # jsdom env, @ alias, react plugin
├── vitest.setup.ts                   # jest-dom matchers + in-memory localStorage mock
└── src/services/api.test.ts          # request() attaches token, throws on non-OK
└── src/hooks/useDashboardData.test.ts  # falls back to mock data when API fails
```

- `npm test` runs Vitest. **7 tests pass.**
- Note: Node ≥ 22 ships an experimental `localStorage` global that shadows jsdom's; `vitest.setup.ts`
  installs an in-memory `Storage` mock so the API client tests are environment-independent.
- Keep the suite small: the UI is already covered by the manual demo walkthrough (Sprint 5) and the
  backend integration tests.

## 5. Python service tests (ml-service)

Run inside the Python 3.12 venv with `pytest` from `ml-service/`.

- `ml-service/tests/test_api.py`:
  - [x] `GET /health` → `{ status: "ok" }`.
  - [x] `POST /forecast` — returns one entry per horizon day with the documented fields; flat/short sales
    series return a forecast, never an error; deterministic on a fixed fixture.
  - [x] `POST /predict/loss` — returns one result per input product with the documented fields; batch of 0
    products → 422; deterministic on a fixed fixture.
  - [x] `POST /optimize/replenishment` — same inputs + seed → same plan; `total_order_value <= budget`;
    no negative order quantities; missing budget → 422.
- `ml-service/tests/test_arima.py` — direct unit tests of the ARIMA module (determinism, short/no-sales
  guards, MAPE threshold, overstock risk).
- `ml-service/tests/test_xgboost.py` (Sprint 3) — batch shape, empty batch, expected-loss formula,
  at-risk product outranks fresh one, unknown category/supplier do not crash.
- `ml-service/tests/test_ga.py` (Sprint 4) — determinism, budget respected across budgets × seeds,
  no negative orders, convergence (final ≤ gen-0), empty/tiny-budget guards. **31 tests pass total.**

## 6. Evaluation metrics

Computed by `ml-service/eval_metrics.py` (deterministic, seeded — run with
`.venv\Scripts\python eval_metrics.py` from `ml-service/`).

| Component | Metric | Target | Actual |
|-----------|--------|--------|--------|
| Forecast (Sprint 2) | MAPE / MAD on hold-out window | MAPE < 25% on demo data | **MAPE 16.31%** / MAD 0.94 units on a 14-day hold-out (SARIMAX(1,1,1)x(1,0,0,7), synthetic trend+seasonal demo series) |
| Forecast confidence | Avg confidence from the model | documented, shown in UI | **72.18%** average over the horizon |
| Loss risk (Sprint 3) | Precision@K of `High`-risk items vs. actual wastage on demo data | report the number honestly | **precision@10/20/50/100 = 1.00** on a synthetic held-out set (n=4000, seed 123; ground truth = risk_score ≥ 0.6; truly-high rate 11%). Caveat: labels are synthetic from the same generator the demo model trains on, so this is an upper bound — treat as a consistency check, not real-world accuracy. |
| Optimizer (Sprint 4) | % of plans within budget; fitness improvement over generations | 100% within budget; monotone decrease | **100%** within budget over 40 runs (4 budgets × 10 seeds); **100%** convergence (final ≤ gen-0); avg fitness improvement **54.26%** |
| Inventory sync | Stock = Σ movements reconciliation on demo data | 0 drift | **0 drift** — every stock change writes a `Stock_Movement` and `Backend/tests/Feature/InventorySyncTest.php` asserts exact post-operation stock (sale 50→47, wastage 50→46, stock-in 50→70) and that rejected ops leave stock unchanged (422). |

## 7. Demo script (capstone defense)

1. Log in as Cashier → scan barcode → checkout with Cash.
2. Show stock decreased + movement in Manage Inventory.
3. Open Predictive Analytics → real forecast chart + "Generate forecasts" button.
4. Open Leakage Detection → risk-ranked table + engine indicator.
5. Open Replenishment → run optimizer with budget → plan within budget.
6. Approve a recommendation as Owner → appears in Recommendations.
7. Show audit logs from the activity.

## 8. Definition of Done

- [x] `php artisan test` passes (groups 3.1–3.7). — **37 tests pass.**
- [x] `npm test` passes (frontend Vitest). — **7 tests pass** (`api.test.ts` request() token/error behavior, `useDashboardData.test.ts` offline fallback).
- [x] `ml-service` pytest passes. — **31 tests pass.**
- [x] `npm run build` and `npx eslint src` clean. — **build passes; eslint 0 problems.**
- [x] Evaluation metrics recorded in this file (fill the target column with actuals). — see §6.
- [ ] Demo script runs end-to-end without errors. — validated by code audit + automated tests (Sprint 5); the physical USB-scanner walkthrough remains a manual demo-day activity.
