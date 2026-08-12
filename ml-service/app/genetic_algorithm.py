"""Genetic-algorithm replenishment optimizer for WiWaste (Sprint 4).

A chromosome is an order-quantity vector (one gene per candidate SKU). Fitness
minimizes overstock + stockout + wastage + holding costs. A budget penalty plus
a deterministic final repair step guarantee ``total_order_value <= budget``.
Deterministic for a given seed (``np.random.default_rng``).
"""

from __future__ import annotations

import math
from typing import Dict, List

import numpy as np

# Weights in the fitness function (see sprint4 plan).
W_OVERSTOCK = 0.5
W_STOCKOUT = 1.0
W_WASTAGE = 0.7
W_HOLDING = 0.05
BUDGET_PENALTY = 1_000_000.0

DEFAULT_GENERATIONS = 200
DEFAULT_POPULATION = 80


def _gene_bounds(products: List[dict]) -> List[int]:
    """Max order per SKU = 1.5x the gap between forecast demand and stock.

    Products whose stock already covers demand get a bound of 0, so they are
    never ordered.
    """
    bounds = []
    for product in products:
        demand = float(product.get("forecast_demand") or 0)
        stock = float(product.get("current_stock") or 0)
        gap = max(0.0, demand - stock)
        bounds.append(int(math.ceil(gap * 1.5)))
    return bounds


def _order_value(products: List[dict], chromosome: np.ndarray) -> float:
    return sum(
        float(q) * float(p.get("unit_cost") or 0)
        for p, q in zip(products, chromosome)
    )


def fitness(products: List[dict], chromosome: np.ndarray, budget: float) -> float:
    total = 0.0
    for product, order_qty in zip(products, chromosome):
        unit_cost = float(product.get("unit_cost") or 0)
        selling_price = float(product.get("selling_price") or 0)
        margin = max(0.0, selling_price - unit_cost)
        demand = float(product.get("forecast_demand") or 0)
        stock = float(product.get("current_stock") or 0)
        expiring = float(product.get("expiring_fraction") or 0)

        stock_after = stock + order_qty
        overstock = max(0.0, stock_after - demand) * unit_cost * W_OVERSTOCK
        stockout = max(0.0, demand - stock_after) * margin * W_STOCKOUT
        wastage = order_qty * expiring * unit_cost * W_WASTAGE
        holding = order_qty * unit_cost * W_HOLDING
        total += overstock + stockout + wastage + holding

    value = _order_value(products, chromosome)
    if value > budget:
        total += (value - budget) * BUDGET_PENALTY
    return total


def _repair_to_budget(products: List[dict], chromosome: np.ndarray, budget: float) -> np.ndarray:
    """Deterministically reduce order quantities until within budget.

    Repeatedly cuts units from the most expensive ordered SKU (largest unit
    cost, lowest index on ties). Terminates because each iteration removes at
    least one unit; if nothing can be afforded, orders drop to zero so
    ``total_order_value <= budget`` always holds.
    """
    result = chromosome.copy()

    while _order_value(products, result) > budget:
        candidates = [i for i, q in enumerate(result) if q > 0]
        if not candidates:
            break

        i = max(
            candidates,
            key=lambda idx: (float(products[idx].get("unit_cost") or 0), -idx),
        )
        unit_cost = float(products[i].get("unit_cost") or 0)
        if unit_cost <= 0:
            result[i] = 0
            continue

        excess = _order_value(products, result) - budget
        cut = max(1, int(excess // unit_cost))
        result[i] = max(0, int(result[i]) - cut)

    return result


def optimize(
    products: List[dict],
    budget: float,
    seed: int = 42,
    generations: int = DEFAULT_GENERATIONS,
    population_size: int = DEFAULT_POPULATION,
) -> dict:
    if not products:
        return {
            "plan": [],
            "total_order_value": 0.0,
            "budget": budget,
            "fitness": 0.0,
            "generations_run": 0,
            "confidence": 1.0,
        }

    rng = np.random.default_rng(seed)
    bounds = _gene_bounds(products)
    n_genes = len(products)

    population = np.zeros((population_size, n_genes), dtype=int)
    for row in range(population_size):
        population[row] = [rng.integers(0, bound + 1) for bound in bounds]

    gap_chromosome = np.array(
        [int(max(0.0, float(p.get("forecast_demand") or 0) - float(p.get("current_stock") or 0))) for p in products],
        dtype=int,
    )
    population[0] = np.minimum(gap_chromosome, np.array(bounds, dtype=int))

    def evaluate(chromosome: np.ndarray) -> float:
        return fitness(products, chromosome, budget)

    fitnesses = np.array([evaluate(chromosome) for chromosome in population])
    best_fitness = float(np.min(fitnesses))
    gen0_fitness = best_fitness
    best_index = int(np.argmin(fitnesses))
    best_chromosome = population[best_index].copy()

    elite_count = max(1, population_size // 10)

    for _ in range(generations):
        ranked = np.argsort(fitnesses)
        elite = [population[idx].copy() for idx in ranked[:elite_count]]

        next_population = list(elite)
        while len(next_population) < population_size:
            def tournament() -> int:
                a, b = rng.integers(0, population_size, size=2)
                return a if fitnesses[a] <= fitnesses[b] else b

            parent_a = population[tournament()]
            parent_b = population[tournament()]

            child = np.where(rng.random(n_genes) < 0.5, parent_a, parent_b)
            for i in range(n_genes):
                if rng.random() < 0.1 and bounds[i] > 0:
                    child[i] = int(rng.integers(0, bounds[i] + 1))
            child = np.clip(child, 0, bounds).astype(int)
            next_population.append(child)

        population = np.array(next_population, dtype=int)
        fitnesses = np.array([evaluate(c) for c in population])

        current_best = float(np.min(fitnesses))
        current_index = int(np.argmin(fitnesses))
        if current_best < best_fitness:
            best_fitness = current_best
            best_chromosome = population[current_index].copy()

    best_chromosome = _repair_to_budget(products, best_chromosome, budget)
    best_fitness = evaluate(best_chromosome)

    mean_fitness = float(np.mean(fitnesses))
    std_fitness = float(np.std(fitnesses))
    spread = std_fitness / (mean_fitness + 1e-9)
    confidence = round(float(np.clip(1.0 - spread, 0.0, 1.0)), 4)

    plan = []
    total_order_value = 0.0
    for product, order_qty in zip(products, best_chromosome):
        unit_cost = float(product.get("unit_cost") or 0)
        order_value = float(order_qty) * unit_cost
        total_order_value += order_value
        plan.append({
            "product_id": int(product["product_id"]),
            "product_name": product.get("product_name") or f"Product #{product['product_id']}",
            "current_stock": float(product.get("current_stock") or 0),
            "forecast_demand": float(product.get("forecast_demand") or 0),
            "order_qty": int(order_qty),
            "unit_cost": unit_cost,
            "order_value": round(order_value, 2),
        })

    return {
        "plan": plan,
        "total_order_value": round(total_order_value, 2),
        "budget": float(budget),
        "fitness": round(best_fitness, 4),
        "generations_run": generations,
        "gen0_fitness": round(gen0_fitness, 4),
        "confidence": confidence,
    }
