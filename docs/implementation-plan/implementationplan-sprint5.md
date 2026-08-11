# Sprint 5 — Integration (Barcode, Payment, Dashboards)

> **Objective:** Pull everything together into one smooth workflow — scan a product, sell it, see stock
> update live, and have all dashboards reachable and consistent.

---

## 1. Goal

By the end of this sprint:

1. **Barcode:** a cashier can scan a product at the POS, sell it, and see stock drop in real time.
2. **Payment:** payment is recorded per transaction (method tracking confirmed — real PayMongo gateway
   integration is Sprint 6).
3. **Dashboards:** all feature dashboards (Sprint 2–4) are reachable from the navigation and show live data
   with proper loading/empty/error states.

## 2. Status

- **Partially built.** POS, inventory, FEFO, reports, and dashboards all exist. Barcode wiring starts in
  Sprint 1; this sprint verifies the full loop and does final integration polish.

## 3. Scope

### In scope
- Verify the complete barcode → sale → stock-sync loop.
- Confirm payment fields are captured end-to-end.
- Consolidate navigation; add states for the newly wired pages (Sprints 2–4).

### Out of scope
- Camera barcode scanning (keyboard-wedge only).
- Real payment gateway / QR payment — **moved to Sprint 6** (PayMongo: GCash, Maya, card). This sprint
  only verifies the payment fields are captured and persisted.

## 4. Backend tasks

### 4.1 Verify payment capture end-to-end

Confirm the chain: `CreateSalePayload.payment_method` → `SalesTransactionController.store` →
`Sales_Transaction` table. Payment methods supported: `Cash`, `E-wallet`, `Credit Card`, `Debit Card`.
No new fields or endpoints needed unless the audit finds the value is not persisted.
(Adding `PayMongo` as a method and the gateway flow is Sprint 6.)

### 4.2 API surface review (no new features)

Confirm all routes used by the wired pages exist and are stable:

| Page | Endpoint |
|------|----------|
| Predictive Analytics | `GET /forecast/overview`, `GET /forecast/{product_id}` |
| Leakage Detection | `GET /loss-risk/items`, `GET /loss-risk/summary` |
| Replenishment / Reports | `POST /optimization/replenishment` |
| POS | `GET /products/lookup/{code}`, `POST /sales` |
| Inventory | `POST /inventory/stock-in`, `POST /inventory/stock-out` |

## 5. Frontend tasks

### 5.1 Navigation & routing

File: `Frontend/src/routes.tsx` and the sidebar in `Frontend/src/components/layout/DashboardLayout.tsx`.

- Ensure these routes are present and linked in the sidebar:
  - `/dashboard/predictive` — Predictive Analytics
  - `/dashboard/leakage` — Leakage Detection
  - `/dashboard/fefo` — FEFO Tracking
  - `/owner/replenishment` — Replenishment
  - `/owner/reports` and `/owner/executive-reports` — Reports
  - `/cashier/pos` — POS Terminal
- No orphan pages: every route in `routes.tsx` must be reachable via the sidebar, and every sidebar item
  must resolve to an existing route.

### 5.2 Consistency pass on wired pages

For the pages wired in Sprints 2–4, add/verify the three states everywhere:
- **Loading** — skeleton or spinner.
- **Empty** — friendly message with a "how to fix" hint (e.g., "Run forecast:generate first").
- **Error** — readable message + retry button; never a blank screen.

### 5.3 Live stock after sale (POS)

- After checkout, refresh the cart's inventory display so the next scan shows updated stock.
- If stock for a cart item hits zero mid-cart, show a warning before checkout.

## 6. Manual demo walkthrough (the acceptance script)

Run this end-to-end to accept the sprint:

1. Log in as **Cashier** → open POS.
2. **Scan** a barcode → product appears in cart with correct price.
3. Complete a sale with payment method **Cash** → receipt/confirmation shown.
4. Log in as **Inventory Staff** → open Manage Inventory → stock decreased by the sold quantity; a
   movement entry exists.
5. Open **Predictive Analytics** → forecasts are real API data.
6. Open **Leakage Detection** → risk-ranked products with expected loss.
7. Open **Replenishment** → run the optimizer with a budget → plan returned, budget respected.
8. Approve a recommendation as **Owner** → it appears in the Recommendations list.

## 7. Testing

- Re-run the Sprint 1 inventory-invariant tests.
- Frontend smoke checks: build passes (`npm run build`), ESLint clean (`npx eslint src`).
- All 8 manual steps above pass.

## 8. Definition of Done

- [ ] Barcode → sale → stock-sync loop works (manual steps 1–4).
- [ ] Payment method is recorded on every sale.
- [ ] All dashboard routes reachable from the sidebar, no orphans.
- [ ] Wired pages have loading / empty / error states.
- [ ] `npm run build` and ESLint pass.
- [ ] Manual demo walkthrough (1–8) passes.

> After this sprint, continue to Testing & Evaluation, then Deployment & Documentation.
