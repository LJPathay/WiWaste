# Sprint 3 — Loss Visibility Dashboard (XGBoost)

> **Objective:** Rank every product by how likely it is to cause loss (expiry, spoilage, damage, shrinkage)
> and show the expected loss value in the Leakage Detection dashboard.

---

## 1. Goal

By the end of this sprint:

1. A **Python (FastAPI) service** hosts an **XGBoost** model that scores products by loss risk.
2. The Laravel backend sends each product's features to that service and caches the results.
3. If the service is offline, the backend **falls back to a pure-PHP risk score** (hybrid — app never breaks).
4. The Leakage Detection page shows **real risk-ranked data from the API**.

## 2. Status

- **Not started.**
- `Frontend/src/pages/dashboard/LeakageDetection.tsx` exists but renders **mock** data.
- No Python service, no loss-risk endpoints, no XGBoost model.

## 3. Approach (decided)

- **Hybrid ML:**
  - XGBoost model → separate **Python FastAPI microservice** (`ml-service/`).
  - Laravel → **PHP fallback scorer** if the service is unreachable.
- Payment/barcode decisions from Sprint 0 do not change.

## 4. Scope

### In scope
- Python FastAPI service with XGBoost (train on synthetic data + expose a predict endpoint).
- PHP `LossPredictionController` with feature aggregation + fallback.
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

### 5.2 Call the ML service + fallback

1. POST the feature row to `ML_SERVICE_URL + /predict/loss` (config via `ML_SERVICE_URL` env, Sprint 0).
2. On success → use the model output (loss probability, expected loss ₱, feature importance, risk tier).
3. On failure / empty env → compute a **weighted PHP risk score**:
   - `score = w1 * stock_factor + w2 * expiry_factor + w3 * wastage_factor + w4 * velocity_factor`
   - map to `Low / Medium / High` and estimate expected loss = score × unit_cost × current_stock.
4. **Cache** results for ~1 hour (`Cache::remember`) — predictions only change with new data.

### 5.3 Routes (add to `Backend/routes/api.php`)

```php
Route::prefix('/loss-risk')->group(function () {
    Route::get('/summary',  [LossPredictionController::class, 'summary']);
    Route::get('/items',    [LossPredictionController::class, 'items']);
    Route::post('/predict', [LossPredictionController::class, 'predict']);
});
```

## 6. Python service tasks (`ml-service/`)

Create the folder `ml-service/` at the repo root (next to `Backend/` and `Frontend/`):

```
ml-service/
├── app/
│   └── main.py          # FastAPI app
├── model/
│   ├── train.py         # trains XGBoost on synthetic data, saves model.json
│   └── model.json       # trained model (committed so the service runs out-of-the-box)
├── requirements.txt     # fastapi, uvicorn, xgboost, numpy, scikit-learn
└── README.md            # how to run: pip install -r requirements.txt; uvicorn app.main:app --port 8001
```

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
- Show a small "Model: XGBoost · Fallback: PHP" indicator so users know which engine answered.
- Add loading / empty / error states.

## 8. API contract

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| `GET` | `/loss-risk/summary` | — | `{ total_products, high_risk_count, medium_risk_count, low_risk_count, total_expected_loss, engine: "xgboost" \| "fallback" }` |
| `GET` | `/loss-risk/items` | `?tier=High&sort=expected_loss` | `[ { product_id, product_name, sku, category, risk_tier, loss_probability, expected_loss, feature_importance } ]` |
| `POST` | `/loss-risk/predict` | `{ product_ids: [...] }` | `{ results: [...], engine }` |
| `GET` | (ML service) `/health` | — | `{ status: "ok" }` |

## 9. Testing (see Testing & Evaluation for the full list)

1. **Fallback engine** — with `ML_SERVICE_URL` empty, `/loss-risk/items` still returns scored products.
2. **Service engine** — with a fake/mock service URL, responses are parsed and cached.
3. **Cache** — second call within the TTL does not hit the service again (assert via mock).
4. **Score bounds** — every `loss_probability` ∈ [0,1]; `expected_loss` ≥ 0.
5. **Python unit test** — `pytest` on `/predict/loss` shape and `/health`.

## 10. Definition of Done

- [ ] `ml-service/` runs with `uvicorn app.main:app --port 8001`.
- [ ] `POST /predict/loss` returns documented shape for a batch of products.
- [ ] Laravel `/loss-risk/*` endpoints return data with and without the service running.
- [ ] Leakage Detection page shows real data + engine indicator.
- [ ] Backend and Python tests pass.
