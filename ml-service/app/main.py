"""WiWaste ML service — FastAPI entrypoint.

Routes:
- GET  /health            -> {"status": "ok"}
- POST /forecast          -> ARIMA/SARIMAX demand forecast (Sprint 2)
- POST /predict/loss      -> XGBoost loss-risk scores (Sprint 3)
- POST /optimize/replenishment -> GA replenishment plan (Sprint 4)
"""

from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .arima_model import forecast as run_forecast

app = FastAPI(title="WiWaste ML Service", version="1.0.0")


class SalesPoint(BaseModel):
    period: str
    quantity: float


class ForecastRequest(BaseModel):
    product_id: int
    horizon_days: int = Field(default=30, ge=1, le=365)
    sales: List[SalesPoint] = Field(default_factory=list)
    current_stock: float = 0.0
    reorder_level: float = 0.0


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/forecast")
def forecast(req: ForecastRequest) -> dict:
    return run_forecast(
        product_id=req.product_id,
        periods=[p.period for p in req.sales],
        quantities=[p.quantity for p in req.sales],
        horizon_days=req.horizon_days,
        current_stock=req.current_stock,
        reorder_level=req.reorder_level,
    )
