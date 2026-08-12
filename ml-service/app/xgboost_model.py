"""XGBoost loss-risk scoring for WiWaste (Sprint 3).

Scores each product's probability of causing loss (expiry / spoilage / damage /
shrinkage) and derives an expected loss value and a risk tier. The model is a
demo model trained on synthetic data (see ``model/train.py``).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "model" / "model.json"
METADATA_PATH = BASE_DIR / "model" / "metadata.json"

STOCK_STATUS_ENCODING = {"Normal": 0, "Low Stock": 1, "Overstock": 2}

FEATURES = [
    "category_enc", "supplier_enc", "days_to_expiry", "current_stock",
    "stock_status", "sales_velocity_7d", "wastage_count_90d",
    "turnover_rate", "unit_cost", "stock_cover_days", "expiring_soon",
]

RISK_TIERS = {"Low", "Medium", "High"}


class LossRiskPredictor:
    """Wraps the trained XGBoost booster and the label encoders."""

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        metadata_path: Path = METADATA_PATH,
    ) -> None:
        self.model = xgb.XGBRegressor()
        self.model.load_model(str(model_path))
        metadata = json.loads(Path(metadata_path).read_text("utf-8"))
        self.category_map: Dict[str, int] = metadata["category_map"]
        self.supplier_map: Dict[str, int] = metadata["supplier_map"]

    def _feature_row(self, product: dict) -> dict:
        days_to_expiry = float(product.get("days_to_expiry") or 365)
        current_stock = float(product.get("current_stock") or 0)
        velocity = float(product.get("sales_velocity_7d") or 0)
        return {
            "category_enc": self.category_map.get(str(product.get("category") or ""), -1),
            "supplier_enc": self.supplier_map.get(str(product.get("supplier") or ""), -1),
            "days_to_expiry": days_to_expiry,
            "current_stock": current_stock,
            "stock_status": STOCK_STATUS_ENCODING.get(product.get("stock_status", "Normal"), 0),
            "sales_velocity_7d": velocity,
            "wastage_count_90d": float(product.get("wastage_count_90d") or 0),
            "turnover_rate": float(product.get("turnover_rate") or 0),
            "unit_cost": float(product.get("unit_cost") or 0),
            "stock_cover_days": (current_stock / velocity) if velocity > 0 else 999.0,
            "expiring_soon": 1 if days_to_expiry < 30 else 0,
        }

    def _feature_importance(self) -> Dict[str, float]:
        values = self.model.feature_importances_
        return {
            name: round(float(value), 4)
            for name, value in zip(FEATURES, values)
        }

    def score_batch(self, products: List[dict]) -> List[dict]:
        if not products:
            return []
        frame = pd.DataFrame([self._feature_row(p) for p in products], columns=FEATURES)
        probs = np.clip(self.model.predict(frame), 0.0, 1.0)
        importance = self._feature_importance()

        results = []
        for product, prob in zip(products, probs):
            unit_cost = float(product.get("unit_cost") or 0)
            current_stock = float(product.get("current_stock") or 0)
            expected_loss = round(float(prob) * unit_cost * current_stock, 2)
            tier = "High" if prob >= 0.6 else ("Medium" if prob >= 0.3 else "Low")
            results.append({
                "product_id": int(product["product_id"]),
                "loss_probability": round(float(prob), 4),
                "expected_loss": expected_loss,
                "risk_tier": tier,
                "feature_importance": importance,
            })
        return results
