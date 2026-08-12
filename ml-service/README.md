# WiWaste ML Service

Python (FastAPI) service used by the Laravel backend for the analytics endpoints:

- `POST /forecast` — ARIMA/SARIMAX demand forecast (Sprint 2)
- `POST /predict/loss` — XGBoost loss-risk scoring (Sprint 3)
- `POST /optimize/replenishment` — Genetic-algorithm replenishment plan (Sprint 4)

## Setup

```bash
cd ml-service
py -3.12 -m venv .venv        # or your local python
.venv\Scripts\activate        # Windows; POSIX: source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Health check: `GET http://127.0.0.1:8001/health` → `{"status": "ok"}`.

## Tests

```bash
pytest
```

## Contract (POST /forecast)

Request:

```json
{
  "product_id": 1,
  "horizon_days": 30,
  "sales": [{"period": "2026-08-01", "quantity": 5}],
  "current_stock": 50,
  "reorder_level": 10
}
```

Response:

```json
{
  "product_id": 1,
  "model": "SARIMAX(1,1,1)x(1,0,0,7)",
  "horizon_days": 30,
  "mape": 12.4,
  "overstock_risk": "Low",
  "series": [
    {
      "period": "2026-08-02",
      "predicted_demand": 5.2,
      "lower": 3.1,
      "upper": 7.4,
      "confidence": 78.5
    }
  ]
}
```

The endpoint never errors: no-sales products return a flat series, short histories use a
heuristic, and model failures fall back to exponential smoothing or the mean.

## Contract (POST /predict/loss)

Request:

```json
{
  "products": [
    {
      "product_id": 1,
      "category": "Medicine & Health",
      "days_to_expiry": 45,
      "current_stock": 120,
      "stock_status": "Overstock",
      "sales_velocity_7d": 2.0,
      "wastage_count_90d": 4,
      "turnover_rate": 1.5,
      "supplier": "PharmaCorp",
      "unit_cost": 250.0
    }
  ]
}
```

Response:

```json
{
  "engine": "xgboost",
  "results": [
    {
      "product_id": 1,
      "loss_probability": 0.62,
      "expected_loss": 18600.0,
      "risk_tier": "High",
      "feature_importance": { "days_to_expiry": 0.31, "...": 0.0 }
    }
  ]
}
```

- `loss_probability`: 0–1. `expected_loss = probability × unit_cost × current_stock` (PHP).
- `risk_tier`: `Low` | `Medium` | `High`.
- Empty `products` → 422.

### Model caveat (demo)

There is no real labeled "will spoil" dataset, so `model/train.py` trains a small XGBoost
regressor on **synthetic** rows with a known loss pattern (high wastage, expiring soon,
overstocked, slow-moving → higher risk). The dataset is committed as `model/training_data.csv`
(6000 rows, generated with seed 42) so training is reproducible; `train.py` loads it and only
regenerates it if the file is missing. Re-train any time:

```bash
python model/train.py            # load model/training_data.csv and retrain
python model/train.py --rebuild  # regenerate the CSV fixture from scratch, then retrain
```

The trained model, metadata, and dataset are committed so the service runs out-of-the-box.

## Contract (POST /optimize/replenishment)

Request:

```json
{
  "budget": 5000,
  "products": [
    {
      "product_id": 1,
      "product_name": "Tuna",
      "current_stock": 3,
      "forecast_demand": 48,
      "unit_cost": 45.0,
      "selling_price": 55.0,
      "expiring_fraction": 0.1
    }
  ],
  "seed": 42,
  "generations": 200,
  "population_size": 80
}
```

Response:

```json
{
  "plan": [
    {
      "product_id": 1,
      "product_name": "Tuna",
      "current_stock": 3.0,
      "forecast_demand": 48.0,
      "order_qty": 45,
      "unit_cost": 45.0,
      "order_value": 2025.0
    }
  ],
  "total_order_value": 2025.0,
  "budget": 5000.0,
  "fitness": 583.0,
  "generations_run": 200,
  "gen0_fitness": 638.2,
  "confidence": 0.87
}
```

- `fitness` (lower is better) = overstock + stockout + wastage + holding cost, plus a budget penalty.
- `total_order_value` is always `<= budget` (deterministic budget-repair step).
- `order_qty` is never negative; SKUs whose stock already covers demand get `order_qty = 0`.
- Deterministic for a given `seed` (uses `numpy.random.default_rng`).
- Empty `products` returns an empty plan (no error).
