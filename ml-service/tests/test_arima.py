"""Unit tests for the ARIMA/SARIMAX forecast module."""

import numpy as np
import pandas as pd
import pytest

from app.arima_model import forecast


def _sales_fixture(days=120, base=5.0, trend=0.02, noise=0.7, seed=42):
    rng = np.random.default_rng(seed)
    period = pd.Timestamp("2026-01-01")
    dates = [(period + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    trend_part = np.arange(days) * trend
    season = 3.0 * np.sin(2 * np.pi * np.arange(days) / 7.0) + 3.0 * np.cos(2 * np.pi * np.arange(days) / 7.0)
    values = np.maximum(base + trend_part + season + rng.normal(0, noise, days), 0)
    return dates, values


def test_deterministic_on_fixed_fixture():
    dates, values = _sales_fixture()
    a = forecast(1, dates, values, horizon_days=30)
    b = forecast(1, dates, values, horizon_days=30)
    assert a["series"] == b["series"]
    assert a["overstock_risk"] == b["overstock_risk"]


def test_horizon_length_and_fields():
    dates, values = _sales_fixture()
    out = forecast(7, dates, values, horizon_days=30)
    assert out["product_id"] == 7
    assert len(out["series"]) == 30
    for point in out["series"]:
        assert {"period", "predicted_demand", "lower", "upper", "confidence"} <= set(point)
        assert 0 <= point["confidence"] <= 100
        assert point["lower"] <= point["upper"]
    assert out["mape"] is not None
    assert out["overstock_risk"] in {"Low", "Medium", "High"}


def test_no_sales_returns_flat_series():
    out = forecast(2, [], [], horizon_days=30)
    assert len(out["series"]) == 30
    assert all(p["predicted_demand"] == 0 for p in out["series"])
    assert out["model"].startswith("FlatSeries")


def test_very_short_series_never_errors():
    dates, values = _sales_fixture(days=5)
    out = forecast(3, dates, values, horizon_days=10)
    assert len(out["series"]) == 10
    assert out["model"] == "Heuristic(short)"


def test_mape_sanity_below_threshold():
    dates, values = _sales_fixture(days=120)
    out = forecast(4, dates, values, horizon_days=30)
    assert out["mape"] is not None
    assert out["mape"] < 25.0


def test_overstock_risk_uses_current_stock():
    dates, values = _sales_fixture(days=120)
    low_stock = forecast(5, dates, values, horizon_days=30, current_stock=2)
    high_stock = forecast(5, dates, values, horizon_days=30, current_stock=5000)
    assert low_stock["overstock_risk"] == "Low"
    assert high_stock["overstock_risk"] == "High"


def test_forecast_values_are_bounded():
    dates, values = _sales_fixture()
    out = forecast(6, dates, values, horizon_days=30)
    preds = np.array([p["predicted_demand"] for p in out["series"]])
    assert np.all(preds >= 0)
    assert np.all(np.isfinite(preds))
