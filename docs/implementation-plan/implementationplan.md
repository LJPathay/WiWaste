# WiWaste Implementation Plan (Index)

This folder contains the complete implementation plan for the **WiWaste Smart Inventory & POS System**,
organized by sprint. Each sprint has its own markdown file so you can follow along one sprint at a time
without being confused by unrelated details.

---

## How to use this plan

1. Start at **Sprint 0** and read each file **in order**.
2. Each sprint file follows the **same template**:
   - **Goal** — what the sprint delivers.
   - **Status** — built / in progress / not started.
   - **Scope** — exactly what is in and out of scope.
   - **Backend tasks** — files to create or change (Laravel).
   - **Frontend tasks** — files to create or change (React).
   - **API contract** — the exact endpoints involved.
   - **Testing** — what must be verified.
   - **Definition of Done** — a checklist you can tick off.
3. Finish a sprint, run its **Definition of Done** checklist, then move to the next.

---

## Sprint overview & status

| File | Sprint | Focus | Status |
|------|--------|-------|--------|
| [Sprint 0 — Planning & Requirements](implementationplan-sprint0.md) | Sprint 0 | Requirements, API contract, acceptance criteria | **Mostly complete — finalize artifacts** |
| [Sprint 1 — POS & Inventory Sync](implementationplan-sprint1.md) | Sprint 1 | Barcode scanning, stock consistency, sync hardening | **Mostly built — harden & verify** |
| [Sprint 2 — Predictive Analytics (ARIMA)](implementationplan-sprint2.md) | Sprint 2 | Demand forecasting engine, forecast API, forecast UI | **Not started** |
| [Sprint 3 — Loss Visibility Dashboard (XGBoost)](implementationplan-sprint3.md) | Sprint 3 | ML loss-risk service, loss-risk API, leakage UI | **Not started** |
| [Sprint 4 — Decision-Support Reports (GA)](implementationplan-sprint4.md) | Sprint 4 | Replenishment optimizer, optimization API, reports UI | **Not started** |
| [Sprint 5 — Integration](implementationplan-sprint5.md) | Sprint 5 | Barcode loop, payment, dashboard consolidation | **Partially built** |
| [Sprint 6 — Payment Gateway (PayMongo)](implementationplan-sprint6.md) | Sprint 6 | Real GCash/Maya/card payments via PayMongo | **Not started** |
| [Testing & Evaluation](implementationplan-testing.md) | — | Automated tests, quality gates, evaluation metrics | **Not started** |
| [Deployment & Documentation](implementationplan-deployment.md) | — | Build, Docker, env config, README updates | **Not started** |

---

## Key decisions already made (do not change without discussion)

1. **Hybrid ML approach**
   - ARIMA + Genetic Algorithm are implemented in **pure PHP** inside Laravel.
   - XGBoost is implemented as a **separate Python (FastAPI) microservice**.
   - If the Python service is offline, the backend falls back to a **pure-PHP risk score** so the app never breaks.
2. **Mock data**
   - Existing overview/chart pages stay on mock data (`Frontend/src/utils/mockAuthAndFeatures.ts`).
   - **Only the new Sprint 2–4 features** are wired to the real API.
3. **Payment**
   - `Cash`, `E-wallet`, `Credit Card`, `Debit Card` keep recording `payment_method` per transaction.
   - **Sprint 6** adds **PayMongo** gateway integration for real GCash/Maya/card payments using its hosted
     Checkout Sessions page (WiWaste never touches card numbers). Finalization uses a signature-verified
     webhook **plus** a poll-based fallback so the demo works on localhost without a tunnel.
   - Requires PayMongo **sandbox** keys for dev/demo (see Sprint 6).
4. **Barcode**
   - Uses a **USB scanner in keyboard-wedge mode** (the scanner "types" the code like a keyboard).
   - No camera scanning, no extra libraries.

---

## Current codebase map (reference)

```
WiWaste/
├── Backend/                     # Laravel REST API (PHP 8.3+, Sanctum, MySQL)
│   ├── app/
│   │   ├── Http/Controllers/Api/   # API controllers (auth, products, inventory, sales, ...)
│   │   ├── Models/                  # Eloquent models (18 models incl. ForecastResult)
│   │   └── Services/                # NEW folder for engines/services (this plan adds it)
│   ├── database/migrations/         # Schema (Forecast_Result table already exists)
│   ├── database/seeders/            # Seed data
│   ├── routes/api.php               # All API routes (already has 60+ routes)
│   └── tests/                       # PHPUnit (currently only ExampleTest stubs)
└── Frontend/                    # React 19 + Vite + TypeScript
    ├── src/
    │   ├── pages/                   # All screens (admin/, inventory/, cashier/, manager/, dashboard/)
    │   ├── services/api.ts          # Central API client (all backend calls go here)
    │   ├── hooks/useDashboardData.ts# Merges mock + real API overview data
    │   ├── utils/mockAuthAndFeatures.ts # Mock data layer
    │   └── routes.tsx               # All frontend routes
    └── package.json                 # No test runner configured yet
```

---

## Recommended execution order

1. Sprint 1 hardening (core stock consistency guarantee)
2. Sprint 2 (ARIMA forecast)
3. Sprint 3 (XGBoost loss visibility)
4. Sprint 4 (GA decision support)
5. Sprint 5 (integration & polish)
6. Sprint 6 (PayMongo payment gateway)
7. Testing & Evaluation
8. Deployment & Documentation

Each sprint from 2–4 ships **backend-first**: engine → API endpoint → backend tests → frontend wiring.
