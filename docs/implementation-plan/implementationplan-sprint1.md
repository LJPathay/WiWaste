# Sprint 1 — POS & Inventory Sync

> **Objective:** Guarantee that every transaction (sale, stock-in, stock-out, wastage) keeps the
> inventory quantities consistent, and let the cashier add products by barcode scan.

---

## 1. Goal

By the end of this sprint:

1. The **POS terminal** accepts barcode input (USB keyboard-wedge scanner) and adds the product to the cart.
2. Every **sale decrements stock**, creates a **sales item**, and writes a **stock movement**.
3. **Stock-in / stock-out / wastage** update `Inventory` and write a `Stock_Movement`.
4. These invariants are protected by **automated tests** so they never silently break again.

## 2. Status

- **Largely built.** POS terminal, stock-in/out, wastage, FEFO, sales, and returns already exist and are
  connected to the backend.
- **Remaining:** barcode capture in the POS, a full sync audit, and regression tests.

## 3. Scope

### In scope
- Keyboard-wedge barcode capture in the POS.
- Audit + fix of the stock synchronization logic.
- Feature tests for the inventory invariants.

### Out of scope
- Camera barcode scanning (decided: keyboard-wedge only).
- Payment gateway / QR payment (decided: real gateway via **PayMongo** in Sprint 6; method tracking stays as-is until then).

## 4. Backend tasks

### 4.1 Verify the sync logic (audit, no new code unless broken)

Review these files to confirm each writes its movement and updates stock exactly once:

| File | Must guarantee |
|------|----------------|
| `Backend/app/Http/Controllers/Api/SalesTransactionController.php` (`store`) | Creates `Sales_Transaction` + `Sales_Item` rows, decrements `Inventory.current_stock`, writes a `Stock_Movement` |
| `Backend/app/Http/Controllers/Api/InventoryController.php` (`stockIn`, `stockOut`) | Adjusts `current_stock`, writes `Stock_Movement` |
| `Backend/app/Http/Controllers/Api/WastageRecordController.php` (`store`) | Records wastage, decrements `current_stock`, writes `Stock_Movement` |

**Recommended hardening (only if the audit finds a gap):**
- Wrap the multi-step writes in a DB transaction.
- Recompute `Inventory.stock_status` (`Normal` / `Low Stock` / `Overstock`) after every quantity change.
- Decrement must **refuse to go negative** (validate `quantity <= current_stock` on stock-out).

### 4.2 Barcode support (backend is mostly ready)

- `ProductController::lookup` already exists (`GET /products/lookup/{code}`) and `barcode` is already part
  of `CreateProductPayload`. **Verify** that `lookup` searches the `barcode` / `plu_code` column; if it
  only searches by SKU, extend it to also match the barcode column.

## 5. Frontend tasks

### 5.1 Barcode capture in the POS

File: `Frontend/src/pages/cashier/POSTerminal.tsx`

1. Add a **focused scan input** (auto-focuses on page load and after each scan).
2. A USB keyboard-wedge scanner "types" the code then presses **Enter** — listen for Enter on the input.
3. On Enter → call `products.lookup(code)` (add to `Frontend/src/services/api.ts` if not present).
4. On success → add/merge the product into the current cart line items.
5. On not-found → show a toast/error and let the cashier search manually.

> No new npm dependency is needed. Do **not** add camera scanning.

### 5.2 Sync feedback in the UI

- Show live stock remaining next to each cart line (from the latest inventory data).
- After checkout, the cart clears and the POS refreshes inventory counts.

## 6. API contract (relevant to this sprint)

| Method | Endpoint | Body / Params | Response |
|--------|----------|---------------|----------|
| `POST` | `/sales` | `{ payment_method, amount_tendered, items: [{ product_id, quantity, unit_price, discount_pct? }] }` | Created transaction with items |
| `POST` | `/inventory/stock-in` | `{ product_id, quantity, remarks? }` | Updated inventory + movement |
| `POST` | `/inventory/stock-out` | `{ product_id, quantity, remarks? }` | Updated inventory + movement |
| `POST` | `/wastage` | `{ product_id, wastage_type, quantity, estimated_loss, date_recorded }` | Created wastage record |
| `GET` | `/products/lookup/{code}` | path = barcode/SKU | Matching product or 404 |

## 7. Testing

Add to `Backend/tests/Feature/` (see the Testing & Evaluation file for the full list):

1. **Sale syncs stock** — POST `/sales` with 2 items → assert inventory decreased, `Sales_Item` rows exist,
   `Stock_Movement` row exists.
2. **Stock-out cannot go negative** — attempt to stock-out more than on hand → 422, stock unchanged.
3. **Wastage syncs stock** — POST `/wastage` → stock decreased and movement written.
4. **Barcode lookup** — GET `/products/lookup/{barcode}` returns the right product.
5. **Stock-in adds stock** — POST `/inventory/stock-in` → `current_stock` increased, movement written.

## 8. Definition of Done

**Acceptance criteria:** A barcode scan at the POS adds the product to the cart and stock always matches
movements.

- [ ] Cashier scans a barcode → product lands in the cart with correct price/stock.
- [ ] Scanning an unknown code shows a clear error and does not crash the POS.
- [ ] Sale, stock-in, stock-out, and wastage all keep `Inventory.current_stock` consistent.
- [ ] No stock quantity ever goes negative.
- [ ] Feature tests 1–5 above pass with `php artisan test`.

> Finish this sprint before Sprint 2: the forecast engine reads the same sales/movement data.
