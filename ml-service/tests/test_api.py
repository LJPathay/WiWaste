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
