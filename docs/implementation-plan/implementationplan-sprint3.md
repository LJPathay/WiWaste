# Sprint 3 — Loss Visibility Dashboard (XGBoost)

> **Objective:** Rank every product by how likely it is to cause loss (expiry, spoilage, damage, shrinkage)
> and show the expected loss value in the Leakage Detection dashboard.

---

## 1. Goal

By the end of this sprint:

1. A **Python (FastAPI) service** hosts an **XGBoost** model that scores products by loss risk.
2. The Laravel backend sends each product's features to that service and caches the results.
3. The Leakage Detection page shows **real risk-ranked data from the API**.

## 2. Status

- **Complete (100%).** All acceptance criteria below are checked.
- `ml-service/` (Python 3.14 venv) hosts the XGBoost model; `POST /predict/loss` returns the documented shape.
- `Backend/app/Services/Ml/LossPredictionService.php` aggregates features and caches scores for 1 hour;
  `LossPredictionController` exposes `/loss-risk/predict|items|summary`.
- `Frontend/src/pages/dashboard/LeakageDetection.tsx` now renders real API data with loading/empty/error states.

### Deviations from the plan (documented)

- **Python version:** 3.14 (installed machine-wide) instead of 3.12. `ml-service/requirements.txt` pins
  `xgboost>=2.0`, `scikit-learn>=1.4`; `train.py` exports `model/model.json` + `model/metadata.json` (committed).
- **`/loss-risk/predict`:** scores **all** active products (no `product_ids` body needed) and caches the result.
- **Summary field names:** `high_risk`, `medium_risk`, `low_risk` (not `*_count`).
- **`GET /loss-risk/items`** reads from the 1h cache (never calls the service) with `?tier=High|Medium|Low&sort=expected_loss|probability`.
  The **predict** endpoint is the only one that requires the service; `items`/`summary` degrade to empty data when offline.
  (The Sprint 3.9 "items 503" test therefore checks the predict path.)

## 3. Approach (decided)

- **Python service:** XGBoost model runs in the shared **`ml-service/`** (also used by Sprint 2 for ARIMA
  and Sprint 4 for the GA).
- Laravel → `MlServiceClient::predictLoss(...)` (`POST /predict/loss` on `ML_SERVICE_URL`). **No PHP
  fallback scorer** — the service is required for the loss-risk endpoints; if it is unreachable they
  return a clear error.
- Payment/barcode decisions from Sprint 0 do not change.

## 4. Scope

### In scope
- Python FastAPI service with XGBoost (train on synthetic data + expose a predict endpoint).
- PHP `LossPredictionController` with feature aggregation.
- Loss-risk API endpoints.
- Wire the Leakage Detection page to the API.

### Out of scope
- Real production model training data (no real labeled "will spoil" dataset exists — the model is trained
  on synthetic/demo data and evaluated for demo purposes).
- Changing the ARIMA forecast (Sprint 2) or GA optimizer (Sprint 4).

## 5. Backend tasks (Laravel)

### 5.1 Feature aggregation

New: `Backend/app/Http/Controllers/Api/LossPredictionController.php`.

For each active product, aggregate these features from existing tables:

| Feature | Source |
|---------|--------|
| `category` | `Category.Category_name` |
| `days_to_expiry` | `Product.expiration_date` |
| `current_stock` | `Inventory.current_stock` |
| `stock_status` | `Inventory.stock_status` |
| `sales_velocity_7d` | `Sales_Item` (last 7 days qty) |
| `wastage_count_90d` | `WastageRecord` (last 90 days) |
| `turnover_rate` | reuse logic from `InventoryAnalyticsController::turnover` |
| `supplier` | `Supplier.supplier_name` |
| `unit_cost` | `Product.cost_price` |

### 5.2 Call the ML service

1. POST the feature row to `ML_SERVICE_URL + /predict/loss` (config via `ML_SERVICE_URL` env, Sprint 0).
2. On success → use the model output (loss probability, expected loss ₱, feature importance, risk tier).
3. **Cache** results for ~1 hour (`Cache::remember`) — predictions only change with new data. Cache is
   keyed by product set so re-running after new data still works.

### 5.3 Routes (add to `Backend/routes/api.php`)

```php
Route::prefix('/loss-risk')->group(function () {
    Route::get('/summary',  [LossPredictionController::class, 'summary']);
    Route::get('/items',    [LossPredictionController::class, 'items']);
    Route::post('/predict', [LossPredictionController::class, 'predict']);
});
```

## 6. Python service tasks (`ml-service/`)

This is the **shared** service: Sprint 2 adds `arima_model.py`, Sprint 3 adds the XGBoost model, Sprint 4
adds `genetic_algorithm.py`. Create the folder `ml-service/` at the repo root (next to `Backend/` and
`Frontend/`) in Sprint 2 and reuse it here:

```
ml-service/
├── app/
│   ├── main.py          # FastAPI app (routes: /health, /forecast, /predict/loss, /optimize/replenishment)
│   ├── arima_model.py   # Sprint 2 — ARIMA/SARIMAX demand forecast
│   ├── xgboost_model.py # Sprint 3 — XGBoost loss-risk predictor
│   └── genetic_algorithm.py # Sprint 4 — GA replenishment optimizer
├── model/
│   ├── train.py         # trains XGBoost on synthetic data, saves model.json
│   └── model.json       # trained model (committed so the service runs out-of-the-box)
├── requirements.txt     # fastapi, uvicorn, statsmodels, xgboost, scikit-learn, numpy, pandas
└── README.md            # how to run: py -3.12 -m venv .venv; uvicorn app.main:app --port 8001
```

> **Python version:** use **Python 3.12** in a dedicated virtual environment (`.venv/`) for the service.
> This sprint only exercises the XGBoost endpoint; the same environment is used by Sprints 2 and 4.

### `POST /predict/loss`

Request: `{ products: [ { product_id, category, days_to_expiry, current_stock, stock_status,
sales_velocity_7d, wastage_count_90d, turnover_rate, supplier, unit_cost } ] }`

Response: `{ results: [ { product_id, loss_probability, expected_loss, risk_tier, feature_importance } ] }`

- `loss_probability`: 0–1.
- `expected_loss`: PHP amount (probability × unit_cost × current_stock).
- `risk_tier`: `Low` | `Medium` | `High`.
- `feature_importance`: map of feature → weight (for the UI tooltip).

`train.py` generates a synthetic dataset (feature → known loss pattern), trains a small XGBoost
classifier/regressor, and exports it. The model is a demo model; note this in `ml-service/README.md`.

### Health endpoint

`GET /health` → `{ "status": "ok" }` so Laravel can probe the service cheaply.

## 7. Frontend tasks

### 7.1 API client

Add a `lossRisk` block to `Frontend/src/services/api.ts`:

```ts
export const lossRisk = {
  summary: () => request<ApiLossRiskSummary>('/loss-risk/summary'),
  items: () => request<ApiLossRiskItem[]>('/loss-risk/items'),
};
```

### 7.2 Leakage Detection page

File: `Frontend/src/pages/dashboard/LeakageDetection.tsx`

- Replace mock data source with `lossRisk.items()` / `lossRisk.summary()`.
- Keep the existing layout (risk-tier badges, expected-loss values, charts) — only the data source changes.
- Show a small "Model: XGBoost" indicator so users know which engine answered.
- Add loading / empty / error states.

## 8. API contract

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| `GET` | `/loss-risk/summary` | — | `{ total_products, high_risk_count, medium_risk_count, low_risk_count, total_expected_loss, engine: "xgboost" }` |
| `GET` | `/loss-risk/items` | `?tier=High&sort=expected_loss` | `[ { product_id, product_name, sku, category, risk_tier, loss_probability, expected_loss, feature_importance } ]` |
| `POST` | `/loss-risk/predict` | `{ product_ids: [...] }` | `{ results: [...], engine }` |
| `GET` | (ML service) `/health` | — | `{ status: "ok" }` |

## 9. Testing (see Testing & Evaluation for the full list)

1. **Service offline** — with the service unreachable, `/loss-risk/items` returns a clear 503 (no PHP
   fallback, per the agreed architecture).
2. **Service engine** — with a fake/mock service URL, responses are parsed and cached.
3. **Cache** — second call within the TTL does not hit the service again (assert via mock).
4. **Score bounds** — every `loss_probability` ∈ [0,1]; `expected_loss` ≥ 0.
5. **Python unit test** — `pytest` on `/predict/loss` shape and `/health`.

## 10. Definition of Done

**Acceptance criteria:** The leakage dashboard shows risk-ranked products with expected loss value.

- [x] `ml-service/` runs with `uvicorn app.main:app --port 8001` (Python 3.14 venv).
- [x] `POST /predict/loss` returns documented shape for a batch of products.
- [x] Laravel `/loss-risk/*` endpoints return data with the service running.
- [x] Leakage Detection page shows real data + "Model: XGBoost" indicator.
- [x] Backend and Python tests pass.

### Test evidence (2026-08-12)

- `ml-service`: `pytest` → **20 passed** (12 existing + 4 new `test_xgboost.py` + 4 new loss tests in `test_api.py`).
- Backend: `php artisan test` → **22 passed** (16 existing + 6 new `LossRiskTest`).
- Frontend: `npm run build` passes; Leakage Detection wired to `/loss-risk/*`.
- Live smoke: `POST /predict/loss` on `127.0.0.1:8001` scored an overstocked, expiring SKU at 0.73 probability / High tier /
  ₱21,900 expected loss, with `wastage_count_90d` and `expiring_soon` as the top model drivers.
