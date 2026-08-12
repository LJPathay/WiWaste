# WiWaste ML Service

Python (FastAPI) service used by the Laravel backend for the analytics endpoints:

- `POST /forecast` — ARIMA/SARIMAX demand forecast (Sprint 2)
- `POST /predict/loss` — XGBoost loss-risk scoring (Sprint 3)
- `POST /optimize/replenishment` — Genetic-algorithm replenishment (Sprint 4, planned)

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
overstocked, slow-moving → higher risk). Re-train any time:

```bash
python model/train.py   # regenerates model/model.json + model/metadata.json
```

The trained model and label maps are committed so the service runs out-of-the-box.
