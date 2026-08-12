"""Unit tests for the XGBoost loss-risk predictor."""

from app.xgboost_model import LossRiskPredictor, RISK_TIERS

predictor = LossRiskPredictor()


def _product(pid, **overrides):
    base = {
        "product_id": pid,
        "category": "Medicine & Health",
        "days_to_expiry": 200,
        "current_stock": 50,
        "stock_status": "Normal",
        "sales_velocity_7d": 4.0,
        "wastage_count_90d": 1,
        "turnover_rate": 3.0,
        "supplier": "PharmaCorp",
        "unit_cost": 100.0,
    }
    base.update(overrides)
    return base


def test_score_batch_shape():
    results = predictor.score_batch([_product(1), _product(2)])
    assert len(results) == 2
    for result in results:
        assert set(result) == {
            "product_id", "loss_probability", "expected_loss", "risk_tier", "feature_importance",
        }
        assert 0 <= result["loss_probability"] <= 1
        assert result["expected_loss"] >= 0
        assert result["risk_tier"] in RISK_TIERS
        assert isinstance(result["feature_importance"], dict)
        assert result["feature_importance"]


def test_empty_batch():
    assert predictor.score_batch([]) == []


def test_expected_loss_formula():
    result = predictor.score_batch([_product(1, unit_cost=100, current_stock=10)])[0]
    expected = round(result["loss_probability"] * 100 * 10, 2)
    # expected_loss is computed from the unrounded probability, so allow tolerance.
    assert abs(result["expected_loss"] - expected) < 0.06


def test_high_risk_product_outranks_fresh_product():
    fresh = _product(1, days_to_expiry=300, wastage_count_90d=0, sales_velocity_7d=12, current_stock=20)
    at_risk = _product(2, days_to_expiry=5, wastage_count_90d=9, sales_velocity_7d=0, current_stock=400, stock_status="Overstock")
    scores = predictor.score_batch([fresh, at_risk])
    by_id = {s["product_id"]: s for s in scores}
    assert by_id[2]["loss_probability"] > by_id[1]["loss_probability"]
    assert by_id[2]["risk_tier"] in {"High", "Medium"}


def test_unknown_category_and_supplier_do_not_crash():
    result = predictor.score_batch(
        [_product(1, category="Mystery Dept", supplier="Unknown Vendor")]
    )[0]
    assert 0 <= result["loss_probability"] <= 1
