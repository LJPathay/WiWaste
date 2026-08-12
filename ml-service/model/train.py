"""Train a small demo XGBoost model on synthetic loss-risk data.

The model scores how likely a product is to cause loss (expiry / spoilage /
damage / shrinkage). There is no real labeled dataset, so training data is
synthetic with a known loss pattern — see the README for caveats.

Run from the `ml-service/` directory:  python model/train.py
"""

import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

random.seed(42)
np.random.seed(42)

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(exist_ok=True)

CATEGORIES = [
    "Medicine & Health", "Minimart Essentials", "Beverages", "Canned Goods",
    "Snacks", "Personal Care", "Household", "Dairy",
]
SUPPLIERS = [
    "PharmaCorp", "FreshMart", "BeverageCo", "CanGoods Inc",
    "SnackTime", "CarePlus", "HomeGoods", "DairyFresh",
]

CATEGORY_MAP = {name: i for i, name in enumerate(CATEGORIES)}
SUPPLIER_MAP = {name: i for i, name in enumerate(SUPPLIERS)}

FEATURES = [
    "category_enc", "supplier_enc", "days_to_expiry", "current_stock",
    "stock_status", "sales_velocity_7d", "wastage_count_90d",
    "turnover_rate", "unit_cost", "stock_cover_days", "expiring_soon",
]


def build_dataset(n: int = 6000) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        category = random.choice(CATEGORIES)
        supplier = random.choice(SUPPLIERS)
        days_to_expiry = random.randint(1, 400)
        current_stock = random.randint(0, 600)
        velocity = random.choice([0, random.uniform(0, 25)])
        wastage = random.randint(0, 15)
        turnover = random.uniform(0, 6)
        unit_cost = random.uniform(20, 600)
        stock_status = 2 if current_stock > 250 else (1 if current_stock < 25 else 0)
        stock_cover = current_stock / velocity if velocity > 0 else 999.0
        expiring = 1 if days_to_expiry < 30 else 0

        # Known loss pattern used to label the synthetic rows.
        risk = (
            0.03
            + 0.032 * min(wastage, 10)
            + 0.28 * expiring
            + 0.14 * (1 if stock_status == 2 else 0)
            + 0.10 * (1 if velocity == 0 else 0)
            + 0.04 * max(0.0, 1 - turnover)
            + 0.02 * (1 if current_stock > 150 and velocity < 2 else 0)
            + random.uniform(-0.06, 0.06)
        )

        rows.append({
            "category_enc": CATEGORY_MAP[category],
            "supplier_enc": SUPPLIER_MAP[supplier],
            "days_to_expiry": days_to_expiry,
            "current_stock": current_stock,
            "stock_status": stock_status,
            "sales_velocity_7d": round(velocity, 2),
            "wastage_count_90d": wastage,
            "turnover_rate": round(turnover, 2),
            "unit_cost": round(unit_cost, 2),
            "stock_cover_days": round(stock_cover, 2),
            "expiring_soon": expiring,
            "risk_score": float(max(0.0, min(0.98, risk))),
        })
    return pd.DataFrame(rows)


def main() -> None:
    df = build_dataset()
    X = df[FEATURES]
    y = df["risk_score"]

    model = xgb.XGBRegressor(
        n_estimators=80,
        max_depth=4,
        learning_rate=0.12,
        subsample=0.8,
        colsample_bytree=0.9,
        random_state=42,
    )
    model.fit(X, y)

    model.save_model(str(MODEL_DIR / "model.json"))
    (MODEL_DIR / "metadata.json").write_text(
        json.dumps(
            {"category_map": CATEGORY_MAP, "supplier_map": SUPPLIER_MAP},
            indent=2,
        ),
        "utf-8",
    )

    pred = model.predict(X)
    mae = float(np.mean(np.abs(pred - y)))
    corr = float(np.corrcoef(pred, y)[0, 1])
    print(f"Trained on {len(df)} synthetic rows.")
    print(f"Saved model -> {MODEL_DIR / 'model.json'}")
    print(f"Saved meta  -> {MODEL_DIR / 'metadata.json'}")
    print(f"Train MAE={mae:.4f}  correlation={corr:.4f}")


if __name__ == "__main__":
    main()
