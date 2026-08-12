"""API tests for the WiWaste ML service."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_forecast_happy_path():
    sales = [
        {"period": "2026-05-01", "quantity": 5},
        {"period": "2026-05-02", "quantity": 7},
        {"period": "2026-05-03", "quantity": 4},
    ] * 30
    response = client.post(
        "/forecast",
        json={
            "product_id": 42,
            "horizon_days": 30,
            "sales": sales,
            "current_stock": 40,
            "reorder_level": 10,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["product_id"] == 42
    assert len(body["series"]) == 30
    for point in body["series"]:
        assert "period" in point
        assert point["predicted_demand"] >= 0
        assert 0 <= point["confidence"] <= 100
    assert body["overstock_risk"] in {"Low", "Medium", "High"}


def test_forecast_deterministic():
    sales = [{"period": "2026-04-01", "quantity": 6}] * 40
    payload = {"product_id": 1, "horizon_days": 14, "sales": sales}
    first = client.post("/forecast", json=payload).json()
    second = client.post("/forecast", json=payload).json()
    assert first["series"] == second["series"]


def test_forecast_empty_sales_never_errors():
    response = client.post("/forecast", json={"product_id": 1, "sales": []})
    assert response.status_code == 200
    assert len(response.json()["series"]) == 30


def test_forecast_rejects_invalid_horizon():
    response = client.post(
        "/forecast",
        json={"product_id": 1, "horizon_days": 0, "sales": []},
    )
    assert response.status_code == 422


def test_predict_loss_shape():
    response = client.post(
        "/predict/loss",
        json={
            "products": [
                {
                    "product_id": 1,
                    "category": "Medicine & Health",
                    "days_to_expiry": 10,
                    "current_stock": 100,
                    "stock_status": "Overstock",
                    "sales_velocity_7d": 0,
                    "wastage_count_90d": 6,
                    "turnover_rate": 0.5,
                    "supplier": "PharmaCorp",
                    "unit_cost": 250.0,
                },
                {
                    "product_id": 2,
                    "category": "Snacks",
                    "days_to_expiry": 300,
                    "current_stock": 20,
                    "stock_status": "Normal",
                    "sales_velocity_7d": 10,
                    "wastage_count_90d": 0,
                    "turnover_rate": 4.0,
                    "supplier": "SnackTime",
                    "unit_cost": 30.0,
                },
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "xgboost"
    assert len(body["results"]) == 2
    for result in body["results"]:
        assert 0 <= result["loss_probability"] <= 1
        assert result["expected_loss"] >= 0
        assert result["risk_tier"] in {"Low", "Medium", "High"}
        assert "feature_importance" in result


def test_predict_loss_empty_products_is_422():
    response = client.post("/predict/loss", json={"products": []})
    assert response.status_code == 422


def test_predict_loss_deterministic():
    payload = {"products": [{
        "product_id": 1,
        "category": "Dairy",
        "days_to_expiry": 60,
        "current_stock": 30,
        "stock_status": "Normal",
        "sales_velocity_7d": 3,
        "wastage_count_90d": 2,
        "turnover_rate": 2.0,
        "supplier": "DairyFresh",
        "unit_cost": 80.0,
    }]}
    first = client.post("/predict/loss", json=payload).json()
    second = client.post("/predict/loss", json=payload).json()
    assert first["results"] == second["results"]
