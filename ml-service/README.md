# WiWaste ML Service

Python (FastAPI) service used by the Laravel backend for the analytics endpoints:

- `POST /forecast` — ARIMA/SARIMAX demand forecast (Sprint 2)
- `POST /predict/loss` — XGBoost loss-risk scoring (Sprint 3, planned)
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
