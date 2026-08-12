# Sprint 0 — Planning & Requirements

> **Objective:** Lock down the requirements, acceptance criteria, API contracts, and environment
> configuration that all later sprints depend on.

---

## 1. Goal

Make sure every person working on WiWaste shares the **same understanding** of:

- What each sprint must deliver (acceptance criteria).
- The exact JSON contract of the 3 new endpoint groups (forecast, loss-risk, optimization).
- The environment variables and configuration the system needs.

## 2. Status

- **Mostly complete.** The project already has a working Laravel API, a React frontend, seeded roles
  (Owner / Inventory Staff / Cashier), and most of Sprint 1 built.
- **Missing:** the artifacts below that future sprints need.

## 3. Scope

### In scope
- Acceptance criteria document (one line per feature).
- API contract for the new endpoints (Forecast, Loss Risk, Optimization).
- New environment variables and `.env.example` updates.
- Confirmation of user roles and their permissions.

### Out of scope
- Any new features. This sprint produces documents and config only.

## 4. Deliverables & tasks

### 4.1 Acceptance criteria (per sprint)

Record one-line "Definition of Done" per sprint in the sprint's own file. Example:
- Sprint 1: "A barcode scan at the POS adds the product to the cart and stock always matches movements."
- Sprint 2: "The forecast endpoint returns 30 days of predicted demand per product with confidence."
- Sprint 3: "The leakage dashboard shows risk-ranked products with expected loss value."
- Sprint 4: "The optimizer returns a replenishment plan that respects the budget constraint."
- Sprint 6: "Selecting GCash/Maya/card opens the PayMongo checkout and the sale completes only when
  payment is confirmed; stock is deducted exactly once."

### 4.2 API contract (the 3 new endpoint groups)

Document these now so frontend and backend build against the same shape.

| Endpoint group | Method(s) | Purpose |
|----------------|-----------|---------|
| `GET /forecast/overview`, `GET /forecast/{product_id}`, `POST /forecast/generate` | GET/POST | ARIMA demand forecasts (Sprint 2) |
| `GET /loss-risk/summary`, `GET /loss-risk/items`, `POST /loss-risk/predict` | GET/POST | XGBoost loss-risk scoring (Sprint 3) |
| `POST /optimization/replenishment` | POST | GA replenishment plan (Sprint 4) |
| `POST /sales` (with `payment_method=PayMongo`), `GET /paymongo/status/{id}`, `POST /paymongo/webhook` | POST/GET | PayMongo payment gateway flow (Sprint 6) |

Full payload details are defined inside each sprint file — **do not** invent extra fields on one side
without updating the other side.

### 4.3 Environment configuration

Add to `Backend/.env.example`:

```env
# Python ML service (Sprints 2-4): ARIMA, XGBoost, Genetic Algorithm. Required by analytics endpoints.
ML_SERVICE_URL=http://localhost:8001

# PayMongo payment gateway (Sprint 6). Sandbox keys for dev/demo.
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
PAYMONGO_SUCCESS_URL=http://localhost:5173/pos/success
PAYMONGO_CANCEL_URL=http://localhost:5173/pos
```

And to a new `Frontend/.env.example`:

```env
VITE_PAYMONGO_PUBLIC_KEY=pk_test_...
```

Document in `README.md` that the Python ML service is a **required local component** for the analytics
endpoints (forecast, loss-risk, optimization) and show the startup commands. There is **no PHP fallback**.

### 4.4 Roles & permissions (confirm only)

| Role | Access |
|------|--------|
| **Owner** | Everything — products, categories, users, reports, dashboards, approve/reject recommendations |
| **Inventory Staff** | Stock-in/out, wastage, FEFO, inventory adjustments, recommendations |
| **Cashier** | POS terminal, sales, returns, receipt |

No code change required unless a later sprint contradicts this table.

## 5. Definition of Done

- [x] `Backend/.env.example` contains `ML_SERVICE_URL` and the `PAYMONGO_*` keys; `Frontend/.env.example` contains `VITE_PAYMONGO_PUBLIC_KEY`.
- [x] One-page acceptance criteria written for each sprint (sections in each sprint MD).
- [x] API contract for forecast / loss-risk / optimization / paymongo is agreed and written down.
- [x] All three roles and their permissions are confirmed.

## 6. Output

This folder (`docs/implementation-plan/`) IS the deliverable of Sprint 0. Read the next file when the
checklist above is complete.
