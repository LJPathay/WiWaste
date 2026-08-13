"""Compute the evaluation metrics recorded in docs/implementation-plan/implementationplan-testing.md section 6.

Run from the ml-service/ directory:
    .venv\\Scripts\\python eval_metrics.py

Everything is deterministic (seeded) so the numbers are reproducible.
"""

import random
import statistics
from typing import Any, Dict

import numpy as np
import pandas as pd

import model.train as trainer
from app.arima_model import forecast as arima_forecast
from app.genetic_algorithm import optimize as ga_optimize
from app.xgboost_model import LossRiskPredictor

STOCK_STATUS_LABEL = {0: "Normal", 1: "Low Stock", 2: "Overstock"}


def forecast_metrics() -> Dict[str, Any]:
    rng = np.random.default_rng(7)
    n, base, trend, noise = 120, 5.0, 0.02, 0.7
    trend_part = np.arange(n) * trend
    season = 3.0 * np.sin(2 * np.pi * np.arange(n) / 7.0) + 3.0 * np.cos(2 * np.pi * np.arange(n) / 7.0)
    values = np.maximum(base + trend_part + season + rng.normal(0, noise, n), 0)
    start = pd.Timestamp("2026-01-01")
    dates = [(start + pd.Timedelta(days=i)).strftime("%Y-%m-%d") for i in range(n)]

    holdout = 14
    train_dates, train_vals = dates[: n - holdout], values[: n - holdout]
    test_vals = values[n - holdout :]

    out = arima_forecast(1, train_dates, train_vals, horizon_days=holdout)
    preds = np.array([p["predicted_demand"] for p in out["series"]])
    conf = np.array([p["confidence"] for p in out["series"]])

    mask = test_vals != 0
    mape = (
        float(np.mean(np.abs((test_vals[mask] - preds[mask]) / test_vals[mask])) * 100)
        if mask.sum()
        else None
    )
    mad = float(np.mean(np.abs(test_vals - preds)))
    return {
        "forecast_model": out["model"],
        "holdout_days": holdout,
        "holdout_mape_pct": round(mape, 2) if mape is not None else None,
        "holdout_mad_units": round(mad, 3),
        "avg_confidence_pct": round(float(conf.mean()), 2),
    }


def loss_precision_at_k() -> Dict[str, Any]:
    random.seed(123)
    np.random.seed(123)
    df = trainer.build_dataset(n=4000)

    products = []
    for idx, row in df.iterrows():
        products.append({
            "product_id": int(idx + 1),
            "category": trainer.CATEGORIES[int(row["category_enc"])],
            "supplier": trainer.SUPPLIERS[int(row["supplier_enc"])],
            "days_to_expiry": float(row["days_to_expiry"]),
            "current_stock": float(row["current_stock"]),
            "stock_status": STOCK_STATUS_LABEL[int(row["stock_status"])],
            "sales_velocity_7d": float(row["sales_velocity_7d"]),
            "wastage_count_90d": float(row["wastage_count_90d"]),
            "turnover_rate": float(row["turnover_rate"]),
            "unit_cost": float(row["unit_cost"]),
        })

    predictor = LossRiskPredictor()
    scored = predictor.score_batch(products)
    ranked = sorted(scored, key=lambda s: s["loss_probability"], reverse=True)

    truly_high = set((df.index + 1)[df["risk_score"].to_numpy() >= 0.6].tolist())

    result = {}
    for k in (10, 20, 50, 100):
        top = ranked[:k]
        hits = sum(1 for s in top if s["product_id"] in truly_high)
        result[f"precision@{k}"] = round(hits / k, 3)
    result["truly_high_rate"] = round(len(truly_high) / len(df), 3)
    result["sample_size"] = len(df)
    result["note"] = "ground truth = synthetic risk_score >= 0.6 (seed 123), model committed at model/model.json"
    return result


def optimizer_metrics() -> Dict[str, Any]:
    products = [
        {"product_id": 1, "product_name": "Tuna", "current_stock": 3, "forecast_demand": 48,
         "unit_cost": 45.0, "selling_price": 55.0, "expiring_fraction": 0.1},
        {"product_id": 2, "product_name": "Soda 1.5L", "current_stock": 8, "forecast_demand": 36,
         "unit_cost": 72.0, "selling_price": 88.0, "expiring_fraction": 0.2},
        {"product_id": 3, "product_name": "Bread", "current_stock": 6, "forecast_demand": 40,
         "unit_cost": 85.0, "selling_price": 95.0, "expiring_fraction": 0.6},
        {"product_id": 4, "product_name": "Covered SKU", "current_stock": 120, "forecast_demand": 60,
         "unit_cost": 10.0, "selling_price": 14.0, "expiring_fraction": 0.05},
    ]

    budgets = [200, 800, 2000, 100000]
    total = compliant = converged = 0
    improvements: list[float] = []
    for budget in budgets:
        for seed in range(10):
            r = ga_optimize(products, budget=budget, seed=seed)
            total += 1
            if r["total_order_value"] <= budget + 1e-6:
                compliant += 1
            if r["fitness"] <= r["gen0_fitness"] + 1e-6:
                converged += 1
            if r["gen0_fitness"] > 0:
                improvements.append((r["gen0_fitness"] - r["fitness"]) / r["gen0_fitness"] * 100)

    return {
        "runs": total,
        "within_budget_pct": round(compliant / total * 100, 1),
        "convergence_pct": round(converged / total * 100, 1),
        "avg_fitness_improvement_pct": round(statistics.mean(improvements), 2),
    }


def main() -> None:
    results = {
        "forecast": forecast_metrics(),
        "loss_risk": loss_precision_at_k(),
        "optimizer": optimizer_metrics(),
    }
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    import json

    main()
