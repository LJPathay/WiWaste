"""ARIMA / SARIMAX demand forecasting for WiWaste.

Laravel aggregates each product's daily sales and POSTs them to ``POST /forecast``
on this service. The module builds a daily series, fits a (S)ARIMA model, projects
a demand horizon with a 95 % confidence interval, and derives an overstock-risk
label. Guard cases (no sales, very short history, model fit failure) fall back to
simple methods and never raise.
"""

from __future__ import annotations

import warnings
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore", category=UserWarning, module="statsmodels")
warnings.filterwarnings("ignore", category=RuntimeWarning, module="statsmodels")

Z = 1.96  # 95 % confidence interval multiplier
DEFAULT_DAYS = 90
MIN_MODEL_POINTS = 14
MIN_SEASONAL_POINTS = 28


def _as_series(periods: List[str], quantities: List[float], days: int = DEFAULT_DAYS) -> pd.Series:
    """Return a daily time series over the last ``days`` days (missing days = 0)."""
    if not periods:
        end = pd.Timestamp.today().normalize()
        return pd.Series(0.0, index=pd.date_range(end=end, periods=days, freq="D"))
    idx = pd.to_datetime(pd.Series(periods))
    values = np.asarray(quantities, dtype=float)
    frame = pd.DataFrame({"value": values}, index=idx)
    daily = frame.groupby(level=0).sum()["value"]
    end = daily.index.max()
    full_idx = pd.date_range(end=end, periods=days, freq="D")
    return daily.reindex(full_idx, fill_value=0.0)


def _mape(actual: np.ndarray, fitted: np.ndarray) -> Optional[float]:
    """Mean absolute percentage error (%, only over non-zero actuals)."""
    a = np.asarray(actual, dtype=float)
    f = np.asarray(fitted, dtype=float)
    mask = a != 0
    if mask.sum() == 0:
        return None
    return float(np.mean(np.abs((a[mask] - f[mask]) / a[mask])) * 100)


def _fit_and_forecast(
    series: pd.Series, horizon: int, n_history: Optional[int] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Optional[float], str]:
    """Fit a model and return ``(predicted, lower, upper, mape, model_label)``."""
    values = series.to_numpy(dtype=float)
    n = len(values)

    if float(values.sum()) <= 0:
        pred = np.zeros(horizon)
        width = 0.5
        return pred, pred, pred + width, None, "FlatSeries(mean)"

    # "Short series" is judged on the raw history span, before daily padding.
    if n_history is not None and n_history < MIN_MODEL_POINTS:
        level = float(values.mean())
        width = float(np.std(values)) if np.std(values) > 0 else max(level, 1.0)
        pred = np.full(horizon, level)
        return pred, np.maximum(pred - Z * width, 0), pred + Z * width, None, "Heuristic(short)"

    # Primary path: SARIMAX / ARIMA
    try:
        seasonal = n >= MIN_SEASONAL_POINTS
        order = (1, 1, 1)
        if seasonal:
            seasonal_order = (1, 0, 0, 7)
            label = f"SARIMAX({order[0]},{order[1]},{order[2]})x({seasonal_order[0]},{seasonal_order[1]},{seasonal_order[2]},{seasonal_order[3]})"
        else:
            seasonal_order = None
            label = f"ARIMA({order[0]},{order[1]},{order[2]})"

        fitted = SARIMAX(
            series,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False,
            initialization="approximate_diffuse",
        ).fit(disp=False)
        forecast = fitted.get_forecast(horizon)
        pred = np.asarray(forecast.predicted_mean, dtype=float)
        ci = np.asarray(forecast.conf_int(alpha=0.05), dtype=float)
        mape = _mape(values, fitted.fittedvalues.to_numpy(dtype=float))
        return pred, np.maximum(ci[:, 0], 0), np.maximum(ci[:, 1], 0), mape, label
    except Exception:
        pass

    # Fallback: exponential smoothing
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        smoother = ExponentialSmoothing(series, trend="add", damped_trend=True).fit()
        pred = np.asarray(smoother.forecast(horizon), dtype=float)
        resid_std = float(np.std(smoother.resid)) or max(float(pred.mean()) if pred.size else 0, 1.0)
        mape = _mape(values, smoother.fittedvalues.to_numpy(dtype=float))
        return (
            np.maximum(pred, 0),
            np.maximum(pred - Z * resid_std, 0),
            pred + Z * resid_std,
            mape,
            "HoltWinters(ets)",
        )
    except Exception:
        level = float(values.mean())
        width = float(np.std(values)) if np.std(values) > 0 else max(level, 1.0)
        pred = np.full(horizon, level)
        return np.maximum(pred, 0), np.maximum(pred - Z * width, 0), pred + Z * width, None, "Mean(fallback)"


def _overstock_risk(pred: np.ndarray, current_stock: float) -> str:
    """High when stock covers >2 weeks of expected demand, Medium >1 week, else Low."""
    if current_stock <= 0:
        return "Low"
    weekly = float(pred.mean()) * 7
    if current_stock >= weekly * 2:
        return "High"
    if current_stock >= weekly:
        return "Medium"
    return "Low"


def _confidence(mean: np.ndarray, lower: np.ndarray, upper: np.ndarray) -> np.ndarray:
    """Derive a 0-100 confidence % from the CI half-width vs the point forecast.

    Falls as the half-width grows relative to the prediction; near-zero
    predictions are scaled against a 1-unit floor so flat series still get a
    meaningful (non-degenerate) value.
    """
    halfwidth = (upper - lower) / 2
    conf = 100 - 100 * halfwidth / (np.abs(mean) + 1.0)
    return np.clip(conf, 0, 100)


def forecast(
    product_id: int,
    periods: List[str],
    quantities: List[float],
    horizon_days: int = 30,
    current_stock: float = 0.0,
    reorder_level: float = 0.0,
) -> Dict[str, Any]:
    """Produce the full forecast payload for a single product."""
    horizon = max(1, min(365, int(horizon_days)))
    periods = list(periods) if periods is not None else []
    quantities = list(quantities) if quantities is not None else []
    n_history = 0
    if periods:
        idx = pd.to_datetime(pd.Series(periods))
        n_history = int((idx.max() - idx.min()).days) + 1
    series = _as_series(periods, quantities)
    pred, lower, upper, mape, label = _fit_and_forecast(series, horizon, n_history=n_history)

    pred = np.maximum(pred, 0)
    lower = np.maximum(lower, 0)
    upper = np.maximum(upper, 0)
    confidence = _confidence(pred, lower, upper)

    start = series.index.max() + pd.Timedelta(days=1)
    out: Dict[str, Any] = {
        "product_id": int(product_id),
        "model": label,
        "horizon_days": horizon,
        "mape": mape,
        "overstock_risk": _overstock_risk(pred, float(current_stock or 0)),
        "series": [
            {
                "period": (start + pd.Timedelta(days=i)).strftime("%Y-%m-%d"),
                "predicted_demand": round(float(pred[i]), 2),
                "lower": round(float(lower[i]), 2),
                "upper": round(float(upper[i]), 2),
                "confidence": round(float(confidence[i]), 2),
            }
            for i in range(horizon)
        ],
    }
    return out
