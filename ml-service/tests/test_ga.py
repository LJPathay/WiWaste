"""Unit tests for the genetic-algorithm replenishment optimizer."""

import numpy as np

from app.genetic_algorithm import fitness, optimize

PRODUCTS = [
    {
        "product_id": 1,
        "product_name": "Tuna",
        "current_stock": 3,
        "forecast_demand": 48,
        "unit_cost": 45.0,
        "selling_price": 55.0,
        "expiring_fraction": 0.1,
    },
    {
        "product_id": 2,
        "product_name": "Soda 1.5L",
        "current_stock": 8,
        "forecast_demand": 36,
        "unit_cost": 72.0,
        "selling_price": 88.0,
        "expiring_fraction": 0.2,
    },
    {
        "product_id": 3,
        "product_name": "Bread",
        "current_stock": 6,
        "forecast_demand": 40,
        "unit_cost": 85.0,
        "selling_price": 95.0,
        "expiring_fraction": 0.6,
    },
    {
        "product_id": 4,
        "product_name": "Covered SKU",
        "current_stock": 120,
        "forecast_demand": 60,
        "unit_cost": 10.0,
        "selling_price": 14.0,
        "expiring_fraction": 0.05,
    },
]


def _result(budget: float, seed: int = 7):
    return optimize(PRODUCTS, budget=budget, seed=seed)


def test_deterministic_with_seed():
    first = _result(5000, seed=99)
    second = _result(5000, seed=99)
    assert first["plan"] == second["plan"]
    assert first["total_order_value"] == second["total_order_value"]


def test_budget_respected_across_seeds():
    for seed in range(5):
        for budget in (200, 800, 2000, 100000):
            result = _result(budget, seed=seed)
            assert result["total_order_value"] <= budget


def test_no_negative_orders_and_covered_sku_not_ordered():
    result = _result(5000)
    assert all(item["order_qty"] >= 0 for item in result["plan"])
    covered = next(item for item in result["plan"] if item["product_id"] == 4)
    assert covered["order_qty"] == 0


def test_plan_shape_and_order_value_math():
    result = _result(5000)
    assert len(result["plan"]) == len(PRODUCTS)
    expected_total = sum(
        item["order_qty"] * item["unit_cost"] for item in result["plan"]
    )
    assert abs(result["total_order_value"] - expected_total) < 0.01
    assert result["generations_run"] == 200
    assert 0 <= result["confidence"] <= 1


def test_convergence_final_fitness_leq_generation_zero():
    result = _result(5000, seed=3)
    assert result["fitness"] <= result["gen0_fitness"] + 1e-6


def test_empty_products():
    result = optimize([], budget=1000)
    assert result["plan"] == []
    assert result["total_order_value"] == 0
    assert result["generations_run"] == 0
    assert result["confidence"] == 1.0


def test_tiny_budget_still_respected():
    result = _result(1.0)
    assert result["total_order_value"] <= 1.0
    assert all(item["order_qty"] == 0 for item in result["plan"])


def test_fitness_prefers_filling_demand_gap():
    products = [
        {"product_id": 1, "current_stock": 3, "forecast_demand": 48,
            "unit_cost": 45.0, "selling_price": 55.0, "expiring_fraction": 0.0},
    ]
    low = fitness(products, np.array([0], dtype=int), 5000)
    gap = fitness(products, np.array([45], dtype=int), 5000)
    assert gap < low
