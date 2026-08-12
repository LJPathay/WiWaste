# Sprint 2 — Predictive Analytics (ARIMA)

> **Objective:** Predict future demand per product using a time-series forecast engine and show the
> forecasts in the Predictive Analytics dashboard.

---

## 1. Goal

By the end of this sprint:

1. The backend can **forecast demand** (units per day/week) for any active product using its sales history.
2. Forecasts are **stored** in the existing `Forecast_Result` table and refreshed on a schedule.
3. New API endpoints expose forecasts with **confidence** and an **overstock risk** label.
4. The Predictive Analytics page shows **real forecast data from the API** (this is a new feature → real API,
   not mock).

## 2. Status

- **Not started.**
- The `Forecast_Result` table and `ForecastResult` model already exist but are **unused**.
- `Frontend/src/pages/dashboard/PredictiveAnalytics.tsx` currently renders **mock** forecast data.

## 3. Approach (decided)

- **Python implementation.** ARIMA/SARIMAX runs in the shared `ml-service/` (`app/arima_model.py`, using
  `statsmodels`) — a real ARIMA model, not a PHP approximation.
- Laravel is the orchestrator: it aggregates each product's sales history from MySQL, POSTs it to the
  service (`POST /forecast` on `ML_SERVICE_URL`), receives the forecast JSON, and persists it.

## 4. Scope

### In scope
- Python ARIMA/SARIMAX forecast module in `ml-service/app/arima_model.py`.
- `MlServiceClient` (Laravel HTTP client) + forecast controller + routes.
- Artisan command + scheduler to regenerate forecasts daily.
- Backend feature tests + Python pytest for the ARIMA endpoint.
- Wire the Predictive Analytics page to the API.

### Out of scope
- Retraining against the XGBoost loss model (that is Sprint 3).
- Changing any of the mock overview charts (those stay as they are).

## 5. Backend tasks

### 5.1 Forecast engine (Python `ml-service`)

Laravel builds the input; Python fits the model. New: `ml-service/app/arima_model.py`.

Input (per product, from existing tables — built by Laravel):
- Daily `Sales_Item.quantity` aggregated by `Sales_Transaction.transaction_date` (Completed only).
- Current `Inventory.current_stock` and `Product.reorder_level`.

Processing (inside Python):
1. Build a daily series for the last N days (e.g., 90).
2. Fit a **SARIMAX/ARIMA** model (auto-select order on the series length; seasonal order if ≥ 2 full
   weeks of data).
3. Project `horizon_days` (default 30) ahead.
4. Compute a **confidence interval** per day from the model (e.g., ±1.96 × std of the forecast).
5. Derive `overstock_risk` (`Low` / `Medium` / `High`) from (predicted demand vs. current stock) and
   forecast uncertainty.
6. Guard cases: products with no sales (flat series → simple exponential smoothing / mean), very short
   series (< 8 points → reorder-level heuristic). The endpoint **never errors**.

Output (JSON): `{ product_id, model: "SARIMAX(1,1,1)x(0,1,0,7)", series: [{ period, predicted_demand,
lower, upper }], mape, overstock_risk }`.

### 5.2 Persistence + scheduling

- `Backend/app/Http/Controllers/Api/ForecastController.php` aggregates the sales series, calls
  `MlServiceClient::forecast(...)` (`POST /forecast` on `ML_SERVICE_URL`), then writes results to
  `Forecast_Result` (`forecast_id`, `product_id`, `forecast_period`, `predicted_demand`, `overstock_risk`,
  `generated_date`).
- New Artisan command **`forecast:generate`** (`Backend/app/Console/Commands/GenerateForecasts.php`) that
  loops all active products, calls the service, and stores forecasts.
- Register a **daily schedule** in `Backend/routes/console.php` (e.g., `Schedule::command('forecast:generate')->dailyAt('02:00');`).

### 5.3 Routes (add to `Backend/routes/api.php`)

```php
Route::prefix('/forecast')->group(function () {
    Route::get('/overview',        [ForecastController::class, 'overview']);
    Route::get('/{product_id}',    [ForecastController::class, 'show']);
    Route::post('/generate',       [ForecastController::class, 'generate']);
});
```

### 5.4 Caching

- `overview` aggregates can be cached (e.g., `Cache::remember(..., 3600)`) since they only change when
  forecasts regenerate. `generate` must bypass the cache.

## 6. Frontend tasks

### 6.1 API client

Add a `forecast` block to `Frontend/src/services/api.ts`:

```ts
export const forecast = {
  overview: () => request<ApiForecastOverview>('/forecast/overview'),
  byProduct: (productId: number) => request<ApiForecastProduct>(`/forecast/${productId}`),
  generate: () => request('/forecast/generate', { method: 'POST' }),
};
```

Define `ApiForecastOverview` and `ApiForecastProduct` types to match the controller responses
(Sprint 0 contract — keep both sides in sync).

### 6.2 Predictive Analytics page

File: `Frontend/src/pages/dashboard/PredictiveAnalytics.tsx`

- Replace the **mock** forecast chart source with the real `forecast.overview()` data.
- Keep the existing chart layout (Recharts `ComposedChart` with forecast area + confidence) — only the
  **data source** changes.
- Add a "Generate forecasts" button (calls `forecast.generate()`) for demos when the scheduler hasn't run yet.
- Show a small "Model: ARIMA" indicator so users know the forecast comes from the Python service.
- Handle loading, empty, and error states gracefully.

> Only this page changes. Other dashboard/overview charts keep using mock data.

## 7. API contract

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| `GET` | `/forecast/overview` | `?horizon_days=30` | `{ generated_at, total_products, avg_confidence, model: "ARIMA/SARIMAX", top_risks: [...], series: [{ period, predicted_demand, lower, upper, confidence }] }` |
| `GET` | `/forecast/{product_id}` | — | `{ product_id, product_name, sku, current_stock, reorder_level, overstock_risk, model, horizon_days, series: [...] }` |
| `POST` | `/forecast/generate` | — | `{ generated: count, timestamp }` |

## 8. Testing (see Testing & Evaluation for the full list)

1. **Python endpoint** — `POST /forecast` (ml-service) is deterministic on a fixed sales fixture; values
   are stable and bounded.
2. **No-sales product** — Python returns a flat-series forecast (no crash); Laravel surfaces the result
   instead of erroring.
3. **generate endpoint** — persists rows into `Forecast_Result`.
4. **overview endpoint** — returns well-formed series and `avg_confidence` between 0 and 100.
5. **MAPE sanity** — on a synthetic trend+season series, training error is below an agreed threshold.
6. **Service offline** — `/forecast/*` returns a clear 503 (no PHP fallback).

## 9. Definition of Done

**Acceptance criteria:** The forecast endpoint returns 30 days of predicted demand per product with
confidence.

- [ ] `ml-service` `POST /forecast` returns the documented payload for a real product's sales history.
- [ ] `forecast:generate` runs and fills `Forecast_Result`.
- [ ] Scheduler entry exists in `routes/console.php`.
- [ ] `GET /forecast/overview` and `GET /forecast/{product_id}` return documented payloads.
- [ ] Predictive Analytics page shows API data (with loading/empty/error states).
- [ ] "Generate forecasts" button works for live demoing.
- [ ] Backend feature tests + Python pytest pass.
