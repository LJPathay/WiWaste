"""WiWaste ML service — FastAPI entrypoint.

Routes:
- GET  /health            -> {"status": "ok"}
- POST /forecast          -> ARIMA/SARIMAX demand forecast (Sprint 2)
- POST /predict/loss      -> XGBoost loss-risk scores (Sprint 3)
- POST /optimize/replenishment -> GA replenishment plan (Sprint 4)
"""

from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .arima_model import forecast as run_forecast
from .xgboost_model import LossRiskPredictor

app = FastAPI(title="WiWaste ML Service", version="1.0.0")

_predictor: LossRiskPredictor | None = None


def get_predictor() -> LossRiskPredictor:
    global _predictor
    if _predictor is None:
        _predictor = LossRiskPredictor()
    return _predictor


class SalesPoint(BaseModel):
    period: str
    quantity: float


class ForecastRequest(BaseModel):
    product_id: int
    horizon_days: int = Field(default=30, ge=1, le=365)
    sales: List[SalesPoint] = Field(default_factory=list)
    current_stock: float = 0.0
    reorder_level: float = 0.0


class LossProduct(BaseModel):
    product_id: int
    category: str = ""
    days_to_expiry: float = 365
    current_stock: float = 0
    stock_status: str = "Normal"
    sales_velocity_7d: float = 0
    wastage_count_90d: float = 0
    turnover_rate: float = 0
    supplier: str = ""
    unit_cost: float = 0


class LossRequest(BaseModel):
    products: List[LossProduct] = Field(default_factory=list)


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


@app.post("/predict/loss")
def predict_loss(req: LossRequest) -> dict:
    if not req.products:
        raise HTTPException(status_code=422, detail="products must not be empty")
    results = get_predictor().score_batch([p.model_dump() for p in req.products])
    return {"engine": "xgboost", "results": results}
